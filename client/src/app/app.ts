import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { UserStore } from './store/user.store';
import { UserService } from './service/user.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatToolbarModule,
  ],
  providers: [UserService, UserStore],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private userStore = inject(UserStore);
  protected readonly title = signal('client');

  selectedUser = this.userStore.selectedUser;
}
