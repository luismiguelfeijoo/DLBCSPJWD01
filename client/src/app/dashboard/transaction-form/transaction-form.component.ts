import {
  Component,
  computed,
  effect,
  inject,
  input,
  LOCALE_ID,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTimepickerModule } from '@angular/material/timepicker';

import { formatDate } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subject, takeUntil, tap } from 'rxjs';
import { Currency } from '../../core/model/currency.model';
import { Rate } from '../../core/model/rate.model';
import { TransactionStore } from '../../core/store/transaction.store';

const CUSTOM_RATE = {
  date: '',
  label: 'Custom (recieved/base amount)',
  rate: -1,
  base: 'custom',
  quote: 'custom',
};
@Component({
  selector: 'app-transaction-form',
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
  templateUrl: './transaction-form.component.html',
})
export class TransactionFormComponent implements OnInit, OnDestroy {
  // Inputs
  /** Determines form behavior: 'sale' (recording customer sale) or 'adjustment' (exchanging currency) */
  readonly mode = input.required<'sale' | 'adjustment'>();
  readonly defaultDescription = input<string>('');
  readonly currencies = input.required<Currency[]>();
  readonly baseCurrencies = input.required<Currency[]>();

  // Dependencies / Injected Services
  private readonly transactionStore = inject(TransactionStore);
  private readonly fb = inject(FormBuilder);
  private readonly locale = inject(LOCALE_ID);

  // State & Form Controls
  private destroy$ = new Subject<void>();

  form = this.fb.group({
    description: [this.defaultDescription(), [Validators.maxLength(100)]],
    date: [new Date(), [Validators.required]],
    time: [new Date(), [Validators.required]],
    baseCurrency: [{ value: {} as Currency, disabled: true }, [Validators.required]],
    currency: [{} as Currency, [Validators.required]],
    baseAmount: [0, [Validators.required, Validators.min(0.01)]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    exchangeRate: [CUSTOM_RATE, [Validators.required]],
  });

  // Signal bridge for reactive form base currency changes
  private baseCurrencySignal = toSignal(this.form.controls.baseCurrency.valueChanges);

  // Computed Signals
  /** Dynamic label for base currency field based on current mode */
  readonly baseCurrencyLabel = computed(() => {
    return this.mode() === 'sale' ? 'Price' : 'You exchange';
  });

  /** Dynamic label for target currency field based on current mode */
  readonly currencyLabel = computed(() => {
    return this.mode() === 'sale' ? 'Client pays' : 'You recieve';
  });

  /** Computed list of exchange rates (custom manual rate + live historical rates) */
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

  // Effects
  /** Initializes form fields based on whether current mode is 'sale' or 'adjustment' */
  private _formInitializer = effect(() => {
    if (this.mode() === 'sale') {
      // For sales: base currency is locked to user default base currency
      const baseCurrency = this.transactionStore.baseCurrency();
      this.form.patchValue({ baseCurrency });
      this.transactionStore.setTargetCurrency(null);
    } else {
      // For adjustments: allow selecting source currency; target is user base currency
      this.form.controls.baseCurrency.enable();
      const baseCurrency = this.transactionStore.baseCurrency();
      this.form.patchValue({ currency: baseCurrency });
      this.transactionStore.setTargetCurrency(baseCurrency?.isoCode);
    }
  });

  /** Automatically loads live exchange rates when source and target currencies change */
  private _ratesLoaderEffect = effect(() => {
    const targetCurrency = this.transactionStore.targetCurrency();
    if (this.mode() === 'sale') {
      const baseCurrency = this.transactionStore.baseCurrency()?.isoCode;
      if (!targetCurrency?.isoCode || !baseCurrency) {
        return;
      }
      this.transactionStore.loadRates({
        baseCurrencyCode: baseCurrency,
        targetCurrencyCode: targetCurrency.isoCode,
      });
    } else {
      const baseCurrency = this.baseCurrencySignal();
      if (!targetCurrency?.isoCode || !baseCurrency?.isoCode) {
        return;
      }
      this.transactionStore.loadRates({
        baseCurrencyCode: baseCurrency.isoCode,
        targetCurrencyCode: targetCurrency.isoCode,
      });
    }
  });

  // Lifecycle Hooks
  ngOnInit(): void {
    // Dynamically calculate target amount when base amount changes based on selected rate
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

  // Methods
  /** Resets form controls to default state */
  resetForm() {
    this.form.reset({
      description: '',
      date: new Date(),
      time: new Date(),
      currency: this.mode() === 'sale' ? this.transactionStore.baseCurrency() : null,
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

    if (!date || !time || !currency || !amount || !exchangeRate || !baseCurrency || !baseAmount) {
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

    const transaction = {
      description: description ?? '',
      date: fullTimestamp.toISOString(),
      baseCurrency: baseCurrency.isoCode,
      currency: currency.isoCode,
      amount,
      exchangeRate: rate,
      baseAmount,
    };

    if (this.mode() === 'sale') {
      this.transactionStore.registerSale(transaction);
    } else if (this.mode() === 'adjustment') {
      this.transactionStore.registerAdjustment(transaction);
    }
  }

  onCurrencyChange(currency: Currency | null): void {
    // maybe change this, and remove it from the store
    this.transactionStore.setTargetCurrency(currency?.isoCode ?? '');
  }

  onExchangeRateSelected(rate: Rate | null): void {
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
