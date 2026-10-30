import React, { useState, useMemo } from "react";
import { CandleData, StockQuote, TimeHorizon } from "@/types/stock";

interface CandlestickChartProps {
  stock: StockQuote;
  candles: CandleData[];
  horizon?: TimeHorizon;
  targetPrice?: number;
  stopLossPrice?: number;
  height?: number;
  showForecastCone?: boolean;
  compact?: boolean;
}

export function CandlestickChart({
  stock,
  candles,
  horizon = "1D",
  targetPrice,
  stopLossPrice,
  height = 240,
  showForecastCone = true,
  compact = false,
}: CandlestickChartProps) {
  const [chartMode, setChartMode] = useState<"CANDLE" | "RATE">("CANDLE");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [showIndicators, setShowIndicators] = useState<boolean>(true);

  const visibleCandles = useMemo(() => {
    const count = compact ? 34 : 46;
    return candles.slice(-count);
  }, [candles, compact]);

  // Compute EMA-20 & Bollinger bands per candle for overlay
  const indicators = useMemo(() => {
    const ema20: number[] = [];
    const upperBB: number[] = [];
    const lowerBB: number[] = [];
    const k = 2 / 21;
    let ema = visibleCandles[0]?.close || stock.price;

    for (let i = 0; i < visibleCandles.length; i++) {
      const c = visibleCandles[i].close;
      ema = c * k + ema * (1 - k);
      ema20.push(ema);

      const slice = visibleCandles.slice(Math.max(0, i - 14), i + 1).map((x) => x.close);
      const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
      const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length;
      const std = Math.max(stock.price * 0.0025, Math.sqrt(variance));
      upperBB.push(mean + 2 * std);
      lowerBB.push(mean - 2 * std);
    }
    return { ema20, upperBB, lowerBB };
  }, [visibleCandles, stock.price]);

  const { minPrice, maxPrice, maxVol } = useMemo(() => {
    if (visibleCandles.length === 0) {
      return {
        minPrice: stock.price * 0.98,
        maxPrice: stock.price * 1.02,
        maxVol: 100000,
      };
    }
    let min = Infinity;
    let max = -Infinity;
    let mv = 1;
    for (const c of visibleCandles) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > mv) mv = c.volume;
    }
    if (showForecastCone && targetPrice && stopLossPrice) {
      // Include a portion of target/stop range so forecast cone fits cleanly
      const clampTarget = Math.min(max * 1.025, targetPrice);
      const clampStop = Math.max(min * 0.975, stopLossPrice);
      if (clampTarget > max) max = clampTarget;
      if (clampStop < min) min = clampStop;
    }
    const pad = (max - min) * 0.1 || stock.price * 0.01;
    return { minPrice: min - pad, maxPrice: max + pad, maxVol: mv };
  }, [visibleCandles, stock.price, showForecastCone, targetPrice, stopLossPrice]);

  const W = 680;
  const H = height;
  const padLeft = 10;
  const padRight = showForecastCone ? 105 : 58;
  const padTop = 18;
  const padBottom = 26;
  const plotW = W - padLeft - padRight;
  const plotH = H - padTop - padBottom;

  const priceToY = (p: number) => {
    const ratio = (p - minPrice) / Math.max(0.0001, maxPrice - minPrice);
    return padTop + plotH * (1 - Math.min(1.05, Math.max(-0.05, ratio)));
  };

  const activeCandle =
    hoverIdx !== null && visibleCandles[hoverIdx]
      ? visibleCandles[hoverIdx]
      : visibleCandles[visibleCandles.length - 1];

  const stepX = plotW / Math.max(1, visibleCandles.length);
  const candleWidth = Math.max(4, Math.min(11, stepX * 0.64));

  // Build SVG paths for EMA20 and Rate line
  const emaPath = visibleCandles
    .map((_, i) => {
      const x = padLeft + i * stepX + stepX * 0.5;
      const y = priceToY(indicators.ema20[i]);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const closeLinePath = visibleCandles
    .map((c, i) => {
      const x = padLeft + i * stepX + stepX * 0.5;
      const y = priceToY(c.close);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  const closeAreaPath =
    visibleCandles.length > 1
      ? `${closeLinePath} L ${(padLeft + (visibleCandles.length - 1) * stepX + stepX * 0.5).toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${(padLeft + stepX * 0.5).toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : "";

  const lastX = padLeft + (visibleCandles.length - 1) * stepX + stepX * 0.5;
  const lastY = priceToY(visibleCandles[visibleCandles.length - 1]?.close || stock.price);
  const forecastEndX = W - 14;
  const clampedTarget = targetPrice
    ? Math.min(maxPrice - (maxPrice - minPrice) * 0.04, targetPrice)
    : stock.price * 1.015;
  const clampedStop = stopLossPrice
    ? Math.max(minPrice + (maxPrice - minPrice) * 0.04, stopLossPrice)
    : stock.price * 0.988;
  const targetY = priceToY(clampedTarget);
  const stopY = priceToY(clampedStop);

  return (
    <div className="rounded-xl border border-[#16422f] bg-[#040a07] p-3 select-none">
      {/* Top Bar: Mode switcher + Live OHLCV & Bid/Ask readout */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-[#113123] text-[11px]">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setChartMode("CANDLE")}
            className={`px-2 py-0.5 rounded font-bold transition-colors ${
              chartMode === "CANDLE"
                ? "bg-[#00e59a] text-[#00180e]"
                : "bg-[#091812] text-gray-400 hover:text-white"
            }`}
          >
            Candles
          </button>
          <button
            type="button"
            onClick={() => setChartMode("RATE")}
            className={`px-2 py-0.5 rounded font-bold transition-colors ${
              chartMode === "RATE"
                ? "bg-[#00e59a] text-[#00180e]"
                : "bg-[#091812] text-gray-400 hover:text-white"
            }`}
          >
            Rate Graph
          </button>
          <button
            type="button"
            onClick={() => setShowIndicators(!showIndicators)}
            className={`px-2 py-0.5 rounded font-mono text-[10px] border transition-colors ${
              showIndicators
                ? "border-[#00e59a66] bg-[#00e59a15] text-[#00e59a]"
                : "border-[#183829] text-gray-500"
            }`}
          >
            EMA-20
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
          <span className="text-gray-400">
            Bid:{" "}
            <strong className="text-[#00e59a]">
              {stock.currency}
              {stock.bid.toFixed(2)}
            </strong>
          </span>
          <span className="text-gray-400">
            Ask:{" "}
            <strong className="text-[#ff6b7a]">
              {stock.currency}
              {stock.ask.toFixed(2)}
            </strong>
          </span>
          {activeCandle && (
            <span className="hidden sm:inline text-gray-400">
              O:<strong className="text-gray-200">{activeCandle.open.toFixed(1)}</strong> H:
              <strong className="text-[#00e59a]">{activeCandle.high.toFixed(1)}</strong> L:
              <strong className="text-[#ff5a6b]">{activeCandle.low.toFixed(1)}</strong> C:
              <strong className="text-white">{activeCandle.close.toFixed(2)}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Interactive SVG Candlestick & ML Forecast Canvas */}
      <div className="relative w-full overflow-hidden" style={{ height: `${height}px` }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="rateAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00e59a" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#00e59a" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="mlConeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00e59a" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#00e59a" stopOpacity="0.06" />
            </linearGradient>
          </defs>

          {/* Horizontal price grid lines & labels */}
          {[0.15, 0.38, 0.62, 0.85].map((ratio, idx) => {
            const y = padTop + plotH * ratio;
            const p = maxPrice - (maxPrice - minPrice) * ratio;
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={W - padRight}
                  y2={y}
                  stroke="#102b1f"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={W - padRight + 6}
                  y={y + 3}
                  fill="#6c877b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {stock.currency}
                  {p.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Volume histogram along bottom */}
          {visibleCandles.map((c, i) => {
            const x = padLeft + i * stepX + (stepX - candleWidth) * 0.5;
            const vH = Math.max(2, (c.volume / maxVol) * (plotH * 0.22));
            const vY = padTop + plotH - vH;
            const isUp = c.close >= c.open;
            return (
              <rect
                key={`vol-${i}`}
                x={x}
                y={vY}
                width={candleWidth}
                height={vH}
                fill={isUp ? "#00e59a" : "#ff3549"}
                opacity="0.18"
              />
            );
          })}

          {/* Candlesticks or Rate Area Graph */}
          {chartMode === "CANDLE" ? (
            visibleCandles.map((c, i) => {
              const cx = padLeft + i * stepX + stepX * 0.5;
              const isUp = c.close >= c.open;
              const col = isUp ? "#00e59a" : "#ff3549";
              const highY = priceToY(c.high);
              const lowY = priceToY(c.low);
              const openY = priceToY(c.open);
              const closeY = priceToY(c.close);
              const bodyTop = Math.min(openY, closeY);
              const bodyH = Math.max(2.5, Math.abs(closeY - openY));

              return (
                <g key={`c-${i}`} onMouseEnter={() => setHoverIdx(i)} className="cursor-crosshair">
                  <line x1={cx} y1={highY} x2={cx} y2={lowY} stroke={col} strokeWidth="1.4" />
                  <rect
                    x={cx - candleWidth * 0.5}
                    y={bodyTop}
                    width={candleWidth}
                    height={bodyH}
                    fill={col}
                    rx="1"
                  />
                  {/* Invisible wider hit target for smooth hover */}
                  <rect
                    x={padLeft + i * stepX}
                    y={padTop}
                    width={stepX}
                    height={plotH}
                    fill="transparent"
                  />
                </g>
              );
            })
          ) : (
            <g>
              <path d={closeAreaPath} fill="url(#rateAreaGrad)" />
              <path d={closeLinePath} fill="none" stroke="#00e59a" strokeWidth="2.4" />
            </g>
          )}

          {/* EMA-20 Technical Overlay */}
          {showIndicators && visibleCandles.length > 2 && (
            <path
              d={emaPath}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.6"
              strokeDasharray="4 2"
              opacity="0.85"
            />
          )}

          {/* Pretrained ML Forecast Cone on Right Side */}
          {showForecastCone && visibleCandles.length > 0 && (
            <g>
              <polygon
                points={`${lastX},${lastY} ${forecastEndX},${targetY} ${forecastEndX},${stopY}`}
                fill="url(#mlConeGrad)"
              />
              {/* Target Trajectory Line */}
              <line
                x1={lastX}
                y1={lastY}
                x2={forecastEndX}
                y2={targetY}
                stroke="#00e59a"
                strokeWidth="2"
                strokeDasharray="4 3"
              />
              {/* Stop-Loss Guard Line */}
              <line
                x1={lastX}
                y1={lastY}
                x2={forecastEndX}
                y2={stopY}
                stroke="#ff495c"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle cx={forecastEndX} cy={targetY} r="3.5" fill="#00e59a" />
              <circle cx={forecastEndX} cy={stopY} r="3" fill="#ff495c" />
              <text
                x={forecastEndX - 4}
                y={Math.max(12, targetY - 6)}
                textAnchor="end"
                fill="#00e59a"
                fontSize="9.5"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {horizon} Target {stock.currency}
                {(targetPrice ?? clampedTarget).toFixed(1)}
              </text>
              <text
                x={forecastEndX - 4}
                y={Math.min(H - 6, stopY + 11)}
                textAnchor="end"
                fill="#ff6b7a"
                fontSize="9"
                fontFamily="monospace"
              >
                SL {stock.currency}
                {(stopLossPrice ?? clampedStop).toFixed(1)}
              </text>
            </g>
          )}

          {/* Hover Crosshair */}
          {hoverIdx !== null && visibleCandles[hoverIdx] && (
            <g>
              <line
                x1={padLeft + hoverIdx * stepX + stepX * 0.5}
                y1={padTop}
                x2={padLeft + hoverIdx * stepX + stepX * 0.5}
                y2={padTop + plotH}
                stroke="#00e59a88"
                strokeDasharray="2 2"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Bottom Legend Bar */}
      <div className="flex items-center justify-between pt-1.5 border-t border-[#102b1f] text-[10px] text-gray-400 font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[#00e59a]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00e59a] animate-pulse" />
            LIVE {stock.market}
          </span>
          <span className="text-[#38bdf8]">-- EMA-20</span>
        </div>
        <span>
          Spread: {stock.currency}
          {stock.spread.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
