
export type Currency = 'USD' | 'MYR' | 'SGD';
export type AssetType = 'STOCK' | 'CASH';
export type TransactionType = 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAW';

export interface Transaction {
  id: string;
  type: AssetType;
  transactionType: TransactionType;
  symbol: string; // For CASH, this uses the currency code
  currency: Currency;
  quantity: number;
  price: number; // Buy Price or Sell Price
  date: string;
  fees?: number;
}

export interface DividendRecord {
  id: string;
  stockSymbol: string;
  amount: number;
  currency: Currency;
  date: string;
}

export interface StockPrice {
  symbol: string;
  currentPrice: number;
  currency: Currency;
  dividendYield?: number; // Percentage (e.g. 5.2 for 5.2%)
  lastUpdated: number;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  totalProfitLoss: number;
  totalProfitLossPercentage: number;
  totalDividends: number;
  projectedAnnualDividends: number; // New field
  cashValue: number;
  investedValue: number;
  baseCurrency: Currency;
}

export interface ExchangeRates {
  [key: string]: number;
}

export interface FinancialGoal {
  targetAmount: number;
  monthlyContribution: number;
  expectedAnnualReturn: number; // Percentage
  startAmount?: number; // Snapshot of portfolio when goal started (optional)
}

// Helper for aggregated view
export interface AggregatedHolding {
  symbol: string;
  type: AssetType;
  currency: Currency;
  quantity: number;
  avgPrice: number;
  currentPrice?: number;
  marketValue?: number;
  dividendYield?: number;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  currency: Currency;
}
