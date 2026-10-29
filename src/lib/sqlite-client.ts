import { SimulationOrder, SimulationState, StockPrediction, AgentLiveAlert } from "@/types/stock";

const STORAGE_KEY = "mindspace_simulation_state_v2";

export async function loadPortfolioFromSqlite(): Promise<{
  simState: SimulationState;
  dbConnected: boolean;
}> {
  let localFallback: SimulationState = {
    cash: 0.0,
    startingCash: 0.0,
    positions: {},
    orders: [],
    realizedPL: 0.0,
  };

  try {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        localFallback = JSON.parse(saved);
      }
    }
  } catch {
    // ignore
  }

  try {
    const res = await fetch("/api/db", { method: "GET" });
    if (!res.ok) return { simState: localFallback, dbConnected: false };
    const data = await res.json();
    if (data && data.ok && data.wallet) {
      const serverState: SimulationState = {
        cash: data.wallet.cash ?? localFallback.cash,
        startingCash: data.wallet.startingCash ?? localFallback.startingCash,
        realizedPL: data.wallet.realizedPL ?? localFallback.realizedPL,
        positions: data.positions || localFallback.positions,
        orders: data.orders || localFallback.orders,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serverState));
      }
      return { simState: serverState, dbConnected: true };
    }
  } catch {
    // fallback to localStorage
  }

  return { simState: localFallback, dbConnected: false };
}

export async function syncPortfolioToSqlite(
  state: SimulationState,
  newOrder?: SimulationOrder,
): Promise<boolean> {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sync_portfolio",
        cash: state.cash,
        startingCash: state.startingCash,
        realizedPL: state.realizedPL,
        positions: state.positions,
        newOrder,
      }),
    });
    const data = await res.json();
    return Boolean(data?.ok);
  } catch {
    return false;
  }
}

export async function resetPortfolioInSqlite(newCapital = 0.0): Promise<boolean> {
  try {
    if (typeof window !== "undefined") {
      if (newCapital === 0) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_portfolio", cash: newCapital }),
    });
    const data = await res.json();
    return Boolean(data?.ok);
  } catch {
    return false;
  }
}

export async function savePredictionToSqlite(prediction: StockPrediction): Promise<void> {
  try {
    await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_prediction",
        prediction,
      }),
    });
  } catch {
    // ignore offline errors
  }
}

export async function saveAgentAlertToSqlite(alert: AgentLiveAlert): Promise<void> {
  try {
    await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_alert",
        alert,
      }),
    });
  } catch {
    // ignore
  }
}
