import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, Injector } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { TransactionStore } from '../../core/store/transaction.store';
import { UserStore } from '../../core/store/user.store';
import { SalesFormComponent } from './sales-form/sales-form.component';
import { TransactionService } from '../../core/service/transaction.service';

@Component({
  selector: 'app-sales',
  imports: [DatePipe, MatIconModule, MatButtonModule, MatTableModule, MatDialogModule],
  providers: [TransactionService, TransactionStore],
  templateUrl: './sales.component.html',
})
export class SalesComponent {
  private transactionStore = inject(TransactionStore);
  private userStore = inject(UserStore);
  private dialog = inject(MatDialog);
  private injector = inject(Injector);

  isLoading = this.transactionStore.isLoading;

  sales = computed(() =>
    this.transactionStore.sales().map((sale) => {
      const currency = this.transactionStore.currencies().find((c) => c.isoCode === sale.currency);
      const baseCurrency = this.transactionStore
        .currencies()
        .find((c) => c.isoCode === sale.baseCurrency);

      return {
        ...sale,
        currencySymbol: currency?.symbol ?? '',
        exchangeRateLabel: `1${baseCurrency?.symbol} = ${sale.exchangeRate}${currency?.symbol}`,
      };
    }),
  );
  baseCurrency = computed(() => this.userStore.selectedUser()?.baseCurrency);
  displayedColumns = ['date', 'description', 'amount', 'currency', 'exchangeRate'];

  openNewSale() {
    let dialogRef = this.dialog.open(SalesFormComponent, {
      height: '80vh',
      width: '80vw',
      // maxWidth: '80vw',
      injector: this.injector,
    });

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
