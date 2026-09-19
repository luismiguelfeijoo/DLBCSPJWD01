import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { FastifyInstance } from 'fastify';
import {
  GetRatesParamsSchema,
  GetRatesQuerySchema,
  RatesResponseSchema,
} from '../schemas/rate.schema.ts';
import { CurrenciesResponseSchema } from '../schemas/currency.schema.ts';
import { ErrorResponseSchema } from '../schemas/error.schema.ts';

const currencyRoutes = (fastify: FastifyInstance) => {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  server.get(
    '/',
    {
      schema: {
        response: {
          200: CurrenciesResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (_, reply) => {
      try {
        const currencies = await fastify.currencyService.getCurrencies();
        return reply.code(200).send(currencies);
      } catch (err: any) {
        fastify.log.error(err, 'Failed to fetch currency rates');
        return reply.send(err?.statusCode || 500).send({
          error: err.name,
          message: err.message || 'Error fetching currency rates from external provider',
        });
      }
    },
  );

  server.get(
    '/:baseCurrency/rates',
    {
      schema: {
        params: GetRatesParamsSchema,
        querystring: GetRatesQuerySchema,
        response: {
          200: RatesResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { baseCurrency } = request.params;
      const { targetCurrency, date } = request.query;

      try {
        const rates = await fastify.currencyService.getExchangeRates({
          baseCurrency,
          targetCurrency,
          date,
        });
        return reply.code(200).send(rates);
      } catch (err: any) {
        fastify.log.error(err, 'Failed to fetch currency rates');
        return reply.send(err?.statusCode || 500).send({
          error: err.name,
          message: err.message || 'Error fetching currency rates from external provider',
        });
      }
    },
  );
};

export default currencyRoutes;
