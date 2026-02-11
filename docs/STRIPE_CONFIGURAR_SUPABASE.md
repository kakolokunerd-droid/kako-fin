# ⚙️ Configurar Stripe no Supabase - Passo a Passo

## 📋 O que você já tem:

✅ 3 Price IDs (Basic, Premium, Premium Plus)  
✅ Chave Pública (pk_test_...)  
✅ Chave Secreta (sk_test_...)  

---

## 🚀 Passo 1: Deploy da Função de Webhook

### 1.1 Instalar Supabase CLI (se ainda não tiver)

```bash
npm install -g supabase
```

### 1.2 Fazer login no Supabase

```bash
supabase login
```

Isso abrirá o navegador para você fazer login.

### 1.3 Linkar seu projeto

```bash
supabase link --project-ref SEU_PROJECT_REF
```

**Onde encontrar o Project Ref:**
- Dashboard do Supabase → Settings → API
- Procure por "Reference ID" ou "Project URL"
- Exemplo: Se sua URL é `https://abcdefghijklmnop.supabase.co`, então o project-ref é `abcdefghijklmnop`

### 1.4 Fazer deploy da função

```bash
supabase functions deploy stripe-webhook
```

**Após o deploy, você verá:**
```
✅ Function stripe-webhook deployed successfully!
URL: https://SEU_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
```

**⚠️ COPIE ESTA URL!** Você precisará no próximo passo.

---

## 🔐 Passo 2: Configurar Variáveis de Ambiente no Supabase

### 2.1 Acessar Secrets do Supabase

1. **No Dashboard do Supabase:**
   - Vá em **"Project Settings"** (ícone de engrenagem no canto inferior esquerdo)
   - Clique em **"Edge Functions"** no menu lateral
   - Clique em **"Secrets"**

### 2.2 Adicionar as Variáveis

Clique em **"+ Add new secret"** e adicione cada uma:

#### Secret 1: STRIPE_WEBHOOK_SECRET
- **Nome:** `STRIPE_WEBHOOK_SECRET`
- **Valor:** `whsec_xxxxx` (você vai pegar isso depois, quando configurar o webhook no Stripe)
- **Por enquanto:** Deixe vazio ou use um placeholder temporário

#### Secret 2: STRIPE_SECRET_KEY
- **Nome:** `STRIPE_SECRET_KEY`
- **Valor:** `sk_test_xxxxx` (a chave secreta que você copiou)

#### Secret 3: STRIPE_PRICE_BASIC
- **Nome:** `STRIPE_PRICE_BASIC`
- **Valor:** `price_xxxxx` (Price ID do Basic que você copiou)

#### Secret 4: STRIPE_PRICE_PREMIUM
- **Nome:** `STRIPE_PRICE_PREMIUM`
- **Valor:** `price_xxxxx` (Price ID do Premium que você copiou)

#### Secret 5: STRIPE_PRICE_PREMIUM_PLUS
- **Nome:** `STRIPE_PRICE_PREMIUM_PLUS`
- **Valor:** `price_xxxxx` (Price ID do Premium Plus que você copiou)

### 2.3 Salvar

Após adicionar todas, clique em **"Save"** ou **"Update"**

---

## 🔔 Passo 3: Configurar Webhook no Stripe

### 3.1 Acessar Webhooks no Stripe

1. **No Stripe Dashboard:**
   - Menu lateral → **"Desenvolvedores"** → **"Webhooks"**
   - Clique em **"+ Adicionar endpoint"**

### 3.2 Configurar o Endpoint

1. **Escolha "Endpoint de webhook"** (já deve estar selecionado)
2. **Clique em "Continuar"**

### 3.3 Configurar a URL

1. **No campo "URL do endpoint":**
   - Cole a URL que você copiou do deploy:
   ```
   https://SEU_PROJECT_REF.supabase.co/functions/v1/stripe-webhook
   ```

### 3.4 Selecionar Eventos

Marque estes eventos:
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

### 3.5 Criar o Endpoint

1. Clique em **"Adicionar endpoint"**
2. **Copie o "Signing secret"** (começa com `whsec_...`)
3. ⚠️ **IMPORTANTE:** Volte ao Supabase e adicione este secret como `STRIPE_WEBHOOK_SECRET`

---

## ✅ Passo 4: Verificar Configuração

### 4.1 Testar o Webhook

1. **No Stripe:**
   - Vá em **"Desenvolvedores"** → **"Webhooks"**
   - Clique no endpoint que você criou
   - Clique em **"Enviar evento de teste"**
   - Escolha: `customer.subscription.created`
   - Clique em **"Enviar evento de teste"**

### 4.2 Verificar Logs

1. **No Supabase:**
   - Vá em **"Edge Functions"** → **"stripe-webhook"** → **"Logs"**
   - Você deve ver: `✅ Webhook recebido: customer.subscription.created`

Se aparecer erro, verifique:
- ✅ Todas as variáveis estão configuradas no Supabase?
- ✅ O Signing Secret está correto?
- ✅ A URL do webhook está correta no Stripe?

---

## 📝 Checklist Final

- [ ] Supabase CLI instalado
- [ ] Projeto linkado (`supabase link`)
- [ ] Função deployada (`supabase functions deploy stripe-webhook`)
- [ ] URL do webhook copiada
- [ ] Todas as 5 variáveis configuradas no Supabase Secrets
- [ ] Webhook criado no Stripe com a URL correta
- [ ] Eventos selecionados no Stripe
- [ ] Signing Secret copiado e adicionado no Supabase
- [ ] Teste de webhook enviado e funcionando
- [ ] Logs verificados no Supabase

---

## 🎯 Próximos Passos

Após configurar tudo:

1. ✅ Implementar checkout no frontend
2. ✅ Criar função para criar sessão de checkout
3. ✅ Testar fluxo completo de pagamento
4. ✅ Verificar se o banco de dados é atualizado corretamente

---

## 🐛 Troubleshooting

### Erro: "Function not found"
- Verifique se fez o deploy: `supabase functions deploy stripe-webhook`
- Confirme que está no projeto correto: `supabase projects list`

### Erro: "STRIPE_WEBHOOK_SECRET não configurado"
- Vá em Supabase → Settings → Edge Functions → Secrets
- Adicione a variável `STRIPE_WEBHOOK_SECRET`

### Erro: "Webhook signature verification failed"
- Verifique se o `STRIPE_WEBHOOK_SECRET` no Supabase é o mesmo do Stripe
- Certifique-se de copiar o secret completo (começa com `whsec_`)

### Webhook não está sendo recebido
- Verifique se a URL está correta no Stripe
- Confirme que a função foi deployada com sucesso
- Verifique os logs no Supabase Edge Functions

---

**Pronto!** Agora você tem tudo configurado. Vamos para a próxima etapa: implementar o checkout no frontend! 🚀
