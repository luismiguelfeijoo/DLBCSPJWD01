export interface Transaction {
  userId: string;
  type: 'sale' | 'adjustment';
  amount: number;
  baseAmount: number;
  baseCurrency: string;
  currency: string;
  exchangeRate: number;
  date: string;
  description?: string;
}
