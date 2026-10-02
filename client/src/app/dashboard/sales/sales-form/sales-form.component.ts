import { Component, computed, effect, inject, LOCALE_ID, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';

import { TransactionStore } from '../../../core/store/transaction.store';
import { Currency } from '../../../core/model/currency.model';
import { Rate } from '../../../core/model/rate.model';
import { Subject, takeUntil, tap } from 'rxjs';
import { formatDate } from '@angular/common';

const CUSTOM_RATE = {
  date: '',
  label: 'Custom (recieved/base amount)',
  rate: -1,
  base: 'custom',
  quote: 'custom',
};
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
    MatChipsModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './sales-form.component.html',
})
export class SalesFormComponent implements OnInit, OnDestroy {
  private transactionStore = inject(TransactionStore);
  private fb = inject(FormBuilder);
  private locale = inject(LOCALE_ID); // 2. Inject it (e.g. 'en-US', 'es', etc.)

  private _formInitializer = effect(() => {
    const baseCurrency = this.transactionStore.baseCurrency();
    this.form.patchValue({ baseCurrency });
  });
  private destroy$ = new Subject<void>();

  currencies = this.transactionStore.currencies;
  rates = computed<Array<{ label: string } & Rate>>(() => [
    CUSTOM_RATE,
    ...this.transactionStore.rates().map((rate) => {
      const baseCurrency = this.currencies().find((c) => c.isoCode === rate.base);
      const quoteCurrency = this.currencies().find((c) => c.isoCode === rate.quote);
      const formattedDate = formatDate(rate.date, 'shortDate', this.locale);
      return {
        ...rate,
        label: `${formattedDate}: 1${baseCurrency?.symbol} = ${rate.rate}${quoteCurrency?.symbol}`,
      };
    }),
  ]);

  form = this.fb.group({
    description: ['', [Validators.maxLength(100)]],
    date: [new Date(), [Validators.required]],
    time: [new Date(), [Validators.required]],
    baseCurrency: [{ value: {} as Currency, disabled: true }, [Validators.required]],
    currency: [{} as Currency, [Validators.required]],
    baseAmount: [0, [Validators.required, Validators.min(0.01)]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    exchangeRate: [CUSTOM_RATE, [Validators.required]],
  });

  ngOnInit(): void {
    this.form.controls.baseAmount.valueChanges
      .pipe(
        tap((baseAmount) => {
          const { exchangeRate, amount } = this.form.getRawValue();

          const calculatedAmount =
            exchangeRate?.quote !== 'custom' && exchangeRate?.rate && baseAmount
              ? baseAmount * exchangeRate?.rate
              : amount;
          this.form.patchValue({
            amount: calculatedAmount ? Math.round(calculatedAmount * 100) / 100 : calculatedAmount,
          });
        }),
        takeUntil(this.destroy$),
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroy$.unsubscribe();
  }

  resetForm() {
    this.form.reset({
      description: '',
      date: new Date(),
      time: new Date(),
      currency: this.transactionStore.baseCurrency(),
      amount: 0,
      exchangeRate: CUSTOM_RATE,
    });
  }

  onSave() {
    if (this.form.invalid) {
      return;
    }

    const { description, date, time, currency, amount, baseAmount, exchangeRate, baseCurrency } =
      this.form.getRawValue();

    if (!date || !time || !currency || !amount || !exchangeRate || !baseCurrency) {
      console.log('Required values are null');
      return;
    }

    const dateObj = date instanceof Date ? date : new Date(date);
    const timeObj = time instanceof Date ? time : new Date(time);

    const fullTimestamp = new Date(dateObj);
    if (!isNaN(timeObj.getTime())) {
      fullTimestamp.setHours(timeObj.getHours(), timeObj.getMinutes(), timeObj.getSeconds(), 0);
    }

    let rate = exchangeRate?.rate;

    if (exchangeRate.quote === CUSTOM_RATE.quote && baseAmount) {
      rate = Math.round((amount / baseAmount) * 100) / 100;
    }

    this.transactionStore.registerSale({
      description: description ?? '',
      date: fullTimestamp.toISOString(),
      baseCurrency: baseCurrency.isoCode,
      currency: currency.isoCode,
      amount,
      exchangeRate: rate,
    });
  }

  onCurrencyChange(currency: Currency | null): void {
    this.transactionStore.setTargetCurrency(currency?.isoCode ?? '');
  }

  onExchangeRateSelected(rate: Rate | null): void {
    console.log('rate selected', rate);

    if (rate && rate.quote !== 'custom') {
      this.form.controls.amount.disable();
    } else {
      this.form.controls.amount.enable();
      return;
    }
    const exchangeRate = rate?.rate;
    const { baseAmount, amount } = this.form.getRawValue();
    const calculatedAmount = exchangeRate && baseAmount ? baseAmount * exchangeRate : amount;
    this.form.patchValue({
      amount: calculatedAmount ? Math.round(calculatedAmount * 100) / 100 : calculatedAmount,
    });
  }

  formatDecimals(controlName: string, decimals: number) {
    const control = this.form.get(controlName);
    if (!control) {
      return;
    }
    const value = control.value;
    if (value) {
      const fixed = 10 ** decimals;
      control.setValue(Math.round(value * fixed) / fixed);
    }
  }

  get baseCurrencySymbol(): string {
    return this.form.getRawValue().baseCurrency?.symbol ?? '';
  }

  get currencySymbol(): string {
    return this.form.getRawValue().currency?.symbol ?? '';
  }
}
