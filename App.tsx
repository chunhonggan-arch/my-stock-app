
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Transaction, StockPrice, PortfolioMetrics, DividendRecord, Currency, ExchangeRates, AggregatedHolding, FinancialGoal } from './types';
import { fetchStockPrices, fetchExchangeRates } from './services/geminiService';
import { DashboardStats } from './components/DashboardStats';
import { StockList } from './components/StockList';
import { TransactionList } from './components/TransactionList';
import { AddStockModal } from './components/AddStockModal';
import { AddDividendModal } from './components/AddDividendModal';
import { AllocationChart } from './components/AllocationChart';
import { GoalTracker } from './components/GoalTracker';
import { MotivationalQuote } from './components/MotivationalQuote';
import { AnnualPerformance } from './components/AnnualPerformance';
import { Plus, RefreshCw, LineChart, Globe, Coins, List, PieChart as PieIcon, Target, Download, Upload, Settings, Smartphone, X, PlayCircle } from 'lucide-react';

const INITIAL_RATES: ExchangeRates = {
  "USD_MYR": 4.5, "MYR_USD": 0.22,
  "SGD_MYR": 3.3, "MYR_SGD": 0.30,
  "USD_SGD": 1.35, "SGD_USD": 0.74,
  "MYR_MYR": 1, "USD_USD": 1, "SGD_SGD": 1
};

const App: React.FC = () => {
  // --- STATE ---
  const [baseCurrency, setBaseCurrency] = useState<Currency>('MYR');
  const [activeTab, setActiveTab] = useState<'PORTFOLIO' | 'TRANSACTIONS' | 'GOALS'>('PORTFOLIO');
  
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
      const saved = localStorage.getItem('portfolio_transactions');
      if (saved) return JSON.parse(saved);
      return [];
  });

  const [dividends, setDividends] = useState<DividendRecord[]>(() => {
      const saved = localStorage.getItem('portfolio_dividends');
      return saved ? JSON.parse(saved) : [];
  });

  const [financialGoal, setFinancialGoal] = useState<FinancialGoal | null>(() => {
      const saved = localStorage.getItem('portfolio_goal');
      return saved ? JSON.parse(saved) : null;
  });
  
  const [prices, setPrices] = useState<Record<string, StockPrice>>({});
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(INITIAL_RATES);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState<boolean>(false);
  const [isDividendModalOpen, setIsDividendModalOpen] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showMobileHelp, setShowMobileHelp] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem('portfolio_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('portfolio_dividends', JSON.stringify(dividends)); }, [dividends]);
  useEffect(() => { localStorage.setItem('portfolio_goal', JSON.stringify(financialGoal)); }, [financialGoal]);

  const aggregatedHoldings = useMemo(() => {
      const map = new Map<string, AggregatedHolding>();

      transactions.forEach(tx => {
          if (!map.has(tx.symbol)) {
              map.set(tx.symbol, {
                  symbol: tx.symbol,
                  type: tx.type,
                  currency: tx.currency,
                  quantity: 0,
                  avgPrice: 0
              });
          }
          
          const h = map.get(tx.symbol)!;

          if (tx.type === 'CASH') {
              if (tx.transactionType === 'DEPOSIT') {
                  h.quantity += tx.quantity;
                  h.avgPrice = 1; 
              } else if (tx.transactionType === 'WITHDRAW') {
                  h.quantity -= tx.quantity;
              }
          } else {
              if (tx.transactionType === 'BUY') {
                  const totalCost = (h.quantity * h.avgPrice) + (tx.quantity * tx.price);
                  h.quantity += tx.quantity;
                  h.avgPrice = totalCost / h.quantity;
              } else if (tx.transactionType === 'SELL') {
                  h.quantity -= tx.quantity;
              }
          }
      });

      return Array.from(map.values()).filter(h => h.quantity > 0.0001);
  }, [transactions]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    const stockSymbols = aggregatedHoldings.filter(h => h.type === 'STOCK').map(h => h.symbol);
    
    try {
      const [fetchedPrices, fetchedRates] = await Promise.all([
         stockSymbols.length > 0 ? fetchStockPrices(stockSymbols) : Promise.resolve([]),
         fetchExchangeRates()
      ]);
      
      const priceMap: Record<string, StockPrice> = {};
      fetchedPrices.forEach(p => { priceMap[p.symbol] = p; });
      setPrices(prev => ({ ...prev, ...priceMap }));

      if (fetchedRates) {
        setExchangeRates(prev => ({...prev, ...fetchedRates}));
      }

      setLastUpdated(Date.now());
    } catch (error) {
      console.error("Error updating data", error);
    } finally {
      setIsLoading(false);
    }
  }, [aggregatedHoldings]);

  useEffect(() => {
    if (!lastUpdated) refreshData();
  }, []);

  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const tx: Transaction = { ...newTx, id: uuidv4() };
    setTransactions(prev => [...prev, tx]);
    if(tx.type === 'STOCK') setTimeout(() => refreshData(), 500);
  };

  const handleAddDividend = (newDiv: Omit<DividendRecord, 'id'>) => {
      setDividends(prev => [...prev, { ...newDiv, id: uuidv4() }]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(h => h.id !== id));
  };

  const handleDeleteDividend = (id: string) => {
      setDividends(prev => prev.filter(d => d.id !== id));
  };

  const loadDemoData = () => {
      if (confirm("Add example data?")) {
          const demoTxs: Transaction[] = [
              { id: uuidv4(), type: 'STOCK', transactionType: 'BUY', symbol: '1155.KL', currency: 'MYR', quantity: 2000, price: 8.50, date: '2023-01-15' }, // Maybank
              { id: uuidv4(), type: 'STOCK', transactionType: 'BUY', symbol: 'AAPL', currency: 'USD', quantity: 15, price: 180.50, date: '2023-06-10' },
              { id: uuidv4(), type: 'STOCK', transactionType: 'BUY', symbol: 'TSLA', currency: 'USD', quantity: 20, price: 210.00, date: '2023-11-20' },
              { id: uuidv4(), type: 'STOCK', transactionType: 'BUY', symbol: 'D05.SI', currency: 'SGD', quantity: 500, price: 32.50, date: '2023-03-05' }, // DBS
              { id: uuidv4(), type: 'CASH', transactionType: 'DEPOSIT', symbol: 'MYR', currency: 'MYR', quantity: 10000, price: 1, date: '2023-01-01' },
          ];
          
          setTransactions(prev => [...prev, ...demoTxs]);
          setShowSettings(false);
          setTimeout(() => refreshData(), 500);
      }
  };

  const handleExportData = () => {
      const data = { transactions, dividends, financialGoal, timestamp: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock-tracker-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setShowSettings(false);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (json.transactions) setTransactions(json.transactions);
              if (json.dividends) setDividends(json.dividends);
              if (json.financialGoal) setFinancialGoal(json.financialGoal);
              alert('Imported!');
              setShowSettings(false);
              setTimeout(refreshData, 500);
          } catch (error) {
              alert('Invalid file.');
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  const getRate = (from: string, to: string): number => {
      if (from === to) return 1;
      return exchangeRates[`${from}_${to}`] || 1;
  };

  const calculateMetrics = (): PortfolioMetrics => {
    let totalValue = 0;
    let totalCost = 0;
    let cashValue = 0;
    let investedValue = 0;
    let totalDividends = 0;
    let projectedAnnualDividends = 0;

    aggregatedHoldings.forEach(item => {
        if (item.type === 'CASH') {
            const val = item.quantity * getRate(item.currency, baseCurrency);
            totalValue += val;
            cashValue += val;
        } else {
            const priceData = prices[item.symbol];
            const currentPrice = priceData ? priceData.currentPrice : item.avgPrice;
            const priceCurrency = priceData ? priceData.currency : item.currency;

            const marketVal = currentPrice * item.quantity * getRate(priceCurrency, baseCurrency);
            const costVal = item.avgPrice * item.quantity * getRate(item.currency, baseCurrency);

            totalValue += marketVal;
            investedValue += marketVal;
            totalCost += costVal;

            if (priceData && priceData.dividendYield) {
                const annualDiv = (priceData.dividendYield / 100) * currentPrice * item.quantity;
                projectedAnnualDividends += annualDiv * getRate(priceCurrency, baseCurrency);
            }
        }
    });

    dividends.forEach(div => {
        totalDividends += div.amount * getRate(div.currency, baseCurrency);
    });

    const totalProfitLoss = (investedValue - totalCost) + totalDividends;
    const totalProfitLossPercentage = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

    return {
      totalValue, 
      totalCost,  
      totalProfitLoss,
      totalProfitLossPercentage,
      totalDividends,
      projectedAnnualDividends,
      cashValue,
      investedValue,
      baseCurrency
    };
  };

  const metrics = calculateMetrics();

  return (
    <div className="min-h-screen pb-20 bg-slate-50 font-sans">
      {/* Header - Optimized for Mobile Safe Area */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm safe-area-top">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-600/20">
              <LineChart className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 hidden sm:block">Portfolio</h1>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Currency */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
               <select 
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value as Currency)}
                  className="bg-transparent border-none text-xs font-bold text-slate-700 focus:ring-0 cursor-pointer py-1 pl-1 pr-6"
               >
                  <option value="MYR">MYR</option>
                  <option value="USD">USD</option>
                  <option value="SGD">SGD</option>
               </select>
            </div>

            <button 
              onClick={refreshData}
              disabled={isLoading}
              className={`p-2 text-slate-500 hover:text-blue-600 rounded-full ${isLoading ? 'animate-spin' : ''}`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Settings */}
            <div className="relative">
                <button onClick={() => setShowSettings(!showSettings)} className="p-2 text-slate-500">
                    <Settings className="w-4 h-4" />
                </button>
                {showSettings && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
                        <button onClick={() => setShowMobileHelp(true)} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium text-slate-700 border-b border-slate-50">
                            <Smartphone className="w-4 h-4 text-indigo-600" /> Mobile Guide
                        </button>
                        <button onClick={loadDemoData} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium text-slate-700 border-b border-slate-50">
                            <PlayCircle className="w-4 h-4 text-indigo-600" /> Load Demo
                        </button>
                        <button onClick={handleExportData} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Download className="w-4 h-4 text-emerald-600" /> Backup
                        </button>
                        <button onClick={handleImportClick} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium text-slate-700">
                            <Upload className="w-4 h-4 text-blue-600" /> Restore
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
                    </div>
                )}
            </div>
            
            <div className="h-5 w-px bg-slate-200 mx-1"></div>

            {/* Add Buttons */}
            <button onClick={() => setIsDividendModalOpen(true)} className="bg-slate-100 text-slate-600 w-8 h-8 rounded-lg flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </button>
            <button onClick={() => setIsStockModalOpen(true)} className="bg-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex gap-4 mt-1 -mb-px overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('PORTFOLIO')} className={`pb-2 px-1 border-b-2 text-xs font-bold flex items-center gap-1.5 ${activeTab === 'PORTFOLIO' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>
                <PieIcon className="w-3 h-3" /> Portfolio
            </button>
            <button onClick={() => setActiveTab('TRANSACTIONS')} className={`pb-2 px-1 border-b-2 text-xs font-bold flex items-center gap-1.5 ${activeTab === 'TRANSACTIONS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>
                <List className="w-3 h-3" /> History
            </button>
            <button onClick={() => setActiveTab('GOALS')} className={`pb-2 px-1 border-b-2 text-xs font-bold flex items-center gap-1.5 ${activeTab === 'GOALS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>
                <Target className="w-3 h-3" /> Goals
            </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4">
        
        <DashboardStats metrics={metrics} isLoading={isLoading && !lastUpdated} />

        {activeTab === 'PORTFOLIO' && (
            <>
              <div className="hidden sm:block"><MotivationalQuote /></div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <StockList 
                        holdings={aggregatedHoldings} 
                        dividends={dividends}
                        prices={prices} 
                        transactions={transactions}
                        onDeleteDividend={handleDeleteDividend}
                        isRefreshing={isLoading}
                        baseCurrency={baseCurrency}
                        rates={exchangeRates}
                    />
                    <AnnualPerformance transactions={transactions} dividends={dividends} baseCurrency={baseCurrency} rates={exchangeRates} />
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <div className="h-[250px] sm:h-auto">
                        <AllocationChart holdings={aggregatedHoldings} prices={prices} rates={exchangeRates} baseCurrency={baseCurrency} />
                    </div>
                </div>
              </div>
            </>
        )}

        {activeTab === 'TRANSACTIONS' && (
            <TransactionList transactions={transactions} prices={prices} onDelete={handleDeleteTransaction} rates={exchangeRates} baseCurrency={baseCurrency} />
        )}

        {activeTab === 'GOALS' && (
            <GoalTracker currentPortfolioValue={metrics.totalValue} baseCurrency={baseCurrency} savedGoal={financialGoal} onSaveGoal={setFinancialGoal} />
        )}

      </main>

      <AddStockModal isOpen={isStockModalOpen} onClose={() => setIsStockModalOpen(false)} onAdd={handleAddTransaction} />
      <AddDividendModal isOpen={isDividendModalOpen} onClose={() => setIsDividendModalOpen(false)} onAdd={handleAddDividend} holdings={aggregatedHoldings} />
      
      {showMobileHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-6">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm text-center">
             <Smartphone className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
             <h2 className="text-lg font-bold mb-2">Mobile Access</h2>
             <p className="text-sm text-slate-500 mb-4">Scan this code or open the URL on your phone.</p>
             <div className="bg-white p-2 border inline-block rounded mb-4">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.href)}`} alt="QR Code" />
             </div>
             <button onClick={() => setShowMobileHelp(false)} className="w-full py-2 bg-slate-100 text-slate-700 font-bold rounded">Close</button>
          </div>
        </div>
      )}
      
      {showSettings && <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)}></div>}
    </div>
  );
};

export default App;
