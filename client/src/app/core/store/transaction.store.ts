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
import { computed, inject } from '@angular/core';
import { pipe, switchMap, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { Transaction } from '../model/transaction.model';
import { TransactionService } from '../service/transaction.service';
import { UserStore } from './user.store';

type TransactionsState = {
  _transactions: Transaction[];
  isLoading: boolean;
  isSaving: boolean;
};

const initialState: TransactionsState = {
  _transactions: [],
  isLoading: false,
  isSaving: false,
};

export const TransactionStore = signalStore(
  withState(initialState),
  withProps((
    _,
    _transactionService = inject(TransactionService),
    _userStore = inject(UserStore)
  ) => ({ _transactionService, _userStore })),
  withComputed(({ _transactions }) => ({
    sales: computed(() =>
      _transactions().filter((transaction) => transaction.type === 'sale')
    ),
    adjustments: computed(() =>
      _transactions().filter((transaction) => transaction.type === 'adjustment')
    ),
  })),
  withMethods((store) => ({
    loadTransactions: rxMethod<string>(
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
            })
          )
        )
      )
    ),
    registerSale: rxMethod<{
      description: string;
      date: string;
      currency: string;
      amount: number;
      exchangeRate: number;
    }>(
      pipe(
        tap(() => {
          patchState(store, { isSaving: true });
        }),
        switchMap(({ description, date, currency, amount, exchangeRate }) =>
          store._transactionService
            .createTransaction({
              description,
              date,
              currency,
              amount,
              userId: store._userStore.selectedUser()?.id!,
              type: 'sale',
              liveExchangeRate: exchangeRate,
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
              })
            )
        )
      )
    ),
  })),
  withHooks({
    onInit: (store) => {
      const selectedUser = store._userStore.selectedUser();
      if (selectedUser?.id) {
        store.loadTransactions(selectedUser.id);
      }
    },
  }),
);
