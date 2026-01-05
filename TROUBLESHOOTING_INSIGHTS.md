# 🔧 Troubleshooting - Insights não Carregam no Mobile

## Problema: Insights não carregam ao expandir no celular

Os Insights dependem da API do Google Gemini. Se não estão carregando, verifique:

---

## ✅ Solução 1: Configurar Variável na Vercel (Produção)

Se o app está hospedado na Vercel, você **DEVE** configurar a variável de ambiente lá:

### Passo a Passo:

1. **Acesse o Dashboard da Vercel**
   - Vá para https://vercel.com
   - Faça login
   - Selecione seu projeto

2. **Vá em Settings → Environment Variables**

3. **Adicione a variável:**
   - **Nome:** `GEMINI_API_KEY`
   - **Valor:** Sua chave da API do Gemini
   - **Ambientes:** Marque todas (Production, Preview, Development)

4. **Faça um novo deploy:**
   - Vá em Deployments
   - Clique nos 3 pontos do último deployment
   - Selecione "Redeploy"
   - Ou faça um novo commit para trigger automático

### ⚠️ IMPORTANTE:
- A variável deve se chamar exatamente `GEMINI_API_KEY` (não `VITE_GEMINI_API_KEY`)
- Após adicionar, você **DEVE** fazer um novo deploy
- Variáveis de ambiente só são incluídas no build durante o deploy

---

## ✅ Solução 2: Verificar se a API Key está Configurada

### No Desenvolvimento Local:

1. Verifique se o arquivo `.env.local` existe na raiz do projeto
2. Confirme que contém:
   ```env
   GEMINI_API_KEY=sua_chave_aqui
   ```
3. Reinicie o servidor após adicionar:
   ```bash
   npm run dev
   ```

### Em Produção (Vercel):

1. Verifique no Dashboard da Vercel se a variável está configurada
2. Confirme que está marcada para o ambiente correto (Production)
3. Faça um novo deploy após configurar

---

## ✅ Solução 3: Verificar se a API Key é Válida

1. **Obter nova API Key:**
   - Acesse https://aistudio.google.com/app/apikey
   - Faça login
   - Crie uma nova chave se necessário
   - Copie a chave

2. **Testar a chave:**
   - Configure no `.env.local` (local) ou Vercel (produção)
   - Reinicie/faz deploy
   - Teste novamente

---

## ✅ Solução 4: Verificar Console do Navegador

No celular, abra o console para ver erros:

### Android (Chrome):
1. Conecte o celular ao computador via USB
2. No Chrome do PC, vá em `chrome://inspect`
3. Selecione seu dispositivo
4. Abra o console e veja os erros

### iOS (Safari):
1. No Mac, abra Safari
2. Vá em Preferências → Avançado → "Mostrar menu Desenvolver"
3. Conecte o iPhone
4. No menu Desenvolver, selecione seu iPhone
5. Abra o console

### Erros Comuns:

**"API key não encontrada"**
- A variável `GEMINI_API_KEY` não está configurada

**"Erro ao chamar Gemini"**
- API key inválida ou sem créditos
- Problema de rede/CORS

**"process.env.API_KEY is undefined"**
- Variável não foi incluída no build
- Precisa fazer novo deploy

---

## ✅ Solução 5: Verificar se o Usuário Tem Acesso

Os Insights só aparecem para usuários que:
- ✅ Contribuíram para o projeto
- ✅ Contribuíram há menos de 30 dias

**Verificar:**
1. Acesse a tela de Admin (se for admin)
2. Verifique se seu email tem `lastContributionDate` configurado
3. Se não tiver, adicione uma contribuição para seu email

---

## 🔍 Diagnóstico Rápido

### Checklist:

- [ ] Variável `GEMINI_API_KEY` configurada na Vercel?
- [ ] Novo deploy feito após configurar a variável?
- [ ] API key válida e com créditos?
- [ ] Usuário tem `lastContributionDate` configurado?
- [ ] Console do navegador mostra algum erro?
- [ ] App está em produção ou desenvolvimento?

---

## 🧪 Teste Manual

Para testar se a API key está funcionando:

1. Abra o console do navegador (F12)
2. Expanda os Insights
3. Procure por mensagens como:
   - "Erro ao chamar Gemini"
   - "API key não encontrada"
   - Qualquer erro relacionado a `process.env.API_KEY`

4. Se aparecer erro, anote a mensagem exata
5. Use a mensagem para identificar o problema específico

---

## 📝 Configuração Completa na Vercel

### Variáveis de Ambiente Necessárias:

```
GEMINI_API_KEY=sua_chave_gemini
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon
VITE_EMAILJS_SERVICE_ID=seu_service_id (opcional)
VITE_EMAILJS_TEMPLATE_ID=seu_template_id (opcional)
VITE_EMAILJS_PUBLIC_KEY=sua_public_key (opcional)
```

### Importante:
- `GEMINI_API_KEY` (sem `VITE_`) - usada no build
- Variáveis com `VITE_` são expostas ao cliente
- `GEMINI_API_KEY` é processada no build, não exposta

---

## 🚨 Se Nada Funcionar

1. **Verifique os logs da Vercel:**
   - Vá em Deployments → Selecione o deployment
   - Veja os logs do build
   - Procure por erros relacionados a variáveis de ambiente

2. **Teste localmente primeiro:**
   - Configure `.env.local`
   - Teste no navegador do PC
   - Se funcionar local, o problema é na Vercel

3. **Verifique a biblioteca:**
   - O projeto usa `@google/genai`
   - Se houver erros, pode precisar migrar para `@google/generative-ai`

---

## 💡 Dica Extra

Se os Insights não carregarem, o app ainda funciona normalmente. Os Insights são um recurso adicional que requer:
- API key do Gemini configurada
- Usuário com contribuição ativa
- Conexão com internet

O app funciona perfeitamente sem os Insights!

