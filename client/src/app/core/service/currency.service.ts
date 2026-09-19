import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Currency } from '../model/currency.model';
import { Rate } from '../model/rate.model';
import { CurrencyDTO } from '../model/dto/currency.dto.model';

@Service()
export class CurrencyService {
  private httpClient = inject(HttpClient);
  private baseUrl = 'http://localhost:3000';

  getCurrencies(): Observable<Currency[]> {
    return this.httpClient
      .get<CurrencyDTO[]>(this.baseUrl + '/currencies')
      .pipe(map((dtos) => dtos.map(this.mapCurrencyDTO)));
  }

  getExchangeRates(
    baseCurrency: string,
    targetCurrency?: string,
    date?: string,
  ): Observable<Rate[]> {
    const params: { targetCurrency?: string; date?: string } = {};
    if (targetCurrency) {
      params.targetCurrency = targetCurrency;
    }
    if (date) {
      params.date = date;
    }
    return this.httpClient.get<Rate[]>(`${this.baseUrl}/currencies/${baseCurrency}/rates`, {
      params,
    });
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
}
