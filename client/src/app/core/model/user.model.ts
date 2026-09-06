export type User = {
  id: string;
  name: string;
  email: string;
  baseCurrency: string;
  balances: { [currency: string]: number };
};
