import React, { useState } from 'react';
import { X } from 'lucide-react';
import { DividendRecord, AggregatedHolding, Currency } from '../types';

interface AddDividendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (dividend: Omit<DividendRecord, 'id'>) => void;
  holdings: AggregatedHolding[];
}

export const AddDividendModal: React.FC<AddDividendModalProps> = ({ isOpen, onClose, onAdd, holdings }) => {
  const [stockSymbol, setStockSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('MYR');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const stockHoldings = holdings.filter(h => h.type === 'STOCK');
  // Unique symbols
  const symbols = Array.from(new Set(stockHoldings.map(h => h.symbol)));

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (stockSymbol && amount && date) {
      onAdd({
        stockSymbol,
        amount: Number(amount),
        currency,
        date,
      });
      // Reset
      setStockSymbol('');
      setAmount('');
      setCurrency('MYR');
      setDate(new Date().toISOString().split('T')[0]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Record Dividend</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Stock Symbol</label>
            <select
                value={stockSymbol}
                onChange={(e) => setStockSymbol(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-green-500 outline-none bg-white"
                required
            >
                <option value="">Select Stock</option>
                {symbols.map(s => (
                    <option key={s} value={s}>{s}</option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                <input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-green-500 outline-none"
                    required
                />
             </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                <select 
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-green-500 outline-none bg-white"
                >
                  <option value="MYR">MYR</option>
                  <option value="USD">USD</option>
                  <option value="SGD">SGD</option>
                </select>
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date Received</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-green-500 outline-none"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-all mt-4 shadow-lg shadow-emerald-600/20"
          >
            Save Dividend
          </button>
        </form>
      </div>
    </div>
  );
};