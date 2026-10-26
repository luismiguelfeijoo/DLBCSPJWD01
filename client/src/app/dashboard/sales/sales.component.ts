import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, Injector } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { CurrencyStore } from '../../core/store/currency.store';
import { TransactionFormStore } from '../../core/store/transaction-form.store';
import { TransactionStore } from '../../core/store/transaction.store';
import { UserStore } from '../../core/store/user.store';
import { TransactionFormComponent } from '../transaction-form/transaction-form.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-sales',
  imports: [DatePipe, MatIconModule, MatButtonModule, MatTableModule, MatDialogModule],
  templateUrl: './sales.component.html',
})
export class SalesComponent {
  // Dependencies / Injected Services
  private transactionStore = inject(TransactionStore);
  private transactionFormStore = inject(TransactionFormStore);
  private currencyStore = inject(CurrencyStore);
  private userStore = inject(UserStore);
  private dialog = inject(MatDialog);
  private injector = inject(Injector);

  // Component State & Properties
  displayedColumns = ['date', 'description', 'amount', 'currency', 'exchangeRate'];
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
  /** Enriches raw sales transactions with currency symbols and exchange rate display labels */
  sales = computed(() =>
    this.transactionStore.sales().map((sale) => {
      const currency = this.currencyStore.currencies().find((c) => c.isoCode === sale.currency);
      const baseCurrency = this.currencyStore
        .currencies()
        .find((c) => c.isoCode === sale.baseCurrency);

      return {
        ...sale,
        currencySymbol: currency?.symbol ?? '',
        exchangeRateLabel: `1${baseCurrency?.symbol} = ${sale.exchangeRate}${currency?.symbol}`,
      };
    }),
  );

  // Methods
  /**
   * Opens TransactionFormComponent modal in 'sale' mode.
   */
  openNewSale(): void {
    this.transactionFormStore.initForm({
      mode: 'sale',
      defaultDescription: '',
      baseCurrencies: this.currencyStore
        .currencies()
        .filter((currency) => this.userStore.selectedUser()?.baseCurrency === currency.isoCode),
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
