
import { GoogleGenAI } from "@google/genai";
import { Transaction, Goal } from "../types";

export const getFinancialAdvice = async (
  transactions: Transaction[],
  goals: Goal[]
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const recentTransactions = transactions.slice(0, 20);
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const prompt = `
    Atue como um consultor financeiro sênior. 
    Resumo Financeiro do Usuário:
    - Renda Total: R$ ${totalIncome.toFixed(2)}
    - Despesas Totais: R$ ${totalExpense.toFixed(2)}
    - Saldo: R$ ${(totalIncome - totalExpense).toFixed(2)}
    - Transações Recentes: ${JSON.stringify(recentTransactions.map(t => ({ d: t.description, v: t.amount, c: t.category, t: t.type })))}
    - Metas: ${JSON.stringify(goals)}

    Com base nesses dados, forneça 3 sugestões práticas e curtas em português (PT-BR) para:
    1. Como reduzir os maiores gastos.
    2. Como atingir as metas mais rapidamente.
    3. Uma dica geral de investimento ou economia.
    Seja empático e motivador. Formate em tópicos curtos.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Não foi possível gerar sugestões no momento. Continue controlando seus gastos!";
  } catch (error) {
    console.error("Erro ao chamar Gemini:", error);
    return "Mantenha o foco! Analise suas categorias de maior gasto para economizar mais este mês.";
  }
};
