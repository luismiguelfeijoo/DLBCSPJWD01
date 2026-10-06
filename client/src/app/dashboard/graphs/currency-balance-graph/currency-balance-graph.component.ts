import { Component, computed, inject } from '@angular/core';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { TransactionStore } from '../../../core/store/transaction.store';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { CurrencyStore } from '../../../core/store/currency.store';

@Component({
  selector: 'app-currency-balance-graph',
  imports: [NgxChartsModule],
  template: `
    <ngx-charts-pie-grid [results]="data()" (select)="onSelect($event)"> </ngx-charts-pie-grid>
  `,
})
export class CurrencyBalanceGraphComponent {
  private transactionStore = inject(TransactionStore);
  private currencyStore = inject(CurrencyStore);

  private breakpointObserver = inject(BreakpointObserver);

  // Tailwind 'sm' breakpoint is 640px (< 640px is small screen / mobile)
  readonly isSmallScreen = toSignal(
    this.breakpointObserver.observe('(max-width: 639px)').pipe(map((res) => res.matches)),
    { initialValue: window?.innerWidth < 640 },
  );

  view = [];
  data = computed(() =>
    this.transactionStore.balances()?.map((balance) => {
      const currency = this.currencyStore
        .currencies()
        ?.find((currency) => currency.isoCode === balance.currency);
      return { name: `${balance.currency} (${currency?.symbol})`, value: balance.netSales };
    }),
  );

  onSelect(event: any) {
    console.log('event', event);
  }
}
