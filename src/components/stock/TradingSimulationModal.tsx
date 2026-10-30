import React, { useState, useEffect } from "react";
import { StockQuote, SimulationOrder, SimulationState, TimeHorizon } from "@/types/stock";
import {
  subscribeMarketEngine,
  getMarketSnapshot,
  getLiveStockQuote,
  searchStocksLive,
  refreshSymbolFromLiveApi,
  StockSearchResultItem,
} from "@/lib/market-engine";
import {
  generateDeterministicPrediction,
  ALL_TIME_HORIZONS,
  HORIZON_FACTORS,
} from "@/lib/openrouter";
import { exportPredictionToWordDoc } from "@/lib/export-word";
import {
  loadPortfolioFromSqlite,
  syncPortfolioToSqlite,
  resetPortfolioInSqlite,
} from "@/lib/sqlite-client";
import { getCurrentUser } from "@/lib/auth";
import { CandlestickChart } from "./CandlestickChart";

interface TradingSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStock: StockQuote | null;
  onSelectStock: (stock: StockQuote) => void;
}

export function TradingSimulationModal({
  isOpen,
  onClose,
  currentStock,
  onSelectStock,
}: TradingSimulationModalProps) {
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY");
  const [executionMode, setExecutionMode] = useState<"MARKET" | "LIMIT">("MARKET");
  const [qtyInput, setQtyInput] = useState<string>("");
  const [limitPriceInput, setLimitPriceInput] = useState<string>("");
  const [depositInput, setDepositInput] = useState<string>("");
  const [searchTicker, setSearchTicker] = useState<string>("");
  const [searchResults, setSearchResults] = useState<StockSearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [reportHorizon, setReportHorizon] = useState<TimeHorizon>("1D");
  const [showAllHorizonsTable, setShowAllHorizonsTable] = useState<boolean>(false);

  const activeUser = getCurrentUser();
  const activeUsername = activeUser?.username || "guest";

  // Paper trading state isolated per logged-in user
  const [simState, setSimState] = useState<SimulationState>({
    cash: 0.0,
    startingCash: 0.0,
    positions: {},
    orders: [],
    realizedPL: 0.0,
  });

  // Load user-specific portfolio when modal opens or user changes
  useEffect(() => {
    if (!isOpen) return;
    loadPortfolioFromSqlite(activeUsername).then(({ simState: loaded }) => {
      setSimState(loaded);
    });
  }, [isOpen, activeUsername]);

  // Live market engine state
  const [marketSnap, setMarketSnap] = useState(() => getMarketSnapshot());

  useEffect(() => {
    if (!isOpen) return;
    return subscribeMarketEngine((snap) => {
      setMarketSnap(snap);
    });
  }, [isOpen]);

  const liveStock = currentStock ? marketSnap.quotes[currentStock.symbol] || currentStock : null;
  const liveCandles = currentStock ? marketSnap.candlesBySymbol[currentStock.symbol] || [] : [];

  // Sync live prices into user's open positions
  useEffect(() => {
    setSimState((prev) => {
      const updatedPositions = { ...prev.positions };
      let changed = false;
      for (const sym of Object.keys(updatedPositions)) {
        const pos = updatedPositions[sym];
        const liveQuote = marketSnap.quotes[sym];
        if (liveQuote && liveQuote.price !== pos.currentPrice) {
          const marketValue = Number((pos.qty * liveQuote.price).toFixed(2));
          const unrealizedPL = Number(((liveQuote.price - pos.avgCost) * pos.qty).toFixed(2));
          const unrealizedPLPct = Number(
            (((liveQuote.price - pos.avgCost) / pos.avgCost) * 100).toFixed(2),
          );
          updatedPositions[sym] = {
            ...pos,
            currentPrice: liveQuote.price,
            bidPrice: liveQuote.bid,
            askPrice: liveQuote.ask,
            marketValue,
            unrealizedPL,
            unrealizedPLPct,
          };
          changed = true;
        }
      }
      return changed ? { ...prev, positions: updatedPositions } : prev;
    });
  }, [marketSnap]);

  // Live autocomplete search inside simulation modal
  useEffect(() => {
    const q = searchTicker.trim();
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
  }, [searchTicker]);

  if (!isOpen) return null;

  const currencySymbol = liveStock?.currency || "₹";

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleSetOrAddCapital = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(depositInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("Enter a valid positive capital amount.");
      return;
    }

    const nextState: SimulationState = {
      ...simState,
      cash: Number((simState.cash + amount).toFixed(2)),
      startingCash: Number((simState.startingCash + amount).toFixed(2)),
    };
    setSimState(nextState);
    setDepositInput("");
    syncPortfolioToSqlite(nextState, undefined, activeUsername);
    showToast(`Added ${currencySymbol}${amount.toLocaleString()} to your simulation wallet.`);
  };

  const handleSelectSimStock = async (symbolOrYahoo: string) => {
    setIsSearching(true);
    const initial = getLiveStockQuote(symbolOrYahoo);
    onSelectStock(initial);
    setSearchTicker("");
    setSearchResults([]);
    setLimitPriceInput("");

    const liveUpdated = await refreshSymbolFromLiveApi(symbolOrYahoo);
    if (liveUpdated) {
      onSelectStock(liveUpdated);
      showToast(
        `Switched to ${liveUpdated.name} (${liveUpdated.symbol}: ${liveUpdated.currency}${liveUpdated.price.toFixed(2)})`,
      );
    } else {
      showToast(`Switched to ${initial.name} (${initial.symbol})`);
    }
    setIsSearching(false);
  };

  const handleSearchStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTicker.trim();
    if (!q) return;
    if (searchResults.length > 0) {
      await handleSelectSimStock(searchResults[0].yahooSymbol || searchResults[0].symbol);
    } else {
      await handleSelectSimStock(q);
    }
  };

  // Prepare Sell Pad for a bought stock when clicked
  const handlePrepareSellPosition = (symbol: string, heldQty: number) => {
    const quote = getLiveStockQuote(symbol);
    onSelectStock(quote);
    setOrderSide("SELL");
    setExecutionMode("MARKET");
    setQtyInput(String(heldQty));
    showToast(
      `Loaded ${symbol} (${heldQty} shares) into SELL pad @ Bid ${quote.currency}${quote.bid.toFixed(2)}.`,
    );
  };

  // Instant 1-Click Sell of an open position at live Bid price
  const handleInstantSellPosition = (symbol: string, sellQty?: number) => {
    const existing = simState.positions[symbol];
    if (!existing || existing.qty <= 0) {
      showToast(`No shares of ${symbol} available to sell.`);
      return;
    }
    const qtyToSell = sellQty && sellQty > 0 ? Math.min(existing.qty, sellQty) : existing.qty;
    const quote = marketSnap.quotes[symbol] || getLiveStockQuote(symbol);
    const execPrice = Number((quote.bid || existing.currentPrice).toFixed(2));
    const totalProceeds = Number((qtyToSell * execPrice).toFixed(2));
    const tradeProfit = Number(((execPrice - existing.avgCost) * qtyToSell).toFixed(2));

    const remainingQty = existing.qty - qtyToSell;
    const updatedPositions = { ...simState.positions };

    if (remainingQty === 0) {
      delete updatedPositions[symbol];
    } else {
      updatedPositions[symbol] = {
        ...existing,
        qty: remainingQty,
        currentPrice: execPrice,
        marketValue: Number((remainingQty * execPrice).toFixed(2)),
        unrealizedPL: Number(((execPrice - existing.avgCost) * remainingQty).toFixed(2)),
        unrealizedPLPct: Number(
          (((execPrice - existing.avgCost) / existing.avgCost) * 100).toFixed(2),
        ),
      };
    }

    const newOrder: SimulationOrder = {
      id: `ORD-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      timeString: new Date().toLocaleTimeString(),
      side: "SELL",
      orderType: "MARKET",
      symbol: existing.symbol,
      name: existing.name,
      qty: qtyToSell,
      price: execPrice,
      bidAtExec: quote.bid,
      askAtExec: quote.ask,
      total: totalProceeds,
      currency: existing.currency,
      status: "EXECUTED",
    };

    const nextState: SimulationState = {
      ...simState,
      cash: Number((simState.cash + totalProceeds).toFixed(2)),
      positions: updatedPositions,
      orders: [newOrder, ...simState.orders].slice(0, 50),
      realizedPL: Number((simState.realizedPL + tradeProfit).toFixed(2)),
    };

    setSimState(nextState);
    syncPortfolioToSqlite(nextState, newOrder, activeUsername);
    onSelectStock(quote);
    showToast(
      `SOLD ${qtyToSell} shares of ${symbol} @ ${existing.currency}${execPrice.toFixed(2)} (${tradeProfit >= 0 ? "Profit +" : "Loss -"}${existing.currency}${Math.abs(tradeProfit).toFixed(2)})`,
    );
  };

  const qty = Math.max(0, Math.floor(Number(qtyInput) || 0));

  const effectiveExecutionPrice = liveStock
    ? executionMode === "LIMIT" && Number(limitPriceInput) > 0
      ? Number(limitPriceInput)
      : orderSide === "BUY"
        ? liveStock.ask
        : liveStock.bid
    : 0;

  const orderTotal = Number((qty * effectiveExecutionPrice).toFixed(2));
  const heldPosition = liveStock ? simState.positions[liveStock.symbol] : undefined;
  const heldShares = heldPosition?.qty || 0;

  // Evaluate 4-Agent Multi-Horizon Prediction (1D, 1W, 1M, 6M, 1Y, 5Y) for the active stock
  const evalSharesForReport = qty > 0 ? qty : heldShares > 0 ? heldShares : 10;
  const activePrediction = liveStock
    ? generateDeterministicPrediction(
        liveStock,
        reportHorizon,
        evalSharesForReport,
        heldPosition?.avgCost,
      )
    : null;
  const activeHorizonReport = activePrediction
    ? activePrediction.horizonForecasts[reportHorizon]
    : null;

  const totalPositionsValue = Object.values(simState.positions).reduce(
    (sum, p) => sum + p.marketValue,
    0,
  );
  const totalUnrealizedPL = Object.values(simState.positions).reduce(
    (sum, p) => sum + p.unrealizedPL,
    0,
  );
  const totalEquity = Number((simState.cash + totalPositionsValue).toFixed(2));
  const netReturnPct =
    simState.startingCash > 0
      ? Number((((totalEquity - simState.startingCash) / simState.startingCash) * 100).toFixed(2))
      : 0;

  const handleExecuteOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveStock) {
      showToast("Search and select a stock first.");
      return;
    }
    if (qty <= 0) {
      showToast("Enter the number of shares you want to trade.");
      return;
    }

    if (orderSide === "BUY") {
      if (simState.cash <= 0) {
        showToast("Your virtual wallet has 0 balance. Add virtual capital above first.");
        return;
      }
      if (orderTotal > simState.cash) {
        showToast(
          `Insufficient virtual cash! Required: ${liveStock.currency}${orderTotal.toLocaleString()}, Available: ${liveStock.currency}${simState.cash.toLocaleString()}`,
        );
        return;
      }

      const existing = simState.positions[liveStock.symbol];
      const newQty = (existing?.qty || 0) + qty;
      const newAvgCost = existing
        ? Number(((existing.avgCost * existing.qty + orderTotal) / newQty).toFixed(2))
        : effectiveExecutionPrice;
      const marketValue = Number((newQty * liveStock.price).toFixed(2));
      const unrealizedPL = Number(((liveStock.price - newAvgCost) * newQty).toFixed(2));
      const unrealizedPLPct = Number(
        (((liveStock.price - newAvgCost) / newAvgCost) * 100).toFixed(2),
      );

      const newOrder: SimulationOrder = {
        id: `ORD-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toISOString(),
        timeString: new Date().toLocaleTimeString(),
        side: "BUY",
        orderType: executionMode,
        symbol: liveStock.symbol,
        name: liveStock.name,
        qty,
        price: effectiveExecutionPrice,
        bidAtExec: liveStock.bid,
        askAtExec: liveStock.ask,
        total: orderTotal,
        currency: liveStock.currency,
        status: "EXECUTED",
      };

      const nextState: SimulationState = {
        ...simState,
        cash: Number((simState.cash - orderTotal).toFixed(2)),
        positions: {
          ...simState.positions,
          [liveStock.symbol]: {
            symbol: liveStock.symbol,
            name: liveStock.name,
            qty: newQty,
            avgCost: newAvgCost,
            currentPrice: liveStock.price,
            bidPrice: liveStock.bid,
            askPrice: liveStock.ask,
            currency: liveStock.currency,
            marketValue,
            unrealizedPL,
            unrealizedPLPct,
          },
        },
        orders: [newOrder, ...simState.orders].slice(0, 50),
      };

      setSimState(nextState);
      setQtyInput("");
      syncPortfolioToSqlite(nextState, newOrder, activeUsername);
      showToast(
        `EXECUTED BUY: ${qty} ${liveStock.symbol} @ ${liveStock.currency}${effectiveExecutionPrice.toFixed(2)}`,
      );
    } else {
      const existing = simState.positions[liveStock.symbol];
      if (!existing || existing.qty < qty) {
        showToast(`You only hold ${existing?.qty || 0} shares of ${liveStock.symbol} to sell.`);
        return;
      }

      const remainingQty = existing.qty - qty;
      const tradeProfit = Number(((effectiveExecutionPrice - existing.avgCost) * qty).toFixed(2));
      const updatedPositions = { ...simState.positions };

      if (remainingQty === 0) {
        delete updatedPositions[liveStock.symbol];
      } else {
        updatedPositions[liveStock.symbol] = {
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
        id: `ORD-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toISOString(),
        timeString: new Date().toLocaleTimeString(),
        side: "SELL",
        orderType: executionMode,
        symbol: liveStock.symbol,
        name: liveStock.name,
        qty,
        price: effectiveExecutionPrice,
        bidAtExec: liveStock.bid,
        askAtExec: liveStock.ask,
        total: orderTotal,
        currency: liveStock.currency,
        status: "EXECUTED",
      };

      const nextState: SimulationState = {
        ...simState,
        cash: Number((simState.cash + orderTotal).toFixed(2)),
        positions: updatedPositions,
        orders: [newOrder, ...simState.orders].slice(0, 50),
        realizedPL: Number((simState.realizedPL + tradeProfit).toFixed(2)),
      };

      setSimState(nextState);
      setQtyInput("");
      syncPortfolioToSqlite(nextState, newOrder, activeUsername);
      showToast(
        `EXECUTED SELL: ${qty} ${liveStock.symbol} @ ${liveStock.currency}${effectiveExecutionPrice.toFixed(2)} (${tradeProfit >= 0 ? "Profit +" : "Loss -"}${liveStock.currency}${Math.abs(tradeProfit).toFixed(2)})`,
      );
    }
  };

  const handleResetAccount = () => {
    if (confirm("Reset your paper trading simulation back to 0.00 balance?")) {
      const empty: SimulationState = {
        cash: 0.0,
        startingCash: 0.0,
        positions: {},
        orders: [],
        realizedPL: 0.0,
      };
      setSimState(empty);
      resetPortfolioInSqlite(0.0, activeUsername);
      showToast("Portfolio & order history cleared.");
    }
  };

  const positionsList = Object.values(simState.positions);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl rounded-2xl border border-[#1d6545] bg-[#040b08] p-4 sm:p-6 shadow-[0_24px_60px_rgba(0,0,0,0.92)] max-h-[94vh] flex flex-col overflow-y-auto text-[#f0f7f3]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#163c2b]">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Mindspace Logo"
              className="h-10 w-10 object-contain drop-shadow-[0_0_12px_rgba(0,229,154,0.45)]"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-wider text-white">
                  MINDSPACE · LIVE TRADING SIMULATION
                </h2>
                <span className="rounded-full border border-[#00e59a] bg-[#00e59a18] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#00e59a]">
                  Live Bid/Ask Execution Engine
                </span>
                <span className="rounded-full border border-[#38bdf866] bg-[#38bdf818] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#38bdf8]">
                  👤 @{activeUsername}
                </span>
              </div>
              <p className="text-xs text-[#92a79c] mt-0.5">
                Buy & sell stocks, switch between your bought positions, and inspect 4-Agent
                Profit/Loss forecasts across 1D, 1W, 1M, 6M, 1Y & 5Y
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetAccount}
              className="rounded-lg border border-[#3a2024] bg-[#160a0d] px-3 py-1.5 text-xs text-[#ff6b7a] hover:border-[#ff3549] transition-colors font-semibold"
            >
              Reset Wallet
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-[#234a36] bg-[#09130f] px-3.5 py-1.5 text-xs text-gray-200 hover:border-[#00e59a] hover:text-[#00e59a] transition-colors font-bold"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* User Custom Capital Setup & Search Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 my-4">
          {/* Set / Add Virtual Capital Form */}
          <form
            onSubmit={handleSetOrAddCapital}
            className="lg:col-span-5 flex items-center gap-2 rounded-xl border border-[#19543a] bg-[#06140e] p-2.5"
          >
            <div className="flex-1">
              <label className="text-[10px] text-[#00e59a] font-mono uppercase font-bold block">
                Set / Add Virtual Wallet Capital ({currencySymbol})
              </label>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="Enter your own capital (e.g. 50000)"
                value={depositInput}
                onChange={(e) => setDepositInput(e.target.value)}
                className="w-full bg-transparent text-xs font-mono font-bold text-white placeholder:text-gray-500 focus:outline-none mt-0.5"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[#00e59a] px-3.5 py-2 text-xs font-extrabold text-[#00180e] hover:bg-[#48ffbe] transition-colors whitespace-nowrap"
            >
              + Add Capital
            </button>
          </form>

          {/* Search Any Stock to Trade */}
          <form onSubmit={handleSearchStock} className="lg:col-span-7 relative">
            <div className="flex items-center gap-2 rounded-xl border border-[#19543a] bg-[#06140e] p-2.5 h-full">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 font-mono uppercase font-bold block">
                  Search & Switch Stock (NSE / BSE / NASDAQ / NYSE)
                </label>
                <input
                  type="text"
                  placeholder="Type any company or ticker (e.g. RELIANCE, TCS, NVDA, TSLA, ZOMATO)..."
                  value={searchTicker}
                  onChange={(e) => setSearchTicker(e.target.value)}
                  className="w-full bg-transparent text-xs text-white placeholder:text-gray-500 focus:outline-none mt-0.5"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg border border-[#00e59a] bg-[#0a291c] px-4 py-2 text-xs font-extrabold text-[#00e59a] hover:bg-[#00e59a] hover:text-[#00180e] transition-colors whitespace-nowrap"
              >
                {isSearching ? "..." : "Load Stock"}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-[#1b5e41] bg-[#040c09] shadow-2xl divide-y divide-[#113022] max-h-56 overflow-y-auto">
                {searchResults.map((item) => (
                  <button
                    key={item.yahooSymbol}
                    type="button"
                    onClick={() => handleSelectSimStock(item.yahooSymbol)}
                    className="w-full px-3.5 py-2.5 text-left hover:bg-[#0a2117] transition-colors flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{item.name}</div>
                      <div className="text-[10px] font-mono text-[#00e59a]">
                        {item.symbol} · {item.market}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400">Trade & Analyze →</span>
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>

        {/* Quick Stock Switcher Bar: Bought Stocks + Popular Market Tickers */}
        <div className="mb-4 rounded-xl border border-[#174833] bg-[#06120d] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#00e59a]">
              🔄 Quick Stock Switcher & Bought Positions ({positionsList.length} Owned)
            </span>
            <span className="text-[10px] text-gray-400 font-mono">
              Click any bought stock below to switch to it, inspect 1D–5Y agent reports, or sell it
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {positionsList.map((pos) => {
              const isSelected = liveStock?.symbol === pos.symbol;
              const isGain = pos.unrealizedPL >= 0;
              return (
                <div
                  key={pos.symbol}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs transition-all ${
                    isSelected
                      ? "border-[#00e59a] bg-[#0b291d] shadow-[0_0_14px_rgba(0,229,154,0.25)]"
                      : "border-[#1d543c] bg-[#040c09] hover:border-[#00e59a]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectSimStock(pos.symbol)}
                    className="flex items-center gap-1.5 text-left"
                  >
                    <span className="font-black text-white">{pos.symbol}</span>
                    <span className="rounded bg-[#00e59a22] px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#00e59a]">
                      {pos.qty} sh
                    </span>
                    <span
                      className={`text-[10.5px] font-mono font-bold ${
                        isGain ? "text-[#00e59a]" : "text-[#ff5a6b]"
                      }`}
                    >
                      {isGain ? "+" : ""}
                      {pos.unrealizedPLPct}%
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrepareSellPosition(pos.symbol, pos.qty)}
                    className="ml-1 rounded-lg bg-[#ff3549]/20 border border-[#ff3549]/50 px-2 py-0.5 text-[10px] font-extrabold text-[#ff7b88] hover:bg-[#ff3549] hover:text-white transition-colors"
                    title={`Switch to ${pos.symbol} and pre-fill SELL order`}
                  >
                    Sell
                  </button>
                </div>
              );
            })}

            {/* Market Quick Switch Pills */}
            {["RELIANCE", "TCS", "HDFCBANK", "ZOMATO", "NVDA", "AAPL", "TSLA", "MSFT"].map(
              (sym) => {
                if (simState.positions[sym]) return null;
                const isSelected = liveStock?.symbol === sym;
                return (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => handleSelectSimStock(sym)}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-mono font-semibold transition-all ${
                      isSelected
                        ? "border-[#00e59a] bg-[#00e59a] text-[#00180e] font-black"
                        : "border-[#163d2b] bg-[#040a07] text-gray-300 hover:border-[#00e59a] hover:text-white"
                    }`}
                  >
                    {sym}
                  </button>
                );
              },
            )}
          </div>
        </div>

        {/* Top Account Portfolio Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="rounded-xl border border-[#16422f] bg-[#07130e] p-3">
            <span className="text-[11px] text-gray-400 block">Total Portfolio Equity</span>
            <strong className="text-lg font-black font-mono text-white mt-0.5 block">
              {currencySymbol}
              {totalEquity.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </strong>
            <span
              className={`text-[10px] font-mono ${
                netReturnPct >= 0 ? "text-[#00e59a]" : "text-[#ff3549]"
              }`}
            >
              {netReturnPct >= 0 ? "+" : ""}
              {netReturnPct}% vsAdded Capital
            </span>
          </div>

          <div className="rounded-xl border border-[#16422f] bg-[#07130e] p-3">
            <span className="text-[11px] text-gray-400 block">Available Virtual Cash</span>
            <strong className="text-lg font-black font-mono text-[#00e59a] mt-0.5 block">
              {currencySymbol}
              {simState.cash.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </strong>
            <span className="text-[10px] text-gray-500 font-mono">
              {simState.cash === 0 ? "Add virtual capital above" : "Ready for instant orders"}
            </span>
          </div>

          <div className="rounded-xl border border-[#16422f] bg-[#07130e] p-3">
            <span className="text-[11px] text-gray-400 block">Unrealized P&L (Open)</span>
            <strong
              className={`text-lg font-black font-mono mt-0.5 block ${
                totalUnrealizedPL >= 0 ? "text-[#00e59a]" : "text-[#ff3549]"
              }`}
            >
              {totalUnrealizedPL >= 0 ? "+" : ""}
              {currencySymbol}
              {totalUnrealizedPL.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </strong>
            <span className="text-[10px] text-gray-500 font-mono">
              {positionsList.length} active position(s)
            </span>
          </div>

          <div className="rounded-xl border border-[#16422f] bg-[#07130e] p-3">
            <span className="text-[11px] text-gray-400 block">Realized P&L (Closed)</span>
            <strong
              className={`text-lg font-black font-mono mt-0.5 block ${
                simState.realizedPL >= 0 ? "text-[#00e59a]" : "text-[#ff3549]"
              }`}
            >
              {simState.realizedPL >= 0 ? "+" : ""}
              {currencySymbol}
              {simState.realizedPL.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </strong>
            <span className="text-[10px] text-gray-500 font-mono">
              {simState.orders.length} executed trades
            </span>
          </div>
        </div>

        {/* Empty State if no stock is selected yet */}
        {!liveStock ? (
          <div className="rounded-2xl border border-[#174833] bg-[#06110c] p-10 text-center my-2">
            <h3 className="text-base font-extrabold text-white uppercase tracking-wider">
              Select or Search Any Stock Above to Begin Trading & 6-Horizon Analysis
            </h3>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
              Click any stock in the Quick Switcher bar above or type a ticker in the search box to
              stream live Bid/Ask prices, execute trades, and view 4-Agent Profit/Loss probabilities
              for 1D, 1W, 1M, 6M, 1Y, and 5Y.
            </p>
          </div>
        ) : (
          /* Main Grid: Interactive Candlestick Chart & Order Pad */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Col: Live Candlestick Chart + Orderbook Bid/Ask Depth */}
            <div className="lg:col-span-8 space-y-4">
              <div className="rounded-2xl border border-[#174833] bg-[#06110c] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-extrabold text-white">{liveStock.name}</h3>
                      <span className="text-xs font-mono text-[#00e59a] px-2 py-0.5 rounded bg-[#00e59a15] border border-[#00e59a40]">
                        {liveStock.symbol} · {liveStock.market}
                      </span>
                      {heldShares > 0 && (
                        <span className="text-xs font-mono text-amber-300 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/40 font-bold">
                          Owned: {heldShares} shares @ {liveStock.currency}
                          {heldPosition?.avgCost.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{liveStock.description}</p>
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-black font-mono text-white">
                      {liveStock.currency}
                      {liveStock.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center justify-end gap-2 text-xs font-mono">
                      <span className={liveStock.change >= 0 ? "text-[#00e59a]" : "text-[#ff3549]"}>
                        {liveStock.change >= 0 ? "▲ +" : "▼ "}
                        {liveStock.change.toFixed(2)}%
                      </span>
                      <span className="text-gray-500">|</span>
                      <span className="text-[#00e59a]">
                        Bid: {liveStock.currency}
                        {liveStock.bid.toFixed(2)}
                      </span>
                      <span className="text-[#ff6b7a]">
                        Ask: {liveStock.currency}
                        {liveStock.ask.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <CandlestickChart
                  stock={liveStock}
                  candles={liveCandles}
                  horizon={reportHorizon}
                  targetPrice={activeHorizonReport?.price}
                  stopLossPrice={activeHorizonReport?.stopLossPrice}
                  height={250}
                />

                {/* Key Stock Fundamentals & Microstructure Strip */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3 pt-3 border-t border-[#123626] text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Open</span>
                    <strong className="font-mono text-gray-200">
                      {liveStock.currency}
                      {(liveStock.open ?? liveStock.price).toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">24h High</span>
                    <strong className="font-mono text-[#00e59a]">
                      {liveStock.currency}
                      {(liveStock.high24h ?? liveStock.high ?? liveStock.price).toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">24h Low</span>
                    <strong className="font-mono text-[#ff6b7a]">
                      {liveStock.currency}
                      {(liveStock.low24h ?? liveStock.low ?? liveStock.price).toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Spread</span>
                    <strong className="font-mono text-amber-300">
                      {liveStock.currency}
                      {liveStock.spread.toFixed(2)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Volume</span>
                    <strong className="font-mono text-gray-200">{liveStock.volume}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Your Holding</span>
                    <strong className="font-mono text-[#00e59a]">{heldShares} shares</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Live Bid/Ask Order Pad */}
            <div className="lg:col-span-4">
              <div className="rounded-2xl border border-[#1c5e41] bg-[#07140e] p-4 h-full flex flex-col justify-between">
                <div>
                  {/* BUY / SELL Tabs */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#030906] border border-[#143c2d]">
                    <button
                      type="button"
                      onClick={() => setOrderSide("BUY")}
                      className={`py-2.5 rounded-lg text-xs font-black tracking-wider uppercase transition-all ${
                        orderSide === "BUY"
                          ? "bg-[#00e59a] text-[#00180e] shadow-[0_0_15px_rgba(0,229,154,0.35)]"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      BUY {liveStock.symbol}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOrderSide("SELL");
                        if (heldShares > 0 && !qtyInput) {
                          setQtyInput(String(heldShares));
                        }
                      }}
                      className={`py-2.5 rounded-lg text-xs font-black tracking-wider uppercase transition-all ${
                        orderSide === "SELL"
                          ? "bg-[#ff3549] text-white shadow-[0_0_15px_rgba(255,53,73,0.35)]"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      SELL {liveStock.symbol} {heldShares > 0 ? `(${heldShares})` : ""}
                    </button>
                  </div>

                  {/* Execution Type: Market (Bid/Ask) vs Limit */}
                  <div className="flex items-center justify-between gap-2 mt-3">
                    <span className="text-[11px] text-gray-400 font-medium">Order Type:</span>
                    <div className="flex gap-1.5">
                      {(["MARKET", "LIMIT"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setExecutionMode(mode)}
                          className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold ${
                            executionMode === mode
                              ? "bg-[#00e59a25] text-[#00e59a] border border-[#00e59a]"
                              : "bg-[#040c09] text-gray-400 border border-[#153a2a]"
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Order Form */}
                  <form onSubmit={handleExecuteOrder} className="mt-3 space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs text-gray-300 font-semibold">
                          Shares Quantity
                        </label>
                        {orderSide === "SELL" && heldShares > 0 && (
                          <button
                            type="button"
                            onClick={() => setQtyInput(String(heldShares))}
                            className="text-[10px] font-mono text-[#00e59a] underline hover:text-white"
                          >
                            Max Sell ({heldShares} sh)
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        min="1"
                        placeholder="Enter number of shares (e.g. 10)"
                        value={qtyInput}
                        onChange={(e) => setQtyInput(e.target.value)}
                        className="w-full rounded-xl border border-[#1a573b] bg-[#030806] px-3.5 py-2.5 text-sm font-mono font-bold text-white placeholder:text-gray-500 placeholder:font-normal focus:outline-none focus:border-[#00e59a]"
                      />
                    </div>

                    {executionMode === "LIMIT" && (
                      <div>
                        <label className="text-xs text-gray-300 block mb-1 font-semibold">
                          Limit Price ({liveStock.currency})
                        </label>
                        <input
                          type="number"
                          step="any"
                          placeholder={effectiveExecutionPrice.toFixed(2)}
                          value={limitPriceInput}
                          onChange={(e) => setLimitPriceInput(e.target.value)}
                          className="w-full rounded-xl border border-[#1a573b] bg-[#030806] px-3.5 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-[#00e59a]"
                        />
                      </div>
                    )}

                    {/* Price & Total Breakdown */}
                    <div className="rounded-xl border border-[#143d2b] bg-[#040c08] p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between text-gray-400">
                        <span>
                          Execution Price (
                          {executionMode === "MARKET"
                            ? orderSide === "BUY"
                              ? "Live Ask"
                              : "Live Bid"
                            : "Limit"}
                          )
                        </span>
                        <span className="font-mono text-white">
                          {liveStock.currency}
                          {effectiveExecutionPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Available Cash</span>
                        <span className="font-mono text-[#00e59a]">
                          {liveStock.currency}
                          {simState.cash.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-[#123324] flex justify-between font-bold text-sm">
                        <span className="text-white">Estimated Order Value</span>
                        <span className="font-mono text-[#00e59a]">
                          {liveStock.currency}
                          {orderTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className={`w-full py-3 rounded-xl font-black text-xs tracking-wider uppercase transition-all ${
                        orderSide === "BUY"
                          ? "bg-[#00e59a] text-[#00180e] hover:bg-[#48ffbe] shadow-[0_0_20px_rgba(0,229,154,0.3)]"
                          : "bg-[#ff3549] text-white hover:bg-[#ff5465] shadow-[0_0_20px_rgba(255,53,73,0.3)]"
                      }`}
                    >
                      {orderSide === "BUY"
                        ? `⚡ Execute BUY ${qty > 0 ? `(${qty} Shares)` : ""}`
                        : `⚡ Execute SELL ${qty > 0 ? `(${qty} Shares)` : ""}`}
                    </button>
                  </form>
                </div>

                {/* Quick Sell Action if User Holds Shares of This Stock */}
                {heldShares > 0 && (
                  <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
                    <div className="flex items-center justify-between font-bold text-amber-300">
                      <span>You Own {heldShares} Shares</span>
                      <span
                        className={
                          (heldPosition?.unrealizedPL || 0) >= 0
                            ? "text-[#00e59a]"
                            : "text-[#ff5a6b]"
                        }
                      >
                        {(heldPosition?.unrealizedPL || 0) >= 0 ? "Profit +" : "Loss -"}
                        {liveStock.currency}
                        {Math.abs(heldPosition?.unrealizedPL || 0).toFixed(2)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleInstantSellPosition(liveStock.symbol, heldShares)}
                      className="mt-2 w-full py-2 rounded-lg bg-[#ff3549] text-white font-black text-xs uppercase tracking-wider hover:bg-[#ff5465] transition-all"
                    >
                      💰 Instant Sell All {heldShares} Shares @ {liveStock.currency}
                      {liveStock.bid.toFixed(2)}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4-Agent Multi-Horizon Analysis Report (1D, 1W, 1M, 6M, 1Y, 5Y) with Profit/Loss Prediction & Probabilities */}
        {liveStock && activePrediction && activeHorizonReport && (
          <div className="mt-5 rounded-2xl border border-[#1c6345] bg-gradient-to-b from-[#06150f] to-[#030906] p-4 sm:p-5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#154531]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#00e59a] font-black">
                    🤖 4-Agent Multi-Horizon Profit / Loss Intelligence
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-mono font-black ${
                      activeHorizonReport.isProfitPredicted
                        ? "bg-[#00e59a22] text-[#00e59a] border border-[#00e59a66]"
                        : "bg-[#ff354925] text-[#ff6b7a] border border-[#ff354966]"
                    }`}
                  >
                    {activeHorizonReport.isProfitPredicted
                      ? `🟢 ${reportHorizon} PROFIT PREDICTED (${activeHorizonReport.profitProbability}% Prob)`
                      : `🔴 ${reportHorizon} LOSS PREDICTED (${activeHorizonReport.lossProbability}% Prob)`}
                  </span>
                </div>
                <p className="text-xs text-[#92a79c] mt-1">
                  Forecasts for{" "}
                  <strong>
                    {liveStock.name} ({liveStock.symbol})
                  </strong>{" "}
                  across <strong>1 Day, 1 Week, 1 Month, 6 Months, 1 Year & 5 Years</strong>{" "}
                  (evaluated for <strong>{evalSharesForReport} shares</strong>)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAllHorizonsTable(!showAllHorizonsTable)}
                  className="rounded-xl border border-[#1d5e41] bg-[#071c13] px-3 py-1.5 text-xs font-bold text-[#00e59a] hover:border-[#00e59a] transition-all"
                >
                  {showAllHorizonsTable ? "View Horizon Cards" : "📋 Compare All 6 Horizons Table"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportPredictionToWordDoc(activePrediction);
                    showToast(
                      `Exported ${liveStock.symbol} 6-Horizon 4-Agent Report to Word (.doc)`,
                    );
                  }}
                  className="rounded-xl border border-[#00e59a] bg-[#00e59a] px-3.5 py-1.5 text-xs font-black text-[#00180e] hover:bg-[#48ffbe] transition-all"
                >
                  📄 Export Report (.doc)
                </button>
              </div>
            </div>

            {/* 1 Fixed Projected Value according to Date of Buying Headline */}
            <div className="rounded-xl border border-[#1a5a3d] bg-gradient-to-r from-[#071911] via-[#05130d] to-[#040e09] p-3 my-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">📅</span>
                  <span className="text-gray-300">
                    If bought <strong>{activePrediction.buyingDate || "today"}</strong> at{" "}
                    <strong className="text-white font-mono">
                      {liveStock.currency}
                      {liveStock.price.toFixed(2)}
                    </strong>
                    :
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-gray-400">
                    Fixed Rate for {activeHorizonReport.targetDateLabel}:
                  </span>
                  <strong className="text-white text-sm font-black">
                    {liveStock.currency}
                    {activeHorizonReport.price.toFixed(2)}
                  </strong>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      activeHorizonReport.isProfitPredicted
                        ? "bg-[#00e59a22] text-[#00e59a]"
                        : "bg-[#ff354925] text-[#ff6b7a]"
                    }`}
                  >
                    {activeHorizonReport.changePct >= 0 ? "+" : ""}
                    {activeHorizonReport.changePct.toFixed(2)}% (
                    {activeHorizonReport.isProfitPredicted ? "PROFIT" : "LOSS"})
                  </span>
                </div>
              </div>
            </div>

            {/* 6-Horizon Interactive Selector Grid (1D, 1W, 1M, 6M, 1Y, 5Y) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 my-4">
              {ALL_TIME_HORIZONS.map((h) => {
                const hf = activePrediction.horizonForecasts[h];
                const isSelected = reportHorizon === h;
                const isProfit = hf.isProfitPredicted;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setReportHorizon(h)}
                    className={`text-left rounded-xl border p-3 transition-all ${
                      isSelected
                        ? isProfit
                          ? "border-[#00e59a] bg-[#0b291d] shadow-[0_0_18px_rgba(0,229,154,0.25)]"
                          : "border-[#ff3549] bg-[#2a0b10] shadow-[0_0_18px_rgba(255,53,73,0.25)]"
                        : "border-[#163f2d] bg-[#040c08] hover:border-[#00e59a88]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white font-mono">
                        {h} · {HORIZON_FACTORS[h].label}
                      </span>
                      <span
                        className={`text-[9.5px] font-mono font-extrabold px-1.5 py-0.5 rounded ${
                          isProfit
                            ? "bg-[#00e59a22] text-[#00e59a]"
                            : "bg-[#ff354925] text-[#ff6b7a]"
                        }`}
                      >
                        {isProfit ? "PROFIT" : "LOSS"}
                      </span>
                    </div>

                    <div className="text-[10px] text-gray-400 font-mono mt-1">
                      Target:{" "}
                      <strong className="text-gray-200">
                        {hf.targetDate || HORIZON_FACTORS[h].label}
                      </strong>
                    </div>

                    <div className="mt-1.5 font-mono">
                      <div className="text-sm font-black text-white">
                        {liveStock.currency}
                        {hf.price.toFixed(2)}
                      </div>
                      <div
                        className={`text-xs font-bold ${
                          hf.changePct >= 0 ? "text-[#00e59a]" : "text-[#ff5a6b]"
                        }`}
                      >
                        {hf.changePct >= 0 ? "+" : ""}
                        {hf.changePct.toFixed(2)}% ({hf.projectedPLAmount >= 0 ? "+" : "-"}
                        {liveStock.currency}
                        {Math.abs(hf.projectedPLAmount).toLocaleString()})
                      </div>
                    </div>

                    {/* Profit vs Loss Probability Bar */}
                    <div className="mt-2.5">
                      <div className="flex justify-between text-[9.5px] font-mono mb-1">
                        <span className="text-[#00e59a] font-bold">
                          Win: {hf.profitProbability}%
                        </span>
                        <span className="text-[#ff6b7a] font-bold">
                          Loss: {hf.lossProbability}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#ff354944] overflow-hidden flex">
                        <div
                          className="h-full bg-[#00e59a]"
                          style={{ width: `${hf.profitProbability}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {showAllHorizonsTable && (
              <div className="mb-4 overflow-x-auto rounded-xl border border-[#174833] bg-[#030906] p-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#00e59a] mb-2">
                  Complete 6-Horizon Profit / Loss & 4-Agent Consensus Matrix
                </h4>
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#143929] text-gray-400 text-[10.5px]">
                      <th className="py-2 px-2">Horizon</th>
                      <th className="py-2 px-2">Prediction</th>
                      <th className="py-2 px-2">Target Price</th>
                      <th className="py-2 px-2">Est. Return</th>
                      <th className="py-2 px-2">Est. P&L ({evalSharesForReport} sh)</th>
                      <th className="py-2 px-2">Profit Prob.</th>
                      <th className="py-2 px-2">Loss Prob.</th>
                      <th className="py-2 px-2">🐂 Bull</th>
                      <th className="py-2 px-2">🐻 Bear</th>
                      <th className="py-2 px-2">🦌 Stag</th>
                      <th className="py-2 px-2">🐇 Rabbit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0e291d]">
                    {ALL_TIME_HORIZONS.map((h) => {
                      const hf = activePrediction.horizonForecasts[h];
                      return (
                        <tr
                          key={h}
                          onClick={() => setReportHorizon(h)}
                          className="hover:bg-[#081b13] cursor-pointer"
                        >
                          <td className="py-2 px-2 font-bold text-white">
                            {h} ({HORIZON_FACTORS[h].label})
                          </td>
                          <td className="py-2 px-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                hf.isProfitPredicted
                                  ? "bg-[#00e59a20] text-[#00e59a]"
                                  : "bg-[#ff354920] text-[#ff6b7a]"
                              }`}
                            >
                              {hf.isProfitPredicted ? "PROFIT" : "LOSS"}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-white">
                            {liveStock.currency}
                            {hf.price.toFixed(2)}
                          </td>
                          <td
                            className={`py-2 px-2 font-bold ${
                              hf.changePct >= 0 ? "text-[#00e59a]" : "text-[#ff5a6b]"
                            }`}
                          >
                            {hf.changePct >= 0 ? "+" : ""}
                            {hf.changePct.toFixed(2)}%
                          </td>
                          <td
                            className={`py-2 px-2 font-bold ${
                              hf.projectedPLAmount >= 0 ? "text-[#00e59a]" : "text-[#ff5a6b]"
                            }`}
                          >
                            {hf.projectedPLAmount >= 0 ? "+" : "-"}
                            {liveStock.currency}
                            {Math.abs(hf.projectedPLAmount).toLocaleString()}
                          </td>
                          <td className="py-2 px-2 text-[#00e59a] font-bold">
                            {hf.profitProbability}%
                          </td>
                          <td className="py-2 px-2 text-[#ff6b7a] font-bold">
                            {hf.lossProbability}%
                          </td>
                          <td className="py-2 px-2 text-[10.5px]">{hf.agents.bull.stance}</td>
                          <td className="py-2 px-2 text-[10.5px]">{hf.agents.bear.stance}</td>
                          <td className="py-2 px-2 text-[10.5px]">{hf.agents.stag.stance}</td>
                          <td className="py-2 px-2 text-[10.5px]">{hf.agents.rabbit.stance}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Selected Horizon 4-Agent Detailed Cards */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  4 AI Agents Analysis for {HORIZON_FACTORS[reportHorizon].label} ({reportHorizon})
                  —{" "}
                  <span
                    className={
                      activeHorizonReport.isProfitPredicted ? "text-[#00e59a]" : "text-[#ff6b7a]"
                    }
                  >
                    {activeHorizonReport.isProfitPredicted
                      ? `Predicted Profit: +${activeHorizonReport.changePct}% (Profit Prob: ${activeHorizonReport.profitProbability}% | Loss Prob: ${activeHorizonReport.lossProbability}%)`
                      : `Predicted Loss: ${activeHorizonReport.changePct}% (Loss Prob: ${activeHorizonReport.lossProbability}% | Profit Prob: ${activeHorizonReport.profitProbability}%)`}
                  </span>
                </h4>
                <span className="text-[11px] font-mono text-gray-400">
                  Verdict: <strong className="text-[#00e59a]">{activeHorizonReport.verdict}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.values(activeHorizonReport.agents).map((ag) => (
                  <div
                    key={ag.role}
                    className="rounded-xl border border-[#16422f] bg-[#040c08] p-3.5 flex flex-col justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{ag.avatar}</span>
                          <div>
                            <strong className="text-white uppercase font-black block">
                              {ag.agentName}
                            </strong>
                            <span className="text-[10px] text-gray-400">{ag.roleDescription}</span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            ag.stance === "Bullish"
                              ? "bg-[#00e59a20] text-[#00e59a]"
                              : ag.stance === "Bearish"
                                ? "bg-[#ff354920] text-[#ff6b7a]"
                                : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {ag.stance}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 my-2 p-2 rounded-lg bg-[#07150f] border border-[#123525] font-mono text-[10.5px]">
                        <div>
                          <span className="text-gray-400 block text-[9px]">
                            Target ({reportHorizon})
                          </span>
                          <strong className="text-white">
                            {liveStock.currency}
                            {ag.targetPrice.toFixed(2)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[9px]">Stop-Loss</span>
                          <strong className="text-[#ff6b7a]">
                            {liveStock.currency}
                            {ag.stopLossPrice.toFixed(2)}
                          </strong>
                        </div>
                      </div>

                      <p className="text-[11px] text-gray-300 leading-relaxed">{ag.commentary}</p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[#113022] text-[10.5px] font-semibold text-[#00e59a]">
                      ▸ {ag.actionRecommendation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Open Positions (Bought Stocks) & Order History Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
          {/* Open Holdings Table */}
          <div className="rounded-xl border border-[#163f2c] bg-[#06110c] p-4">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-white">
                📊 Your Bought Stocks ({positionsList.length})
              </h4>
              <span className="text-[10px] font-mono text-[#00e59a]">
                Click any row to switch & inspect or sell
              </span>
            </div>

            {positionsList.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">
                No open positions yet. Add virtual capital above and buy shares of any stock to
                track live P&L here.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#123324] text-gray-400 font-mono text-[10px]">
                      <th className="py-1.5">Stock</th>
                      <th>Shares</th>
                      <th>Avg Buy</th>
                      <th>Live Price</th>
                      <th>Profit / Loss</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0f291e] font-mono">
                    {positionsList.map((pos) => {
                      const isActive = liveStock?.symbol === pos.symbol;
                      return (
                        <tr
                          key={pos.symbol}
                          onClick={() => handleSelectSimStock(pos.symbol)}
                          className={`cursor-pointer transition-colors ${
                            isActive ? "bg-[#0b281c]" : "hover:bg-[#091c14]"
                          }`}
                        >
                          <td className="py-2 font-bold text-[#00e59a]">
                            {pos.symbol}
                            {isActive && (
                              <span className="ml-1 text-[9px] bg-[#00e59a] text-[#00180e] px-1 rounded font-black">
                                ACTIVE
                              </span>
                            )}
                          </td>
                          <td>{pos.qty}</td>
                          <td>
                            {pos.currency}
                            {pos.avgCost.toFixed(2)}
                          </td>
                          <td>
                            {pos.currency}
                            {pos.currentPrice.toFixed(2)}
                          </td>
                          <td
                            className={`font-bold ${
                              pos.unrealizedPL >= 0 ? "text-[#00e59a]" : "text-[#ff3549]"
                            }`}
                          >
                            {pos.unrealizedPL >= 0 ? "+" : ""}
                            {pos.currency}
                            {pos.unrealizedPL.toFixed(2)} ({pos.unrealizedPLPct}%)
                          </td>
                          <td
                            className="py-2 text-right space-x-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleSelectSimStock(pos.symbol)}
                              className="rounded border border-[#1d5e41] bg-[#071c13] px-2 py-0.5 text-[10px] font-bold text-[#00e59a] hover:bg-[#00e59a] hover:text-[#00180e]"
                            >
                              Analyze
                            </button>
                            <button
                              type="button"
                              onClick={() => handleInstantSellPosition(pos.symbol, pos.qty)}
                              className="rounded border border-[#ff3549] bg-[#ff3549]/20 px-2 py-0.5 text-[10px] font-bold text-[#ff7b88] hover:bg-[#ff3549] hover:text-white"
                            >
                              Sell All
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Order History Log */}
          <div className="rounded-xl border border-[#163f2c] bg-[#06110c] p-4">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-white">
                ⚡ Executed Order History ({simState.orders.length})
              </h4>
              <span className="text-[10px] font-mono text-gray-400">Personal Trade Ledger</span>
            </div>
            {simState.orders.length === 0 ? (
              <p className="text-xs text-gray-500 py-6 text-center">
                No orders executed yet. Your buy and sell trades will appear here automatically.
              </p>
            ) : (
              <div className="overflow-x-auto max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#123324] text-gray-400 font-mono text-[10px]">
                      <th className="py-1.5">Time</th>
                      <th>Side</th>
                      <th>Ticker</th>
                      <th>Qty</th>
                      <th>Exec Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0f291e] font-mono">
                    {simState.orders.map((ord) => (
                      <tr key={ord.id}>
                        <td className="py-1.5 text-gray-400 text-[10px]">{ord.timeString}</td>
                        <td>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              ord.side === "BUY"
                                ? "bg-[#00e59a20] text-[#00e59a]"
                                : "bg-[#ff354920] text-[#ff3549]"
                            }`}
                          >
                            {ord.side}
                          </span>
                        </td>
                        <td className="font-bold text-white">{ord.symbol}</td>
                        <td>{ord.qty}</td>
                        <td>
                          {ord.currency}
                          {ord.price.toFixed(2)}
                        </td>
                        <td className="text-gray-200">
                          {ord.currency}
                          {ord.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {toast && (
          <div className="fixed bottom-8 right-8 z-50 rounded-xl border border-[#00e59a] bg-[#061c13] px-4 py-3 text-xs font-bold text-white shadow-2xl">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
