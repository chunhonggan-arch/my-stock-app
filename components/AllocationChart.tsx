
import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AggregatedHolding, StockPrice, ExchangeRates, Currency, AssetType } from '../types';

interface AllocationChartProps {
  holdings: AggregatedHolding[];
  prices: Record<string, StockPrice>;
  rates: ExchangeRates;
  baseCurrency: Currency;
}

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];

export const AllocationChart: React.FC<AllocationChartProps> = ({ holdings, prices, rates, baseCurrency }) => {
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | Currency>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | AssetType>('ALL');

  if (holdings.length === 0) return null;

  const getRate = (from: string, to: string): number => {
    if (from === to) return 1;
    return rates[`${from}_${to}`] || 1;
  };

  // 1. Prepare Data
  let rawData = holdings.map(item => {
    let value = 0;
    let itemCurrency: Currency = item.currency;
    
    if (item.type === 'CASH') {
        value = item.quantity * getRate(item.currency, baseCurrency);
    } else {
        const priceData = prices[item.symbol];
        const currentPrice = priceData ? priceData.currentPrice : item.avgPrice;
        const priceCurrency = priceData ? priceData.currency : item.currency;
        itemCurrency = priceCurrency; // Use price currency for filtering
        
        value = currentPrice * item.quantity * getRate(priceCurrency, baseCurrency);
    }

    return {
      name: item.symbol,
      value: value,
      type: item.type,
      currency: itemCurrency
    };
  });

  // 2. Filter Data
  if (currencyFilter !== 'ALL') {
      rawData = rawData.filter(d => d.currency === currencyFilter);
  }
  
  if (typeFilter !== 'ALL') {
      rawData = rawData.filter(d => d.type === typeFilter);
  }

  const totalValue = rawData.reduce((sum, item) => sum + item.value, 0);

  // 3. Add Percentage
  const data = rawData.map(item => ({
      ...item,
      percentage: totalValue > 0 ? (item.value / totalValue) * 100 : 0
  })).sort((a, b) => b.value - a.value);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100 h-full flex flex-col">
      <div className="mb-4 space-y-2">
          <h3 className="text-slate-700 font-bold text-sm">Allocation ({baseCurrency})</h3>
          
          <div className="flex flex-wrap gap-2">
              {/* Currency Filters */}
              <div className="flex gap-1 bg-slate-50 p-1 rounded-lg">
                <button onClick={() => setCurrencyFilter('ALL')} className={`text-[10px] px-2 py-1 rounded font-bold ${currencyFilter === 'ALL' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>All</button>
                <button onClick={() => setCurrencyFilter('MYR')} className={`text-[10px] px-2 py-1 rounded font-bold ${currencyFilter === 'MYR' ? 'bg-yellow-100 text-yellow-700' : 'text-slate-500'}`}>MYR</button>
                <button onClick={() => setCurrencyFilter('SGD')} className={`text-[10px] px-2 py-1 rounded font-bold ${currencyFilter === 'SGD' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500'}`}>SGD</button>
                <button onClick={() => setCurrencyFilter('USD')} className={`text-[10px] px-2 py-1 rounded font-bold ${currencyFilter === 'USD' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>USD</button>
              </div>
              
              {/* Type Filters */}
               <div className="flex gap-1 bg-slate-50 p-1 rounded-lg">
                <button onClick={() => setTypeFilter('ALL')} className={`text-[10px] px-2 py-1 rounded font-bold ${typeFilter === 'ALL' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>All</button>
                <button onClick={() => setTypeFilter('STOCK')} className={`text-[10px] px-2 py-1 rounded font-bold ${typeFilter === 'STOCK' ? 'bg-blue-100 text-blue-700' : 'text-slate-500'}`}>Stock</button>
                <button onClick={() => setTypeFilter('CASH')} className={`text-[10px] px-2 py-1 rounded font-bold ${typeFilter === 'CASH' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Cash</button>
              </div>
          </div>
      </div>
      
      <div className="flex-1 min-h-[250px]">
        {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell 
                    key={`cell-${index}`} 
                    fill={entry.type === 'CASH' ? '#10b981' : COLORS[index % COLORS.length]} 
                    strokeWidth={entry.type === 'CASH' ? 2 : 0}
                    stroke="#fff"
                />
              ))}
            </Pie>
            <Tooltip 
                formatter={(value: number, name: string, props: any) => [
                    `${baseCurrency} ${value.toLocaleString(undefined, {minimumFractionDigits: 2})} (${props.payload.percentage.toFixed(1)}%)`, 
                    name
                ]}
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Legend 
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                formatter={(value, entry: any) => {
                    return `${value} (${entry.payload.percentage.toFixed(0)}%)`;
                }}
            />
          </PieChart>
        </ResponsiveContainer>
        ) : (
             <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                 No assets match filters.
             </div>
        )}
      </div>
    </div>
  );
};
