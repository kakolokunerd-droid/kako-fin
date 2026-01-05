# Configuração de Email usando EmailJS

EmailJS é um serviço gratuito que permite enviar emails diretamente do frontend, sem problemas de CORS.

## ✅ Vantagens do EmailJS

- ✅ Gratuito (200 emails/mês no plano gratuito)
- ✅ Funciona direto do frontend (sem CORS)
- ✅ Não requer backend
- ✅ Fácil de configurar
- ✅ Sem necessidade de Supabase Pro

## 📝 Passo 1: Criar Conta no EmailJS

1. Acesse [emailjs.com](https://www.emailjs.com/)
2. Clique em **Sign Up** e crie uma conta gratuita
3. Confirme seu email

## 📝 Passo 2: Configurar Serviço de Email

1. No dashboard do EmailJS, vá em **Email Services**
2. Clique em **Add New Service**
3. Escolha seu provedor de email:
   - **Gmail** (recomendado para testes)
   - **Outlook**
   - **Yahoo**
   - Ou outro provedor suportado
4. Siga as instruções para conectar sua conta de email
5. Anote o **Service ID** gerado

## 📝 Passo 3: Criar Template de Email

1. No dashboard, vá em **Email Templates**
2. Clique em **Create New Template**
3. **IMPORTANTE**: Configure o campo **To Email** (destinatário):
   - No campo "To Email", digite: `{{to_email}}`
   - Isso permite que o EmailJS use o email do destinatário dinamicamente
4. Use este template:

**Template ID:** (será gerado automaticamente, anote este ID)

**To Email:** `{{to_email}}` ⚠️ **OBRIGATÓRIO - Configure este campo!**

**Subject:**

```
Recuperação de Senha - Kako Fin
```

**Content (HTML):**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
  </head>
  <body
    style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"
  >
    <p>Olá{{#if to_name}}, {{to_name}}{{/if}},</p>

    <p>Você solicitou a recuperação de senha para sua conta no Kako Fin.</p>

    <p>Para autenticar, use a seguinte senha provisória:</p>

    <p
      style="font-size: 24px; font-weight: bold; letter-spacing: 3px; text-align: center; padding: 20px; background-color: #f5f5f5; border-radius: 5px; font-family: monospace;"
    >
      {{temporary_password}}
    </p>

    <p>Esta senha provisória deve ser alterada após o primeiro login.</p>

    <p>
      <strong>Não compartilhe esta senha com ninguém.</strong> Se você não fez
      esta solicitação, pode ignorar este email com segurança.
    </p>

    <p
      style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;"
    >
      O Kako Fin nunca entrará em contato com você sobre este email ou pedirá
      códigos de login ou links. Cuidado com golpes de phishing.
    </p>

    <p style="margin-top: 20px; font-size: 12px; color: #666;">
      Obrigado por usar o Kako Fin!
    </p>
  </body>
</html>
```

**Ou versão mais simples (recomendada):**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
  </head>
  <body
    style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"
  >
    <p>Olá,</p>

    <p>Você solicitou a recuperação de senha para sua conta no Kako Fin.</p>

    <p>Para autenticar, use a seguinte senha provisória:</p>

    <p
      style="font-size: 24px; font-weight: bold; letter-spacing: 3px; text-align: center; padding: 20px; background-color: #f5f5f5; border-radius: 5px; font-family: monospace;"
    >
      {{temporary_password}}
    </p>

    <p>Esta senha provisória deve ser alterada após o primeiro login.</p>

    <p>
      <strong>Não compartilhe esta senha com ninguém.</strong> Se você não fez
      esta solicitação, pode ignorar este email com segurança.
    </p>

    <p
      style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;"
    >
      O Kako Fin nunca entrará em contato com você sobre este email ou pedirá
      códigos de login ou links. Cuidado com golpes de phishing.
    </p>

    <p style="margin-top: 20px; font-size: 12px; color: #666;">
      Obrigado por usar o Kako Fin!
    </p>
  </body>
</html>
```

**Versão em texto simples (mais compatível):**

```
Olá,

Você solicitou a recuperação de senha para sua conta no Kako Fin.

Para autenticar, use a seguinte senha provisória:

{{temporary_password}}

Esta senha provisória deve ser alterada após o primeiro login.

Não compartilhe esta senha com ninguém. Se você não fez esta solicitação, pode ignorar este email com segurança.

O Kako Fin nunca entrará em contato com você sobre este email ou pedirá códigos de login ou links. Cuidado com golpes de phishing.

Obrigado por usar o Kako Fin!
```

**Variáveis do Template:**

- `{{to_name}}` - Nome do usuário
- `{{to_email}}` - Email do destinatário (⚠️ **DEVE estar no campo "To Email"**)
- `{{temporary_password}}` - Senha provisória
- `{{subject}}` - Assunto do email

**⚠️ CONFIGURAÇÃO CRÍTICA:**

- No campo **"To Email"** do template, você DEVE colocar: `{{to_email}}`
- Este campo é obrigatório e define para quem o email será enviado
- Se este campo estiver vazio, você receberá o erro "The recipients address is empty"

4. Clique em **Save**

## 📝 Passo 4: Obter Public Key

1. No dashboard, vá em **Account** → **General**
2. Copie sua **Public Key** (também chamada de User ID)

## 📝 Passo 5: Configurar Variáveis de Ambiente

1. Abra o arquivo `.env.local` na raiz do projeto
2. Adicione as seguintes variáveis:

```env
# EmailJS Configuration
VITE_EMAILJS_SERVICE_ID=seu_service_id_aqui
VITE_EMAILJS_TEMPLATE_ID=seu_template_id_aqui
VITE_EMAILJS_PUBLIC_KEY=sua_public_key_aqui
```

**Exemplo:**

```env
VITE_EMAILJS_SERVICE_ID=service_abc123
VITE_EMAILJS_TEMPLATE_ID=template_xyz456
VITE_EMAILJS_PUBLIC_KEY=abcdefghijklmnop
```

## 📝 Passo 6: Reiniciar o Servidor

**IMPORTANTE:** Reinicie o servidor após configurar as variáveis:

```bash
# Pare o servidor (Ctrl+C)
npm run dev
```

## 🧪 Testar

1. Acesse o app no navegador
2. Abra o Console (F12)
3. Tente recuperar a senha
4. Verifique o console para mensagens de sucesso
5. Verifique sua caixa de entrada

## 📊 Limites do Plano Gratuito

- 200 emails por mês
- 2 serviços de email
- 5 templates
- Suporte por email

## 🔒 Segurança

- A Public Key é segura para expor no frontend
- Não exponha Service ID e Template ID em repositórios públicos
- Use variáveis de ambiente

## ❓ Troubleshooting

### Erro: "EmailJS não configurado"

- Verifique se todas as 3 variáveis estão no `.env.local`
- Confirme que reiniciou o servidor

### Erro: "Service ID inválido"

- Verifique o Service ID no dashboard do EmailJS
- Confirme que o serviço está ativo

### Erro: "Template ID inválido"

- Verifique o Template ID no dashboard
- Confirme que o template foi salvo

### Email não chega

- Verifique a pasta de spam
- Confirme que o serviço de email está conectado corretamente
- Verifique os logs no dashboard do EmailJS

## 📚 Documentação

- [EmailJS Docs](https://www.emailjs.com/docs/)
- [Templates](https://www.emailjs.com/docs/examples/reactjs/)
