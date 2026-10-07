import { Type } from 'typebox';

// Enum schema for transaction type
export const TransactionTypeSchema = Type.Union([Type.Literal('sale'), Type.Literal('adjustment')]);
export type TransactionType = Type.Static<typeof TransactionTypeSchema>;

// Payload schema for creating a transaction, will validate a wrong user input
export const CreateTransactionSchema = Type.Object({
  userId: Type.String({
    minLength: 24,
    maxLength: 24,
    description: 'MongoDB ObjectId hex string of the user',
  }),
  type: TransactionTypeSchema,
  amount: Type.Number({
    minimum: 0,
    description: 'Amount cannot be negative',
  }),
  baseAmount: Type.Number({
    minimum: 0,
    description: 'Base amount cannot be negative',
  }),
  baseCurrency: Type.String({
    minLength: 1,
    description: 'Currency code (e.g. USD, EUR)',
  }),
  currency: Type.String({
    minLength: 1,
    description: 'Currency code (e.g. USD, EUR)',
  }),
  exchangeRate: Type.Number({
    description: 'Snapshot of the exchange rate at the exact moment of sale',
  }),
  date: Type.Optional(Type.String({ format: 'date-time' })),
  description: Type.Optional(Type.String()),
});
export type CreateTransaction = Type.Static<typeof CreateTransactionSchema>;

// Query string schema for GET /transactions
export const GetTransactionsQuerySchema = Type.Object({
  userId: Type.String({
    minLength: 24,
    maxLength: 24,
    description: 'MongoDB ObjectId hex string of the user',
  }),
  type: TransactionTypeSchema,
});
export type GetTransactionsQuery = Type.Static<typeof GetTransactionsQuerySchema>;

// Query string schema for GET /transactions/balances
export const GetUserBalancesQuerySchema = Type.Object({
  userId: Type.String({
    minLength: 24,
    maxLength: 24,
    description: 'MongoDB ObjectId hex string of the user',
  }),
});
export type GetUserBalancesQuery = Type.Static<typeof GetUserBalancesQuerySchema>;

// Response schema for GET /transactions/balances
const BalanceSummarySchema = Type.Object({
  userId: Type.String({ description: 'MongoDB ObjectId string' }),
  currency: Type.String({ minLength: 3, maxLength: 3 }), // ISO 4217 code
  totalSales: Type.Number(),
  totalAdjustments: Type.Number(),
  salesCount: Type.Integer({ minimum: 0 }),
  adjustmentsCount: Type.Integer({ minimum: 0 }),
  netSales: Type.Number(),
});

export const BalanceSummaryListSchema = Type.Array(BalanceSummarySchema);

export type BalanceSummaryResponse = Type.Static<typeof BalanceSummaryListSchema>;
