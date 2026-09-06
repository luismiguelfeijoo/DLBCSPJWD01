import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MatDialogRef } from '@angular/material/dialog';
import { provideNativeDateAdapter } from '@angular/material/core';

import { TransactionStore } from '../../core/store/transaction.store';

@Component({
  selector: 'app-sales-form',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatTimepickerModule,
    MatIconModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './sales-form.component.html',
  styleUrl: './sales-form.component.css',
})
export class SalesFormComponent {
  private transactionStore = inject(TransactionStore);
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<SalesFormComponent>, { optional: true });

  currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];

  form = this.fb.group({
    description: ['', [Validators.maxLength(100)]],
    date: [new Date(), [Validators.required]],
    time: [new Date(), [Validators.required]],
    currency: ['USD', [Validators.required]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    exchangeRate: [1, [Validators.required]],
  });

  resetForm() {
    this.form.reset({
      description: '',
      date: new Date(),
      time: new Date(),
      currency: 'USD',
      amount: 0,
      exchangeRate: 1,
    });
  }

  onSave() {
    if (this.form.invalid) {
      return;
    }

    const { description, date, time, currency, amount, exchangeRate } = this.form.getRawValue();

    if (!date || !time || !currency || !amount || !exchangeRate) {
      console.log('Required values are null');
      return;
    }

    const dateObj = date instanceof Date ? date : new Date(date);
    const timeObj = time instanceof Date ? time : new Date(time);

    const fullTimestamp = new Date(dateObj);
    if (!isNaN(timeObj.getTime())) {
      fullTimestamp.setHours(
        timeObj.getHours(),
        timeObj.getMinutes(),
        timeObj.getSeconds(),
        0
      );
    }

    this.transactionStore.registerSale({
      description: description ?? '',
      date: fullTimestamp.toISOString(),
      currency,
      amount,
      exchangeRate,
    });

    this.dialogRef?.close();
  }
}
