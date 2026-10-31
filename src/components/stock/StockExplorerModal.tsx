import React, { useEffect, useState, useMemo } from "react";
import { StockQuote } from "@/types/stock";
import {
  subscribeMarketEngine,
  getMarketSnapshot,
  refreshSymbolFromLiveApi,
  setActiveMarketSymbol,
} from "@/lib/market-engine";
import { searchUniverse, UNIVERSE_COUNTS } from "@/data/stocks-universe";

interface StockExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStock: (stock: StockQuote) => void;
}

export function StockExplorerModal({ isOpen, onClose, onSelectStock }: StockExplorerModalProps) {
  const [filter, setFilter] = useState("");
  const [marketTab, setMarketTab] = useState<"ALL" | "INDIA" | "US" | "CRYPTO">("ALL");
  const [snap, setSnap] = useState(() => getMarketSnapshot());

  useEffect(() => {
    if (!isOpen) return;
    return subscribeMarketEngine((s) => setSnap(s));
  }, [isOpen]);

  const stockList = useMemo(() => {
    if (marketTab === "CRYPTO") {
      return Object.values(snap.quotes).filter((s) => {
        if (!s.market.includes("CRYPTO")) return false;
        if (!filter) return true;
        const q = filter.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.symbol.toLowerCase().includes(q) ||
          (s.sector && s.sector.toLowerCase().includes(q))
        );
      });
    }

    // Search across the full 7,280+ security universe (NSE India + US Markets)
    const rawMatches = searchUniverse(filter, 80, marketTab);
    return rawMatches.map((stock) => snap.quotes[stock.symbol] || stock);
  }, [filter, marketTab, snap.quotes]);

  if (!isOpen) return null;

  const marketTabs = [
    { id: "ALL", label: `All Equities (${UNIVERSE_COUNTS.total.toLocaleString()}+)` },
    { id: "INDIA", label: `🇮🇳 India NSE (${UNIVERSE_COUNTS.nse.toLocaleString()})` },
    { id: "US", label: `🇺🇸 US Markets (${UNIVERSE_COUNTS.us.toLocaleString()})` },
    { id: "CRYPTO", label: "⚡ Crypto (24/7)" },
  ] as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-[#1d6545] bg-[#06100b] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.85)] max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#163c2b]">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Mindspace Logo"
              className="h-9 w-9 object-contain drop-shadow-[0_0_10px_rgba(0,229,154,0.4)]"
            />
            <div>
              <h2 className="text-xl font-black tracking-wide text-white">
                MINDSPACE · Live Market Explorer
              </h2>
              <p className="text-xs text-[#92a79c] mt-0.5">
                Real-Time Indian (NSE/BSE) & US (NASDAQ/NYSE) Equities · Pretrained ML Ensemble
                Forecast
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-[#234a36] bg-[#09130f] px-3 py-1.5 text-xs text-gray-300 hover:border-[#00e59a] hover:text-[#00e59a] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Filter Tabs + Search Input */}
        <div className="my-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {marketTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMarketTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  marketTab === tab.id
                    ? "bg-[#00e59a] text-[#00180e] shadow-[0_0_12px_rgba(0,229,154,0.3)]"
                    : "border border-[#174a35] bg-[#08130f] text-gray-300 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search by company, ticker, or sector (e.g. RELIANCE, TATAMOTORS, NVDA, AAPL, Banking)..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full rounded-xl border border-[#1a573b] bg-[#030806] px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-[#00e59a]"
            />
            <div className="flex items-center justify-between text-[11px] text-[#92a79c] mt-1.5 px-1 font-mono">
              <span>
                {filter
                  ? `Found ${stockList.length} matching securities`
                  : `Browsing top ${stockList.length} of ${UNIVERSE_COUNTS.total.toLocaleString()} official equities`}
              </span>
              <span className="text-[#00e59a]">⚡ Real-Time Exchange Master Feed</span>
            </div>
          </div>
        </div>

        {/* Live Stock Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1">
          {stockList.map((stock) => (
            <button
              key={stock.symbol}
              onClick={async () => {
                onSelectStock(stock);
                setActiveMarketSymbol(stock.symbol);
                onClose();
                const updated = await refreshSymbolFromLiveApi(stock.yahooSymbol || stock.symbol);
                if (updated) onSelectStock(updated);
              }}
              className="group text-left rounded-xl border border-[#174a35] bg-[#08130f] p-4 hover:border-[#00e59a] hover:bg-[#0c1f17] transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-gray-100 group-hover:text-[#00e59a] transition-colors">
                    {stock.name}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    {stock.symbol} · <span className="text-[#00e59a]">{stock.market}</span>
                    {stock.sector ? ` · ${stock.sector}` : ""}
                  </p>
                </div>
                <span
                  className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                    stock.change >= 0
                      ? "bg-[#00e59a18] text-[#00e59a]"
                      : "bg-[#ff354918] text-[#ff3549]"
                  }`}
                >
                  {stock.change >= 0 ? "▲ +" : "▼ "}
                  {stock.change.toFixed(2)}%
                </span>
              </div>

              <div className="mt-3 pt-2 border-t border-[#143626] flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono text-base font-extrabold text-white">
                    {stock.currency}
                    {stock.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="block text-[10px] text-gray-400 font-mono mt-0.5">
                    Bid {stock.currency}
                    {stock.bid.toFixed(2)} · Ask {stock.currency}
                    {stock.ask.toFixed(2)}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-[#00e59a] group-hover:translate-x-0.5 transition-transform">
                  Analyze →
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
