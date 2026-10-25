import { Component, computed, effect, inject, Injector } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { CurrencyStore } from '../../core/store/currency.store';
import { ExchangeRateStore } from '../../core/store/exchange-rate.store';
import { TransactionFormStore } from '../../core/store/transaction-form.store';
import { TransactionStore } from '../../core/store/transaction.store';
import { TransactionFormComponent } from '../transaction-form/transaction-form.component';
import { CurrencyBalanceComponent } from './currency-balance/currency-balance.component';
import { ExchangeRateComparisionGraphComponent } from './exchange-rate-comparision/exchange-rate-comparision.component';
import { HistoricalExchangeRateGraphComponent } from './historical-exchange-rate-graph/historical-exchange-rate-graph.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-analytics',
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    CurrencyBalanceComponent,
    HistoricalExchangeRateGraphComponent,
    ExchangeRateComparisionGraphComponent,
  ],
  templateUrl: './analytics.component.html',
  providers: [ExchangeRateStore],
})
export class AnalyticsComponent {
  // Dependencies / Injected Services
  private transactionStore = inject(TransactionStore);
  private transactionFormStore = inject(TransactionFormStore);
  private currencyStore = inject(CurrencyStore);
  private dialog = inject(MatDialog);
  private injector = inject(Injector);

  // Component State & Properties
  private dialogRef: MatDialogRef<TransactionFormComponent> | null = null;
  private saveStarted = false;

  // Effects
  /**
   * Tracks transactionFormStore.isSaving via an effect to auto-close the modal upon successful save.
   */
  private _closeOnSaveEffect = effect(() => {
    if (this.transactionFormStore.isSaving()) {
      this.saveStarted = true;
      return;
    }
    if (this.saveStarted && !this.transactionFormStore.isSaving()) {
      this.saveStarted = false;
      this.dialogRef?.close();
      this.dialogRef = null;
    }
  });

  // Computed Signals
  /**
   * Filters currencies to only those currently held with positive/existing balances,
   * excluding the user's primary base currency. Used as options for adjustment source currency.
   */
  private currencies = computed(() =>
    this.currencyStore
      .currencies()
      .filter(
        (currency) =>
          this.transactionStore.baseCurrency()?.isoCode !== currency.isoCode &&
          this.transactionStore
            .balances()
            ?.some((balance) => balance.currency === currency.isoCode),
      ),
  );

  // Methods
  /**
   * Opens the TransactionFormComponent modal in 'adjustment' mode, passing available currencies.
   */
  openNewAdjustment(): void {
    this.transactionFormStore.initForm({
      mode: 'adjustment',
      defaultDescription: 'Exchange adjustment',
      baseCurrencies: this.currencies(),
    });

    this.dialogRef = this.dialog.open(TransactionFormComponent, {
      height: '80vh',
      width: '80vw',
      injector: this.injector,
    });

    this.dialogRef.afterClosed().pipe(takeUntilDestroyed()).subscribe(() => {
      this.dialogRef = null;
      this.saveStarted = false;
    });
  }
}
