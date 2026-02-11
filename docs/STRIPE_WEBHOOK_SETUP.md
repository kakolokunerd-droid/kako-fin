# 🔔 Configuração Rápida: Webhook do Stripe com Supabase

## 🎯 O que fazer AGORA na tela do Stripe

Você está vendo a tela **"Escolha para onde deseja enviar os eventos"** com duas opções:

### ✅ Ação Imediata:

1. **Clique em "Endpoint de webhook"** (já deve estar selecionado com borda roxa)
2. **Clique em "Continuar" ou "Próximo"**

---

## 📋 Passo a Passo Completo

### 1️⃣ Deploy da Função no Supabase

#### Instalar Supabase CLI (se ainda não tiver):

```bash
npm install -g supabase
```

#### Fazer login:

```bash
supabase login
```

#### Linkar seu projeto:

```bash
supabase link --project-ref SEU_PROJECT_REF
```

**Onde encontrar o Project Ref:**
- Dashboard do Supabase → Settings → API
- Procure por "Reference ID" ou "Project URL"
- Exemplo: `abcdefghijklmnop`

#### Fazer deploy da função:

```bash
supabase functions deploy stripe-webhook
```

#### ✅ Após o deploy, você verá a URL:

```
https://SEU_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
```

**Copie esta URL!** Você vai precisar no próximo passo.

---

### 2️⃣ Configurar no Stripe

#### Na tela do Stripe (após escolher "Endpoint de webhook"):

1. **Campo "URL do endpoint":**
   - Cole a URL do Supabase que você copiou
   - Exemplo: `https://abcdefghijklmnop.supabase.co/functions/v1/stripe-webhook`

2. **Eventos para escutar** (selecione estes):
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`

3. **Clique em "Adicionar endpoint"**

4. **Copie o Signing Secret:**
   - Após criar, você verá: `whsec_xxxxx`
   - ⚠️ **COPIE E GUARDE!** Você precisará no próximo passo

---

### 3️⃣ Configurar Secrets no Supabase

1. **No Dashboard do Supabase:**
   - Vá em **"Project Settings"** → **"Edge Functions"** → **"Secrets"**

2. **Adicione estas variáveis:**

   | Nome | Valor | Onde encontrar |
   |------|-------|----------------|
   | `STRIPE_WEBHOOK_SECRET` | `whsec_xxxxx` | Stripe → Webhooks → Seu endpoint → Signing secret |
   | `STRIPE_SECRET_KEY` | `sk_test_xxxxx` | Stripe → Developers → API keys → Secret key |
   | `STRIPE_PRICE_BASIC` | `price_xxxxx` | Stripe → Products → Basic → Price ID |
   | `STRIPE_PRICE_PREMIUM` | `price_xxxxx` | Stripe → Products → Premium → Price ID |
   | `STRIPE_PRICE_PREMIUM_PLUS` | `price_xxxxx` | Stripe → Products → Premium Plus → Price ID |

3. **Clique em "Save"**

---

### 4️⃣ Testar o Webhook

#### No Stripe:

1. Vá em **"Desenvolvedores"** → **"Webhooks"**
2. Clique no endpoint que você criou
3. Clique em **"Enviar evento de teste"**
4. Escolha: `customer.subscription.created`
5. Clique em **"Enviar evento de teste"**

#### Verificar se funcionou:

1. **No Supabase:**
   - Vá em **"Edge Functions"** → **"stripe-webhook"** → **"Logs"**
   - Você deve ver: `✅ Webhook recebido: customer.subscription.created`

2. **Se aparecer erro:**
   - Verifique se todas as variáveis de ambiente estão configuradas
   - Verifique se o Signing Secret está correto
   - Verifique os logs para mais detalhes

---

## 🐛 Troubleshooting

### Erro: "Webhook signature verification failed"

**Solução:**
- Verifique se o `STRIPE_WEBHOOK_SECRET` está correto no Supabase
- Certifique-se de que copiou o secret completo (começa com `whsec_`)

### Erro: "STRIPE_WEBHOOK_SECRET não configurado"

**Solução:**
- Vá em Supabase → Settings → Edge Functions → Secrets
- Adicione a variável `STRIPE_WEBHOOK_SECRET`

### Erro: "Price ID não reconhecido"

**Solução:**
- Verifique se os Price IDs estão corretos no Supabase Secrets
- Confirme que os Price IDs no Stripe correspondem aos configurados

### Webhook não está sendo recebido

**Solução:**
1. Verifique se a URL está correta no Stripe
2. Verifique se a função foi deployada com sucesso
3. Teste enviando um evento de teste do Stripe
4. Verifique os logs no Supabase

---

## ✅ Checklist

- [ ] Função `stripe-webhook` deployada no Supabase
- [ ] URL do webhook copiada
- [ ] Endpoint criado no Stripe com a URL correta
- [ ] Eventos selecionados no Stripe
- [ ] Signing Secret copiado do Stripe
- [ ] Todas as variáveis configuradas no Supabase Secrets
- [ ] Teste de webhook enviado e funcionando
- [ ] Logs verificados no Supabase

---

## 📝 Próximos Passos

Após configurar o webhook:

1. ✅ Criar produtos no Stripe (se ainda não fez)
2. ✅ Obter Price IDs
3. ✅ Configurar variáveis no Supabase
4. ✅ Implementar checkout no frontend
5. ✅ Testar fluxo completo

---

**Dúvidas?** Verifique os logs no Supabase Edge Functions para mais detalhes sobre erros.
