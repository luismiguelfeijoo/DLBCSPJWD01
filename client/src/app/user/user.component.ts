import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { Router } from '@angular/router';
import { User } from '../core/model/user.model';
import { UserStore } from '../core/store/user.store';

@Component({
  selector: 'app-user',
  imports: [MatCardModule, MatListModule, MatButtonModule],
  templateUrl: './user.component.html',
})
export class UserComponent {
  // Dependencies / Injected Services
  private userStore = inject(UserStore);
  private router = inject(Router);

  // Component State & Properties
  users = this.userStore.users;

  // Computed Signals
  /** Name of the currently selected user profile */
  selectedMemberName = computed(() => this.userStore.selectedUser()?.name);

  // Methods
  /** Selects a user profile from the list */
  selectUser(user: User) {
    this.userStore.selectUser(user);
  }

  /** Proceeds to the authenticated dashboard area */
  login() {
    this.router.navigate(['/dashboard']);
  }
}
