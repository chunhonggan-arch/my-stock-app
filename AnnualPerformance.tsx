
import React, { useMemo } from 'react';
import { Transaction, DividendRecord, Currency } from '../types';
import { BarChart3 } from 'lucide-react';

interface AnnualPerformanceProps {
  transactions: Transaction[];
  dividends: DividendRecord[];
  baseCurrency: Currency;
  rates: Record<string, number>;
}

export const AnnualPerformance: React.FC<AnnualPerformanceProps> = ({ transactions, dividends, baseCurrency, rates }) => {
  const getRate = (from: string, to: string) => (from === to ? 1 : rates[`${from}_${to}`] || 1);

  const yearlyStats = useMemo(() => {
    const stats: Record<string, { dividends: number; realizedPL: number }> = {};
    dividends.forEach(d => {
      const year = new Date(d.date).getFullYear().toString();
      if (!stats[year]) stats[year] = { dividends: 0, realizedPL: 0 };
      stats[year].dividends += d.amount * getRate(d.currency, baseCurrency);
    });

    transactions.filter(t => t.type === 'STOCK' && t.transactionType === 'SELL').forEach(t => {
       // Simplified realized PL for display logic purposes - ideally matches StockList logic
       const year = new Date(t.date).getFullYear().toString();
       if (!stats[year]) stats[year] = { dividends: 0, realizedPL: 0 };
       // Note: Exact realized PL needs avg cost tracking which is complex in this view, 
       // for now we assume user enters data correctly. 
       // This component acts as a summary.
    });

    return Object.entries(stats).map(([year, data]) => ({ year, ...data })).sort((a, b) => Number(b.year) - Number(a.year));
  }, [transactions, dividends, baseCurrency, rates]);

  if (yearlyStats.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mt-4 sm:mt-8">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
         <BarChart3 className="w-4 h-4 text-slate-500" />
         <h3 className="font-bold text-slate-700 text-sm">Dividends by Year</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {yearlyStats.map((stat) => (
             <div key={stat.year} className="p-3 flex justify-between items-center">
                 <span className="font-bold text-slate-800 text-sm">{stat.year}</span>
                 <div className="flex items-center gap-4">
                     <div className="text-right">
                         <div className="text-[10px] text-slate-400 uppercase">Dividends</div>
                         <div className="text-sm font-bold text-emerald-600">+{stat.dividends.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                     </div>
                 </div>
             </div>
        ))}
      </div>
    </div>
  );
};
