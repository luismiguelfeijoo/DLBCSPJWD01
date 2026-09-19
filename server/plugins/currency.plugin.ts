import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { CurrencyService } from '../services/currency.service.ts';

export interface CurrencyPluginOptions {
  baseUrl?: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    currencyService: ReturnType<typeof CurrencyService>;
  }
}

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
