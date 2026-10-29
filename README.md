# 🪐 MINDSPACE

> **Next-Generation 3D Stock Intelligence, Autonomous AI Agent Trading Floor & Simulation Platform**

![Mindspace Banner](logo.png)

Mindspace is an immersive, real-time financial trading floor powered by **Three.js (WebGL)**, a modern **TanStack Start & Nitro** architecture, **SQLite** persistent storage, and **4 autonomous AI market agents**.

The platform merges real-world market feeds (Indian NSE/BSE & US Markets), strict exchange session hours enforcement, Groww-style simulation trading, interactive multi-agent Q&A discussions, and institutional-grade Word document reporting into a cohesive 3D spatial experience.

---

## 📑 Table of Contents

- [Key Features Overview](#-key-features-overview)
- [The 4 AI Agents: Roles, Jobs & Specializations](#-the-4-ai-agents-roles-jobs--specializations)
  - [🐂 Bull Agent](#-bull-agent--momentum--breakout-strategist)
  - [🐻 Bear Agent](#-bear-agent--risk-manager--capital-preservation-officer)
  - [🦌 Stag Agent](#-stag-agent--macro-valuation--portfolio-allocator)
  - [🐇 Rabbit Agent](#-rabbit-agent--hft-order-flow--execution-specialist)
- [The 3D Exchange Trading Floor](#-the-3d-exchange-trading-floor)
- [Real-Time Market Hours & Settlement Freezing](#-real-time-market-hours--settlement-freezing)
- [Simulation Trading Platform (Groww-Style)](#-simulation-trading-platform-groww-style)
- [Agent Discussions & User Q&A Roundtable](#-agent-discussions--user-qa-roundtable)
- [Export to Professional Word (.docx) Reports](#-export-to-professional-word-docx-reports)
- [SQLite Database Architecture](#-sqlite-database-architecture)
- [Tech Stack](#-tech-stack)
- [Local Development & Setup](#-local-development--setup)
- [Available Scripts](#-available-scripts)

---

## 🌟 Key Features Overview

| Feature                                | Description                                                                                                                                                                        |
| :------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **🎮 Interactive 3D Trading Floor**    | Canvas-rendered Three.js office with dynamic weather, sun azimuth, rain/fog, and day-night lighting synced to your system's exact local time and location.                         |
| **🤖 4 Autonomous AI Market Agents**   | Bull, Bear, Stag, and Rabbit work collaboratively to analyze stocks, trade in simulation, and hold educational market roundtables.                                                 |
| **📈 Live Indian & US Market Support** | Track Indian indices (NIFTY 50, SENSEX, BANKNIFTY) and equities (RELIANCE, TCS, INFY, HDFCBANK) alongside US giants (AAPL, NVDA, TSLA, MSFT).                                      |
| **⏰ Strict Exchange Hours Engine**    | Real-time session detection freezes prices to official closing numbers after market hours (3:30 PM IST for NSE; 4:00 PM EST for US), eliminating fictitious off-market volatility. |
| **🎯 Settlement-Based Predictions**    | After-hours predictions run on official closing OHLCV candles, RSI, MACD, and Bollinger Bands rather than simulated random ticks.                                                  |
| **💼 Groww-Style Paper Trading**       | Execute simulated market and limit orders by **exact quantity of shares**, calculate real-time P&L, track holdings, and build watchlists.                                          |
| **💬 Agent Discussion Roundtable**     | Switch to the "Discussions" drawer where all 4 agents gather around the coffee table in 3D space to discuss tactical tips or answer user questions.                                |
| **📄 Export to Word (.docx)**          | One-click export of an institutional-grade research document featuring complete analysis tables, consensus scores, and agent justifications.                                       |
| **🗄️ Embedded SQLite Storage**         | Local, zero-latency database storing watchlists, executed trades, portfolio balances, and historical agent predictions.                                                            |

---

## 🧠 The 4 AI Agents: Roles, Jobs & Specializations

Mindspace features four distinct AI agents modeled after classic stock market archetypes. Each agent is driven by mathematical indicators, order-book mechanics, and quantitative machine-learning models.

```
                      ┌────────────────────────┐
                      │    MINDSPACE AGENTS    │
                      └───────────┬────────────┘
         ┌────────────────┬───────┴────────┬────────────────┐
         ▼                ▼                ▼                ▼
   🐂 BULL AGENT    🐻 BEAR AGENT    🦌 STAG AGENT    🐇 RABBIT AGENT
  Momentum & Growth  Risk & Hedging   Value & Macro    HFT & Execution
```

---

### 🐂 Bull Agent — Momentum & Breakout Strategist

- **Role**: Identifies high-momentum upside breakouts, volume-expansion trends, and multi-week bullish rallies.
- **Jobs & Technical Indicators**:
  - Calculates **EMA 9 / EMA 21** golden crossovers and **SuperTrend** signals.
  - Monitors **RSI momentum** surges ($RSI > 55$) accompanied by $>1.5\times$ average trading volume.
  - Detects **MACD histogram** expansions above the baseline.
  - Projects multi-day upside target prices and upside profit-potential percentages.
- **Roundtable & Q&A Persona**: Encourages riding winning trends, pyramiding into breakouts, trailing stop-losses, and seizing growth opportunities without falling into FOMO.

---

### 🐻 Bear Agent — Risk Manager & Capital Preservation Officer

- **Role**: Protects your portfolio capital, uncovers hidden downside risks, and identifies distribution patterns.
- **Jobs & Technical Indicators**:
  - Detects **RSI overbought traps** ($RSI > 70$), negative divergence, and false breakout rejections.
  - Identifies **Bollinger Band upper-band exhaustion** and heavy institutional selling volume.
  - Calculates maximum anticipated drawdown and enforces strict **Risk-Reward Ratios** ($\ge 2:1$).
  - Computes non-negotiable **Stop-Loss levels** to cap portfolio losses at $1\%-2\%$ per trade.
- **Roundtable & Q&A Persona**: Pragmatic, defensive, and risk-obsessed. Teaches trade sizing, hedging techniques, capital preservation, and identifying market distribution tops.

---

### 🦌 Stag Agent — Macro Valuation & Portfolio Allocator

- **Role**: Long-term asset allocator focused on fundamental valuation, margin of safety, and institutional consensus.
- **Jobs & Technical Indicators**:
  - Evaluates **Price-to-Earnings (P/E)**, **Price-to-Book (P/B)**, and sector-median valuation bands.
  - Computes institutional accumulation metrics and dividend sustainability scores.
  - Analyzes market regime indicators and long-term moving averages (**50-day & 200-day SMAs**).
  - Formulates fair-value target ranges and recommends portfolio sector rebalancing.
- **Roundtable & Q&A Persona**: Patient, disciplined, and value-oriented. Shares strategies on dollar-cost averaging (SIP), identifying undervalued moats, and filtering out market noise.

---

### 🐇 Rabbit Agent — HFT Order Flow & Execution Specialist

- **Role**: Microstructure scalper and precision order executioner.
- **Jobs & Technical Indicators**:
  - Scans **Level-2 order book depth** (top 5 bids and asks) to measure order imbalances.
  - Tracks **Volume-Weighted Average Price (VWAP)** deviations to detect intraday pullbacks.
  - Estimates bid-ask spread friction and slippage costs.
  - Determines the exact optimal limit entry price and tight stop brackets for high-precision fills.
- **Roundtable & Q&A Persona**: Fast, agile, and execution-centric. Advises on avoiding market orders during volatile opening bells, timing intraday liquidity pockets, and reducing slippage.

---

## 🏢 The 3D Exchange Trading Floor

Mindspace takes trading out of flat 2D dashboards and places it inside a dynamic 3D office environment:

- **Procedural Canvas Textures**: All textures (trading screens, wood parquet flooring, glass partitions, and desk monitors) are dynamically generated using Canvas2D with zero external image requests.
- **System-Synced Weather & Lighting**:
  - Detects the user's local operating system time and geographic coordinates.
  - Accurately computes the sun's altitude and azimuth angle.
  - Switches between morning dawn, midday sun, golden hour sunset, and starry night skies with real-time fog and cloud cover.
- **Dynamic 3D Agent HUD**: A clean horizontal status indicator rendered directly above the floor displays real-time agent states (e.g., _Bull: Analyzing EMA Cross_, _Bear: Calculating Max Drawdown_, _Rabbit: Scanning Order Book_).
- **Interactive Roaming**: Agents roam freely between workstations, look out the panoramic exchange window, and gather at the executive lounge during discussion sessions.

---

## ⏰ Real-Time Market Hours & Settlement Freezing

Mindspace enforces real-world exchange timings to guarantee realistic data integrity:

```
[ Market Open (9:15 AM - 3:30 PM IST) ]  -->  Live Real-Time Price Updates & Streaming Ticks
[ Market Closed (After 3:30 PM / Weekend) ] -->  Freeze to Official Settlement Closing Price (No Random Numbers)
```

- **Clear Market Status Badges**:
  - `🟢 Market Open` during active exchange trading sessions.
  - `🔴 Market Closed · Closed at 3:30 PM IST · Opens 9:15 AM IST` (or US equivalent) when the bell rings.
- **Settlement-Based Predictions**: When running analysis off-hours, the 4 AI agents base their forecasts on verified official daily closing data rather than simulated random ticks.

---

## 💼 Simulation Trading Platform (Groww-Style)

Experience the realism of live markets without financial risk:

- **Quantity-Based Execution**: Enter the exact number of shares you wish to buy or sell rather than abstract currency amounts.
- **Live Bid/Ask Match Engine**: Orders execute against real-time market prices with automatic margin and capital deduction.
- **Comprehensive Portfolio Tracking**:
  - Current Holdings & Average Buy Price
  - Real-Time P&L ($\$$ / ₹ and $\%$)
  - Total Invested vs. Current Portfolio Valuation
  - Complete Executed Order History stored in SQLite

---

## 💬 Agent Discussions & User Q&A Roundtable

Beyond analyzing individual stocks, Mindspace provides an interactive roundtable lounge:

- **Start / Stop Controls**: Easily trigger or pause agent discussions with the dedicated `▶ Start` / `⏸ Pause` controls.
- **3D Lounge Gathering**: When discussion mode begins, Bull, Bear, Stag, and Rabbit automatically walk over and gather around the office coffee table.
- **Interactive User Q&A Input**: A sticky text prompt allows you to ask any financial question (e.g., _"How should I hedge ahead of budget day?"_). All 4 agents immediately answer from their respective perspectives.
- **Token-Efficient & Offline Resilient**:
  - Ultra-compact prompts consume only ~150–250 tokens per turn using free-tier OpenRouter models.
  - Comprehensive offline fallback engine with 15+ quantitative investment topics ensures instant, zero-cost responses even without internet or API keys.

---

## 📄 Export to Professional Word (.docx) Reports

Generate institutional-quality research reports with a single click:

- **Executive Summary & Consensus Score**: Combined multi-agent stance (`STRONG BUY`, `BUY`, `HOLD`, `SELL`) with confidence metrics.
- **Structured Data Tables**:
  | Agent      |  Stance  | Target Price | Stop-Loss |      Key Metric       | Technical Thesis                    |
  | :--------- | :------: | :----------: | :-------: | :-------------------: | :---------------------------------- |
  | **Bull**   | Bullish  |    ₹2,850    |  ₹2,640   | EMA 9/21 Golden Cross | Momentum breakout above 20-day high |
  | **Bear**   | Cautious |    ₹2,550    |  ₹2,680   | RSI Overbought (68.4) | Overhead resistance at ₹2,750       |
  | **Stag**   | Neutral  |    ₹2,720    |  ₹2,500   | P/E 24.2 vs Sector 26 | Fairly valued with steady dividends |
  | **Rabbit** |  Active  |    ₹2,710    |  ₹2,675   |    VWAP Slip 0.12%    | Tight spread, limit entry at ₹2,688 |
- **Detailed Agent Breakdowns**: Dedicated report sections containing each agent's individual mathematical rationale and risk parameters.

---

## 🗄️ SQLite Database Architecture

Mindspace includes an embedded SQLite database (`data/mindspace.sqlite`) with automatic schema initialization:

- `portfolio`: Stores virtual cash balance and realized gains.
- `holdings`: Tracks symbol, exchange, quantity, average price, and timestamp.
- `orders`: Audit log of all market/limit buy and sell orders.
- `watchlist`: User's custom pinned stocks.
- `agent_predictions`: Historical archive of predictions generated by Bull, Bear, Stag, and Rabbit for backtesting accuracy.
- `system_settings`: Preserves user preferences, API keys, and notification thresholds.

---

## 🛠️ Tech Stack

- **Frontend & 3D**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Three.js](https://threejs.org/), [@react-three/fiber](https://r3f.docs.pmnd.rs/), [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **Framework & SSR**: [TanStack Start](https://tanstack.com/start), [Vinxi](https://vinxi.vercel.app/), [Nitro](https://nitro.unjs.io/) (Cloudflare Pages/Workers preset)
- **Database**: [SQLite](https://sqlite.org/) with WAL journaling mode
- **Export Engine**: [docx](https://docx.js.org/) for programmatic Word document generation
- **AI & ML Engine**: OpenRouter API (free-tier optimized) + Offline Quantitative Indicator Rules Engine
- **Testing**: [Vitest](https://vitest.dev/) with testing-library

---

## 🚀 Local Development & Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- `npm` or `pnpm`

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/ashwintelangstark/mindspace.git
   cd mindspace
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure Environment Variables** (Optional for custom LLM keys):

   ```bash
   cp .env.example .env
   # Add your OPENROUTER_API_KEY or GROWW_API_KEY if available
   ```

4. **Launch the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to enter the 3D Mindspace trading floor.

---

## 🧪 Available Scripts

| Command          | Purpose                                                      |
| :--------------- | :----------------------------------------------------------- |
| `npm run dev`    | Starts local development server with hot-module reloading    |
| `npm run build`  | Compiles client and SSR bundles with Nitro Cloudflare preset |
| `npm test`       | Runs the full Vitest suite (8 unit & integration tests)      |
| `npm run lint`   | Checks TypeScript and ESLint rules                           |
| `npm run format` | Formats all source files via Prettier                        |

---

## 📜 License

Mindspace is proprietary and open for personal research and paper trading. Developed with pride by [ashwintelangstark](https://github.com/ashwintelangstark).
