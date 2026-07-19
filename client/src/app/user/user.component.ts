import { Component, computed, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatRippleModule } from '@angular/material/core';
import { UserStore } from '../core/store/user.store';
import { User } from '../core/model/user.model';

@Component({
  selector: 'app-user',
  imports: [MatCardModule, MatListModule, MatRippleModule],
  templateUrl: './user.component.html',
  styleUrl: './user.component.css',
})
export class UserComponent {
  private userStore = inject(UserStore);

  users = this.userStore.users;
  isLoading = this.userStore.isLoading;
  selectedMemberName = computed(() => this.userStore.selectedUser()?.name);

  selectUser(user: User) {
    this.userStore.selectUser(user);
  }
}
