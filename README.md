# 🪐 MINDSPACE

> **Next-Generation 3D Stock Intelligence, Autonomous AI Agent Trading Floor & Simulation Platform**

![Mindspace Banner](logo.png)

Mindspace is an immersive, real-time financial trading floor powered by **Three.js (WebGL)**, a modern **TanStack Start & Nitro** architecture, isolated personal account storage, and **4 autonomous AI market agents**.

The platform merges real-world market feeds (Indian NSE/BSE & US Markets), strict exchange session hours enforcement, interactive simulation trading, 6-horizon profit/loss probability modeling, multi-agent Q&A discussions, and institutional-grade Word document reporting into a cohesive 3D spatial experience.

---

## 📑 Table of Contents

- [Key Features Overview](#-key-features-overview)
- [The 4 AI Agents: Roles, Jobs & Specializations](#-the-4-ai-agents-roles-jobs--specializations)
  - [🐂 Bull Agent](#-bull-agent--momentum--breakout-strategist)
  - [🐻 Bear Agent](#-bear-agent--risk-manager--capital-preservation-officer)
  - [🦌 Stag Agent](#-stag-agent--macro-valuation--portfolio-allocator)
  - [🐇 Rabbit Agent](#-rabbit-agent--hft-order-flow--execution-specialist)
- [The 3D Exchange Trading Floor](#-the-3d-exchange-trading-floor)
- [Personal Account Authentication & Isolated Data](#-personal-account-authentication--isolated-data)
- [Real-Time Market Hours & Settlement Freezing](#-real-time-market-hours--settlement-freezing)
- [Live Trading Simulation & 6-Horizon Profit/Loss Engine](#-live-trading-simulation--6-horizon-profitloss-engine)
- [Agent Discussions & User Q&A Roundtable](#-agent-discussions--user-qa-roundtable)
- [Export to Professional Word (.doc) Reports](#-export-to-professional-word-doc-reports)
- [Tech Stack](#-tech-stack)
- [Local Development & Setup](#-local-development--setup)
- [Available Scripts](#-available-scripts)

---

## 🌟 Key Features Overview

| Feature                                | Description                                                                                                                                                                        |
| :------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **🌐 Interactive 3D Landing Page**     | Always opens first with a 1-by-1 3D Agent Spotlight, 4 individual 3D Roblox agent cards, and 3D holographic inspection capsules before entering the workspace.                     |
| **🔐 Login & Registration Gate**       | Register with Username, Email & Password and log in with Username, Password & Remember Me. Each user's virtual wallet, bought stocks, orders, and discussions are 100% isolated.   |
| **🎮 Interactive 3D Trading Floor**    | Canvas-rendered Three.js office with dynamic weather, sun azimuth, rain/fog, and day-night lighting synced to your system's exact local time and location.                         |
| **🤖 4 Autonomous AI Market Agents**   | Bull, Bear, Stag, and Rabbit work collaboratively to analyze stocks, evaluate 6-horizon profit/loss probabilities, and hold educational market roundtables.                        |
| **📈 Live Indian & US Market Support** | Track Indian indices (NIFTY 50, SENSEX) and equities (RELIANCE, TCS, INFY, HDFCBANK) alongside US giants (AAPL, NVDA, TSLA, MSFT).                                                 |
| **⏰ Strict Exchange Hours Engine**    | Real-time session detection freezes prices to official closing numbers after market hours (3:30 PM IST for NSE; 4:00 PM EST for US), eliminating fictitious off-market volatility. |
| **💼 Live Paper Trading Simulation**   | Execute simulated market and limit orders by **exact quantity of shares**, click bought positions to switch or sell, and inspect 4-agent reports for 1D, 1W, 1M, 6M, 1Y & 5Y.      |
| **💬 Agent Discussion Roundtable**     | Switch to the "Discussions" drawer where all 4 agents gather around the coffee table in 3D space to discuss tactical tips or answer user questions.                                |
| **📄 Export to Word (.doc)**           | One-click export of both **Stock Analysis Reports** (with 6-horizon profit/loss tables) and **Agent Roundtable Discussions** in neatly organized Word document format.             |

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
  - Projects upside target prices and profit probabilities across 1D, 1W, 1M, 6M, 1Y, and 5Y horizons.
- **Roundtable & Q&A Persona**: Encourages riding winning trends, pyramiding into breakouts, trailing stop-losses, and seizing growth opportunities without falling into FOMO.

---

### 🐻 Bear Agent — Risk Manager & Capital Preservation Officer

- **Role**: Protects your portfolio capital, uncovers hidden downside risks, and predicts losses when momentum deteriorates.
- **Jobs & Technical Indicators**:
  - Detects **RSI overbought traps** ($RSI > 70$), negative divergence, and false breakout rejections.
  - Identifies **Bollinger Band upper-band exhaustion** and heavy institutional selling volume.
  - Calculates **Loss Probability (%)** vs **Profit Probability (%)** and warns when a trade is projected to result in a loss.
  - Computes non-negotiable **Stop-Loss levels** to cap portfolio losses.
- **Roundtable & Q&A Persona**: Pragmatic, defensive, and risk-obsessed. Teaches trade sizing, hedging techniques, capital preservation, and identifying market distribution tops.

---

### 🦌 Stag Agent — Macro Valuation & Portfolio Allocator

- **Role**: Long-term asset allocator focused on fundamental valuation, margin of safety, and institutional consensus.
- **Jobs & Technical Indicators**:
  - Evaluates **Price-to-Earnings (P/E)**, **Price-to-Book (P/B)**, and institutional VWAP equilibrium.
  - Computes Kalman State-Space fair value across medium and long-term horizons (`6M`, `1Y`, `5Y`).
  - Analyzes market regime stationarity and long-term moving averages (**50-day & 200-day SMAs**).
  - Formulates fair-value target ranges and recommends portfolio sector rebalancing.
- **Roundtable & Q&A Persona**: Patient, disciplined, and value-oriented. Shares strategies on dollar-cost averaging (SIP), identifying undervalued moats, and filtering out market noise.

---

### 🐇 Rabbit Agent — HFT Order Flow & Execution Specialist

- **Role**: Microstructure scalper and precision order executioner.
- **Jobs & Technical Indicators**:
  - Scans **Level-2 order book depth** (top 5 bids and asks) to measure order imbalances.
  - Tracks **Volume-Weighted Average Price (VWAP)** deviations to detect intraday pullbacks.
  - Estimates bid-ask spread friction and slippage costs.
  - Determines the exact optimal limit entry price and profit/loss exit windows.
- **Roundtable & Q&A Persona**: Fast, agile, and execution-centric. Advises on avoiding market orders during volatile opening bells, timing intraday liquidity pockets, and reducing slippage.

---

## 🔐 Personal Account Authentication & Isolated Data

- **Landing Page First**: Every time Mindspace is launched, the interactive 3D Landing Page opens first.
- **Login & Registration Gate**: Clicking **"Try out Mindspace"** opens the authentication gate:
  - **Registration**: Username, Email, Password, and Remember Me option.
  - **Login**: Username, Password, and Remember Me option.
- **100% Per-User Isolation**: Each user's virtual wallet capital, bought stock positions, executed order ledger, selected stock, and agent discussions are isolated to their username.

---

## 💼 Live Trading Simulation & 6-Horizon Profit/Loss Engine

Experience the realism of live markets without financial risk:

- **Click & Switch Bought Stocks**: Click any bought stock in your portfolio or the Quick Switcher ribbon to immediately switch to it, inspect its chart, or sell shares.
- **1-Click & Partial Selling**: Use **Sell All** for instant execution at the live Bid price, or click **Sell** to load the position into the Order Pad.
- **6-Horizon 4-Agent Analysis (`1D`, `1W`, `1M`, `6M`, `1Y`, `5Y`)**:
  - Honest **PROFIT** or **LOSS** predictions based on momentum, technical alignment, and entry price.
  - Explicit **Probability of Profit (%)** and **Probability of Loss (%)** for every time horizon.
  - Side-by-side 4-Agent (`Bull`, `Bear`, `Stag`, `Rabbit`) breakdown for each of the 6 horizons.

---

## 💬 Agent Discussions & User Q&A Roundtable

Beyond analyzing individual stocks, Mindspace provides an interactive roundtable lounge:

- **Start / Stop Controls**: Easily trigger or pause agent discussions with the dedicated `▶ Start` / `⏸ Stop` controls.
- **3D Lounge Gathering**: When discussion mode begins, Bull, Bear, Stag, and Rabbit automatically walk over and gather around the office coffee table.
- **Interactive User Q&A Input**: Ask any financial question in the bottom text box and all 4 agents immediately answer from their respective perspectives.
- **Export Discussions to Word (.doc)**: Export your entire roundtable conversation and Q&A transcript into a neatly organized, tabular Word document with one click.

---

## 📄 Export to Professional Word (.doc) Reports

Generate institutional-quality Word documents with a single click:

1. **Stock Analysis Report (.doc)**:
   - Executive stock overview & exchange session status.
   - Complete **6-Horizon (`1D`, `1W`, `1M`, `6M`, `1Y`, `5Y`) Profit/Loss & Probability Matrix**.
   - Tabular 4-Agent (`Bull`, `Bear`, `Stag`, `Rabbit`) domain reports and consensus trade plan.
2. **Agent Discussions & Q&A Report (.doc)**:
   - Executive summary table of all roundtable topics and user questions.
   - Structured tabular transcript of every response from Bull, Bear, Stag, and Rabbit.

---

## 🛠️ Tech Stack

- **Frontend & 3D**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Three.js](https://threejs.org/), [@react-three/fiber](https://r3f.docs.pmnd.rs/), [Tailwind CSS](https://tailwindcss.com/)
- **Framework & SSR**: [TanStack Start](https://tanstack.com/start), [Nitro](https://nitro.unjs.io/)
- **AI & ML Engine**: OpenRouter API (free-tier optimized) + Open-Source Quantitative ML Ensemble (LightGBM GBDT + Kalman State-Space AR + Holt-Winters)
- **Testing**: [Vitest](https://vitest.dev/)

---

## 🚀 Local Development & Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/ashwintelangstark/mindspace.git
   cd mindspace
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Launch the development server**:
   ```bash
   npm run dev
   ```

---

## 🧪 Available Scripts

| Command          | Purpose                                                |
| :--------------- | :----------------------------------------------------- |
| `npm run dev`    | Starts local development server with hot-module reload |
| `npm run build`  | Compiles client and server production bundles          |
| `npm test`       | Runs the Vitest unit & integration test suite          |
| `npm run lint`   | Checks TypeScript and linting rules                    |
| `npm run format` | Formats all source files via oxfmt                     |
