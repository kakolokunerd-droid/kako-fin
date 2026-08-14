
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  type: TransactionType;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

export type UserRole = 'admin' | 'user';
export type SubscriptionPlan = 'trial' | 'basic' | 'premium' | 'premium_plus';

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  currency: string;
  lastContributionDate?: string;
  role?: UserRole;
  // Campos de assinatura
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStartedAt?: string;
  subscriptionExpiresAt?: string | null;
  isTrialActive?: boolean;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
}

export enum Category {
  SALARY = 'Salário',
  INVESTMENT = 'Investimento',
  FOOD = 'Alimentação',
  TRANSPORT = 'Transporte',
  ENTERTAINMENT = 'Lazer',
  HEALTH = 'Saúde',
  EDUCATION = 'Educação',
  RENT = 'Moradia',
  LOAN = 'Empréstimo',
  OTHERS = 'Outros'
}

export type PurchaseType = 'cash' | 'installment';

export interface ShoppingItem {
  id: string;
  name: string;
  type: PurchaseType;
  purchaseDate: string;
  amount: number;
  installments?: number; // Apenas para compras parceladas
  category: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  createdBy: string; // Email do admin que criou
  createdAt: string;
  isRead: boolean;
  readAt?: string;
}

/** Valor efetivamente pago/recebido ao marcar a transação */
export interface PaidTransactionInfo {
  paidAmount: number;
  updatedAt?: string;
}

export type PaidTransactionsMap = Record<string, PaidTransactionInfo>;

export type SavingsPeriod =
  | 'current_month'
  | 'quarter'
  | '3m'
  | '6m'
  | '12m'
  | '2y'
  | '5y';

/** Período do orçamento por categoria */
export type BudgetPeriod = 'monthly' | 'yearly';

/** Orçamento por categoria (mensal ou anual) */
export interface CategoryBudget {
  id: string;
  category: string;
  /** Limite do período (mês ou ano) */
  monthlyLimit: number;
  /** monthly = mês corrente; yearly = ano corrente */
  period: BudgetPeriod;
}

/**
 * Conta longa / parcelamento (financiamento, empréstimo, compra parcelada).
 * Diferente de receita/despesa mensal (que se clona) — tem começo, fim e N parcelas.
 */
export interface InstallmentPlan {
  id: string;
  name: string;
  category: string;
  /** Valor total do bem/dívida (referência) */
  totalAmount: number;
  /** Valor de cada parcela */
  installmentAmount: number;
  /** Quantidade de parcelas */
  totalInstallments: number;
  /** Mês da 1ª parcela (YYYY-MM) */
  startYearMonth: string;
  /** Dia de vencimento no mês (1-31) */
  dueDay: number;
  /** Números das parcelas já pagas (1-based) */
  paidNumbers: number[];
  notes?: string;
}

/** Uma parcela concreta gerada a partir do plano */
export interface InstallmentOccurrence {
  planId: string;
  planName: string;
  number: number;
  yearMonth: string;
  dueDate: string;
  amount: number;
  paid: boolean;
  overdue: boolean;
}

export interface CashFlowPoint {
  date: string; // YYYY-MM-DD
  label: string;
  projectedBalance: number;
  inflow: number;
  outflow: number;
}

export interface FinancialHealth {
  score: number; // 0-100
  label: 'Crítico' | 'Atenção' | 'Bom' | 'Excelente';
  savingsRate: number; // %
  tips: string[];
}
