import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { CurrencyBalanceGraphComponent } from './currency-balance-graph/currency-balance-graph.component';
import { HistoricalExchangeRateGraphComponent } from './historical-exchange-rate-graph/historical-exchange-rate-graph.component';
import { ExchangeRateStore } from '../../core/store/exchange-rate.store';

@Component({
  selector: 'app-graph-container',
  imports: [MatCardModule, CurrencyBalanceGraphComponent, HistoricalExchangeRateGraphComponent],
  templateUrl: './graph-container.component.html',
  providers: [ExchangeRateStore],
})
export class GraphContainerComponent {}
