import { isObjectIdOrHexString } from 'mongoose';
import { Transaction } from '../models/transaction.ts';
import {
  CreateTransactionSchema,
  GetTransactionsQuerySchema,
} from '../schemas/transaction.schema.ts';
import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

const transactionRoutes = (fastify: FastifyInstance) => {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>()

  server.get(
    '/',
    {
      schema: {
        querystring: GetTransactionsQuerySchema,
      },
    },
    async (request, reply) => {
      const { userId } = request.query;
      if (!isObjectIdOrHexString(userId)) {
        fastify.log.warn('Provided userId is not valid');
        return reply.code(400).send([]);
      }
      const transactions = await Transaction.find({ userId });
      return reply.code(200).send(transactions);
    }
  );

  server.post(
    '/',
    {
      schema: {
        body: CreateTransactionSchema,
      },
    },
    async (request, reply) => {
      const transaction = new Transaction({ ...request.body });
      await transaction.save();
      return reply.code(200).send(transaction);
    }
  );
};

export default transactionRoutes;
