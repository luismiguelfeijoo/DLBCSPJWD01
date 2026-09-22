import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { CurrencyService } from '../core/service/currency.service';
import { TransactionService } from '../core/service/transaction.service';
import { TransactionStore } from '../core/store/transaction.store';
import { UserStore } from '../core/store/user.store';

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatToolbarModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    MatSelectModule,
    MatFormFieldModule,
    ReactiveFormsModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  providers: [CurrencyService, TransactionService, TransactionStore],
})
export class DashboardComponent {
  private userStore = inject(UserStore);
  private transactionStore = inject(TransactionStore);
  private router = inject(Router);
  protected readonly title = signal('client');

  selectedUser = this.userStore.selectedUser;
  currencies = this.transactionStore.currencies;
  userBaseCurrency = computed(() => this.selectedUser()?.baseCurrency);
  currencyControl = new FormControl<string | null>(null);

  // Signals for local UI state
  readonly isSidenavOpen = signal<boolean>(true);
  readonly unreadNotifications = signal<number>(3);

  // Navigation Items Config
  readonly navItems = [
    { path: '/dashboard/sales', label: 'Sales & POS', icon: 'point_of_sale' },
    { path: '/dashboard/exchange', label: 'Currency Exchange', icon: 'currency_exchange' },
    { path: '/dashboard/history', label: 'Analytics & History', icon: 'bar_chart' },
  ];

  // Convert Router events into an Angular Signal using `toSignal`
  private currentRouteEvent = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)),
  );

  // Computed Signal
  readonly currentPageTitle = computed(() => {
    this.currentRouteEvent();
    const currentPath = this.router.url;
    const matchedItem = this.navItems.find((item) => currentPath.includes(item.path));
    console.log(matchedItem);
    return matchedItem ? matchedItem.label : 'Dashboard';
  });

  // Effects
  private _currencyWatcher = effect(() => {
    this.currencyControl.setValue(this.userBaseCurrency() || null, { emitEvent: false });
  });

  onCurrencyChange(currency: string): void {
    this.userStore.setBaseCurrency(currency);
  }

  // Action Methods using Signals
  toggleSidenav(): void {
    this.isSidenavOpen.update((state) => !state);
  }

  logout(): void {
    this.userStore.selectUser(null);
    this.router.navigate(['/login']);
  }
}
