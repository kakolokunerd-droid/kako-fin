# Troubleshooting - Envio de Email

## Como Diagnosticar Problemas

### 1. Verificar Console do Navegador

Abra o console do navegador (F12) e procure por mensagens que começam com:
- 🔍 (verificação de configuração)
- 📧 (tentativa de envio)
- ❌ (erros)

### 2. Verificar Variáveis de Ambiente

1. Confirme que o arquivo `.env.local` existe na raiz do projeto
2. Verifique se contém:
   ```env
   VITE_RESEND_API_KEY=re_sua_chave_aqui
   VITE_FROM_EMAIL=onboarding@resend.dev
   ```
3. **IMPORTANTE**: Reinicie o servidor após adicionar/modificar variáveis de ambiente:
   ```bash
   # Pare o servidor (Ctrl+C)
   # Inicie novamente
   npm run dev
   ```

### 3. Verificar API Key do Resend

- A API key deve começar com `re_`
- Verifique se está ativa no painel do Resend
- Confirme que não expirou

### 4. Erros Comuns e Soluções

#### Erro: "RESEND_API_KEY não configurada"
**Solução:**
- Verifique se o arquivo `.env.local` existe
- Confirme que a variável está escrita corretamente: `VITE_RESEND_API_KEY` (não `RESEND_API_KEY`)
- Reinicie o servidor de desenvolvimento

#### Erro: "API key inválida ou sem permissão"
**Solução:**
- Verifique se a API key está correta no Resend
- Confirme que a API key não foi revogada
- Gere uma nova API key se necessário

#### Erro: "Erro de conexão"
**Solução:**
- Verifique sua conexão com a internet
- Verifique se há firewall bloqueando
- Tente novamente em alguns instantes

#### Erro: "Limite de emails excedido"
**Solução:**
- O plano gratuito do Resend permite 100 emails/dia
- Aguarde até o próximo dia ou faça upgrade do plano

#### Erro: "Dados inválidos"
**Solução:**
- Verifique se o email de destino está correto
- Confirme que o email remetente está configurado corretamente

### 5. Testar Configuração

1. Abra o console do navegador (F12)
2. Tente recuperar a senha
3. Procure por estas mensagens no console:
   ```
   🔍 Verificando configuração de email...
   🔍 API Key configurada: Sim (re_xxxxx...)
   🔍 Email remetente: onboarding@resend.dev
   📧 Tentando enviar email para: seu@email.com
   📧 Status da resposta: 200
   ✅ Email enviado com sucesso
   ```

### 6. Verificar Resposta da API

Se o erro persistir, verifique a resposta completa no console. Ela mostrará:
- Status HTTP (200 = sucesso, 401 = não autorizado, etc.)
- Mensagem de erro específica da API do Resend

### 7. Checklist Rápido

- [ ] Arquivo `.env.local` existe na raiz do projeto
- [ ] Variável `VITE_RESEND_API_KEY` está configurada
- [ ] API key começa com `re_`
- [ ] Servidor foi reiniciado após configurar variáveis
- [ ] Conta do Resend está ativa
- [ ] Não excedeu o limite de 100 emails/dia
- [ ] Email de destino está correto

### 8. Teste Manual da API

Se quiser testar a API do Resend diretamente, você pode usar este comando no console do navegador (após configurar a API key):

```javascript
fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer re_sua_chave_aqui'
  },
  body: JSON.stringify({
    from: 'onboarding@resend.dev',
    to: 'seu@email.com',
    subject: 'Teste',
    html: '<p>Teste de email</p>'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

### 9. Contato

Se o problema persistir:
1. Verifique os logs completos no console
2. Verifique o status da conta no Resend
3. Confirme que todas as variáveis de ambiente estão corretas

