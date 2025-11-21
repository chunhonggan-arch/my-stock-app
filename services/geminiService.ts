
import { GoogleGenAI } from "@google/genai";
import { StockPrice, ExchangeRates, StockSearchResult } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchStockPrices = async (symbols: string[]): Promise<StockPrice[]> => {
  if (symbols.length === 0) return [];

  const uniqueSymbols = Array.from(new Set(symbols)).join(", ");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find the current real-time stock price, currency, and estimated annual dividend yield (%) for these symbols: ${uniqueSymbols}.
      
      MARKET RULES & TICKER FIXES:
      1. **Malaysia (Bursa)**: 
         - If a symbol is a 4-digit number (e.g., 1023, 3255, 5139, 5983, 1185), treat it as a Bursa stock (e.g., 1023.KL for CIMB). 
         - Prices are in MYR.
      2. **Singapore (SGX)**: 
         - Specific codes: "T6I", "AWZ", "N2IU", "C6L", "V6I". Treat these as SGX stocks (e.g., append .SI or search 'SGX [CODE]').
         - "C6L" is Singapore Airlines. 
         - "T6I" is usually referenced for Singtel or similar; verify strictly.
         - "N2IU" is Mapletree Pan Asia Commercial Trust.
         - "AWZ" is AEM Holdings.
         - Prices are in SGD.
      3. **US**: 
         - TSLA, AAPL, QQQM, etc. Prices in USD.

      INSTRUCTIONS:
      1. Use Google Search to find the latest price.
      2. **CRITICAL**: Ensure you match the specific stock code requested. 
         - For "1023", find "CIMB Group". 
         - For "3255", find "Heineken Malaysia".
         - For "5139", find "Aeon Credit".
         - For "5983", find "MBM Resources".
      3. Return data format: "SYMBOL|PRICE|CURRENCY|YIELD"
      4. Yield should be a percentage number (e.g., 5.2). If null, return 0.
      5. Currency must be strictly USD, MYR, or SGD.
      `,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    const lines = text.split('\n');
    const prices: StockPrice[] = [];
    const timestamp = Date.now();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Match SYMBOL|PRICE|CURRENCY|YIELD
      const match = trimmed.match(/^([A-Z0-9.\-_]+)\s*\|\s*([\d.,]+)\s*\|\s*([A-Z]{3})(?:\s*\|\s*([\d.,]+))?/i);

      if (match) {
        const symbol = match[1].toUpperCase();
        const priceStr = match[2].replace(/,/g, ''); 
        const currency = match[3].toUpperCase();
        const yieldStr = match[4] ? match[4].replace(/,/g, '').replace('%', '') : "0";
        
        const price = parseFloat(priceStr);
        const divYield = parseFloat(yieldStr);

        if (!isNaN(price) && ['USD', 'MYR', 'SGD'].includes(currency)) {
          prices.push({
            symbol: symbol,
            currentPrice: price,
            currency: currency as any,
            dividendYield: isNaN(divYield) ? 0 : divYield,
            lastUpdated: timestamp
          });
        }
      }
    }

    return prices;

  } catch (error) {
    console.error("Failed to fetch stock prices via Gemini:", error);
    return [];
  }
};

export const fetchExchangeRates = async (): Promise<ExchangeRates> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Get the current exchange rates for:
      1. USD to MYR
      2. SGD to MYR
      3. USD to SGD
      
      Return strictly in this format per line: "FROM_TO|RATE"
      Example:
      USD_MYR|4.75
      SGD_MYR|3.50
      USD_SGD|1.35
      `,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    const lines = text.split('\n');
    const rates: ExchangeRates = {
      "MYR_MYR": 1,
      "USD_USD": 1,
      "SGD_SGD": 1,
      // Default fallbacks
      "USD_MYR": 4.4,
      "SGD_MYR": 3.3,
      "MYR_USD": 0.23,
      "MYR_SGD": 0.30,
      "USD_SGD": 1.34
    };

    for (const line of lines) {
      const match = line.trim().match(/^([A-Z]{3}_[A-Z]{3})\s*\|\s*([\d.]+)/);
      if (match) {
        const key = match[1].toUpperCase();
        const rate = parseFloat(match[2]);
        if (!isNaN(rate)) {
          rates[key] = rate;
          const [from, to] = key.split('_');
          rates[`${to}_${from}`] = 1 / rate;
        }
      }
    }
    return rates;
  } catch (error) {
    console.error("Failed to fetch exchange rates", error);
    return {
      "USD_MYR": 4.5,
      "SGD_MYR": 3.35,
      "USD_SGD": 1.34,
      "MYR_MYR": 1, "USD_USD": 1, "SGD_SGD": 1
    };
  }
};

export const searchStocks = async (query: string, market: string): Promise<StockSearchResult[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Search for stock symbols matching query: "${query}".
      
      MARKET CONTEXT: ${market}
      - If market is "US", look for NASDAQ/NYSE tickers (e.g., TSLA, QQQM).
      - If market is "MY" (Malaysia), look for Bursa Malaysia tickers.
        - **IMPORTANT**: Return the full Google Finance ticker format if possible (e.g., "1023.KL" for CIMB, "5139.KL" for AEONCR).
        - Search for numerical codes like 3255, 5983, 1023.
      - If market is "SG" (Singapore), look for SGX tickers.
        - **IMPORTANT**: Return format like "C6L.SI", "T6I.SI", "N2IU.SI".
      
      Return a JSON array of objects with keys: "symbol", "name", "exchange", "currency".
      Example output for Malaysia:
      [{"symbol": "1023.KL", "name": "CIMB Group Holdings", "exchange": "Bursa", "currency": "MYR"}]
      
      Only return top 5 results.
      Return ONLY the JSON string.
      `,
    });

    const text = response.text || "[]";
    const jsonStr = text.replace(/```json|```/g, '').trim();
    const results = JSON.parse(jsonStr);
    return results;
  } catch (error) {
    console.error("Stock search failed:", error);
    return [];
  }
};
