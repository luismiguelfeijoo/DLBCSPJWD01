import { model, Schema, Types } from 'mongoose';

// 1. Create a Schema corresponding to the document interface.
const exchangeSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    fromCurrency: {
      type: String,
      required: true,
      uppercase: true
    },
    fromAmount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative']
    },
    toCurrency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },
    toAmount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative']
    },
    appliedRate: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// 2. Create a Model.
export const Exchange = model('Exchange', exchangeSchema);
