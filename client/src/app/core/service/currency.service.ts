import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Currency } from '../model/currency.model';
import { CurrencyDTO } from '../model/dto/currency.dto.model';
import { RateDTO } from '../model/dto/rate.dto.model';
import { Rate } from '../model/rate.model';
import { API_URL } from '../tokens/api-url.token';

@Service()
export class CurrencyService {
  private httpClient = inject(HttpClient);
  private baseUrl = inject(API_URL);

  getCurrencies(): Observable<Currency[]> {
    return this.httpClient
      .get<CurrencyDTO[]>(this.baseUrl + '/currencies')
      .pipe(map((dtos) => dtos.map(this.mapCurrencyDTO)));
  }

  getCurrencyCodesByUser(userId: string): Observable<string[]> {
    return this.httpClient.get<string[]>(`${this.baseUrl}/users/${userId}/currencies`);
  }

  getExchangeRates(
    baseCurrency: string,
    inputParams?: { targetCurrency?: string; date?: string; from?: string; to?: string },
  ): Observable<Rate[]> {
    const params = { ...inputParams };
    return this.httpClient
      .get<RateDTO[]>(`${this.baseUrl}/currencies/${baseCurrency}/rates`, {
        params,
      })
      .pipe(map((dtos) => dtos.map(this.mapRateDTO)));
  }

  private mapCurrencyDTO(dto: CurrencyDTO): Currency {
    return {
      isoCode: dto.iso_code,
      isoNumeric: dto.iso_numeric,
      name: dto.name,
      symbol: dto.symbol,
      startDate: dto.start_date,
    };
  }

  private mapRateDTO(dto: RateDTO): Rate {
    return {
      base: dto.base,
      quote: dto.quote,
      date: dto.date,
      rate: dto.rate,
    };
  }
}
