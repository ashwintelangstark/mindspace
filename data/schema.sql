-- Mindspace SQLite Database Schema
-- Stores live market cache, ML predictions, 4-Agent reports, Paper Trading Portfolio, Orders, and Intraday Agent Alerts

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

CREATE TABLE IF NOT EXISTS watchlist (
  symbol TEXT PRIMARY KEY,
  added_at TEXT NOT NULL
);
