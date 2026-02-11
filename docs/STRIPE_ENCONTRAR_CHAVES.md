# 🔑 Como Encontrar Price IDs e Chaves da API no Stripe

## 📦 Passo 1: Encontrar os Price IDs

### Opção A: Pela Lista de Produtos

1. **Na página "Catálogo de produtos"** (onde você está agora)
2. **Clique no nome do produto** (ex: "Kako Fin - Basic")
3. **Na página do produto**, você verá uma seção **"Preços"**
4. **O Price ID** aparece como: `price_xxxxx` (ex: `price_1ABC123...`)
5. **Copie este ID** e anote qual produto é

### Opção B: Clicando no Preço

1. **Na lista de produtos**, passe o mouse sobre o preço (ex: "R$ 4,99")
2. **Clique no preço**
3. Você será redirecionado para a página do preço
4. **O Price ID** aparece no topo da página ou na URL

### ✅ Anotar os 3 Price IDs:

```
Basic: price_xxxxx
Premium: price_xxxxx
Premium Plus: price_xxxxx
```

---

## 🔐 Passo 2: Encontrar as Chaves da API

### Localização:

1. **No menu lateral esquerdo**, procure por **"Desenvolvedores"** (Developers)
2. **Clique em "Desenvolvedores"**
3. **No submenu**, clique em **"Chaves da API"** (API keys)

### O que você verá:

#### 🔵 Chave Pública (Publishable key)
- **Começa com:** `pk_test_...` (modo teste) ou `pk_live_...` (produção)
- **Onde usar:** Frontend (React) - pode ser exposta publicamente
- **Ação:** Clique no ícone de **"Revelar chave de teste"** ou **"Copiar**

#### 🔴 Chave Secreta (Secret key)
- **Começa com:** `sk_test_...` (modo teste) ou `sk_live_...` (produção)
- **Onde usar:** Backend (Supabase Edge Functions) - NUNCA exponha!
- **Ação:** Clique no ícone de **"Revelar chave de teste"** ou **"Copiar**

### ⚠️ IMPORTANTE:

- **Use as chaves de TESTE** (`pk_test_` e `sk_test_`) durante desenvolvimento
- **Só use PRODUÇÃO** (`pk_live_` e `sk_live_`) quando estiver pronto para receber pagamentos reais
- Você está em **"Área restrita"** (modo teste), então use as chaves de teste

---

## 📝 Passo 3: Organizar as Informações

Crie um arquivo temporário (ou anote em um lugar seguro) com:

```env
# Price IDs
STRIPE_PRICE_BASIC=price_xxxxx
STRIPE_PRICE_PREMIUM=price_xxxxx
STRIPE_PRICE_PREMIUM_PLUS=price_xxxxx

# Chaves da API (TESTE)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
```

### ⚠️ NUNCA commite essas informações no Git!

---

## 🎯 Resumo Rápido

### Price IDs:
1. Clique no produto → Veja "Preços" → Copie o `price_xxxxx`

### Chaves da API:
1. Menu lateral → "Desenvolvedores" → "Chaves da API"
2. Copie `pk_test_...` (Publishable key)
3. Copie `sk_test_...` (Secret key)

---

## ✅ Checklist

- [ ] Price ID do Basic copiado
- [ ] Price ID do Premium copiado
- [ ] Price ID do Premium Plus copiado
- [ ] Chave Pública (pk_test_...) copiada
- [ ] Chave Secreta (sk_test_...) copiada
- [ ] Todas as informações anotadas em local seguro

---

**Próximo passo:** Após copiar tudo, vamos configurar essas informações no Supabase! 🚀
