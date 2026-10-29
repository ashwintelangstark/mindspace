import { describe, expect, it } from "vitest";
import { STOCKS_CATALOG } from "@/data/stocks";
import { generateDeterministicPrediction, runOpenSourceMLPipeline } from "@/lib/openrouter";
import { getLiveStockQuote, getMarketSnapshot } from "@/lib/market-engine";
import { getSystemSkyAndWeather } from "@/game/scene/textures";
import { handleSqliteAction } from "@/lib/sqlite-server";

describe("Mindspace Open-Source ML Ensemble, SQLite & No-Preset Verification", () => {
  it("starts with no default stock selected and zero preset wallet cash in SQLite", async () => {
    const snap = getMarketSnapshot();
    expect(snap.activeSymbol).toBe("");
    expect(snap.liveAlerts).toHaveLength(0);

    await handleSqliteAction({ action: "reset_portfolio", cash: 0 });
    const dbState = (await handleSqliteAction({ action: "get_state" })) as {
      ok: boolean;
      wallet: { cash: number; startingCash: number };
    };
    expect(dbState.ok).toBe(true);
    expect(dbState.wallet.cash).toBe(0);
    expect(dbState.wallet.startingCash).toBe(0);
  });

  it("achieves 90%+ directional validation accuracy across Indian (NSE) and US (NASDAQ) stocks", () => {
    const reliance = STOCKS_CATALOG.reliance;
    const nvda = STOCKS_CATALOG.nvidia;

    const relPipeline = runOpenSourceMLPipeline(reliance, "1M");
    const nvdaPipeline = runOpenSourceMLPipeline(nvda, "1Y");

    expect(relPipeline.mlReport.ensembleDirectionalAccuracy).toBeGreaterThanOrEqual(90);
    expect(nvdaPipeline.mlReport.ensembleDirectionalAccuracy).toBeGreaterThanOrEqual(90);
    expect(relPipeline.mlReport.subModels).toHaveLength(3);
  });

  it("has zero preset investment numbers when user has not entered an amount, and computes exact numbers when user enters an amount", () => {
    const emptyPred = generateDeterministicPrediction(STOCKS_CATALOG.tcs, "1W", 0);
    expect(emptyPred.recommendedInvestAmount).toBe(0);
    expect(emptyPred.projectedProfitAmount).toBe(0);
    expect(emptyPred.projectedLossAmount).toBe(0);

    const userPred = generateDeterministicPrediction(STOCKS_CATALOG.tcs, "1W", 25000);
    expect(userPred.recommendedInvestAmount).toBeGreaterThan(0);
    expect(userPred.projectedProfitAmount).toBeGreaterThan(0);
    expect(userPred.projectedLossAmount).toBeGreaterThan(0);

    expect(userPred.agentConsensus.bull.focusTopic).toContain("Breakout Momentum");
    expect(userPred.agentConsensus.bear.focusTopic).toContain("ATR-14 Volatility");
    expect(userPred.agentConsensus.stag.focusTopic).toContain("Institutional VWAP");
    expect(userPred.agentConsensus.rabbit.focusTopic).toContain("Bid/Ask Spread");
  });

  it("streams live market quotes with bid/ask spreads and system time sky profile", () => {
    const snap = getMarketSnapshot();
    const quote = getLiveStockQuote("AAPL");

    expect(quote.symbol).toBe("AAPL");
    expect(quote.ask).toBeGreaterThanOrEqual(quote.bid);
    expect(snap.candlesBySymbol.AAPL.length).toBeGreaterThanOrEqual(20);

    const morningSky = getSystemSkyAndWeather(new Date("2026-10-29T09:30:00"));
    const nightSky = getSystemSkyAndWeather(new Date("2026-10-29T22:15:00"));

    expect(morningSky.phase).toBe("MORNING");
    expect(morningSky.isNight).toBe(false);
    expect(nightSky.phase).toBe("NIGHT");
    expect(nightSky.isNight).toBe(true);
  });
});
