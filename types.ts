
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

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  currency: string;
  lastContributionDate?: string;
  role?: UserRole;
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
