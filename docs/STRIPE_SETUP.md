# 💳 Configuração do Stripe para Assinaturas

## 📋 Pré-requisitos

1. Conta no Stripe criada
2. Acesso ao Dashboard do Stripe
3. Produtos e preços criados

---

## 🚀 Passo 1: Criar Produtos e Preços

### No Dashboard do Stripe:

1. Vá em **"Catálogo de produtos"** → **"Produtos"**
2. Clique em **"+ Adicionar produto"**

### Criar 3 Produtos:

#### Produto 1: Basic
- **Nome:** `Kako Fin - Basic`
- **Descrição:** `Plano Basic - R$ 4,99/mês`
- **Preço:** `R$ 4,99`
- **Cobrança:** Recorrente → Mensal
- **Salvar o Price ID:** `price_xxxxx` ⚠️ **IMPORTANTE**

#### Produto 2: Premium
- **Nome:** `Kako Fin - Premium`
- **Descrição:** `Plano Premium - R$ 9,99/mês`
- **Preço:** `R$ 9,99`
- **Cobrança:** Recorrente → Mensal
- **Salvar o Price ID:** `price_xxxxx` ⚠️ **IMPORTANTE**

#### Produto 3: Premium Plus
- **Nome:** `Kako Fin - Premium Plus`
- **Descrição:** `Plano Premium Plus - R$ 19,99/mês`
- **Preço:** `R$ 19,99`
- **Cobrança:** Recorrente → Mensal
- **Salvar o Price ID:** `price_xxxxx` ⚠️ **IMPORTANTE**

---

## 🔑 Passo 2: Obter Chaves da API

1. Vá em **"Desenvolvedores"** → **"Chaves da API"**
2. Você verá duas chaves:

### Chave Pública (Publishable Key)
- Começa com: `pk_test_...` (teste) ou `pk_live_...` (produção)
- **Usada no frontend** (React)
- Pode ser exposta publicamente

### Chave Secreta (Secret Key)
- Começa com: `sk_test_...` (teste) ou `sk_live_...` (produção)
- **Usada no backend** (NUNCA exponha no frontend!)
- Mantenha segura

### ⚠️ IMPORTANTE:
- Use as chaves de **TESTE** (`pk_test_` e `sk_test_`) durante desenvolvimento
- Só use as chaves de **PRODUÇÃO** (`pk_live_` e `sk_live_`) quando estiver pronto para receber pagamentos reais

---

## 🔔 Passo 3: Configurar Webhooks

### 3.1 Na Tela Atual do Stripe (Escolher Tipo de Destino)

**Você está vendo duas opções:**
1. **"Endpoint de webhook"** ← **ESCOLHA ESTA!** (já deve estar selecionada com borda roxa)
2. "Amazon EventBridge" (ignore esta)

**Ação:** Clique em **"Endpoint de webhook"** se ainda não estiver selecionado, depois clique em **"Continuar"** ou **"Próximo"**.

### 3.2 Obter URL do Webhook (Supabase Edge Function)

Como você usa **Supabase**, vamos usar **Supabase Edge Functions** (não precisa de backend separado!).

#### Passo 1: Deploy da Função

1. **Instale o Supabase CLI** (se ainda não tiver):
   ```bash
   npm install -g supabase
   ```

2. **Faça login no Supabase:**
   ```bash
   supabase login
   ```

3. **Link seu projeto:**
   ```bash
   supabase link --project-ref seu-project-ref
   ```
   (O project-ref você encontra no dashboard do Supabase → Settings → API)

4. **Faça deploy da função:**
   ```bash
   supabase functions deploy stripe-webhook
   ```

5. **Obtenha a URL da função:**
   - A URL será algo como: `https://seu-project-ref.supabase.co/functions/v1/stripe-webhook`
   - Você verá essa URL após o deploy

#### Passo 2: Configurar no Stripe

1. **Na tela do Stripe**, após escolher "Endpoint de webhook", você verá um campo **"URL do endpoint"**
2. **Cole a URL do Supabase:**
   ```
   https://seu-project-ref.supabase.co/functions/v1/stripe-webhook
   ```
   (Substitua `seu-project-ref` pelo seu project ref do Supabase)

3. **Eventos para escutar** (selecione estes):
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`

4. **Clique em "Adicionar endpoint"**

5. **Salvar o Signing Secret:**
   - Após criar, você verá um **"Signing secret"** (começa com `whsec_...`)
   - ⚠️ **IMPORTANTE:** Copie e guarde este secret! Você precisará configurar no Supabase

### 3.3 Configurar Variáveis de Ambiente no Supabase

1. **No Dashboard do Supabase:**
   - Vá em **"Project Settings"** → **"Edge Functions"** → **"Secrets"**

2. **Adicione estas variáveis:**
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx (o que você copiou do Stripe)
   STRIPE_SECRET_KEY=sk_test_xxxxx (sua chave secreta do Stripe)
   STRIPE_PRICE_BASIC=price_xxxxx (Price ID do Basic)
   STRIPE_PRICE_PREMIUM=price_xxxxx (Price ID do Premium)
   STRIPE_PRICE_PREMIUM_PLUS=price_xxxxx (Price ID do Premium Plus)
   ```

3. **As variáveis `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já estão disponíveis automaticamente** nas Edge Functions

### 3.2 O que são Webhooks?

Webhooks são notificações que o Stripe envia para seu servidor quando eventos acontecem:

- **Pagamento aprovado** → Atualiza status no banco
- **Assinatura criada** → Ativa plano do usuário
- **Pagamento falhou** → Notifica usuário
- **Assinatura cancelada** → Remove acesso

---

## 🧪 Passo 4: Testar Assinaturas

### Cartões de Teste do Stripe:

#### Cartão de Sucesso:
```
Número: 4242 4242 4242 4242
CVC: Qualquer 3 dígitos (ex: 123)
Data: Qualquer data futura (ex: 12/25)
```

#### Cartão de Falha:
```
Número: 4000 0000 0000 0002
CVC: Qualquer 3 dígitos
Data: Qualquer data futura
```

### Como Testar:

1. Na página de **"Assinaturas"**, clique em **"Crie uma assinatura de teste"**
2. Use um dos cartões de teste acima
3. Verifique se o webhook foi recebido
4. Confirme que o banco de dados foi atualizado

---

## 🔄 Passo 5: Modo de Teste vs Produção

### Modo de Teste (Área Restrita):
- ✅ Use durante desenvolvimento
- ✅ Não cobra dinheiro real
- ✅ Permite testar todos os fluxos
- ✅ Chaves começam com `test_`

### Modo de Produção:
- ⚠️ Cobra dinheiro real
- ⚠️ Só ative quando estiver 100% pronto
- ⚠️ Chaves começam com `live_`

### Como Alternar:
- No topo do dashboard, clique em **"Alternar para conta de produção"**
- ⚠️ **CUIDADO:** Só faça isso quando estiver pronto!

---

## 📝 Informações para Salvar

Crie um arquivo `.env.local` (NUNCA commite no Git!):

```env
# Stripe - Modo de Teste
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Price IDs dos Planos
STRIPE_PRICE_BASIC=price_xxxxx
STRIPE_PRICE_PREMIUM=price_xxxxx
STRIPE_PRICE_PREMIUM_PLUS=price_xxxxx
```

### ⚠️ IMPORTANTE:
- **NUNCA** commite o arquivo `.env.local` no Git
- Adicione `.env.local` ao `.gitignore`
- Use variáveis de ambiente diferentes para produção (Vercel, etc.)

---

## 🎯 Estrutura de Integração

### Fluxo Completo:

```
1. Usuário escolhe plano (Frontend)
   ↓
2. Frontend cria sessão de checkout (chama backend)
   ↓
3. Backend cria sessão no Stripe (usa Secret Key)
   ↓
4. Stripe retorna URL de checkout
   ↓
5. Frontend redireciona usuário para Stripe
   ↓
6. Usuário preenche dados do cartão (no Stripe)
   ↓
7. Stripe processa pagamento
   ↓
8. Stripe envia webhook para seu backend
   ↓
9. Backend valida webhook e atualiza Supabase
   ↓
10. Frontend atualiza UI mostrando plano ativo
```

---

## 🔒 Segurança

### ✅ O que fazer:
- ✅ Use HTTPS em produção
- ✅ Valide webhooks usando o Signing Secret
- ✅ Nunca exponha a Secret Key no frontend
- ✅ Use variáveis de ambiente
- ✅ Valide dados antes de atualizar o banco

### ❌ O que NÃO fazer:
- ❌ Nunca commite chaves no Git
- ❌ Nunca use Secret Key no frontend
- ❌ Nunca confie em dados do frontend sem validar
- ❌ Nunca processe webhooks sem validar assinatura

---

## 📚 Recursos Úteis

- **Documentação Stripe:** https://stripe.com/docs
- **API Reference:** https://stripe.com/docs/api
- **Webhooks Guide:** https://stripe.com/docs/webhooks
- **Test Cards:** https://stripe.com/docs/testing
- **Dashboard:** https://dashboard.stripe.com

---

## 🐛 Troubleshooting

### Erro: "Invalid API Key"
- Verifique se está usando a chave correta (test vs live)
- Confirme que não há espaços extras na chave

### Webhook não está sendo recebido
- Verifique se a URL está correta
- Use ngrok para testar localmente
- Confirme que o endpoint está acessível publicamente

### Pagamento aprovado mas usuário não tem acesso
- Verifique se o webhook está atualizando o banco
- Confirme que o evento está sendo processado corretamente
- Verifique logs do backend

---

## ✅ Checklist de Configuração

- [ ] Produtos criados (Basic, Premium, Premium Plus)
- [ ] Price IDs salvos
- [ ] Chaves da API obtidas (teste)
- [ ] Webhook configurado
- [ ] Signing Secret salvo
- [ ] Testado com cartão de teste
- [ ] Variáveis de ambiente configuradas
- [ ] `.env.local` adicionado ao `.gitignore`

---

**Próximo passo:** Após configurar tudo, podemos começar a implementar a integração no código! 🚀
