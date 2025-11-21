import React from 'react';
import { PortfolioMetrics } from '../types';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Coins, Calculator } from 'lucide-react';

interface DashboardStatsProps {
  metrics: PortfolioMetrics;
  isLoading: boolean;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ metrics, isLoading }) => {
  const isProfit = metrics.totalProfitLoss >= 0;
  const currency = metrics.baseCurrency;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      
      {/* Total Value Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
           <DollarSign className="w-16 h-16 text-blue-600" />
        </div>
        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Net Worth</h3>
        <div className="flex items-end gap-2">
          {isLoading ? (
            <div className="h-8 w-32 bg-slate-200 animate-pulse rounded"></div>
          ) : (
            <span className="text-2xl font-bold text-slate-800">
              <span className="text-sm text-slate-400 mr-1">{currency}</span>
              {metrics.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
           <span className="font-semibold text-emerald-600">Cash: {metrics.totalValue > 0 ? ((metrics.cashValue / metrics.totalValue) * 100).toFixed(1) : 0}%</span>
           <span>•</span>
           <span className="font-semibold text-blue-600">Inv: {metrics.totalValue > 0 ? ((metrics.investedValue / metrics.totalValue) * 100).toFixed(1) : 0}%</span>
        </div>
      </div>

      {/* Profit/Loss Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Return</h3>
        <div className="flex items-end gap-2">
           {isLoading ? (
            <div className="h-8 w-32 bg-slate-200 animate-pulse rounded"></div>
          ) : (
            <div className="flex flex-col">
                <div className={`text-2xl font-bold ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {isProfit ? '+' : ''}{metrics.totalProfitLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
            </div>
          )}
        </div>
        <div className={`text-xs font-semibold mt-2 ${isProfit ? 'text-emerald-600' : 'text-rose-600'} flex items-center gap-1`}>
             {isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
             {isProfit ? '+' : ''}{metrics.totalProfitLossPercentage.toFixed(2)}% All Time
        </div>
      </div>

      {/* Dividends Projection Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Projected Annual Div</h3>
        <div className="flex items-end gap-2">
             <span className="text-2xl font-bold text-slate-800">
              <span className="text-sm text-slate-400 mr-1">{currency}</span>
              {metrics.projectedAnnualDividends.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
        </div>
        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
           <Calculator className="w-3 h-3" />
           <span>Based on curr. yield</span>
        </div>
      </div>

      {/* Invested Capital */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Invested Capital</h3>
        <div className="flex items-end gap-2">
             <span className="text-2xl font-bold text-slate-800">
              <span className="text-sm text-slate-400 mr-1">{currency}</span>
              {metrics.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
        </div>
        <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
            <PieChart className="w-3 h-3" />
            <span>Excluding Cash</span>
        </div>
      </div>
    </div>
  );
};