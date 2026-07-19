export type User = {
  name: string;
  email: string;
  baseCurrency: string;
  balances: { [currency: string]: number };
};
