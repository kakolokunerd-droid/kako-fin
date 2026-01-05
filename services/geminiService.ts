import { GoogleGenAI } from "@google/genai";
import { Transaction, Goal } from "../types";

export const getFinancialAdvice = async (
  transactions: Transaction[],
  goals: Goal[]
): Promise<string> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";

  // Verificar se a API key está configurada
  if (!apiKey) {
    console.error(
      "❌ GEMINI_API_KEY não configurada. Configure a variável de ambiente GEMINI_API_KEY na Vercel (produção) ou .env.local (desenvolvimento)."
    );
    return "⚠️ Insights temporariamente indisponíveis. Configure a API key do Gemini para ativar os insights inteligentes.";
  }

  const ai = new GoogleGenAI({ apiKey });

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

  const prompt = `
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

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return (
      response.text ||
      "Não foi possível gerar sugestões no momento. Continue controlando seus gastos!"
    );
  } catch (error) {
    console.error("Erro ao chamar Gemini:", error);
    return "Mantenha o foco! Analise suas categorias de maior gasto para economizar mais este mês.";
  }
};
