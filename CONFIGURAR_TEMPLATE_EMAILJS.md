# ⚠️ Configuração Crítica do Template EmailJS

## Erro: "The recipients address is empty"

Este erro acontece quando o campo **"To Email"** do template não está configurado corretamente.

## ✅ Solução Passo a Passo

### 1. Acesse seu Template no EmailJS

1. Vá para https://www.emailjs.com/
2. Faça login
3. Vá em **Email Templates**
4. Clique no template que você criou

### 2. Configure o Campo "To Email"

**IMPORTANTE**: Este é o campo mais crítico!

1. Procure pelo campo **"To Email"** ou **"To"** no formulário do template
2. **NÃO deixe vazio!**
3. Digite exatamente: `{{to_email}}`
   - Use chaves duplas: `{{` e `}}`
   - Use underscore: `to_email` (não `to-email` ou `toEmail`)

### 3. Verifique Outros Campos

Certifique-se de que:

- **From Name**: Pode ser "Kako Fin" ou deixar vazio
- **From Email**: Deve ser o email do serviço configurado (ex: seu@gmail.com)
- **To Email**: `{{to_email}}` ⚠️ **OBRIGATÓRIO**
- **Subject**: `Recuperação de Senha - Kako Fin` ou `{{subject}}`
- **Content**: O HTML do template

### 4. Exemplo Visual

```
┌─────────────────────────────────────────┐
│ Email Template Configuration            │
├─────────────────────────────────────────┤
│ From Name:     Kako Fin                 │
│ From Email:    seu@gmail.com            │
│ To Email:      {{to_email}}  ← AQUI!    │
│ Reply To:      (opcional)               │
│ Subject:       Recuperação de Senha...  │
│ Content:       [HTML do template]       │
└─────────────────────────────────────────┘
```

### 5. Salvar e Testar

1. Clique em **Save**
2. Volte para o app e tente recuperar a senha novamente
3. O erro deve desaparecer

## 🔍 Verificação Rápida

No console do navegador (F12), você deve ver:

```
📧 Enviando email automaticamente para: usuario@email.com
📧 Parâmetros do template: { to_email: "usuario@email.com", ... }
✅ Email enviado automaticamente com sucesso
```

Se ainda aparecer o erro, verifique:

1. ✅ O campo "To Email" tem `{{to_email}}` (com chaves duplas)
2. ✅ O template foi salvo corretamente
3. ✅ As variáveis de ambiente estão configuradas
4. ✅ O servidor foi reiniciado após configurar

## 📝 Nota sobre Nomes de Campos

O EmailJS pode usar diferentes nomes dependendo da versão:
- `to_email` (mais comum)
- `to` (algumas versões)
- `email` (menos comum)

Se `{{to_email}}` não funcionar, tente:
- `{{to}}`
- `{{email}}`

Mas `{{to_email}}` é o padrão recomendado e deve funcionar na maioria dos casos.

