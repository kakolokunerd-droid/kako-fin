# 🔧 Troubleshooting - Erro Groq API

## Problema: "Groq API error:" ou erro ao gerar insights

Se você está recebendo erros ao tentar usar o Groq, siga este guia de diagnóstico.

---

## ✅ Passo 1: Verificar Variáveis de Ambiente

### 1.1 Verificar se o arquivo `.env.local` existe

O arquivo deve estar na **raiz do projeto** (mesmo nível que `package.json`).

### 1.2 Verificar o conteúdo do `.env.local`

O arquivo deve conter:

```env
VITE_AI_PROVIDER=groq
VITE_AI_API_KEY=sua_chave_groq_aqui
```

**⚠️ IMPORTANTE:**
- A chave deve começar com `gsk_` (exemplo: `gsk_abc123...`)
- Não deve ter espaços ou aspas extras
- Não deve ter quebras de linha

### 1.3 Exemplo correto:

```env
VITE_AI_PROVIDER=groq
VITE_AI_API_KEY=gsk_abc123xyz456789
```

### 1.4 Exemplo INCORRETO (não faça isso):

```env
# ❌ ERRADO - com aspas
VITE_AI_API_KEY="gsk_abc123..."

# ❌ ERRADO - com espaços
VITE_AI_API_KEY = gsk_abc123...

# ❌ ERRADO - sem o prefixo VITE_
AI_API_KEY=gsk_abc123...
```

---

## ✅ Passo 2: Verificar Console do Navegador

1. Abra o app no navegador
2. Pressione `F12` para abrir o DevTools
3. Vá na aba **Console**
4. Expanda os Insights
5. Procure por mensagens que começam com:
   - `🔍 Configuração de IA:`
   - `🔍 Groq - Verificando configuração...`
   - `❌ Groq - Erro completo:`

### O que procurar:

**✅ Se você ver:**
```
🔍 API Key presente: Sim (gsk_abc123...)
```
→ A chave está sendo lida corretamente

**❌ Se você ver:**
```
🔍 API Key presente: Não
```
→ A variável não está sendo carregada

---

## ✅ Passo 3: Reiniciar o Servidor

**CRÍTICO:** Após modificar o `.env.local`, você **DEVE** reiniciar o servidor:

1. Pare o servidor (Ctrl+C no terminal)
2. Inicie novamente:
   ```bash
   npm run dev
   ```
3. Recarregue a página no navegador (F5)

---

## ✅ Passo 4: Verificar a Chave da API

### 4.1 Obter uma nova chave:

1. Acesse: https://console.groq.com/
2. Faça login
3. Vá em **API Keys**
4. Clique em **Create API Key**
5. Copie a chave (ela começa com `gsk_`)

### 4.2 Verificar se a chave está ativa:

1. No console do Groq, verifique se a chave está **ativa**
2. Verifique se não há **limites de uso** aplicados
3. Verifique se a conta não está **suspensa**

---

## ✅ Passo 5: Erros Comuns e Soluções

### Erro: "API key inválida ou expirada" (401)

**Causa:** A chave está incorreta ou foi revogada.

**Solução:**
1. Obtenha uma nova chave em https://console.groq.com/
2. Atualize o `.env.local` com a nova chave
3. Reinicie o servidor

### Erro: "Limite de requisições atingido" (429)

**Causa:** Você atingiu o limite de 14,400 requests/dia.

**Solução:**
1. Aguarde algumas horas
2. Ou verifique seu uso em https://console.groq.com/

### Erro: "Requisição inválida" (400)

**Causa:** Parâmetros inválidos na requisição.

**Solução:**
1. Verifique se o modelo está correto no `.env.local`:
   ```env
   VITE_AI_MODEL=llama-3.1-70b-versatile
   ```
2. Modelos válidos:
   - `llama-3.1-70b-versatile` (recomendado)
   - `llama-3.1-8b-instant`
   - `mixtral-8x7b-32768`

### Erro: "Groq API key não configurada"

**Causa:** A variável `VITE_AI_API_KEY` não está sendo lida.

**Solução:**
1. Verifique se o arquivo `.env.local` existe na raiz
2. Verifique se a variável está escrita corretamente: `VITE_AI_API_KEY`
3. Reinicie o servidor após adicionar

---

## ✅ Passo 6: Teste Manual

Para testar se a chave está funcionando, você pode usar este código no console do navegador:

```javascript
// Cole no console do navegador (F12)
fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer SUA_CHAVE_AQUI'
  },
  body: JSON.stringify({
    model: 'llama-3.1-70b-versatile',
    messages: [
      { role: 'user', content: 'Olá!' }
    ]
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

**Substitua `SUA_CHAVE_AQUI` pela sua chave real.**

Se funcionar, a chave está válida. Se não funcionar, verifique a chave no console do Groq.

---

## ✅ Checklist Final

Antes de reportar o problema, verifique:

- [ ] Arquivo `.env.local` existe na raiz do projeto
- [ ] Variável `VITE_AI_PROVIDER=groq` está configurada
- [ ] Variável `VITE_AI_API_KEY` está configurada (sem aspas, sem espaços)
- [ ] A chave começa com `gsk_`
- [ ] Servidor foi reiniciado após adicionar/modificar variáveis
- [ ] Página foi recarregada no navegador
- [ ] Console do navegador mostra `🔍 API Key presente: Sim`
- [ ] Chave está ativa no console do Groq (https://console.groq.com/)

---

## 📞 Ainda com Problemas?

Se após seguir todos os passos o problema persistir:

1. **Copie todas as mensagens do console** que começam com 🔍 ou ❌
2. **Verifique o status da API Groq:** https://status.groq.com/
3. **Verifique se há manutenção programada**

---

## 🔗 Links Úteis

- **Groq Console:** https://console.groq.com/
- **Documentação Groq:** https://console.groq.com/docs
- **Status da API:** https://status.groq.com/

