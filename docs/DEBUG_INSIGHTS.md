# 🔍 Debug - Insights não Consomem API

## Problema
Os Insights estão mostrando apenas a mensagem genérica "Mantenha o foco! Analise suas categorias de maior gasto para economizar mais este mês." ao invés de consumir a API do Gemini.

## Passos para Diagnosticar

### 1. Verificar Console do Navegador

1. Abra o app no navegador
2. Pressione `F12` para abrir o DevTools
3. Vá na aba **Console**
4. Expanda os Insights
5. Procure por mensagens que começam com:
   - `🔍 Verificando configuração da API Gemini...`
   - `🔍 API Key presente:`
   - `📤 Enviando requisição para Gemini API...`
   - `❌ Erro ao chamar Gemini:`

### 2. Verificar Variável de Ambiente

#### No Desenvolvimento Local:

1. Verifique se existe o arquivo `.env.local` na raiz do projeto
2. Abra o arquivo e verifique se contém:
   ```env
   GEMINI_API_KEY=sua_chave_aqui
   ```
3. **IMPORTANTE**: Após adicionar/modificar a variável, você **DEVE** reiniciar o servidor:
   ```bash
   # Pare o servidor (Ctrl+C)
   # Depois inicie novamente:
   npm run dev
   ```

#### Verificar se a Variável está Sendo Carregada:

No console do navegador, você deve ver:
- `🔍 API Key presente: Sim (AIzaSy...)` → ✅ Configurado corretamente
- `🔍 API Key presente: Não` → ❌ Variável não encontrada

### 3. Possíveis Causas e Soluções

#### Causa 1: Variável não configurada
**Sintoma**: Console mostra `🔍 API Key presente: Não`

**Solução**:
1. Crie/edite o arquivo `.env.local` na raiz do projeto
2. Adicione: `GEMINI_API_KEY=sua_chave_aqui`
3. Reinicie o servidor (`npm run dev`)

#### Causa 2: Servidor não reiniciado
**Sintoma**: Variável existe mas não é carregada

**Solução**:
1. Pare o servidor (Ctrl+C)
2. Inicie novamente: `npm run dev`
3. Recarregue a página no navegador

#### Causa 3: Erro na API
**Sintoma**: Console mostra `❌ Erro ao chamar Gemini:` com detalhes

**Possíveis erros**:
- **"API_KEY invalid"**: A chave está incorreta ou expirada
  - Solução: Obtenha uma nova chave em https://aistudio.google.com/app/apikey
- **"quota exceeded"**: Limite de uso atingido
  - Solução: Aguarde ou verifique seu plano na Google AI Studio
- **"model not found"**: O modelo `gemini-3-flash-preview` pode não estar disponível
  - Solução: Tente alterar para `gemini-pro` ou `gemini-1.5-flash`

#### Causa 4: Biblioteca incorreta
**Sintoma**: Erro relacionado a `@google/genai`

**Solução**:
1. Verifique se a biblioteca está instalada:
   ```bash
   npm list @google/genai
   ```
2. Se não estiver, instale:
   ```bash
   npm install @google/genai
   ```
3. Ou use a biblioteca oficial:
   ```bash
   npm uninstall @google/genai
   npm install @google/generative-ai
   ```
   E atualize `services/geminiService.ts` para usar `@google/generative-ai`

### 4. Teste Manual

Para testar se a API key está funcionando, você pode criar um arquivo de teste:

```javascript
// test-gemini.js (na raiz do projeto)
const { GoogleGenAI } = require("@google/genai");

const apiKey = process.env.GEMINI_API_KEY || "sua_chave_aqui";

const ai = new GoogleGenAI({ apiKey });

async function test() {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Olá, você está funcionando?",
    });
    console.log("✅ API funcionando:", response.text);
  } catch (error) {
    console.error("❌ Erro:", error.message);
  }
}

test();
```

Execute:
```bash
node test-gemini.js
```

### 5. Verificar Arquivo vite.config.ts

O arquivo `vite.config.ts` deve mapear a variável corretamente:

```typescript
define: {
  'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  // ...
}
```

Se não estiver assim, adicione essas linhas.

## Checklist de Verificação

- [ ] Arquivo `.env.local` existe na raiz do projeto
- [ ] Arquivo `.env.local` contém `GEMINI_API_KEY=sua_chave_aqui`
- [ ] Servidor foi reiniciado após adicionar a variável
- [ ] Console mostra `🔍 API Key presente: Sim`
- [ ] Não há erros no console relacionados ao Gemini
- [ ] A chave da API é válida (testada manualmente)

## Próximos Passos

1. Abra o console do navegador (F12)
2. Expanda os Insights
3. Copie todas as mensagens do console que começam com 🔍 ou ❌
4. Compartilhe essas mensagens para diagnóstico mais preciso

