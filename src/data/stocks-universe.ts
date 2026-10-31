import rawUniverse from "./stocks-universe.json";
import { StockQuote } from "@/types/stock";

export interface UniverseRawItem {
  symbol: string;
  name: string;
  market: string;
  currency: string;
  price: number;
  change: number;
  volume: string;
  peRatio?: number;
  marketCap?: string;
  high?: number;
  low?: number;
  sector?: string;
  yahooSymbol?: string;
  isin?: string;
}

export interface UniversePayload {
  version: string;
  lastUpdated: string;
  counts: { us: number; nse: number; total: number };
  stocks: UniverseRawItem[];
}

const universeData = rawUniverse as unknown as UniversePayload;

export const UNIVERSE_COUNTS = universeData.counts;
export const ALL_UNIVERSE_ITEMS: UniverseRawItem[] = universeData.stocks || [];

// Fast Map Index for O(1) ticker lookups
export const UNIVERSE_MAP = new Map<string, UniverseRawItem>();
// Fast Map for Yahoo Symbol lookups
export const UNIVERSE_YAHOO_MAP = new Map<string, UniverseRawItem>();

for (const s of ALL_UNIVERSE_ITEMS) {
  const upper = s.symbol.toUpperCase();
  UNIVERSE_MAP.set(upper, s);
  if (s.yahooSymbol) {
    UNIVERSE_YAHOO_MAP.set(s.yahooSymbol.toUpperCase(), s);
  }
}

/**
 * Converts a raw universe catalog record into a full live StockQuote.
 */
export function quoteFromUniverseItem(item: UniverseRawItem): StockQuote {
  const isINR = item.currency === "₹";
  const spreadPct = isINR ? 0.0006 : 0.0004;
  const halfSpread = Math.max(0.05, Number(((item.price * spreadPct) / 2).toFixed(2)));
  const bid = Number((item.price - halfSpread).toFixed(2));
  const ask = Number((item.price + halfSpread).toFixed(2));
  const spread = Number((ask - bid).toFixed(2));
  const change = typeof item.change === "number" ? item.change : 0;
  const changeAmount = Number(((item.price * change) / 100).toFixed(2));
  const open = Number((item.price - changeAmount * 0.8).toFixed(2));
  const prevClose = Number((item.price - changeAmount).toFixed(2));

  return {
    name: item.name,
    symbol: item.symbol,
    yahooSymbol: item.yahooSymbol || (isINR ? `${item.symbol}.NS` : item.symbol),
    price: item.price,
    bid,
    ask,
    spread,
    open,
    prevClose,
    currency: item.currency,
    change,
    changeAmount,
    market: item.market,
    sector: item.sector || (isINR ? "Indian Equity" : "US Equity"),
    high: item.high || Number((item.price * 1.02).toFixed(2)),
    low: item.low || Number((item.price * 0.98).toFixed(2)),
    volume: item.volume || "1.2M",
    peRatio: item.peRatio,
    marketCap: item.marketCap,
    description: `${item.name} (${item.symbol}) actively tracked on ${item.market}.`,
    lastTickDirection: change >= 0 ? "up" : "down",
    lastUpdated: new Date().toLocaleTimeString(),
  };
}

/**
 * Finds a stock from the 7,280+ security universe (NSE India + US Markets).
 */
export function findUniverseStock(query: string): StockQuote | null {
  if (!query || !query.trim()) return null;
  const raw = query.trim();
  const upper = raw.toUpperCase().replace(/\.(NS|BO|US)$/i, "");
  const yahooUpper = raw.toUpperCase();

  // 1. Direct O(1) Ticker Match
  if (UNIVERSE_MAP.has(upper)) {
    return quoteFromUniverseItem(UNIVERSE_MAP.get(upper)!);
  }
  if (UNIVERSE_YAHOO_MAP.has(yahooUpper)) {
    return quoteFromUniverseItem(UNIVERSE_YAHOO_MAP.get(yahooUpper)!);
  }

  // 2. Exact match with .NS appended (for Indian tickers)
  const nseCandidate = `${upper}.NS`;
  if (UNIVERSE_YAHOO_MAP.has(nseCandidate)) {
    return quoteFromUniverseItem(UNIVERSE_YAHOO_MAP.get(nseCandidate)!);
  }

  // 3. Exact symbol case-insensitive
  const lower = raw.toLowerCase();
  const bySymbol = ALL_UNIVERSE_ITEMS.find((s) => s.symbol.toLowerCase() === lower);
  if (bySymbol) return quoteFromUniverseItem(bySymbol);

  // 4. Exact company name
  const byNameExact = ALL_UNIVERSE_ITEMS.find((s) => s.name.toLowerCase() === lower);
  if (byNameExact) return quoteFromUniverseItem(byNameExact);

  // 5. Name starts with (minimum 3 chars)
  if (lower.length >= 3) {
    const byNameStarts = ALL_UNIVERSE_ITEMS.find((s) => s.name.toLowerCase().startsWith(lower));
    if (byNameStarts) return quoteFromUniverseItem(byNameStarts);
  }

  // 6. Name word match (avoid matching common stop words)
  const STOP_WORDS = new Set([
    "shares", "share", "stock", "stocks", "holding", "holdings", "corp",
    "corporation", "inc", "ltd", "limited", "company", "group", "class",
    "fund", "trust", "series", "the", "clear", "doubt", "pnl", "trade"
  ]);

  if (lower.length >= 4 && !STOP_WORDS.has(lower)) {
    const byNameWord = ALL_UNIVERSE_ITEMS.find((s) => {
      const nameWords = s.name.toLowerCase().split(/[\s,.-]+/);
      return nameWords.includes(lower);
    });
    if (byNameWord) return quoteFromUniverseItem(byNameWord);
  }

  return null;
}

/**
 * Searches across the entire 7,280+ security universe with filtering and scoring.
 */
export function searchUniverse(
  query: string,
  limit = 24,
  marketFilter: "ALL" | "INDIA" | "US" | "CRYPTO" = "ALL",
): StockQuote[] {
  const q = (query || "").trim().toLowerCase();
  const results: StockQuote[] = [];

  for (const s of ALL_UNIVERSE_ITEMS) {
    if (marketFilter === "INDIA" && !s.market.includes("NSE") && !s.market.includes("BSE")) {
      continue;
    }
    if (marketFilter === "US" && !s.market.includes("NASDAQ") && !s.market.includes("NYSE")) {
      continue;
    }
    if (marketFilter === "CRYPTO" && !s.market.includes("CRYPTO")) {
      continue;
    }

    if (!q) {
      results.push(quoteFromUniverseItem(s));
      if (results.length >= limit) break;
      continue;
    }

    const symLower = s.symbol.toLowerCase();
    const nameLower = s.name.toLowerCase();
    const secLower = (s.sector || "").toLowerCase();

    // Priority match: exact or prefix on ticker
    if (symLower === q || symLower.startsWith(q) || nameLower.includes(q) || secLower.includes(q)) {
      results.push(quoteFromUniverseItem(s));
      if (results.length >= limit) break;
    }
  }

  return results;
}
