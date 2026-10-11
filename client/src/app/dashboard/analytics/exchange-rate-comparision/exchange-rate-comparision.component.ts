import { Component, computed, inject } from '@angular/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { CurrencyStore } from '../../../core/store/currency.store';
import { TransactionStore } from '../../../core/store/transaction.store';

@Component({
  selector: 'app-exchange-rate-comparision-graph',
  imports: [NgxChartsModule],
  template: `
    <ngx-charts-bar-horizontal [results]="data()" xAxis="true" yAxis="true" roundBars="true">
    </ngx-charts-bar-horizontal>
  `,
})
export class ExchangeRateComparisionGraphComponent {
  // Dependencies / Injected Services
  private transactionStore = inject(TransactionStore);
  private currencyStore = inject(CurrencyStore);

  // Computed Signals
  /**
   * Transforms currency disparity metrics from store into results format
   * required by ngx-charts-bar-horizontal (`[{ name, value }]`).
   */
  data = computed(() =>
    this.transactionStore.disparities().map((disparity) => {
      const currency = this.currencyStore
        .currencies()
        ?.find((currency) => currency.isoCode === disparity.currency);
      const baseCurrency = this.currencyStore
        .currencies()
        ?.find((currency) => currency.isoCode === disparity.baseCurrency);
      return {
        name: `${disparity.baseCurrency} (${baseCurrency?.symbol}) to ${disparity.currency} (${currency?.symbol})`,
        value: disparity.disparity,
      };
    }),
  );
}
