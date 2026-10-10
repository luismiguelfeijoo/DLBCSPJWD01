import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, Injector } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { CurrencyStore } from '../../core/store/currency.store';
import { TransactionStore } from '../../core/store/transaction.store';
import { UserStore } from '../../core/store/user.store';
import { TransactionFormComponent } from '../transaction-form/transaction-form.component';

@Component({
  selector: 'app-sales',
  imports: [DatePipe, MatIconModule, MatButtonModule, MatTableModule, MatDialogModule],
  templateUrl: './sales.component.html',
})
export class SalesComponent {
  private transactionStore = inject(TransactionStore);
  private currencyStore = inject(CurrencyStore);
  private userStore = inject(UserStore);
  private dialog = inject(MatDialog);
  private injector = inject(Injector);

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
  displayedColumns = ['date', 'description', 'amount', 'currency', 'exchangeRate'];

  openNewSale() {
    const dialogRef = this.dialog.open(TransactionFormComponent, {
      height: '80vh',
      width: '80vw',
      // maxWidth: '80vw',
      injector: this.injector,
    });

    dialogRef.componentRef?.setInput('mode', 'sale');
    dialogRef.componentRef?.setInput('currencies', this.currencyStore.currencies());
    dialogRef.componentRef?.setInput(
      'baseCurrencies',
      this.currencyStore
        .currencies()
        .filter((currency) => this.userStore.selectedUser()?.baseCurrency === currency.isoCode),
    );

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
