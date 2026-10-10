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
export const getTransactionsByUserId = async (userId: string | Types.ObjectId, type?: string) => {
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  const filter: Record<string, any> = { userId: userObjectId };
  if (type) {
    filter.type = type;
  }
  return TransactionModel.find(filter);
};

/**
 * Get user balances
 * @param userId - Id of the user
 * @returns {@link Promise<BalanceSummary[]>} - Object with balances by currency
 */
export const getUserBalances = async (
  userId: string | Types.ObjectId,
): Promise<BalanceSummary[]> => {
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

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
      // Group primarily by currency
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
      // Group primarily by currency
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
 * Get distinct currencies by user Id
 * @param userId - Id of the user
 * @returns {@link Promise<string[]>}
 */
export const getDistinctCurrenciesByUserId = async (userId: string | Types.ObjectId) => {
  const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
  // TODO: fix this type issue, so far haven't found the proper usage in the docs
  return TransactionModel.distinct<string>('currency', { userId: userObjectId }) as Promise<
    string[]
  >;
};

/**
 * Get transaction adjustments grouped by currency and date
 * transformed as an object of rate exchanges by date
 * @param userId - Id of the user
 * @returns {@link Promise<CurrencyDataByDate>} - Object with rate exchanges by date
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
        // group by base currency, currency and date
        _id: {
          baseCurrency: '$baseCurrency',
          currency: '$currency',
          dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        },
        // Total amounts of the specific day
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
        // Effective daily applied rate = totalAmount / totalBaseAmount
        appliedRate: { $divide: ['$totalAmount', '$totalBaseAmount'] },
      },
    },
  ]);
  // map data to object for simplicity

  return adjustmentsByDate.reduce((acc, current) => {
    const { baseCurrency, currency, date, amount, baseAmount, appliedRate } = current;
    const currencyKey = `${baseCurrency}-${currency}`;
    // get existing currency, to add data by date
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
