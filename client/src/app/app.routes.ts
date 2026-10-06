import { Routes } from '@angular/router';
import { hasSelectedUserGuard } from './core/guards/user.guard';
import { UserComponent } from './user/user.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', component: UserComponent },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
    canActivate: [hasSelectedUserGuard],
    children: [
      { path: '', redirectTo: 'sales', pathMatch: 'full' },
      {
        path: 'sales',
        loadComponent: () =>
          import('./dashboard/sales/sales.component').then((m) => m.SalesComponent),
      },
      {
        path: 'history',
        loadComponent: () =>
          import('./dashboard/graphs/graph-container.component').then(
            (m) => m.GraphContainerComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard', pathMatch: 'full' },
];
