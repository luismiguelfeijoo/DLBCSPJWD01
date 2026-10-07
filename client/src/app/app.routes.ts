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
        path: 'analytics',
        loadComponent: () =>
          import('./dashboard/analytics/analytics.component').then((m) => m.AnalyticsComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard', pathMatch: 'full' },
];
