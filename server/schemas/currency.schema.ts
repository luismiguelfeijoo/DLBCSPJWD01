import { Type } from 'typebox';

export const CurrencyResponseSchema = Type.Object({
  iso_code: Type.String(),
  iso_numeric: Type.String(),
  name: Type.String(),
  symbol: Type.String(),
  start_date: Type.String({
    format: 'date',
    description: 'Currency start date',
  }),
});

export const CurrenciesResponseSchema = Type.Array(CurrencyResponseSchema);

export type CurrencyResponse = Type.Static<typeof CurrencyResponseSchema>;
