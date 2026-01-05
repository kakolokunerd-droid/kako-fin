// Supabase Edge Function para envio de email de recuperação de senha
// Requer integração com Resend ou outro serviço de email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "noreply@kakofin.com";

interface RequestBody {
  email: string;
  temporaryPassword: string;
  userName?: string;
}

serve(async (req) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY não configurada");
    }

    const { email, temporaryPassword, userName }: RequestBody = await req.json();

    if (!email || !temporaryPassword) {
      return new Response(
        JSON.stringify({ error: "Email e senha provisória são obrigatórios" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const resend = new Resend(RESEND_API_KEY);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Recuperação de Senha - Kako Fin</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Kako Fin</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0 0;">Recuperação de Senha</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>Olá${userName ? `, ${userName}` : ""},</p>
            
            <p>Você solicitou a recuperação de senha para sua conta no Kako Fin.</p>
            
            <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Sua senha provisória é:</p>
              <p style="margin: 0; font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 2px; font-family: monospace;">
                ${temporaryPassword}
              </p>
            </div>
            
            <p><strong>⚠️ Importante:</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Esta senha é temporária e deve ser alterada após o login</li>
              <li>Não compartilhe esta senha com ninguém</li>
              <li>Se você não solicitou esta recuperação, ignore este email</li>
            </ul>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="margin: 0; font-size: 12px; color: #999;">
                Este é um email automático, por favor não responda.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Recuperação de Senha - Kako Fin",
      html: emailHtml,
    });

    if (error) {
      console.error("Erro ao enviar email:", error);
      return new Response(
        JSON.stringify({ error: "Erro ao enviar email", details: error }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Email enviado com sucesso", data }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Erro na função:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

