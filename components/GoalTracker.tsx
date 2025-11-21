import React, { useState, useEffect } from 'react';
import { FinancialGoal, Currency } from '../types';
import { Target, Save, Calculator } from 'lucide-react';

interface GoalTrackerProps {
  currentPortfolioValue: number;
  baseCurrency: Currency;
  savedGoal: FinancialGoal | null;
  onSaveGoal: (goal: FinancialGoal) => void;
}

export const GoalTracker: React.FC<GoalTrackerProps> = ({ currentPortfolioValue, baseCurrency, savedGoal, onSaveGoal }) => {
  const [targetAmount, setTargetAmount] = useState(savedGoal?.targetAmount?.toString() || '1000000');
  const [monthlyContribution, setMonthlyContribution] = useState(savedGoal?.monthlyContribution?.toString() || '1000');
  const [expectedReturn, setExpectedReturn] = useState(savedGoal?.expectedAnnualReturn?.toString() || '5');
  
  const [yearsToGoal, setYearsToGoal] = useState<number | null>(null);
  const [projectedAmount, setProjectedAmount] = useState<number | null>(null);

  useEffect(() => {
    calculateGoal();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetAmount, monthlyContribution, expectedReturn, currentPortfolioValue]);

  const calculateGoal = () => {
    const P = currentPortfolioValue;
    const PMT = parseFloat(monthlyContribution);
    const FV_Target = parseFloat(targetAmount);
    const r_annual = parseFloat(expectedReturn) / 100;
    const r = r_annual / 12;

    if (isNaN(PMT) || isNaN(FV_Target) || isNaN(r_annual) || PMT < 0 || FV_Target <= P) {
        setYearsToGoal(0);
        return;
    }

    // Formula for n (months) in compound interest with regular contributions:
    // FV = P(1+r)^n + PMT * ((1+r)^n - 1) / r
    // Solving for n:
    // n = ln( (FV * r + PMT) / (P * r + PMT) ) / ln(1 + r)
    
    try {
        const numerator = (FV_Target * r + PMT);
        const denominator = (P * r + PMT);
        
        if (denominator === 0) return;

        const n = Math.log(numerator / denominator) / Math.log(1 + r);
        const years = n / 12;
        
        setYearsToGoal(years);

        // Calculate projected amount in 1 year for fun
        const n_1year = 12;
        const fv_1year = P * Math.pow(1+r, n_1year) + (PMT * (Math.pow(1+r, n_1year) - 1) / r);
        setProjectedAmount(fv_1year);

    } catch (e) {
        console.error(e);
        setYearsToGoal(null);
    }
  };

  const handleSave = () => {
      onSaveGoal({
          targetAmount: parseFloat(targetAmount),
          monthlyContribution: parseFloat(monthlyContribution),
          expectedAnnualReturn: parseFloat(expectedReturn),
          startAmount: currentPortfolioValue
      });
  };

  const progress = Math.min(100, (currentPortfolioValue / parseFloat(targetAmount || '1')) * 100);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
       <div className="flex items-center gap-2 mb-6">
           <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
               <Target className="w-6 h-6" />
           </div>
           <h2 className="text-xl font-bold text-slate-800">Financial Freedom Goal</h2>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           
           {/* Inputs */}
           <div className="space-y-4 md:col-span-1 border-r border-slate-100 pr-0 md:pr-8">
               <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Target Amount ({baseCurrency})</label>
                   <input 
                     type="number" 
                     value={targetAmount} 
                     onChange={(e) => setTargetAmount(e.target.value)}
                     className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-700 focus:border-indigo-500 outline-none"
                   />
               </div>
               <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Monthly Contribution</label>
                   <input 
                     type="number" 
                     value={monthlyContribution} 
                     onChange={(e) => setMonthlyContribution(e.target.value)}
                     className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-700 focus:border-indigo-500 outline-none"
                   />
               </div>
               <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Expected Annual Return (%)</label>
                   <input 
                     type="number" 
                     value={expectedReturn} 
                     onChange={(e) => setExpectedReturn(e.target.value)}
                     className="w-full p-2 bg-slate-50 border border-slate-200 rounded font-semibold text-slate-700 focus:border-indigo-500 outline-none"
                   />
               </div>
               <button onClick={handleSave} className="flex items-center justify-center gap-2 w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-sm font-bold">
                   <Save className="w-4 h-4" /> Save Goal
               </button>
           </div>

           {/* Visualization */}
           <div className="md:col-span-2 flex flex-col justify-center">
               
               {/* Progress Bar */}
               <div className="mb-8">
                   <div className="flex justify-between text-sm mb-2 font-bold text-slate-600">
                       <span>Current: {baseCurrency} {currentPortfolioValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                       <span>Goal: {baseCurrency} {parseFloat(targetAmount).toLocaleString()}</span>
                   </div>
                   <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out"
                         style={{ width: `${progress}%` }}
                       ></div>
                   </div>
                   <div className="mt-1 text-right text-xs text-indigo-600 font-bold">{progress.toFixed(1)}% Reached</div>
               </div>

               {/* Projection Stats */}
               <div className="grid grid-cols-2 gap-4">
                   <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                       <div className="text-xs text-slate-500 uppercase font-bold mb-1">Time to Reach Goal</div>
                       <div className="text-2xl font-bold text-slate-800">
                           {yearsToGoal && yearsToGoal > 0 
                             ? <span>{Math.floor(yearsToGoal)} <span className="text-sm font-normal text-slate-500">years</span> {Math.round((yearsToGoal % 1) * 12)} <span className="text-sm font-normal text-slate-500">months</span></span>
                             : <span className="text-sm text-emerald-600">Goal Achieved / Invalid</span>
                           }
                       </div>
                   </div>
                   <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Projected 1-Year Growth</div>
                        <div className="text-2xl font-bold text-emerald-600 flex items-center gap-2">
                            {projectedAmount ? `+ ${(projectedAmount - currentPortfolioValue - (parseFloat(monthlyContribution) * 12)).toLocaleString(undefined, {maximumFractionDigits: 0})}` : '-'}
                            <span className="text-xs font-normal text-slate-400 bg-white px-1 rounded border">Interest Only</span>
                        </div>
                   </div>
               </div>

               <div className="mt-6 p-3 bg-blue-50 text-blue-700 text-xs rounded flex items-start gap-2">
                   <Calculator className="w-4 h-4 shrink-0 mt-0.5" />
                   <p>Calculations assume constant monthly returns based on the annual percentage. Market volatility is not factored in.</p>
               </div>

           </div>
       </div>
    </div>
  );
};