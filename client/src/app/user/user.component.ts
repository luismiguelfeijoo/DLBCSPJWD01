import { Component, computed, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatRippleModule } from '@angular/material/core';
import { UserStore } from '../core/store/user.store';
import { User } from '../core/model/user.model';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-user',
  imports: [MatCardModule, MatListModule, MatRippleModule, MatButtonModule],
  templateUrl: './user.component.html',
})
export class UserComponent {
  private userStore = inject(UserStore);
  private router = inject(Router);

  users = this.userStore.users;
  isLoading = this.userStore.isLoading;
  selectedMemberName = computed(() => this.userStore.selectedUser()?.name);

  selectUser(user: User) {
    this.userStore.selectUser(user);
  }

  login() {
    this.router.navigate(['/dashboard']);
  }
}
