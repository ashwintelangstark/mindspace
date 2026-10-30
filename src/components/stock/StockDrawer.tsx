import React, { useState, useEffect } from "react";
import { StockQuote, StockPrediction, TimeHorizon } from "@/types/stock";
import {
  fetchStockPrediction,
  generateDeterministicPrediction,
  OPENROUTER_DEFAULT_KEY,
  FREE_OPENROUTER_MODELS,
} from "@/lib/openrouter";
import {
  assignTaskToAgents,
  finishTaskForAgents,
  stopAnalyzingAndRelax,
  gatherAgentsForDiscussion,
  stopDiscussion,
} from "@/game/sim/roam";
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
import { exportPredictionToWordDoc, exportDiscussionsToWordDoc } from "@/lib/export-word";
import {
  fetchAgentDiscussion,
  queryMindspaceChatbot,
  DiscussionTurn,
} from "@/lib/agent-discussions";
import { getCurrentUser } from "@/lib/auth";
import { CandlestickChart } from "./CandlestickChart";
import { FormattedChatMessage } from "./FormattedChatMessage";

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

  // Tab mode: "analysis" (stock charts & predictions) vs "discussions" (agent tips roundtable & Q&A)
  const [drawerMode, setDrawerMode] = useState<"analysis" | "discussions">("analysis");
  const [discussionSubMode, setDiscussionSubMode] = useState<"chatbot" | "roundtable">("chatbot");
  const [selectedModel, setSelectedModel] = useState<string>("openrouter/free");
  const [isDiscussionActive, setIsDiscussionActive] = useState(false);
  const [discussionTurns, setDiscussionTurns] = useState<DiscussionTurn[]>([]);
  const [isGeneratingDiscussion, setIsGeneratingDiscussion] = useState(false);
  const [userQuestionInput, setUserQuestionInput] = useState("");

  const activeUser = getCurrentUser();
  const activeUsername = activeUser?.username || "guest";
  const discussionStorageKey = `mindspace_discussions_${activeUsername.toLowerCase()}`;

  // Load per-user saved discussions when user changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(discussionStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setDiscussionTurns(Array.isArray(parsed) ? parsed : []);
      } else {
        setDiscussionTurns([]);
      }
    } catch {
      setDiscussionTurns([]);
    }
  }, [discussionStorageKey]);

  // Persist per-user discussions whenever they update
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(discussionStorageKey, JSON.stringify(discussionTurns));
    } catch {
      // ignore
    }
  }, [discussionTurns, discussionStorageKey]);

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
    setIsDiscussionActive(false);
    showToast("☕ All 4 agents got up from their desks and are relaxing on the trading floor.");
  };

  const handleToggleDiscussion = async () => {
    if (isDiscussionActive) {
      setIsDiscussionActive(false);
      stopDiscussion();
      showToast("Paused discussion. Agents returning to roaming.");
    } else {
      setIsDiscussionActive(true);
      gatherAgentsForDiscussion("Investment Strategies");
      showToast("Started discussion roundtable at the lounge table.");

      if (discussionTurns.length === 0) {
        setIsGeneratingDiscussion(true);
        try {
          const turn = await fetchAgentDiscussion(undefined, false, apiKey);
          setDiscussionTurns([turn]);
        } finally {
          setIsGeneratingDiscussion(false);
        }
      }
    }
  };

  const handleNextDiscussionTopic = async () => {
    setIsGeneratingDiscussion(true);
    gatherAgentsForDiscussion("New Investment Topic");
    try {
      const turn = await fetchAgentDiscussion(undefined, false, apiKey);
      setDiscussionTurns((prev) => [...prev, turn]);
      setIsDiscussionActive(true);
      showToast(`New discussion: "${turn.topic}"`);
    } finally {
      setIsGeneratingDiscussion(false);
    }
  };

  const handleAskAgentQuestion = async (e?: React.FormEvent, customQuestion?: string) => {
    if (e) e.preventDefault();
    const q = (customQuestion || userQuestionInput).trim();
    if (!q || isGeneratingDiscussion) return;

    setUserQuestionInput("");
    setIsGeneratingDiscussion(true);
    gatherAgentsForDiscussion(`Q: ${q.slice(0, 20)}...`);
    setIsDiscussionActive(true);

    try {
      if (discussionSubMode === "chatbot") {
        const botTurn = await queryMindspaceChatbot({
          userQuestion: q,
          activeStock: liveStock,
          selectedModel: selectedModel,
          apiKey: apiKey,
          conversationHistory: discussionTurns.flatMap((t) => t.messages),
        });
        setDiscussionTurns((prev) => [...prev, botTurn]);
        showToast("🤖 Mindspace AI Chatbot answered your doubt with live web data & P&L!");
      } else {
        const turn = await fetchAgentDiscussion(q, true, apiKey, selectedModel);
        setDiscussionTurns((prev) => [...prev, turn]);
        showToast("Bull, Bear, Stag & Rabbit answered your question!");
      }
    } catch (err) {
      console.error("Agent discussion error:", err);
      showToast("Processed via offline quantitative engine.");
    } finally {
      setIsGeneratingDiscussion(false);
    }
  };

  const handleExportWord = () => {
    if (!prediction) {
      showToast("Select a stock first to export analysis report.");
      return;
    }
    exportPredictionToWordDoc(prediction);
    showToast(`📄 Exported ${prediction.stock.symbol} 4-Agent report to Word document.`);
  };

  const handleExportDiscussionsWord = () => {
    if (discussionTurns.length === 0) {
      showToast("Start a discussion or ask a question first before exporting.");
      return;
    }
    exportDiscussionsToWordDoc(discussionTurns, activeUser?.username);
    showToast("📄 Exported 4-Agent Roundtable & Q&A Discussions to Word document (.doc).");
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
          ? `${res.accuracyRate}% Accuracy ML + OpenRouter 4-Agent Report generated`
          : `${res.accuracyRate}% Accuracy Open-Source ML Ensemble Report generated`,
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

        {/* Mode Selector: Stock Analysis vs 4-Agent Discussions */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#030906] border border-[#143c2d] mt-3">
          <button
            type="button"
            onClick={() => setDrawerMode("analysis")}
            className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              drawerMode === "analysis"
                ? "bg-[#00e59a] text-[#00180e] shadow-[0_0_12px_rgba(0,229,154,0.3)] font-extrabold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <span>📊</span>
            <span>Stock Analysis</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDrawerMode("discussions");
              if (!isDiscussionActive && discussionTurns.length === 0) {
                handleToggleDiscussion();
              }
            }}
            className={`py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              drawerMode === "discussions"
                ? "bg-[#00e59a] text-[#00180e] shadow-[0_0_12px_rgba(0,229,154,0.3)] font-extrabold"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <span>💬</span>
            <span>Agent Discussions</span>
            {isDiscussionActive && (
              <span className="h-1.5 w-1.5 rounded-full bg-[#00e59a] animate-ping ml-0.5" />
            )}
          </button>
        </div>

        {drawerMode === "analysis" && (
          <>
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
          </>
        )}
      </div>

      {drawerMode === "analysis" ? (
        <>
          {/* Empty State when no stock is chosen yet */}
          {!liveStock || !prediction ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="h-16 w-16 rounded-2xl border border-[#1a5c40] bg-[#06150f] flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(0,229,154,0.15)]">
                <img
                  src="/logo.png"
                  alt="Mindspace"
                  className="h-10 w-10 object-contain opacity-90"
                />
              </div>
              <h3 className="text-sm font-extrabold tracking-wide text-white uppercase">
                No Stock Selected
              </h3>
              <p className="text-xs text-[#92a79c] mt-2 max-w-xs leading-relaxed">
                Search for any Indian (<span className="text-[#00e59a] font-mono">NSE/BSE</span>) or
                US (<span className="text-[#00e59a] font-mono">NASDAQ/NYSE</span>) stock in the
                search bar above to display live market candlesticks, 91%+ ML predictions, and
                4-Agent reports below.
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
                {/* Top 3 KPI Summary Pills + Profit/Loss Probabilities */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border border-[#163d2b] bg-[#06100b] p-2.5">
                    <span className="text-[10px] text-gray-400 block font-medium">
                      Profit Prob.
                    </span>
                    <strong className="text-sm font-mono text-[#00e59a] mt-0.5 block">
                      {prediction.profitProbability}%
                    </strong>
                  </div>
                  <div className="rounded-xl border border-[#163d2b] bg-[#06100b] p-2.5">
                    <span className="text-[10px] text-gray-400 block font-medium">Loss Prob.</span>
                    <strong className="text-sm font-mono text-[#ff6b7a] mt-0.5 block">
                      {prediction.lossProbability}%
                    </strong>
                  </div>
                  <div className="rounded-xl border border-[#163d2b] bg-[#06100b] p-2.5">
                    <span className="text-[10px] text-gray-400 block font-medium">
                      Consensus Verdict
                    </span>
                    <strong
                      className={`text-sm font-mono mt-0.5 block ${
                        prediction.isProfitPredicted ? "text-[#00e59a]" : "text-[#ff6b7a]"
                      }`}
                    >
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
                                <td className="py-1 font-sans font-semibold text-white">
                                  {sm.name}
                                </td>
                                <td>{Math.round(sm.weight * 100)}%</td>
                                <td className="text-[#00e59a] font-bold">
                                  {sm.directionalAccuracy}%
                                </td>
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
                          <span>⚡ Run 4-Agent ML Analysis</span>
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
                    <span className="text-[10px] text-[#00e59a] font-mono">
                      4 Domain Perspectives
                    </span>
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

                        <p className="text-[11px] text-gray-300 leading-relaxed">
                          {agent.commentary}
                        </p>

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

                {/* Big Trading Simulation Trigger */}
                <div className="pt-1 pb-6">
                  <button
                    onClick={onOpenSimulation}
                    className="w-full py-3.5 rounded-xl border border-[#00e59a] bg-gradient-to-r from-[#0a261a] to-[#0f3826] text-[#00e59a] font-black text-sm tracking-wide hover:bg-[#00e59a] hover:text-[#00180e] hover:shadow-[0_0_25px_rgba(0,229,154,0.35)] transition-all flex items-center justify-center gap-2"
                  >
                    <span>📈 Open Live Trading Simulation Platform</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        /* DISCUSSIONS MODE: AI Market Chatbot & 4-Agent Strategy Roundtable */
        <div className="flex-1 flex flex-col min-h-0 bg-[#040a07]">
          {/* Discussion Header & Mode Switch */}
          <div className="p-4 border-b border-[#143c2d] bg-[#020705] space-y-3">
            {/* Top Row: Sub-mode pills & status */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#030906] border border-[#143c2d]">
                <button
                  type="button"
                  onClick={() => setDiscussionSubMode("chatbot")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    discussionSubMode === "chatbot"
                      ? "bg-[#00e59a] text-[#00180e] shadow-[0_0_12px_rgba(0,229,154,0.3)] font-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <span>🤖</span>
                  <span>AI Market Chatbot</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDiscussionSubMode("roundtable")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    discussionSubMode === "roundtable"
                      ? "bg-[#00e59a] text-[#00180e] shadow-[0_0_12px_rgba(0,229,154,0.3)] font-black"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <span>👥</span>
                  <span>4-Agent Roundtable</span>
                </button>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-1.5">
                {discussionSubMode === "roundtable" && (
                  <>
                    <button
                      type="button"
                      onClick={handleToggleDiscussion}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 shadow-sm ${
                        isDiscussionActive
                          ? "border border-amber-500/60 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                          : "border border-[#00e59a] bg-[#00e59a] text-[#00180e] hover:bg-[#48ffbe]"
                      }`}
                    >
                      <span>{isDiscussionActive ? "⏸ Stop" : "▶ Start"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextDiscussionTopic}
                      disabled={isGeneratingDiscussion}
                      title="Generate a new practical trading tip topic"
                      className="px-2.5 py-1.5 rounded-xl border border-[#1b5e41] bg-[#081e14] hover:bg-[#0c2f20] text-gray-200 text-xs font-bold transition-all disabled:opacity-40"
                    >
                      {isGeneratingDiscussion ? "..." : "🎲 New"}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleExportDiscussionsWord}
                  disabled={discussionTurns.length === 0}
                  title="Export all agent discussions to a neatly organized Word (.doc) document"
                  className="px-2.5 py-1.5 rounded-xl border border-[#00e59a] bg-[#082417] hover:bg-[#00e59a] hover:text-[#00180e] text-[#00e59a] text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1"
                >
                  <span>📄</span>
                  <span className="hidden sm:inline">Export Word</span>
                </button>

                {discussionTurns.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDiscussionTurns([])}
                    title="Clear discussion feed"
                    className="p-1.5 rounded-xl border border-[#1b3d2c] bg-[#040e0a] text-gray-400 hover:text-white text-xs transition-all"
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>

            {/* Model & Live Web Data Selector Bar */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#0e2c1f] text-[10.5px]">
              {/* OpenRouter Free Model Selector */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-[#00e59a] font-mono font-bold shrink-0">Model:</span>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-[#030a07] border border-[#174f35] text-white rounded-lg px-2 py-1 text-[10.5px] font-mono focus:outline-none focus:border-[#00e59a] truncate max-w-[210px]"
                  title="Select any free unlimited model from OpenRouter"
                >
                  {FREE_OPENROUTER_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.badge})
                    </option>
                  ))}
                </select>
              </div>

              {/* Live Web Grounded Badge */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-mono font-bold border border-[#00e59a55] bg-[#00e59a15] text-[#00e59a]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00e59a] animate-ping" />
                  <span>🌐 Live Web {liveStock ? `(${liveStock.symbol})` : "Active"}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Scrollable Conversation Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {discussionTurns.length === 0 ? (
              <div className="py-8 px-2 text-center">
                <div className="h-14 w-14 rounded-2xl border border-[#18533b] bg-[#06150e] flex items-center justify-center mx-auto mb-3 text-2xl shadow-[0_0_20px_rgba(0,229,154,0.15)]">
                  {discussionSubMode === "chatbot" ? "🤖" : "☕"}
                </div>
                <h4 className="text-xs font-black uppercase text-white tracking-wider">
                  {discussionSubMode === "chatbot"
                    ? "Mindspace AI Market Chatbot Ready"
                    : "4-Agent Strategy Roundtable Ready"}
                </h4>
                <p className="text-[11px] text-gray-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                  {discussionSubMode === "chatbot"
                    ? "Ask any question to clear your doubts on stocks, calculate exact profits & losses for your shares, or analyze technical indicators with live web and market data."
                    : "Click Start to hear Bull, Bear, Stag & Rabbit debate institutional risk, breakouts, and order-flow strategies in the 3D lounge."}
                </p>

                {/* Quick Starter Prompts */}
                <div className="mt-5 space-y-2 max-w-sm mx-auto text-left">
                  <div className="text-[10px] font-mono text-[#00e59a] uppercase font-bold text-center">
                    Try Asking a Question:
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      {
                        title: "📊 Calculate P&L for 50 shares",
                        desc: liveStock
                          ? `Calculate profit & loss on 50 shares of ${liveStock.symbol} with entry, targets and stop-loss`
                          : "Calculate profit and loss on 50 shares of Reliance with entry, targets and stop-loss",
                      },
                      {
                        title: "🛡 Clear Doubt: How does Stop-Loss work?",
                        desc: "Clear my doubt: How does a stop-loss protect my capital and when should I cut losses?",
                      },
                      {
                        title: "🎯 What are Bull & Bear target prices?",
                        desc: liveStock
                          ? `What are the Bull, Bear and Stag targets for ${liveStock.symbol}?`
                          : "What are the Bull and Bear target prices and profit expectations?",
                      },
                      {
                        title: "⚡ Short-term swing vs Long-term compounding?",
                        desc: "Should I trade this stock for short-term swing profit or hold for long-term compounding?",
                      },
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAskAgentQuestion(undefined, chip.desc)}
                        className="w-full text-left p-2 rounded-xl border border-[#164632] bg-[#06170f] hover:bg-[#0a261a] hover:border-[#00e59a] text-[11px] transition-all group shadow-sm"
                      >
                        <div className="font-bold text-gray-200 group-hover:text-[#00e59a]">
                          {chip.title}
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono truncate mt-0.5">
                          {chip.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              discussionTurns.map((turn) => (
                <div
                  key={turn.id}
                  className="rounded-2xl border border-[#143c2d] bg-gradient-to-b from-[#06140e] to-[#030906] p-3.5 shadow-lg space-y-2.5"
                >
                  {/* Topic / Question Title */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#123124] text-[10.5px] font-mono">
                    <span className="text-[#00e59a] font-bold flex items-center gap-1.5 truncate max-w-[320px]">
                      <span>{turn.userQuestion ? "❓ Doubt / Question:" : "💡 Topic:"}</span>
                      <span className="text-gray-200 font-sans font-semibold truncate">
                        {turn.topic}
                      </span>
                    </span>
                    <span className="text-gray-500 shrink-0">{turn.timestamp}</span>
                  </div>

                  {/* Messages from Chatbot, Agents, or User */}
                  <div className="space-y-2">
                    {turn.messages.map((msg) => {
                      const isUser = msg.sender === "user";
                      const isAssistant = msg.sender === "assistant";
                      const isBull = msg.sender === "bull";
                      const isBear = msg.sender === "bear";
                      const isStag = msg.sender === "stag";

                      const borderClass = isUser
                        ? "border-[#8b5cf655] bg-[#8b5cf612]"
                        : isAssistant
                          ? "border-[#00e59a66] bg-gradient-to-br from-[#061d13] via-[#04140d] to-[#020b07] shadow-[0_0_15px_rgba(0,229,154,0.08)]"
                          : isBull
                            ? "border-[#00e59a44] bg-[#00e59a0f]"
                            : isBear
                              ? "border-[#ff354944] bg-[#ff35490f]"
                              : isStag
                                ? "border-[#38bdf844] bg-[#38bdf80f]"
                                : "border-[#fbbf2444] bg-[#fbbf240f]";

                      const nameColor = isUser
                        ? "text-[#c084fc]"
                        : isAssistant
                          ? "text-[#00e59a]"
                          : isBull
                            ? "text-[#00e59a]"
                            : isBear
                              ? "text-[#ff6b7a]"
                              : isStag
                                ? "text-[#38bdf8]"
                                : "text-[#fbbf24]";

                      return (
                        <div
                          key={msg.id}
                          className={`rounded-xl border p-3 text-xs transition-colors ${borderClass}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-base shrink-0">{msg.avatar}</span>
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span
                                  className={`font-black uppercase tracking-wide text-xs ${nameColor}`}
                                >
                                  {msg.name}
                                </span>
                                {msg.roleTitle && (
                                  <span className="text-[9.5px] text-gray-400 font-mono">
                                    · {msg.roleTitle}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {msg.modelUsed && (
                                <span className="hidden sm:inline-block text-[9px] font-mono text-[#00e59a] bg-[#00e59a15] px-1.5 py-0.5 rounded border border-[#00e59a33]">
                                  {msg.modelUsed}
                                </span>
                              )}
                              <span className="text-[9px] font-mono text-gray-500">
                                {msg.timestamp}
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 pl-6">
                            {isAssistant ? (
                              <FormattedChatMessage content={msg.message} />
                            ) : (
                              <p className="text-gray-200 text-[11.5px] leading-relaxed">
                                {msg.message}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}

            {isGeneratingDiscussion && (
              <div className="p-3.5 rounded-xl border border-[#00e59a44] bg-[#00e59a0d] flex items-center gap-2.5 text-xs text-[#00e59a] shadow-inner">
                <span className="animate-spin text-base">⏳</span>
                <span className="font-mono">
                  {discussionSubMode === "chatbot"
                    ? `Mindspace AI (${selectedModel}) analyzing with live web market data & calculating P&L...`
                    : "Agents formulating answers around the coffee table..."}
                </span>
              </div>
            )}
          </div>

          {/* Sticky Bottom Question & Doubt Clearing Form */}
          <div className="border-t border-[#143c2d] bg-[#020705] p-3.5 shrink-0 space-y-2">
            {/* Quick Suggestion Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-mono no-scrollbar">
              <span className="text-gray-500 shrink-0 font-bold">Quick:</span>
              <button
                type="button"
                onClick={() =>
                  handleAskAgentQuestion(
                    undefined,
                    liveStock
                      ? `Calculate P&L for 50 shares of ${liveStock.symbol} with entry, targets and stop-loss`
                      : "Calculate P&L for 50 shares of Reliance with entry, targets and stop-loss",
                  )
                }
                className="shrink-0 px-2.5 py-1 rounded-lg border border-[#1a553c] bg-[#06170f] hover:bg-[#0a261a] hover:border-[#00e59a] text-gray-300 hover:text-white transition-all"
              >
                📊 Calculate P&L (50 shares)
              </button>
              <button
                type="button"
                onClick={() =>
                  handleAskAgentQuestion(
                    undefined,
                    "Clear my doubt: How does stop-loss protect my capital and when should I exit?",
                  )
                }
                className="shrink-0 px-2.5 py-1 rounded-lg border border-[#1a553c] bg-[#06170f] hover:bg-[#0a261a] hover:border-[#00e59a] text-gray-300 hover:text-white transition-all"
              >
                🛡 Stop-Loss Rule
              </button>
              <button
                type="button"
                onClick={() =>
                  handleAskAgentQuestion(
                    undefined,
                    liveStock
                      ? `What are the Bull, Bear and Stag target prices and profit expectations for ${liveStock.symbol}?`
                      : "What are the Bull and Bear target prices and profit expectations?",
                  )
                }
                className="shrink-0 px-2.5 py-1 rounded-lg border border-[#1a553c] bg-[#06170f] hover:bg-[#0a261a] hover:border-[#00e59a] text-gray-300 hover:text-white transition-all"
              >
                🎯 Target Prices
              </button>
              <button
                type="button"
                onClick={() =>
                  handleAskAgentQuestion(
                    undefined,
                    liveStock
                      ? `What do RSI and VWAP indicators say about ${liveStock.symbol} right now?`
                      : "What do RSI and VWAP indicators say about current market momentum?",
                  )
                }
                className="shrink-0 px-2.5 py-1 rounded-lg border border-[#1a553c] bg-[#06170f] hover:bg-[#0a261a] hover:border-[#00e59a] text-gray-300 hover:text-white transition-all"
              >
                ⚡ RSI & VWAP
              </button>
            </div>

            <form onSubmit={handleAskAgentQuestion} className="flex gap-2">
              <input
                type="text"
                placeholder={
                  discussionSubMode === "chatbot"
                    ? "Ask AI Chatbot any doubt, calculate profits/losses, or request live web market analysis..."
                    : "Ask Bull, Bear, Stag & Rabbit a question (e.g. 'How to handle market crashes?')..."
                }
                value={userQuestionInput}
                onChange={(e) => setUserQuestionInput(e.target.value)}
                className="flex-1 rounded-xl border border-[#18543b] bg-[#030906] px-3.5 py-2.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[#00e59a] shadow-inner"
              />
              <button
                type="submit"
                disabled={!userQuestionInput.trim() || isGeneratingDiscussion}
                className="px-4 py-2.5 rounded-xl border border-[#00e59a] bg-[#00e59a] text-[#00180e] font-black text-xs hover:bg-[#52ffbf] disabled:opacity-40 transition-all shrink-0 shadow-sm"
              >
                {isGeneratingDiscussion
                  ? "..."
                  : discussionSubMode === "chatbot"
                    ? "Ask Chatbot"
                    : "Ask Agents"}
              </button>
            </form>

            <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono pt-0.5">
              <span className="flex items-center gap-1 text-[#00e59a]">
                <span>⚡</span>
                <span>Unlimited Free Model ({selectedModel.split("/")[1] || selectedModel})</span>
              </span>
              {discussionTurns.length > 0 ? (
                <button
                  type="button"
                  onClick={handleExportDiscussionsWord}
                  className="text-[#00e59a] font-bold hover:underline flex items-center gap-1"
                >
                  <span>📄 Export Discussions to Word (.doc)</span>
                </button>
              ) : (
                <span>Bull · Bear · Stag · Rabbit</span>
              )}
            </div>
          </div>
        </div>
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
