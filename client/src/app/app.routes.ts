import { Routes } from '@angular/router';
import { UserComponent } from './user/user.component';
import { SalesComponent } from './sales/sales.component';
import { hasSelectedUserGuard } from './core/guards/user.guard';

export const routes: Routes = [
    { path: '', redirectTo: 'sales', pathMatch: 'full' },
    { path: 'users', component: UserComponent },
    { path: 'sales', component: SalesComponent, canActivate: [hasSelectedUserGuard] }
];
