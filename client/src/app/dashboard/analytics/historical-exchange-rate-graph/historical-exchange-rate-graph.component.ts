import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { Currency } from '../../../core/model/currency.model';
import { ExchangeRateStore } from '../../../core/store/exchange-rate.store';

@Component({
  selector: 'app-historical-exchange-rate-graph',
  imports: [NgxChartsModule, MatFormFieldModule, MatSelectModule],
  template: `
    <div class="h-100">
      <div class="mt-4 flex justify-start">
        <mat-form-field class="w-100 sm:w-75" appearance="outline">
          <mat-select placeholder="Select currency" [(value)]="selectedCurrency">
            @for (currency of currencyOptions(); track currency.isoCode) {
              <mat-option [value]="currency"
                >{{ currency.name }} ({{ currency.isoCode }})
              </mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
      @if (!!selectedCurrency() && data()?.length) {
        <ngx-charts-line-chart
          [results]="data()"
          [xAxis]="true"
          [yAxis]="true"
          [gradient]="false"
          [showXAxisLabel]="true"
          [showYAxisLabel]="true"
          [autoScale]="true"
        >
        </ngx-charts-line-chart>
      } @else {
        <p>Select a currency to view exchange rate graph</p>
      }
    </div>
  `,
})
export class HistoricalExchangeRateGraphComponent {
  private exchangeRateStore = inject(ExchangeRateStore);
  selectedCurrency = signal<Currency | null>(null);
  currencyOptions = this.exchangeRateStore.currencyOptions;
  private _currencyWatcher = effect(() => {
    const selectedCurrency = this.selectedCurrency();
    if (selectedCurrency) {
      this.exchangeRateStore.loadExchangeRates([selectedCurrency.isoCode]);
    }
  });

  data = computed(() => {
    const exchangeRates = this.exchangeRateStore.exchangeRatesByCurrency();
    if (!exchangeRates) {
      return [];
    }
    return Object.entries(exchangeRates)?.map(([currencyCode, rates]) => ({
      name: currencyCode,
      series: rates.map((rate) => ({ name: rate.date, value: rate.rate })),
    }));
  });
}
