import { isObjectIdOrHexString, Types } from 'mongoose';
import { Transaction } from '../models/transaction.ts';
import { User } from '../models/user.ts';
import {
  CreateTransactionSchema,
  GetTransactionsQuerySchema,
  GetUserBalancesQuerySchema,
  BalanceSummaryListSchema,
} from '../schemas/transaction.schema.ts';
import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

const transactionRoutes = (fastify: FastifyInstance) => {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.get(
    '/',
    {
      schema: {
        querystring: GetTransactionsQuerySchema,
      },
    },
    async (request, reply) => {
      const { userId, type } = request.query;
      if (!isObjectIdOrHexString(userId)) {
        fastify.log.warn('Provided userId is not valid');
        return reply.code(400).send([]);
      }
      const transactions = await Transaction.find({ userId, type });
      return reply.code(200).send(transactions);
    },
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
    },
  );

  server.get(
    '/balances',
    {
      schema: {
        querystring: GetUserBalancesQuerySchema,
        // response: {
        //   200: BalanceSummaryListSchema,
        // },
      },
    },
    async (request, reply) => {
      const { userId } = request.query;
      if (!isObjectIdOrHexString(userId)) {
        fastify.log.warn('Provided userId is not valid');
        return reply.code(400).send({});
      }

      const user = await User.findById(userId);
      if (!user) {
        return reply.code(404).send({});
      }

      const userObjectId = new Types.ObjectId(userId);
      const result = await Transaction.aggregate([
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
              $sum: {
                $cond: [{ $eq: ['$type', 'sale'] }, '$amount', 0],
              },
            },
            totalAdjustments: {
              $sum: {
                $cond: [{ $eq: ['$type', 'adjustment'] }, '$amount', 0],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            userId: '$_id.userId',
            currency: '$_id.currency',
            totalSales: 1,
            totalAdjustments: 1,
            // totalSales - totalAdjustments
            netSales: { $subtract: ['$totalSales', '$totalAdjustments'] },
          },
        },
        {
          $sort: { netSales: -1 }, // Highest revenue currency first
        },
      ]);

      return reply.code(200).send(result);
    },
  );
};

export default transactionRoutes;
