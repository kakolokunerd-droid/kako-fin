# 🤖 Configuração de Provedores de IA para Insights

## Visão Geral

O Kako Fin agora suporta múltiplos provedores de IA para gerar insights financeiros. Você pode escolher entre opções **gratuitas** ou com **custo fixo**, sem necessidade de configuração de faturamento.

## 🆓 Provedores Gratuitos Recomendados

### 1. **Groq** ⭐ (Recomendado)

**Por que escolher:**

- ✅ **Gratuito e generoso**: 14,400 requests/dia
- ✅ **Muito rápido**: Respostas em milissegundos
- ✅ **Sem necessidade de cartão de crédito**
- ✅ **Fácil de configurar**

**Como configurar:**

1. **Obter API Key:**

   - Acesse: https://console.groq.com/
   - Crie uma conta (gratuita)
   - Vá em "API Keys"
   - Clique em "Create API Key"
   - Copie a chave

2. **Configurar no projeto:**

   - Crie/edite o arquivo `.env.local` na raiz do projeto
   - Adicione:
     ```env
     VITE_AI_PROVIDER=groq
     VITE_AI_API_KEY=sua_chave_groq_aqui
     VITE_AI_MODEL=llama-3.3-70b-versatile
     ```

3. **Reiniciar o servidor:**
   ```bash
   npm run dev
   ```

**Modelos disponíveis:**

- `llama-3.3-70b-versatile` (recomendado - atualizado)
- `llama-3.1-8b-instant`
- `mixtral-8x7b-32768`
- `llama-3.1-70b-versatile` (descontinuado - não usar)

---

### 2. **Hugging Face** (Gratuito com rate limits)

**Por que escolher:**

- ✅ **Gratuito** (com rate limits)
- ✅ **Muitos modelos disponíveis**
- ✅ **Sem necessidade de cartão**

**Como configurar:**

1. **Obter API Key:**

   - Acesse: https://huggingface.co/
   - Crie uma conta (gratuita)
   - Vá em Settings → Access Tokens
   - Crie um novo token
   - Copie o token

2. **Configurar no projeto:**
   ```env
   VITE_AI_PROVIDER=huggingface
   VITE_AI_API_KEY=seu_token_huggingface_aqui
   VITE_AI_MODEL=mistralai/Mistral-7B-Instruct-v0.2
   ```

**Modelos disponíveis:**

- `mistralai/Mistral-7B-Instruct-v0.2`
- `meta-llama/Llama-2-7b-chat-hf`
- `google/flan-t5-large`

**⚠️ Nota:** Hugging Face pode ter rate limits mais restritivos.

---

### 3. **Ollama** (100% Gratuito - Local)

**Por que escolher:**

- ✅ **100% gratuito** (roda localmente)
- ✅ **Sem limites de uso**
- ✅ **Privacidade total** (dados não saem do seu computador)
- ✅ **Sem necessidade de internet** (após instalar)

**Como configurar:**

1. **Instalar Ollama:**

   - Acesse: https://ollama.ai/
   - Baixe e instale o Ollama
   - Abra o terminal e execute:
     ```bash
     ollama pull llama3.1
     ```

2. **Configurar no projeto:**

   ```env
   VITE_AI_PROVIDER=ollama
   VITE_AI_MODEL=llama3.1
   VITE_AI_BASE_URL=http://localhost:11434
   ```

   (Não precisa de API key para Ollama)

3. **Iniciar Ollama:**
   - O Ollama deve estar rodando localmente
   - Por padrão, roda em `http://localhost:11434`

**Modelos disponíveis:**

- `llama3.1` (recomendado)
- `mistral`
- `codellama`
- `phi3`

**⚠️ Nota:** Requer que o Ollama esteja instalado e rodando no computador do usuário.

---

## 💰 Provedores com Custo (Opcional)

### 4. **OpenAI** (Pode ter tier gratuito limitado)

**Como configurar:**

```env
VITE_AI_PROVIDER=openai
VITE_AI_API_KEY=sua_chave_openai_aqui
VITE_AI_MODEL=gpt-3.5-turbo
```

**⚠️ Nota:** OpenAI pode requerer faturamento para uso real.

---

### 5. **Google Gemini** (Original - Requer faturamento)

**Como configurar:**

```env
VITE_AI_PROVIDER=gemini
VITE_AI_API_KEY=sua_chave_gemini_aqui
VITE_AI_MODEL=gemini-3-flash-preview
```

**⚠️ Nota:** Requer configuração de faturamento no Google Cloud.

---

## 📋 Comparação Rápida

| Provedor         | Custo    | Velocidade          | Limites          | Faturamento      |
| ---------------- | -------- | ------------------- | ---------------- | ---------------- |
| **Groq** ⭐      | Gratuito | ⚡⚡⚡ Muito rápido | 14,400/dia       | ❌ Não           |
| **Hugging Face** | Gratuito | ⚡⚡ Rápido         | Rate limits      | ❌ Não           |
| **Ollama**       | Gratuito | ⚡⚡⚡ Muito rápido | Sem limites      | ❌ Não           |
| **OpenAI**       | Variável | ⚡⚡ Rápido         | Depende do plano | ⚠️ Pode precisar |
| **Gemini**       | Variável | ⚡⚡ Rápido         | Depende do plano | ✅ Sim           |

---

## 🚀 Configuração Rápida (Recomendado: Groq)

1. **Crie o arquivo `.env.local` na raiz do projeto:**

   ```env
   VITE_AI_PROVIDER=groq
   VITE_AI_API_KEY=sua_chave_groq_aqui
   ```

2. **Obtenha sua chave em:** https://console.groq.com/

3. **Reinicie o servidor:**

   ```bash
   npm run dev
   ```

4. **Pronto!** Os Insights agora usarão Groq.

---

## 🔧 Variáveis de Ambiente

### Variáveis Disponíveis:

- `VITE_AI_PROVIDER`: Provedor a usar (`groq`, `huggingface`, `ollama`, `openai`, `gemini`)
- `VITE_AI_API_KEY`: Chave da API (não necessário para Ollama)
- `VITE_AI_MODEL`: Modelo específico a usar (opcional, usa padrão se não especificado)
- `VITE_AI_BASE_URL`: URL base para Ollama ou APIs customizadas (opcional)

### Exemplo Completo:

```env
# Provedor de IA
VITE_AI_PROVIDER=groq

# Chave da API
VITE_AI_API_KEY=gsk_sua_chave_aqui

# Modelo específico (opcional)
VITE_AI_MODEL=llama-3.3-70b-versatile

# Para Ollama (opcional)
VITE_AI_BASE_URL=http://localhost:11434
```

---

## 🐛 Troubleshooting

### Erro: "API_KEY não configurada"

**Solução:**

1. Verifique se o arquivo `.env.local` existe
2. Confirme que a variável `VITE_AI_API_KEY` está configurada
3. Reinicie o servidor após adicionar a variável

### Erro: "Limite de uso atingido"

**Solução:**

- Para Groq: Aguarde ou verifique seu uso em https://console.groq.com/
- Para Hugging Face: Aguarde alguns minutos ou considere usar outro provedor
- Considere usar Ollama (sem limites)

### Erro: "Ollama não encontrado"

**Solução:**

1. Instale o Ollama: https://ollama.ai/
2. Execute `ollama pull llama3.1`
3. Certifique-se de que o Ollama está rodando

### Quer trocar de provedor?

Simplesmente altere `VITE_AI_PROVIDER` no `.env.local` e reinicie o servidor!

---

## 📚 Recursos

- **Groq Console:** https://console.groq.com/
- **Hugging Face:** https://huggingface.co/
- **Ollama:** https://ollama.ai/
- **OpenAI:** https://platform.openai.com/
- **Google AI Studio:** https://aistudio.google.com/

---

## ✅ Recomendação Final

Para a maioria dos casos, **recomendamos usar Groq**:

- ✅ Gratuito e generoso
- ✅ Muito rápido
- ✅ Fácil de configurar
- ✅ Sem necessidade de faturamento
- ✅ Boa qualidade de respostas

Basta criar uma conta gratuita e configurar a chave no `.env.local`!
