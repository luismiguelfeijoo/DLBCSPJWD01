import Fastify from 'fastify';
import { type TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import cors from '@fastify/cors';
import userRoutes from './routes/users.ts';
import transactionRoutes from './routes/transactions.ts';
import mongoose from 'mongoose';

process.loadEnvFile();

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
}).withTypeProvider<TypeBoxTypeProvider>();

fastify.register(cors, {
  // Add here the UI url to allow incoming traffic
  origin: process.env.ALLOWED_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

fastify.register(userRoutes, { prefix: '/users' });
fastify.register(transactionRoutes, { prefix: '/transactions' });


/**
 * Run the server!
 */
const start = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('Unable to connect to DB');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
