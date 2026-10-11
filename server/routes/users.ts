import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { FastifyPluginCallback } from 'fastify';
import { isObjectIdOrHexString } from 'mongoose';
import {
  getAdjustmentsByUserIdGroupedByCurrencyByDate,
  getDistinctCurrenciesByUserId,
  getUserBalances,
} from '../models/transaction.ts';
import { getAllUsers, getUserById, updateUserBaseCurrency } from '../models/user.ts';
import { DEFAULT_ERROR_RESPONSE, ErrorResponseSchema } from '../schemas/error.schema.ts';
import type { RateResponse } from '../schemas/rate.schema.ts';
import {
  BalanceSummaryListSchema,
  ExchangeDisparityListSchema,
} from '../schemas/transaction.schema.ts';
import {
  UpdateUserBaseCurrencySchema,
  UserCurrenciesResponseSchema,
  UserIdParamsSchema,
  UserResponseSchema,
  UsersResponseSchema,
} from '../schemas/user.schema.ts';

/**
 * User Route Plugin
 * Registers RESTful endpoints under `/users`:
 * - GET /users - list all users
 * - GET /users/:id - get user by ID
 * - PATCH /users/:id - update user base currency
 * - GET /users/:id/currencies - list distinct currencies used by user
 * - GET /users/:id/balances - get aggregated net balances per currency
 * - GET /users/:id/exchange-disparity - calculate volume-weighted exchange rate disparities
 */
const userRoutes: FastifyPluginCallback = (fastify, _) => {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  /**
   * GET /users
   * Retrieves the list of all registered users.
   */
  server.get(
    '/',
    {
      schema: {
        response: {
          200: UsersResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const users = await getAllUsers();
        return reply.code(200).send(users);
      } catch (err: any) {
        fastify.log.error(err, 'Failed to fetch users');
        return reply.code(500).send(DEFAULT_ERROR_RESPONSE);
      }
    },
  );

  /**
   * GET /users/:id
   * Retrieves a single user profile by MongoDB ObjectId.
   */
  server.get(
    '/:id',
    {
      schema: {
        params: UserIdParamsSchema,
        response: {
          200: UserResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      if (!isObjectIdOrHexString(id)) {
        fastify.log.warn('Provided id is not valid');
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Provided id is not valid',
        });
      }

      try {
        const user = await getUserById(id);
        if (!user) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'User not found',
          });
        }
        return reply.code(200).send(user);
      } catch (err: any) {
        fastify.log.error(err, 'Failed to fetch user');
        return reply.code(500).send(DEFAULT_ERROR_RESPONSE);
      }
    },
  );

  /**
   * PATCH /users/:id
   * Updates the base currency configuration for a specific user.
   */
  server.patch(
    '/:id',
    {
      schema: {
        params: UserIdParamsSchema,
        body: UpdateUserBaseCurrencySchema,
        response: {
          200: UserResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { baseCurrency } = request.body;
      if (!isObjectIdOrHexString(id)) {
        fastify.log.warn('Provided id is not valid');
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Provided id is not valid',
        });
      }

      try {
        const user = await updateUserBaseCurrency(id, baseCurrency);
        if (!user) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'User not found',
          });
        }
        return reply.code(200).send(user);
      } catch (err: any) {
        fastify.log.error(err, 'Failed to update user base currency');
        return reply.code(500).send(DEFAULT_ERROR_RESPONSE);
      }
    },
  );

  /**
   * GET /users/:id/currencies
   * Retrieves all distinct currency codes that have appeared in the user's transactions.
   */
  server.get(
    '/:id/currencies',
    {
      schema: {
        params: UserIdParamsSchema,
        response: {
          200: UserCurrenciesResponseSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      if (!isObjectIdOrHexString(id)) {
        fastify.log.warn('Provided id is not valid');
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Provided id is not valid',
        });
      }

      try {
        const user = await getUserById(id);
        if (!user) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'User not found',
          });
        }
        const currencyCodes = await getDistinctCurrenciesByUserId(user._id);
        return reply.code(200).send(currencyCodes);
      } catch (err: any) {
        fastify.log.error(err, 'Failed to fetch user currencies');
        return reply.code(500).send(DEFAULT_ERROR_RESPONSE);
      }
    },
  );

  // GET /users/:id/balances - calculation endpoint moved under user
  server.get(
    '/:id/balances',
    {
      schema: {
        params: UserIdParamsSchema,
        response: {
          200: BalanceSummaryListSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      if (!isObjectIdOrHexString(id)) {
        fastify.log.warn('Provided id is not valid');
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Provided id is not valid',
        });
      }

      try {
        const user = await getUserById(id);
        if (!user) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'User not found',
          });
        }

        const result = await getUserBalances(id);
        return reply.code(200).send(result);
      } catch (err: any) {
        fastify.log.error(err, 'Failed to fetch user balances');
        return reply.code(500).send(DEFAULT_ERROR_RESPONSE);
      }
    },
  );

  /**
   * GET /users/:id/exchange-disparity
   *
   * Calculates the volume-weighted percentage disparity between exchange rates
   * actually applied during the user's currency adjustments and benchmark market rates.
   *
   * Financial Formula & Algorithm:
   * 1. Aggregate past adjustments into daily buckets per currency pair (`baseCurrency-currency`).
   * 2. Find min and max transaction dates to query market rates from the external API in one batch.
   * 3. For each adjustment day, find the exact market rate (or fall back to closest previous trading day
   *    if transactions occurred over a weekend or public holiday).
   * 4. Compute deviation percentage: `deviation% = ((appliedRate - marketRate) / marketRate) * 100`.
   * 5. Weight deviation by the transaction volume (`baseAmount`).
   * 6. Calculate weighted average disparity: `totalWeightedDeviation / totalBaseAmount`.
   */
  server.get(
    '/:id/exchange-disparity',
    {
      schema: {
        params: UserIdParamsSchema,
        response: {
          200: ExchangeDisparityListSchema,
          400: ErrorResponseSchema,
          404: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      if (!isObjectIdOrHexString(id)) {
        fastify.log.warn('Provided id is not valid');
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Provided id is not valid',
        });
      }

      try {
        const user = await getUserById(id);
        if (!user) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'User not found',
          });
        }

        const userAdjustmentsByCurrencyAndDay =
          await getAdjustmentsByUserIdGroupedByCurrencyByDate(id);

        request.log.info(
          `Adjustments from user: ${JSON.stringify(userAdjustmentsByCurrencyAndDay)}`,
        );

        const result = await Promise.all(
          Object.entries(userAdjustmentsByCurrencyAndDay).map(
            async ([currencyKey, currencyData]) => {
              const [baseCurrency, currency] = currencyKey.split('-');
              const dateArray = Object.keys(currencyData).sort();
              request.log.info(
                `Dates from base currency: ${baseCurrency} and currency ${currency}`,
              );

              if (dateArray.length === 0) {
                return null;
              }

              const from = dateArray[0];
              const to = dateArray[dateArray.length - 1];

              // get all exchanges rates by date
              const rates = await fastify.currencyService.getExchangeRates({
                baseCurrency,
                targetCurrency: currency,
                from,
                to,
              });
              const sortedRates = [...rates].sort((a, b) => a.date.localeCompare(b.date));
              request.log.info(`Rates for base currency: ${rates}`);

              // ponderate baseAmount by amount of transactions to calculate total disparity
              const totalAmountForPonderate = Object.values(currencyData).reduce(
                (acc, dayData) => acc + dayData.baseAmount,
                0,
              );
              request.log.info(`Total amount for ponderate: ${totalAmountForPonderate}`);

              const ponderatedDisparity = Object.entries(currencyData).reduce(
                (acc, [date, dayData]) => {
                  let marketRateByDate: RateResponse | undefined;
                  let previousRate: RateResponse | undefined;

                  sortedRates.forEach((rate) => {
                    if (marketRateByDate) {
                      return;
                    }

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
            },
          ),
        );

        const filteredResult = result.filter(
          (item): item is NonNullable<typeof item> => item !== null,
        );

        request.log.info(`Final result: ${JSON.stringify(filteredResult)}`);

        return reply.code(200).send(filteredResult);
      } catch (err: any) {
        fastify.log.error(err, 'Failed to calculate exchange disparity');
        return reply.code(500).send(DEFAULT_ERROR_RESPONSE);
      }
    },
  );
};

export default userRoutes;
