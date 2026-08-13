
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
