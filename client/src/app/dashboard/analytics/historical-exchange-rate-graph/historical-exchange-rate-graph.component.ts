import { Component, computed, inject, linkedSignal, WritableSignal } from '@angular/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { ExchangeRateStore } from '../../../core/store/exchange-rate.store';

@Component({
  selector: 'app-historical-exchange-rate-graph',
  imports: [NgxChartsModule],
  template: `
    <ngx-charts-line-chart
      [results]="data()"
      [xAxis]="true"
      [yAxis]="true"
      [gradient]="false"
      [showXAxisLabel]="true"
      [showYAxisLabel]="true"
      xAxisLabel="Date"
      yAxisLabel="Rate"
      [autoScale]="true"
      [timeline]="true"
      [legend]="true"
      legendTitle="Currencies"
      (select)="onSelect($event)"
    >
    </ngx-charts-line-chart>
  `,
})
export class HistoricalExchangeRateGraphComponent {
  private exchangeRateStore = inject(ExchangeRateStore);

  view = [];
  selectedCurrencies: WritableSignal<string[]> = linkedSignal({
    source: computed(() =>
      this.exchangeRateStore.currencyOptions().map((currency) => currency.isoCode),
    ),
    computation: (source) => source,
  });
  data = computed(() => {
    const exchangeRates = this.exchangeRateStore.exchangeRatesByCurrency();
    if (!exchangeRates) {
      return [];
    }
    return Object.entries(exchangeRates)?.map(([currencyCode, rates]) => ({
      name: currencyCode,
      series: this.selectedCurrencies().includes(currencyCode)
        ? rates.map((rate) => ({ name: rate.date, value: rate.rate }))
        : [],
    }));
  });

  onSelect(currencyName: string) {
    this.selectedCurrencies.update((currentSelected) => {
      if (currentSelected.includes(currencyName)) {
        return currentSelected.filter((code) => code !== currencyName);
      }
      return [...currentSelected, currencyName];
    });
  }
}
