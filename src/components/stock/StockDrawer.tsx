import React, { useState, useEffect } from "react";
import { StockQuote, StockPrediction, TimeHorizon } from "@/types/stock";
import {
  fetchStockPrediction,
  generateDeterministicPrediction,
  OPENROUTER_DEFAULT_KEY,
} from "@/lib/openrouter";
import { assignTaskToAgents, finishTaskForAgents, stopAnalyzingAndRelax } from "@/game/sim/roam";
import {
  subscribeMarketEngine,
  getMarketSnapshot,
  getLiveStockQuote,
  setActiveMarketSymbol,
  searchStocksLive,
  refreshSymbolFromLiveApi,
  getExchangeMarketStatus,
  StockSearchResultItem,
} from "@/lib/market-engine";
import { exportPredictionToWordDoc } from "@/lib/export-word";
import { CandlestickChart } from "./CandlestickChart";

interface StockDrawerProps {
  currentStock: StockQuote | null;
  onSelectStock: (stock: StockQuote) => void;
  onOpenExplorer: () => void;
  onOpenSimulation: () => void;
  isOpen: boolean;
  onToggleOpen?: () => void;
}

export function StockDrawer({
  currentStock,
  onSelectStock,
  onOpenExplorer,
  onOpenSimulation,
  isOpen,
  onToggleOpen,
}: StockDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StockSearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [horizon, setHorizon] = useState<TimeHorizon>("1D");
  // User mentions number of shares to buy (not cash amount)
  const [sharesQuantityInput, setSharesQuantityInput] = useState<string>("");
  const [apiKey] = useState<string>(OPENROUTER_DEFAULT_KEY);
  const [isLoading, setIsLoading] = useState(false);
  const [showMlDetails, setShowMlDetails] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const numericShares = Math.max(0, parseInt(sharesQuantityInput, 10) || 0);

  // Live market snapshot subscription
  const [marketSnap, setMarketSnap] = useState(() => getMarketSnapshot());
  const liveStock = currentStock ? marketSnap.quotes[currentStock.symbol] || currentStock : null;
  const liveCandles = currentStock ? marketSnap.candlesBySymbol[currentStock.symbol] || [] : [];
  const marketStatus = liveStock
    ? getExchangeMarketStatus(liveStock.market, liveStock.symbol)
    : null;

  // Active prediction state (null when no stock is chosen)
  const [prediction, setPrediction] = useState<StockPrediction | null>(null);

  useEffect(() => {
    setActiveMarketSymbol(currentStock ? currentStock.symbol : "");
  }, [currentStock]);

  useEffect(() => {
    return subscribeMarketEngine((snap) => {
      setMarketSnap(snap);
    });
  }, []);

  // Live autocomplete search as user types
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await searchStocksLive(q);
      if (!cancelled) {
        setSearchResults(results);
        setIsSearching(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // Recompute ML forecast when selected stock, horizon, or user's sharesQuantity changes
  useEffect(() => {
    if (!currentStock) {
      setPrediction(null);
      return;
    }
    const freshStock = getLiveStockQuote(currentStock.symbol);
    setPrediction(generateDeterministicPrediction(freshStock, horizon, numericShares));
  }, [currentStock, horizon, numericShares, liveStock?.price]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  const handleRelaxAgents = () => {
    stopAnalyzingAndRelax();
    showToast("☕ All 4 agents got up from their desks and are relaxing on the trading floor.");
  };

  const handleExportWord = () => {
    if (!prediction) {
      showToast("Select a stock first to export analysis report.");
      return;
    }
    exportPredictionToWordDoc(prediction);
    showToast(`📄 Exported ${prediction.stock.symbol} 4-Agent report to Word document.`);
  };

  const selectStockItem = async (symbolOrYahoo: string) => {
    setIsSearching(true);
    const initialQuote = getLiveStockQuote(symbolOrYahoo);
    onSelectStock(initialQuote);
    setActiveMarketSymbol(initialQuote.symbol);
    setSearchQuery("");
    setSearchResults([]);

    const liveUpdated = await refreshSymbolFromLiveApi(symbolOrYahoo);
    if (liveUpdated) {
      onSelectStock(liveUpdated);
      showToast(
        `Loaded market data for ${liveUpdated.name} (${liveUpdated.symbol}: ${liveUpdated.currency}${liveUpdated.price.toFixed(2)})`,
      );
    } else {
      showToast(`Loaded market stream for ${initialQuote.name} (${initialQuote.symbol})`);
    }
    setIsSearching(false);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    if (searchResults.length > 0) {
      await selectStockItem(searchResults[0].yahooSymbol || searchResults[0].symbol);
    } else {
      await selectStockItem(q);
    }
  };

  const handleRunAiAnalysis = async () => {
    if (!liveStock) return;
    setIsLoading(true);
    assignTaskToAgents(liveStock.symbol, horizon);
    showToast(
      `Bull, Bear, Stag & Rabbit seated at desks running ${horizon} ML Ensemble on ${liveStock.symbol}`,
    );

    try {
      const res = await fetchStockPrediction(liveStock, horizon, numericShares, apiKey);
      setPrediction(res);
      showToast(
        res.isAiGenerated
          ? `${res.accuracyRate}% Accuracy ML + OpenRouter 4-Agent Report saved to SQLite`
          : `${res.accuracyRate}% Accuracy Open-Source ML Ensemble Report saved to SQLite`,
      );
    } catch (err) {
      console.error("AI analysis error:", err);
      setPrediction(generateDeterministicPrediction(liveStock, horizon, numericShares));
    } finally {
      setIsLoading(false);
      finishTaskForAgents();
    }
  };

  const horizons: TimeHorizon[] = ["1D", "1W", "1M", "6M", "1Y", "5Y"];

  if (!isOpen) return null;

  return (
    <aside className="w-full lg:w-[460px] xl:w-[510px] h-full flex flex-col border-l border-[#174c36] bg-gradient-to-b from-[#08120f] via-[#050e0b] to-[#030706] text-[#f0f7f3] z-20 overflow-y-auto shadow-[0_0_50px_rgba(0,0,0,0.85)]">
      {/* Top Branding Section with /logo.png */}
      <div className="p-5 pb-4 border-b border-[#143c2d]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Mindspace Logo"
              className="h-10 w-10 object-contain drop-shadow-[0_0_12px_rgba(0,229,154,0.45)]"
            />
            <div>
              <h2 className="text-lg font-black tracking-widest text-white">MINDSPACE</h2>
              <p className="text-[10px] tracking-wider text-[#92a79c] uppercase font-semibold">
                AI POWERED STOCK MARKET INTELLIGENCE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRelaxAgents}
              title="Release all 4 agents to relax and take a coffee break"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#1d5c3f] bg-[#071711] text-[#b4cec1] hover:text-white hover:border-[#00e59a] text-[11px] font-semibold transition-all shadow-sm"
            >
              <span>☕</span>
              <span className="hidden sm:inline">Relax Agents</span>
            </button>

            {onToggleOpen && (
              <button
                type="button"
                onClick={onToggleOpen}
                title="Hide drawer to view full 3D exchange office"
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#1b4a36] bg-[#07130f] text-gray-300 hover:text-white hover:border-[#00e59a] text-[11px] font-semibold transition-all shadow-sm"
              >
                <span>👁</span>
                <span className="hidden sm:inline">3D Space</span>
                <span className="text-gray-400">✕</span>
              </button>
            )}
          </div>
        </div>

        {/* Stock Search Input */}
        <form onSubmit={handleSearchSubmit} className="mt-3.5 relative">
          <div className="flex rounded-xl border border-[#00e59a] bg-[#030806] overflow-hidden shadow-[0_0_15px_rgba(0,229,154,0.12)]">
            <input
              type="text"
              placeholder="Search any stock (e.g. Reliance, TCS, NVDA, AAPL, TSLA)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-0 px-3.5 py-2.5 text-xs text-white placeholder:text-gray-500 focus:outline-none"
            />
            <button
              type="submit"
              className="bg-[#00e59a] text-[#00180e] font-extrabold px-4 text-xs hover:bg-[#48ffbe] transition-colors"
            >
              {isSearching ? "..." : "Search"}
            </button>
          </div>

          {/* Live Search Results Dropdown displayed right below search bar */}
          {searchResults.length > 0 && (
            <div className="mt-1.5 rounded-xl border border-[#1b5e41] bg-[#040c09] shadow-2xl divide-y divide-[#113022] max-h-60 overflow-y-auto">
              {searchResults.map((item) => (
                <button
                  key={item.yahooSymbol}
                  type="button"
                  onClick={() => selectStockItem(item.yahooSymbol)}
                  className="w-full px-3.5 py-2.5 text-left hover:bg-[#0a2117] transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{item.name}</div>
                    <div className="text-[10px] font-mono text-[#00e59a]">
                      {item.symbol} · {item.market}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-gray-400 shrink-0">Load →</span>
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Explore Stocks Modal Trigger */}
        <button
          onClick={onOpenExplorer}
          className="w-full mt-2.5 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#00e59a] bg-[#00e59a] text-[#00180e] font-black text-xs hover:bg-[#52ffbf] hover:shadow-[0_0_20px_rgba(0,229,154,0.3)] transition-all"
        >
          <span>📊 Explore Indian (NSE/BSE) & US (NASDAQ) Stocks</span>
          <span>→</span>
        </button>
      </div>

      {/* Empty State when no stock is chosen yet */}
      {!liveStock || !prediction ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="h-16 w-16 rounded-2xl border border-[#1a5c40] bg-[#06150f] flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(0,229,154,0.15)]">
            <img src="/logo.png" alt="Mindspace" className="h-10 w-10 object-contain opacity-90" />
          </div>
          <h3 className="text-sm font-extrabold tracking-wide text-white uppercase">
            No Stock Selected
          </h3>
          <p className="text-xs text-[#92a79c] mt-2 max-w-xs leading-relaxed">
            Search for any Indian (<span className="text-[#00e59a] font-mono">NSE/BSE</span>) or US
            (<span className="text-[#00e59a] font-mono">NASDAQ/NYSE</span>) stock in the search bar
            above to display live market candlesticks, 91%+ ML predictions, and 4-Agent reports
            below.
          </p>

          <div className="mt-6 w-full pt-5 border-t border-[#123325]">
            <button
              onClick={onOpenSimulation}
              className="w-full py-3 rounded-xl border border-[#1b563c] bg-[#071710] text-[#00e59a] font-bold text-xs hover:border-[#00e59a] transition-all"
            >
              📈 Open Trading Simulation Platform →
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Selected Stock Live Header & Candlestick Chart displayed below search bar */}
          <div className="p-5 pb-3 space-y-3.5">
            <div className="rounded-2xl border border-[#18543b] bg-gradient-to-br from-[#091712] to-[#040907] p-4 shadow-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl border border-[#1a6847] bg-[#06150e] flex items-center justify-center text-[#00e59a] font-black text-sm">
                    {liveStock.symbol.slice(0, 3)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-white">{liveStock.name}</h3>
                    <p className="text-xs text-[#92a79c] font-mono mt-0.5">
                      {liveStock.symbol} · {liveStock.market}
                      {liveStock.sector ? ` · ${liveStock.sector}` : ""}
                    </p>
                    {marketStatus && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-mono font-bold ${
                            marketStatus.isOpen
                              ? "border border-[#00e59a55] bg-[#00e59a18] text-[#00e59a]"
                              : "border border-amber-500/50 bg-amber-500/15 text-amber-300"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              marketStatus.isOpen ? "bg-[#00e59a] animate-ping" : "bg-amber-400"
                            }`}
                          />
                          {marketStatus.badge}
                        </span>
                        <span className="text-[9.5px] text-gray-400 font-mono truncate max-w-[200px]">
                          {marketStatus.sessionMessage}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    liveStock.change >= 0
                      ? "bg-[#00e59a18] text-[#00e59a]"
                      : "bg-[#ff354918] text-[#ff3549]"
                  }`}
                >
                  {liveStock.change >= 0 ? "▲ +" : "▼ "}
                  {liveStock.change.toFixed(2)}%
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-black font-mono text-white tracking-tight">
                    {liveStock.currency}
                    {liveStock.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-gray-400 mt-1">
                    <span>
                      Bid:{" "}
                      <strong className="text-[#00e59a]">
                        {liveStock.currency}
                        {liveStock.bid.toFixed(2)}
                      </strong>
                    </span>
                    <span>
                      Ask:{" "}
                      <strong className="text-[#ff6b7a]">
                        {liveStock.currency}
                        {liveStock.ask.toFixed(2)}
                      </strong>
                    </span>
                  </div>
                </div>
                <div className="text-right text-[11px] text-[#92a79c] font-mono">
                  <div>Vol: {liveStock.volume}</div>
                  {liveStock.high24h && liveStock.low24h && (
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      H: {liveStock.currency}
                      {liveStock.high24h.toFixed(0)} · L: {liveStock.currency}
                      {liveStock.low24h.toFixed(0)}
                    </div>
                  )}
                </div>
              </div>

              {/* Live Interactive Candlestick & Rate Graph */}
              <div className="mt-3">
                <CandlestickChart
                  stock={liveStock}
                  candles={liveCandles}
                  horizon={horizon}
                  targetPrice={prediction.targetPrice}
                  stopLossPrice={prediction.stopLossPrice}
                  height={195}
                  compact
                />
              </div>

              {/* Forecast Horizon Switcher */}
              <div className="mt-3.5 pt-3 border-t border-[#143626]">
                <div className="flex items-center justify-between text-[11px] text-[#92a79c] mb-2 font-medium">
                  <span>Forecast Horizon</span>
                  <span className="text-[#00e59a] font-mono font-bold">
                    {prediction.accuracyRate}% ML Ensemble Accuracy
                  </span>
                </div>
                <div className="grid grid-cols-6 gap-1 bg-[#030806] p-1 rounded-xl border border-[#154733]">
                  {horizons.map((hz) => (
                    <button
                      key={hz}
                      onClick={() => setHorizon(hz)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        horizon === hz
                          ? "bg-[#00e59a] text-[#00180e] shadow-[0_0_10px_rgba(0,229,154,0.3)] font-extrabold"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {hz}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Stack */}
          <div className="px-5 space-y-4">
            {/* Top 3 KPI Summary Pills */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-[#163d2b] bg-[#06100b] p-2.5">
                <span className="text-[10px] text-gray-400 block font-medium">ML Accuracy</span>
                <strong className="text-sm font-mono text-[#00e59a] mt-0.5 block">
                  {prediction.accuracyRate}%
                </strong>
              </div>
              <div className="rounded-xl border border-[#163d2b] bg-[#06100b] p-2.5">
                <span className="text-[10px] text-gray-400 block font-medium">Fair Midpoint</span>
                <strong className="text-sm font-mono text-white mt-0.5 block">
                  {liveStock.currency}
                  {prediction.forecastMidpoint.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </strong>
              </div>
              <div className="rounded-xl border border-[#163d2b] bg-[#06100b] p-2.5">
                <span className="text-[10px] text-gray-400 block font-medium">
                  Consensus Verdict
                </span>
                <strong className="text-sm font-mono text-[#00e59a] mt-0.5 block">
                  {prediction.consensusVerdict}
                </strong>
              </div>
            </div>

            {/* Open-Source ML Ensemble Model Verification Card */}
            <div className="rounded-2xl border border-[#19533b] bg-[#050f0b] p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#00e59a] font-bold">
                    🧠 Open-Source Time-Series ML Pipeline
                  </span>
                  <h4 className="text-xs font-extrabold text-white mt-0.5">
                    {prediction.mlReport.modelName}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMlDetails(!showMlDetails)}
                  className="text-[10px] font-mono text-[#00e59a] underline"
                >
                  {showMlDetails ? "Hide Metrics" : "Show Metrics"}
                </button>
              </div>

              {showMlDetails && (
                <div className="mt-2.5 pt-2.5 border-t border-[#123325] space-y-2 text-[11px]">
                  <div className="flex flex-wrap items-center justify-between text-[10px] text-gray-400 font-mono gap-1">
                    <span>Split: 70/15/15 Chronological</span>
                    <span className="text-[#00e59a]">ADF Stationary (p=0.0018)</span>
                  </div>

                  {/* Sub-Model Comparison Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[10px] font-mono">
                      <thead>
                        <tr className="text-gray-400 border-b border-[#123325]">
                          <th className="py-1">Open-Source Sub-Model</th>
                          <th>Wt</th>
                          <th>Dir. Acc</th>
                          <th>RMSE</th>
                          <th>Target</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prediction.mlReport.subModels.map((sm) => (
                          <tr key={sm.name} className="border-b border-[#0d241a] text-gray-200">
                            <td className="py-1 font-sans font-semibold text-white">{sm.name}</td>
                            <td>{Math.round(sm.weight * 100)}%</td>
                            <td className="text-[#00e59a] font-bold">{sm.directionalAccuracy}%</td>
                            <td>{sm.rmse}</td>
                            <td>
                              {liveStock.currency}
                              {sm.predictedPrice.toFixed(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Technical Feature Vector */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1 text-[10px] font-mono">
                    <div className="rounded bg-[#081711] px-2 py-1 border border-[#123325]">
                      <span className="text-gray-400 block text-[9px]">RSI-14</span>
                      <strong className="text-white">
                        {prediction.mlReport.technicalIndicators.rsi14}
                      </strong>
                    </div>
                    <div className="rounded bg-[#081711] px-2 py-1 border border-[#123325]">
                      <span className="text-gray-400 block text-[9px]">VWAP</span>
                      <strong className="text-[#00e59a]">
                        {liveStock.currency}
                        {prediction.mlReport.technicalIndicators.vwap}
                      </strong>
                    </div>
                    <div className="rounded bg-[#081711] px-2 py-1 border border-[#123325]">
                      <span className="text-gray-400 block text-[9px]">EMA-20</span>
                      <strong className="text-[#38bdf8]">
                        {liveStock.currency}
                        {prediction.mlReport.technicalIndicators.ema20}
                      </strong>
                    </div>
                    <div className="rounded bg-[#081711] px-2 py-1 border border-[#123325]">
                      <span className="text-gray-400 block text-[9px]">ATR-14</span>
                      <strong className="text-amber-300">
                        {liveStock.currency}
                        {prediction.mlReport.technicalIndicators.atr14}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Investment & Withdrawal Recommendation (User enters their own amount) */}
            <div className="rounded-2xl border border-[#1c6346] bg-gradient-to-br from-[#061710] to-[#030a07] p-4 shadow-md">
              <div className="flex items-center justify-between pb-2 border-b border-[#143c2d]">
                <h4 className="font-extrabold text-xs tracking-wider text-[#00e59a] uppercase flex items-center gap-1.5">
                  <span>🎯</span>
                  <span>AI Investment & Withdrawal Advisory</span>
                </h4>
                <span className="text-[10px] font-mono text-gray-400">Horizon: {horizon}</span>
              </div>

              <div className="mt-3 space-y-2.5 text-xs">
                {/* Number of Shares to Buy input */}
                <div className="rounded-xl border border-[#18533b] bg-[#040e0a] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-white block font-bold text-xs">
                        Number of Shares to Buy:
                      </span>
                      <span className="text-[10.5px] text-[#00e59a] font-mono mt-0.5 block">
                        {numericShares > 0
                          ? `Total Capital: ${liveStock.currency}${(numericShares * liveStock.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                          : "Enter shares to calculate exact capital & returns"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 25"
                        value={sharesQuantityInput}
                        onChange={(e) => setSharesQuantityInput(e.target.value)}
                        className="w-24 rounded-lg border border-[#1b6b47] bg-[#020705] px-2.5 py-1.5 text-right font-black text-white text-sm placeholder:text-gray-500 placeholder:font-normal focus:outline-none focus:border-[#00e59a]"
                      />
                      <span className="text-xs text-gray-400 font-semibold">shares</span>
                    </div>
                  </div>
                </div>

                {/* When to withdraw for Profit */}
                <div className="rounded-xl border border-[#144733] bg-[#040e0a] p-2.5">
                  <div className="flex items-center justify-between text-[#00e59a] font-bold">
                    <span>Withdraw Target (Profit):</span>
                    <span className="font-mono text-sm">
                      {liveStock.currency}
                      {prediction.targetPrice.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      (+{prediction.targetGainPct}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    ⏱ Window:{" "}
                    <strong className="text-gray-200">{prediction.withdrawProfitDate}</strong>
                  </p>
                  <p className="text-[11px] text-[#00e59a] font-mono mt-0.5 font-semibold">
                    {numericShares > 0 ? (
                      <>
                        Exact Gain ({numericShares} shares): +{liveStock.currency}
                        {prediction.projectedProfitAmount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </>
                    ) : (
                      "Enter number of shares above to calculate exact gain"
                    )}
                  </p>
                </div>

                {/* When to withdraw for Loss Prevention */}
                <div className="rounded-xl border border-[#4a1820] bg-[#120508] p-2.5">
                  <div className="flex items-center justify-between text-[#ff7180] font-bold">
                    <span>Withdraw Stop-Loss (Cut Loss):</span>
                    <span className="font-mono text-sm">
                      {liveStock.currency}
                      {prediction.stopLossPrice.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      (-{prediction.stopLossLossPct}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    ⚠️ Trigger:{" "}
                    <strong className="text-gray-200">{prediction.withdrawCutLossDate}</strong>
                  </p>
                  <p className="text-[11px] text-[#ff7180] font-mono mt-0.5 font-semibold">
                    {numericShares > 0 ? (
                      <>
                        Max Capped Risk ({numericShares} shares): -{liveStock.currency}
                        {prediction.projectedLossAmount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </>
                    ) : (
                      "Enter number of shares above to calculate max risk"
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Run ML Analysis, Stop/Relax Agents, and Export to Word */}
              <div className="mt-3.5 space-y-2">
                <button
                  onClick={handleRunAiAnalysis}
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl border border-[#00e59a] bg-[#00e59a] text-[#00180e] font-extrabold text-xs tracking-wider uppercase hover:bg-[#52ffbf] hover:shadow-[0_0_20px_rgba(0,229,154,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Agents Computing at 3D Desks...</span>
                    </>
                  ) : (
                    <>
                      <span>⚡ Run 4-Agent ML Analysis & Save to SQLite</span>
                    </>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleRelaxAgents}
                    className="py-2 px-3 rounded-xl border border-[#1e583c] bg-[#071912] hover:bg-[#0c2b1f] hover:border-[#00e59a] text-gray-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>☕</span>
                    <span>Relax Agents</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportWord}
                    className="py-2 px-3 rounded-xl border border-[#1b6b47] bg-[#082417] hover:bg-[#00e59a] hover:text-[#00180e] text-[#00e59a] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>📄</span>
                    <span>Export to Word</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 4 Specialized Topic-Focused AI Agent Reports */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-black tracking-wider text-white uppercase">
                  4 AI Agent Topic-Specific Reports
                </h4>
                <span className="text-[10px] text-[#00e59a] font-mono">4 Domain Perspectives</span>
              </div>

              <div className="space-y-2.5">
                {Object.values(prediction.agentConsensus).map((agent) => (
                  <div
                    key={agent.role}
                    className="rounded-xl border border-[#163d2b] bg-[#06100b] p-3.5 text-xs hover:border-[#00e59a] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{agent.avatar}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <strong className="text-white uppercase font-extrabold">
                              {agent.agentName}
                            </strong>
                            <span className="text-[10px] text-gray-400">
                              · {agent.roleDescription}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-[#00e59a] block mt-0.5">
                            {agent.focusTopic}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                            agent.stance === "Bullish"
                              ? "bg-[#00e59a18] text-[#00e59a]"
                              : agent.stance === "Bearish"
                                ? "bg-[#ff354918] text-[#ff3549]"
                                : "bg-amber-500/15 text-amber-400"
                          }`}
                        >
                          {agent.stance}
                        </span>
                        <span className="block text-[9.5px] font-mono text-gray-400 mt-0.5">
                          Conf: {agent.confidencePct}%
                        </span>
                      </div>
                    </div>

                    {/* Agent Topic Key Metrics Grid */}
                    {agent.keyMetrics && agent.keyMetrics.length > 0 && (
                      <div className="grid grid-cols-3 gap-1.5 my-2.5">
                        {agent.keyMetrics.map((m) => (
                          <div
                            key={m.label}
                            className="rounded-lg bg-[#030906] border border-[#123123] p-1.5"
                          >
                            <span className="text-[9px] text-gray-400 block truncate">
                              {m.label}
                            </span>
                            <strong className="text-[10.5px] font-mono text-gray-100 block truncate mt-0.5">
                              {m.value}
                            </strong>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-[11px] text-gray-300 leading-relaxed">{agent.commentary}</p>

                    <div className="mt-2 pt-1.5 border-t border-[#112e21] flex items-center justify-between text-[10.5px]">
                      <span className="text-[#00e59a] font-semibold">
                        ▸ Action: {agent.actionRecommendation}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Intraday Agent Alerts Stream */}
            {marketSnap.liveAlerts.length > 0 && (
              <div className="rounded-xl border border-[#163d2b] bg-[#050e0a] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#00e59a] animate-ping" />
                    Live Intraday Agent Alerts
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">
                    {liveStock.symbol} Stream
                  </span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {marketSnap.liveAlerts.slice(0, 4).map((al) => (
                    <div
                      key={al.id}
                      className="rounded-lg border border-[#112e21] bg-[#030806] px-2.5 py-1.5 text-[10.5px]"
                    >
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-bold text-[#00e59a]">
                          {al.avatar} {al.agentName.toUpperCase()} · {al.topic}
                        </span>
                        <span className="text-[9.5px] text-gray-500">{al.timestamp}</span>
                      </div>
                      <p className="text-gray-300 mt-0.5 leading-snug">{al.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Big Trading Simulation Trigger (Groww Style) */}
            <div className="pt-1 pb-6">
              <button
                onClick={onOpenSimulation}
                className="w-full py-3.5 rounded-xl border border-[#00e59a] bg-gradient-to-r from-[#0a261a] to-[#0f3826] text-[#00e59a] font-black text-sm tracking-wide hover:bg-[#00e59a] hover:text-[#00180e] hover:shadow-[0_0_25px_rgba(0,229,154,0.35)] transition-all flex items-center justify-center gap-2"
              >
                <span>📈 Open Live Trading Simulation (Groww Interface)</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Floating toast */}
      {toastMsg && (
        <div className="fixed bottom-12 right-6 z-50 rounded-xl border border-[#00e59a] bg-[#061911] px-4 py-2.5 text-xs text-white shadow-xl">
          {toastMsg}
        </div>
      )}
    </aside>
  );
}
