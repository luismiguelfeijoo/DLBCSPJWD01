import { computed, effect, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, pipe, switchMap, tap } from 'rxjs';
import { Currency } from '../model/currency.model';
import { Rate } from '../model/rate.model';
import { Transaction } from '../model/transaction.model';
import { CurrencyService } from '../service/currency.service';
import { TransactionService } from '../service/transaction.service';
import { UserStore } from './user.store';

type TransactionsState = {
  _transactions: Transaction[];
  targetCurrency: Currency | null;
  currencies: Currency[];
  rates: Rate[];
  isLoadingCurrencies: boolean;
  isLoadingRates: boolean;
  isLoading: boolean;
  isSaving: boolean;
};

const initialState: TransactionsState = {
  _transactions: [],
  targetCurrency: null,
  currencies: [],
  rates: [],
  isLoadingCurrencies: false,
  isLoadingRates: false,
  isLoading: false,
  isSaving: false,
};

export const TransactionStore = signalStore(
  withState(initialState),
  withProps(
    (
      _,
      _transactionService = inject(TransactionService),
      _currencyService = inject(CurrencyService),
      _userStore = inject(UserStore),
    ) => ({ _transactionService, _currencyService, _userStore }),
  ),
  withComputed(({ _transactions, _userStore, currencies }) => ({
    sales: computed(() => _transactions().filter((transaction) => transaction.type === 'sale')),
    adjustments: computed(() =>
      _transactions().filter((transaction) => transaction.type === 'adjustment'),
    ),
    baseCurrency: computed(() =>
      currencies()?.find(
        (currency) => currency.isoCode === _userStore.selectedUser()?.baseCurrency,
      ),
    ),
  })),
  withMethods((store) => ({
    setTargetCurrency: (targetCurrencyCode: string) => {
      patchState(store, {
        targetCurrency:
          store.currencies()?.find((currency) => currency.isoCode === targetCurrencyCode) || null,
      });
    },
    _loadTransactions: rxMethod<string>(
      pipe(
        tap(() => {
          patchState(store, { isLoading: true });
        }),
        switchMap((userId) =>
          store._transactionService.getUserTransactions(userId).pipe(
            tapResponse({
              next: (transactions) => {
                patchState(store, {
                  isLoading: false,
                  _transactions: transactions,
                });
              },
              error: (error) => {
                patchState(store, { isLoading: false });
              },
            }),
          ),
        ),
      ),
    ),
    loadCurrencies: rxMethod<void>(
      pipe(
        tap(() => {
          patchState(store, { isLoadingCurrencies: true });
        }),
        switchMap(() =>
          store._currencyService.getCurrencies().pipe(
            tapResponse({
              next: (currencies) => {
                patchState(store, {
                  isLoadingCurrencies: false,
                  currencies,
                });
              },
              error: (error) => {
                patchState(store, { isLoadingCurrencies: false });
              },
            }),
          ),
        ),
      ),
    ),
    _loadRates: rxMethod<string>(
      pipe(
        tap(() => {
          patchState(store, { isLoadingRates: true });
        }),
        switchMap((targetCurrencyCode) => {
          const baseCurrency = store.baseCurrency();
          if (!baseCurrency) {
            return EMPTY;
          }
          const fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - 7);
          return store._currencyService
            .getExchangeRates(baseCurrency.isoCode, {
              targetCurrency: targetCurrencyCode,
              from: fromDate.toISOString().split('T')[0],
            })
            .pipe(
              tapResponse({
                next: (rates) => {
                  patchState(store, {
                    isLoadingRates: false,
                    rates,
                  });
                },
                error: (error) => {
                  patchState(store, { isLoadingRates: false });
                },
              }),
            );
        }),
      ),
    ),
    registerSale: rxMethod<{
      description: string;
      date: string;
      baseCurrency: string;
      currency: string;
      amount: number;
      exchangeRate: number;
    }>(
      pipe(
        tap(() => {
          patchState(store, { isSaving: true });
        }),
        switchMap(({ description, date, currency, amount, exchangeRate, baseCurrency }) =>
          store._transactionService
            .createTransaction({
              description,
              date,
              baseCurrency,
              currency,
              amount,
              userId: store._userStore.selectedUser()?.id!,
              type: 'sale',
              exchangeRate,
            })
            .pipe(
              tapResponse({
                next: (newTransaction) => {
                  patchState(store, (state) => ({
                    isSaving: false,
                    _transactions: [...state._transactions, newTransaction],
                  }));
                },
                error: (error) => {
                  patchState(store, { isSaving: false });
                },
              }),
            ),
        ),
      ),
    ),
  })),
  withHooks({
    onInit: (store) => {
      const selectedUser = store._userStore.selectedUser();
      if (selectedUser?.id) {
        store._loadTransactions(selectedUser.id);
        store.loadCurrencies();
      }

      effect(() => {
        const targetCurrency = store.targetCurrency();
        if (targetCurrency?.isoCode) {
          store._loadRates(targetCurrency.isoCode);
        } else {
          patchState(store, { rates: [] });
        }
      });
    },
  }),
);
