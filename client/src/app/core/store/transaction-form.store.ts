import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { Currency } from '../model/currency.model';
import { Rate } from '../model/rate.model';
import { CurrencyService } from '../service/currency.service';
import { CurrencyStore } from './currency.store';
import { TransactionStore } from './transaction.store';

export type TransactionMode = 'sale' | 'adjustment';

export interface ModeConfig {
  title: string;
  baseCurrencyLabel: string;
  currencyLabel: string;
  placeholder: string;
  isBaseCurrencyDisabled: boolean;
}

export const MODE_CONFIGS: Record<TransactionMode, ModeConfig> = {
  sale: {
    title: 'New Sale',
    baseCurrencyLabel: 'Price',
    currencyLabel: 'Client pays',
    placeholder: 'Product x',
    isBaseCurrencyDisabled: true,
  },
  adjustment: {
    title: 'New Currency Adjustment',
    baseCurrencyLabel: 'You exchange',
    currencyLabel: 'You receive',
    placeholder: 'Currency adjustment',
    isBaseCurrencyDisabled: false,
  },
};

export type TransactionFormState = {
  mode: TransactionMode;
  baseCurrencies: Currency[];
  defaultDescription: string;
  rates: Rate[];
  isLoadingRates: boolean;
};

export const initialTransactionFormState: TransactionFormState = {
  mode: 'sale',
  baseCurrencies: [],
  defaultDescription: '',
  rates: [],
  isLoadingRates: false,
};

export const TransactionFormStore = signalStore(
  withState(initialTransactionFormState),
  withProps(
    (
      _,
      _currencyService = inject(CurrencyService),
      _transactionStore = inject(TransactionStore),
      _currencyStore = inject(CurrencyStore),
    ) => ({
      _currencyService,
      _transactionStore,
      _currencyStore,
    }),
  ),
  withComputed(({ mode, _currencyStore, _transactionStore }) => ({
    currencies: computed<Currency[]>(() => _currencyStore.currencies() ?? []),
    userBaseCurrency: computed<Currency | null>(
      () => _transactionStore.baseCurrency() ?? null,
    ),
    config: computed(() => MODE_CONFIGS[mode()]),
    isSaving: computed(() => _transactionStore.isSaving()),
  })),
  withMethods((store) => ({
    initForm: (config: {
      mode: TransactionMode;
      baseCurrencies: Currency[];
      defaultDescription?: string;
    }) => {
      patchState(store, {
        mode: config.mode,
        baseCurrencies: config.baseCurrencies,
        defaultDescription: config.defaultDescription ?? '',
        rates: [],
        isLoadingRates: false,
      });
    },
    loadRates: rxMethod<{ baseCurrencyCode: string; targetCurrencyCode: string }>(
      pipe(
        tap(() => {
          patchState(store, { isLoadingRates: true });
        }),
        switchMap(({ baseCurrencyCode, targetCurrencyCode }) => {
          const fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - 7);
          return store._currencyService
            .getExchangeRates(baseCurrencyCode, {
              targetCurrency: targetCurrencyCode,
              from: fromDate.toISOString().split('T')[0],
            })
            .pipe(
              tapResponse({
                next: (rates) => {
                  patchState(store, {
                    isLoadingRates: false,
                    rates: rates.sort(
                      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
                    ),
                  });
                },
                error: (error) => {
                  console.error('Failed to load exchange rates', error);
                  patchState(store, { isLoadingRates: false, rates: [] });
                },
              }),
            );
        }),
      ),
    ),
    saveTransaction: (transaction: {
      description: string;
      date: string;
      baseCurrency: string;
      currency: string;
      amount: number;
      exchangeRate: number;
      baseAmount: number;
    }) => {
      if (store.mode() === 'sale') {
        store._transactionStore.registerSale(transaction);
      } else {
        store._transactionStore.registerAdjustment(transaction);
      }
    },
  })),
);
