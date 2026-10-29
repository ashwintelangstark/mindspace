import React, { useState, useEffect } from "react";
import { StockQuote, SimulationOrder, SimulationState, TimeHorizon } from "@/types/stock";
import { HORIZON_FACTORS, generateDeterministicPrediction } from "@/lib/openrouter";
import {
  subscribeMarketEngine,
  getMarketSnapshot,
  getLiveStockQuote,
  refreshSymbolFromLiveApi,
  setActiveMarketSymbol,
} from "@/lib/market-engine";
import {
  loadPortfolioFromSqlite,
  syncPortfolioToSqlite,
  resetPortfolioInSqlite,
} from "@/lib/sqlite-client";
import { CandlestickChart } from "./CandlestickChart";

interface TradingSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStock: StockQuote | null;
  onSelectStock?: (stock: StockQuote) => void;
}

export function TradingSimulationModal({
  isOpen,
  onClose,
  currentStock,
  onSelectStock,
}: TradingSimulationModalProps) {
  const [selectedHorizon, setSelectedHorizon] = useState<TimeHorizon>("1D");
  const [activeSide, setActiveSide] = useState<"BUY" | "SELL">("BUY");
  const [executionMode, setExecutionMode] = useState<"MARKET_BID_ASK" | "LIMIT">("MARKET_BID_ASK");
  // No preset values — user enters their own capital, quantity, and limit price
  const [capitalInput, setCapitalInput] = useState<string>("");
  const [qtyInput, setQtyInput] = useState<string>("");
  const [limitPriceInput, setLimitPriceInput] = useState<string>("");
  const [simSearchQuery, setSimSearchQuery] = useState<string>("");
  const [dbConnected, setDbConnected] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [marketSnap, setMarketSnap] = useState(() => getMarketSnapshot());
  const liveStock = currentStock ? marketSnap.quotes[currentStock.symbol] || currentStock : null;
  const liveCandles = currentStock ? marketSnap.candlesBySymbol[currentStock.symbol] || [] : [];

  // Initialize paper trading state from SQLite (starts at 0 until user sets their own capital)
  const [simState, setSimState] = useState<SimulationState>({
    cash: 0.0,
    startingCash: 0.0,
    positions: {},
    orders: [],
    realizedPL: 0.0,
  });

  useEffect(() => {
    loadPortfolioFromSqlite().then(({ simState: loaded, dbConnected: isDb }) => {
      setSimState(loaded);
      setDbConnected(isDb);
    });
  }, []);

  useEffect(() => {
    return subscribeMarketEngine((snap) => {
      setMarketSnap(snap);
    });
  }, []);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const currencySymbol = liveStock?.currency || "₹";
  const qty = Math.max(0, Math.floor(Number(qtyInput) || 0));
  const parsedLimitPrice = Math.max(0, Number(limitPriceInput) || 0);

  const effectiveExecutionPrice = liveStock
    ? executionMode === "MARKET_BID_ASK"
      ? activeSide === "BUY"
        ? liveStock.ask
        : liveStock.bid
      : parsedLimitPrice
    : 0;

  const currentPosition = liveStock ? simState.positions[liveStock.symbol] || null : null;
  const totalCost = Number((qty * effectiveExecutionPrice).toFixed(2));

  // Real-time portfolio calculations against live streaming quotes
  let portfolioPositionValue = 0;
  let totalUnrealizedPL = 0;

  Object.values(simState.positions).forEach((pos) => {
    const liveQuoteForPos = marketSnap.quotes[pos.symbol];
    const markPrice = liveQuoteForPos ? liveQuoteForPos.bid : pos.currentPrice;
    const val = pos.qty * markPrice;
    const pl = (markPrice - pos.avgCost) * pos.qty;
    portfolioPositionValue += val;
    totalUnrealizedPL += pl;
  });

  const totalPortfolioValue = simState.cash + portfolioPositionValue;
  const forecast = liveStock
    ? generateDeterministicPrediction(liveStock, selectedHorizon, totalCost)
    : null;

  const handleSetCapital = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(capitalInput);
    if (!amount || amount <= 0) {
      showToast("Please enter a valid positive capital amount.");
      return;
    }
    const nextState: SimulationState = {
      ...simState,
      cash: Number((simState.cash + amount).toFixed(2)),
      startingCash: Number((simState.startingCash + amount).toFixed(2)),
    };
    setSimState(nextState);
    setCapitalInput("");
    syncPortfolioToSqlite(nextState).then((ok) => {
      if (ok) setDbConnected(true);
    });
    showToast(
      `Added ${currencySymbol}${amount.toLocaleString()} to your SQLite simulation wallet.`,
    );
  };

  const handleSimStockSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simSearchQuery.trim() || !onSelectStock) return;
    const initial = getLiveStockQuote(simSearchQuery);
    onSelectStock(initial);
    setActiveMarketSymbol(initial.symbol);
    setSimSearchQuery("");
    const updated = await refreshSymbolFromLiveApi(initial.yahooSymbol || initial.symbol);
    if (updated) onSelectStock(updated);
  };

  const handleExecuteOrder = () => {
    if (!liveStock) {
      showToast("Please search and select a stock first.");
      return;
    }
    if (qty <= 0) {
      showToast("Please enter the share quantity you want to trade.");
      return;
    }
    if (effectiveExecutionPrice <= 0) {
      showToast("Please enter a valid execution price.");
      return;
    }

    if (activeSide === "BUY") {
      if (totalCost > simState.cash) {
        showToast(
          `Insufficient virtual cash (${liveStock.currency}${simState.cash.toFixed(2)}). Enter your capital amount above first.`,
        );
        return;
      }

      const existing = simState.positions[liveStock.symbol] || {
        symbol: liveStock.symbol,
        name: liveStock.name,
        qty: 0,
        avgCost: 0,
        currentPrice: effectiveExecutionPrice,
        currency: liveStock.currency,
        marketValue: 0,
        unrealizedPL: 0,
        unrealizedPLPct: 0,
      };

      const newQty = existing.qty + qty;
      const newAvg = Number(((existing.avgCost * existing.qty + totalCost) / newQty).toFixed(2));
      const newPositions = {
        ...simState.positions,
        [liveStock.symbol]: {
          ...existing,
          qty: newQty,
          avgCost: newAvg,
          currentPrice: liveStock.price,
          marketValue: Number((newQty * liveStock.price).toFixed(2)),
          unrealizedPL: Number(((liveStock.price - newAvg) * newQty).toFixed(2)),
          unrealizedPLPct: Number((((liveStock.price - newAvg) / newAvg) * 100).toFixed(2)),
        },
      };

      const newOrder: SimulationOrder = {
        id: `ORD-${Date.now()}`,
        timestamp: new Date().toISOString(),
        timeString: new Date().toLocaleTimeString(),
        side: "BUY",
        symbol: liveStock.symbol,
        name: liveStock.name,
        qty,
        price: effectiveExecutionPrice,
        executionType: executionMode,
        total: totalCost,
        currency: liveStock.currency,
        status: "EXECUTED",
      };

      const nextState: SimulationState = {
        ...simState,
        cash: Number((simState.cash - totalCost).toFixed(2)),
        positions: newPositions,
        orders: [newOrder, ...simState.orders],
      };

      setSimState(nextState);
      setQtyInput("");
      syncPortfolioToSqlite(nextState, newOrder).then((ok) => {
        if (ok) setDbConnected(true);
      });

      showToast(
        `EXECUTED BUY: ${qty} ${liveStock.symbol} @ ${liveStock.currency}${effectiveExecutionPrice.toFixed(2)} (Saved to SQLite)`,
      );
    } else {
      if (!currentPosition || currentPosition.qty < qty) {
        showToast(`Not enough shares to sell. You hold ${currentPosition?.qty || 0} shares.`);
        return;
      }

      const existing = simState.positions[liveStock.symbol]!;
      const remainingQty = existing.qty - qty;
      const realizedGain = (effectiveExecutionPrice - existing.avgCost) * qty;

      const newPositions = { ...simState.positions };
      if (remainingQty <= 0) {
        delete newPositions[liveStock.symbol];
      } else {
        newPositions[liveStock.symbol] = {
          ...existing,
          qty: remainingQty,
          currentPrice: liveStock.price,
          marketValue: Number((remainingQty * liveStock.price).toFixed(2)),
          unrealizedPL: Number(((liveStock.price - existing.avgCost) * remainingQty).toFixed(2)),
          unrealizedPLPct: Number(
            (((liveStock.price - existing.avgCost) / existing.avgCost) * 100).toFixed(2),
          ),
        };
      }

      const newOrder: SimulationOrder = {
        id: `ORD-${Date.now()}`,
        timestamp: new Date().toISOString(),
        timeString: new Date().toLocaleTimeString(),
        side: "SELL",
        symbol: liveStock.symbol,
        name: liveStock.name,
        qty,
        price: effectiveExecutionPrice,
        executionType: executionMode,
        total: totalCost,
        currency: liveStock.currency,
        status: "EXECUTED",
      };

      const nextState: SimulationState = {
        ...simState,
        cash: Number((simState.cash + totalCost).toFixed(2)),
        realizedPL: Number((simState.realizedPL + realizedGain).toFixed(2)),
        positions: newPositions,
        orders: [newOrder, ...simState.orders],
      };

      setSimState(nextState);
      setQtyInput("");
      syncPortfolioToSqlite(nextState, newOrder).then((ok) => {
        if (ok) setDbConnected(true);
      });

      showToast(
        `EXECUTED SELL: ${qty} ${liveStock.symbol} @ ${liveStock.currency}${effectiveExecutionPrice.toFixed(2)} (P/L: ${realizedGain >= 0 ? "+" : ""}${liveStock.currency}${realizedGain.toFixed(2)})`,
      );
    }
  };

  const handleResetSim = () => {
    if (confirm("Reset paper trading simulation in SQLite back to 0.00 balance?")) {
      const fresh: SimulationState = {
        cash: 0.0,
        startingCash: 0.0,
        positions: {},
        orders: [],
        realizedPL: 0.0,
      };
      setSimState(fresh);
      resetPortfolioInSqlite(0.0);
      showToast("SQLite portfolio & order history cleared.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-6xl rounded-2xl border border-[#174c36] bg-[#06100d] p-5 md:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.9)] max-h-[95vh] flex flex-col overflow-y-auto">
        {/* Top Header with /logo.png */}
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#143626] gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Mindspace Logo"
              className="h-10 w-10 object-contain drop-shadow-[0_0_12px_rgba(0,229,154,0.45)]"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black tracking-wide text-white">
                  MINDSPACE · Live Trading Simulation
                </h2>
                <span className="rounded-full border border-[#00e59a] bg-[#00e59a15] px-2.5 py-0.5 text-[10px] font-bold text-[#00e59a] uppercase">
                  Groww-Style Live Bid/Ask Engine
                </span>
                <span className="rounded-full border border-[#1e5c41] bg-[#092117] px-2.5 py-0.5 text-[10px] font-mono text-gray-300">
                  {dbConnected ? "🟢 SQLite DB Connected" : "💾 Local Storage Sync"}
                </span>
              </div>
              <p className="text-xs text-[#92a79c] mt-0.5">
                Enter your custom capital & share quantity · Executes at live market Bid/Ask prices
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* User Custom Capital Input */}
            <form onSubmit={handleSetCapital} className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                placeholder="Enter capital to add..."
                value={capitalInput}
                onChange={(e) => setCapitalInput(e.target.value)}
                className="w-40 rounded-lg border border-[#1a573b] bg-[#030806] px-2.5 py-1.5 text-xs text-white font-mono placeholder:text-gray-500 focus:outline-none focus:border-[#00e59a]"
              />
              <button
                type="submit"
                className="rounded-lg bg-[#00e59a] px-3 py-1.5 text-xs font-extrabold text-[#00180e] hover:bg-[#52ffbf] transition-colors"
              >
                + Add Capital
              </button>
            </form>

            <button
              onClick={handleResetSim}
              className="rounded-lg border border-[#234a36] bg-[#09130f] px-3 py-1.5 text-xs text-gray-300 hover:text-white transition-colors"
            >
              Clear Wallet
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-[#234a36] bg-[#09130f] px-3.5 py-1.5 text-sm text-gray-300 hover:border-[#00e59a] hover:text-[#00e59a] transition-colors"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Portfolio Metric Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 my-4">
          <div className="rounded-xl border border-[#163d2b] bg-[#08130f] p-3">
            <span className="text-[10.5px] text-gray-400 block font-medium">
              Your Available Capital
            </span>
            <span className="text-base font-extrabold font-mono text-[#00e59a] mt-1 block">
              {currencySymbol}
              {simState.cash.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="rounded-xl border border-[#163d2b] bg-[#08130f] p-3">
            <span className="text-[10.5px] text-gray-400 block font-medium">
              Live Position Value
            </span>
            <span className="text-base font-extrabold font-mono text-white mt-1 block">
              {currencySymbol}
              {portfolioPositionValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="rounded-xl border border-[#163d2b] bg-[#08130f] p-3">
            <span className="text-[10.5px] text-gray-400 block font-medium">
              Portfolio Net Worth
            </span>
            <span className="text-base font-extrabold font-mono text-white mt-1 block">
              {currencySymbol}
              {totalPortfolioValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="rounded-xl border border-[#163d2b] bg-[#08130f] p-3">
            <span className="text-[10.5px] text-gray-400 block font-medium">
              Live Unrealized P/L
            </span>
            <span
              className={`text-base font-extrabold font-mono mt-1 block ${
                totalUnrealizedPL >= 0 ? "text-[#00e59a]" : "text-[#ff3549]"
              }`}
            >
              {totalUnrealizedPL >= 0 ? "+" : ""}
              {currencySymbol}
              {totalUnrealizedPL.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="rounded-xl border border-[#163d2b] bg-[#08130f] p-3">
            <span className="text-[10.5px] text-gray-400 block font-medium">
              Booked Realized P/L
            </span>
            <span
              className={`text-base font-extrabold font-mono mt-1 block ${
                simState.realizedPL >= 0 ? "text-[#00e59a]" : "text-[#ff3549]"
              }`}
            >
              {simState.realizedPL >= 0 ? "+" : ""}
              {currencySymbol}
              {simState.realizedPL.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* If no stock is selected yet, prompt user to search a stock */}
        {!liveStock || !forecast ? (
          <div className="rounded-xl border border-[#174a35] bg-[#08130f] p-8 text-center my-2">
            <h3 className="text-base font-bold text-white">
              Search a Stock to Begin Live Simulation
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              No stock is currently selected. Search for any Indian (NSE/BSE) or US (NASDAQ/NYSE)
              ticker below:
            </p>
            <form
              onSubmit={handleSimStockSearch}
              className="mt-4 max-w-md mx-auto flex rounded-xl border border-[#00e59a] bg-[#030806] overflow-hidden"
            >
              <input
                type="text"
                placeholder="Enter stock name or symbol (e.g. Reliance, TCS, NVDA, AAPL)..."
                value={simSearchQuery}
                onChange={(e) => setSimSearchQuery(e.target.value)}
                className="w-full bg-transparent px-3.5 py-2.5 text-xs text-white placeholder:text-gray-500 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-[#00e59a] text-[#00180e] font-extrabold px-4 text-xs"
              >
                Load Stock
              </button>
            </form>
          </div>
        ) : (
          /* Main Grid: Interactive Candlestick Chart & Groww Order Pad */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left 2 Cols: Interactive Candlestick & Rate Chart */}
            <div className="lg:col-span-2 rounded-xl border border-[#174a35] bg-[#08130f] p-4 flex flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#143626]">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-white">{liveStock.name}</h3>
                    <span className="text-xs font-mono text-[#00e59a] bg-[#00e59a15] px-2 py-0.5 rounded">
                      {liveStock.symbol} · {liveStock.market}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-baseline gap-3 mt-1">
                    <span className="text-2xl font-black font-mono text-white">
                      {liveStock.currency}
                      {liveStock.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold ${
                        liveStock.change >= 0 ? "text-[#00e59a]" : "text-[#ff3549]"
                      }`}
                    >
                      {liveStock.change >= 0 ? "▲ +" : "▼ "}
                      {liveStock.change.toFixed(2)}%
                    </span>
                    <span className="text-[11px] font-mono text-gray-400">
                      Bid{" "}
                      <strong className="text-[#00e59a]">
                        {liveStock.currency}
                        {liveStock.bid.toFixed(2)}
                      </strong>{" "}
                      · Ask{" "}
                      <strong className="text-[#ff6b7a]">
                        {liveStock.currency}
                        {liveStock.ask.toFixed(2)}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Time Horizon Selector */}
                <div className="flex items-center gap-1 bg-[#050b09] p-1 rounded-lg border border-[#174a35]">
                  {(["1D", "1W", "1M", "6M", "1Y", "5Y"] as TimeHorizon[]).map((hz) => (
                    <button
                      key={hz}
                      onClick={() => setSelectedHorizon(hz)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                        selectedHorizon === hz
                          ? "bg-[#00e59a] text-[#00180e] font-extrabold shadow-[0_0_10px_rgba(0,229,154,0.3)]"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {hz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Candlestick & ML Forecast Chart */}
              <div className="my-3">
                <CandlestickChart
                  stock={liveStock}
                  candles={liveCandles}
                  horizon={selectedHorizon}
                  targetPrice={forecast.targetPrice}
                  stopLossPrice={forecast.stopLossPrice}
                  height={240}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-[#143626] gap-2">
                <span>
                  Horizon Forecast:{" "}
                  <strong className="text-[#00e59a] font-mono">
                    {selectedHorizon} Target {liveStock.currency}
                    {forecast.targetPrice.toFixed(2)} (+{forecast.targetGainPct}%)
                  </strong>
                </span>
                <span>
                  Bias:{" "}
                  <strong className="text-white">
                    {HORIZON_FACTORS[selectedHorizon].defaultBias}
                  </strong>
                </span>
                <span className="text-[#00e59a] font-mono font-bold">
                  {forecast.accuracyRate}% ML Ensemble Active
                </span>
              </div>
            </div>

            {/* Right Col: Groww-Style Live Bid/Ask Order Pad */}
            <div className="rounded-xl border border-[#174a35] bg-[#08130f] p-4 flex flex-col justify-between">
              <div>
                <div className="flex rounded-lg bg-[#040806] p-1 border border-[#163d2b] mb-3">
                  <button
                    onClick={() => setActiveSide("BUY")}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                      activeSide === "BUY"
                        ? "bg-[#00e59a] text-[#00180e] shadow-[0_0_12px_rgba(0,229,154,0.3)]"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    BUY (Ask {liveStock.currency}
                    {liveStock.ask.toFixed(2)})
                  </button>
                  <button
                    onClick={() => setActiveSide("SELL")}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                      activeSide === "SELL"
                        ? "bg-[#ff3549] text-white shadow-[0_0_12px_rgba(255,53,73,0.3)]"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    SELL (Bid {liveStock.currency}
                    {liveStock.bid.toFixed(2)})
                  </button>
                </div>

                {/* Order Type Toggle: Market Bid/Ask vs Limit */}
                <div className="flex items-center gap-2 mb-3 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setExecutionMode("MARKET_BID_ASK")}
                    className={`flex-1 py-1.5 rounded-lg border font-bold transition-colors ${
                      executionMode === "MARKET_BID_ASK"
                        ? "border-[#00e59a] bg-[#00e59a18] text-[#00e59a]"
                        : "border-[#163d2b] text-gray-400"
                    }`}
                  >
                    ⚡ Live Bid/Ask Market
                  </button>
                  <button
                    type="button"
                    onClick={() => setExecutionMode("LIMIT")}
                    className={`flex-1 py-1.5 rounded-lg border font-bold transition-colors ${
                      executionMode === "LIMIT"
                        ? "border-[#00e59a] bg-[#00e59a18] text-[#00e59a]"
                        : "border-[#163d2b] text-gray-400"
                    }`}
                  >
                    Limit Order
                  </button>
                </div>

                {/* Form inputs — empty by default so user enters their own numbers */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-gray-400 font-medium block mb-1">
                      Order Quantity (Shares)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Enter number of shares..."
                      value={qtyInput}
                      onChange={(e) => setQtyInput(e.target.value)}
                      className="w-full rounded-lg border border-[#1a573b] bg-[#030806] px-3 py-2 text-sm text-white font-mono placeholder:text-gray-500 focus:outline-none focus:border-[#00e59a]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-400 font-medium block mb-1">
                      {executionMode === "MARKET_BID_ASK"
                        ? `Live ${activeSide === "BUY" ? "Ask" : "Bid"} Execution Price (${liveStock.currency})`
                        : `Your Limit Execution Price (${liveStock.currency})`}
                    </label>
                    {executionMode === "MARKET_BID_ASK" ? (
                      <div className="w-full rounded-lg border border-[#1a573b] bg-[#030806] px-3 py-2 text-sm text-[#00e59a] font-mono">
                        {liveStock.currency}
                        {effectiveExecutionPrice.toFixed(2)} (Live Market{" "}
                        {activeSide === "BUY" ? "Ask" : "Bid"})
                      </div>
                    ) : (
                      <input
                        type="number"
                        min="0.01"
                        step="0.05"
                        placeholder="Enter limit price..."
                        value={limitPriceInput}
                        onChange={(e) => setLimitPriceInput(e.target.value)}
                        className="w-full rounded-lg border border-[#1a573b] bg-[#030806] px-3 py-2 text-sm text-white font-mono placeholder:text-gray-500 focus:outline-none focus:border-[#00e59a]"
                      />
                    )}
                  </div>
                </div>

                {/* Summary calculations */}
                <div className="mt-4 rounded-lg bg-[#040907] p-3 border border-[#153e2c] space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>Order Value:</span>
                    <span className="font-mono text-white font-bold">
                      {qty > 0
                        ? `${liveStock.currency}${totalCost.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                        : "Enter quantity above"}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Projected {selectedHorizon} Profit:</span>
                    <span className="font-mono text-[#00e59a] font-bold">
                      {qty > 0 && totalCost > 0
                        ? `+${liveStock.currency}${forecast.projectedProfitAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Available Capital:</span>
                    <span className="font-mono text-[#00e59a]">
                      {liveStock.currency}
                      {simState.cash.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Current Holdings ({liveStock.symbol}):</span>
                    <span className="font-mono text-white">
                      {currentPosition ? `${currentPosition.qty} shares` : "0 shares"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Execute Button */}
              <button
                onClick={handleExecuteOrder}
                className={`w-full py-3 rounded-xl font-black text-sm tracking-wide mt-4 transition-all shadow-lg ${
                  activeSide === "BUY"
                    ? "bg-[#00e59a] text-[#00180e] hover:bg-[#52ffbf] shadow-[0_0_20px_rgba(0,229,154,0.25)]"
                    : "bg-[#ff3549] text-white hover:bg-[#ff5f6e] shadow-[0_0_20px_rgba(255,53,73,0.25)]"
                }`}
              >
                {qty > 0
                  ? `Execute ${activeSide} (${qty} Shares @ ${liveStock.currency}${effectiveExecutionPrice.toFixed(2)})`
                  : `Enter Quantity to Execute ${activeSide}`}
              </button>
            </div>
          </div>
        )}

        {/* Positions & SQLite Order History Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
          {/* Open Positions */}
          <div className="rounded-xl border border-[#174a35] bg-[#08130f] p-4">
            <h4 className="font-bold text-sm text-white pb-2 border-b border-[#143626] flex items-center justify-between">
              <span>Open Positions ({Object.keys(simState.positions).length})</span>
              <span className="text-[10px] font-mono text-[#00e59a]">Live Mark-to-Bid P/L</span>
            </h4>
            <div className="overflow-x-auto mt-2 max-h-44 scrollbar-thin">
              {Object.keys(simState.positions).length === 0 ? (
                <p className="text-xs text-gray-500 py-6 text-center">
                  No open positions. Add capital and place a BUY order above to track live P/L
                  swings.
                </p>
              ) : (
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-gray-400 border-b border-[#143626]">
                      <th className="py-2">Asset</th>
                      <th>Qty</th>
                      <th>Avg Cost</th>
                      <th>Live Bid</th>
                      <th>Live P/L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(simState.positions).map((pos) => {
                      const liveQ = marketSnap.quotes[pos.symbol];
                      const markPrice = liveQ ? liveQ.bid : pos.currentPrice;
                      const pl = (markPrice - pos.avgCost) * pos.qty;
                      const plPct = ((markPrice - pos.avgCost) / pos.avgCost) * 100;
                      return (
                        <tr key={pos.symbol} className="border-b border-[#0e271c] text-gray-200">
                          <td className="py-2 font-bold text-white">{pos.symbol}</td>
                          <td>{pos.qty}</td>
                          <td>
                            {pos.currency}
                            {pos.avgCost.toFixed(2)}
                          </td>
                          <td>
                            {pos.currency}
                            {markPrice.toFixed(2)}
                          </td>
                          <td className={pl >= 0 ? "text-[#00e59a]" : "text-[#ff3549]"}>
                            {pl >= 0 ? "+" : ""}
                            {pos.currency}
                            {pl.toFixed(2)} ({plPct >= 0 ? "+" : ""}
                            {plPct.toFixed(2)}%)
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Order History */}
          <div className="rounded-xl border border-[#174a35] bg-[#08130f] p-4">
            <h4 className="font-bold text-sm text-white pb-2 border-b border-[#143626] flex items-center justify-between">
              <span>Executed Order History ({simState.orders.length})</span>
              <span className="text-[10px] font-mono text-gray-400">SQLite Table: orders</span>
            </h4>
            <div className="overflow-x-auto mt-2 max-h-44 scrollbar-thin">
              {simState.orders.length === 0 ? (
                <p className="text-xs text-gray-500 py-6 text-center">
                  No orders executed yet. Orders are automatically persisted to SQLite.
                </p>
              ) : (
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-gray-400 border-b border-[#143626]">
                      <th className="py-2">Time</th>
                      <th>Side</th>
                      <th>Symbol</th>
                      <th>Qty</th>
                      <th>Fill Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simState.orders.slice(0, 12).map((ord) => (
                      <tr key={ord.id} className="border-b border-[#0e271c] text-gray-200">
                        <td className="py-1.5 text-gray-400">{ord.timeString}</td>
                        <td
                          className={`font-bold ${ord.side === "BUY" ? "text-[#00e59a]" : "text-[#ff3549]"}`}
                        >
                          {ord.side}
                        </td>
                        <td>{ord.symbol}</td>
                        <td>{ord.qty}</td>
                        <td>
                          {ord.currency}
                          {ord.price.toFixed(2)}
                        </td>
                        <td>
                          {ord.currency}
                          {ord.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Toast popup */}
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-xl border border-[#00e59a] bg-[#051a12] px-5 py-3 text-sm text-white shadow-[0_10px_30px_rgba(0,0,0,0.8)] font-medium">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}
