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
- [AI Market Chatbot & 4-Agent Strategy Roundtable](#-ai-market-chatbot--4-agent-strategy-roundtable)
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

## 💬 AI Market Chatbot & 4-Agent Strategy Roundtable

Mindspace features a dual-mode discussion intelligence system accessible right from the side drawer:

### 1. 🤖 AI Market Chatbot (Free Unlimited Model & Live Web Grounding)

- **Unlimited Free OpenRouter Models**: Powered by `openrouter/free` (high-speed auto-router across free pools with zero rate limits), with selectable options including **Google Gemma 4 31B**, **NVIDIA Nemotron 3.5**, **Cohere North Mini**, and **Recursive Flint v1.0**.
- **Live Web & Real-Time Market Grounding**: Dynamically queries live stock quotes, 24-hour price changes, intraday highs/lows, VWAP, 20-EMA, and RSI from the web feed, enabling the chatbot to give up-to-the-minute answers.
- **Exact Profit & Loss (P&L) Calculator**: Ask about any position sizing (e.g. _"Calculate P&L for 50 shares of Reliance"_) and the chatbot automatically computes:
  - Capital deployed ($Shares \times Price$)
  - Upside target price and potential gross profit in amount & %
  - Technical stop-loss price and maximum loss at risk in amount & %
  - Asymmetric Risk-to-Reward Ratio (RRR)
- **Comprehensive Doubt Clearing**: Clear any doubts on trading mechanics, technical indicators, short selling, risk management, or macro market shifts.
- **4-Agent Multi-Perspective Synthesis**: Every response synthesizes actionable viewpoints from Bull (momentum), Bear (defense), Stag (valuation), and Rabbit (VWAP / execution).

### 2. 👥 4-Agent Strategy Roundtable

- **Start / Stop Controls**: Easily trigger or pause agent discussions with dedicated `▶ Start` / `⏸ Stop` buttons.
- **3D Lounge Gathering**: When roundtable mode begins, Bull, Bear, Stag, and Rabbit automatically walk over and gather around the office coffee table in the 3D scene.
- **Interactive User Q&A**: Ask any financial question and all 4 agents immediately answer with their distinct individual personas.
- **Export Discussions to Word (.doc)**: Export all chatbot analyses, P&L tables, and roundtable transcripts into a neatly formatted Word document with one click.

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
