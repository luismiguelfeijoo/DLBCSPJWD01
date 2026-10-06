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
import { EMPTY, forkJoin, Observable, pipe, switchMap, tap } from 'rxjs';
import { Currency } from '../model/currency.model';
import { Rate } from '../model/rate.model';
import { CurrencyService } from '../service/currency.service';
import { CurrencyStore } from './currency.store';
import { UserStore } from './user.store';

type ExchangeRateState = {
  _currencyCodes: string[];
  exchangeRatesByCurrency: { [key: string]: Rate[] } | null;
  isLoadingRates: boolean;
  isLoadingCurrencies: boolean;
};

const initialState: ExchangeRateState = {
  _currencyCodes: [],
  exchangeRatesByCurrency: null,
  isLoadingRates: false,
  isLoadingCurrencies: false,
};

export const ExchangeRateStore = signalStore(
  withState(initialState),
  withProps(
    (
      _,
      _currencyService = inject(CurrencyService),
      _currencyStore = inject(CurrencyStore),
      _userStore = inject(UserStore),
    ) => ({
      _currencyService,
      _currencyStore,
      _userStore,
    }),
  ),
  withComputed(({ _currencyStore, _currencyCodes }) => ({
    currencyOptions: computed<Currency[]>(() =>
      _currencyStore
        .currencies()
        ?.filter((currency) => _currencyCodes().includes(currency.isoCode)),
    ),
  })),
  withMethods((store) => ({
    loadUserCurrencies: rxMethod<string>(
      pipe(
        tap(() => {
          patchState(store, { isLoadingCurrencies: true });
        }),
        switchMap((userId) =>
          store._currencyService.getCurrencyCodesByUser(userId).pipe(
            tapResponse({
              next: (currencyCodes) => {
                patchState(store, {
                  isLoadingCurrencies: false,
                  _currencyCodes: currencyCodes,
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
    loadExchangeRates: rxMethod<string[]>(
      pipe(
        tap(() => {
          patchState(store, { isLoadingRates: true });
        }),
        switchMap((currencyCodes) => {
          const baseCurrency = store._userStore.selectedUser()?.baseCurrency;
          if (!baseCurrency) {
            return EMPTY;
          }
          const fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - 30);
          return forkJoin(
            currencyCodes.reduce(
              (acc, code) => ({
                ...acc,
                [code]: store._currencyService.getExchangeRates(baseCurrency, {
                  targetCurrency: code,
                  from: fromDate.toISOString().split('T')[0],
                }),
              }),
              {} as { [key: string]: Observable<Rate[]> },
            ),
          ).pipe(
            tapResponse({
              next: (ratesByCurrency) => {
                patchState(store, {
                  isLoadingRates: false,
                  exchangeRatesByCurrency: ratesByCurrency,
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
  withHooks({
    onInit: (store) => {
      const selectedUser = store._userStore.selectedUser();
      if (selectedUser?.id) {
        store.loadUserCurrencies(selectedUser.id);
      }
      effect(() => {
        const currencyCodes = store._currencyCodes();
        if (currencyCodes) {
          store.loadExchangeRates(currencyCodes);
        } else {
          patchState(store, { exchangeRatesByCurrency: null });
        }
      });
    },
  }),
);
