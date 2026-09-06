import { model, Schema } from 'mongoose';

// 1. Create a Schema corresponding to the document interface.
const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    baseCurrency: { type: String, required: true },
    balances: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        const { _id, __v, ...rest } = ret;
        return rest;
      }
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        const { _id, __v, ...rest } = ret;
        return rest;
      }
    },
  }
);
// 2. Create a Model.
export const User = model('User', userSchema);
