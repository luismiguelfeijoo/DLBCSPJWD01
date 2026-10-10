import { isObjectIdOrHexString, Types } from 'mongoose';
import {
  getAdjustmentsByUserIdGroupedByCurrencyByDate,
  Transaction,
} from '../models/transaction.ts';
import { User } from '../models/user.ts';
import {
  CreateTransactionSchema,
  GetTransactionsQuerySchema,
  GetUserBalancesQuerySchema,
  BalanceSummaryListSchema,
} from '../schemas/transaction.schema.ts';
import type { FastifyInstance } from 'fastify';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { RateResponse } from '../schemas/rate.schema.ts';

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

  server.get(
    '/exchange-disparity',
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

      const userAdjustmentsByCurrencyAndDay =
        await getAdjustmentsByUserIdGroupedByCurrencyByDate(userObjectId);

      request.log.info(`Adjustments from user: ${JSON.stringify(userAdjustmentsByCurrencyAndDay)}`);
      // query exchange date

      const result = await Promise.all(
        Object.entries(userAdjustmentsByCurrencyAndDay).map(async ([currencyKey, currencyData]) => {
          const [baseCurrency, currency] = currencyKey.split('-');
          const dateArray = Object.keys(currencyData).sort();
          request.log.info(`Dates from base currency: ${baseCurrency} and currency ${currency}`);

          if (dateArray.length === 0) {
            return null;
          }

          const from = dateArray[0];
          const to = dateArray[dateArray.length - 1];

          // get all exchanges rates by date;
          const rates = await fastify.currencyService.getExchangeRates({
            baseCurrency,
            targetCurrency: currency,
            from,
            to,
          });
          const sortedRates = [...rates].sort((a, b) => a.date.localeCompare(b.date));
          request.log.info(`Rates for base currency: ${rates}`);

          // ponderate the baseAmount by the amount of transactions to calculate the total disparity
          const totalAmountForPonderate = Object.values(currencyData).reduce(
            (acc, dayData) => acc + dayData.baseAmount,
            0,
          );
          request.log.info(`Total amount for ponderate: ${totalAmountForPonderate}`);

          // calculate the ponderated disparity by date.
          // for each date, calculate the disparity and ponderate it by the amount
          const ponderatedDisparity = Object.entries(currencyData).reduce(
            (acc, [date, dayData]) => {
              let marketRateByDate: RateResponse | undefined;
              let previousRate: RateResponse | undefined;

              sortedRates.forEach((rate) => {
                if (marketRateByDate) {
                  return;
                }

                // get date if it's the same, of if you go over
                if (rate.date === date) {
                  marketRateByDate = rate;
                } else if (rate.date > date) {
                  marketRateByDate = previousRate || rate;
                } else {
                  previousRate = rate;
                }
              });

              if (!marketRateByDate) {
                marketRateByDate = previousRate ?? sortedRates[0];
              }

              if (marketRateByDate && marketRateByDate.date !== date) {
                request.log.warn(
                  `Market rate not found for date ${date}, using closest rate from ${marketRateByDate.date}`,
                );
              }

              const marketRate = marketRateByDate?.rate;
              if (!marketRate) {
                return acc;
              }

              const realRate = dayData.appliedRate;

              request.log.debug(`Real rate on date ${date}: ${realRate}`);
              request.log.debug(`Market rate on date ${date}: ${marketRate}`);
              // Percentage deviation against benchmark: ((realRate - marketRate) / marketRate) * 100
              const deviationPercentage = ((realRate - marketRate) / marketRate) * 100;
              request.log.debug(`Deviation percentage on date ${date}: ${deviationPercentage}`);
              return acc + deviationPercentage * dayData.baseAmount;
            },
            0,
          );
          request.log.debug(`Ponderated disparity: ${ponderatedDisparity}`);

          return {
            baseCurrency,
            currency,
            disparity:
              totalAmountForPonderate > 0
                ? Number((ponderatedDisparity / totalAmountForPonderate).toFixed(2))
                : 0,
          };
        }),
      );

      request.log.info(`Final result: ${JSON.stringify(result)}`);

      return reply.code(200).send(result);
    },
  );
};

export default transactionRoutes;
