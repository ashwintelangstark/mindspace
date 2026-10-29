import { StockQuote } from "@/types/stock";

function makeQuote(
  base: Omit<StockQuote, "bid" | "ask" | "spread" | "lastTickDirection" | "lastUpdated">,
): StockQuote {
  const spreadPct = base.market === "CRYPTO" ? 0.0004 : 0.0006;
  const halfSpread = Math.max(0.05, Number(((base.price * spreadPct) / 2).toFixed(2)));
  const bid = Number((base.price - halfSpread).toFixed(2));
  const ask = Number((base.price + halfSpread).toFixed(2));
  const spread = Number((ask - bid).toFixed(2));
  return {
    ...base,
    bid,
    ask,
    spread,
    open: Number((base.price - base.changeAmount * 0.8).toFixed(2)),
    prevClose: Number((base.price - base.changeAmount).toFixed(2)),
    lastTickDirection: base.change >= 0 ? "up" : "down",
    lastUpdated: new Date().toLocaleTimeString(),
  };
}

export const STOCKS_CATALOG: Record<string, StockQuote> = {
  // ---- INDIAN EQUITIES (NSE / BSE) ----
  reliance: makeQuote({
    name: "Reliance Industries Ltd",
    symbol: "RELIANCE",
    yahooSymbol: "RELIANCE.NS",
    price: 1428.5,
    currency: "₹",
    change: 1.24,
    changeAmount: 17.5,
    market: "NSE",
    high: 1442.0,
    low: 1419.1,
    volume: "8.4M",
    peRatio: 24.8,
    marketCap: "₹19.3T",
    description: "Energy, petrochemicals, Jio digital services, and Reliance Retail conglomerate.",
  }),
  tcs: makeQuote({
    name: "Tata Consultancy Services",
    symbol: "TCS",
    yahooSymbol: "TCS.NS",
    price: 3698.8,
    currency: "₹",
    change: -0.45,
    changeAmount: -16.7,
    market: "NSE",
    high: 3724.0,
    low: 3680.1,
    volume: "2.1M",
    peRatio: 29.2,
    marketCap: "₹13.4T",
    description: "Global multinational IT consulting, enterprise cloud, and AI solutions leader.",
  }),
  hdfcbank: makeQuote({
    name: "HDFC Bank Limited",
    symbol: "HDFCBANK",
    yahooSymbol: "HDFCBANK.NS",
    price: 1682.2,
    currency: "₹",
    change: 0.62,
    changeAmount: 10.35,
    market: "NSE",
    high: 1694.0,
    low: 1675.0,
    volume: "12.3M",
    peRatio: 18.9,
    marketCap: "₹12.8T",
    description: "India's largest private sector bank across retail, corporate, and treasury.",
  }),
  infosys: makeQuote({
    name: "Infosys Limited",
    symbol: "INFY",
    yahooSymbol: "INFY.NS",
    price: 1512.3,
    currency: "₹",
    change: 0.83,
    changeAmount: 12.45,
    market: "NSE",
    high: 1528.0,
    low: 1504.0,
    volume: "5.7M",
    peRatio: 26.1,
    marketCap: "₹6.3T",
    description: "Digital services, Topaz generative AI platform, and cloud transformation.",
  }),
  icicibank: makeQuote({
    name: "ICICI Bank Limited",
    symbol: "ICICIBANK",
    yahooSymbol: "ICICIBANK.NS",
    price: 1264.9,
    currency: "₹",
    change: 1.42,
    changeAmount: 17.7,
    market: "NSE",
    high: 1275.0,
    low: 1248.5,
    volume: "9.8M",
    peRatio: 19.4,
    marketCap: "₹8.9T",
    description: "Premier Indian private banking and financial services group.",
  }),
  sbin: makeQuote({
    name: "State Bank of India",
    symbol: "SBIN",
    yahooSymbol: "SBIN.NS",
    price: 824.4,
    currency: "₹",
    change: 0.95,
    changeAmount: 7.75,
    market: "NSE",
    high: 832.0,
    low: 815.2,
    volume: "14.6M",
    peRatio: 10.8,
    marketCap: "₹7.35T",
    description: "India's largest public sector banking and financial services institution.",
  }),
  tatamotors: makeQuote({
    name: "Tata Motors Limited",
    symbol: "TATAMOTORS",
    yahooSymbol: "TATAMOTORS.NS",
    price: 942.65,
    currency: "₹",
    change: 1.88,
    changeAmount: 17.4,
    market: "NSE",
    high: 954.0,
    low: 928.0,
    volume: "11.2M",
    peRatio: 11.5,
    marketCap: "₹3.47T",
    description: "Automotive leader in EVs, commercial vehicles, and Jaguar Land Rover.",
  }),
  bajfinance: makeQuote({
    name: "Bajaj Finance Limited",
    symbol: "BAJFINANCE",
    yahooSymbol: "BAJFINANCE.NS",
    price: 7185.0,
    currency: "₹",
    change: 0.74,
    changeAmount: 52.8,
    market: "NSE",
    high: 7240.0,
    low: 7120.0,
    volume: "1.4M",
    peRatio: 30.2,
    marketCap: "₹4.45T",
    description: "Leading non-banking financial company (NBFC) in consumer and SME lending.",
  }),
  bhartiartl: makeQuote({
    name: "Bharti Airtel Limited",
    symbol: "BHARTIARTL",
    yahooSymbol: "BHARTIARTL.NS",
    price: 1648.3,
    currency: "₹",
    change: 1.15,
    changeAmount: 18.75,
    market: "NSE",
    high: 1662.0,
    low: 1630.0,
    volume: "4.9M",
    peRatio: 54.1,
    marketCap: "₹9.4T",
    description:
      "Global telecommunications provider operating 5G networks across India and Africa.",
  }),
  lt: makeQuote({
    name: "Larsen & Toubro Ltd",
    symbol: "LT",
    yahooSymbol: "LT.NS",
    price: 3640.55,
    currency: "₹",
    change: -0.38,
    changeAmount: -13.9,
    market: "NSE",
    high: 3672.0,
    low: 3622.0,
    volume: "1.8M",
    peRatio: 36.4,
    marketCap: "₹5.0T",
    description:
      "Multinational EPC infrastructure, defense, heavy engineering, and technology giant.",
  }),
  zomato: makeQuote({
    name: "Zomato Limited",
    symbol: "ZOMATO",
    yahooSymbol: "ZOMATO.NS",
    price: 268.4,
    currency: "₹",
    change: 2.65,
    changeAmount: 6.92,
    market: "NSE",
    high: 273.5,
    low: 261.0,
    volume: "36.5M",
    peRatio: 112.0,
    marketCap: "₹2.37T",
    description: "Food delivery, Blinkit quick-commerce, and Hyperpure B2B supplies leader.",
  }),
  itc: makeQuote({
    name: "ITC Limited",
    symbol: "ITC",
    yahooSymbol: "ITC.NS",
    price: 492.8,
    currency: "₹",
    change: 0.51,
    changeAmount: 2.5,
    market: "NSE",
    high: 496.5,
    low: 489.0,
    volume: "10.2M",
    peRatio: 28.4,
    marketCap: "₹6.15T",
    description:
      "Diversified FMCG, hotels, paperboards, packaging, and agri-business conglomerate.",
  }),

  // ---- US / FOREIGN EQUITIES (NASDAQ / NYSE) ----
  nvidia: makeQuote({
    name: "NVIDIA Corporation",
    symbol: "NVDA",
    yahooSymbol: "NVDA",
    price: 875.21,
    currency: "$",
    change: 2.14,
    changeAmount: 18.34,
    market: "NASDAQ",
    high: 884.5,
    low: 862.1,
    volume: "48.2M",
    peRatio: 48.5,
    marketCap: "$2.15T",
    description: "Pioneer in accelerated computing, Blackwell AI GPUs, CUDA, and datacenter scale.",
  }),
  apple: makeQuote({
    name: "Apple Inc.",
    symbol: "AAPL",
    yahooSymbol: "AAPL",
    price: 189.32,
    currency: "$",
    change: 0.81,
    changeAmount: 1.52,
    market: "NASDAQ",
    high: 191.2,
    low: 188.4,
    volume: "54.1M",
    peRatio: 29.8,
    marketCap: "$2.92T",
    description: "Consumer hardware, Apple Silicon, iOS ecosystem, and high-margin services.",
  }),
  tesla: makeQuote({
    name: "Tesla Inc.",
    symbol: "TSLA",
    yahooSymbol: "TSLA",
    price: 248.5,
    currency: "$",
    change: -1.12,
    changeAmount: -2.81,
    market: "NASDAQ",
    high: 254.3,
    low: 245.1,
    volume: "76.4M",
    peRatio: 64.2,
    marketCap: "$788B",
    description:
      "Electric vehicles, Full Self-Driving (FSD) neural networks, Megapack, and Optimus.",
  }),
  microsoft: makeQuote({
    name: "Microsoft Corporation",
    symbol: "MSFT",
    yahooSymbol: "MSFT",
    price: 421.2,
    currency: "$",
    change: 0.57,
    changeAmount: 2.39,
    market: "NASDAQ",
    high: 424.8,
    low: 419.0,
    volume: "21.6M",
    peRatio: 35.1,
    marketCap: "$3.13T",
    description: "Azure cloud infrastructure, enterprise Copilot AI, Office 365, and Windows.",
  }),
  alphabet: makeQuote({
    name: "Alphabet Inc. (Google)",
    symbol: "GOOGL",
    yahooSymbol: "GOOGL",
    price: 178.45,
    currency: "$",
    change: 1.32,
    changeAmount: 2.32,
    market: "NASDAQ",
    high: 180.1,
    low: 176.2,
    volume: "26.4M",
    peRatio: 25.4,
    marketCap: "$2.21T",
    description: "Google Search, Gemini AI, YouTube, Google Cloud Platform, and Waymo.",
  }),
  amazon: makeQuote({
    name: "Amazon.com Inc.",
    symbol: "AMZN",
    yahooSymbol: "AMZN",
    price: 186.9,
    currency: "$",
    change: 1.05,
    changeAmount: 1.94,
    market: "NASDAQ",
    high: 188.5,
    low: 184.8,
    volume: "38.9M",
    peRatio: 42.1,
    marketCap: "$1.94T",
    description:
      "AWS cloud computing leader, global e-commerce logistics, and Prime digital media.",
  }),
  meta: makeQuote({
    name: "Meta Platforms Inc.",
    symbol: "META",
    yahooSymbol: "META",
    price: 512.6,
    currency: "$",
    change: 1.76,
    changeAmount: 8.86,
    market: "NASDAQ",
    high: 518.0,
    low: 504.2,
    volume: "15.3M",
    peRatio: 28.7,
    marketCap: "$1.30T",
    description: "Social graph platforms, open-source Llama AI models, and Reality Labs.",
  }),
  amd: makeQuote({
    name: "Advanced Micro Devices",
    symbol: "AMD",
    yahooSymbol: "AMD",
    price: 164.25,
    currency: "$",
    change: 2.04,
    changeAmount: 3.28,
    market: "NASDAQ",
    high: 167.1,
    low: 160.8,
    volume: "44.7M",
    peRatio: 46.8,
    marketCap: "$265B",
    description: "EPYC server processors, Instinct MI300 AI accelerators, and Ryzen CPUs.",
  }),

  // ---- GLOBAL CRYPTO ASSETS ----
  btc: makeQuote({
    name: "Bitcoin",
    symbol: "BTC",
    yahooSymbol: "BTC-USD",
    price: 68224.1,
    currency: "$",
    change: 2.17,
    changeAmount: 1450.2,
    market: "CRYPTO",
    high: 69150.0,
    low: 67100.0,
    volume: "$28.4B",
    marketCap: "$1.34T",
    description: "Decentralized cryptographic digital asset and institutional store of value.",
  }),
  eth: makeQuote({
    name: "Ethereum",
    symbol: "ETH",
    yahooSymbol: "ETH-USD",
    price: 3812.45,
    currency: "$",
    change: 1.99,
    changeAmount: 74.33,
    market: "CRYPTO",
    high: 3870.0,
    low: 3760.0,
    volume: "$16.8B",
    marketCap: "$458B",
    description: "Programmable smart contract layer powering DeFi, tokenization, and L2 rollups.",
  }),
};

export function findStock(query: string): StockQuote {
  const q = (query || "").trim().toLowerCase();
  if (!q) return STOCKS_CATALOG.reliance;

  const cleanKey = q.replace(/[^a-z0-9]/g, "");
  if (STOCKS_CATALOG[cleanKey]) return STOCKS_CATALOG[cleanKey];

  const bySymbol = Object.values(STOCKS_CATALOG).find(
    (s) => s.symbol.toLowerCase() === q || s.yahooSymbol?.toLowerCase() === q,
  );
  if (bySymbol) return bySymbol;

  const byName = Object.values(STOCKS_CATALOG).find(
    (s) => s.name.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q),
  );
  if (byName) return byName;

  // Dynamic stock creation for any Indian (.NS/.BO) or US ticker searched by the user
  const rawSym = query.trim().toUpperCase().replace(/\s+/g, "");
  const isExplicitUS =
    rawSym.endsWith(".US") ||
    [
      "INTC",
      "ORCL",
      "CRM",
      "AVGO",
      "QCOM",
      "JPM",
      "V",
      "MA",
      "DIS",
      "PYPL",
      "UBER",
      "COIN",
      "PLTR",
    ].includes(rawSym);
  const isINR = !isExplicitUS && !rawSym.includes("USD");
  const cleanSym = rawSym.replace(/\.(NS|BO|US)$/, "").slice(0, 12);
  const yahooSymbol = isINR ? `${cleanSym}.NS` : cleanSym;
  const seed = cleanSym.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const price = isINR
    ? Number((650 + (seed % 2400) + 0.45).toFixed(2))
    : Number((95 + (seed % 320) + 0.25).toFixed(2));
  const change = Number((((seed % 45) - 15) / 10).toFixed(2));
  const changeAmount = Number(((price * change) / 100).toFixed(2));

  return makeQuote({
    name: `${cleanSym} (${isINR ? "NSE India" : "US Equity"})`,
    symbol: cleanSym,
    yahooSymbol,
    price,
    currency: isINR ? "₹" : "$",
    change,
    changeAmount,
    market: isINR ? "NSE" : "NASDAQ",
    high: Number((price * 1.018).toFixed(2)),
    low: Number((price * 0.984).toFixed(2)),
    volume: "3.8M",
    peRatio: Number((18 + (seed % 22)).toFixed(1)),
    marketCap: isINR ? "₹1.8T" : "$140B",
    description: `Real-time monitored ${isINR ? "Indian NSE/BSE" : "US Exchange"} equity (${yahooSymbol}).`,
  });
}

export interface MarketIndexQuote {
  name: string;
  symbol: string;
  price: number;
  priceFormatted: string;
  change: string;
  changePct: number;
  changeAmount: string;
  isUp: boolean;
}

export const INITIAL_INDICES: MarketIndexQuote[] = [
  {
    name: "NIFTY 50",
    symbol: "^NSEI",
    price: 24612.3,
    priceFormatted: "24,612.30",
    change: "+1.24%",
    changePct: 1.24,
    changeAmount: "+303.25",
    isUp: true,
  },
  {
    name: "SENSEX",
    symbol: "^BSESN",
    price: 80452.16,
    priceFormatted: "80,452.16",
    change: "+1.11%",
    changePct: 1.11,
    changeAmount: "+883.46",
    isUp: true,
  },
  {
    name: "NASDAQ",
    symbol: "^IXIC",
    price: 18320.44,
    priceFormatted: "18,320.44",
    change: "-0.21%",
    changePct: -0.21,
    changeAmount: "-38.21",
    isUp: false,
  },
  {
    name: "S&P 500",
    symbol: "^GSPC",
    price: 5842.47,
    priceFormatted: "5,842.47",
    change: "+0.48%",
    changePct: 0.48,
    changeAmount: "+27.91",
    isUp: true,
  },
  {
    name: "BTC",
    symbol: "BTC-USD",
    price: 68224.1,
    priceFormatted: "68,224.10",
    change: "+2.17%",
    changePct: 2.17,
    changeAmount: "+1,431.62",
    isUp: true,
  },
  {
    name: "ETH",
    symbol: "ETH-USD",
    price: 3812.45,
    priceFormatted: "3,812.45",
    change: "+1.99%",
    changePct: 1.99,
    changeAmount: "+74.33",
    isUp: true,
  },
];

export const TOP_INDICES = INITIAL_INDICES;
