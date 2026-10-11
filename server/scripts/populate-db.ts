import mongoose from 'mongoose';
import { User } from '../models/user.ts';

process.loadEnvFile();

if (!process.env.MONGODB_URI) {
  throw new Error('No url');
}

await mongoose.connect(process.env.MONGODB_URI);

const users = [
  new User({
    name: 'Luis Feijoo',
    email: 'luis@feijoo.com',
    baseCurrency: 'USD'
  }),
  new User({
    name: 'Miguel Jorge',
    email: 'miguel@jorge.com',
    baseCurrency: 'USD'
  }),
  new User({
    name: 'Peter Smith',
    email: 'peter@smith.com',
    baseCurrency: 'USD'
  })
];

Promise.all(users.map(async (user) => await user.save()));
