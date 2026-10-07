import { Component, computed, effect, inject, Injector } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { CurrencyBalanceGraphComponent } from './currency-balance-graph/currency-balance-graph.component';
import { HistoricalExchangeRateGraphComponent } from './historical-exchange-rate-graph/historical-exchange-rate-graph.component';
import { ExchangeRateStore } from '../../core/store/exchange-rate.store';
import { TransactionStore } from '../../core/store/transaction.store';
import { MatDialog } from '@angular/material/dialog';
import { TransactionFormComponent } from '../transaction-form/transaction-form.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CurrencyStore } from '../../core/store/currency.store';

@Component({
  selector: 'app-analytics',
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    CurrencyBalanceGraphComponent,
    HistoricalExchangeRateGraphComponent,
  ],
  templateUrl: './analytics.component.html',
  providers: [ExchangeRateStore],
})
export class AnalyticsComponent {
  private transactionStore = inject(TransactionStore);
  private currencyStore = inject(CurrencyStore);

  private dialog = inject(MatDialog);
  private injector = inject(Injector);
  private currencies = computed(() =>
    this.currencyStore
      .currencies()
      .filter((currency) =>
        this.transactionStore.balances()?.some((balance) => balance.currency === currency.isoCode),
      ),
  );

  openNewAdjustment() {
    const dialogRef = this.dialog.open(TransactionFormComponent, {
      height: '80vh',
      width: '80vw',
      injector: this.injector,
    });
    dialogRef.componentRef?.setInput('mode', 'adjustment');
    dialogRef.componentRef?.setInput('defaultDescription', 'Exchange adjustment');
    dialogRef.componentRef?.setInput('baseCurrencies', this.currencies());
    dialogRef.componentRef?.setInput('currencies', this.currencyStore.currencies());

    let saveStarted = false;
    const saveEffect = effect(
      (result) => {
        if (this.transactionStore.isSaving()) {
          saveStarted = true;
          return;
        }
        if (saveStarted && !this.transactionStore.isSaving()) {
          dialogRef.close();
        }
      },
      { injector: this.injector },
    );
    dialogRef.afterClosed().subscribe((result) => {
      saveEffect.destroy();
    });
  }
}
