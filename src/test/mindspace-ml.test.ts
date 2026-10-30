import { describe, expect, it } from "vitest";
import { STOCKS_CATALOG } from "@/data/stocks";
import { generateDeterministicPrediction, runOpenSourceMLPipeline } from "@/lib/openrouter";
import { getLiveStockQuote, getMarketSnapshot, getExchangeMarketStatus } from "@/lib/market-engine";
import { getSystemSkyAndWeather } from "@/game/scene/textures";
import { handleSqliteAction } from "@/lib/sqlite-server";
import {
  stopAnalyzingAndRelax,
  agents,
  assignTaskToAgents,
  gatherAgentsForDiscussion,
} from "@/game/sim/roam";
import { fetchAgentDiscussion } from "@/lib/agent-discussions";

describe("Mindspace Open-Source ML Ensemble, Multi-Horizon Probabilities & No-Preset Verification", () => {
  it("starts with no default stock selected and zero preset wallet cash", async () => {
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

  it("has zero preset investment numbers when user has not entered an amount, and computes exact numbers when user enters shares quantity", () => {
    const emptyPred = generateDeterministicPrediction(STOCKS_CATALOG.tcs, "1W", 0);
    expect(emptyPred.recommendedInvestAmount).toBe(0);
    expect(emptyPred.projectedProfitAmount).toBe(0);
    expect(emptyPred.projectedLossAmount).toBe(0);

    // User specifies 25 shares of TCS
    const userPred = generateDeterministicPrediction(STOCKS_CATALOG.tcs, "1W", 25);
    expect(userPred.sharesQuantity).toBe(25);
    expect(userPred.recommendedInvestAmount).toBe(25 * STOCKS_CATALOG.tcs.price);
    expect(userPred.projectedProfitAmount).toBeGreaterThan(0);
    expect(userPred.projectedLossAmount).toBeGreaterThan(0);

    expect(userPred.agentConsensus.bull.focusTopic).toContain("Breakout Momentum");
    expect(userPred.agentConsensus.bear.focusTopic).toContain("ATR-14 Volatility");
    expect(userPred.agentConsensus.stag.focusTopic).toContain("Institutional VWAP");
    expect(userPred.agentConsensus.rabbit.focusTopic).toContain("Bid/Ask Spread");

    // Verify all 6 horizons (1D, 1W, 1M, 6M, 1Y, 5Y) have 4-agent reports and profit/loss probabilities summing to 100%
    const horizons = ["1D", "1W", "1M", "6M", "1Y", "5Y"] as const;
    for (const h of horizons) {
      const hf = userPred.horizonForecasts[h];
      expect(hf).toBeDefined();
      expect(hf.profitProbability + hf.lossProbability).toBe(100);
      expect(Object.keys(hf.agents)).toEqual(["bull", "bear", "stag", "rabbit"]);
    }

    // Verify a bearish stock (TSLA with negative change) predicts LOSS on 1D with >50% loss probability
    const tslaPred = generateDeterministicPrediction(STOCKS_CATALOG.tesla, "1D", 10);
    expect(tslaPred.isProfitPredicted).toBe(false);
    expect(tslaPred.lossProbability).toBeGreaterThan(50);
    expect(tslaPred.expectedReturnPct).toBeLessThan(0);
  });

  it("accurately detects Indian and US exchange market open and closed hours", () => {
    // 11:30 AM IST on a Wednesday (2026-10-28 06:00 UTC) -> Market Open in India
    const indianOpenTime = new Date("2026-10-28T06:00:00Z");
    const indianOpenStatus = getExchangeMarketStatus("NSE · EQ", "RELIANCE.NS", indianOpenTime);
    expect(indianOpenStatus.isOpen).toBe(true);
    expect(indianOpenStatus.badge).toBe("🟢 Market Open");

    // 11:00 PM IST on a Wednesday (2026-10-28 17:30 UTC) -> Market Closed in India
    const indianClosedTime = new Date("2026-10-28T17:30:00Z");
    const indianClosedStatus = getExchangeMarketStatus("NSE · EQ", "RELIANCE.NS", indianClosedTime);
    expect(indianClosedStatus.isOpen).toBe(false);
    expect(indianClosedStatus.badge).toBe("🔴 Market Closed");

    // Sunday (Weekend) -> Closed for both Indian and US stocks
    const sundayTime = new Date("2026-10-25T12:00:00Z");
    expect(getExchangeMarketStatus("NSE", "TCS.NS", sundayTime).isOpen).toBe(false);
    expect(getExchangeMarketStatus("NASDAQ", "AAPL", sundayTime).isOpen).toBe(false);

    // Crypto -> 24/7 Open anytime
    expect(getExchangeMarketStatus("CRYPTO", "BTC", sundayTime).isOpen).toBe(true);
  });

  it("releases all 4 agents from their desks to relax and roam when stopAnalyzingAndRelax is invoked", () => {
    assignTaskToAgents("RELIANCE", "1M");
    expect(agents[0].state).toBe("walk");

    stopAnalyzingAndRelax();
    for (const agent of agents) {
      expect(agent.actionStatus).toBe("Relaxing · Off-desk");
    }
  });

  it("generates agent discussion tips and answers user questions with 4 distinct perspectives", async () => {
    // 1. Topic discussion
    const topicTurn = await fetchAgentDiscussion("Stop-Loss Discipline", false, "");
    expect(topicTurn.messages).toHaveLength(4);
    expect(topicTurn.messages.map((m) => m.sender)).toEqual(["bull", "bear", "stag", "rabbit"]);
    expect(topicTurn.messages[0].message).toContain("capital");

    // 2. User question
    const questionTurn = await fetchAgentDiscussion(
      "How do I avoid panic selling in a market crash?",
      true,
      "",
    );
    expect(questionTurn.userQuestion).toBeDefined();
    expect(questionTurn.messages).toHaveLength(5); // 1 user + 4 agents
    expect(questionTurn.messages[0].sender).toBe("user");
    expect(questionTurn.messages[1].sender).toBe("bull");
    expect(questionTurn.messages[2].sender).toBe("bear");
    expect(questionTurn.messages[3].sender).toBe("stag");
    expect(questionTurn.messages[4].sender).toBe("rabbit");

    // 3. 3D lounge positioning
    gatherAgentsForDiscussion("Stop-Loss Discipline");
    for (const agent of agents) {
      expect(agent.actionStatus).toContain("Discussing");
    }
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
