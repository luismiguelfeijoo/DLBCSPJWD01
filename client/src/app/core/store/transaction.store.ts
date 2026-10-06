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
import { Balance } from '../model/balance.model';
import { CurrencyStore } from './currency.store';

type TransactionsState = {
  sales: Transaction[];
  adjustments: Transaction[];
  targetCurrency: Currency | null;
  rates: Rate[];
  balances: Balance[];
  isLoadingBalances: boolean;
  isLoadingRates: boolean;
  isLoadingSales: boolean;
  isLoadingAdjustments: boolean;
  isSaving: boolean;
};

const initialState: TransactionsState = {
  sales: [],
  adjustments: [],
  targetCurrency: null,
  rates: [],
  balances: [],
  isLoadingBalances: false,
  isLoadingRates: false,
  isLoadingSales: false,
  isLoadingAdjustments: false,
  isSaving: false,
};

export const TransactionStore = signalStore(
  withState(initialState),
  withProps(
    (
      _,
      _transactionService = inject(TransactionService),
      _currencyService = inject(CurrencyService),

      _currencyStore = inject(CurrencyStore),
      _userStore = inject(UserStore),
    ) => ({ _transactionService, _currencyService, _currencyStore, _userStore }),
  ),
  withComputed(({ _userStore, _currencyStore }) => ({
    baseCurrency: computed(() =>
      _currencyStore
        .currencies()
        ?.find((currency) => currency.isoCode === _userStore.selectedUser()?.baseCurrency),
    ),
  })),
  withMethods((store) => ({
    setTargetCurrency: (targetCurrencyCode: string) => {
      patchState(store, {
        targetCurrency:
          store._currencyStore
            .currencies()
            ?.find((currency) => currency.isoCode === targetCurrencyCode) || null,
      });
    },
    loadSales: rxMethod<string>(
      pipe(
        tap(() => {
          patchState(store, { isLoadingSales: true });
        }),
        switchMap((userId) =>
          store._transactionService.getUserSales(userId).pipe(
            tapResponse({
              next: (transactions) => {
                patchState(store, {
                  isLoadingSales: false,
                  sales: transactions,
                });
              },
              error: (error) => {
                patchState(store, { isLoadingSales: false });
              },
            }),
          ),
        ),
      ),
    ),
    loadAdjustments: rxMethod<string>(
      pipe(
        tap(() => {
          patchState(store, { isLoadingSales: true });
        }),
        switchMap((userId) =>
          store._transactionService.getUserAdjustments(userId).pipe(
            tapResponse({
              next: (transactions) => {
                patchState(store, {
                  isLoadingSales: false,
                  adjustments: transactions,
                });
              },
              error: (error) => {
                patchState(store, { isLoadingSales: false });
              },
            }),
          ),
        ),
      ),
    ),
    _loadBalances: rxMethod<string>(
      pipe(
        tap(() => {
          patchState(store, { isLoadingBalances: true });
        }),
        switchMap((userId) =>
          store._transactionService.getUserBalances(userId).pipe(
            tapResponse({
              next: (balances) => {
                patchState(store, {
                  isLoadingBalances: false,
                  balances,
                });
              },
              error: (error) => {
                patchState(store, { isLoadingBalances: false });
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
  })),
  withMethods((store) => ({
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
            .createSale({
              description,
              date,
              baseCurrency,
              currency,
              amount,
              userId: store._userStore.selectedUser()?.id!,
              exchangeRate,
            })
            .pipe(
              tapResponse({
                next: (newTransaction) => {
                  patchState(store, (state) => ({
                    isSaving: false,
                    sales: [...state.sales, newTransaction],
                  }));
                  store._loadBalances(store._userStore.selectedUser()?.id!);
                },
                error: (error) => {
                  patchState(store, { isSaving: false });
                },
              }),
            ),
        ),
      ),
    ),
    registerAdjustment: rxMethod<{
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
            .createAdjustment({
              description,
              date,
              baseCurrency,
              currency,
              amount,
              userId: store._userStore.selectedUser()?.id!,
              exchangeRate,
            })
            .pipe(
              tapResponse({
                next: (newTransaction) => {
                  patchState(store, (state) => ({
                    isSaving: false,
                    adjustments: [...state.adjustments, newTransaction],
                  }));
                  store._loadBalances(store._userStore.selectedUser()?.id!);
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
        store.loadSales(selectedUser.id);
        store.loadAdjustments(selectedUser.id);
        store._loadBalances(selectedUser.id);
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
