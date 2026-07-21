import { Type } from 'typebox';

// Enum schema for transaction type
export const TransactionTypeSchema = Type.Union([
  Type.Literal('sale'),
  Type.Literal('adjustment'),
]);
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
  currency: Type.String({
    minLength: 1,
    description: 'Currency code (e.g. USD, EUR)',
  }),
  liveExchangeRate: Type.Number({
    description: 'Snapshot of the exchange rate at the exact moment of sale',
  }),
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
});
export type GetTransactionsQuery = Type.Static<typeof GetTransactionsQuerySchema>;
