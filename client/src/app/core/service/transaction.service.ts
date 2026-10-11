import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Transaction } from '../model/transaction.model';
import { Balance } from '../model/balance.model';
import { ExchangeDisparity } from '../model/exchange-disparity';
import { API_URL } from '../tokens/api-url.token';

@Service()
export class TransactionService {
  private httpClient = inject(HttpClient);
  private baseUrl = inject(API_URL);

  getUserSales(userId: string): Observable<Transaction[]> {
    return this.getUserTransactions(userId, 'sale');
  }

  getUserAdjustments(userId: string): Observable<Transaction[]> {
    return this.getUserTransactions(userId, 'adjustment');
  }

  private getUserTransactions(
    userId: string,
    type: 'sale' | 'adjustment',
  ): Observable<Transaction[]> {
    return this.httpClient.get<Transaction[]>(this.baseUrl + '/transactions', {
      params: { userId, type },
    });
  }

  createSale(sale: Omit<Transaction, 'type'>): Observable<Transaction> {
    return this.createTransaction({ ...sale, type: 'sale' });
  }

  createAdjustment(sale: Omit<Transaction, 'type'>): Observable<Transaction> {
    return this.createTransaction({ ...sale, type: 'adjustment' });
  }

  private createTransaction(transaction: Transaction): Observable<Transaction> {
    return this.httpClient.post<Transaction>(this.baseUrl + '/transactions', transaction);
  }

  getUserBalances(userId: string): Observable<Balance[]> {
    return this.httpClient.get<Balance[]>(`${this.baseUrl}/users/${userId}/balances`);
  }

  getUserExchangeRateDisparity(userId: string): Observable<ExchangeDisparity[]> {
    return this.httpClient.get<ExchangeDisparity[]>(
      `${this.baseUrl}/users/${userId}/exchange-disparity`,
    );
  }
}
