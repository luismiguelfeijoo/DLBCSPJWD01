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
  private userStore = inject(UserStore);
  private router = inject(Router);

  users = this.userStore.users;
  selectedMemberName = computed(() => this.userStore.selectedUser()?.name);

  selectUser(user: User) {
    this.userStore.selectUser(user);
  }

  login() {
    this.router.navigate(['/dashboard']);
  }
}
