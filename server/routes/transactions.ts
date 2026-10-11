import { isObjectIdOrHexString } from 'mongoose';
import {
  getTransactionsByUserId,
  TransactionModel,
} from '../models/transaction.ts';
import {
  CreateTransactionSchema,
  GetTransactionsQuerySchema,
  TransactionResponseSchema,
  TransactionsResponseSchema,
} from '../schemas/transaction.schema.ts';
import { DEFAULT_ERROR_RESPONSE, ErrorResponseSchema } from '../schemas/error.schema.ts';
import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

/**
 * Transaction Route Plugin
 * Registers endpoints under `/transactions`:
 * - GET /transactions - list transactions filtered by user ID and optional type
 * - POST /transactions - create a new transaction (sale or adjustment, returning 201 Created)
 */
const transactionRoutes = (fastify: FastifyInstance) => {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  /**
   * GET /transactions
   * Queries transactions for a specified user ID, with optional filter by type ('sale' | 'adjustment').
   */
  server.get(
    '/',
    {
      schema: {
        querystring: GetTransactionsQuerySchema,
        response: {
          200: TransactionsResponseSchema,
          400: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { userId, type } = request.query;
      if (!isObjectIdOrHexString(userId)) {
        fastify.log.warn('Provided userId is not valid');
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Provided userId is not valid',
        });
      }

      try {
        const transactions = await getTransactionsByUserId(userId, type);
        return reply.code(200).send(transactions);
      } catch (err: any) {
        fastify.log.error(err, 'Failed to fetch transactions');
        return reply.code(500).send(DEFAULT_ERROR_RESPONSE);
      }
    },
  );

  /**
   * POST /transactions
   * Records a new transaction (either a sale or currency adjustment).
   * Validates the payload against CreateTransactionSchema and returns 201 Created.
   */
  server.post(
    '/',
    {
      schema: {
        body: CreateTransactionSchema,
        response: {
          201: TransactionResponseSchema,
          400: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const transaction = new TransactionModel({ ...request.body });
        await transaction.save();
        return reply.code(201).send(transaction);
      } catch (err: any) {
        fastify.log.error(err, 'Failed to create transaction');
        return reply.code(500).send(DEFAULT_ERROR_RESPONSE);
      }
    },
  );
};

export default transactionRoutes;
