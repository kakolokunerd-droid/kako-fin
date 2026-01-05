# Segurança de Senhas e Recuperação

## Implementações Realizadas

### 1. Criptografia de Senhas

As senhas agora são armazenadas com hash usando **Web Crypto API** (SHA-256 com salt):

- **Arquivo**: `services/passwordService.ts`
- **Funções**:
  - `hashPassword(password)`: Gera hash da senha com salt aleatório
  - `verifyPassword(password, hashedPassword)`: Verifica se a senha corresponde ao hash
  - `generateTemporaryPassword()`: Gera senha provisória aleatória (8 caracteres)

### 2. Atualização do Sistema de Autenticação

**Arquivo**: `services/db.ts`

- `savePassword()`: Agora faz hash automaticamente antes de salvar
- `verifyPassword()`: Nova função para verificar senhas usando hash
- `recoverPassword()`: Nova função para salvar senha provisória
- **Migração automática**: Senhas antigas em texto plano são automaticamente migradas para hash no primeiro login

**Arquivo**: `App.tsx`

- `handleLogin()`: Atualizado para usar `verifyPassword()` em vez de comparação direta
- `changePassword()`: Atualizado para usar hash
- `handlePasswordRecovery()`: Nova função para processar recuperação de senha

### 3. Recuperação de Senha

**Arquivo**: `services/emailService.ts`

- `sendPasswordRecoveryEmail()`: Função para enviar senha provisória por email usando Supabase Edge Functions
- **Integração**: Usa Supabase Edge Functions com Resend para envio real de emails
- **Configuração**: Requer deploy da Edge Function e configuração de variáveis de ambiente (veja `EMAIL_SETUP.md`)

**Interface**: Tela de Login (`App.tsx`)

- Botão "Esqueci minha senha" na tela de login
- Modal de recuperação com formulário
- Geração automática de senha provisória
- **Senha enviada por email** (não exibida na tela)
- Mensagem de sucesso informando que o email foi enviado

## Como Funciona

### Login Normal

1. Usuário digita email e senha
2. Sistema busca hash da senha do banco
3. Compara senha digitada com hash usando `verifyPassword()`
4. Se corresponder, permite login

### Recuperação de Senha

1. Usuário clica em "Esqueci minha senha"
2. Digita o email cadastrado
3. Sistema verifica se o email existe
4. Gera senha provisória aleatória (8 caracteres)
5. Salva senha provisória com hash
6. **Envia senha provisória por email** via Supabase Edge Function
7. Usuário recebe email com senha provisória
8. Usuário faz login com senha provisória e altera no perfil

### Migração de Senhas Antigas

- Senhas antigas em texto plano são automaticamente migradas para hash no primeiro login
- Compatibilidade mantida com sistema antigo

## Configuração de Email

O envio de email está implementado usando **Resend API diretamente do aplicativo** (sem necessidade de Supabase Edge Functions).

### Passos para Configurar:

1. **Criar conta no Resend**: https://resend.com
2. **Obter API Key** do Resend
3. **Configurar variáveis de ambiente** no arquivo `.env.local`:
   - `VITE_RESEND_API_KEY`: Sua chave API do Resend
   - `VITE_FROM_EMAIL`: Email remetente (opcional, padrão: `onboarding@resend.dev`)

**Documentação completa**: Veja `EMAIL_SETUP.md`

### 3. Melhorias de Segurança (Opcional)

- Adicionar rate limiting para recuperação de senha
- Adicionar expiração para senhas provisórias (ex: 24 horas)
- Adicionar log de tentativas de recuperação
- Implementar CAPTCHA para prevenir abuso

## Estrutura de Hash

O hash é armazenado no formato: `hash:salt`

- **hash**: Hash SHA-256 da senha + salt
- **salt**: 16 bytes aleatórios em hexadecimal

Exemplo: `a1b2c3d4e5f6...:f9e8d7c6b5a4...`

## Testes

Para testar a funcionalidade:

1. **Teste de Login**:

   - Faça login com senha existente
   - Verifique que funciona normalmente

2. **Teste de Recuperação**:

   - Clique em "Esqueci minha senha"
   - Digite um email cadastrado
   - Verifique sua caixa de entrada (e spam) para receber a senha provisória
   - Faça login com a senha provisória
   - Altere a senha no perfil

3. **Teste de Migração**:
   - Se tiver senha antiga em texto plano, faça login
   - Verifique que a senha é migrada automaticamente para hash

## Arquivos Criados/Modificados

- ✅ `services/passwordService.ts` (novo)
- ✅ `services/emailService.ts` (atualizado - agora envia email real)
- ✅ `services/db.ts` (atualizado)
- ✅ `App.tsx` (atualizado - não exibe senha na tela)
- ✅ `supabase/functions/send-password-recovery/index.ts` (novo - Edge Function)
- ✅ `EMAIL_SETUP.md` (novo - guia de configuração)

## Notas Importantes

✅ **A senha provisória é enviada por email** e não é exibida na tela.

⚠️ **Configuração necessária**: Para o envio de email funcionar, é necessário:

- Criar conta no Resend e obter API Key
- Configurar variáveis de ambiente no `.env.local` (VITE_RESEND_API_KEY e VITE_FROM_EMAIL)
- Ver `EMAIL_SETUP.md` para instruções detalhadas

⚠️ As senhas antigas em texto plano continuam funcionando, mas são automaticamente migradas para hash no primeiro login.

✅ Todas as novas senhas são automaticamente hasheadas antes de serem salvas.
