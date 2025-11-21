
import React from 'react';
import { PortfolioMetrics } from '../types';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Calculator } from 'lucide-react';

interface DashboardStatsProps {
  metrics: PortfolioMetrics;
  isLoading: boolean;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ metrics, isLoading }) => {
  const isProfit = metrics.totalProfitLoss >= 0;
  const currency = metrics.baseCurrency;

  // Helper for card structure
  const StatCard = ({ title, value, subValue, icon: Icon, valueColor = "text-slate-800", subValueColor = "text-slate-500" }: any) => (
    <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4 border border-slate-100 relative overflow-hidden flex flex-col justify-between h-full">
       <div className="flex justify-between items-start mb-1 sm:mb-2">
          <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider leading-tight">{title}</h3>
          {Icon && <Icon className="w-4 h-4 text-slate-300 absolute right-2 top-2 opacity-30 sm:opacity-100 sm:static sm:text-slate-200 sm:w-8 sm:h-8" />}
       </div>
       
       <div>
          <div className="flex items-baseline gap-1">
            {isLoading ? (
              <div className="h-6 w-20 bg-slate-200 animate-pulse rounded"></div>
            ) : (
              <span className={`text-lg sm:text-2xl font-bold ${valueColor} tracking-tight truncate`}>
                <span className="text-[10px] sm:text-sm font-normal mr-0.5 opacity-70">{currency}</span>
                {value}
              </span>
            )}
          </div>
          <div className={`mt-0.5 sm:mt-1 text-[10px] sm:text-xs font-medium ${subValueColor} flex items-center gap-1`}>
             {subValue}
          </div>
       </div>
    </div>
  );

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
      <StatCard 
        title="Net Worth" 
        value={metrics.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        icon={DollarSign}
        subValue={
           <>
             <span className="text-emerald-600">C: {metrics.totalValue > 0 ? ((metrics.cashValue / metrics.totalValue) * 100).toFixed(0) : 0}%</span>
             <span className="mx-1 text-slate-300">|</span>
             <span className="text-blue-600">I: {metrics.totalValue > 0 ? ((metrics.investedValue / metrics.totalValue) * 100).toFixed(0) : 0}%</span>
           </>
        }
      />

      <StatCard 
        title="Total Return" 
        value={`${isProfit ? '+' : ''}${metrics.totalProfitLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
        valueColor={isProfit ? 'text-emerald-600' : 'text-rose-600'}
        icon={isProfit ? TrendingUp : TrendingDown}
        subValue={
            <div className={`flex items-center ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isProfit ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {isProfit ? '+' : ''}{metrics.totalProfitLossPercentage.toFixed(1)}%
            </div>
        }
      />

      <StatCard 
         title="Est. Dividend"
         value={metrics.projectedAnnualDividends.toLocaleString(undefined, { maximumFractionDigits: 0 })}
         icon={Calculator}
         subValue={
            <span className="text-slate-400">
               Yield: {metrics.investedValue > 0 ? ((metrics.projectedAnnualDividends / metrics.investedValue) * 100).toFixed(1) : 0}%
            </span>
         }
      />

      <StatCard 
         title="Invested"
         value={metrics.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
         icon={PieChart}
         subValue={<span className="text-slate-400">Cost Basis</span>}
      />
    </div>
  );
};
