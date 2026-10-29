import React, { useEffect, useState } from "react";
import { subscribeMarketEngine, getMarketSnapshot } from "@/lib/market-engine";

export function LiveTickerBar() {
  const [snap, setSnap] = useState(() => getMarketSnapshot());

  useEffect(() => {
    return subscribeMarketEngine((s) => setSnap(s));
  }, []);

  return (
    <div className="border-t border-[#133628] bg-[#030806ed] backdrop-blur-md px-4 py-2.5 flex items-center justify-between text-xs overflow-x-auto select-none z-20">
      <div className="flex items-center gap-2 pr-4 border-r border-[#174c36] whitespace-nowrap text-[#00e59a] font-semibold tracking-wider">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e59a] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00e59a]"></span>
        </span>
        LIVE MARKET FEED (NSE · BSE · NASDAQ · NYSE)
      </div>

      <div className="flex items-center gap-6 overflow-x-auto px-4 scrollbar-none">
        {snap.indices.map((item) => (
          <div key={item.name} className="flex items-center gap-2.5 whitespace-nowrap">
            <span className="font-bold text-gray-200">{item.name}</span>
            <span
              className={`font-mono font-semibold ${item.isUp ? "text-[#00e59a]" : "text-[#ff3549]"}`}
            >
              {item.price}
            </span>
            <span
              className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${
                item.isUp ? "bg-[#00e59a15] text-[#00e59a]" : "bg-[#ff354915] text-[#ff3549]"
              }`}
            >
              {item.isUp ? "▲" : "▼"} {item.change}
            </span>
          </div>
        ))}
      </div>

      <div className="hidden xl:flex items-center gap-2 text-[11px] text-gray-400 pl-4 border-l border-[#174c36] whitespace-nowrap font-mono">
        <span className="text-[#00e59a]">SQLite DB</span>
        <span>·</span>
        <span>91%+ ML ENSEMBLE</span>
      </div>
    </div>
  );
}
