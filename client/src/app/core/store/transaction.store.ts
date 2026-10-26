import { computed, inject } from '@angular/core';
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
import { pipe, switchMap, tap } from 'rxjs';
import { Balance } from '../model/balance.model';
import { ExchangeDisparity } from '../model/exchange-disparity';
import { Transaction } from '../model/transaction.model';
import { TransactionService } from '../service/transaction.service';
import { CurrencyStore } from './currency.store';
import { UserStore } from './user.store';

type TransactionsState = {
  sales: Transaction[];
  adjustments: Transaction[];
  balances: Balance[];
  disparities: ExchangeDisparity[];
  isLoadingBalances: boolean;
  isLoadingSales: boolean;
  isLoadingAdjustments: boolean;
  isLoadingDisparities: boolean;
  isSaving: boolean;
};

const initialState: TransactionsState = {
  sales: [],
  adjustments: [],
  balances: [],
  disparities: [],
  isLoadingBalances: false,
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
      _currencyStore = inject(CurrencyStore),
      _userStore = inject(UserStore),
    ) => ({ _transactionService, _currencyStore, _userStore }),
  ),
  withComputed(({ _userStore, _currencyStore }) => ({
    baseCurrency: computed(() =>
      _currencyStore
        .currencies()
        ?.find((currency) => currency.isoCode === _userStore.selectedUser()?.baseCurrency),
    ),
  })),
  withMethods((store) => ({
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
                console.error('Failed to load sales', error);
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
          patchState(store, { isLoadingAdjustments: true });
        }),
        switchMap((userId) =>
          store._transactionService.getUserAdjustments(userId).pipe(
            tapResponse({
              next: (transactions) => {
                patchState(store, {
                  isLoadingAdjustments: false,
                  adjustments: transactions,
                });
              },
              error: (error) => {
                console.error('Failed to load adjustments', error);
                patchState(store, { isLoadingAdjustments: false });
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
                console.error('Failed to load balances', error);
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
                console.error('Failed to load disparities', error);
                patchState(store, { isLoadingDisparities: false });
              },
            }),
          ),
        ),
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
                    console.error('Failed to create sale', error);
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
                    console.error('Failed to create adjustment', error);
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
