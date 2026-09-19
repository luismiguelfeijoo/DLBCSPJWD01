import { request } from 'undici';
import { CurrencyError } from '../error/CurrencyError.ts';
import { type RateResponse } from '../schemas/rate.schema.ts';
import { type CurrencyResponse } from '../schemas/currency.schema.ts';

export interface GetRatesOptions {
  baseCurrency: string;
  targetCurrency?: string;
  date?: string;
}

export const CurrencyService = (
  baseUrl: string,
  timeouts: { headersTimeout: number; bodyTimeout: number },
) => ({
  async getCurrencies(): Promise<CurrencyResponse[]> {
    const url = new URL('/v2/currencies', baseUrl);
    const { statusCode, body } = await request(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      headersTimeout: timeouts.headersTimeout,
      bodyTimeout: timeouts.bodyTimeout,
    });

    if (statusCode !== 200) {
      const errorText = await body.text();
      throw new CurrencyError(
        `External currency API error: ${errorText || 'Unknown error'}`,
        statusCode,
      );
    }

    const data = (await body.json()) as CurrencyResponse[];
    return data;
  },
  async getExchangeRates(options: GetRatesOptions): Promise<RateResponse[]> {
    const { baseCurrency, targetCurrency, date } = options;

    const base = baseCurrency.toUpperCase();
    const target = targetCurrency?.toUpperCase();

    // return error if base and target are the same
    if (target && base === target) {
      throw new CurrencyError(`You must provide different target and base currencies`, 409);
    }

    const url = new URL('/v2/rates', baseUrl);
    if (base) {
      url.searchParams.set('base', base);
    }
    if (target) {
      url.searchParams.set('quotes', target);
    }
    if (date) {
      // check if format is allowed
      url.searchParams.set('date', date);
    }

    const { statusCode, body } = await request(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      headersTimeout: timeouts.headersTimeout,
      bodyTimeout: timeouts.bodyTimeout,
    });

    if (statusCode !== 200) {
      const errorText = await body.text();
      throw new CurrencyError(
        `External currency API error: ${errorText || 'Unknown error'}`,
        statusCode,
      );
    }

    const data = (await body.json()) as RateResponse[];
    return data;
  },
});
