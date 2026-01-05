# Guia de Configuração do Supabase

Este guia explica como conectar seu projeto ao Supabase e criar as tabelas necessárias.

## Passo 1: Obter Credenciais do Supabase

1. Acesse o [Dashboard do Supabase](https://app.supabase.com)
2. Selecione seu projeto (ou crie um novo)
3. Vá em **Settings** → **API**
4. Copie as seguintes informações:
   - **Project URL** (será `VITE_SUPABASE_URL`)
   - **anon/public key** (será `VITE_SUPABASE_ANON_KEY`)

## Passo 2: Configurar Variáveis de Ambiente

1. Crie um arquivo `.env.local` na raiz do projeto
2. Copie o conteúdo de `.env.local.example` e preencha com suas credenciais:

```env
GEMINI_API_KEY=sua_chave_gemini_aqui
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

## Passo 3: Criar as Tabelas no Supabase

1. No Dashboard do Supabase, vá em **SQL Editor**
2. Clique em **New Query**
3. **IMPORTANTE**: Como este projeto não usa autenticação do Supabase, você precisa usar o script simplificado:
   - Copie e cole todo o conteúdo do arquivo `supabase-schema-simple.sql`
   - Este script cria políticas permissivas que funcionam sem autenticação JWT
4. Clique em **Run** (ou pressione Ctrl+Enter)
5. Verifique se as tabelas foram criadas em **Table Editor**

### Tabelas Criadas:

- **profiles**: Armazena informações do perfil do usuário
- **transactions**: Armazena todas as transações financeiras
- **goals**: Armazena as metas financeiras

### ⚠️ Sobre os Scripts SQL

- **`supabase-schema.sql`**: Script original com políticas RLS baseadas em JWT (requer autenticação do Supabase)
- **`supabase-schema-simple.sql`**: Script simplificado com políticas permissivas (funciona sem autenticação)
  
**Use o script simplificado** (`supabase-schema-simple.sql`) se você não estiver usando autenticação do Supabase Auth.

## Passo 4: Verificar a Configuração

1. Reinicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. O sistema irá:
   - Usar Supabase se as variáveis estiverem configuradas
   - Usar localStorage como fallback se não estiver configurado

## Segurança (RLS - Row Level Security)

### Script Simplificado (Recomendado)

O script `supabase-schema-simple.sql` cria políticas permissivas que funcionam sem autenticação do Supabase. Isso é adequado para desenvolvimento e quando você está usando autenticação customizada.

### Script Original

O script `supabase-schema.sql` configura políticas RLS baseadas em JWT que garantem que:
- Usuários só podem ver e modificar seus próprios dados
- Cada tabela está protegida por políticas baseadas no email do usuário

**Nota**: O script original requer autenticação do Supabase Auth. Se você estiver usando autenticação customizada (como no código atual), use o script simplificado.

## Troubleshooting

### Erro: "Supabase URL ou Anon Key não configurados"
- Verifique se o arquivo `.env.local` existe e está na raiz do projeto
- Verifique se as variáveis começam com `VITE_`
- Reinicie o servidor após criar/editar o `.env.local`

### Erro ao criar tabelas
- Verifique se você tem permissões de administrador no projeto
- Certifique-se de que está executando o script no SQL Editor correto

### Dados não aparecem
- **Verifique o console do navegador** - Agora há logs detalhados que mostram:
  - ✅ Se o Supabase está configurado
  - ✅ Quando dados são carregados/salvos
  - ❌ Erros específicos com detalhes
  - 💾 Quando está usando fallback para localStorage
- **Verifique se você executou o script correto**: Use `supabase-schema-simple.sql` se não estiver usando autenticação do Supabase
- **Verifique as políticas RLS**: Se você executou o script original (`supabase-schema.sql`), as políticas podem estar bloqueando o acesso. Execute o script simplificado.
- O sistema usará localStorage como fallback se houver erros com Supabase

### Erros de RLS (Row Level Security)
Se você ver erros como "new row violates row-level security policy":
1. Execute o script `supabase-schema-simple.sql` no SQL Editor
2. Isso removerá as políticas antigas e criará políticas permissivas
3. Reinicie o servidor e teste novamente

