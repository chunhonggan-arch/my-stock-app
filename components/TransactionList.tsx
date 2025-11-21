
import React, { useState, useMemo } from 'react';
import { Transaction, StockPrice, Currency, AssetType } from '../types';
import { Trash2, ArrowUpRight, ArrowDownRight, Filter, Wallet } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  prices: Record<string, StockPrice>;
  onDelete: (id: string) => void;
  rates: Record<string, number>;
  baseCurrency: Currency;
}

export const TransactionList: React.FC<TransactionListProps> = ({ 
  transactions, 
  prices, 
  onDelete,
  rates,
  baseCurrency
}) => {
  const [filterAsset, setFilterAsset] = useState<'ALL' | AssetType>('ALL');
  const [filterSymbol, setFilterSymbol] = useState<string>('ALL');
  
  const getRate = (from: string, to: string): number => {
      if (from === to) return 1;
      return rates[`${from}_${to}`] || 1;
  };

  // Extract unique symbols for filter dropdown
  const uniqueSymbols = useMemo(() => {
      const symbols = new Set<string>();
      transactions.forEach(t => {
          if (t.type === 'STOCK') symbols.add(t.symbol);
      });
      return Array.from(symbols).sort();
  }, [transactions]);

  // Filter and Sort
  const filteredTransactions = useMemo(() => {
      return transactions.filter(t => {
          const matchesAsset = filterAsset === 'ALL' || t.type === filterAsset;
          const matchesSymbol = filterSymbol === 'ALL' || t.symbol === filterSymbol;
          return matchesAsset && matchesSymbol;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filterAsset, filterSymbol]);

  if (transactions.length === 0) {
    return <div className="p-8 text-center text-slate-500">No transactions found.</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        
        {/* Header & Filters */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <h3 className="font-bold text-slate-700">Transaction History</h3>
           
           <div className="flex items-center gap-2">
               <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                   <Filter className="w-4 h-4 text-slate-400" />
                   <select 
                       value={filterAsset}
                       onChange={(e) => {
                           setFilterAsset(e.target.value as 'ALL' | AssetType);
                           setFilterSymbol('ALL'); // Reset symbol filter when changing asset type
                       }}
                       className="text-sm font-medium text-slate-600 outline-none bg-transparent cursor-pointer"
                   >
                       <option value="ALL">All Assets</option>
                       <option value="STOCK">Stocks</option>
                       <option value="CASH">Cash</option>
                   </select>
               </div>

               {filterAsset !== 'CASH' && (
                   <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                       <span className="text-xs font-bold text-slate-400 uppercase">Symbol:</span>
                       <select 
                           value={filterSymbol}
                           onChange={(e) => setFilterSymbol(e.target.value)}
                           className="text-sm font-medium text-slate-600 outline-none bg-transparent cursor-pointer max-w-[100px]"
                       >
                           <option value="ALL">All</option>
                           {uniqueSymbols.map(s => (
                               <option key={s} value={s}>{s}</option>
                           ))}
                       </select>
                   </div>
               )}
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-medium tracking-wider">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Asset</th>
                <th className="px-6 py-4 text-right">Price</th>
                <th className="px-6 py-4 text-right">Qty</th>
                <th className="px-6 py-4 text-right">Total ({baseCurrency})</th>
                <th className="px-6 py-4 text-right">Current P/L</th>
                <th className="px-6 py-4 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => {
                    const isStock = tx.type === 'STOCK';
                    const isBuy = tx.transactionType === 'BUY';
                    const isDeposit = tx.transactionType === 'DEPOSIT';
                    
                    // Calculations for P/L
                    let profitLoss = 0;
                    let profitLossPercent = 0;
                    
                    if (isStock && isBuy) {
                        const currentPriceData = prices[tx.symbol];
                        if (currentPriceData) {
                            const currentPriceConverted = currentPriceData.currentPrice * getRate(currentPriceData.currency, baseCurrency);
                            const buyPriceConverted = tx.price * getRate(tx.currency, baseCurrency);
                            
                            const marketValue = currentPriceConverted * tx.quantity;
                            const costValue = buyPriceConverted * tx.quantity;
                            
                            profitLoss = marketValue - costValue;
                            profitLossPercent = (profitLoss / costValue) * 100;
                        }
                    }

                    const totalValueInBase = (tx.price * tx.quantity) * getRate(tx.currency, baseCurrency);
                    const isProfitable = profitLoss >= 0;

                    return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors text-sm">
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {new Date(tx.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold
                            ${isBuy || isDeposit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}
                        `}>
                            {isBuy || isDeposit ? <ArrowDownRight className="w-3 h-3"/> : <ArrowUpRight className="w-3 h-3"/>}
                            {tx.transactionType}
                        </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">
                        {tx.symbol}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600">
                        <span className="text-[10px] text-slate-400 mr-1">{tx.currency}</span>
                        {tx.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right font-mono">
                        {tx.quantity.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-800">
                        {totalValueInBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right">
                        {(isStock && isBuy) ? (
                            <div className={`flex flex-col items-end ${isProfitable ? 'text-emerald-600' : 'text-rose-600'}`}>
                                <span className="font-bold">{isProfitable ? '+' : ''}{profitLoss.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                                <span className="text-[10px]">{isProfitable ? '+' : ''}{profitLossPercent.toFixed(1)}%</span>
                            </div>
                        ) : (
                            <span className="text-slate-300">-</span>
                        )}
                        </td>
                        <td className="px-6 py-4 text-center">
                        <button
                            onClick={() => onDelete(tx.id)}
                            className="text-slate-300 hover:text-rose-500 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                        </td>
                    </tr>
                    );
                })
              ) : (
                  <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                          No transactions match your filter.
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
  );
};
