import { model, Schema, Types } from 'mongoose';

// Interfaces for db interaction with Transaction model
export interface Transaction {
  userId: Types.ObjectId;
  type: 'sale' | 'adjustment';
  amount: number;
  currency: string;
  baseAmount: number;
  baseCurrency: string;
  exchangeRate: number;
  date: string;
  description?: string;
}

export interface CurrencyDataByDate {
  [currencyKey: string]: {
    [date: string]: {
      amount: number;
      baseAmount: number;
      appliedRate: number;
    };
  };
}

export interface BalanceSummary {
  currency: string;
  total: number;
}

// Create a Schema corresponding to the document interface.
const transactionSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // Indexed for fast Dashboard lookups per user
    },
    type: {
      type: String,
      enum: ['sale', 'adjustment'],
      required: true,
      default: 'sale',
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    baseAmount: {
      type: Number,
      required: true,
      min: [0, 'Base amount cannot be negative'],
    },
    baseCurrency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    exchangeRate: {
      type: Number,
      required: true,
      comment: 'Snapshot of the rate at the exact moment of the sale',
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        const { _id, __v, ...rest } = ret;
        return rest;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        const { _id, __v, ...rest } = ret;
        return rest;
      },
    },
  },
);

// Mongoose Model for db interaction
export const TransactionModel = model<Transaction>('Transaction', transactionSchema);

// Queries for data processing

/**
 * Retrieves transactions for a given user, optionally filtered by transaction type.
 *
 * @param userId - The user ID as a string or ObjectId
 * @param type - Optional filter for transaction type ('sale' | 'adjustment')
 * @returns {Promise<Transaction[]>} Array of matching transaction documents
 */
export const getTransactionsByUserId = async (userId: string | Types.ObjectId, type?: string) => {
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  const filter: Record<string, any> = { userId: userObjectId };
  if (type) {
    filter.type = type;
  }
  return TransactionModel.find(filter);
};

/**
 * Calculates current net balances per currency for a specific user.
 *
 * Logic:
 * 1. Aggregates total sales revenue per received currency (sum of `amount`).
 * 2. Aggregates total adjustments exchanged out of that currency (sum of `baseAmount`,
 *    where `baseCurrency` indicates the currency surrendered during adjustment).
 * 3. Subtracts adjustment deductions from total sales to determine the remaining net balance.
 *
 * @param userId - ID of the user
 * @returns {Promise<BalanceSummary[]>} List of currency balances with net totals
 */
export const getUserBalances = async (
  userId: string | Types.ObjectId,
): Promise<BalanceSummary[]> => {
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

  // Step 1: Aggregate total received sales amounts grouped by currency
  const sales = await TransactionModel.aggregate<{
    userId: Types.ObjectId;
    currency: string;
    totalSales: number;
  }>([
    {
      $match: {
        userId: userObjectId,
      },
    },
    {
      $group: {
        _id: {
          userId: '$userId',
          currency: '$currency',
        },
        totalSales: {
          $sum: '$amount',
        },
      },
    },
    {
      $project: {
        _id: 0,
        userId: '$_id.userId',
        currency: '$_id.currency',
        totalSales: 1,
      },
    },
    {
      $sort: { currency: -1 },
    },
  ]);

  // Step 2: Aggregate total adjustments where the currency was exchanged out
  // In an adjustment, 'baseCurrency' is the source currency being sold/reduced
  const adjustments = await TransactionModel.aggregate<{
    userId: Types.ObjectId;
    currency: string;
    totalAdjustments: number;
  }>([
    {
      $match: {
        userId: userObjectId,
        type: 'adjustment',
      },
    },
    {
      $group: {
        _id: {
          userId: '$userId',
          currency: '$baseCurrency',
        },
        totalAdjustments: {
          $sum: '$baseAmount',
        },
      },
    },
    {
      $project: {
        _id: 0,
        userId: '$_id.userId',
        currency: '$_id.currency',
        totalAdjustments: 1,
      },
    },
    {
      $sort: { currency: -1 },
    },
  ]);

  // Step 3: Compute net balance per currency: Net = Sales - Adjustments
  return sales.map((sale) => {
    const adjustmentAmount = adjustments.reduce(
      (acc, adjustment) =>
        acc + (adjustment.currency === sale.currency ? adjustment.totalAdjustments : 0),
      0,
    );
    return {
      currency: sale.currency,
      total: sale.totalSales - adjustmentAmount,
    };
  });
};

/**
 * Retrieves the distinct list of foreign currency codes used in transactions by a specific user.
 *
 * @param userId - ID of the user
 * @returns {Promise<string[]>} Array of distinct ISO currency codes
 */
export const getDistinctCurrenciesByUserId = async (userId: string | Types.ObjectId) => {
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  // TODO: fix this type issue, so far haven't found the proper usage in the docs
  return TransactionModel.distinct<string>('currency', { userId: userObjectId }) as Promise<
    string[]
  >;
};

/**
 * Aggregates adjustment transactions grouped by currency pair (`baseCurrency-currency`) and date.
 * Computes daily sums of `amount` and `baseAmount`, as well as the effective daily applied rate.
 *
 * Logic:
 * 1. Filters adjustments for the target user.
 * 2. Groups by baseCurrency, target currency, and formatted date (YYYY-MM-DD).
 * 3. Computes effective rate per day via `$divide: [totalAmount, totalBaseAmount]`.
 * 4. Transforms the database array into a structured dictionary: `{ [pairKey]: { [date]: dayData } }`.
 *
 * @param userId - ID of the user
 * @returns {Promise<CurrencyDataByDate>} Nested map of currency pairs to daily transaction data
 */
export const getAdjustmentsByUserIdGroupedByCurrencyByDate = async (
  userId: string | Types.ObjectId,
) => {
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  const adjustmentsByDate = await TransactionModel.aggregate<{
    baseCurrency: string;
    currency: string;
    date: string;
    amount: number;
    baseAmount: number;
    appliedRate: number;
  }>([
    {
      $match: {
        userId: userObjectId,
        type: 'adjustment',
      },
    },
    {
      $group: {
        // Group by source currency, target currency, and date string (YYYY-MM-DD)
        _id: {
          baseCurrency: '$baseCurrency',
          currency: '$currency',
          dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        },
        totalAmount: { $sum: '$amount' },
        totalBaseAmount: { $sum: '$baseAmount' },
      },
    },
    {
      $project: {
        _id: 0,
        baseCurrency: '$_id.baseCurrency',
        currency: '$_id.currency',
        date: '$_id.dateStr',
        amount: '$totalAmount',
        baseAmount: '$totalBaseAmount',
        // Effective daily applied exchange rate = total received amount / total base amount exchanged
        appliedRate: { $divide: ['$totalAmount', '$totalBaseAmount'] },
      },
    },
  ]);

  // Transform MongoDB flat aggregation results into structured object:
  // { 'USD-EUR': { '2026-03-01': { amount, baseAmount, appliedRate } } }
  return adjustmentsByDate.reduce((acc, current) => {
    const { baseCurrency, currency, date, amount, baseAmount, appliedRate } = current;
    const currencyKey = `${baseCurrency}-${currency}`;

    let currencyData = acc[currencyKey];
    if (!currencyData) {
      // if not exist create an empty object
      currencyData = {};
    }
    // no need to check existing date, because it is part of the grouped query result
    currencyData[date] = {
      amount,
      baseAmount,
      appliedRate,
    };

    acc[currencyKey] = currencyData;
    return acc;
  }, {} as CurrencyDataByDate);
};
