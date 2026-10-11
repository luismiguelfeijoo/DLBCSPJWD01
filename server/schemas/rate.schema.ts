import { Type } from 'typebox';

export const GetRatesParamsSchema = Type.Object({
  baseCurrency: Type.String({
    minLength: 3,
    maxLength: 3,
    description: 'Currency ISO Code (e.g. USD, EUR)',
  }),
});
export type GetRatesParams = Type.Static<typeof GetRatesParamsSchema>;

export const GetRatesQuerySchema = Type.Object({
  targetCurrency: Type.Optional(
    Type.String({
      minLength: 3,
      maxLength: 3,
      description: 'Currency ISO Code (e.g. EUR, GBP)',
    }),
  ),
  date: Type.Optional(
    Type.String({
      format: 'date',
      description: 'Optional date for historical rates',
    }),
  ),
  from: Type.Optional(
    Type.String({
      format: 'date',
      description: 'Optional from date for historical rates',
    }),
  ),
  to: Type.Optional(
    Type.String({
      format: 'date',
      description: 'Optional to date for historical rates',
    }),
  ),
});
export type GetRatesQuery = Type.Static<typeof GetRatesQuerySchema>;

export const RateResponseSchema = Type.Object({
  rate: Type.Number(),
  base: Type.String({
    minLength: 3,
    maxLength: 3,
    description: 'Currency ISO Code (e.g. USD, EUR)',
  }),
  quote: Type.String({
    minLength: 3,
    maxLength: 3,
    description: 'Currency ISO Code (e.g. USD, EUR)',
  }),
  date: Type.String({
    format: 'date',
  }),
});
export const RatesResponseSchema = Type.Array(RateResponseSchema);
export type RateResponse = Type.Static<typeof RateResponseSchema>;
