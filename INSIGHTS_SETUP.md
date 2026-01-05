# Guia para Ativar os Insights do Kako Fin

## Problemas Identificados

1. **Biblioteca incorreta**: O projeto está usando `@google/genai` que pode não ser a biblioteca oficial do Google
2. **API Key não configurada**: Precisa ter a variável `GEMINI_API_KEY` no arquivo `.env.local`
3. **Possível problema na implementação**: A forma como a API está sendo chamada pode estar incorreta

## Passos para Ativar os Insights

### 1. Obter Chave da API do Gemini

1. Acesse [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Faça login com sua conta Google
3. Clique em "Create API Key"
4. Copie a chave gerada

### 2. Configurar Variável de Ambiente

1. Crie um arquivo `.env.local` na raiz do projeto (se não existir)
2. Adicione a seguinte linha:

```env
GEMINI_API_KEY=sua_chave_gemini_aqui
```

**Importante**: Substitua `sua_chave_gemini_aqui` pela chave real que você copiou.

### 3. Verificar/Corrigir a Biblioteca

O projeto está usando `@google/genai`, mas o SDK oficial do Google é `@google/generative-ai`. 

**Opção A - Se `@google/genai` funcionar:**
- Mantenha como está e apenas configure a API key

**Opção B - Se precisar usar o SDK oficial:**
- Desinstale: `npm uninstall @google/genai`
- Instale: `npm install @google/generative-ai`
- Atualize o arquivo `services/geminiService.ts` para usar a biblioteca correta

### 4. Verificar o Código do Serviço

O arquivo `services/geminiService.ts` precisa:
- Receber a API key corretamente de `process.env.API_KEY` ou `process.env.GEMINI_API_KEY`
- Usar a biblioteca correta para fazer chamadas à API do Gemini
- Tratar erros adequadamente

### 5. Reiniciar o Servidor

Após configurar a API key:

```bash
npm run dev
```

### 6. Verificar se Funciona

1. Acesse o Dashboard
2. Verifique se aparece "Analisando suas finanças..." e depois os insights
3. Se aparecer erro, verifique o console do navegador (F12) para ver a mensagem de erro

## Possíveis Problemas e Soluções

### Problema: "API key não encontrada"
**Solução**: Verifique se o arquivo `.env.local` existe e tem a variável `GEMINI_API_KEY` configurada

### Problema: "Biblioteca não encontrada"
**Solução**: Execute `npm install` para garantir que todas as dependências estão instaladas

### Problema: "Erro ao chamar Gemini"
**Solução**: 
- Verifique se a API key é válida
- Verifique se a biblioteca está sendo usada corretamente
- Veja o console do navegador para mais detalhes do erro

### Problema: Insights não aparecem
**Solução**: 
- Verifique se há transações cadastradas (os insights precisam de dados)
- Verifique o console do navegador para erros
- Verifique se a API key tem permissões para usar o Gemini

## Estrutura Atual

- **Componente**: `components/Dashboard.tsx` (linha 206-214)
- **Serviço**: `services/geminiService.ts`
- **Configuração**: `vite.config.ts` (mapeia `GEMINI_API_KEY` para `process.env.API_KEY`)

## Próximos Passos Recomendados

1. Verificar se a biblioteca `@google/genai` existe e funciona
2. Se não funcionar, migrar para `@google/generative-ai`
3. Testar a chamada da API com uma chave válida
4. Adicionar tratamento de erros mais robusto
5. Adicionar feedback visual quando a API estiver indisponível

