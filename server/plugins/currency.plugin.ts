import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { CurrencyService } from '../services/currency.service.ts';

/**
 * Configuration options for the currency Fastify plugin.
 */
export interface CurrencyPluginOptions {
  /** The base URL of the external exchange rate API (e.g. from environment) */
  baseUrl?: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    currencyService: ReturnType<typeof CurrencyService>;
  }
}

/**
 * Fastify plugin that instantiates the CurrencyService client and decorates
 * the Fastify instance with `fastify.currencyService`.
 */
const currencyPlugin: FastifyPluginAsync<CurrencyPluginOptions> = async (fastify, opts) => {
  const baseUrl = opts.baseUrl;
  fastify.log.info('Registering currency plugin with baseUrl %s', baseUrl);
  if (!baseUrl) {
    return;
  }

  const service = CurrencyService(baseUrl, {
    headersTimeout: 5000,
    bodyTimeout: 5000,
  });

  fastify.decorate('currencyService', service);
};

export default fp(currencyPlugin, {
  name: 'currency-plugin',
  fastify: '5.x',
});
