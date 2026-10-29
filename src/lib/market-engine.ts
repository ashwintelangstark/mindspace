import { StockQuote, CandleData, AgentLiveAlert } from "@/types/stock";
import { STOCKS_CATALOG, INITIAL_INDICES, MarketIndexQuote } from "@/data/stocks";
import { agents, currentTask } from "@/game/sim/roam";
import { saveAgentAlertToSqlite } from "./sqlite-client";

export interface LiveMarketSnapshot {
  quotes: Record<string, StockQuote>;
  indices: MarketIndexQuote[];
  candlesBySymbol: Record<string, CandleData[]>;
  liveAlerts: AgentLiveAlert[];
  activeSymbol: string;
  lastUpdated: number;
  isLiveFeedConnected: boolean;
}

export interface ExchangeMarketStatus {
  isOpen: boolean;
  marketCode: "NSE/BSE" | "US" | "CRYPTO";
  badge: "🔴 Market Closed" | "🟢 Market Open";
  sessionMessage: string;
}

/**
 * Checks exchange trading hours for Indian (NSE/BSE: 9:15 AM - 3:30 PM IST),
 * US (NASDAQ/NYSE: 9:30 AM - 4:00 PM EST), and Crypto (24/7).
 */
export function getExchangeMarketStatus(
  market = "",
  symbol = "",
  now = new Date(),
): ExchangeMarketStatus {
  const upperM = (market || "").toUpperCase();
  const upperS = (symbol || "").toUpperCase();

  // 1. Crypto (24/7 continuous trading)
  if (
    upperM.includes("CRYPTO") ||
    upperS.includes("BTC") ||
    upperS.includes("ETH") ||
    upperS === "BTC-USD" ||
    upperS === "ETH-USD"
  ) {
    return {
      isOpen: true,
      marketCode: "CRYPTO",
      badge: "🟢 Market Open",
      sessionMessage: "24/7 Global Live Market",
    };
  }

  // 2. Indian Equities & Indices (NSE / BSE / NIFTY 50 / SENSEX / Reliance / TCS / etc.)
  const isIndian =
    upperM.includes("NSE") ||
    upperM.includes("BSE") ||
    upperM.includes("INDIA") ||
    upperM.includes("EQ") ||
    upperS.endsWith(".NS") ||
    upperS.endsWith(".BO") ||
    upperS === "^NSEI" ||
    upperS === "^BSESN" ||
    upperS === "NIFTY 50" ||
    upperS === "SENSEX" ||
    upperS === "RELIANCE" ||
    upperS === "TCS" ||
    upperS === "INFY" ||
    upperS === "HDFCBANK" ||
    upperS === "ICICIBANK" ||
    upperS === "TATAMOTORS" ||
    upperS === "SBIN" ||
    upperS === "BHARTIARTL";

  if (isIndian) {
    // Convert to Indian Standard Time (UTC + 5:30)
    const istTime = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000);
    const day = istTime.getDay(); // 0 is Sunday, 6 is Saturday
    const hours = istTime.getHours();
    const minutes = istTime.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    // Trading hours: Mon–Fri 9:15 AM (555 mins) to 3:30 PM (930 mins) IST
    const isWeekday = day >= 1 && day <= 5;
    const isTradingHours = totalMinutes >= 555 && totalMinutes <= 930;
    const isOpen = isWeekday && isTradingHours;

    if (!isWeekday) {
      return {
        isOpen: false,
        marketCode: "NSE/BSE",
        badge: "🔴 Market Closed",
        sessionMessage: "Weekend · Opens Mon 9:15 AM IST",
      };
    }
    if (totalMinutes < 555) {
      return {
        isOpen: false,
        marketCode: "NSE/BSE",
        badge: "🔴 Market Closed",
        sessionMessage: "Pre-Market · Opens 9:15 AM IST",
      };
    }
    if (totalMinutes > 930) {
      return {
        isOpen: false,
        marketCode: "NSE/BSE",
        badge: "🔴 Market Closed",
        sessionMessage: "Closed at 3:30 PM IST · Opens 9:15 AM IST",
      };
    }
    return {
      isOpen: true,
      marketCode: "NSE/BSE",
      badge: "🟢 Market Open",
      sessionMessage: "Trading Live · Closes 3:30 PM IST",
    };
  }

  // 3. US Equities & Indices (NASDAQ / NYSE / S&P 500 / NVDA / AAPL / TSLA / MSFT / etc.)
  try {
    const nyFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour12: false,
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
    });
    const parts = nyFormatter.formatToParts(now);
    const weekdayStr = parts.find((p) => p.type === "weekday")?.value || "";
    const hourVal = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
    const minuteVal = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
    const totalMin = hourVal * 60 + minuteVal;

    const isWeekend = weekdayStr === "Sat" || weekdayStr === "Sun";
    // Regular US session: Mon–Fri 9:30 AM (570 mins) to 4:00 PM (960 mins) ET
    const isTradingHours = totalMin >= 570 && totalMin <= 960;
    const isOpen = !isWeekend && isTradingHours;

    if (isWeekend) {
      return {
        isOpen: false,
        marketCode: "US",
        badge: "🔴 Market Closed",
        sessionMessage: "Weekend · Opens Mon 9:30 AM EST",
      };
    }
    if (totalMin < 570) {
      return {
        isOpen: false,
        marketCode: "US",
        badge: "🔴 Market Closed",
        sessionMessage: "Pre-Market · Opens 9:30 AM EST",
      };
    }
    if (totalMin > 960) {
      return {
        isOpen: false,
        marketCode: "US",
        badge: "🔴 Market Closed",
        sessionMessage: "Closed at 4:00 PM EST · Opens 9:30 AM EST",
      };
    }
    return {
      isOpen: true,
      marketCode: "US",
      badge: "🟢 Market Open",
      sessionMessage: "Trading Live · Closes 4:00 PM EST",
    };
  } catch {
    return {
      isOpen: false,
      marketCode: "US",
      badge: "🔴 Market Closed",
      sessionMessage: "Closed · Opens 9:30 AM EST",
    };
  }
}

export interface StockSearchResultItem {
  symbol: string;
  yahooSymbol: string;
  name: string;
  market: string;
  currency: string;
  sector?: string;
}

type MarketListener = (snapshot: LiveMarketSnapshot) => void;
const listeners: Set<MarketListener> = new Set();

// Initialize mutable state from catalog
const liveQuotes: Record<string, StockQuote> = {};
const basePrices: Record<string, number> = {};
const candlesBySymbol: Record<string, CandleData[]> = {};

for (const [key, stock] of Object.entries(STOCKS_CATALOG)) {
  liveQuotes[stock.symbol] = { ...stock };
  basePrices[stock.symbol] = stock.price / (1 + stock.change / 100);
  candlesBySymbol[stock.symbol] = generateInitialCandles(stock, 64);
  liveQuotes[key] = liveQuotes[stock.symbol];
}

let liveIndices: MarketIndexQuote[] = INITIAL_INDICES.map((idx) => ({ ...idx }));
let liveAlerts: AgentLiveAlert[] = [];
// No default stock is selected on initial load — user searches & selects their stock
let activeSymbol = "";
let isLiveFeedConnected = true;
let engineInterval: ReturnType<typeof setInterval> | null = null;
let tickCounter = 0;

/**
 * Generates OHLCV candlestick series anchored to a stock's price when live chart candles are not yet loaded.
 */
export function generateInitialCandles(stock: StockQuote, count = 64): CandleData[] {
  const candles: CandleData[] = [];
  const nowSec = Math.floor(Date.now() / 1000);
  const stepSec = 300;

  let seed = 0;
  for (let i = 0; i < stock.symbol.length; i++) {
    seed = (seed * 31 + stock.symbol.charCodeAt(i)) % 10000;
  }
  const pseudoRand = () => {
    seed = (seed * 16807 + 11) % 2147483647;
    return (seed % 10000) / 10000;
  };

  const targetEndPrice = stock.price;
  const totalDrift = stock.change / 100;
  let cursorPrice = Number((targetEndPrice / (1 + totalDrift * 0.75)).toFixed(2));
  const volFactor = stock.market.includes("CRYPTO") ? 0.0045 : 0.0028;

  for (let i = count - 1; i >= 0; i--) {
    const time = nowSec - i * stepSec;
    const progress = (count - i) / count;
    const wave = Math.sin(progress * Math.PI * 2.5 + seed * 0.01) * volFactor * 0.6;
    const stepDrift = (totalDrift * 0.75) / count + wave + (pseudoRand() - 0.485) * volFactor;

    const open = Number(cursorPrice.toFixed(2));
    const rawClose = i === 0 ? targetEndPrice : open * (1 + stepDrift);
    const close = Number(Math.max(0.05, rawClose).toFixed(2));

    const bodyMax = Math.max(open, close);
    const bodyMin = Math.min(open, close);
    const wickUp = bodyMax * (0.0006 + pseudoRand() * volFactor * 0.85);
    const wickDown = bodyMin * (0.0006 + pseudoRand() * volFactor * 0.85);

    const high = Number((bodyMax + wickUp).toFixed(2));
    const low = Number(Math.max(0.01, bodyMin - wickDown).toFixed(2));
    const volume = Math.round(45000 + pseudoRand() * 185000 * (1 + Math.abs(stepDrift) * 180));

    candles.push({ time, open, high, low, close, volume });
    cursorPrice = close;
  }

  return candles;
}

/**
 * Generates live intraday alerts from Bull, Bear, Stag, and Rabbit for a selected symbol.
 */
function buildAlertsForSymbol(symbol: string): AgentLiveAlert[] {
  if (!symbol) return [];
  const quote = getLiveStockQuote(symbol);
  const nowStr = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return [
    {
      id: `al-bull-${Date.now()}-1`,
      agentId: "bull",
      agentName: "Bull",
      avatar: "🐂",
      symbol: quote.symbol,
      topic: "Breakout & Growth Momentum",
      signal: "BULLISH",
      message: `${quote.symbol} holding above 20-EMA with institutional volume accumulation at ${quote.currency}${quote.price.toFixed(2)}.`,
      timestamp: nowStr,
      priceAtAlert: quote.price,
    },
    {
      id: `al-rabbit-${Date.now()}-2`,
      agentId: "rabbit",
      agentName: "Rabbit",
      avatar: "🐇",
      symbol: quote.symbol,
      topic: "Orderbook Spread & Timing",
      signal: "BULLISH",
      message: `Tight bid/ask spread (${quote.currency}${quote.bid.toFixed(2)} / ${quote.currency}${quote.ask.toFixed(2)}) — optimal low-slippage execution window.`,
      timestamp: nowStr,
      priceAtAlert: quote.price,
    },
    {
      id: `al-stag-${Date.now()}-3`,
      agentId: "stag",
      agentName: "Stag",
      avatar: "🦌",
      symbol: quote.symbol,
      topic: "Institutional VWAP Valuation",
      signal: "NEUTRAL",
      message: `VWAP equilibrium anchored near ${quote.currency}${(quote.price * 0.996).toFixed(2)}. Fair-value accumulation zone confirmed.`,
      timestamp: nowStr,
      priceAtAlert: quote.price,
    },
    {
      id: `al-bear-${Date.now()}-4`,
      agentId: "bear",
      agentName: "Bear",
      avatar: "🐻",
      symbol: quote.symbol,
      topic: "ATR Volatility & Downside Guard",
      signal: "NEUTRAL",
      message: `Trailing ATR-14 capital guard active at ${quote.currency}${(quote.price * 0.986).toFixed(2)} to cap intraday drawdown.`,
      timestamp: nowStr,
      priceAtAlert: quote.price,
    },
  ];
}

/**
 * Queries `/api/market/search` (Yahoo Finance v1 Search API) and merges with local matches.
 */
export async function searchStocksLive(query: string): Promise<StockSearchResultItem[]> {
  const q = query.trim();
  if (!q) return [];

  const lower = q.toLowerCase();
  const localMatches: StockSearchResultItem[] = [];
  const seen = new Set<string>();

  for (const stock of Object.values(STOCKS_CATALOG)) {
    if (stock.symbol.toLowerCase().includes(lower) || stock.name.toLowerCase().includes(lower)) {
      if (!seen.has(stock.yahooSymbol)) {
        seen.add(stock.yahooSymbol);
        localMatches.push({
          symbol: stock.symbol,
          yahooSymbol: stock.yahooSymbol,
          name: stock.name,
          market: stock.market,
          currency: stock.currency,
          sector: stock.sector,
        });
      }
    }
  }

  try {
    const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.ok && Array.isArray(data.results)) {
        const merged: StockSearchResultItem[] = [];
        for (const item of data.results as StockSearchResultItem[]) {
          if (!seen.has(item.yahooSymbol)) {
            seen.add(item.yahooSymbol);
            merged.push(item);
          }
        }
        return [...merged, ...localMatches].slice(0, 8);
      }
    }
  } catch {
    // Fallback to local matches if offline
  }

  return localMatches.slice(0, 8);
}

/**
 * Fetches real live market chart & quote from `/api/market/chart` (Yahoo Finance v8 proxy)
 * and updates our live streaming state.
 */
export async function refreshSymbolFromLiveApi(
  symbolOrYahooSymbol: string,
): Promise<StockQuote | null> {
  if (!symbolOrYahooSymbol) return null;
  const existing = liveQuotes[symbolOrYahooSymbol.toUpperCase()];
  const queryTarget = existing ? existing.yahooSymbol : symbolOrYahooSymbol;

  try {
    const res = await fetch(
      `/api/market/chart?symbol=${encodeURIComponent(queryTarget)}&interval=5m&range=1d`,
    );
    if (!res.ok) return existing || null;
    const data = await res.json();
    if (data?.ok && typeof data.price === "number" && data.price > 0) {
      const cleanSymbol = (data.symbol || symbolOrYahooSymbol)
        .toUpperCase()
        .replace(/\.(NS|BO)$/i, "");
      const price = Number(data.price.toFixed(2));
      const bid = typeof data.bid === "number" ? data.bid : Number((price * 0.9996).toFixed(2));
      const ask = typeof data.ask === "number" ? data.ask : Number((price * 1.0004).toFixed(2));
      const spread = Number((ask - bid).toFixed(2));
      const change = typeof data.changePct === "number" ? data.changePct : 0;

      const updated: StockQuote = {
        name: data.name || existing?.name || cleanSymbol,
        symbol: cleanSymbol,
        yahooSymbol: data.yahooSymbol || queryTarget,
        market: data.market || existing?.market || "NSE · EQ",
        currency: data.currency || existing?.currency || "₹",
        price,
        change,
        bid,
        ask,
        spread,
        volume: data.volume || existing?.volume || "1.2M",
        high24h: data.high24h || existing?.high24h,
        low24h: data.low24h || existing?.low24h,
        sector: existing?.sector || "Listed Equity",
      };

      liveQuotes[cleanSymbol] = updated;
      basePrices[cleanSymbol] = price / (1 + change / 100);

      if (Array.isArray(data.candles) && data.candles.length >= 10) {
        candlesBySymbol[cleanSymbol] = data.candles;
      } else if (!candlesBySymbol[cleanSymbol]) {
        candlesBySymbol[cleanSymbol] = generateInitialCandles(updated, 64);
      }

      isLiveFeedConnected = true;
      notifyMarketListeners();
      return updated;
    }
  } catch {
    // Micro-tick engine continues seamlessly if offline
  }

  return existing || null;
}

/**
 * Refreshes live market overview indices (NIFTY 50, SENSEX, NASDAQ, S&P 500, BTC, ETH)
 * from `/api/market/overview`.
 */
export async function refreshLiveMarketOverview(): Promise<void> {
  try {
    const res = await fetch("/api/market/overview");
    if (!res.ok) return;
    const data = await res.json();
    if (data?.ok && Array.isArray(data.indices) && data.indices.length > 0) {
      liveIndices = data.indices;
      notifyMarketListeners();
    }
  } catch {
    // ignore if offline
  }
}

/**
 * Performs a real-time orderbook micro-tick across stocks, indices, and candles,
 * and triggers live AI agent intraday alerts when a stock is selected.
 */
function stepMarketTick(): void {
  tickCounter++;
  const nowSec = Math.floor(Date.now() / 1000);

  const uniqueSymbols = new Set<string>();
  for (const stock of Object.values(liveQuotes)) {
    if (stock && stock.symbol) uniqueSymbols.add(stock.symbol);
  }

  for (const sym of uniqueSymbols) {
    const q = liveQuotes[sym];
    if (!q) continue;

    // Check exchange trading session status
    const marketStatus = getExchangeMarketStatus(q.market, q.symbol);
    // If the exchange market is closed, FREEZE price, change, bid, ask, and candles!
    // Never simulate price ticks outside official market hours.
    if (!marketStatus.isOpen) {
      continue;
    }

    const microVol = q.market.includes("CRYPTO") ? 0.0014 : 0.00085;
    const bias = q.change >= 0 ? 0.00006 : -0.00004;
    const deltaPct = (Math.random() - 0.495) * microVol + bias;

    const newPrice = Number(Math.max(0.5, q.price * (1 + deltaPct)).toFixed(2));
    const base = basePrices[sym] || newPrice;
    const newChange = Number((((newPrice - base) / base) * 100).toFixed(2));

    const spreadFactor = q.market.includes("CRYPTO") ? 0.0005 : 0.00035;
    const halfSpread = Math.max(0.05, newPrice * spreadFactor * (0.85 + Math.random() * 0.3));
    const bid = Number((newPrice - halfSpread).toFixed(2));
    const ask = Number((newPrice + halfSpread).toFixed(2));
    const spread = Number((ask - bid).toFixed(2));

    q.price = newPrice;
    q.change = newChange;
    q.bid = bid;
    q.ask = ask;
    q.spread = spread;

    const series = candlesBySymbol[sym];
    if (series && series.length > 0) {
      const last = series[series.length - 1];
      if (nowSec - last.time >= 60) {
        series.push({
          time: nowSec,
          open: last.close,
          high: Math.max(last.close, newPrice),
          low: Math.min(last.close, newPrice),
          close: newPrice,
          volume: Math.round(12000 + Math.random() * 25000),
        });
        if (series.length > 72) series.shift();
      } else {
        last.close = newPrice;
        if (newPrice > last.high) last.high = newPrice;
        if (newPrice < last.low) last.low = newPrice;
        last.volume += Math.round(350 + Math.random() * 1800);
      }
    }
  }

  liveIndices = liveIndices.map((idx) => {
    // If the index's exchange is closed, keep it completely frozen at official settlement price
    const idxStatus = getExchangeMarketStatus(idx.market || idx.name, idx.name);
    if (!idxStatus.isOpen) {
      return idx;
    }

    const delta = (Math.random() - 0.492) * 0.0007;
    const numericPrice = Number((idx.numericPrice * (1 + delta)).toFixed(2));
    const changePct = Number((idx.changePct + delta * 95).toFixed(2));
    const isUp = changePct >= 0;
    return {
      ...idx,
      numericPrice,
      price: numericPrice.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      changePct,
      change: `${isUp ? "+" : ""}${changePct.toFixed(2)}%`,
      isUp,
    };
  });

  if (activeSymbol && tickCounter % 4 === 0) {
    evaluateAgentIntradayAction(activeSymbol);
  }

  notifyMarketListeners();
}

function evaluateAgentIntradayAction(symbol: string): void {
  if (!symbol) return;
  const quote = getLiveStockQuote(symbol);
  const candles = candlesBySymbol[quote.symbol] || [];
  if (candles.length < 10) return;

  const recent = candles.slice(-14);
  const avgClose = recent.reduce((acc, c) => acc + c.close, 0) / recent.length;
  const high14 = Math.max(...recent.map((c) => c.high));
  const low14 = Math.min(...recent.map((c) => c.low));
  const nowStr = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const agentTemplates: Array<{
    agentId: "bull" | "bear" | "stag" | "rabbit";
    agentName: string;
    avatar: string;
    topic: string;
    signal: "BULLISH" | "BEARISH" | "NEUTRAL" | "ALERT";
    message: string;
    floorStatus: string;
  }> = [
    {
      agentId: "bull",
      agentName: "Bull",
      avatar: "🐂",
      topic: "Breakout & Growth Momentum",
      signal: quote.price >= avgClose ? "BULLISH" : "NEUTRAL",
      message:
        quote.price >= avgClose
          ? `${quote.symbol} trading +${(((quote.price - avgClose) / avgClose) * 100).toFixed(2)}% above 14-bar EMA (${quote.currency}${avgClose.toFixed(2)}); upside momentum intact toward ${quote.currency}${(high14 * 1.008).toFixed(2)}.`
          : `${quote.symbol} consolidating near ${quote.currency}${quote.price.toFixed(2)}; watching breakout above ${quote.currency}${high14.toFixed(2)}.`,
      floorStatus: `Bullish scan: ${quote.symbol} @ ${quote.currency}${quote.price.toFixed(2)}`,
    },
    {
      agentId: "bear",
      agentName: "Bear",
      avatar: "🐻",
      topic: "ATR Volatility & Downside Guard",
      signal: quote.change < 0 ? "BEARISH" : "ALERT",
      message: `Intraday support floor set at ${quote.currency}${low14.toFixed(2)}. Dynamic stop-loss guard active at ${quote.currency}${(quote.price * 0.988).toFixed(2)}.`,
      floorStatus: `Risk guard: ${quote.symbol} SL ${quote.currency}${(quote.price * 0.988).toFixed(0)}`,
    },
    {
      agentId: "stag",
      agentName: "Stag",
      avatar: "🦌",
      topic: "Institutional VWAP Valuation",
      signal: "BULLISH",
      message: `Institutional VWAP anchor at ${quote.currency}${avgClose.toFixed(2)} (${quote.market}). Recommended portfolio weight: 15%–20%.`,
      floorStatus: `VWAP model: ${quote.symbol} ${quote.currency}${avgClose.toFixed(1)}`,
    },
    {
      agentId: "rabbit",
      agentName: "Rabbit",
      avatar: "🐇",
      topic: "Orderbook Spread & Timing",
      signal: "BULLISH",
      message: `Live Bid ${quote.currency}${quote.bid.toFixed(2)} × Ask ${quote.currency}${quote.ask.toFixed(2)} (Spread ${quote.currency}${quote.spread.toFixed(2)}). High-speed execution ready.`,
      floorStatus: `Bid/Ask ${quote.symbol}: ${quote.bid.toFixed(1)}/${quote.ask.toFixed(1)}`,
    },
  ];

  const picked = agentTemplates[(tickCounter / 4) % agentTemplates.length];
  if (!picked) return;

  const newAlert: AgentLiveAlert = {
    id: `alert-${picked.agentId}-${Date.now()}`,
    agentId: picked.agentId,
    agentName: picked.agentName,
    avatar: picked.avatar,
    symbol: quote.symbol,
    topic: picked.topic,
    signal: picked.signal,
    message: picked.message,
    timestamp: nowStr,
    priceAtAlert: quote.price,
  };

  liveAlerts = [newAlert, ...liveAlerts.filter((a) => a.agentId !== picked.agentId)].slice(0, 8);

  if (!currentTask.isActive) {
    const floorAgent = agents.find((a) => a.id === picked.agentId);
    if (floorAgent && floorAgent.state !== "drink_coffee") {
      floorAgent.actionStatus = picked.floorStatus;
    }
  }

  if (tickCounter % 16 === 0) {
    saveAgentAlertToSqlite(newAlert);
  }
}

export function setActiveMarketSymbol(symbol: string): void {
  if (!symbol) {
    activeSymbol = "";
    liveAlerts = [];
    notifyMarketListeners();
    return;
  }
  const quote = getLiveStockQuote(symbol);
  if (quote.symbol !== activeSymbol) {
    activeSymbol = quote.symbol;
    liveAlerts = buildAlertsForSymbol(activeSymbol);
    refreshSymbolFromLiveApi(quote.yahooSymbol || quote.symbol);
    notifyMarketListeners();
  }
}

export function getLiveStockQuote(queryOrSymbol: string): StockQuote {
  const raw = queryOrSymbol.trim();
  const upper = raw.toUpperCase().replace(/\.(NS|BO)$/i, "");
  const lower = raw.toLowerCase();

  if (liveQuotes[upper]) return liveQuotes[upper];
  if (liveQuotes[lower]) return liveQuotes[lower];

  for (const stock of Object.values(liveQuotes)) {
    if (
      stock.symbol.toUpperCase() === upper ||
      stock.yahooSymbol.toUpperCase() === raw.toUpperCase() ||
      stock.name.toLowerCase().includes(lower) ||
      stock.symbol.toLowerCase().includes(lower)
    ) {
      return stock;
    }
  }

  const cleanSym = upper.replace(/[^A-Z0-9-]/g, "").slice(0, 12) || "EQUITY";
  if (!liveQuotes[cleanSym]) {
    const seed = cleanSym.charCodeAt(0) * 29 + cleanSym.length * 113;
    const price = Number((450 + (seed % 2800) + 0.45).toFixed(2));
    const change = Number((((seed % 56) - 22) / 10).toFixed(2));
    const bid = Number((price - 0.35).toFixed(2));
    const ask = Number((price + 0.35).toFixed(2));
    const yahooSym = raw.toUpperCase().includes(".") ? raw.toUpperCase() : `${cleanSym}.NS`;
    const isUs = !yahooSym.endsWith(".NS") && !yahooSym.endsWith(".BO");
    const created: StockQuote = {
      name: `${cleanSym}`,
      symbol: cleanSym,
      yahooSymbol: yahooSym,
      market: isUs ? "NASDAQ · US" : "NSE · EQ",
      currency: isUs ? "$" : "₹",
      price,
      change,
      bid,
      ask,
      spread: 0.7,
      volume: `${((seed % 85) / 10 + 1.4).toFixed(1)}M`,
      high24h: Number((price * 1.022).toFixed(2)),
      low24h: Number((price * 0.981).toFixed(2)),
      sector: "Listed Equity",
    };
    liveQuotes[cleanSym] = created;
    basePrices[cleanSym] = price / (1 + change / 100);
    candlesBySymbol[cleanSym] = generateInitialCandles(created, 64);
  }
  return liveQuotes[cleanSym];
}

export function getMarketSnapshot(): LiveMarketSnapshot {
  const uniqueQuotes: Record<string, StockQuote> = {};
  for (const stock of Object.values(STOCKS_CATALOG)) {
    uniqueQuotes[stock.symbol] = liveQuotes[stock.symbol] || stock;
  }
  if (activeSymbol && liveQuotes[activeSymbol]) {
    uniqueQuotes[activeSymbol] = liveQuotes[activeSymbol];
  }

  return {
    quotes: uniqueQuotes,
    indices: liveIndices,
    candlesBySymbol,
    liveAlerts,
    activeSymbol,
    lastUpdated: Date.now(),
    isLiveFeedConnected,
  };
}

function notifyMarketListeners(): void {
  const snap = getMarketSnapshot();
  listeners.forEach((fn) => fn(snap));
}

export function subscribeMarketEngine(listener: MarketListener): () => void {
  listeners.add(listener);
  listener(getMarketSnapshot());

  if (!engineInterval && typeof window !== "undefined") {
    engineInterval = setInterval(stepMarketTick, 1500);
    refreshLiveMarketOverview();
  }

  return () => {
    listeners.delete(listener);
  };
}
