import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Transaction } from '../model/transaction.model';

@Service()
export class TransactionService {
  private httpClient = inject(HttpClient);
  private baseUrl = 'http://localhost:3000';

  getUserTransactions(userId: string): Observable<Transaction[]> {
    return this.httpClient.get<Transaction[]>(this.baseUrl + '/transactions', {
      params: { userId },
    });
  }

  createTransaction(transaction: Transaction): Observable<Transaction> {
    return this.httpClient.post<Transaction>(this.baseUrl + '/transactions', transaction);
  }
}
