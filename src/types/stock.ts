export type TimeHorizon = "1D" | "1W" | "1M" | "6M" | "1Y" | "5Y";

export type AgentRole = "bull" | "bear" | "stag" | "rabbit";

export interface StockQuote {
  name: string;
  symbol: string;
  yahooSymbol?: string;
  price: number;
  bid: number;
  ask: number;
  spread: number;
  open?: number;
  prevClose?: number;
  currency: string;
  change: number; // percentage, e.g. +1.24 or -1.45
  changeAmount?: number;
  market: string; // "NSE" | "BSE" | "NASDAQ" | "NYSE" | "CRYPTO"
  sector?: string;
  high?: number;
  low?: number;
  high24h?: number;
  low24h?: number;
  volume: string;
  peRatio?: number;
  marketCap?: string;
  description?: string;
  lastTickDirection?: "up" | "down" | "flat";
  lastUpdated?: string;
}

export interface CandleData {
  time: string;
  timestamp?: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema20?: number;
  bollingerUpper?: number;
  bollingerLower?: number;
  vwap?: number;
  isForecast?: boolean;
  forecastUpper?: number;
  forecastLower?: number;
}

export interface MLSubModelMetric {
  name: string;
  methodology?: string;
  weight: number;
  ensembleWeight?: number;
  directionalAccuracy: number;
  mae: number;
  rmse: number;
  predictedPrice: number;
}

export interface MLModelReport {
  modelName: string;
  ensembleName?: string;
  architecture: string;
  trainValTestSplit: string;
  stationarityCheck: string;
  ensembleDirectionalAccuracy: number;
  validationMAE: number;
  validationRMSE: number;
  technicalIndicators: {
    rsi14: number;
    macd: number;
    ema20: number;
    ema50: number;
    vwap: number;
    atr14: number;
    bollingerUpper: number;
    bollingerLower: number;
  };
  subModels: MLSubModelMetric[];
}

export interface AgentAnalysis {
  role: AgentRole;
  agentName: string;
  avatar: string; // emoji e.g. "🐂"
  roleDescription: string;
  focusTopic: string;
  stance: "Bullish" | "Bearish" | "Neutral";
  targetPrice: number;
  stopLossPrice: number;
  horizon: TimeHorizon;
  commentary: string;
  keyMetrics: Array<{ label: string; value: string; positive?: boolean }>;
  actionRecommendation: string;
  confidencePct: number;
  status: "idle" | "walking" | "drinking_coffee" | "working" | "ready";
}

export interface HorizonAgentSummary {
  role: AgentRole;
  agentName: string;
  avatar: string;
  roleDescription: string;
  stance: "Bullish" | "Bearish" | "Neutral";
  targetPrice: number;
  stopLossPrice: number;
  expectedReturnPct: number;
  commentary: string;
  actionRecommendation: string;
  confidencePct: number;
}

export interface HorizonForecastDetail {
  horizon: TimeHorizon;
  price: number;
  changePct: number; // positive for predicted profit, negative for predicted loss
  bias: string; // "PROFIT" | "LOSS"
  isProfitPredicted: boolean;
  profitProbability: number; // 0-100%
  lossProbability: number; // 0-100%
  stopLossPrice: number;
  stopLossPct: number;
  projectedPLAmount: number; // signed P&L for shares count
  verdict:
    "STRONG BUY" | "BUY" | "ACCUMULATE" | "HOLD" | "TAKE PROFIT" | "SELL / AVOID" | "BOOK LOSS";
  withdrawTiming: string;
  buyingDate?: string;
  targetDate?: string;
  targetDateLabel?: string;
  fixedRate?: number;
  agents: Record<AgentRole, HorizonAgentSummary>;
}

export interface AgentLiveAlert {
  id: string;
  agentId: AgentRole;
  agentRole?: AgentRole;
  agentName: string;
  avatar: string;
  symbol: string;
  topic: string;
  signal: string;
  title?: string;
  message: string;
  severity?: "bullish" | "bearish" | "strategy" | "execution";
  priceAtAlert: number;
  currency?: string;
  timestamp: string;
}

export interface StockPrediction {
  stock: StockQuote;
  horizon: TimeHorizon;
  timestamp: string;
  consensusVerdict:
    | "STRONG BUY"
    | "BUY"
    | "ACCUMULATE"
    | "HOLD"
    | "TAKE PROFIT"
    | "EXIT"
    | "SELL / AVOID"
    | "BOOK LOSS";
  accuracyRate: number; // e.g. 91.8%
  confidenceScore: number; // 0-100

  // Honest Profit vs Loss Prediction & Probabilities
  isProfitPredicted: boolean;
  profitProbability: number; // 0-100%
  lossProbability: number; // 0-100%
  expectedReturnPct: number; // positive if profit, negative if loss
  expectedPLAmount: number; // positive if profit, negative if loss

  // Investment & withdrawal advisory (Shares quantity entered by user)
  sharesQuantity?: number;
  totalInvestmentCapital?: number;
  recommendedInvestAmount: number;
  recommendedInvestPct: number; // e.g. 15% of portfolio
  entryPrice: number;

  // Market session state
  marketStatus?: {
    isOpen: boolean;
    marketCode: string;
    badge: string;
    sessionMessage: string;
  };

  // When to withdraw (Profit or Target)
  targetPrice: number;
  fixedTargetRate?: number;
  buyingDate?: string;
  targetDate?: string;
  targetDateLabel?: string;
  targetGainPct: number;
  withdrawProfitDate: string; // estimated timeframe to exit for profit
  projectedProfitAmount: number;

  // When to withdraw (Cut Loss)
  stopLossPrice: number;
  stopLossLossPct: number;
  withdrawCutLossDate: string; // estimated timeframe or condition to exit
  projectedLossAmount: number;

  // Scenario ranges
  forecastMidpoint: number;
  scenarioRange: {
    bearishLow: number;
    baseTarget: number;
    bullishHigh: number;
  };

  // Multi-Horizon Forecasts (1D, 1W, 1M, 6M, 1Y, 5Y) with 4-agent reports & probabilities
  horizonForecasts: Record<TimeHorizon, HorizonForecastDetail>;

  // Individual agent analyses (4 specialized topics) for active horizon
  agentConsensus: Record<AgentRole, AgentAnalysis>;

  // Open-Source ML Ensemble Report
  mlReport: MLModelReport;

  // Summary
  rationale: string;
  isAiGenerated: boolean;
  modelUsed?: string;
}

export interface SimulationOrder {
  id: string;
  timestamp: string;
  timeString: string;
  side: "BUY" | "SELL";
  orderType?: "MARKET" | "LIMIT";
  executionType?: string;
  symbol: string;
  name: string;
  qty: number;
  price: number;
  bidAtExec?: number;
  askAtExec?: number;
  total: number;
  currency: string;
  status: "EXECUTED" | "PENDING";
}

export interface SimulationPosition {
  symbol: string;
  name: string;
  qty: number;
  avgCost: number;
  currentPrice: number;
  bidPrice?: number;
  askPrice?: number;
  currency: string;
  marketValue: number;
  unrealizedPL: number;
  unrealizedPLPct: number;
}

export interface SimulationState {
  cash: number;
  startingCash: number;
  positions: Record<string, SimulationPosition>;
  orders: SimulationOrder[];
  realizedPL: number;
}
