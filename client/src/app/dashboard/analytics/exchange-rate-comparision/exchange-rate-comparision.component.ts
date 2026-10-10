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
    <ngx-charts-bar-horizontal [results]="disparityData" xAxis="true" yAxis="true" roundBars="true">
    </ngx-charts-bar-horizontal>
  `,
})
export class ExchangeRateComparisionGraphComponent {
  private transactionStore = inject(TransactionStore);
  private currencyStore = inject(CurrencyStore);

  private breakpointObserver = inject(BreakpointObserver);

  // Tailwind 'sm' breakpoint is 640px (< 640px is small screen / mobile)
  readonly isSmallScreen = toSignal(
    this.breakpointObserver.observe('(max-width: 639px)').pipe(map((res) => res.matches)),
    { initialValue: window?.innerWidth < 640 },
  );

  disparityData = [
    { name: 'USD / EUR', value: -1.63 }, // -1.63% below benchmark
    { name: 'GBP / EUR', value: -0.25 }, // -0.25% below benchmark
    { name: 'CAD / EUR', value: 0.3 }, // +0.30% above benchmark
  ];

  view = [];
  data = computed(() =>
    this.transactionStore
      .balances()
      ?.filter((balance) => balance.total)
      .map((balance) => {
        const currency = this.currencyStore
          .currencies()
          ?.find((currency) => currency.isoCode === balance.currency);
        return { name: `${balance.currency} (${currency?.symbol})`, value: balance.total };
      }),
  );
}
