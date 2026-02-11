// Supabase Edge Function para receber webhooks do Stripe
// Atualiza o status da assinatura no banco de dados quando eventos do Stripe chegam

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Inicializar cliente Supabase com service role key (para bypass RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Mapear planos do Stripe para planos do sistema
const mapStripePriceToPlan = (priceId: string): string | null => {
  const priceBasic = Deno.env.get("STRIPE_PRICE_BASIC");
  const pricePremium = Deno.env.get("STRIPE_PRICE_PREMIUM");
  const pricePremiumPlus = Deno.env.get("STRIPE_PRICE_PREMIUM_PLUS");

  if (priceId === priceBasic) return "basic";
  if (priceId === pricePremium) return "premium";
  if (priceId === pricePremiumPlus) return "premium_plus";
  return null;
};

serve(async (req) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
      },
    });
  }

  try {
    // Verificar se o webhook secret está configurado
    if (!STRIPE_WEBHOOK_SECRET) {
      console.error("❌ STRIPE_WEBHOOK_SECRET não configurado");
      return new Response(
        JSON.stringify({ error: "Webhook secret não configurado" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Obter o corpo da requisição e o header de assinatura
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Assinatura não encontrada" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Importar Stripe SDK para validar webhook
    const stripe = await import("https://esm.sh/stripe@14.21.0?target=deno");
    const stripeClient = stripe.default(Deno.env.get("STRIPE_SECRET_KEY") || "");

    let event;
    try {
      // Validar assinatura do webhook
      event = stripeClient.webhooks.constructEvent(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("❌ Erro ao validar webhook:", err);
      return new Response(
        JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(`✅ Webhook recebido: ${event.type}`);

    // Processar diferentes tipos de eventos
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const customerId = subscription.customer;
        const subscriptionId = subscription.id;
        const status = subscription.status;
        const priceId = subscription.items?.data[0]?.price?.id;

        // Buscar email do cliente no Stripe
        const customer = await stripeClient.customers.retrieve(customerId);
        const customerEmail = (customer as any).email;

        if (!customerEmail) {
          console.error("❌ Email do cliente não encontrado");
          break;
        }

        // Mapear price ID para plano
        const plan = mapStripePriceToPlan(priceId);
        if (!plan) {
          console.error(`❌ Price ID não reconhecido: ${priceId}`);
          break;
        }

        // Calcular data de expiração (próximo período de cobrança)
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

        // Atualizar perfil no Supabase
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            subscription_plan: plan,
            subscription_expires_at: currentPeriodEnd,
            is_trial_active: false,
          })
          .eq("email", customerEmail);

        if (updateError) {
          console.error("❌ Erro ao atualizar perfil:", updateError);
        } else {
          console.log(`✅ Assinatura atualizada para ${customerEmail}: ${plan}`);
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const customerId = subscription.customer;

        // Buscar email do cliente
        const customer = await stripeClient.customers.retrieve(customerId);
        const customerEmail = (customer as any).email;

        if (!customerEmail) {
          console.error("❌ Email do cliente não encontrado");
          break;
        }

        // Reverter para trial quando assinatura é cancelada
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            subscription_plan: "trial",
            subscription_expires_at: null,
            is_trial_active: true,
          })
          .eq("email", customerEmail);

        if (updateError) {
          console.error("❌ Erro ao reverter para trial:", updateError);
        } else {
          console.log(`✅ Assinatura cancelada, revertido para trial: ${customerEmail}`);
        }

        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        const customerId = invoice.customer;
        const subscriptionId = invoice.subscription;

        if (!subscriptionId) break;

        // Buscar assinatura
        const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;

        // Buscar email do cliente
        const customer = await stripeClient.customers.retrieve(customerId);
        const customerEmail = (customer as any).email;

        if (!customerEmail) break;

        // Mapear price ID para plano
        const plan = mapStripePriceToPlan(priceId);
        if (!plan) break;

        // Atualizar data de expiração
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            subscription_plan: plan,
            subscription_expires_at: currentPeriodEnd,
          })
          .eq("email", customerEmail);

        if (updateError) {
          console.error("❌ Erro ao atualizar após pagamento:", updateError);
        } else {
          console.log(`✅ Pagamento confirmado, assinatura renovada: ${customerEmail}`);
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const customerId = invoice.customer;

        // Buscar email do cliente
        const customer = await stripeClient.customers.retrieve(customerId);
        const customerEmail = (customer as any).email;

        if (!customerEmail) break;

        // Opcional: Notificar usuário sobre falha no pagamento
        console.log(`⚠️ Pagamento falhou para: ${customerEmail}`);
        // Aqui você pode adicionar lógica para notificar o usuário

        break;
      }

      default:
        console.log(`ℹ️ Evento não processado: ${event.type}`);
    }

    // Sempre retornar 200 para o Stripe
    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Erro ao processar webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
