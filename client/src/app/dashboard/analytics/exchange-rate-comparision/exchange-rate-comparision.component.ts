import { Component, computed, inject } from '@angular/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { TransactionStore } from '../../../core/store/transaction.store';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CurrencyStore } from '../../../core/store/currency.store';

@Component({
  selector: 'app-exchange-rate-comparision-graph',
  imports: [NgxChartsModule],
  template: `
    <ngx-charts-bar-horizontal [results]="data()" xAxis="true" yAxis="true" roundBars="true">
    </ngx-charts-bar-horizontal>
  `,
})
export class ExchangeRateComparisionGraphComponent {
  private transactionStore = inject(TransactionStore);
  private currencyStore = inject(CurrencyStore);

  dis = [
    { name: 'USD / EUR', value: -1.63 }, // -1.63% below benchmark
    { name: 'GBP / EUR', value: -0.25 }, // -0.25% below benchmark
    { name: 'CAD / EUR', value: 0.3 }, // +0.30% above benchmark
  ];

  view = [];
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
