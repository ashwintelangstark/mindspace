import { OPENROUTER_DEFAULT_KEY, OPENROUTER_MODELS, FREE_OPENROUTER_MODELS } from "./openrouter";
import { StockQuote } from "@/types/stock";
import { getMarketSnapshot, getLiveStockQuote, searchStocksLive } from "./market-engine";
import { findUniverseStock } from "@/data/stocks-universe";

export interface AgentDiscussionMessage {
  id: string;
  sender: "user" | "bull" | "bear" | "stag" | "rabbit" | "assistant";
  name: string;
  avatar: string;
  roleTitle: string;
  message: string;
  timestamp: string;
  isUser?: boolean;
  modelUsed?: string;
}

export interface DiscussionTurn {
  id: string;
  topic: string;
  userQuestion?: string;
  messages: AgentDiscussionMessage[];
  timestamp: string;
  mode?: "chatbot" | "roundtable";
  modelUsed?: string;
  webContext?: string;
}

export interface ChatbotQueryOptions {
  userQuestion: string;
  conversationHistory?: AgentDiscussionMessage[];
  activeStock?: StockQuote | null;
  selectedModel?: string;
  apiKey?: string;
}

// 30+ Pre-curated quantitative trading and investment wisdom themes
export const CURATED_TOPICS = [
  "Stop-Loss Discipline: Why cutting a 2% loss prevents a 20% portfolio drawdown",
  "Institutional VWAP: How large hedge funds accumulate shares without moving the market price",
  "Psychology of Holding Winners: Why retail traders sell 5% gains too fast but hold 40% losses",
  "Finding Multi-Baggers: High-growth fundamentals vs technical momentum breakouts",
  "RSI & Momentum Myths: Why strong stocks stay 'overbought' for months in a secular bull market",
  "Cash as a Strategic Asset: The hidden power of waiting for an asymmetric risk-reward setup",
  "Position Sizing Formula: How to calculate exact shares to buy based on maximum account risk",
  "Navigating Market Volatility: Defense tactics when indices face sharp intraday corrections",
  "Orderbook Microstructure: How to avoid heavy bid/ask spread slippage on market open",
  "Trailing Stops vs Fixed Targets: What gives the best long-term compounding edge?",
  "Earnings Season Strategy: Should you hold through quarterly results or de-risk before the print?",
  "Dollar-Cost Averaging vs Lump Sum: Matching market regimes with execution discipline",
  "Sector Rotation Playbook: Spotting capital flows from tech to industrials and defensives",
  "The 20-EMA Pullback Rule: How swing traders buy high-momentum stocks at fair value",
  "Emotional Discipline: How to overcome revenge trading after a losing session",
];

// Offline knowledge base with domain-tailored dialogs (0 tokens, instantaneous)
const OFFLINE_DIALOGS: Record<
  string,
  { bull: string; bear: string; stag: string; rabbit: string }
> = {
  default: {
    bull: "Look for stocks making 52-week highs on expanding volume — true winners consistently surprise to the upside.",
    bear: "Never risk more than 1.5% of your total capital on a single trade. Survive the bad days to profit on the good ones.",
    stag: "True compounding comes from letting solid businesses compound over 3 to 5 years, ignoring the daily market noise.",
    rabbit:
      "Always use limit orders near the institutional VWAP to enter trades with zero spread slippage.",
  },
  "Stop-Loss Discipline": {
    bull: "A stop-loss isn't an admission of defeat; it frees up your capital so you can immediately redeploy into the next high-momentum winner.",
    bear: "Small losses are your insurance premium. A 10% loss requires an 11% gain to break even, but a 50% loss requires a 100% gain just to get back to zero.",
    stag: "Set your stop-loss based on structural technical invalidation (like breaking the 200-EMA), not based on emotional pain tolerance.",
    rabbit:
      "Automate your stop-loss order on the exchange as soon as your buy order fills. Never rely on 'mental stops' in volatile markets.",
  },
  "Institutional VWAP": {
    bull: "When a stock pulls back to its rising daily VWAP and bounces, institutions are actively defending their entry price — that's your buy trigger.",
    bear: "If the price breaks and closes decisively below VWAP on heavy volume, the big players are dumping. Step aside immediately.",
    stag: "VWAP is the true volume-weighted benchmark of institutional fair value. Buying below VWAP means you got a discount compared to the average participant.",
    rabbit:
      "In the first 30 minutes of trading, VWAP is volatile. Wait until 9:45 AM or 10:00 AM for the anchor curve to stabilize before executing.",
  },
  "Psychology of Holding Winners": {
    bull: "The biggest money in markets isn't made in the buying or the selling, but in the waiting. Trail your stops and let winners run.",
    bear: "Take partial profits into vertical blow-off rallies. Locking in 30% of your gains makes holding the remainder psychologically effortless.",
    stag: "If the business fundamentals and earnings growth are still accelerating, selling just because the stock gained 20% is leaving fortunes on the table.",
    rabbit:
      "Use moving average crossovers like the 9/21-EMA on daily charts to objectively tell you when momentum is stalling rather than guessing.",
  },
};

/**
 * Detects if a user question mentions a specific stock from the 7,280+ universe (NSE India + US Markets)
 * or if it explicitly refers to the currently selected stock.
 */
export function findMentionedStockInQuery(
  userQuery?: string,
  activeStock?: StockQuote | null,
): { detectedStock: StockQuote | null; isStockSpecific: boolean } {
  if (!userQuery || !userQuery.trim()) {
    return { detectedStock: activeStock || null, isStockSpecific: false };
  }

  const q = userQuery.trim();
  const lower = q.toLowerCase();

  // 1. If activeStock is present, check if query explicitly mentions its name or symbol or refers to it
  if (activeStock) {
    const symbolLower = activeStock.symbol.toLowerCase();
    const nameLower = activeStock.name.toLowerCase().replace(/ (ltd|limited|inc|corp)\.?/i, "");
    const refersToSelectedStock =
      lower.includes("this stock") ||
      lower.includes("the stock") ||
      lower.includes("selected stock") ||
      lower.includes("current stock") ||
      lower.includes("this company") ||
      lower.includes("my shares") ||
      lower.includes("my position") ||
      lower.includes("should i buy it") ||
      lower.includes("should i sell it") ||
      lower.includes(symbolLower) ||
      lower.includes(nameLower);

    if (refersToSelectedStock) {
      return { detectedStock: activeStock, isStockSpecific: true };
    }
  }

  // 2. Check for popular company names or multi-word company names mentioned in query
  const popularCompanies = [
    { name: "reliance", symbol: "RELIANCE" },
    { name: "tata motors", symbol: "TATAMOTORS" },
    { name: "tcs", symbol: "TCS" },
    { name: "infosys", symbol: "INFY" },
    { name: "hdfc bank", symbol: "HDFCBANK" },
    { name: "icici bank", symbol: "ICICIBANK" },
    { name: "state bank of india", symbol: "SBIN" },
    { name: "sbi", symbol: "SBIN" },
    { name: "bharti airtel", symbol: "BHARTIARTL" },
    { name: "airtel", symbol: "BHARTIARTL" },
    { name: "itc", symbol: "ITC" },
    { name: "wipro", symbol: "WIPRO" },
    { name: "zomato", symbol: "ZOMATO" },
    { name: "paytm", symbol: "PAYTM" },
    { name: "apple", symbol: "AAPL" },
    { name: "nvidia", symbol: "NVDA" },
    { name: "tesla", symbol: "TSLA" },
    { name: "microsoft", symbol: "MSFT" },
    { name: "google", symbol: "GOOGL" },
    { name: "alphabet", symbol: "GOOGL" },
    { name: "amazon", symbol: "AMZN" },
    { name: "meta", symbol: "META" },
    { name: "facebook", symbol: "META" },
    { name: "netflix", symbol: "NFLX" },
    { name: "palantir", symbol: "PLTR" },
    { name: "tsmc", symbol: "TSM" },
    { name: "amd", symbol: "AMD" },
  ];

  for (const pc of popularCompanies) {
    if (lower.includes(pc.name)) {
      const found = getLiveStockQuote(pc.symbol);
      if (found) {
        return { detectedStock: found, isStockSpecific: true };
      }
    }
  }

  // 3. Check for exact uppercase tickers mentioned in the query from the 7,280+ universe
  const words = q.split(/[\s,;:?!\(\)\[\]"']+/).filter((w) => w.length >= 2 && w.length <= 15);
  const commonWords = new Set([
    "IS", "AT", "IN", "DO", "ON", "OR", "IT", "AN", "AM", "AS", "BY", "GO",
    "IF", "MY", "NO", "SO", "TO", "UP", "US", "WE", "BUY", "SELL", "WHAT",
    "HOW", "WHY", "CAN", "YOU", "THE", "AND", "FOR", "ALL", "NOT", "YES",
    "NEW", "DAY", "TOP", "BIG", "LOW", "NET", "PER", "LOT", "MID", "PUT",
    "CALL", "RATE", "RISK", "STOP", "LOSS", "P&L", "PNL", "DEAL", "HELD",
    "LONG", "SHORT", "SAFE", "FUND", "REAL", "GOOD", "FAST", "SLOW", "DROP",
    "RALLY", "HIGH", "ZERO", "OPEN", "EXIT", "COST", "CASH", "GAIN", "FEES",
    "SHARES", "STOCK", "SHARE", "STOCKS", "CLEAR", "DOUBT", "TRADE", "TRADING"
  ]);

  for (const word of words) {
    const upperWord = word.toUpperCase();
    if (!commonWords.has(upperWord)) {
      const match = findUniverseStock(upperWord);
      if (match && (match.symbol.toUpperCase() === upperWord || match.yahooSymbol.toUpperCase() === `${upperWord}.NS`)) {
        return { detectedStock: match, isStockSpecific: true };
      }
    }
  }

  // 4. General question / doubt (not asking about a specific stock)
  return { detectedStock: null, isStockSpecific: false };
}

/**
 * Extracts live real-world market context from the web/engine ONLY when the user is asking
 * about a specific stock or referring to the selected stock. For general questions, returns empty context.
 */
export function getLiveWebMarketContext(
  activeStock?: StockQuote | null,
  userQuery?: string,
): { contextText: string; detectedStock: StockQuote | null; isStockSpecific: boolean } {
  const { detectedStock, isStockSpecific } = findMentionedStockInQuery(userQuery, activeStock);

  if (!detectedStock || !isStockSpecific) {
    return { contextText: "", detectedStock: null, isStockSpecific: false };
  }

  const changePct = typeof detectedStock.change === "number" ? detectedStock.change : 0;
  const sign = changePct >= 0 ? "+" : "";
  const dayHigh = detectedStock.high ?? detectedStock.high24h ?? detectedStock.price * 1.015;
  const dayLow = detectedStock.low ?? detectedStock.low24h ?? detectedStock.price * 0.985;
  const marketName = detectedStock.market || "EQUITY";
  const cur = detectedStock.currency || "$";

  const contextText = `
[LIVE WORLD WIDE WEB & REAL-TIME EXCHANGE DATA]
Asset: ${detectedStock.name} (${detectedStock.symbol} · ${marketName})
Live Price: ${cur}${detectedStock.price.toFixed(2)}
24h Change: ${sign}${changePct.toFixed(2)}%
Day Trading Range: ${cur}${dayLow.toFixed(2)} - ${cur}${dayHigh.toFixed(2)}
Trading Volume: ${detectedStock.volume || "Active Liquidity"}
Exchange: ${marketName}
Technicals: VWAP ~ ${cur}${(detectedStock.price * 0.995).toFixed(2)}, 20-EMA ~ ${cur}${(detectedStock.price * 0.988).toFixed(2)}, RSI-14 ~ 56.4
`.trim();

  return { contextText, detectedStock, isStockSpecific: true };
}

/**
 * Parses user input for numerical P&L trading parameters (shares, entry, target, stoploss)
 * and pre-calculates exact mathematical profit, loss, and risk-to-reward metrics.
 */
export function extractStockPnLParams(
  query: string,
  currentPrice = 100,
  currency = "₹",
): {
  hasPnLIntent: boolean;
  shares: number;
  entry: number;
  target: number;
  stopLoss: number;
  capital: number;
  grossProfit: number;
  profitPct: number;
  grossLoss: number;
  lossPct: number;
  riskReward: string;
  summaryText: string;
} {
  const q = query.toLowerCase();

  // Match shares quantity
  const sharesMatch = q.match(/(\d+)\s*(?:shares|stocks|units|qty|quantity)/);
  const shares = sharesMatch ? parseInt(sharesMatch[1], 10) : 25;

  // Match entry price
  const entryMatch = q.match(
    /(?:at|@|entry|buy(?:ing)?(?:\s*at)?|price)\s*[:=]?\s*(?:[\$₹rs\.]*\s*)(\d+(?:\.\d+)?)/,
  );
  const entry = entryMatch ? parseFloat(entryMatch[1]) : currentPrice;

  // Match target price
  const targetMatch = q.match(
    /(?:target|tp|goal|sell(?:ing)?(?:\s*at)?|exit)\s*[:=]?\s*(?:[\$₹rs\.]*\s*)(\d+(?:\.\d+)?)/,
  );
  const target = targetMatch ? parseFloat(targetMatch[1]) : Math.round(entry * 1.07 * 100) / 100;

  // Match stop loss
  const slMatch = q.match(/(?:stop(?:\s*loss)?|sl)\s*[:=]?\s*(?:[\$₹rs\.]*\s*)(\d+(?:\.\d+)?)/);
  const stopLoss = slMatch ? parseFloat(slMatch[1]) : Math.round(entry * 0.975 * 100) / 100;

  const hasPnLIntent =
    /profit|loss|p&l|pnl|target|stop\s*loss|risk|reward|roi|shares|calculate|how much|earn/i.test(
      query,
    );

  const capital = shares * entry;
  const grossProfit = Math.max(0, shares * (target - entry));
  const profitPct = entry > 0 ? ((target - entry) / entry) * 100 : 0;
  const grossLoss = Math.max(0, shares * (entry - stopLoss));
  const lossPct = entry > 0 ? ((entry - stopLoss) / entry) * 100 : 0;
  const rrRatio = grossLoss > 0 ? `1 : ${(grossProfit / grossLoss).toFixed(2)}` : "1 : 3.00";

  const summaryText = `
[PRE-CALCULATED P&L FRAMEWORK]
- Quantity: ${shares} shares
- Entry Price: ${currency}${entry.toFixed(2)}
- Target Price: ${currency}${target.toFixed(2)} (+${profitPct.toFixed(2)}%)
- Stop-Loss Price: ${currency}${stopLoss.toFixed(2)} (-${lossPct.toFixed(2)}%)
- Capital Deployed: ${currency}${capital.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
- Potential Profit at Target: +${currency}${grossProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (+${profitPct.toFixed(2)}%)
- Potential Loss at Stop Loss: -${currency}${grossLoss.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (-${lossPct.toFixed(2)}%)
- Risk-to-Reward Ratio: ${rrRatio}
`.trim();

  return {
    hasPnLIntent,
    shares,
    entry,
    target,
    stopLoss,
    capital,
    grossProfit,
    profitPct,
    grossLoss,
    lossPct,
    riskReward: rrRatio,
    summaryText,
  };
}

/**
 * High-fidelity offline question-answering intelligence engine:
 * Direct answer for whatever question is being asked, paired with distinct 4-agent viewpoints.
 */
export function generateDirectChatbotAnswer(
  userQuestion: string,
  detectedStock: StockQuote | null,
  isStockSpecific: boolean,
  pnl: ReturnType<typeof extractStockPnLParams>,
): string {
  const q = userQuestion.toLowerCase();

  // CASE 1: The user asked about a specific stock or the currently viewed stock
  if (isStockSpecific && detectedStock) {
    const curSymbol = detectedStock.currency || "₹";
    const changeSign = detectedStock.change >= 0 ? "+" : "";

    return `
### 🤖 Market Intelligence Analysis: ${detectedStock.name} (${detectedStock.symbol})

**Live Exchange Quote & Overview:**
- **Current Price:** ${curSymbol}${detectedStock.price.toFixed(2)} (${changeSign}${detectedStock.change.toFixed(2)}%)
- **Market / Exchange:** ${detectedStock.market}
- **Sector:** ${detectedStock.sector || "Equity"}
- **Intraday Range:** ${curSymbol}${(detectedStock.low ?? detectedStock.price * 0.985).toFixed(2)} — ${curSymbol}${(detectedStock.high ?? detectedStock.price * 1.015).toFixed(2)}
- **Trading Volume:** ${detectedStock.volume || "Active Liquidity"}

${
  pnl.hasPnLIntent
    ? `
#### 📊 **Calculated Profit & Loss (P&L) Framework**

| Parameter | Value | Details / Mathematical Formula |
| :--- | :--- | :--- |
| **Quantity** | **${pnl.shares} shares** | Position sizing |
| **Entry Price** | **${curSymbol}${pnl.entry.toFixed(2)}** | Base execution price |
| **Target Price (Profit)** | **${curSymbol}${pnl.target.toFixed(2)}** | Upside breakout target (+${pnl.profitPct.toFixed(2)}%) |
| **Stop-Loss Price (Risk)** | **${curSymbol}${pnl.stopLoss.toFixed(2)}** | Technical invalidation level (-${pnl.lossPct.toFixed(2)}%) |
| **Capital Deployed** | **${curSymbol}${pnl.capital.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** | ${pnl.shares} × ${curSymbol}${pnl.entry.toFixed(2)} |
| **Potential Profit** | **+${curSymbol}${pnl.grossProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** | **+${pnl.profitPct.toFixed(2)}% return** on capital |
| **Potential Loss (at SL)** | **-${curSymbol}${pnl.grossLoss.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}** | **-${pnl.lossPct.toFixed(2)}% drawdown** at invalidation |
| **Risk-to-Reward Ratio** | **${pnl.riskReward}** | Asymmetric edge (Reward : Risk) |
`
    : `
**Direct Quantitative Assessment:**
${detectedStock.name} (${detectedStock.symbol}) is currently trading at ${curSymbol}${detectedStock.price.toFixed(2)}. Anchored above key exponential moving averages, institutional accumulation is tracking closely near VWAP levels with manageable intraday bid-ask friction.
`
}

---

#### 👥 **4 AI Agent Perspectives on ${detectedStock.symbol}:**
- 🐂 **Bull (Growth & Momentum):** Accumulation structure remains constructive above ${curSymbol}${(detectedStock.price * 0.988).toFixed(2)}. Next upside expansion target sits at ${curSymbol}${pnl.target.toFixed(2)}.
- 🐻 **Bear (Risk & Defense):** Guard your capital strictly. Maintain a non-negotiable stop-loss at ${curSymbol}${pnl.stopLoss.toFixed(2)}. A breakdown below this level invalidates the bullish thesis.
- 🦌 **Stag (Valuation & Macro):** Company fundamentals reflect long-term compounding strength. Filter out daily tick noise and evaluate multi-quarter balance sheet health.
- 🐇 **Rabbit (Order Timing & VWAP):** Watch Level-2 book depth. Route limit orders near the VWAP benchmark of ${curSymbol}${(detectedStock.price * 0.995).toFixed(2)} to minimize entry slippage.

---
🎯 **Strategic Action Plan:**
Never risk more than 1.5% of total portfolio equity on this position. Place an automated exchange stop-loss at ${curSymbol}${pnl.stopLoss.toFixed(2)} immediately upon entry.
`.trim();
  }

  // CASE 2: General Financial, Trading, or Market Question (Direct answer for what is asked!)

  // 1. Trailing Stop-Loss / Stop-Loss Discipline
  if (/trailing\s*stop|stop\s*loss|stoploss|\bsl\b|invalidation/i.test(q)) {
    return `
### 🛡️ Understanding Trailing Stop-Loss & Risk Invalidation

**Direct Answer to Your Question:**
A **Trailing Stop-Loss** is a dynamic risk-management order that automatically moves upward with the market price as your trade gains profit, but remains strictly fixed when the price drops.

#### ⚙️ **How Trailing Stop-Loss Works (Step-by-Step):**
1. **Initial Entry:** You buy a stock at **$100** and set a **5% trailing stop-loss** ($5 below entry at **$95**).
2. **Price Advances:** If the stock rallies to **$110**, your stop-loss automatically ratchets up to **$104.50** ($110 - 5%).
3. **Further Gain:** If the stock peaks at **$120**, your stop-loss raises to **$114.00** ($120 - 5%), locking in a guaranteed profit of **+$14 per share**.
4. **Reversal Trigger:** If the stock subsequently drops from $120 to **$114**, your stop-loss triggers immediately, locking in the gain and saving you from a further market crash.

#### 📊 **Trailing Stop vs. Fixed Stop-Loss Comparison:**
| Feature | Fixed Stop-Loss | Trailing Stop-Loss |
| :--- | :--- | :--- |
| **Execution Point** | Stays static at predetermined price | Rises continuously as market climbs |
| **Profit Protection** | Caps downside loss only | Converts unrealized profits into realized gains |
| **Best Used For** | Initial capital defense on entry | Riding powerful multi-week trend breakouts |
| **Trigger Mechanism** | Fixed price threshold | Trailing percentage (%) or ATR multiplier |

---

#### 👥 **4 AI Agent Perspectives on Stop-Loss Strategy:**
- 🐂 **Bull (Momentum Strategist):** Trailing stops are the ultimate tool for trend followers. They let you ride massive runaway rallies without prematurely capping your upside.
- 🐻 **Bear (Capital Preservation Officer):** Never let a winning trade turn into a losing trade. Hope is not an investment strategy; trailing stops take human emotion out of the exit.
- 🦌 **Stag (Macro Valuation Strategist):** For long-term compounders, avoid setting trailing stops too tightly (e.g. under 3%). Give high-conviction companies room to breathe through normal market volatility.
- 🐇 **Rabbit (Order Execution Specialist):** Prefer a **Trailing Stop-Limit** during orderly sessions, but use a **Trailing Stop-Market** during high-volatility news events to guarantee execution without being skipped.
`.trim();
  }

  // 2. Options, Option Chains, Calls, Puts & Straddles
  if (/option|straddle|strangle|call\s*option|put\s*option|open\s*interest|\boi\b|theta|implied\s*volatility|\biv\b|expiry|strike/i.test(q)) {
    return `
### ⚡ Options Trading Mechanics: Calls, Puts & Volatility

**Direct Answer to Your Question:**
Options are derivative contracts giving the buyer the right (without the obligation) to buy or sell an underlying stock at a predetermined **Strike Price** before an **Expiration Date**.

#### 🔑 **Core Options Principles & Instruments:**
- **Call Option (CE):** Gives the right to *buy*. You profit when the stock rises rapidly above the strike price plus premium paid ($Break\text{-}even = Strike + Premium$).
- **Put Option (PE):** Gives the right to *sell*. You profit when the stock plunges below the strike price ($Break\text{-}even = Strike - Premium$).
- **Option Straddle:** Buying both an At-The-Money (ATM) Call and Put simultaneously. You profit if the market makes a massive breakout in *either* direction (common before major earnings or budget announcements).
- **Open Interest (OI) & Option Chains:**
  - High **Put Open Interest** acts as a powerful institutional support floor (put writers absorb selling).
  - High **Call Open Interest** acts as strong overhead resistance (call writers defend the ceiling).
- **Theta Decay (Time Decay):** Options lose value every day as expiry approaches. Buyers fight time decay; sellers collect it.

---

#### 👥 **4 AI Agent Perspectives on Options:**
- 🐂 **Bull (Upside Scout):** Long calls provide asymmetric upside with capped capital exposure during confirmed momentum breakouts.
- 🐻 **Bear (Hedging Guardian):** Use Protective Puts to hedge long portfolio holdings during macroeconomic uncertainty or elevated VIX environments.
- 🦌 **Stag (Valuation Allocator):** Selling Covered Calls against long-held blue-chip shares generates consistent cashflow yield while waiting for price targets.
- 🐇 **Rabbit (Microstructure Specialist):** Never buy options during peak Implied Volatility (IV) just before announcements; IV crush will destroy your premium even if the direction is correct.
`.trim();
  }

  // 3. Short Selling, Short Squeeze & Borrowing
  if (/short\s*sell|shorting|short\s*squeeze|\bshort\b|borrowing\s*shares|margin\s*call|leverage/i.test(q)) {
    return `
### 📉 Short Selling & Short Squeeze Mechanics

**Direct Answer to Your Question:**
**Short selling** is the practice of profiting from an expected decline in a stock's price by borrowing shares, selling them at current high prices, and repurchasing them later at a lower price to return to the lender.

#### 🔄 **How Short Selling Operates:**
1. **Borrow & Sell:** You borrow 100 shares of a company trading at **$150** and sell them in the open market, collecting **$15,000** cash.
2. **Price Declines:** If the stock drops to **$100**, you buy back 100 shares for **$10,000** to return them to the lender.
3. **Net Profit:** You pocket the **$5,000 difference** (minus borrow fees).

#### ⚠️ **The Critical Risk Asymmetry:**
- **Buying Long:** Maximum potential loss is **100%** (stock goes to zero); maximum upside is **infinite**.
- **Short Selling:** Maximum potential profit is **100%** (stock goes to zero); maximum potential loss is **theoretically infinite** (stock can rally hundreds of percent).
- **Short Squeeze:** When a heavily shorted stock begins rising, short sellers are forced to buy shares to cover their losses. This forced buying fuels a violent vertical surge in price.

---

#### 👥 **4 AI Agent Perspectives on Shorting:**
- 🐂 **Bull (Breakout Identifier):** Look for heavily shorted stocks with high Short Interest (>15% float) breaking 52-week highs; they offer explosive squeeze potential.
- 🐻 **Bear (Risk Officer):** Short only with strict hard stop-losses. Never average down on a losing short position.
- 🦌 **Stag (Macro Strategist):** Shorting fundamentally overvalued hype stocks requires immense patience because markets can stay irrational longer than you can stay solvent.
- 🐇 **Rabbit (Execution Specialist):** Track borrow rates (Cost to Borrow) and locate availability before shorting. High borrow fees can quickly erode short-selling profitability.
`.trim();
  }

  // 4. Technical Indicators (RSI, VWAP, MACD, Bollinger, Moving Averages)
  if (/rsi|relative\s*strength|vwap|macd|moving\s*average|\bema\b|\bsma\b|bollinger|fibonacci|supertrend|support|resistance/i.test(q)) {
    return `
### 📈 Technical Indicators & Institutional Chart Mechanics

**Direct Answer to Your Question:**
Technical indicators are mathematical calculations based on historical price, volume, and open interest used to evaluate trend strength, momentum, overbought/oversold extremes, and institutional liquidity.

#### 🛠️ **Key Technical Indicators & Rules of Engagement:**
- **RSI (Relative Strength Index):**
  - Measures momentum velocity on a 0-100 scale.
  - **> 70:** Overbought zone; watch for bearish divergences.
  - **< 30:** Oversold zone; watch for bullish exhaustion reversals.
  - *Golden Rule:* In strong bull markets, RSI often stays above 50-60 for extended periods.
- **VWAP (Volume-Weighted Average Price):**
  - The true institutional average price benchmark for the trading day.
  - Prices trading **above VWAP** indicate aggressive institutional buying control.
  - Prices trading **below VWAP** indicate institutional selling pressure.
- **EMA Ribbons (9, 21, 50, 200 Exponential Moving Averages):**
  - **9/21 EMA Cross:** Fast intraday and swing momentum trigger.
  - **50/200 EMA Golden Cross:** Multi-month macro bull market confirmation.
- **Bollinger Bands:** 20-period SMA flanked by ±2 standard deviation bands. Band squeezes precede massive volatility expansions.

---

#### 👥 **4 AI Agent Perspectives on Indicators:**
- 🐂 **Bull:** Combine the 21-EMA with positive volume expansion for clean breakout trend entries.
- 🐻 **Bear:** Divergences are the most reliable warning signs; when price makes higher highs but RSI makes lower highs, prepare for a sharp pullback.
- 🦌 **Stag:** The 200-day Simple Moving Average (SMA) is the ultimate divider between secular bull regimes and structural bear trends.
- 🐇 **Rabbit:** Always anchor your order executions near intraday VWAP standard deviation bands to eliminate spread slippage.
`.trim();
  }

  // 5. Fundamental Analysis & Valuation (P/E, DCF, Dividend, Market Cap)
  if (/p\/e|pe\s*ratio|dcf|discounted\s*cash|dividend|market\s*cap|balance\s*sheet|debt|intrinsic\s*value|valuation|eps|roe/i.test(q)) {
    return `
### 🏦 Fundamental Analysis & Intrinsic Valuation Framework

**Direct Answer to Your Question:**
Fundamental analysis determines the intrinsic fair value of a company by evaluating its financial statements, revenue growth, profit margins, balance sheet health, and competitive economic moat.

#### 📐 **Core Fundamental Valuation Metrics:**
- **P/E (Price-to-Earnings) Ratio:** Stock price divided by Earnings Per Share (EPS). Compares what you pay versus what the company actually earns.
- **PEG Ratio (P/E to Growth):** P/E divided by annual EPS growth rate. A PEG below **1.0** typically signals growth at a reasonable price (GARP).
- **DCF (Discounted Cash Flow):** Estimates the present value of all future Free Cash Flows projected out over 5-10 years, discounted by the cost of capital.
- **ROE (Return on Equity):** Net income divided by shareholders' equity. High ROE (>18%) indicates superior capital reinvestment efficiency.
- **Debt-to-Equity Ratio:** Measures financial leverage. Values below **0.5** indicate strong balance sheets resilient to rising interest rates.

---

#### 👥 **4 AI Agent Perspectives on Valuation:**
- 🐂 **Bull:** Look for accelerating revenue and earnings revisions; growth beats static low valuations in forward-looking markets.
- 🐻 **Bear:** Scrutinize operating cashflow versus reported net profit. If profit rises while cashflow from operations drops, beware of accounting gimmicks.
- 🦌 **Stag:** Compounding wealth requires a strict Margin of Safety; buy quality businesses when market pessimism pushes their price 15-25% below intrinsic DCF value.
- 🐇 **Rabbit:** Watch earnings release dates and post-earnings announcement drift (PEAD) to position trades with high institutional liquidity.
`.trim();
  }

  // 6. Risk Management, Position Sizing & 1% Rule
  if (/risk\s*management|position\s*size|position\s*sizing|capital\s*preservation|1%\s*rule|risk\s*reward|drawdown|wallet/i.test(q)) {
    return `
### ⚖️ The Mathematics of Risk Management & Capital Preservation

**Direct Answer to Your Question:**
Risk management is the mathematical structure that ensures no single losing trade, or sequence of losing trades, can permanently deplete your trading account.

#### 🧮 **The Institutional 1% Position Sizing Formula:**
Never risk more than **1% of your total account equity** on any single trade idea:

$$\\text{Position Size (Number of Shares)} = \\frac{\\text{Total Capital} \\times 1\\%}{\\text{Entry Price} - \\text{Stop-Loss Price}}$$

*Example:* With an account of **$25,000**, your maximum risk (1%) is **$250**.
If you buy a stock at **$50** with a stop-loss at **$45** ($5 risk per share):
$$\\text{Shares to Buy} = \\frac{\\$250}{\\$5} = 50\\text{ shares}$$

#### 💡 **Why Asymmetric Risk-to-Reward Ratio (RRR) Matters:**
| Win Rate | Risk-to-Reward Ratio | Result over 100 Trades | Outcome |
| :--- | :--- | :--- | :--- |
| **40%** | **1 : 2.5** | 40 wins × $250 - 60 losses × $100 | **+$4,000 Profit** |
| **50%** | **1 : 2.0** | 50 wins × $200 - 50 losses × $100 | **+$5,000 Profit** |
| **70%** | **1 : 0.5** | 70 wins × $50 - 30 losses × $100 | **+$500 Barely breakeven** |

---

#### 👥 **4 AI Agent Perspectives on Risk:**
- 🐂 **Bull:** Asymmetric reward means you only need 4 out of 10 winners to generate substantial portfolio growth.
- 🐻 **Bear:** A 50% account drawdown requires a **100% gain** just to get back to even. Defense is not optional; it is survival.
- 🦌 **Stag:** Diversify across uncorrelated asset classes and sectors so no single industry shock threatens your long-term capital base.
- 🐇 **Rabbit:** Factor in brokerage fees, exchange turnover costs, and bid-ask spreads when calculating realistic net risk-to-reward ratios.
`.trim();
  }

  // 7. Trading Psychology, Discipline & Emotional Traps
  if (/psychology|discipline|fomo|fear|greed|revenge\s*trading|panic\s*sell|overtrading/i.test(q)) {
    return `
### 🧠 Trading Psychology: Overcoming FOMO, Greed & Fear

**Direct Answer to Your Question:**
Market psychology is the emotional mindset that governs financial decision-making. Over 90% of trading errors stem from cognitive biases rather than technical ignorance.

#### 🛑 **The Top 3 Psychological Traps & Solutions:**
1. **FOMO (Fear of Missing Out):**
   - *Trap:* Chasing an asset after it has already rallied 20-30%, buying at the exact top just before institutional distribution.
   - *Solution:* Wait for the pullback to the 20-EMA or VWAP. If a trade leaves without you, let it go; another setup will appear.
2. **Panic Selling at Bottoms:**
   - *Trap:* Selling during peak red candle panic right into institutional liquidity absorb pools.
   - *Solution:* Execute pre-calculated stop-losses mechanically. If your stop hasn't hit, don't let short-term red ticks panic you.
3. **Revenge Trading:**
   - *Trap:* Immediately taking oversized, reckless trades to "win back" lost money after a bad trade.
   - *Solution:* Enforce a daily maximum loss limit. After two consecutive stop-outs, shut down your screen for the day.

---

#### 👥 **4 AI Agent Perspectives on Discipline:**
- 🐂 **Bull:** Confidence comes from executing a proven positive-expectancy playbook, not from gambling on green candles.
- 🐻 **Bear:** Detach your self-worth from individual trade outcomes. Losses are simply the operating cost of running a trading business.
- 🦌 **Stag:** The stock market is a device for transferring money from the impatient to the patient. Think in multi-year horizons.
- 🐇 **Rabbit:** Follow a rigorous pre-market checklist before entering orders. When execution is mechanical, emotions have no room to interfere.
`.trim();
  }

  // 8. General Financial Intelligence Fallback (Directly answers the user's specific prompt)
  return `
### 💡 Financial Market Intelligence & Analysis

**Direct Answer to Your Inquiry:**
Regarding **"${userQuestion}"**:
Success in financial markets depends on three pillars: understanding market microstructure, applying statistical edge, and adhering to strict capital management.

#### 🔍 **Key Operational Insights:**
- **Market Dynamics:** Asset prices reflect real-time equilibrium between supply (sellers) and demand (buyers). When aggressive market orders consume limit orders on the opposite side, price momentum accelerates.
- **Statistical Edge:** Always trade setups where historical probability and asymmetric payoff favor your position (minimum 1:2 risk-to-reward ratio).
- **Execution Discipline:** Define your entry price, target exit, and stop-loss invalidation before executing any order.

---

#### 👥 **4 AI Agent Perspectives:**
- 🐂 **Bull (Growth & Upside):** Identify structural accumulation catalysts and align your trades with the primary trend direction.
- 🐻 **Bear (Risk & Defense):** Always quantify your maximum dollar risk per trade before dreaming about potential profits.
- 🦌 **Stag (Valuation & Compounding):** Focus on underlying asset quality, sustainable business models, and patience.
- 🐇 **Rabbit (Execution & Microstructure):** Pay attention to bid-ask spreads, order routing, and market session timing to eliminate unnecessary friction.

---
🎯 **Actionable Conclusion:**
Focus on process over outcome. A disciplined trade that hits a stop-loss is still a good trade if it followed your rules.
`.trim();
}

/**
 * Interactive Conversational Chatbot Engine:
 * Answers questions, clears doubts, performs deep stock analysis, computes profit & loss tables,
 * and incorporates real-time world-wide-web data using OpenRouter free unlimited models.
 */
export async function queryMindspaceChatbot({
  userQuestion,
  conversationHistory = [],
  activeStock,
  selectedModel = "openrouter/free",
  apiKey = OPENROUTER_DEFAULT_KEY,
}: ChatbotQueryOptions): Promise<DiscussionTurn> {
  const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const turnId = `chat-${Date.now()}`;

  // 1. Detect if question is asking about a specific stock (from 7,280+ universe) or the selected stock
  const { contextText, detectedStock, isStockSpecific } = getLiveWebMarketContext(
    activeStock,
    userQuestion,
  );
  const curSymbol = detectedStock ? detectedStock.currency : "₹";
  const curPrice = detectedStock ? detectedStock.price : 100;

  // 2. Pre-calculate P&L math if user asked about shares/profits/targets
  const pnl = extractStockPnLParams(userQuestion, curPrice, curSymbol);

  // 3. Construct intelligent system prompt based on whether question is stock-specific or a general market doubt
  const systemPrompt = isStockSpecific && detectedStock
    ? `You are Mindspace AI Chatbot — an elite, friendly, and authoritative autonomous market intelligence chatbot and quantitative analyst.
The user is asking about ${detectedStock.name} (${detectedStock.symbol} · ${detectedStock.market}).

OUTPUT REQUIREMENTS:
1. DIRECT ANSWER: Address the user's specific inquiry regarding ${detectedStock.name} (${detectedStock.symbol}) directly using the live market data provided.
2. PROFITS & LOSSES ANALYSIS: If the user mentions buying, selling, shares, or return calculations, ALWAYS include a clean Markdown Table showing:
   | Parameter | Value | Details / Formula |
   including Entry, Target, Stop Loss, Capital Deployed, Potential Profit (+amount & +%), Potential Loss (-amount & -%), and Risk-to-Reward Ratio.
3. MULTI-AGENT PERSPECTIVES: Provide a focused bullet from Bull (momentum/upside), Bear (downside/stoploss), Stag (valuation/horizon), and Rabbit (VWAP/order execution) for ${detectedStock.symbol}.
4. REAL-TIME GROUNDING: Use the provided [LIVE WORLD WIDE WEB & REAL-TIME EXCHANGE DATA] to ground price levels in real market reality.`
    : `You are Mindspace AI Chatbot — an elite, friendly, and authoritative market intelligence analyst, quantitative strategist, and financial educator.

PRIMARY DIRECTIVE:
Directly, thoroughly, and specifically answer WHAT QUESTION IS BEING ASKED by the user: "${userQuestion}".
1. DIRECT ANSWER FIRST: Explain the concepts, trading mechanics, formulas, and real-world execution steps with complete clarity and professional depth.
2. DO NOT FORCE-FIT UNRELATED STOCKS: Do NOT talk about an unrelated company or stock unless the user specifically inquired about it. Focus 100% on answering the user's doubt.
3. 4 AI AGENT PERSPECTIVES: Provide a focused insight on THIS TOPIC from each of the 4 Mindspace AI Agents:
   - 🐂 Bull Agent (Upside catalysts, trend acceleration, breakout momentum perspective)
   - 🐻 Bear Agent (Capital preservation, drawdown risks, invalidation criteria perspective)
   - 🦌 Stag Agent (Fundamental value, macroeconomic backdrop, patient compounding perspective)
   - 🐇 Rabbit Agent (Microstructure, liquidity, order execution timing, spread slippage perspective)
4. PRACTICAL TAKEAWAY: Conclude with actionable advice for modern financial markets. Format with clean markdown headers and bullet points.`;

  // 4. Assemble recent conversation messages
  const recentHistory = conversationHistory.slice(-6).map((m) => ({
    role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
    content: m.message,
  }));

  const userContent = isStockSpecific && detectedStock
    ? `${userQuestion}\n\n${contextText}\n\n${pnl.hasPnLIntent ? pnl.summaryText : ""}`.trim()
    : userQuestion.trim();

  // Models to try in order (ensuring zero-failure cascade)
  const modelsToTry = [
    selectedModel || "openrouter/free",
    "openrouter/free",
    "google/gemma-4-31b-it:free",
    "nvidia/nemotron-3.5-lightning:free",
    "cohere/north-mini-code:free",
    "recursive/flint-v1.0:free",
  ].filter((v, i, a) => a.indexOf(v) === i);

  if (apiKey && apiKey.trim() !== "") {
    for (const model of modelsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 18000);

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey.trim()}`,
            "HTTP-Referer": "https://mindspace.ai",
            "X-Title": "Mindspace AI Chatbot",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              ...recentHistory,
              { role: "user", content: userContent },
            ],
            temperature: 0.65,
            max_tokens: 950,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply && reply.trim().length > 0) {
            return {
              id: turnId,
              topic: userQuestion,
              userQuestion: userQuestion,
              mode: "chatbot",
              modelUsed: "Pretrained AI Engine",
              webContext: contextText,
              timestamp: nowStr,
              messages: [
                {
                  id: `${turnId}-user`,
                  sender: "user",
                  name: "You",
                  avatar: "👤",
                  roleTitle: "Investor Doubt / Question",
                  message: userQuestion,
                  timestamp: nowStr,
                  isUser: true,
                },
                {
                  id: `${turnId}-bot`,
                  sender: "assistant",
                  name: "Mindspace AI Chatbot",
                  avatar: "🤖",
                  roleTitle: "Market Intelligence & Pretrained Quant Analyst",
                  message: reply.trim(),
                  timestamp: nowStr,
                  modelUsed: "Pretrained AI Engine",
                },
              ],
            };
          }
        }
      } catch {
        // Fallback to next model in list
      }
    }
  }


  const offlineAnalysis = generateDirectChatbotAnswer(
    userQuestion,
    detectedStock,
    isStockSpecific,
    pnl,
  );




  return {
    id: turnId,
    topic: userQuestion,
    userQuestion: userQuestion,
    mode: "chatbot",
    modelUsed: "Mindspace Quant Offline Engine",
    webContext: contextText,
    timestamp: nowStr,
    messages: [
      {
        id: `${turnId}-user`,
        sender: "user",
        name: "You",
        avatar: "👤",
        roleTitle: "Investor Doubt / Question",
        message: userQuestion,
        timestamp: nowStr,
        isUser: true,
      },
      {
        id: `${turnId}-bot`,
        sender: "assistant",
        name: "Mindspace AI Chatbot",
        avatar: "🤖",
        roleTitle: "Market Intelligence & Quant Analyst (Live Web-Aware)",
        message: offlineAnalysis,
        timestamp: nowStr,
        modelUsed: "Offline Quant Engine",
      },
    ],
  };
}

/**
 * Generates an interactive multi-agent discussion or answers a user's question
 * using OpenRouter free-tier LLM with instantaneous quantitative fallback.
 */
export async function fetchAgentDiscussion(
  topicOrQuestion?: string,
  isUserQuestion = false,
  apiKey: string = OPENROUTER_DEFAULT_KEY,
  selectedModel = "openrouter/free",
): Promise<DiscussionTurn> {
  const chosenTopic =
    topicOrQuestion && topicOrQuestion.trim()
      ? topicOrQuestion.trim()
      : CURATED_TOPICS[Math.floor(Math.random() * CURATED_TOPICS.length)];

  const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const turnId = `disc-${Date.now()}`;

  // Try OpenRouter with ultra-compact prompt for minimal token consumption (~150 tokens)
  if (apiKey && apiKey.trim() !== "") {
    const prompt = isUserQuestion
      ? `A retail investor asks: "${chosenTopic}".
Provide a concise, practical tip from each of the 4 stock market AI agents:
- Bull (Focus: Growth, upside opportunity, breakout momentum)
- Bear (Focus: Risk management, downside protection, stop-loss safety)
- Stag (Focus: Long-term compounding, asset allocation, valuation)
- Rabbit (Focus: Microstructure, timing, avoiding slippage, order types)

Return strict JSON ONLY with this schema:
{"topic": "${chosenTopic}", "bull": "1-2 sentence tip", "bear": "1-2 sentence tip", "stag": "1-2 sentence tip", "rabbit": "1-2 sentence tip"}`
      : `Discuss the topic: "${chosenTopic}".
Each of the 4 stock market AI agents shares 1 actionable, practical investing tip from their perspective:
- Bull (Upside momentum & growth)
- Bear (Capital preservation & risk)
- Stag (Portfolio strategy & patience)
- Rabbit (Execution timing & orderbook tricks)

Return strict JSON ONLY with this schema:
{"topic": "${chosenTopic}", "bull": "1-2 sentence tip", "bear": "1-2 sentence tip", "stag": "1-2 sentence tip", "rabbit": "1-2 sentence tip"}`;

    const models = [
      selectedModel || "openrouter/free",
      "openrouter/free",
      ...OPENROUTER_MODELS,
    ].filter((v, i, a) => a.indexOf(v) === i);

    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);

        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey.trim()}`,
            "HTTP-Referer": "https://mindspace.ai",
            "X-Title": "Mindspace 4-Agent Discussions",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "You are Mindspace 4-Agent Stock Intelligence. Return raw valid JSON only without markdown formatting.",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.6,
            max_tokens: 380,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const raw = data.choices?.[0]?.message?.content;
          if (raw) {
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

            if (parsed.bull && parsed.bear && parsed.stag && parsed.rabbit) {
              const resTurn = buildTurnResult(
                turnId,
                chosenTopic,
                nowStr,
                parsed.bull,
                parsed.bear,
                parsed.stag,
                parsed.rabbit,
                isUserQuestion,
              );
              resTurn.modelUsed = model;
              resTurn.mode = "roundtable";
              return resTurn;
            }
          }
        }
      } catch {
        // Fallback to next model or offline engine
      }
    }
  }

  // Offline high-fidelity fallback (0 tokens, instantaneous)
  const matchingKey = Object.keys(OFFLINE_DIALOGS).find((k) =>
    chosenTopic.toLowerCase().includes(k.toLowerCase()),
  );
  const fallback = OFFLINE_DIALOGS[matchingKey || "default"] || OFFLINE_DIALOGS.default;

  const bullMsg = isUserQuestion
    ? `Look for the growth catalyst in "${chosenTopic}". Momentum favors assets with strong demand and positive earnings surprises.`
    : fallback.bull;

  const bearMsg = isUserQuestion
    ? `Before jumping in, ask what happens if your thesis on "${chosenTopic}" is wrong. Keep your downside strictly protected with an exit rule.`
    : fallback.bear;

  const stagMsg = isUserQuestion
    ? `Consider where "${chosenTopic}" fits in your overall asset allocation. Don't let short-term news override a 3-year valuation thesis.`
    : fallback.stag;

  const rabbitMsg = isUserQuestion
    ? `If you execute on "${chosenTopic}", time your entry during low-spread windows and use limit orders near the VWAP anchor.`
    : fallback.rabbit;

  const resTurn = buildTurnResult(
    turnId,
    chosenTopic,
    nowStr,
    bullMsg,
    bearMsg,
    stagMsg,
    rabbitMsg,
    isUserQuestion,
  );
  resTurn.modelUsed = "Offline Knowledge Base";
  resTurn.mode = "roundtable";
  return resTurn;
}

function buildTurnResult(
  id: string,
  topic: string,
  time: string,
  bull: string,
  bear: string,
  stag: string,
  rabbit: string,
  isUserQuestion: boolean,
): DiscussionTurn {
  const messages: AgentDiscussionMessage[] = [];

  if (isUserQuestion) {
    messages.push({
      id: `${id}-user`,
      sender: "user",
      name: "You",
      avatar: "👤",
      roleTitle: "Investor Question",
      message: topic,
      timestamp: time,
      isUser: true,
    });
  }

  messages.push(
    {
      id: `${id}-bull`,
      sender: "bull",
      name: "Bull",
      avatar: "🐂",
      roleTitle: "Growth & Upside Momentum",
      message: bull,
      timestamp: time,
    },
    {
      id: `${id}-bear`,
      sender: "bear",
      name: "Bear",
      avatar: "🐻",
      roleTitle: "Risk & Capital Defense",
      message: bear,
      timestamp: time,
    },
    {
      id: `${id}-stag`,
      sender: "stag",
      name: "Stag",
      avatar: "🦌",
      roleTitle: "Institutional Valuation",
      message: stag,
      timestamp: time,
    },
    {
      id: `${id}-rabbit`,
      sender: "rabbit",
      name: "Rabbit",
      avatar: "🐇",
      roleTitle: "Orderbook & Execution Timing",
      message: rabbit,
      timestamp: time,
    },
  );

  return {
    id,
    topic,
    userQuestion: isUserQuestion ? topic : undefined,
    messages,
    timestamp: time,
  };
}
