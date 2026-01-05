# Guia de Deploy na Vercel

Este guia explica passo a passo como fazer o deploy do Kako Fin na Vercel.

## Pré-requisitos

1. Conta na [Vercel](https://vercel.com) (gratuita)
2. Conta no [GitHub](https://github.com) (para conectar o repositório)
3. Projeto configurado com Supabase e Gemini API

## Passo 1: Preparar o Repositório Git

Se você ainda não tem o projeto no GitHub:

1. Crie um repositório no GitHub
2. No terminal, execute:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

**Importante**: Certifique-se de que o arquivo `.env.local` está no `.gitignore` (não deve ser commitado!)

## Passo 2: Criar Conta e Conectar Projeto na Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **Sign Up** e faça login com sua conta do GitHub
3. Clique em **Add New Project**
4. Selecione o repositório do seu projeto
5. A Vercel detectará automaticamente que é um projeto Vite

## Passo 3: Configurar Variáveis de Ambiente

**IMPORTANTE**: Você precisa configurar as variáveis de ambiente na Vercel!

1. Na tela de configuração do projeto, role até **Environment Variables**
2. Adicione as seguintes variáveis:

```
GEMINI_API_KEY=sua_chave_gemini_aqui
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
VITE_EMAILJS_SERVICE_ID=seu_service_id (opcional)
VITE_EMAILJS_TEMPLATE_ID=seu_template_id (opcional)
VITE_EMAILJS_PUBLIC_KEY=sua_public_key (opcional)
```

**⚠️ IMPORTANTE sobre GEMINI_API_KEY:**
- Esta variável é necessária para os **Insights com IA** funcionarem
- Sem ela, os Insights não carregarão (mas o resto do app funciona)
- Obtenha a chave em: https://aistudio.google.com/app/apikey
- **NÃO** use `VITE_GEMINI_API_KEY` - use apenas `GEMINI_API_KEY`

3. Para cada variável:
   - Cole o valor (sem espaços extras)
   - Selecione os ambientes: **Production**, **Preview** e **Development**
   - Clique em **Add**

**⚠️ ATENÇÃO**: 
- As variáveis que começam com `VITE_` são expostas ao cliente (browser)
- Não coloque informações sensíveis que não devem ser públicas
- A `VITE_SUPABASE_ANON_KEY` é segura para expor (é a chave pública)

## Passo 4: Configurar Build Settings

A Vercel deve detectar automaticamente:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

Se não detectar automaticamente, configure manualmente:
- **Framework Preset**: Other
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## Passo 5: Fazer o Deploy

1. Clique em **Deploy**
2. Aguarde o build completar (geralmente 1-2 minutos)
3. Quando terminar, você verá um link do tipo: `https://seu-projeto.vercel.app`

## Passo 6: Verificar o Deploy

1. Acesse o link fornecido pela Vercel
2. Teste o login/cadastro
3. Verifique se os dados estão sendo salvos no Supabase
4. Abra o console do navegador (F12) para verificar se há erros

## Configurações Adicionais (Opcional)

### Domínio Personalizado

1. No dashboard do projeto na Vercel, vá em **Settings** → **Domains**
2. Adicione seu domínio personalizado
3. Siga as instruções para configurar o DNS

### Deploy Automático

Por padrão, a Vercel faz deploy automático quando você faz push para:
- **main/master**: Deploy em produção
- **Outras branches**: Deploy em preview

### Variáveis de Ambiente por Ambiente

Você pode ter valores diferentes de variáveis de ambiente para:
- **Production**: Produção
- **Preview**: Branches de desenvolvimento
- **Development**: Ambiente local

## Troubleshooting

### Erro: "Build failed"

- Verifique se todas as dependências estão no `package.json`
- Verifique se o comando de build está correto
- Veja os logs de build na Vercel para mais detalhes

### Erro: "Environment variables not found"

- Certifique-se de que adicionou todas as variáveis de ambiente
- Verifique se os nomes estão corretos (case-sensitive)
- Reinicie o deploy após adicionar variáveis

### Aplicação não carrega

- Verifique o console do navegador (F12)
- Verifique se as variáveis de ambiente estão configuradas
- Verifique se o Supabase está acessível

### Dados não aparecem

- Verifique se o Supabase está configurado corretamente
- Verifique se as políticas RLS estão corretas
- Veja os logs no console do navegador

## Atualizando o Deploy

Sempre que você fizer alterações:

1. Faça commit das alterações:
   ```bash
   git add .
   git commit -m "Descrição das alterações"
   git push
   ```

2. A Vercel fará deploy automático
3. Aguarde alguns minutos e acesse o link atualizado

## Estrutura de Arquivos Importantes

```
kakofin/
├── vercel.json          # Configuração da Vercel
├── package.json         # Dependências e scripts
├── vite.config.ts       # Configuração do Vite
├── .env.local           # Variáveis locais (NÃO commitado)
├── .gitignore           # Arquivos ignorados pelo Git
└── dist/                # Build de produção (gerado)
```

## Links Úteis

- [Documentação da Vercel](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Supabase Dashboard](https://app.supabase.com)

