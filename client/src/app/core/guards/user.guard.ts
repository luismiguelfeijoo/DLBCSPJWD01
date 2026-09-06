import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserStore } from '../store/user.store';

export const hasSelectedUserGuard: CanActivateFn = () => {
    const userStore = inject(UserStore);
    const router = inject(Router);

    // Check if your signal has a valid user
    if (userStore.selectedUser()) {
        return true; // Proceed to the route
    }

    // No user found? Redirect to a selection or login route
    return router.parseUrl('/users');
};