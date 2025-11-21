
import React, { useState, useEffect } from 'react';
import { Quote } from 'lucide-react';

const QUOTES = [
  { text: "The stock market is designed to transfer money from the Active to the Patient.", author: "Warren Buffett" },
  { text: "The big money is not in the buying and selling, but in the waiting.", author: "Charlie Munger" },
  { text: "Investment is actually very simple, which is to understand the company.", author: "Duan Yongping" },
  { text: "Know what you own, and know why you own it.", author: "Peter Lynch" },
  { text: "In the short run, the market is a voting machine but in the long run, it is a weighing machine.", author: "Benjamin Graham" },
  { text: "Price is what you pay. Value is what you get.", author: "Warren Buffett" },
  { text: "Risk comes from not knowing what you're doing.", author: "Warren Buffett" },
  { text: "A lot of people with high IQs are terrible investors because they've got terrible temperaments.", author: "Charlie Munger" }
];

export const MotivationalQuote: React.FC = () => {
  const [quote, setQuote] = useState(QUOTES[0]);

  useEffect(() => {
    // Pick a random quote on mount
    const random = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    setQuote(random);
  }, []);

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6 mb-8 relative overflow-hidden">
       <div className="absolute top-0 left-0 p-4 opacity-10">
           <Quote className="w-16 h-16 text-indigo-600" />
       </div>
       <div className="relative z-10 text-center max-w-2xl mx-auto">
           <p className="text-lg text-slate-700 italic font-medium mb-3">"{quote.text}"</p>
           <p className="text-sm font-bold text-indigo-600 uppercase tracking-wider">— {quote.author}</p>
       </div>
    </div>
  );
};
