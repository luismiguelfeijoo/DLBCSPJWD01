import {
  patchState,
  signalStore,
  withHooks,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { User } from '../model/user.model';
import { UserService } from '../service/user.service';
import { inject } from '@angular/core';
import { pipe, switchMap, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';

type UserState = {
  users: User[];
  selectedUser: User | null;
  isLoading: boolean;
};

const initialState: UserState = {
  users: [],
  selectedUser: null,
  isLoading: false,
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
    selectUser: (user: User) => {
      patchState(store, { selectedUser: user });
    },
  })),
  withHooks({
    onInit: (store) => {
      store.loadUsers();
    },
  }),
);
