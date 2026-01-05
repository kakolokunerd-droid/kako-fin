// Serviço unificado de IA - Suporta múltiplos provedores
// Permite alternar entre diferentes APIs de IA sem mudar o código principal

import { Transaction, Goal } from "../types";

export type AIProvider =
  | "groq"
  | "huggingface"
  | "openai"
  | "gemini"
  | "ollama";

interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string; // Para Ollama ou APIs customizadas
}

// Configuração padrão - pode ser alterada via variáveis de ambiente
const getAIConfig = (): AIConfig => {
  // Prioridade: variável de ambiente > padrão
  const provider = (import.meta.env.VITE_AI_PROVIDER || "groq") as AIProvider;

  const apiKey =
    import.meta.env.VITE_AI_API_KEY ||
    process.env.API_KEY ||
    process.env.GEMINI_API_KEY ||
    "";

  // Log para debug (sem expor a chave completa)
  console.log("🔍 Configuração de IA:");
  console.log("🔍 Provedor:", provider);
  console.log(
    "🔍 API Key presente:",
    apiKey ? `Sim (${apiKey.substring(0, 10)}...)` : "Não"
  );
  console.log(
    "🔍 VITE_AI_API_KEY:",
    import.meta.env.VITE_AI_API_KEY ? "Presente" : "Ausente"
  );
  console.log(
    "🔍 process.env.API_KEY:",
    process.env.API_KEY ? "Presente" : "Ausente"
  );

  return {
    provider,
    apiKey,
    model: import.meta.env.VITE_AI_MODEL || getDefaultModel(provider),
    baseUrl: import.meta.env.VITE_AI_BASE_URL || undefined,
  };
};

const getDefaultModel = (provider: AIProvider): string => {
  const defaults: Record<AIProvider, string> = {
    groq: "llama-3.3-70b-versatile", // Modelo atualizado - llama-3.1-70b-versatile foi descontinuado
    huggingface: "mistralai/Mistral-7B-Instruct-v0.2",
    openai: "gpt-3.5-turbo",
    gemini: "gemini-3-flash-preview",
    ollama: "llama3.1",
  };
  return defaults[provider] || defaults.groq;
};

/**
 * Gera insights financeiros usando o provedor de IA configurado
 */
export const getFinancialAdvice = async (
  transactions: Transaction[],
  goals: Goal[]
): Promise<string> => {
  const config = getAIConfig();

  // Verificar se a API key está configurada (exceto para Ollama que pode ser local)
  if (!config.apiKey && config.provider !== "ollama") {
    console.error(
      `❌ ${config.provider.toUpperCase()}_API_KEY não configurada. Configure a variável de ambiente VITE_AI_API_KEY ou use um provedor local como Ollama.`
    );
    return "⚠️ Insights temporariamente indisponíveis. Configure a API key do provedor de IA escolhido.";
  }

  try {
    switch (config.provider) {
      case "groq":
        return await getGroqAdvice(transactions, goals, config);
      case "huggingface":
        return await getHuggingFaceAdvice(transactions, goals, config);
      case "openai":
        return await getOpenAIAdvice(transactions, goals, config);
      case "gemini":
        return await getGeminiAdvice(transactions, goals, config);
      case "ollama":
        return await getOllamaAdvice(transactions, goals, config);
      default:
        return await getGroqAdvice(transactions, goals, config); // Fallback para Groq
    }
  } catch (error: any) {
    console.error(`❌ Erro ao chamar ${config.provider}:`, error);

    let errorMessage =
      "Mantenha o foco! Analise suas categorias de maior gasto para economizar mais este mês.";

    if (
      error?.message?.includes("API_KEY") ||
      error?.message?.includes("401")
    ) {
      errorMessage =
        "⚠️ Erro na configuração da API. Verifique se a chave está configurada corretamente.";
    } else if (
      error?.message?.includes("quota") ||
      error?.message?.includes("limit") ||
      error?.message?.includes("429")
    ) {
      errorMessage =
        "⚠️ Limite de uso da API atingido. Tente novamente mais tarde.";
    } else if (error?.message) {
      errorMessage = `⚠️ Erro ao gerar insights: ${error.message}`;
    }

    return errorMessage;
  }
};

// ========== GROQ (Recomendado - Gratuito e Generoso) ==========
// Tier gratuito: 14,400 requests/dia, muito rápido
async function getGroqAdvice(
  transactions: Transaction[],
  goals: Goal[],
  config: AIConfig
): Promise<string> {
  // Verificar se a API key está presente
  if (!config.apiKey) {
    throw new Error(
      "Groq API key não configurada. Configure VITE_AI_API_KEY no .env.local"
    );
  }

  // Log para debug (sem expor a chave completa)
  console.log("🔍 Groq - Verificando configuração...");
  console.log(
    "🔍 API Key presente:",
    config.apiKey ? `Sim (${config.apiKey.substring(0, 10)}...)` : "Não"
  );
  console.log("🔍 Modelo:", config.model || "llama-3.3-70b-versatile");

  const prompt = buildPrompt(transactions, goals);

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model || "llama-3.1-70b-versatile",
          messages: [
            {
              role: "system",
              content:
                "Você é um consultor financeiro sênior especializado em ajudar pessoas a melhorar suas finanças pessoais. Seja empático, prático e motivador.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      }
    );

    // Log da resposta para debug
    console.log(
      "📤 Groq - Status da resposta:",
      response.status,
      response.statusText
    );

    if (!response.ok) {
      // Tentar obter detalhes do erro
      let errorDetails: any = { message: response.statusText };
      try {
        const errorData = await response.json();
        errorDetails = errorData;
        console.error("❌ Groq - Erro completo:", errorData);
      } catch (e) {
        const errorText = await response.text();
        console.error("❌ Groq - Erro (texto):", errorText);
        errorDetails = { message: errorText || response.statusText };
      }

      // Mensagens de erro mais específicas
      if (response.status === 401) {
        throw new Error(
          "API key inválida ou expirada. Verifique se a chave está correta no .env.local"
        );
      } else if (response.status === 429) {
        throw new Error(
          "Limite de requisições atingido. Tente novamente mais tarde."
        );
      } else if (response.status === 400) {
        throw new Error(
          `Requisição inválida: ${
            errorDetails.message ||
            errorDetails.error?.message ||
            "Verifique os parâmetros"
          }`
        );
      } else {
        throw new Error(
          `Groq API error (${response.status}): ${
            errorDetails.message ||
            errorDetails.error?.message ||
            response.statusText
          }`
        );
      }
    }

    const data = await response.json();
    console.log("✅ Groq - Resposta recebida com sucesso");

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.warn("⚠️ Groq - Resposta sem conteúdo:", data);
      return "Não foi possível gerar sugestões no momento. Continue controlando seus gastos!";
    }

    return content;
  } catch (error: any) {
    console.error("❌ Groq - Erro na requisição:", error);
    // Re-lançar o erro para ser tratado pelo handler principal
    throw error;
  }
}

// ========== HUGGING FACE (Gratuito com rate limits) ==========
async function getHuggingFaceAdvice(
  transactions: Transaction[],
  goals: Goal[],
  config: AIConfig
): Promise<string> {
  const prompt = buildPrompt(transactions, goals);

  const response = await fetch(
    `https://api-inference.huggingface.co/models/${
      config.model || "mistralai/Mistral-7B-Instruct-v0.2"
    }`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(
      `Hugging Face API error: ${error.message || response.statusText}`
    );
  }

  const data = await response.json();
  // Hugging Face retorna um array com o texto gerado
  if (Array.isArray(data) && data[0]?.generated_text) {
    return data[0].generated_text.replace(prompt, "").trim();
  }
  return "Não foi possível gerar sugestões no momento.";
}

// ========== OPENAI (Pode ter tier gratuito limitado) ==========
async function getOpenAIAdvice(
  transactions: Transaction[],
  goals: Goal[],
  config: AIConfig
): Promise<string> {
  const prompt = buildPrompt(transactions, goals);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Você é um consultor financeiro sênior especializado em ajudar pessoas a melhorar suas finanças pessoais. Seja empático, prático e motivador.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(
      `OpenAI API error: ${error.message || response.statusText}`
    );
  }

  const data = await response.json();
  return (
    data.choices[0]?.message?.content ||
    "Não foi possível gerar sugestões no momento."
  );
}

// ========== GEMINI (Original - Requer faturamento) ==========
async function getGeminiAdvice(
  transactions: Transaction[],
  goals: Goal[],
  config: AIConfig
): Promise<string> {
  // Importar dinamicamente para não quebrar se a biblioteca não estiver instalada
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: config.apiKey! });

  const prompt = buildPrompt(transactions, goals);

  const response = await ai.models.generateContent({
    model: config.model || "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "Não foi possível gerar sugestões no momento.";
}

// ========== OLLAMA (Gratuito - Roda Localmente) ==========
// Requer Ollama instalado localmente: https://ollama.ai
async function getOllamaAdvice(
  transactions: Transaction[],
  goals: Goal[],
  config: AIConfig
): Promise<string> {
  const prompt = buildPrompt(transactions, goals);
  const baseUrl = config.baseUrl || "http://localhost:11434";

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model || "llama3.1",
      prompt: prompt,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response || "Não foi possível gerar sugestões no momento.";
}

// ========== Função auxiliar para construir o prompt ==========
function buildPrompt(transactions: Transaction[], goals: Goal[]): string {
  // Ordenar transações por data (mais recentes primeiro) e pegar as últimas 20
  const sortedTransactions = [...transactions].sort((a, b) => {
    if (a.date > b.date) return -1;
    if (a.date < b.date) return 1;
    return 0;
  });
  const recentTransactions = sortedTransactions.slice(0, 20);

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + t.amount, 0);

  // Calcular gastos por categoria do mês
  const expensesByCategory = transactions
    .filter((t) => t.type === "expense")
    .reduce((acc: { [key: string]: number }, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const topCategories = Object.entries(expensesByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount }));

  return `
    Atue como um consultor financeiro sênior. 
    Resumo Financeiro do Mês Corrente:
    - Entradas do Mês: R$ ${totalIncome.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}
    - Despesas do Mês: R$ ${totalExpense.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}
    - Saldo do Mês: R$ ${(totalIncome - totalExpense).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}
    - Maiores Gastos por Categoria: ${JSON.stringify(
      topCategories.map((c) => ({ categoria: c.category, valor: c.amount }))
    )}
    - Transações do Mês: ${JSON.stringify(
      recentTransactions.map((t) => ({
        d: t.description,
        v: t.amount,
        c: t.category,
        t: t.type,
      }))
    )}
    - Metas: ${JSON.stringify(goals)}

    Com base NOS DADOS DO MÊS CORRENTE, forneça 3 sugestões práticas e curtas em português (PT-BR) para:
    1. Como reduzir os maiores gastos deste mês.
    2. Como melhorar o saldo do mês atual.
    3. Uma dica específica baseada no desempenho financeiro deste mês.
    Seja empático e motivador. Formate em tópicos curtos. Foque nas ações para o mês atual.
  `;
}
