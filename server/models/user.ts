import { model, Schema, Types } from 'mongoose';

// Interfaces for db interaction with User model
export interface User {
  name: string;
  email: string;
  baseCurrency: string;
}

//  Schema corresponding to the document interface.
const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    baseCurrency: { type: String, required: true },
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
export const UserModel = model<User>('User', userSchema);

// Queries for data processing
export const getAllUsers = async () => {
  return UserModel.find();
};

export const getUserById = async (id: string | Types.ObjectId) => {
  return UserModel.findById(id);
};

export const updateUserBaseCurrency = async (id: string | Types.ObjectId, baseCurrency: string) => {
  const user = await UserModel.findById(id);
  if (!user) {
    return null;
  }
  user.baseCurrency = baseCurrency;
  await user.save();
  return user;
};
