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
import { ExchangeDisparity } from '../model/exchange-disparity';

type TransactionsState = {
  sales: Transaction[];
  adjustments: Transaction[];
  targetCurrency: Currency | null;
  rates: Rate[];
  balances: Balance[];
  disparities: ExchangeDisparity[];
  isLoadingBalances: boolean;
  isLoadingRates: boolean;
  isLoadingSales: boolean;
  isLoadingAdjustments: boolean;
  isLoadingDisparities: boolean;
  isSaving: boolean;
};

const initialState: TransactionsState = {
  sales: [],
  adjustments: [],
  targetCurrency: null,
  rates: [],
  balances: [],
  disparities: [],
  isLoadingBalances: false,
  isLoadingRates: false,
  isLoadingSales: false,
  isLoadingAdjustments: false,
  isLoadingDisparities: false,
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
    _loadDisparities: rxMethod<string>(
      pipe(
        tap(() => {
          patchState(store, { isLoadingDisparities: true });
        }),
        switchMap((userId) =>
          store._transactionService.getUserExchangeRateDisparity(userId).pipe(
            tapResponse({
              next: (disparities) => {
                patchState(store, {
                  isLoadingDisparities: false,
                  disparities,
                });
              },
              error: (error) => {
                patchState(store, { isLoadingDisparities: false });
              },
            }),
          ),
        ),
      ),
    ),
    loadRates: rxMethod<{ targetCurrencyCode: string; baseCurrencyCode: string }>(
      pipe(
        tap(() => {
          patchState(store, { isLoadingRates: true });
        }),
        switchMap(({ targetCurrencyCode, baseCurrencyCode }) => {
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
      baseAmount: number;
    }>(
      pipe(
        tap(() => {
          patchState(store, { isSaving: true });
        }),
        switchMap(
          ({ description, date, currency, amount, exchangeRate, baseCurrency, baseAmount }) =>
            store._transactionService
              .createSale({
                description,
                date,
                baseCurrency,
                currency,
                amount,
                userId: store._userStore.selectedUser()?.id!,
                exchangeRate,
                baseAmount,
              })
              .pipe(
                tapResponse({
                  next: (newTransaction) => {
                    patchState(store, (state) => ({
                      isSaving: false,
                      sales: [...state.sales, newTransaction],
                    }));
                    store._loadBalances(store._userStore.selectedUser()?.id!);
                    store._loadDisparities(store._userStore.selectedUser()?.id!);
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
      baseAmount: number;
    }>(
      pipe(
        tap(() => {
          patchState(store, { isSaving: true });
        }),
        switchMap(
          ({ description, date, currency, amount, exchangeRate, baseCurrency, baseAmount }) =>
            store._transactionService
              .createAdjustment({
                description,
                date,
                baseCurrency,
                currency,
                amount,
                userId: store._userStore.selectedUser()?.id!,
                exchangeRate,
                baseAmount,
              })
              .pipe(
                tapResponse({
                  next: (newTransaction) => {
                    patchState(store, (state) => ({
                      isSaving: false,
                      adjustments: [...state.adjustments, newTransaction],
                    }));
                    store._loadBalances(store._userStore.selectedUser()?.id!);
                    store._loadDisparities(store._userStore.selectedUser()?.id!);
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
        store._loadDisparities(selectedUser.id);
      }
    },
  }),
);
