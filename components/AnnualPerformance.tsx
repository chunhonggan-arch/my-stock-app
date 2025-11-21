
import React, { useMemo } from 'react';
import { Transaction, DividendRecord, Currency } from '../types';
import { Calendar, TrendingUp, DollarSign, PieChart } from 'lucide-react';

interface AnnualPerformanceProps {
  transactions: Transaction[];
  dividends: DividendRecord[];
  baseCurrency: Currency;
  rates: Record<string, number>;
}

export const AnnualPerformance: React.FC<AnnualPerformanceProps> = ({
  transactions,
  dividends,
  baseCurrency,
  rates
}) => {

  const getRate = (from: string, to: string): number => {
    if (from === to) return 1;
    return rates[`${from}_${to}`] || 1;
  };

  const yearlyStats = useMemo(() => {
    const stats: Record<string, { dividends: number; realizedPL: number; invested: number; transactionCount: number }> = {};

    const getYear = (dateStr: string) => new Date(dateStr).getFullYear().toString();

    // 1. Initialize years from dividends
    dividends.forEach(d => {
      const year = getYear(d.date);
      if (!stats[year]) stats[year] = { dividends: 0, realizedPL: 0, invested: 0, transactionCount: 0 };
      stats[year].dividends += d.amount * getRate(d.currency, baseCurrency);
    });

    // 2. Initialize years from transactions and calculate Realized P/L & Invested Amount
    // We process per stock symbol to track average cost basis correctly
    const stockMap = new Map<string, Transaction[]>();
    transactions.filter(t => t.type === 'STOCK').forEach(t => {
      const year = getYear(t.date);
      if (!stats[year]) stats[year] = { dividends: 0, realizedPL: 0, invested: 0, transactionCount: 0 };
      
      if (!stockMap.has(t.symbol)) stockMap.set(t.symbol, []);
      stockMap.get(t.symbol)!.push(t);
    });

    stockMap.forEach((txs) => {
      // Sort chronologically: Oldest first
      txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let qty = 0;
      let totalCost = 0;

      txs.forEach(tx => {
        const year = getYear(tx.date);
        const txRate = getRate(tx.currency, baseCurrency);
        
        if (tx.transactionType === 'BUY') {
           qty += tx.quantity;
           totalCost += (tx.quantity * tx.price); // Track cost in native currency
           
           // Net Invested: Money Spent (Converted to Base)
           stats[year].invested += (tx.quantity * tx.price * txRate);
           stats[year].transactionCount++;
        } else if (tx.transactionType === 'SELL') {
           // Calculate Gain based on Weighted Average Cost
           const avgCost = qty > 0 ? totalCost / qty : 0;
           const costOfSharesSold = avgCost * tx.quantity;
           const gainNative = (tx.price * tx.quantity) - costOfSharesSold;
           
           stats[year].realizedPL += (gainNative * txRate);

           // Net Invested: Money Returned (Subtract from Invested)
           stats[year].invested -= (tx.quantity * tx.price * txRate);
           
           qty -= tx.quantity;
           totalCost -= costOfSharesSold;
           stats[year].transactionCount++;
        }
      });
    });

    // Convert to array and sort by year descending (newest first)
    return Object.entries(stats)
      .map(([year, data]) => ({ year, ...data }))
      .sort((a, b) => Number(b.year) - Number(a.year));
  }, [transactions, dividends, baseCurrency, rates]);

  if (yearlyStats.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mt-8">
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
         <Calendar className="w-4 h-4 text-slate-500" />
         <h3 className="font-bold text-slate-700">Annual Performance ({baseCurrency})</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
             <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase text-slate-500 font-medium tracking-wider">
               <th className="px-6 py-4">Year</th>
               <th className="px-6 py-4 text-right">Net Stock Purchases</th>
               <th className="px-6 py-4 text-right">Realized P/L</th>
               <th className="px-6 py-4 text-right">Dividends</th>
               <th className="px-6 py-4 text-right">Total Realized Income</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {yearlyStats.map((stat) => {
              const totalIncome = stat.realizedPL + stat.dividends;
              const isPosPL = stat.realizedPL >= 0;
              const isPosIncome = totalIncome >= 0;

              return (
                <tr key={stat.year} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700">{stat.year}</td>
                  
                  {/* Net Invested */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                        <span className="text-slate-700 font-medium">
                            {stat.invested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-400">Capital Deployed</span>
                    </div>
                  </td>

                  {/* Realized P/L */}
                  <td className="px-6 py-4 text-right">
                     <span className={`font-bold ${isPosPL ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPosPL ? '+' : ''}{stat.realizedPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                     </span>
                  </td>

                  {/* Dividends */}
                  <td className="px-6 py-4 text-right">
                     <span className="font-bold text-emerald-600">
                        +{stat.dividends.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                     </span>
                  </td>

                  {/* Total Income (Div + Realized) */}
                  <td className="px-6 py-4 text-right bg-slate-50/50">
                     <div className={`font-bold ${isPosIncome ? 'text-blue-600' : 'text-rose-600'}`}>
                        {isPosIncome ? '+' : ''}{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                     </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="bg-slate-50 p-3 text-xs text-slate-500 border-t border-slate-100 flex items-center gap-2">
          <div className="p-1 bg-blue-100 text-blue-600 rounded-full">
            <TrendingUp className="w-3 h-3" />
          </div>
          <span>"Net Stock Purchases" = (Buy Cost - Sell Proceeds). "Total Realized Income" = Realized P/L + Dividends.</span>
      </div>
    </div>
  );
};
