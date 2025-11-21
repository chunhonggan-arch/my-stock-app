
import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Loader2, ChevronDown, Globe } from 'lucide-react';
import { Transaction, Currency, AssetType, TransactionType, StockSearchResult } from '../types';
import { searchStocks } from '../services/geminiService';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
}

export const AddStockModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [assetType, setAssetType] = useState<AssetType>('STOCK');
  const [txnType, setTxnType] = useState<TransactionType>('BUY');
  
  // Stock Search Inputs
  const [symbol, setSymbol] = useState('');
  const [market, setMarket] = useState('US'); // US, MY, SG
  
  // Transaction Details
  const [currency, setCurrency] = useState<Currency>('MYR');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Search State
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close dropdown if clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Set default currency based on market selection
  useEffect(() => {
      if (assetType === 'STOCK') {
          if (market === 'MY') setCurrency('MYR');
          else if (market === 'SG') setCurrency('SGD');
          else setCurrency('USD');
      }
  }, [market, assetType]);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!symbol || symbol.length < 1) return;
    setIsSearching(true);
    setShowDropdown(true);
    const results = await searchStocks(symbol, market);
    setSearchResults(results);
    setIsSearching(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || searchResults.length === 0) {
        if (e.key === 'Enter' && assetType === 'STOCK') {
            e.preventDefault();
            handleSearch();
        }
        return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) {
        selectResult(searchResults[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const selectResult = (result: StockSearchResult) => {
    setSymbol(result.symbol);
    setCurrency(result.currency);
    setShowDropdown(false);
    setSearchResults([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity && price && date) {
      const finalSymbol = assetType === 'CASH' ? currency : symbol.toUpperCase().trim();
      
      if (!finalSymbol) return;

      let finalTxnType = txnType;
      if (assetType === 'CASH') {
          finalTxnType = txnType === 'BUY' ? 'DEPOSIT' : 'WITHDRAW';
      }

      onAdd({
        type: assetType,
        transactionType: finalTxnType,
        symbol: finalSymbol,
        currency,
        quantity: Number(quantity),
        price: Number(price),
        date: date,
      });
      
      // Reset
      setSymbol('');
      setQuantity('');
      setPrice('');
      setAssetType('STOCK');
      setTxnType('BUY');
      setSearchResults([]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-visible">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Record Transaction</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4 relative">
          
          {/* Asset Type Selection */}
          <div className="grid grid-cols-2 gap-4 p-1 bg-slate-100 rounded-lg">
             <button
               type="button"
               onClick={() => setAssetType('STOCK')}
               className={`py-2 rounded-md text-sm font-semibold transition-all ${assetType === 'STOCK' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               Stock
             </button>
             <button
               type="button"
               onClick={() => {
                   setAssetType('CASH');
                   setSymbol('');
                   setSearchResults([]);
                   setShowDropdown(false);
                   if (txnType !== 'BUY' && txnType !== 'SELL') setTxnType('BUY');
               }}
               className={`py-2 rounded-md text-sm font-semibold transition-all ${assetType === 'CASH' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               Cash
             </button>
          </div>

          {/* Transaction Type */}
           <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={txnType === 'BUY'} onChange={() => setTxnType('BUY')} className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-slate-700">{assetType === 'STOCK' ? 'Buy' : 'Deposit'}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={txnType === 'SELL'} onChange={() => setTxnType('SELL')} className="w-4 h-4 text-rose-600" />
                  <span className="text-sm font-medium text-slate-700">{assetType === 'STOCK' ? 'Sell' : 'Withdraw'}</span>
              </label>
           </div>

          {/* Symbol / Search Section */}
          {assetType === 'STOCK' && (
             <div className="relative" ref={dropdownRef}>
               <label className="block text-sm font-medium text-slate-700 mb-1">Stock Symbol</label>
               
               {/* Market Selector & Input Group */}
               <div className="flex gap-2 mb-2">
                  <div className="relative w-1/3">
                    <select
                        value={market}
                        onChange={(e) => setMarket(e.target.value)}
                        className="w-full pl-8 pr-2 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-slate-50 text-sm font-medium appearance-none cursor-pointer"
                    >
                        <option value="US">US</option>
                        <option value="MY">Malaysia</option>
                        <option value="SG">Singapore</option>
                    </select>
                    <Globe className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>

                  <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder={market === 'MY' ? "e.g. 1155 or CIMB" : (market === 'SG' ? "e.g. T6I, C6L, AWZ" : "e.g. TSLA")}
                            value={symbol}
                            onChange={(e) => {
                                setSymbol(e.target.value);
                                if(e.target.value.length === 0) {
                                    setShowDropdown(false);
                                    setSearchResults([]);
                                }
                            }}
                            onKeyDown={handleKeyDown}
                            className="w-full pl-4 pr-10 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none uppercase"
                            required={assetType === 'STOCK'}
                            autoComplete="off"
                        />
                        {isSearching && (
                            <div className="absolute right-3 top-2.5">
                                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                            </div>
                        )}
                        {!isSearching && (
                            <button 
                                type="button"
                                onClick={handleSearch}
                                className="absolute right-1 top-1 bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded-md transition-colors"
                            >
                                <Search className="w-4 h-4" />
                            </button>
                        )}
                  </div>
               </div>
               
               {/* Autocomplete Dropdown */}
               {showDropdown && searchResults.length > 0 && (
                   <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-slate-100 max-h-60 overflow-y-auto">
                       {searchResults.map((res, index) => (
                           <div 
                               key={index}
                               onClick={() => selectResult(res)}
                               className={`px-4 py-3 cursor-pointer border-b border-slate-50 last:border-0 flex justify-between items-center
                                   ${index === selectedIndex ? 'bg-blue-50' : 'hover:bg-slate-50'}
                               `}
                           >
                               <div>
                                   <div className="font-bold text-slate-800">{res.symbol}</div>
                                   <div className="text-xs text-slate-500">{res.name}</div>
                               </div>
                               <div className="text-right">
                                   <div className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">{res.exchange}</div>
                                   <div className="text-[10px] text-slate-400 mt-0.5">{res.currency}</div>
                               </div>
                           </div>
                       ))}
                   </div>
               )}
               {showDropdown && !isSearching && searchResults.length === 0 && symbol.length > 1 && (
                   <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-100 p-3 text-sm text-slate-500 text-center">
                       No results found for "{symbol}" in {market}.
                   </div>
               )}
             </div>
          )}

          {/* Currency & Numbers */}
          <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                <div className="relative">
                    <select 
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none bg-white appearance-none"
                    >
                        <option value="MYR">MYR (RM)</option>
                        <option value="USD">USD ($)</option>
                        <option value="SGD">SGD (S$)</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">
                    {assetType === 'STOCK' ? 'Price / Unit' : 'FX Rate (to Base)'}
                 </label>
                 <input
                    type="number"
                    step="any"
                    placeholder={assetType === 'CASH' ? "1.0" : "0.00"}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                    required
                 />
              </div>
          </div>
          
          <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                  {assetType === 'STOCK' ? 'Quantity' : 'Amount'}
              </label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                required
              />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
              required
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className={`w-full text-white font-bold py-3 rounded-lg transition-all transform active:scale-95 shadow-lg ${txnType === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
            >
              {txnType === 'BUY' ? (assetType === 'STOCK' ? 'Buy Stock' : 'Deposit Cash') : (assetType === 'STOCK' ? 'Sell Stock' : 'Withdraw Cash')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
