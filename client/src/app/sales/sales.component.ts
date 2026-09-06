import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, Injector } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialog,
  MatDialogModule
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { TransactionStore } from '../core/store/transaction.store';
import { UserStore } from '../core/store/user.store';
import { SalesFormComponent } from './sales-form/sales-form.component';
import { TransactionService } from '../core/service/transaction.service';

@Component({
  selector: 'app-sales',
  imports: [
    CurrencyPipe,
    DatePipe,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatDialogModule,
    // SalesFormComponent
  ],
  providers: [
    TransactionService,
    TransactionStore
  ],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.css',
})
export class SalesComponent {
  private transactionStore = inject(TransactionStore);
  private userStore = inject(UserStore);
  private dialog = inject(MatDialog);
  private injector = inject(Injector);

  isLoading = this.transactionStore.isLoading;
  sales = this.transactionStore.sales;
  baseCurrency = computed(() =>
    this.userStore.selectedUser()?.baseCurrency
  )
  displayedColumns = [
    'amount',
    'currency',
    'liveExchangeRate',
    'date',
    'description',
  ]

  openNewSale() {
    let dialogRef = this.dialog.open(SalesFormComponent, {
      height: '600px',
      width: '800px',
      injector: this.injector,
    });
    dialogRef.afterClosed().subscribe(result => {
      console.log(`CLOSED`);
    });

  }
}
