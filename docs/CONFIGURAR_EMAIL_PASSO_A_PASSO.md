# 🚀 Configurar Email - Passo a Passo

## ✅ Passo 1: Verificar se a API Key foi criada

Você já fez isso! A API key foi criada há 6 minutos. Agora precisamos configurá-la no projeto.

## 📝 Passo 2: Criar/Editar arquivo .env.local

1. Na raiz do projeto (mesma pasta onde está o `package.json`), crie ou edite o arquivo `.env.local`
2. Adicione estas linhas (substitua `re_sua_chave_aqui` pela sua chave real):

```env
VITE_RESEND_API_KEY=re_sua_chave_aqui
VITE_FROM_EMAIL=onboarding@resend.dev
```

**Exemplo:**
```env
VITE_RESEND_API_KEY=re_abc123xyz456
VITE_FROM_EMAIL=onboarding@resend.dev
```

⚠️ **IMPORTANTE:**
- Não coloque espaços antes ou depois do `=`
- Não coloque aspas ao redor do valor
- A chave deve começar com `re_`

## 🔄 Passo 3: Reiniciar o Servidor

**CRÍTICO:** Variáveis de ambiente só são carregadas quando o servidor inicia!

1. Pare o servidor atual (pressione `Ctrl+C` no terminal)
2. Inicie novamente:
   ```bash
   npm run dev
   ```

## 🧪 Passo 4: Testar

1. Abra o navegador e acesse o app
2. Abra o Console do Navegador (F12 → Console)
3. Tente recuperar a senha:
   - Clique em "Esqueci minha senha"
   - Digite um email cadastrado
   - Clique em "Enviar Senha Provisória"

4. **No console, você deve ver:**
   ```
   🔍 Verificando configuração de email...
   🔍 API Key configurada: Sim (re_xxxxx...)
   🔍 Email remetente: onboarding@resend.dev
   📧 Tentando enviar email para: seu@email.com
   📧 Status da resposta: 200
   ✅ Email enviado com sucesso
   ```

## ❌ Se ainda não funcionar:

### Verificação 1: Arquivo existe?
- Confirme que o arquivo `.env.local` está na **raiz do projeto** (mesma pasta do `package.json`)
- Não deve estar em uma subpasta

### Verificação 2: Nome correto?
- O arquivo deve se chamar exatamente `.env.local` (com o ponto no início)
- No Windows, pode ser necessário criar como `.env.local.` (com ponto no final) e depois renomear

### Verificação 3: Variável correta?
- Deve ser `VITE_RESEND_API_KEY` (não `RESEND_API_KEY` ou `VITE_RESEND_KEY`)
- O prefixo `VITE_` é obrigatório para variáveis expostas no frontend

### Verificação 4: Servidor reiniciado?
- Pare completamente o servidor (Ctrl+C)
- Inicie novamente com `npm run dev`
- Variáveis só são carregadas na inicialização

### Verificação 5: Console do navegador
- Abra F12 → Console
- Procure por mensagens que começam com 🔍
- Se aparecer "API Key configurada: Não", a variável não está sendo carregada

## 🔍 Verificação Rápida no Código

Você pode verificar se a variável está sendo carregada adicionando temporariamente no console:

1. Abra o console do navegador (F12)
2. Digite:
   ```javascript
   console.log(import.meta.env.VITE_RESEND_API_KEY)
   ```
3. Se aparecer `undefined`, a variável não está configurada
4. Se aparecer a chave (começando com `re_`), está configurada corretamente

## 📋 Checklist Final

- [ ] API Key criada no Resend (✅ já feito)
- [ ] Arquivo `.env.local` criado na raiz do projeto
- [ ] Variável `VITE_RESEND_API_KEY` adicionada com a chave correta
- [ ] Variável `VITE_FROM_EMAIL` adicionada (ou usando padrão)
- [ ] Servidor foi **reiniciado** após adicionar variáveis
- [ ] Console do navegador mostra "API Key configurada: Sim"
- [ ] Tentou recuperar senha e verificou o console

## 🆘 Ainda com problemas?

Se após seguir todos os passos ainda não funcionar:

1. Compartilhe o que aparece no console do navegador (F12)
2. Verifique se o arquivo `.env.local` está na pasta correta
3. Confirme que reiniciou o servidor após configurar

