export interface Transaction {
  userId: string;
  type: 'sale' | 'adjustment';
  amount: number;
  currency: string;
  liveExchangeRate: number;
  date: string;
  description?: string;
}
