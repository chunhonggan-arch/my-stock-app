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
import { Plus, RefreshCw, LineChart, Globe, Coins, List, PieChart as PieIcon, Target, Download, Upload, Settings, Smartphone, X, Terminal, Wifi, QrCode, AlertTriangle, HelpCircle, Laptop, Cloud, PlayCircle, FileKey, FolderUp, CheckCircle2, Code2, ExternalLink, Copy, Github, Server } from 'lucide-react';

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
  
  // Migrating old 'holdings' to 'transactions' if needed, or just starting fresh
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
      const saved = localStorage.getItem('portfolio_transactions');
      if (saved) return JSON.parse(saved);
      
      // Backward compatibility: check for old holdings
      const oldHoldings = localStorage.getItem('portfolio_holdings');
      if (oldHoldings) {
          const parsedOld = JSON.parse(oldHoldings);
          // Convert old Simple Holdings to Buy Transactions
          return parsedOld.map((h: any) => ({
              id: h.id,
              type: h.type,
              transactionType: h.type === 'CASH' ? 'DEPOSIT' : 'BUY',
              symbol: h.symbol,
              currency: h.currency,
              quantity: h.quantity,
              price: h.buyPrice,
              date: h.buyDate
          }));
      }
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
  const [mobileHelpTab, setMobileHelpTab] = useState<'LOCAL' | 'DEPLOY'>('DEPLOY');
  const [deployMethod, setDeployMethod] = useState<'GITHUB' | 'CLOUD' | 'MANUAL'>('GITHUB');
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mobile Guide State
  const [manualIp, setManualIp] = useState('');
  const [manualPort, setManualPort] = useState('3000');

  // --- PERSISTENCE ---
  useEffect(() => { localStorage.setItem('portfolio_transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('portfolio_dividends', JSON.stringify(dividends)); }, [dividends]);
  useEffect(() => { localStorage.setItem('portfolio_goal', JSON.stringify(financialGoal)); }, [financialGoal]);

  // --- DERIVED STATE: AGGREGATED HOLDINGS ---
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
              // Cash logic: Deposit adds, Withdraw subtracts
              if (tx.transactionType === 'DEPOSIT') {
                  h.quantity += tx.quantity;
                  // Avg Price for cash is essentially the FX rate at entry, but simplified to 1 for base logic usually
                  // keeping it simple: cash doesn't really have "avg price" relative to itself
                  h.avgPrice = 1; 
              } else if (tx.transactionType === 'WITHDRAW') {
                  h.quantity -= tx.quantity;
              }
          } else {
              // Stock logic
              if (tx.transactionType === 'BUY') {
                  const totalCost = (h.quantity * h.avgPrice) + (tx.quantity * tx.price);
                  h.quantity += tx.quantity;
                  h.avgPrice = totalCost / h.quantity;
              } else if (tx.transactionType === 'SELL') {
                  h.quantity -= tx.quantity;
                  // Selling doesn't change Avg Price of remaining shares
              }
          }
      });

      // Filter out zero quantity
      return Array.from(map.values()).filter(h => h.quantity > 0.0001);
  }, [transactions]);

  // --- DATA FETCHING ---
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

  // Initial Load
  useEffect(() => {
    // Only fetch if we haven't recently
    if (!lastUpdated) refreshData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- HANDLERS ---
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

  // --- DEMO DATA ---
  const loadDemoData = () => {
      if (confirm("This will add example data to your portfolio. Continue?")) {
          const demoTxs: Transaction[] = [
              { id: uuidv4(), type: 'STOCK', transactionType: 'BUY', symbol: '1155.KL', currency: 'MYR', quantity: 2000, price: 8.50, date: '2023-01-15' }, // Maybank
              { id: uuidv4(), type: 'STOCK', transactionType: 'BUY', symbol: 'AAPL', currency: 'USD', quantity: 15, price: 180.50, date: '2023-06-10' },
              { id: uuidv4(), type: 'STOCK', transactionType: 'BUY', symbol: 'TSLA', currency: 'USD', quantity: 20, price: 210.00, date: '2023-11-20' },
              { id: uuidv4(), type: 'STOCK', transactionType: 'BUY', symbol: 'D05.SI', currency: 'SGD', quantity: 500, price: 32.50, date: '2023-03-05' }, // DBS
              { id: uuidv4(), type: 'CASH', transactionType: 'DEPOSIT', symbol: 'MYR', currency: 'MYR', quantity: 10000, price: 1, date: '2023-01-01' },
          ];
          const demoDivs: DividendRecord[] = [
              { id: uuidv4(), stockSymbol: '1155.KL', amount: 580, currency: 'MYR', date: '2023-10-01' },
              { id: uuidv4(), stockSymbol: 'AAPL', amount: 3.60, currency: 'USD', date: '2023-08-15' }
          ];
          
          setTransactions(prev => [...prev, ...demoTxs]);
          setDividends(prev => [...prev, ...demoDivs]);
          setShowSettings(false);
          setTimeout(() => refreshData(), 500);
      }
  };

  // --- IMPORT / EXPORT ---
  const handleExportData = () => {
      const data = {
          transactions,
          dividends,
          financialGoal,
          timestamp: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock-tracker-backup-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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
              alert('Data imported successfully!');
              setShowSettings(false);
              setTimeout(refreshData, 500);
          } catch (error) {
              alert('Failed to import data. Invalid file format.');
          }
      };
      reader.readAsText(file);
      // Reset input
      e.target.value = '';
  };

  // --- CALCULATIONS ---
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

    // 1. Holdings Value
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

            // Projected Dividends
            if (priceData && priceData.dividendYield) {
                // Yield is % of Price. Annual Div = (Yield/100) * Price * Qty
                const annualDiv = (priceData.dividendYield / 100) * currentPrice * item.quantity;
                projectedAnnualDividends += annualDiv * getRate(priceCurrency, baseCurrency);
            }
        }
    });

    // 2. Historical Dividends
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

  const generatedUrl = `http://${manualIp.trim() || '192.168.x.x'}:${manualPort.trim()}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generatedUrl)}`;

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-600/20">
              <LineChart className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 hidden sm:block">Portfolio Tracker</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
               <Globe className="w-4 h-4 text-slate-500 ml-2" />
               <select 
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value as Currency)}
                  className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer py-1 pl-2 pr-8"
               >
                  <option value="MYR">MYR</option>
                  <option value="USD">USD</option>
                  <option value="SGD">SGD</option>
               </select>
            </div>

            <button 
              onClick={refreshData}
              disabled={isLoading}
              className={`p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-full transition-all ${isLoading ? 'animate-spin' : ''}`}
              title="Refresh Prices"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {/* Mobile Connection Button */}
            <button 
                onClick={() => setShowMobileHelp(true)}
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors relative"
                title="Connect Mobile"
            >
                <Smartphone className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
            </button>

            {/* Settings / Data Button */}
            <div className="relative">
                <button 
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-full"
                    title="Settings"
                >
                    <Settings className="w-5 h-5" />
                </button>
                {showSettings && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
                        <div className="p-2 text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-2 mt-1">Test Data</div>
                        <button 
                            onClick={loadDemoData}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium text-slate-700 border-b border-slate-50"
                        >
                            <PlayCircle className="w-4 h-4 text-indigo-600" /> Load Demo Data
                        </button>

                        <div className="p-2 text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-2 mt-1">Data Backup</div>
                        <button 
                            onClick={handleExportData}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium text-slate-700"
                        >
                            <Download className="w-4 h-4 text-emerald-600" /> Export Data
                        </button>
                        <button 
                            onClick={handleImportClick}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 text-sm font-medium text-slate-700"
                        >
                            <Upload className="w-4 h-4 text-blue-600" /> Import Data
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept=".json" 
                            onChange={handleFileChange} 
                        />
                    </div>
                )}
            </div>
            
            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            <button
              onClick={() => setIsDividendModalOpen(true)}
              className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 px-3 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              <Coins className="w-4 h-4" />
              <span className="hidden sm:inline">Record Div</span>
            </button>

            <button
              onClick={() => setIsStockModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-lg shadow-blue-600/20 text-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Transaction</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-6 mt-2 -mb-px overflow-x-auto">
            <button 
                onClick={() => setActiveTab('PORTFOLIO')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'PORTFOLIO' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <PieIcon className="w-4 h-4" /> Portfolio
            </button>
            <button 
                onClick={() => setActiveTab('TRANSACTIONS')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'TRANSACTIONS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <List className="w-4 h-4" /> Transactions
            </button>
            <button 
                onClick={() => setActiveTab('GOALS')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'GOALS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <Target className="w-4 h-4" /> Goal Tracker
            </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <DashboardStats metrics={metrics} isLoading={isLoading && !lastUpdated} />

        {activeTab === 'PORTFOLIO' && (
            <>
              <MotivationalQuote />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                  
                  {/* New Annual Performance Component */}
                  <AnnualPerformance 
                    transactions={transactions}
                    dividends={dividends}
                    baseCurrency={baseCurrency}
                    rates={exchangeRates}
                  />
              </div>

              <div className="lg:col-span-1 space-y-6">
                  <AllocationChart 
                      holdings={aggregatedHoldings} 
                      prices={prices} 
                      rates={exchangeRates}
                      baseCurrency={baseCurrency}
                  />
                  
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
                      <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wider">FX Rates</h3>
                      <div className="space-y-3">
                          <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500">USD / MYR</span>
                              <span className="font-mono font-bold text-slate-800">{exchangeRates["USD_MYR"]?.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500">SGD / MYR</span>
                              <span className="font-mono font-bold text-slate-800">{exchangeRates["SGD_MYR"]?.toFixed(4)}</span>
                          </div>
                      </div>
                  </div>
              </div>
              </div>
            </>
        )}

        {activeTab === 'TRANSACTIONS' && (
            <TransactionList 
                transactions={transactions} 
                prices={prices}
                onDelete={handleDeleteTransaction}
                rates={exchangeRates}
                baseCurrency={baseCurrency}
            />
        )}

        {activeTab === 'GOALS' && (
            <GoalTracker 
                currentPortfolioValue={metrics.totalValue} 
                baseCurrency={baseCurrency}
                savedGoal={financialGoal}
                onSaveGoal={setFinancialGoal}
            />
        )}

      </main>

      <AddStockModal 
        isOpen={isStockModalOpen} 
        onClose={() => setIsStockModalOpen(false)} 
        onAdd={handleAddTransaction} 
      />

      <AddDividendModal
        isOpen={isDividendModalOpen}
        onClose={() => setIsDividendModalOpen(false)}
        onAdd={handleAddDividend}
        holdings={aggregatedHoldings} // Need aggregated for symbol list
      />
      
      {/* Mobile Connection Guide Modal - REVISED */}
      {showMobileHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl relative overflow-hidden flex flex-col max-h-[90vh]">
             
             {/* Header */}
             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50">
                 <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                     <Smartphone className="w-5 h-5 text-indigo-600" />
                     How to Use on Phone
                 </h2>
                 <button onClick={() => setShowMobileHelp(false)} className="text-slate-400 hover:text-slate-600">
                     <X className="w-5 h-5" />
                 </button>
             </div>

             {/* Tabs */}
             <div className="flex border-b border-slate-100">
                 <button 
                    onClick={() => setMobileHelpTab('DEPLOY')}
                    className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2
                        ${mobileHelpTab === 'DEPLOY' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                     <Cloud className="w-4 h-4" /> Deploy (Internet)
                 </button>
                 <button 
                    onClick={() => setMobileHelpTab('LOCAL')}
                    className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2
                        ${mobileHelpTab === 'LOCAL' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                     <Wifi className="w-4 h-4" /> Local (Home WiFi)
                 </button>
             </div>
             
             {/* Content */}
             <div className="p-0 flex-1 overflow-y-auto">
                {mobileHelpTab === 'DEPLOY' ? (
                    <div className="p-6 space-y-5">
                         {/* Sub Tabs for Deploy Method */}
                         <div className="flex justify-center gap-2 mb-6 bg-slate-100 p-1 rounded-full">
                             <button 
                                onClick={() => setDeployMethod('GITHUB')}
                                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-1 ${deployMethod === 'GITHUB' ? 'bg-white text-slate-800 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                             >
                                 <Github className="w-3 h-3" /> GitHub (Recommended)
                             </button>
                             <button 
                                onClick={() => setDeployMethod('CLOUD')}
                                className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center gap-1 ${deployMethod === 'CLOUD' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                             >
                                 <Code2 className="w-3 h-3" /> Cloud IDE
                             </button>
                         </div>

                         {deployMethod === 'CLOUD' && (
                            <>
                                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                    <h3 className="font-bold text-indigo-800 mb-2 flex items-center gap-2">
                                        <Code2 className="w-4 h-4" />
                                        Zero Install (Easiest for Non-Tech)
                                    </h3>
                                    <p className="text-sm text-indigo-700">
                                        You don't need to download anything. Use a "cloud computer" (StackBlitz) to run the app for you in the browser.
                                    </p>
                                </div>

                                <ol className="list-decimal list-inside space-y-4 text-sm text-slate-700">
                                    <li className="pl-2">
                                        <span className="font-bold block mb-1">1. Open StackBlitz (Vite)</span>
                                        <a href="https://stackblitz.com/fork/vitejs-vite-template-react-ts" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 underline">
                                            Click here to start a new React Project <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </li>
                                    <li className="pl-2">
                                        <span className="font-bold block mb-1">2. Copy Code</span>
                                        <span className="text-xs text-slate-500">Copy the code files from here (AI Studio) into the StackBlitz file explorer.</span>
                                    </li>
                                    <li className="pl-2">
                                        <span className="font-bold block mb-1">3. Install Dependencies</span>
                                        <span className="text-xs text-slate-500">In the "Dependencies" section (bottom left of StackBlitz), type these names one by one and hit enter:</span>
                                        <div className="bg-slate-100 p-2 rounded border border-slate-200 mt-1 font-mono text-xs select-all">
                                            @google/genai <br/>
                                            lucide-react <br/>
                                            recharts <br/>
                                            uuid
                                        </div>
                                    </li>
                                    <li className="pl-2">
                                        <span className="font-bold block mb-1">4. Add API Key</span>
                                        <span className="text-xs text-slate-500">Create a new file named <code>.env</code> and paste:</span>
                                        <div className="bg-slate-800 text-slate-300 p-2 rounded border border-slate-700 mt-1 font-mono text-xs">
                                            VITE_API_KEY=AIzaSy... (Your Key)
                                        </div>
                                        <span className="text-[10px] text-amber-600 italic mt-1 block">Note: In StackBlitz, change `process.env.API_KEY` in the code to `import.meta.env.VITE_API_KEY`.</span>
                                    </li>
                                </ol>
                            </>
                         )}

                         {deployMethod === 'GITHUB' && (
                            <>
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                    <h3 className="font-bold text-emerald-800 mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Standard Method (Best for Long Term)
                                    </h3>
                                    <p className="text-sm text-emerald-700">
                                        Host your app for free on Vercel. No coding required, just clicking.
                                    </p>
                                </div>

                                <ol className="list-decimal list-inside space-y-4 text-sm text-slate-700">
                                    <li className="pl-2">
                                        <span className="font-bold block mb-1 flex items-center gap-2">1. Get the Code <Download className="w-4 h-4"/></span>
                                        <span className="text-xs text-slate-500">Use the "Download" button in AI Studio (top right) to save the project files to your computer. Unzip it.</span>
                                    </li>
                                    <li className="pl-2">
                                        <span className="font-bold block mb-1 flex items-center gap-2">2. Create GitHub Repo <Github className="w-4 h-4"/></span>
                                        <div className="text-xs text-slate-500 mb-1">
                                            Go to <a href="https://github.com/new" target="_blank" className="text-blue-600 underline">github.com/new</a>. Name it (e.g., "my-stock-app").
                                        </div>
                                        <div className="text-xs text-slate-500 bg-slate-100 p-2 rounded">
                                            After creating, click the "uploading an existing file" link. Drag & drop all your unzipped files there and click "Commit changes".
                                        </div>
                                    </li>
                                    <li className="pl-2">
                                        <span className="font-bold block mb-1 flex items-center gap-2">3. Connect to Vercel <Server className="w-4 h-4"/></span>
                                        <div className="text-xs text-slate-500 mb-1">
                                            Go to <a href="https://vercel.com/new" target="_blank" className="text-blue-600 underline">vercel.com/new</a>. Sign up with GitHub.
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            Click "Import" next to your new repository.
                                        </div>
                                    </li>
                                    <li className="pl-2 bg-yellow-50 p-3 rounded border border-yellow-200">
                                        <span className="font-bold text-yellow-800 block mb-1">4. CRITICAL: Add API Key</span>
                                        <span className="text-xs text-yellow-800">
                                            On the Vercel deployment screen, find the <b>"Environment Variables"</b> section.
                                        </span>
                                        <div className="mt-2 grid grid-cols-1 gap-1">
                                            <code className="bg-white px-2 py-1 rounded border text-xs">Key: API_KEY</code>
                                            <code className="bg-white px-2 py-1 rounded border text-xs">Value: AIzaSy... (Your Key)</code>
                                        </div>
                                        <div className="mt-2 text-xs text-yellow-800 font-bold">
                                            Then click "Deploy". Done!
                                        </div>
                                    </li>
                                </ol>
                            </>
                         )}
                    </div>
                ) : (
                    <div className="flex flex-col md:flex-row h-full">
                         <div className="flex-1 p-6 space-y-4 border-r border-slate-100">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                                <b>Requirement:</b> Computer & Phone must be on the <b>Same Wi-Fi</b>.
                            </div>
                            
                            {/* Troubleshooting "npm not recognized" */}
                            <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
                                <h4 className="font-bold text-rose-800 text-xs mb-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> Error: 'npm' is not recognized?
                                </h4>
                                <p className="text-[11px] text-rose-700">
                                    This means you haven't installed <b>Node.js</b>. 
                                    <br/>
                                    <a href="https://nodejs.org" target="_blank" className="underline font-bold">Download & Install Node.js LTS</a>, then restart your terminal.
                                </p>
                            </div>
                            
                            <div>
                                <h4 className="font-bold text-slate-700 text-sm mb-2">Step 1: Start Command</h4>
                                <code className="block bg-slate-800 text-white p-2 rounded text-xs font-mono">
                                    npm run dev -- --host
                                </code>
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-700 text-sm mb-2">Step 2: Enter PC IP</h4>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="e.g. 192.168.0.105"
                                        value={manualIp}
                                        onChange={(e) => setManualIp(e.target.value)}
                                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm font-mono outline-none focus:border-indigo-500"
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="3000"
                                        value={manualPort}
                                        onChange={(e) => setManualPort(e.target.value)}
                                        className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm font-mono outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">
                                    Check terminal for <code>Network: http://...</code>
                                </p>
                            </div>
                         </div>
                         <div className="w-full md:w-64 bg-slate-800 p-6 flex flex-col items-center justify-center">
                             {manualIp ? (
                                 <>
                                    <div className="bg-white p-3 rounded-lg shadow-lg mb-3">
                                        <img src={qrCodeUrl} alt="QR Code" className="w-32 h-32" />
                                    </div>
                                    <p className="text-indigo-300 text-xs text-center">Scan to Connect</p>
                                 </>
                             ) : (
                                 <div className="text-center text-slate-500 text-xs">
                                     <QrCode className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                     Enter IP to generate QR
                                 </div>
                             )}
                         </div>
                    </div>
                )}
             </div>
          </div>
        </div>
      )}
      
      {/* Invisible overlay to close settings when clicking outside */}
      {showSettings && (
          <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)}></div>
      )}
    </div>
  );
};

export default App;