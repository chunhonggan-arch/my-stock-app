
import React, { useState, useMemo } from 'react';
import { AggregatedHolding, StockPrice, DividendRecord, Currency, Transaction } from '../types';
import { TrendingUp, RefreshCw, Wallet, Trash2, Filter, Calendar, ArrowUpDown } from 'lucide-react';

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
  holdings, 
  dividends,
  prices, 
  transactions,
  onDeleteDividend,
  isRefreshing,
  baseCurrency,
  rates
}) => {
  
  // Filters
  const [holdingCurrency, setHoldingCurrency] = useState<Currency | 'ALL'>('ALL');
  
  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
      key: 'marketValueBase',
      direction: 'desc'
  });
  
  const [divYear, setDivYear] = useState<string>('ALL');
  const [divMonth, setDivMonth] = useState<string>('ALL');
  const [divStock, setDivStock] = useState<string>('ALL');

  const stocks = holdings.filter(h => h.type === 'STOCK');
  const cash = holdings.filter(h => h.type === 'CASH');

  const getRate = (from: string, to: string): number => {
      if (from === to) return 1;
      return rates[`${from}_${to}`] || 1;
  };

  const CurrencyBadge = ({ currency }: { currency: Currency }) => {
    const colors = {
      'USD': 'bg-green-100 text-green-800',
      'MYR': 'bg-yellow-100 text-yellow-800',
      'SGD': 'bg-indigo-100 text-indigo-800'
    };
    return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors[currency]}`}>{currency}</span>;
  };

  // --- Calculated Stock Data for Table ---
  const stockData = useMemo(() => {
      // Helper to calculate realized P/L from Sells + Dividends
      const getRealizedData = (symbol: string, currency: Currency) => {
          const symbolTxs = transactions.filter(t => t.symbol === symbol && t.type === 'STOCK').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          let realizedGain = 0;
          
          // Simple FIFO/Weighted Avg logic for tracking cost basis to find realized gain on sell
          // Since the app uses Weighted Avg for holding, we will use Weighted Avg for sells too
          let tempQty = 0;
          let tempTotalCost = 0;

          symbolTxs.forEach(tx => {
              if (tx.transactionType === 'BUY') {
                  tempTotalCost += (tx.quantity * tx.price);
                  tempQty += tx.quantity;
              } else if (tx.transactionType === 'SELL') {
                  const avgCost = tempQty > 0 ? tempTotalCost / tempQty : 0;
                  const gain = (tx.price - avgCost) * tx.quantity;
                  realizedGain += gain;
                  
                  tempQty -= tx.quantity;
                  tempTotalCost -= (avgCost * tx.quantity); // Remove cost of sold shares
              }
          });

          // Add Dividends
          const symbolDivs = dividends.filter(d => d.stockSymbol === symbol);
          const totalDivs = symbolDivs.reduce((acc, d) => acc + d.amount, 0);
          
          return {
              realizedGain,
              totalDivs,
              totalRealized: realizedGain + totalDivs
          };
      };

      return stocks.map(stock => {
        const currentPriceData = prices[stock.symbol];
        const currentPrice = currentPriceData ? currentPriceData.currentPrice : stock.avgPrice;
        const displayCurrency = stock.currency;
        
        const avgCostBase = stock.avgPrice * getRate(stock.currency, baseCurrency);
        const currentPriceBase = currentPrice * getRate(stock.currency, baseCurrency);
        
        const marketValueBase = currentPriceBase * stock.quantity;
        const totalCostBase = avgCostBase * stock.quantity;
        
        const profitLoss = marketValueBase - totalCostBase;
        const profitLossPercent = totalCostBase > 0 ? (profitLoss / totalCostBase) * 100 : 0;

        // Calculate Realized
        const realizedData = getRealizedData(stock.symbol, stock.currency);
        const realizedPLBase = realizedData.totalRealized * getRate(stock.currency, baseCurrency);

        return {
            ...stock,
            currentPrice,
            displayCurrency,
            marketValueBase,
            profitLoss,
            profitLossPercent,
            currentPriceData,
            realizedPLBase
        };
      });
  }, [stocks, prices, baseCurrency, rates, transactions, dividends]);

  // Filter filteredStockData based on Currency/Region
  const filteredStockData = useMemo(() => {
      let data = stockData;
      if (holdingCurrency !== 'ALL') {
          data = stockData.filter(s => s.currency === holdingCurrency);
      }

      // Sort Data
      return [...data].sort((a, b) => {
          const aValue = a[sortConfig.key];
          const bValue = b[sortConfig.key];
          
          // Handle strings (symbol) vs numbers
          if (typeof aValue === 'string' && typeof bValue === 'string') {
              return sortConfig.direction === 'asc' 
                  ? aValue.localeCompare(bValue) 
                  : bValue.localeCompare(aValue);
          }
          
          // Handle numbers
          const numA = Number(aValue);
          const numB = Number(bValue);
          return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      });
  }, [stockData, holdingCurrency, sortConfig]);

  // Calculate totals for the FILTERED list
  const totalStockValue = filteredStockData.reduce((acc, s) => acc + s.marketValueBase, 0);
  const totalStockPL = filteredStockData.reduce((acc, s) => acc + s.profitLoss, 0);
  const totalStockRealizedPL = filteredStockData.reduce((acc, s) => acc + s.realizedPLBase, 0);

  const totalStockCost = filteredStockData.reduce((acc, s) => acc + (s.avgPrice * s.quantity * getRate(s.currency, baseCurrency)), 0);
  const totalStockPLPercent = totalStockCost > 0 ? (totalStockPL / totalStockCost) * 100 : 0;

  // Sorting Handler
  const requestSort = (key: SortKey) => {
      let direction: 'asc' | 'desc' = 'desc';
      if (sortConfig.key === key && sortConfig.direction === 'desc') {
          direction = 'asc';
      }
      setSortConfig({ key, direction });
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
      if (sortConfig.key !== column) return <ArrowUpDown className="w-3 h-3 opacity-20 inline ml-1" />;
      return <ArrowUpDown className={`w-3 h-3 inline ml-1 ${sortConfig.direction === 'asc' ? 'transform rotate-180' : ''} text-blue-600`} />;
  };

  // --- Dividend Filtering Logic ---
  const uniqueYears = useMemo(() => Array.from(new Set(dividends.map(d => new Date(d.date).getFullYear()))).sort((a: number, b: number) => b - a), [dividends]);
  const uniqueStocks = useMemo(() => Array.from(new Set(dividends.map(d => d.stockSymbol))).sort(), [dividends]);
  const months = [
      {val: '1', name: 'Jan'}, {val: '2', name: 'Feb'}, {val: '3', name: 'Mar'}, 
      {val: '4', name: 'Apr'}, {val: '5', name: 'May'}, {val: '6', name: 'Jun'},
      {val: '7', name: 'Jul'}, {val: '8', name: 'Aug'}, {val: '9', name: 'Sep'}, 
      {val: '10', name: 'Oct'}, {val: '11', name: 'Nov'}, {val: '12', name: 'Dec'}
  ];

  const filteredDividends = useMemo(() => {
      return dividends.filter(d => {
         const dDate = new Date(d.date);
         const matchYear = divYear === 'ALL' || dDate.getFullYear().toString() === divYear;
         const matchMonth = divMonth === 'ALL' || (dDate.getMonth() + 1).toString() === divMonth;
         const matchStock = divStock === 'ALL' || d.stockSymbol === divStock;
         return matchYear && matchMonth && matchStock;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dividends, divYear, divMonth, divStock]);

  const totalFilteredDividends = filteredDividends.reduce((acc, d) => acc + (d.amount * getRate(d.currency, baseCurrency)), 0);


  if (holdings.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-slate-100">
          <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">Portfolio Empty</h3>
          <p className="text-slate-500">Add transactions to start tracking.</p>
        </div>
      );
  }

  return (
    <div className="space-y-8">
      
      {/* STOCK SECTION */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-700">Current Holdings</h3>
                {isRefreshing && <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />}
            </div>
            
            {/* Currency/Region Filter */}
            <div className="flex bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                <button 
                   onClick={() => setHoldingCurrency('ALL')}
                   className={`px-3 py-1 text-xs font-bold rounded transition-colors ${holdingCurrency === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                   ALL
                </button>
                <button 
                   onClick={() => setHoldingCurrency('MYR')}
                   className={`px-3 py-1 text-xs font-bold rounded transition-colors ${holdingCurrency === 'MYR' ? 'bg-yellow-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                   MYR
                </button>
                <button 
                   onClick={() => setHoldingCurrency('SGD')}
                   className={`px-3 py-1 text-xs font-bold rounded transition-colors ${holdingCurrency === 'SGD' ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                   SGD
                </button>
                <button 
                   onClick={() => setHoldingCurrency('USD')}
                   className={`px-3 py-1 text-xs font-bold rounded transition-colors ${holdingCurrency === 'USD' ? 'bg-emerald-500 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                   USD
                </button>
            </div>
        </div>

        {filteredStockData.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-medium tracking-wider cursor-pointer select-none">
                <th className="px-6 py-4" onClick={() => requestSort('symbol')}>
                    Stock <SortIcon column="symbol" />
                </th>
                <th className="px-6 py-4 text-right" onClick={() => requestSort('quantity')}>
                    Qty <SortIcon column="quantity" />
                </th>
                <th className="px-6 py-4 text-right" onClick={() => requestSort('avgPrice')}>
                    Avg Cost <SortIcon column="avgPrice" />
                </th>
                <th className="px-6 py-4 text-right">Current</th>
                <th className="px-6 py-4 text-right" onClick={() => requestSort('marketValueBase')}>
                    Value ({baseCurrency}) <SortIcon column="marketValueBase" />
                </th>
                <th className="px-6 py-4 text-right" onClick={() => requestSort('profitLoss')}>
                    Unrealized P/L <SortIcon column="profitLoss" />
                </th>
                <th className="px-6 py-4 text-right" onClick={() => requestSort('realizedPL')}>
                    Realized P/L (inc. Div) <SortIcon column="realizedPL" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStockData.map((stock) => {
                const isProfit = stock.profitLoss >= 0;
                const isRealizedProfit = stock.realizedPLBase >= 0;
                return (
                  <tr key={stock.symbol} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs mr-3">
                          {stock.symbol.substring(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-2">
                            {stock.symbol}
                            <CurrencyBadge currency={stock.currency} />
                          </div>
                          {stock.currentPriceData?.dividendYield ? (
                              <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Div Yield: {stock.currentPriceData.dividendYield}%</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600 font-medium">
                      {stock.quantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600">
                      <span className="text-xs text-slate-400 mr-1">{stock.displayCurrency}</span>
                      {stock.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`font-bold ${stock.currentPriceData ? 'text-slate-800' : 'text-slate-400'}`}>
                          {stock.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800">
                      {stock.marketValueBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    
                    {/* Unrealized P/L */}
                    <td className="px-6 py-4 text-right">
                      <div className={`flex flex-col items-end ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                        <span className="font-bold flex items-center gap-1">
                          {isProfit ? '+' : ''}{stock.profitLoss.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs font-medium bg-opacity-10 px-1.5 py-0.5 rounded">
                           {isProfit ? '+' : ''}{stock.profitLossPercent.toFixed(2)}%
                        </span>
                      </div>
                    </td>

                    {/* Realized P/L */}
                    <td className="px-6 py-4 text-right">
                         <span className={`font-bold ${isRealizedProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                             {isRealizedProfit ? '+' : ''}{stock.realizedPLBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                         </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* TOTAL FOOTER ROW */}
            <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-800 text-xs sm:text-sm">
                <tr>
                    <td className="px-6 py-4" colSpan={4}>TOTAL {holdingCurrency !== 'ALL' ? `(${holdingCurrency})` : ''}</td>
                    <td className="px-6 py-4 text-right">{totalStockValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="px-6 py-4 text-right">
                         <div className={`flex flex-col items-end ${totalStockPL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            <span>{totalStockPL >= 0 ? '+' : ''}{totalStockPL.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            <span className="text-xs">{totalStockPL >= 0 ? '+' : ''}{totalStockPLPercent.toFixed(2)}%</span>
                         </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <span className={`${totalStockRealizedPL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {totalStockRealizedPL >= 0 ? '+' : ''}{totalStockRealizedPL.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </span>
                    </td>
                </tr>
            </tfoot>
          </table>
        </div>
        ) : (
            <div className="p-8 text-center text-slate-400 text-sm">No stocks found for {holdingCurrency}.</div>
        )}
      </div>

      {/* CASH SECTION */}
      {cash.length > 0 && (holdingCurrency === 'ALL' || holdingCurrency === baseCurrency) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
           <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-700">Cash Holdings</h3>
           </div>
           <table className="w-full text-left">
             <tbody className="divide-y divide-slate-100">
               {cash.map(c => (
                 <tr key={c.symbol} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-700">{c.symbol}</td>
                    <td className="px-6 py-4 text-right">{c.quantity.toLocaleString()} <span className="text-xs text-slate-400">{c.currency}</span></td>
                    <td className="px-6 py-4 text-right text-slate-400 text-sm">
                        {/* Value in Base Currency */}
                        ≈ {baseCurrency} {(c.quantity * getRate(c.currency, baseCurrency)).toLocaleString(undefined, {maximumFractionDigits: 0})}
                    </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      )}

      {/* DIVIDEND SECTION */}
      {dividends.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
           <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-bold text-slate-700">Dividend History</h3>
              
              {/* FILTERS */}
              <div className="flex flex-wrap items-center gap-2">
                  
                  {/* Year Filter */}
                  <div className="relative">
                      <select 
                         value={divYear} 
                         onChange={(e) => setDivYear(e.target.value)}
                         className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 focus:border-blue-500 outline-none appearance-none cursor-pointer"
                      >
                          <option value="ALL">All Years</option>
                          {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  </div>

                  {/* Month Filter */}
                  <div className="relative">
                      <select 
                         value={divMonth} 
                         onChange={(e) => setDivMonth(e.target.value)}
                         className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 focus:border-blue-500 outline-none cursor-pointer"
                      >
                          <option value="ALL">All Months</option>
                          {months.map(m => <option key={m.val} value={m.val}>{m.name}</option>)}
                      </select>
                  </div>

                   {/* Stock Filter */}
                   <div className="relative">
                      <select 
                         value={divStock} 
                         onChange={(e) => setDivStock(e.target.value)}
                         className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 focus:border-blue-500 outline-none appearance-none cursor-pointer max-w-[120px]"
                      >
                          <option value="ALL">All Stocks</option>
                          {uniqueStocks.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  </div>
              </div>
           </div>
           
           <table className="w-full text-left">
             <tbody className="divide-y divide-slate-100">
                {filteredDividends.length > 0 ? (
                    filteredDividends.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/50 text-sm">
                        <td className="px-6 py-3 font-medium text-slate-700">{d.stockSymbol}</td>
                        <td className="px-6 py-3 text-slate-500">{new Date(d.date).toLocaleDateString()}</td>
                        <td className="px-6 py-3 text-right font-bold text-emerald-600">
                            <span className="text-[10px] text-emerald-400 mr-1">{d.currency}</span>
                            +{d.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-3 text-right w-10">
                        <button onClick={() => onDeleteDividend(d.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-3 h-3"/></button>
                        </td>
                    </tr>
                    ))
                ) : (
                    <tr><td colSpan={4} className="p-6 text-center text-slate-400 text-sm">No dividends found matching filters.</td></tr>
                )}
             </tbody>
             {filteredDividends.length > 0 && (
                 <tfoot className="bg-slate-50 text-sm font-bold text-slate-700">
                     <tr>
                         <td className="px-6 py-3" colSpan={2}>Total ({baseCurrency})</td>
                         <td className="px-6 py-3 text-right text-emerald-700">+{totalFilteredDividends.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                         <td></td>
                     </tr>
                 </tfoot>
             )}
           </table>
        </div>
      )}
    </div>
  );
};
