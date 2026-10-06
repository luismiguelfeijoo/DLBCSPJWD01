import { inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { Currency } from '../model/currency.model';
import { CurrencyService } from '../service/currency.service';

type CurrencyState = {
  currencies: Currency[];
  isLoadingCurrencies: boolean;
};

const initialState: CurrencyState = {
  currencies: [],
  isLoadingCurrencies: false,
};

export const CurrencyStore = signalStore(
  withState(initialState),
  withProps((_, _currencyService = inject(CurrencyService)) => ({ _currencyService })),
  withMethods((store) => ({
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
  })),
  withHooks({
    onInit: (store) => {
      store.loadCurrencies();
    },
  }),
);
