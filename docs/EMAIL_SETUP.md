# Configuração de Envio de Email

Este guia explica como configurar o envio de emails para recuperação de senha usando Resend diretamente do aplicativo.

## Passo 1: Criar Conta no Resend

1. Acesse [resend.com](https://resend.com)
2. Crie uma conta gratuita (100 emails/dia no plano gratuito)
3. Vá em **API Keys** e crie uma nova chave
4. Copie a chave API (começa com `re_`)

## Passo 2: Configurar Variáveis de Ambiente

1. Abra o arquivo `.env.local` na raiz do projeto (crie se não existir)
2. Adicione as seguintes variáveis:

```env
# Resend API Key (obrigatório)
VITE_RESEND_API_KEY=re_sua_chave_api_aqui

# Email remetente (opcional, padrão: onboarding@resend.dev)
VITE_FROM_EMAIL=onboarding@resend.dev
```

**Nota**: Para testes, você pode usar `onboarding@resend.dev` como remetente. Para produção, configure um domínio verificado no Resend.

## Passo 3: Configurar Domínio (Opcional mas Recomendado para Produção)

Para enviar emails de um domínio próprio e evitar que caiam em spam:

1. No Resend, vá em **Domains**
2. Adicione seu domínio
3. Configure os registros DNS conforme instruções do Resend
4. Após verificação, atualize `VITE_FROM_EMAIL` no `.env.local`:
   ```env
   VITE_FROM_EMAIL=noreply@seudominio.com
   ```

## Passo 4: Reiniciar o Servidor

Após configurar as variáveis de ambiente:

```bash
npm run dev
```

## Como Funciona

O aplicativo agora envia emails diretamente usando a API do Resend, sem depender de Supabase Edge Functions. Isso significa:

- ✅ Funciona com conta gratuita do Supabase
- ✅ Não requer deploy de Edge Functions
- ✅ Configuração mais simples
- ⚠️ A API key fica exposta no frontend (aceitável para este caso de uso)

## Testando

1. Acesse a tela de login
2. Clique em "Esqueci minha senha"
3. Digite um email cadastrado
4. Verifique sua caixa de entrada (e spam) para receber a senha provisória

## Troubleshooting

### Erro: "RESEND_API_KEY não configurada"

- Verifique se o arquivo `.env.local` existe na raiz do projeto
- Confirme que a variável `VITE_RESEND_API_KEY` está configurada
- Reinicie o servidor de desenvolvimento após adicionar a variável

### Erro: "Erro ao enviar email"

- Verifique se a API key do Resend está correta
- Confirme que a conta do Resend está ativa
- Verifique os logs do console do navegador para mais detalhes

### Emails não chegam

- Verifique a pasta de spam
- Confirme que o email de destino está correto
- Se estiver usando `onboarding@resend.dev`, alguns provedores podem bloquear
- Configure um domínio verificado no Resend para melhor deliverability

### Erro de CORS

- A API do Resend suporta requisições do navegador
- Se houver erro de CORS, verifique se está usando a URL correta: `https://api.resend.com/emails`

## Custos

- **Resend**: 100 emails/dia grátis, depois $20/mês para 50k emails
- **Sem custos adicionais**: Não requer Supabase Pro ou Edge Functions

## Segurança

⚠️ **Importante**:
- A API key do Resend fica exposta no código do frontend
- Para este caso de uso (recuperação de senha), isso é aceitável
- A API key do Resend pode ser restrita por domínio no painel do Resend
- Para maior segurança em produção, considere criar um backend simples que faça o proxy da requisição

## Limitações do Plano Gratuito

- 100 emails por dia
- Emails podem ir para spam se usar `onboarding@resend.dev`
- Recomendado configurar domínio próprio para produção

## Exemplo de .env.local

```env
# Gemini API
GEMINI_API_KEY=sua_chave_gemini

# Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon

# Resend (Email)
VITE_RESEND_API_KEY=re_sua_chave_resend
VITE_FROM_EMAIL=onboarding@resend.dev
```
