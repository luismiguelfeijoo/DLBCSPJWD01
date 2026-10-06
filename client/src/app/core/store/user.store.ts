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
import { EMPTY, pipe, switchMap, tap } from 'rxjs';
import { User } from '../model/user.model';
import { UserService } from '../service/user.service';

type UserState = {
  users: User[];
  selectedUser: User | null;
  isLoading: boolean;
  isSaving: boolean;
};

const initialState: UserState = {
  users: [],
  selectedUser: null,
  isLoading: false,
  isSaving: false,
};

export const UserStore = signalStore(
  withState(initialState),
  withProps((_, _userService = inject(UserService)) => ({ _userService })),
  withMethods((store) => ({
    loadUsers: rxMethod<void>(
      pipe(
        tap(() => {
          patchState(store, { isLoading: true });
        }),
        switchMap(() =>
          store._userService.getUsers().pipe(
            tapResponse({
              next: (users) => {
                patchState(store, { isLoading: false, users });
              },
              error: (error) => {
                patchState(store, { isLoading: false });
              },
            }),
          ),
        ),
      ),
    ),
    setBaseCurrency: rxMethod<string>(
      pipe(
        tap(() => {
          patchState(store, { isSaving: true });
        }),
        switchMap((currency) => {
          const user = store.selectedUser();
          if (!user) {
            return EMPTY;
          }

          return store._userService.updateBaseCurrency(user.id, currency).pipe(
            tapResponse({
              next: (selectedUser) => {
                patchState(store, { isSaving: false, selectedUser });
              },
              error: (error) => {
                patchState(store, { isSaving: false });
              },
            }),
          );
        }),
      ),
    ),
    selectUser: (user: User | null) => {
      patchState(store, { selectedUser: user });
    },
  })),
  withHooks({
    onInit: (store) => {
      store.loadUsers();
    },
  }),
);
