import { model, Schema, Types } from 'mongoose';

// 1. Create a Schema corresponding to the document interface.
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

// 2. Create a Model.
export const Transaction = model('Transaction', transactionSchema);

export interface CurrencyDataByDate {
  [currencyKey: string]: {
    [date: string]: {
      amount: number;
      baseAmount: number;
      appliedRate: number;
    };
  };
}
// 3. Queries for data processing
export const getAdjustmentsByUserIdGroupedByCurrencyByDate = async (userId: Types.ObjectId) => {
  const adjustmentsByDate = await Transaction.aggregate<{
    baseCurrency: string;
    currency: string;
    date: string;
    amount: number;
    baseAmount: number;
    appliedRate: number;
  }>([
    {
      $match: {
        userId: userId,
        type: 'adjustment',
      },
    },
    {
      $group: {
        // group by base currency, currency and date
        _id: {
          baseCurrency: '$baseCurrency',
          currency: '$currency',
          dateStr: { $dateToString: { format: '\%Y-\%m-\%d', date: '$date' } },
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

  console.log('Adjustments by date', JSON.stringify(adjustmentsByDate));

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
