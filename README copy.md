<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Kako Fin 💰

Uma plataforma completa de finanças pessoais com insights inteligentes do Gemini, controle de gastos, metas financeiras e relatórios detalhados para ajudar você a atingir sua liberdade financeira.

## 🚀 Tecnologias

- **React** + **TypeScript** + **Vite**
- **Supabase** - Banco de dados em nuvem
- **Gemini AI** - Insights financeiros inteligentes
- **Tailwind CSS** - Estilização moderna
- **Recharts** - Gráficos e visualizações

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Conta no Supabase (opcional, mas recomendado)
- Chave da API do Gemini

## 🏃 Como Executar Localmente

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure as variáveis de ambiente:
   - Crie um arquivo `.env.local` na raiz do projeto
   - Adicione suas credenciais:
     ```env
     GEMINI_API_KEY=sua_chave_gemini_aqui
     VITE_SUPABASE_URL=https://seu-projeto.supabase.co
     VITE_SUPABASE_ANON_KEY=sua_chave_anon_aqui
     ```

3. Execute o projeto:
   ```bash
   npm run dev
   ```

4. Acesse: `http://localhost:3000`

## 📚 Documentação

- [Configuração do Supabase](./SUPABASE_SETUP.md)
- [Deploy na Vercel](./DEPLOY_VERCEL.md)

## 🎯 Funcionalidades

- ✅ Controle de receitas e despesas
- ✅ Metas financeiras personalizadas
- ✅ Relatórios e gráficos detalhados
- ✅ Insights inteligentes com IA
- ✅ Sincronização em nuvem (Supabase)
- ✅ Interface responsiva e moderna
