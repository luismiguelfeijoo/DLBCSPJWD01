import { model, Schema, Types } from 'mongoose';

// 1. Create a Schema corresponding to the document interface.
const transactionSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true // Indexed for fast Dashboard lookups per user
    },
    type: {
      type: String,
      enum: ['sale', 'adjustment'],
      required: true,
      default: 'sale'
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative']
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    liveExchangeRate: {
      type: Number,
      required: true,
      comment: 'Snapshot of the rate at the exact moment of the sale'
    },
    description: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true // Gives you 'createdAt' which drives your History graphs
  }
);

// 2. Create a Model.
export const Transaction = model('Transaction', transactionSchema);
