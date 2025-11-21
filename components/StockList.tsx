
import React, { useState, useMemo } from 'react';
import { AggregatedHolding, StockPrice, DividendRecord, Currency, Transaction } from '../types';
import { TrendingUp, TrendingDown, RefreshCw, Wallet, Trash2, ArrowUpDown } from 'lucide-react';

interface StockListProps {
  holdings: AggregatedHolding[];
  dividends: DividendRecord[];
  prices: Record<string, StockPrice>;
  transactions: Transaction[];
  onDeleteDividend: (id: string) => void;
  isRefreshing: boolean;
  baseCurrency: Currency;
  rates: Record<string, number>;
}

type SortKey = 'symbol' | 'quantity' | 'avgPrice' | 'marketValueBase' | 'profitLoss' | 'realizedPL';

export const StockList: React.FC<StockListProps> = ({ 
  holdings, dividends, prices, transactions, onDeleteDividend, isRefreshing, baseCurrency, rates
}) => {
  const [holdingCurrency, setHoldingCurrency] = useState<Currency | 'ALL'>('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'marketValueBase', direction: 'desc' });

  const stocks = holdings.filter(h => h.type === 'STOCK');
  const cash = holdings.filter(h => h.type === 'CASH');

  const getRate = (from: string, to: string): number => {
      if (from === to) return 1;
      return rates[`${from}_${to}`] || 1;
  };

  const CurrencyBadge = ({ currency }: { currency: Currency }) => {
    const colors = { 'USD': 'bg-green-100 text-green-800', 'MYR': 'bg-yellow-100 text-yellow-800', 'SGD': 'bg-indigo-100 text-indigo-800' };
    return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors[currency]}`}>{currency}</span>;
  };

  // Calculations
  const stockData = useMemo(() => {
      const getRealizedData = (symbol: string) => {
          const symbolTxs = transactions.filter(t => t.symbol === symbol && t.type === 'STOCK').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          let realizedGain = 0;
          let tempQty = 0;
          let tempTotalCost = 0;

          symbolTxs.forEach(tx => {
              if (tx.transactionType === 'BUY') {
                  tempTotalCost += (tx.quantity * tx.price);
                  tempQty += tx.quantity;
              } else if (tx.transactionType === 'SELL') {
                  const avgCost = tempQty > 0 ? tempTotalCost / tempQty : 0;
                  realizedGain += (tx.price - avgCost) * tx.quantity;
                  tempQty -= tx.quantity;
                  tempTotalCost -= (avgCost * tx.quantity); 
              }
          });
          return realizedGain; 
      };

      return stocks.map(stock => {
        const currentPriceData = prices[stock.symbol];
        const currentPrice = currentPriceData ? currentPriceData.currentPrice : stock.avgPrice;
        const marketValueBase = (currentPrice * stock.quantity) * getRate(stock.currency, baseCurrency);
        const totalCostBase = (stock.avgPrice * stock.quantity) * getRate(stock.currency, baseCurrency);
        const profitLoss = marketValueBase - totalCostBase;
        const profitLossPercent = totalCostBase > 0 ? (profitLoss / totalCostBase) * 100 : 0;
        const realizedPLBase = getRealizedData(stock.symbol) * getRate(stock.currency, baseCurrency);

        return {
            ...stock,
            currentPrice,
            marketValueBase,
            profitLoss,
            profitLossPercent,
            currentPriceData,
            realizedPLBase
        };
      });
  }, [stocks, prices, baseCurrency, rates, transactions]);

  const filteredStockData = useMemo(() => {
      let data = stockData;
      if (holdingCurrency !== 'ALL') data = stockData.filter(s => s.currency === holdingCurrency);
      return [...data].sort((a, b) => {
          const aValue = a[sortConfig.key];
          const bValue = b[sortConfig.key];
          // @ts-ignore
          const numA = Number(aValue); const numB = Number(bValue);
          return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      });
  }, [stockData, holdingCurrency, sortConfig]);

  const requestSort = (key: SortKey) => {
      let direction: 'asc' | 'desc' = 'desc';
      if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
      setSortConfig({ key, direction });
  };

  if (holdings.length === 0) {
      return <div className="bg-white rounded-xl p-8 text-center border border-slate-100 text-slate-500">No holdings yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-700 text-sm">Holdings</h3>
                {isRefreshing && <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />}
            </div>
            <div className="flex gap-1">
                {['ALL', 'MYR', 'SGD', 'USD'].map((curr) => (
                    <button key={curr} onClick={() => setHoldingCurrency(curr as any)} className={`px-2 py-1 text-[10px] font-bold rounded border ${holdingCurrency === curr ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200'}`}>{curr}</button>
                ))}
            </div>
        </div>

        {/* MOBILE CARD VIEW */}
        <div className="block sm:hidden divide-y divide-slate-100">
            {filteredStockData.map((stock) => {
                const isProfit = stock.profitLoss >= 0;
                return (
                    <div key={stock.symbol} className="p-3">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px]">
                                    {stock.symbol.substring(0, 2)}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800 text-sm flex items-center gap-1">
                                        {stock.symbol}
                                        <CurrencyBadge currency={stock.currency} />
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                        {stock.quantity.toLocaleString()} • {stock.avgPrice.toFixed(2)}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-slate-800 text-sm">
                                    {baseCurrency} {stock.marketValueBase.toLocaleString(undefined, {maximumFractionDigits: 0})}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                    Last: {stock.currentPrice.toFixed(2)}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded">
                             <div className={`flex-1 text-xs font-bold text-center ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                 {isProfit ? '+' : ''}{stock.profitLoss.toLocaleString(undefined, {maximumFractionDigits: 0})} ({stock.profitLossPercent.toFixed(1)}%)
                             </div>
                             <div className="w-px h-3 bg-slate-200"></div>
                             <div className="flex-1 text-[10px] text-center text-slate-500">
                                 Realized: {stock.realizedPLBase > 0 ? '+' : ''}{stock.realizedPLBase.toLocaleString(undefined, {maximumFractionDigits: 0})}
                             </div>
                        </div>
                    </div>
                );
            })}
        </div>

        {/* DESKTOP TABLE VIEW */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium tracking-wider uppercase cursor-pointer">
                <th className="px-4 py-3" onClick={() => requestSort('symbol')}>Stock</th>
                <th className="px-4 py-3 text-right" onClick={() => requestSort('quantity')}>Qty</th>
                <th className="px-4 py-3 text-right" onClick={() => requestSort('avgPrice')}>Avg</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right" onClick={() => requestSort('marketValueBase')}>Value ({baseCurrency})</th>
                <th className="px-4 py-3 text-right" onClick={() => requestSort('profitLoss')}>Unrealized</th>
                <th className="px-4 py-3 text-right">Realized</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStockData.map((stock) => {
                const isProfit = stock.profitLoss >= 0;
                return (
                  <tr key={stock.symbol} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700">
                        {stock.symbol} <span className="text-[10px] text-slate-400 font-normal ml-1">{stock.currency}</span>
                    </td>
                    <td className="px-4 py-3 text-right">{stock.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{stock.avgPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-bold">{stock.currentPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{stock.marketValueBase.toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
                    <td className={`px-4 py-3 text-right font-bold ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {stock.profitLoss.toLocaleString(undefined, { minimumFractionDigits: 0 })} <span className="text-[10px] opacity-75">{stock.profitLossPercent.toFixed(1)}%</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">{stock.realizedPLBase.toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {cash.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
           <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-700 text-sm">Cash</h3>
           </div>
           <div className="divide-y divide-slate-100">
               {cash.map(c => (
                 <div key={c.symbol} className="px-4 py-3 flex justify-between items-center text-sm">
                    <span className="font-bold text-slate-700">{c.symbol}</span>
                    <div className="text-right">
                        <div className="font-bold text-slate-800">{c.quantity.toLocaleString()} {c.currency}</div>
                        <div className="text-[10px] text-slate-400">≈ {baseCurrency} {(c.quantity * getRate(c.currency, baseCurrency)).toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                    </div>
                 </div>
               ))}
           </div>
        </div>
      )}
    </div>
  );
};
