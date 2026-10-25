import { formatDate } from '@angular/common';
import { Component, computed, inject, LOCALE_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { merge } from 'rxjs';
import { Currency } from '../../core/model/currency.model';
import { Rate } from '../../core/model/rate.model';
import { TransactionFormStore } from '../../core/store/transaction-form.store';
import {
  calculateAmount,
  calculateEffectiveRate,
  combineDateAndTime,
  roundToDecimals,
} from '../../core/utils';

const CUSTOM_RATE: { label: string } & Rate = {
  date: '',
  label: 'Custom (received/base amount)',
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
export class TransactionFormComponent {
  // Dependencies / Injected Services
  private readonly formStore = inject(TransactionFormStore);
  private readonly fb = inject(FormBuilder);
  private readonly locale = inject(LOCALE_ID);

  // Template-bound Properties & Signals (derived from store)
  readonly title = computed(() => this.formStore.config().title);
  readonly baseCurrencyLabel = computed(() => this.formStore.config().baseCurrencyLabel);
  readonly currencyLabel = computed(() => this.formStore.config().currencyLabel);
  readonly placeholder = computed(() => this.formStore.config().placeholder);
  readonly baseCurrencies = this.formStore.baseCurrencies;
  readonly currencies = this.formStore.currencies;
  readonly isSaving = this.formStore.isSaving;

  // Reactive Form definition
  form = this.fb.group({
    description: [this.formStore.defaultDescription(), [Validators.maxLength(100)]],
    date: [new Date(), [Validators.required]],
    time: [new Date(), [Validators.required]],
    baseCurrency: [{ value: null as Currency | null, disabled: true }, [Validators.required]],
    currency: [null as Currency | null, [Validators.required]],
    baseAmount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    exchangeRate: [CUSTOM_RATE, [Validators.required]],
  });

  // Computed list of exchange rates (custom rate + loaded historical rates)
  readonly rates = computed<Array<{ label: string } & Rate>>(() => [
    CUSTOM_RATE,
    ...this.formStore.rates().map((rate) => {
      const baseCurrency = this.formStore.currencies().find((c) => c.isoCode === rate.base);
      const quoteCurrency = this.formStore.currencies().find((c) => c.isoCode === rate.quote);
      const formattedDate = formatDate(rate.date, 'shortDate', this.locale);
      return {
        ...rate,
        label: `${formattedDate}: 1${baseCurrency?.symbol ?? rate.base} = ${rate.rate}${quoteCurrency?.symbol ?? rate.quote}`,
      };
    }),
  ]);

  constructor() {
    this.initializeForm();
    this.setupCurrencyListeners();
    this.setupBaseAmountListener();
  }

  private initializeForm(): void {
    const isBaseDisabled = this.formStore.config().isBaseCurrencyDisabled;
    const userBase = this.formStore.userBaseCurrency();

    if (isBaseDisabled) {
      this.form.controls.baseCurrency.disable();
      this.form.patchValue({
        description: this.formStore.defaultDescription(),
        baseCurrency: userBase,
      });
    } else {
      this.form.controls.baseCurrency.enable();
      this.form.patchValue({
        description: this.formStore.defaultDescription(),
        currency: userBase,
      });
    }
  }

  private setupCurrencyListeners(): void {
    merge(
      this.form.controls.baseCurrency.valueChanges,
      this.form.controls.currency.valueChanges,
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        const base = this.form.getRawValue().baseCurrency?.isoCode;
        const target = this.form.getRawValue().currency?.isoCode;
        if (base && target && base !== target) {
          this.formStore.loadRates({
            baseCurrencyCode: base,
            targetCurrencyCode: target,
          });
        }
      });
  }

  private setupBaseAmountListener(): void {
    this.form.controls.baseAmount.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((baseAmount) => {
        const { exchangeRate } = this.form.getRawValue();

        if (exchangeRate?.quote !== 'custom' && exchangeRate?.rate && baseAmount) {
          this.form.patchValue({
            amount: calculateAmount(baseAmount, exchangeRate.rate),
          });
        }
      });
  }

  resetForm(): void {
    const isBaseDisabled = this.formStore.config().isBaseCurrencyDisabled;
    const userBase = this.formStore.userBaseCurrency();

    this.form.reset({
      description: this.formStore.defaultDescription(),
      date: new Date(),
      time: new Date(),
      baseCurrency: isBaseDisabled ? userBase : null,
      currency: !isBaseDisabled ? userBase : null,
      baseAmount: null,
      amount: null,
      exchangeRate: CUSTOM_RATE,
    });
    this.form.controls.amount.enable();

    if (isBaseDisabled) {
      this.form.controls.baseCurrency.disable();
    } else {
      this.form.controls.baseCurrency.enable();
    }
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { description, date, time, currency, amount, baseAmount, exchangeRate, baseCurrency } =
      this.form.getRawValue();

    if (!date || !time || !currency || !amount || !exchangeRate || !baseCurrency || !baseAmount) {
      return;
    }

    const rate =
      exchangeRate.quote === CUSTOM_RATE.quote && baseAmount
        ? calculateEffectiveRate(amount, baseAmount)
        : exchangeRate.rate;

    const transaction = {
      description: description ?? '',
      date: combineDateAndTime(date, time),
      baseCurrency: baseCurrency.isoCode,
      currency: currency.isoCode,
      amount,
      exchangeRate: rate,
      baseAmount,
    };

    this.formStore.saveTransaction(transaction);
  }

  onExchangeRateSelected(rate: Rate | null): void {
    if (rate && rate.quote !== 'custom') {
      this.form.controls.amount.disable();
    } else {
      this.form.controls.amount.enable();
      return;
    }
    const { baseAmount, amount } = this.form.getRawValue();
    const calculatedAmount =
      rate?.rate && baseAmount ? calculateAmount(baseAmount, rate.rate) : amount;
    this.form.patchValue({
      amount: calculatedAmount,
    });
  }

  formatDecimals(controlName: string, decimals: number): void {
    const control = this.form.get(controlName);
    if (!control?.value) {
      return;
    }
    control.setValue(roundToDecimals(control.value, decimals));
  }

  get baseCurrencySymbol(): string {
    return this.form.getRawValue().baseCurrency?.symbol ?? '';
  }

  get currencySymbol(): string {
    return this.form.getRawValue().currency?.symbol ?? '';
  }
}
