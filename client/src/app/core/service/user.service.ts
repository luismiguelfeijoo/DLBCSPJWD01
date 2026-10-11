import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../model/user.model';
import { API_URL } from '../tokens/api-url.token';

@Service()
export class UserService {
  private httpClient = inject(HttpClient);
  private baseUrl = inject(API_URL);

  getUsers(): Observable<User[]> {
    return this.httpClient.get<User[]>(this.baseUrl + '/users');
  }

  updateBaseCurrency(userId: string, currency: string): Observable<User> {
    return this.httpClient.patch<User>(this.baseUrl + '/users' + '/' + userId, {
      baseCurrency: currency,
    });
  }
}
