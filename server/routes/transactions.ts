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

      const sales = await Transaction.aggregate([
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
      const adjustments = await Transaction.aggregate([
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

      const result = sales.map((sale) => {
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

      return reply.code(200).send(result);
    },
  );
};

export default transactionRoutes;
