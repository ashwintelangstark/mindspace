// Server-side SQLite & Live Market API handler using Node's built-in node:sqlite
// Uses dynamic import so client/Cloudflare static bundlers don't fail on node:sqlite

export interface SqliteStatementLike {
  get: (...params: unknown[]) => unknown;
  all: (...params: unknown[]) => unknown[];
  run: (...params: unknown[]) => unknown;
}

export interface SqliteDatabaseLike {
  exec: (sql: string) => void;
  prepare: (sql: string) => SqliteStatementLike;
}

interface WalletRow {
  cash?: number;
  starting_cash?: number;
  realized_pl?: number;
  updated_at?: string;
}

interface PositionRow {
  symbol: string;
  name: string;
  qty: number;
  avg_cost: number;
  current_price: number;
  currency: string;
}

interface OrderRow {
  id: string;
  timestamp: string;
  time_string: string;
  side: string;
  symbol: string;
  name: string;
  qty: number;
  price: number;
  execution_type: string;
  total: number;
  currency: string;
  status: string;
}

export interface SqliteActionPayload {
  action?: string;
  username?: string;
  cash?: number;
  startingCash?: number;
  realizedPL?: number;
  orders?: unknown[];
  positions?: Record<
    string,
    {
      symbol: string;
      name: string;
      qty: number;
      avgCost: number;
      currentPrice: number;
      currency: string;
    }
  >;
  newOrder?: {
    id: string;
    timestamp: string;
    timeString: string;
    side: string;
    symbol: string;
    name: string;
    qty: number;
    price: number;
    executionType?: string;
    total: number;
    currency: string;
    status?: string;
  };
  prediction?: {
    stock?: { symbol: string };
    horizon?: string;
    recommendedInvestAmount?: number;
    consensusVerdict?: string;
    accuracyRate?: number;
    targetPrice?: number;
    stopLossPrice?: number;
    projectedProfitAmount?: number;
    projectedLossAmount?: number;
    mlReport?: { modelName?: string };
  };
  alert?: {
    id: string;
    agentId: string;
    symbol: string;
    topic: string;
    signal: string;
    message: string;
    priceAtAlert: number;
  };
  stock?: {
    symbol: string;
    name: string;
    market: string;
    currency: string;
    price: number;
    change: number;
    bid?: number;
    ask?: number;
    volume: string;
  };
  candles?: unknown[];
}

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        shortName?: string;
        longName?: string;
        exchangeName?: string;
        fullExchangeName?: string;
        currency?: string;
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        regularMarketVolume?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
}

interface YahooSearchResponse {
  quotes?: Array<{
    symbol?: string;
    shortname?: string;
    longname?: string;
    exchDisp?: string;
    exchange?: string;
    quoteType?: string;
    sectorDisp?: string;
    industryDisp?: string;
  }>;
}

// Singleton database instance on Node server
let dbInstance: SqliteDatabaseLike | null = null;

async function getDb(): Promise<SqliteDatabaseLike | null> {
  if (dbInstance) return dbInstance;
  if (typeof process === "undefined" || !process.versions?.node) {
    return null;
  }

  try {
    const sqliteMod = (await import(/* @vite-ignore */ "node:sqlite")) as {
      DatabaseSync: new (p: string) => SqliteDatabaseLike;
    };
    const pathMod = await import(/* @vite-ignore */ "node:path");
    const fsMod = await import(/* @vite-ignore */ "node:fs");

    const dbDir = pathMod.resolve(process.cwd(), "data");
    if (!fsMod.existsSync(dbDir)) {
      fsMod.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = pathMod.join(dbDir, "mindspace.sqlite");
    const db = new sqliteMod.DatabaseSync(dbPath);

    db.exec(`
      CREATE TABLE IF NOT EXISTS stocks_cache (
        symbol TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        market TEXT NOT NULL,
        currency TEXT NOT NULL,
        price REAL NOT NULL,
        change_pct REAL NOT NULL,
        bid REAL NOT NULL,
        ask REAL NOT NULL,
        volume TEXT NOT NULL,
        candles_json TEXT,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        horizon TEXT NOT NULL,
        invest_amount REAL NOT NULL,
        consensus_verdict TEXT NOT NULL,
        accuracy_rate REAL NOT NULL,
        target_price REAL NOT NULL,
        stop_loss_price REAL NOT NULL,
        projected_profit REAL NOT NULL,
        projected_loss REAL NOT NULL,
        ml_model_name TEXT NOT NULL,
        prediction_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS portfolio_wallet (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        cash REAL NOT NULL DEFAULT 0.0,
        starting_cash REAL NOT NULL DEFAULT 0.0,
        realized_pl REAL NOT NULL DEFAULT 0.0,
        updated_at TEXT NOT NULL
      );
      INSERT OR IGNORE INTO portfolio_wallet (id, cash, starting_cash, realized_pl, updated_at)
      VALUES (1, 0.0, 0.0, 0.0, datetime('now'));
      CREATE TABLE IF NOT EXISTS positions (
        symbol TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        qty INTEGER NOT NULL,
        avg_cost REAL NOT NULL,
        current_price REAL NOT NULL,
        currency TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        time_string TEXT NOT NULL,
        side TEXT NOT NULL,
        symbol TEXT NOT NULL,
        name TEXT NOT NULL,
        qty INTEGER NOT NULL,
        price REAL NOT NULL,
        execution_type TEXT NOT NULL DEFAULT 'MARKET_BID_ASK',
        total REAL NOT NULL,
        currency TEXT NOT NULL,
        status TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS agent_alerts (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        topic TEXT NOT NULL,
        signal TEXT NOT NULL,
        message TEXT NOT NULL,
        price_at_alert REAL NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS user_portfolios (
        username TEXT PRIMARY KEY,
        state_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    dbInstance = db;
    return db;
  } catch (err) {
    console.warn("SQLite initialization skipped or unavailable in this runtime:", err);
    return null;
  }
}

export async function handleSqliteAction(
  body: SqliteActionPayload,
): Promise<Record<string, unknown>> {
  const db = await getDb();
  if (!db) {
    return { ok: false, error: "SQLite runtime unavailable" };
  }

  const action = body?.action;
  const userKey = body?.username ? body.username.trim().toLowerCase() : "";

  if (action === "get_state") {
    if (userKey && userKey !== "default") {
      const userRow = db
        .prepare("SELECT state_json FROM user_portfolios WHERE username = ?")
        .get(userKey) as { state_json?: string } | undefined;
      if (userRow?.state_json) {
        try {
          const parsed = JSON.parse(userRow.state_json);
          return {
            ok: true,
            wallet: {
              cash: parsed.cash ?? 0,
              startingCash: parsed.startingCash ?? 0,
              realizedPL: parsed.realizedPL ?? 0,
            },
            positions: parsed.positions || {},
            orders: parsed.orders || [],
          };
        } catch {
          // fallback
        }
      }
      return {
        ok: true,
        wallet: { cash: 0, startingCash: 0, realizedPL: 0 },
        positions: {},
        orders: [],
      };
    }

    const wallet = db
      .prepare(
        "SELECT cash, starting_cash, realized_pl, updated_at FROM portfolio_wallet WHERE id = 1",
      )
      .get() as WalletRow | undefined;
    const positionsRows = db.prepare("SELECT * FROM positions").all() as PositionRow[];
    const ordersRows = db
      .prepare("SELECT * FROM orders ORDER BY timestamp DESC LIMIT 50")
      .all() as OrderRow[];
    const alertsRows = db
      .prepare("SELECT * FROM agent_alerts ORDER BY created_at DESC LIMIT 20")
      .all();
    const recentPredictions = db
      .prepare(
        "SELECT id, symbol, horizon, consensus_verdict, accuracy_rate, target_price, stop_loss_price, ml_model_name, created_at FROM predictions ORDER BY id DESC LIMIT 10",
      )
      .all();

    const positions: Record<string, unknown> = {};
    for (const row of positionsRows) {
      const marketValue = Number((row.qty * row.current_price).toFixed(2));
      const unrealizedPL = Number(((row.current_price - row.avg_cost) * row.qty).toFixed(2));
      const unrealizedPLPct =
        row.avg_cost > 0
          ? Number((((row.current_price - row.avg_cost) / row.avg_cost) * 100).toFixed(2))
          : 0;
      positions[row.symbol] = {
        symbol: row.symbol,
        name: row.name,
        qty: row.qty,
        avgCost: row.avg_cost,
        currentPrice: row.current_price,
        currency: row.currency,
        marketValue,
        unrealizedPL,
        unrealizedPLPct,
      };
    }

    const orders = ordersRows.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      timeString: r.time_string,
      side: r.side,
      symbol: r.symbol,
      name: r.name,
      qty: r.qty,
      price: r.price,
      executionType: r.execution_type,
      total: r.total,
      currency: r.currency,
      status: r.status,
    }));

    return {
      ok: true,
      dbEngine: "SQLite 3 (data/mindspace.sqlite)",
      wallet: {
        cash: wallet?.cash ?? 0,
        startingCash: wallet?.starting_cash ?? 0,
        realizedPL: wallet?.realized_pl ?? 0,
      },
      positions,
      orders,
      alerts: alertsRows,
      recentPredictions,
    };
  }

  if (action === "sync_portfolio") {
    const { cash, startingCash, realizedPL, positions, orders, newOrder } = body;
    const now = new Date().toISOString();

    if (userKey && userKey !== "default") {
      const existingRow = db
        .prepare("SELECT state_json FROM user_portfolios WHERE username = ?")
        .get(userKey) as { state_json?: string } | undefined;
      let existingOrders: unknown[] = [];
      if (existingRow?.state_json) {
        try {
          const p = JSON.parse(existingRow.state_json);
          if (Array.isArray(p.orders)) existingOrders = p.orders;
        } catch {
          // ignore
        }
      }
      const nextOrders = Array.isArray(orders)
        ? orders
        : newOrder
          ? [newOrder, ...existingOrders].slice(0, 50)
          : existingOrders;
      const statePayload = {
        cash: cash ?? 0,
        startingCash: startingCash ?? 0,
        realizedPL: realizedPL ?? 0,
        positions: positions || {},
        orders: nextOrders,
      };
      db.prepare(
        "INSERT OR REPLACE INTO user_portfolios (username, state_json, updated_at) VALUES (?, ?, ?)",
      ).run(userKey, JSON.stringify(statePayload), now);
      return { ok: true };
    }

    db.prepare(
      "UPDATE portfolio_wallet SET cash = ?, starting_cash = ?, realized_pl = ?, updated_at = ? WHERE id = 1",
    ).run(cash ?? 0, startingCash ?? 0, realizedPL ?? 0, now);

    db.prepare("DELETE FROM positions").run();
    const insertPos = db.prepare(
      "INSERT INTO positions (symbol, name, qty, avg_cost, current_price, currency, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    );
    if (positions && typeof positions === "object") {
      for (const pos of Object.values(positions)) {
        if (pos && pos.qty > 0) {
          insertPos.run(
            pos.symbol,
            pos.name,
            pos.qty,
            pos.avgCost,
            pos.currentPrice,
            pos.currency,
            now,
          );
        }
      }
    }

    if (newOrder) {
      db.prepare(
        `INSERT OR REPLACE INTO orders
         (id, timestamp, time_string, side, symbol, name, qty, price, execution_type, total, currency, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        newOrder.id,
        newOrder.timestamp,
        newOrder.timeString,
        newOrder.side,
        newOrder.symbol,
        newOrder.name,
        newOrder.qty,
        newOrder.price,
        newOrder.executionType || "MARKET_BID_ASK",
        newOrder.total,
        newOrder.currency,
        newOrder.status || "EXECUTED",
      );
    }

    return { ok: true };
  }

  if (action === "reset_portfolio") {
    const now = new Date().toISOString();
    const newCapital = typeof body.cash === "number" && body.cash >= 0 ? body.cash : 0.0;
    if (userKey && userKey !== "default") {
      const resetState = {
        cash: newCapital,
        startingCash: newCapital,
        realizedPL: 0.0,
        positions: {},
        orders: [],
      };
      db.prepare(
        "INSERT OR REPLACE INTO user_portfolios (username, state_json, updated_at) VALUES (?, ?, ?)",
      ).run(userKey, JSON.stringify(resetState), now);
      return { ok: true };
    }
    db.prepare(
      "UPDATE portfolio_wallet SET cash = ?, starting_cash = ?, realized_pl = 0.0, updated_at = ? WHERE id = 1",
    ).run(newCapital, newCapital, now);
    db.prepare("DELETE FROM positions").run();
    db.prepare("DELETE FROM orders").run();
    return { ok: true };
  }

  if (action === "save_prediction") {
    const { prediction } = body;
    if (prediction && prediction.stock) {
      db.prepare(
        `INSERT INTO predictions
         (symbol, horizon, invest_amount, consensus_verdict, accuracy_rate, target_price, stop_loss_price, projected_profit, projected_loss, ml_model_name, prediction_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        prediction.stock.symbol,
        prediction.horizon ?? "1D",
        prediction.recommendedInvestAmount ?? 0,
        prediction.consensusVerdict ?? "BUY",
        prediction.accuracyRate ?? 91.2,
        prediction.targetPrice ?? 0,
        prediction.stopLossPrice ?? 0,
        prediction.projectedProfitAmount ?? 0,
        prediction.projectedLossAmount ?? 0,
        prediction.mlReport?.modelName || "Mindspace Quant Ensemble",
        JSON.stringify(prediction),
        new Date().toISOString(),
      );
    }
    return { ok: true };
  }

  if (action === "save_alert") {
    const { alert } = body;
    if (alert) {
      db.prepare(
        `INSERT OR REPLACE INTO agent_alerts
         (id, agent_id, symbol, topic, signal, message, price_at_alert, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        alert.id,
        alert.agentId,
        alert.symbol,
        alert.topic,
        alert.signal,
        alert.message,
        alert.priceAtAlert,
        new Date().toISOString(),
      );
    }
    return { ok: true };
  }

  if (action === "cache_stock") {
    const { stock, candles } = body;
    if (stock) {
      db.prepare(
        `INSERT OR REPLACE INTO stocks_cache
         (symbol, name, market, currency, price, change_pct, bid, ask, volume, candles_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        stock.symbol,
        stock.name,
        stock.market,
        stock.currency,
        stock.price,
        stock.change,
        stock.bid ?? stock.price,
        stock.ask ?? stock.price,
        stock.volume,
        candles ? JSON.stringify(candles.slice(-60)) : null,
        new Date().toISOString(),
      );
    }
    return { ok: true };
  }

  return { ok: false, error: "Unknown action" };
}

function formatVolumeCompact(vol: number): string {
  if (!vol || vol <= 0) return "—";
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return String(vol);
}

/**
 * Fetches live OHLCV chart & quote data from Yahoo Finance v8 API
 * Supports NSE (.NS), BSE (.BO), NASDAQ/NYSE, and Crypto (-USD)
 */
export async function fetchLiveYahooChart(yahooSymbol: string, interval = "5m", range = "1d") {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      yahooSymbol,
    )}?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)",
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { ok: false, status: res.status };
    }

    const data = (await res.json()) as YahooChartResponse;
    const result = data?.chart?.result?.[0];
    if (!result) {
      return { ok: false, error: "Empty chart result" };
    }

    const meta = result.meta || {};
    const timestamps: number[] = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const opens: Array<number | null> = quote.open || [];
    const highs: Array<number | null> = quote.high || [];
    const lows: Array<number | null> = quote.low || [];
    const closes: Array<number | null> = quote.close || [];
    const volumes: Array<number | null> = quote.volume || [];

    const candles = [];
    for (let i = 0; i < timestamps.length; i++) {
      const o = opens[i];
      const h = highs[i];
      const l = lows[i];
      const c = closes[i];
      const v = volumes[i] ?? 0;
      if (o != null && h != null && l != null && c != null) {
        candles.push({
          time: timestamps[i],
          open: Number(o.toFixed(2)),
          high: Number(h.toFixed(2)),
          low: Number(l.toFixed(2)),
          close: Number(c.toFixed(2)),
          volume: Math.round(v),
        });
      }
    }

    const regularMarketPrice = meta.regularMarketPrice ?? candles[candles.length - 1]?.close;
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? candles[0]?.open;
    const changePct =
      regularMarketPrice && previousClose
        ? Number((((regularMarketPrice - previousClose) / previousClose) * 100).toFixed(2))
        : 0;

    const rawSym = meta.symbol || yahooSymbol;
    const cleanSymbol = rawSym.replace(/\.(NS|BO)$/i, "");
    const currencyCode = (meta.currency || "").toUpperCase();
    const isInr = currencyCode === "INR" || rawSym.endsWith(".NS") || rawSym.endsWith(".BO");
    const currencySymbol = isInr ? "₹" : "$";

    const exch = (meta.exchangeName || meta.fullExchangeName || "").toUpperCase();
    let marketLabel = "GLOBAL · EQ";
    if (rawSym.endsWith(".NS") || exch.includes("NSI") || exch.includes("NSE")) {
      marketLabel = "NSE · EQ";
    } else if (rawSym.endsWith(".BO") || exch.includes("BSE") || exch.includes("BOM")) {
      marketLabel = "BSE · EQ";
    } else if (rawSym.endsWith("-USD") || exch.includes("CCC")) {
      marketLabel = "CRYPTO · 24/7";
    } else if (exch.includes("NMS") || exch.includes("NGM") || exch.includes("NAS")) {
      marketLabel = "NASDAQ · US";
    } else if (exch.includes("NYQ") || exch.includes("NYSE")) {
      marketLabel = "NYSE · US";
    }

    const priceNum = regularMarketPrice ? Number(regularMarketPrice.toFixed(2)) : 0;
    const halfSpread = Math.max(0.05, Number((priceNum * 0.0004).toFixed(2)));
    const bid = Number(Math.max(0.01, priceNum - halfSpread).toFixed(2));
    const ask = Number((priceNum + halfSpread).toFixed(2));
    const spread = Number((ask - bid).toFixed(2));

    const totalVol =
      meta.regularMarketVolume || candles.reduce((acc, c) => acc + (c.volume || 0), 0);

    return {
      ok: true,
      symbol: cleanSymbol,
      yahooSymbol: rawSym,
      name: meta.longName || meta.shortName || cleanSymbol,
      market: marketLabel,
      currency: currencySymbol,
      price: priceNum,
      previousClose: previousClose ? Number(previousClose.toFixed(2)) : undefined,
      changePct,
      bid,
      ask,
      spread,
      volume: formatVolumeCompact(totalVol),
      high24h: meta.regularMarketDayHigh ? Number(meta.regularMarketDayHigh.toFixed(2)) : undefined,
      low24h: meta.regularMarketDayLow ? Number(meta.regularMarketDayLow.toFixed(2)) : undefined,
      candles: candles.slice(-72),
    };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * Live Stock Search via Yahoo Finance v1 Search API
 * Searches across Indian (NSE/BSE), US (NASDAQ/NYSE), and Global markets in real time.
 */
export async function searchLiveYahooStocks(query: string) {
  if (!query || !query.trim()) {
    return { ok: true, results: [] };
  }
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      query.trim(),
    )}&quotesCount=8&newsCount=0`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)",
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { ok: false, status: res.status, results: [] };
    }

    const data = (await res.json()) as YahooSearchResponse;
    const rawQuotes = (data?.quotes || []).filter(
      (q) =>
        q.symbol &&
        (q.quoteType === "EQUITY" ||
          q.quoteType === "CRYPTOCURRENCY" ||
          q.quoteType === "ETF" ||
          q.quoteType === "INDEX"),
    );

    return {
      ok: true,
      results: rawQuotes.slice(0, 8).map((q) => {
        const rawSym = q.symbol || "";
        const cleanSym = rawSym.replace(/\.(NS|BO)$/i, "");
        const isInr =
          rawSym.endsWith(".NS") ||
          rawSym.endsWith(".BO") ||
          (q.exchDisp || "").toUpperCase().includes("NSE") ||
          (q.exchDisp || "").toUpperCase().includes("BSE") ||
          (q.exchange || "").toUpperCase().includes("NSI");
        return {
          symbol: cleanSym,
          yahooSymbol: rawSym,
          name: q.longname || q.shortname || cleanSym,
          market: q.exchDisp || q.exchange || (isInr ? "NSE · EQ" : "GLOBAL"),
          currency: isInr ? "₹" : "$",
          sector: q.sectorDisp || q.industryDisp || q.quoteType || "Equity",
        };
      }),
    };
  } catch (err) {
    return { ok: false, error: String(err), results: [] };
  }
}

/**
 * Fetches real-time prices for Market Overview Indices & Key Tickers in parallel.
 */
export async function fetchLiveMarketOverview() {
  const indexTargets = [
    { name: "NIFTY 50", yahooSymbol: "^NSEI" },
    { name: "SENSEX", yahooSymbol: "^BSESN" },
    { name: "NASDAQ", yahooSymbol: "^IXIC" },
    { name: "S&P 500", yahooSymbol: "^GSPC" },
    { name: "BTC", yahooSymbol: "BTC-USD" },
    { name: "ETH", yahooSymbol: "ETH-USD" },
  ];

  const results = await Promise.all(
    indexTargets.map(async (item) => {
      const chart = await fetchLiveYahooChart(item.yahooSymbol, "5m", "1d");
      if (chart.ok && typeof chart.price === "number" && chart.price > 0) {
        const changePct = chart.changePct ?? 0;
        const isUp = changePct >= 0;
        return {
          name: item.name,
          numericPrice: chart.price,
          price: chart.price.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          changePct,
          change: `${isUp ? "+" : ""}${changePct.toFixed(2)}%`,
          isUp,
        };
      }
      return null;
    }),
  );

  return {
    ok: true,
    indices: results.filter((r): r is NonNullable<typeof r> => r !== null),
  };
}
