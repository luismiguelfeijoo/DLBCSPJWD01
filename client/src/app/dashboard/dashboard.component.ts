import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
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
    MatMenuModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './dashboard.component.html',
  providers: [CurrencyService, TransactionService, CurrencyStore, TransactionStore],
})
export class DashboardComponent {
  // Dependencies / Injected Services
  private userStore = inject(UserStore);
  private currencyStore = inject(CurrencyStore);
  private router = inject(Router);
  private breakpointObserver = inject(BreakpointObserver);

  // Component State & Properties
  selectedUser = this.userStore.selectedUser;
  currencies = this.currencyStore.currencies;
  currencyControl = new FormControl<string | null>(null);

  /** Tracks router NavigationEnd events as a signal */
  private currentRouteEvent = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)),
  );

  /** Responsive screen size detector (true if width < 640px) */
  readonly isSmallScreen = toSignal(
    this.breakpointObserver.observe('(max-width: 639px)').pipe(map((res) => res.matches)),
    { initialValue: window?.innerWidth < 640 },
  );

  /** Responsive sidebar drawer state */
  readonly isDrawerOpen = signal<boolean>(!this.isSmallScreen());

  /** Navigation sidebar links configuration */
  readonly navItems = [
    { path: '/dashboard/sales', label: 'Sales', icon: 'point_of_sale' },
    { path: '/dashboard/analytics', label: 'Analytics & History', icon: 'bar_chart' },
  ];

  // Computed Signals
  /** Active user base currency ISO code */
  userBaseCurrency = computed(() => this.selectedUser()?.baseCurrency);

  /** Dynamically resolves header title based on active router URL */
  readonly currentPageTitle = computed(() => {
    this.currentRouteEvent();
    const currentPath = this.router.url;
    const matchedItem = this.navItems.find((item) => currentPath.includes(item.path));
    return matchedItem ? matchedItem.label : 'Dashboard';
  });

  // Effects
  /** Syncs toolbar currency dropdown with user's base currency in store */
  private _currencyWatcher = effect(() => {
    this.currencyControl.setValue(this.userBaseCurrency() || null, { emitEvent: false });
  });

  /** Auto-closes drawer on mobile and opens on desktop */
  private _responsiveDrawerWatcher = effect(() => {
    const isSmall = this.isSmallScreen();
    this.isDrawerOpen.set(!isSmall);
  });

  // Methods
  /** Updates active user's base currency via store */
  onCurrencyChange(currency: string): void {
    this.userStore.setBaseCurrency(currency);
  }

  /** Toggles sidenav drawer open/close state */
  toggleDrawer(): void {
    this.isDrawerOpen.update((state) => !state);
  }

  /** Handles nav item clicks, collapsing drawer on small screens */
  onNavItemClick(): void {
    if (this.isSmallScreen()) {
      this.isDrawerOpen.set(false);
    }
  }

  /** Clears active user session and redirects to login */
  logout(): void {
    this.userStore.selectUser(null);
    this.router.navigate(['/login']);
  }
}
