
import React, { useState, useMemo } from 'react';
import { Transaction, StockPrice, Currency, AssetType } from '../types';
import { Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  prices: Record<string, StockPrice>;
  onDelete: (id: string) => void;
  rates: Record<string, number>;
  baseCurrency: Currency;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete, rates, baseCurrency }) => {
  const [filterAsset, setFilterAsset] = useState<'ALL' | AssetType>('ALL');

  const getRate = (from: string, to: string): number => {
      if (from === to) return 1;
      return rates[`${from}_${to}`] || 1;
  };

  const filteredTransactions = useMemo(() => {
      return transactions.filter(t => filterAsset === 'ALL' || t.type === filterAsset)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filterAsset]);

  if (transactions.length === 0) return <div className="p-8 text-center text-slate-500 text-sm">No transactions.</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
           <h3 className="font-bold text-slate-700 text-sm">History</h3>
           <select 
               value={filterAsset}
               onChange={(e) => setFilterAsset(e.target.value as any)}
               className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
           >
               <option value="ALL">All</option>
               <option value="STOCK">Stocks</option>
               <option value="CASH">Cash</option>
           </select>
        </div>

        <div className="divide-y divide-slate-100">
             {filteredTransactions.map((tx) => {
                const isBuy = tx.transactionType === 'BUY' || tx.transactionType === 'DEPOSIT';
                const totalValueInBase = (tx.price * tx.quantity) * getRate(tx.currency, baseCurrency);
                
                return (
                <div key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Mobile Row */}
                    <div className="flex sm:hidden p-3 justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${isBuy ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {isBuy ? <ArrowDownRight className="w-4 h-4"/> : <ArrowUpRight className="w-4 h-4"/>}
                            </div>
                            <div>
                                <div className="font-bold text-slate-800 text-sm">{tx.symbol}</div>
                                <div className="text-[10px] text-slate-400">{new Date(tx.date).toLocaleDateString()} • {tx.transactionType}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-slate-800 text-sm">
                                {baseCurrency} {totalValueInBase.toLocaleString(undefined, {maximumFractionDigits: 0})}
                            </div>
                            <button onClick={() => onDelete(tx.id)} className="text-slate-300 hover:text-rose-500 text-[10px] flex items-center justify-end gap-1 w-full mt-1">
                                <Trash2 className="w-3 h-3" /> Remove
                            </button>
                        </div>
                    </div>

                    {/* Desktop Row */}
                    <div className="hidden sm:flex px-6 py-4 items-center text-sm">
                        <div className="w-24 text-slate-500">{new Date(tx.date).toLocaleDateString()}</div>
                        <div className="w-28 font-bold text-slate-700">{tx.symbol}</div>
                        <div className="w-24"><span className={`text-xs font-bold px-2 py-1 rounded ${isBuy ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{tx.transactionType}</span></div>
                        <div className="flex-1 text-right text-slate-600">{tx.quantity.toLocaleString()} @ {tx.price.toLocaleString()} {tx.currency}</div>
                        <div className="w-32 text-right font-bold text-slate-800">{baseCurrency} {totalValueInBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <div className="w-12 text-right"><button onClick={() => onDelete(tx.id)}><Trash2 className="w-4 h-4 text-slate-300 hover:text-rose-500" /></button></div>
                    </div>
                </div>
                );
            })}
        </div>
    </div>
  );
};
