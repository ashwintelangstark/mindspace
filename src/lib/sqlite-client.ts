import { SimulationOrder, SimulationState, StockPrediction, AgentLiveAlert } from "@/types/stock";
import { getActiveUsername } from "./auth";

function getStorageKey(username?: string): string {
  const user = (username || getActiveUsername() || "guest").trim().toLowerCase();
  return `mindspace_simulation_state_v2_${user}`;
}

export async function loadPortfolioFromSqlite(username?: string): Promise<{
  simState: SimulationState;
  dbConnected: boolean;
}> {
  const user = (username || getActiveUsername() || "guest").trim().toLowerCase();
  const storageKey = getStorageKey(user);

  let localFallback: SimulationState = {
    cash: 0.0,
    startingCash: 0.0,
    positions: {},
    orders: [],
    realizedPL: 0.0,
  };

  try {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        localFallback = JSON.parse(saved);
      }
    }
  } catch {
    // ignore
  }

  try {
    const res = await fetch(`/api/db?user=${encodeURIComponent(user)}`, { method: "GET" });
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
        localStorage.setItem(storageKey, JSON.stringify(serverState));
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
  username?: string,
): Promise<boolean> {
  const user = (username || getActiveUsername() || "guest").trim().toLowerCase();
  const storageKey = getStorageKey(user);

  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sync_portfolio",
        username: user,
        cash: state.cash,
        startingCash: state.startingCash,
        realizedPL: state.realizedPL,
        positions: state.positions,
        orders: state.orders,
        newOrder,
      }),
    });
    const data = await res.json();
    return Boolean(data?.ok);
  } catch {
    return false;
  }
}

export async function resetPortfolioInSqlite(
  newCapital = 0.0,
  username?: string,
): Promise<boolean> {
  const user = (username || getActiveUsername() || "guest").trim().toLowerCase();
  const storageKey = getStorageKey(user);

  try {
    if (typeof window !== "undefined") {
      if (newCapital === 0) {
        localStorage.removeItem(storageKey);
      }
    }
    const res = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reset_portfolio",
        username: user,
        cash: newCapital,
      }),
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
        username: getActiveUsername(),
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
