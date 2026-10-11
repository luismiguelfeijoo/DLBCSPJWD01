import { request } from 'undici';
import { CurrencyError } from '../error/CurrencyError.ts';
import { type RateResponse } from '../schemas/rate.schema.ts';
import { type CurrencyResponse } from '../schemas/currency.schema.ts';

/**
 * Query parameters for fetching exchange rates from the external currency API.
 */
export interface GetRatesOptions {
  /** The ISO code of the base currency (e.g., 'USD', 'EUR') */
  baseCurrency: string;
  /** Optional target currency code to filter quotes */
  targetCurrency?: string;
  /** Specific date for the exchange rate query (YYYY-MM-DD) */
  date?: string;
  /** Start date for a historical date range query (YYYY-MM-DD) */
  from?: string;
  /** End date for a historical date range query (YYYY-MM-DD) */
  to?: string;
}

/**
 * Factory creating an HTTP client service for interacting with the external exchange rate API.
 * Uses undici request for performant HTTP calls.
 *
 * @param baseUrl - Base URL of the external exchange rate provider
 * @param timeouts - HTTP headers and body timeout configurations in milliseconds
 */
export const CurrencyService = (
  baseUrl: string,
  timeouts: { headersTimeout: number; bodyTimeout: number },
) => ({
  /**
   * Fetches the list of all supported currencies with symbols and metadata.
   *
   * @returns {Promise<CurrencyResponse[]>} Array of supported currency objects
   * @throws {CurrencyError} If the external API responds with a non-200 status code
   */
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
  /**
   * Fetches exchange rates for a given base currency and optional target quotes.
   * Supports querying for a specific date or a historical date range (`from` to `to`).
   *
   * @param options - Query parameters including baseCurrency, targetCurrency, date, from, and to
   * @returns {Promise<RateResponse[]>} Array of exchange rate quotes with dates and rates
   * @throws {CurrencyError} If base and target currency are identical, or on external API errors
   */
  async getExchangeRates(options: GetRatesOptions): Promise<RateResponse[]> {
    const { baseCurrency, targetCurrency, date, from, to } = options;

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
    if (!date && from) {
      url.searchParams.set('from', from);
    }
    if (!date && to) {
      url.searchParams.set('to', to);
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
