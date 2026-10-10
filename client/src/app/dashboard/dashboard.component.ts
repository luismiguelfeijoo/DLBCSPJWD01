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
import { filter, map } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';
import { CurrencyService } from '../core/service/currency.service';
import { TransactionService } from '../core/service/transaction.service';
import { TransactionStore } from '../core/store/transaction.store';
import { UserStore } from '../core/store/user.store';
import { CurrencyStore } from '../core/store/currency.store';

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
  providers: [CurrencyService, TransactionService, CurrencyStore, TransactionStore],
})
export class DashboardComponent {
  private userStore = inject(UserStore);
  private transactionStore = inject(TransactionStore);
  private currencyStore = inject(CurrencyStore);

  private router = inject(Router);
  protected readonly title = signal('client');

  selectedUser = this.userStore.selectedUser;
  currencies = this.currencyStore.currencies;
  userBaseCurrency = computed(() => this.selectedUser()?.baseCurrency);
  currencyControl = new FormControl<string | null>(null);

  private breakpointObserver = inject(BreakpointObserver);

  // Tailwind 'sm' breakpoint is 640px (< 640px is small screen / mobile)
  readonly isSmallScreen = toSignal(
    this.breakpointObserver.observe('(max-width: 639px)').pipe(map((res) => res.matches)),
    { initialValue: window?.innerWidth < 640 },
  );

  // Signals for local UI state
  readonly isDrawerOpen = signal<boolean>(!this.isSmallScreen());

  // Navigation Items Config
  readonly navItems = [
    { path: '/dashboard/sales', label: 'Sales', icon: 'point_of_sale' },
    { path: '/dashboard/analytics', label: 'Analytics & History', icon: 'bar_chart' },
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
    return matchedItem ? matchedItem.label : 'Dashboard';
  });

  // Effects
  private _currencyWatcher = effect(() => {
    this.currencyControl.setValue(this.userBaseCurrency() || null, { emitEvent: false });
  });

  private _responsiveDrawerWatcher = effect(() => {
    const isSmall = this.isSmallScreen();
    this.isDrawerOpen.set(!isSmall);
  });

  onCurrencyChange(currency: string): void {
    this.userStore.setBaseCurrency(currency);
  }

  // Action Methods using Signals
  toggleDrawer(): void {
    this.isDrawerOpen.update((state) => !state);
  }

  toggleSidenav(): void {
    this.toggleDrawer();
  }

  onNavItemClick(): void {
    if (this.isSmallScreen()) {
      this.isDrawerOpen.set(false);
    }
  }

  logout(): void {
    this.userStore.selectUser(null);
    this.router.navigate(['/login']);
  }
}
