import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { CurrencyStore } from '../../../core/store/currency.store';
import { TransactionStore } from '../../../core/store/transaction.store';

@Component({
  selector: 'app-currency-balance',
  imports: [DecimalPipe],
  template: `
    <div class="flex flex-wrap gap-1 sm:gap-2">
      @for (item of data(); track item.name) {
        <div class="grow sm:max-w-1/2 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <div class="text-xs font-medium text-slate-500 uppercase">{{ item.name }}</div>
          <div class="text-xl font-bold text-slate-800 mt-1">
            {{ item.value | number: '1.2-2' }}{{ item.symbol }}
          </div>
        </div>
      }
    </div>
  `,
})
export class CurrencyBalanceComponent {
  private transactionStore = inject(TransactionStore);
  private currencyStore = inject(CurrencyStore);

  data = computed(() =>
    this.transactionStore
      .balances()
      ?.filter((balance) => balance.total)
      .map((balance) => {
        const currency = this.currencyStore
          .currencies()
          ?.find((currency) => currency.isoCode === balance.currency);
        return { name: balance.currency, value: balance.total, symbol: currency?.symbol };
      }),
  );
}
