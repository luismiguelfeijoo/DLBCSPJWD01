import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { FastifyInstance } from 'fastify';
import {
  GetRatesParamsSchema,
  GetRatesQuerySchema,
  RatesResponseSchema,
} from '../schemas/rate.schema.ts';
import { CurrenciesResponseSchema } from '../schemas/currency.schema.ts';
import { DEFAULT_ERROR_RESPONSE, ErrorResponseSchema } from '../schemas/error.schema.ts';

/**
 * Currency Route Plugin
 * Registers endpoints under `/currencies`:
 * - GET /currencies - list all supported global currencies
 * - GET /currencies/:baseCurrency/rates - fetch live or historical exchange rates
 */
const currencyRoutes = (fastify: FastifyInstance) => {
  const server = fastify.withTypeProvider<TypeBoxTypeProvider>();

  /**
   * GET /currencies
   * Fetches all supported currencies from the external exchange rate provider.
   */
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
        return reply.code(500).send(DEFAULT_ERROR_RESPONSE);
      }
    },
  );

  /**
   * GET /currencies/:baseCurrency/rates
   * Fetches exchange rates for the given base currency.
   * Supports filtering by target quote currency, specific date, or date range (`from`, `to`).
   */
  server.get(
    '/:baseCurrency/rates',
    {
      schema: {
        params: GetRatesParamsSchema,
        querystring: GetRatesQuerySchema,
        response: {
          200: RatesResponseSchema,
          400: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { baseCurrency } = request.params;
      const { targetCurrency, date, from, to } = request.query;

      try {
        const rates = await fastify.currencyService.getExchangeRates({
          baseCurrency,
          targetCurrency,
          date,
          from,
          to,
        });
        return reply.code(200).send(rates);
      } catch (err: any) {
        fastify.log.error(err, 'Failed to fetch currency rates');
        return reply.code(500).send(DEFAULT_ERROR_RESPONSE);
      }
    },
  );
};

export default currencyRoutes;
