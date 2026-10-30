import { StockPrediction, TimeHorizon } from "@/types/stock";
import { DiscussionTurn } from "./agent-discussions";

const ALL_HORIZONS: TimeHorizon[] = ["1D", "1W", "1M", "6M", "1Y", "5Y"];

/**
 * Generates and downloads a cleanly formatted Microsoft Word (.doc) document
 * with tabular columns for the 4 AI agent analyses, all 6 horizons (1D, 1W, 1M, 6M, 1Y, 5Y),
 * Profit/Loss probabilities, and a consensus conclusion.
 */
export function exportPredictionToWordDoc(prediction: StockPrediction): void {
  const stock = prediction.stock;
  const horizon = prediction.horizon;
  const ml = prediction.mlReport;
  const ti = ml.technicalIndicators;
  const mkt = prediction.marketStatus;
  const shares = prediction.sharesQuantity || 0;
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const agentsList = Object.values(prediction.agentConsensus);

  const docHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>Mindspace Stock Market Intelligence Report - ${stock.symbol}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body {
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      margin: 36pt 42pt;
      color: #1a202c;
      background-color: #ffffff;
      line-height: 1.45;
    }
    .header-table {
      width: 100%;
      border-bottom: 3pt solid #00a86b;
      padding-bottom: 12pt;
      margin-bottom: 18pt;
    }
    .brand-title {
      font-size: 24pt;
      font-weight: 900;
      color: #00875a;
      letter-spacing: 2px;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 9pt;
      color: #5e6c84;
      font-weight: bold;
      letter-spacing: 1px;
      margin-top: 2pt;
    }
    .doc-meta {
      text-align: right;
      font-size: 9pt;
      color: #6b778c;
    }
    h2 {
      font-size: 14pt;
      color: #091e42;
      border-bottom: 1.5pt solid #00a86b;
      padding-bottom: 4pt;
      margin-top: 18pt;
      margin-bottom: 8pt;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8pt;
      margin-bottom: 14pt;
      font-size: 9.5pt;
    }
    table.data-table th, table.data-table td {
      border: 1pt solid #dfe1e6;
      padding: 7pt 9pt;
      text-align: left;
      vertical-align: top;
    }
    table.data-table th {
      background-color: #f4f5f7;
      font-weight: bold;
      color: #172b4d;
    }
    .badge-open {
      color: #006644;
      background-color: #e3fcef;
      padding: 2pt 6pt;
      border-radius: 3pt;
      font-weight: bold;
      font-size: 8.5pt;
    }
    .badge-closed {
      color: #bf2600;
      background-color: #ffebe6;
      padding: 2pt 6pt;
      border-radius: 3pt;
      font-weight: bold;
      font-size: 8.5pt;
    }
    .badge-bull {
      color: #006644;
      background-color: #e3fcef;
      font-weight: bold;
      padding: 2pt 5pt;
    }
    .badge-bear {
      color: #bf2600;
      background-color: #ffebe6;
      font-weight: bold;
      padding: 2pt 5pt;
    }
    .badge-neutral {
      color: #172b4d;
      background-color: #fff0b3;
      font-weight: bold;
      padding: 2pt 5pt;
    }
    .conclusion-card {
      border: 2pt solid #00a86b;
      background-color: #f4fbf7;
      border-radius: 6pt;
      padding: 14pt 16pt;
      margin-top: 18pt;
    }
    .conclusion-title {
      font-size: 13pt;
      font-weight: bold;
      color: #006644;
      margin-top: 0;
      margin-bottom: 6pt;
    }
    .verdict-badge {
      font-size: 14pt;
      font-weight: 900;
      color: #006644;
      background-color: #d3f9e5;
      padding: 3pt 10pt;
      border-radius: 4pt;
      display: inline-block;
      margin-bottom: 8pt;
    }
    .footer {
      margin-top: 24pt;
      border-top: 1pt solid #ebecf0;
      padding-top: 8pt;
      font-size: 8pt;
      color: #7a869a;
      text-align: center;
    }
  </style>
</head>
<body>

  <!-- Top Header Table -->
  <table class="header-table" cellpadding="0" cellspacing="0">
    <tr>
      <td>
        <h1 class="brand-title">MINDSPACE</h1>
        <div class="brand-subtitle">AI-POWERED QUANTITATIVE STOCK MARKET INTELLIGENCE</div>
      </td>
      <td class="doc-meta">
        <strong>Report Date:</strong> ${dateStr} at ${timeStr}<br/>
        <strong>Ensemble Engine:</strong> Pretrained Multi-Agent Quant Model<br/>
        <strong>Execution Consensus:</strong> Timeline-Locked Fixed Valuation
      </td>
    </tr>
  </table>

  <!-- Section 1: Executive Asset & Market Overview -->
  <h2>1. Stock Overview & Exchange Session Status</h2>
  <table class="data-table">
    <tr>
      <th width="20%">Company / Asset</th>
      <td width="30%"><strong>${stock.name}</strong> (${stock.symbol})</td>
      <th width="20%">Exchange / Market</th>
      <td width="30%">${stock.market} ${stock.sector ? `· ${stock.sector}` : ""}</td>
    </tr>
    <tr>
      <th>Price / Settlement</th>
      <td><strong>${stock.currency}${stock.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></td>
      <th>24h Change</th>
      <td><strong>${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)}%</strong></td>
    </tr>
    <tr>
      <th>Market Session Status</th>
      <td>
        <span class="${mkt?.isOpen ? "badge-open" : "badge-closed"}">
          ${mkt?.badge || (stock.change >= 0 ? "🟢 Live" : "🔴 Closed")}
        </span>
        <div style="font-size: 8.5pt; color: #5e6c84; margin-top: 2pt;">
          ${mkt?.sessionMessage || "Evaluated on official exchange prices"}
        </div>
      </td>
      <th>Bid × Ask (Spread)</th>
      <td>${stock.currency}${stock.bid.toFixed(2)} × ${stock.currency}${stock.ask.toFixed(2)} (${stock.currency}${stock.spread.toFixed(2)})</td>
    </tr>
    <tr>
      <th>Selected Horizon</th>
      <td><strong>${horizon} (${prediction.isProfitPredicted ? "🟢 PROFIT PREDICTED" : "🔴 LOSS PREDICTED"})</strong></td>
      <th>Profit / Loss Probability</th>
      <td>
        <strong style="color: #00875a;">Profit: ${prediction.profitProbability}%</strong> &nbsp;|&nbsp;
        <strong style="color: #bf2600;">Loss: ${prediction.lossProbability}%</strong>
      </td>
    </tr>
    <tr>
      <th>Planned Shares Quantity</th>
      <td colspan="3"><strong>${shares > 0 ? `${shares} shares (${stock.currency}${(shares * stock.price).toLocaleString()})` : "Not specified"}</strong></td>
    </tr>
    <tr>
      <th>Key Technicals</th>
      <td colspan="3">
        RSI-14: <strong>${ti.rsi14}</strong> &nbsp;|&nbsp;
        VWAP: <strong>${stock.currency}${ti.vwap}</strong> &nbsp;|&nbsp;
        EMA-20: <strong>${stock.currency}${ti.ema20}</strong> &nbsp;|&nbsp;
        EMA-50: <strong>${stock.currency}${ti.ema50}</strong> &nbsp;|&nbsp;
        ATR-14: <strong>${stock.currency}${ti.atr14}</strong> &nbsp;|&nbsp;
        Bollinger: <strong>${stock.currency}${ti.bollingerLower} – ${stock.currency}${ti.bollingerUpper}</strong>
      </td>
    </tr>
  </table>

  <!-- Section 2: 6-Horizon Profit / Loss & Probability Matrix (1D, 1W, 1M, 6M, 1Y, 5Y) -->
  <h2>2. 6-Horizon Forecast & Timeline Valuation Matrix (1D · 1W · 1M · 6M · 1Y · 5Y)</h2>
  <p style="font-size: 9pt; color: #5e6c84; margin-top: 0;">
    Buying Date: <strong>${prediction.buyingDate || dateStr}</strong> · Fixed projected rate consensus across exact target timeline dates:
  </p>
  <table class="data-table">
    <thead>
      <tr>
        <th>Horizon</th>
        <th>Target Timeline Date</th>
        <th>Predicted Outcome</th>
        <th>1 Fixed Projected Value</th>
        <th>Expected Return</th>
        <th>Profit Probability</th>
        <th>Loss Probability</th>
        <th>4-Agent Verdict</th>
      </tr>
    </thead>
    <tbody>
      ${ALL_HORIZONS.map((h) => {
        const hf = prediction.horizonForecasts[h];
        if (!hf) return "";
        const fixedVal = hf.fixedRate ?? hf.price;
        return `
        <tr>
          <td><strong>${h}</strong></td>
          <td>
            <strong>${hf.targetDateLabel || h}</strong><br/>
            <span style="font-size: 8pt; color: #5e6c84;">${hf.targetDate || ""}</span>
          </td>
          <td>
            <span class="${hf.isProfitPredicted ? "badge-bull" : "badge-bear"}">
              ${hf.isProfitPredicted ? "PROFIT" : "LOSS"}
            </span>
          </td>
          <td><strong style="color: #006644; font-size: 10pt;">${stock.currency}${fixedVal.toFixed(2)}</strong></td>
          <td style="color: ${hf.changePct >= 0 ? "#00875a" : "#bf2600"}; font-weight: bold;">
            ${hf.changePct >= 0 ? "+" : ""}${hf.changePct.toFixed(2)}%
          </td>
          <td style="color: #00875a; font-weight: bold;">${hf.profitProbability}%</td>
          <td style="color: #bf2600; font-weight: bold;">${hf.lossProbability}%</td>
          <td><strong>${hf.verdict}</strong></td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>

  <!-- Section 3: Four AI Agent Topic Reports in Tabular Format -->
  <h2>3. 4 AI Agent Specialized Topic Reports (${horizon})</h2>
  <p style="font-size: 9pt; color: #5e6c84; margin-top: 0;">
    Each autonomous AI agent evaluates an isolated domain of quantitative market microstructure to establish a non-correlated consensus:
  </p>

  <table class="data-table">
    <thead>
      <tr>
        <th width="14%">Agent & Role</th>
        <th width="24%">Assigned Domain Topic</th>
        <th width="10%">Stance</th>
        <th width="14%">Target / SL</th>
        <th width="24%">Key Findings & Analysis</th>
        <th width="14%">Action Recommendation</th>
      </tr>
    </thead>
    <tbody>
      ${agentsList
        .map(
          (agent) => `
      <tr>
        <td>
          <strong>${agent.avatar} ${agent.agentName}</strong><br/>
          <span style="font-size: 8pt; color: #5e6c84;">${agent.roleDescription}</span><br/>
          <span style="font-size: 7.5pt; color: #00875a; font-weight: bold;">Conf: ${agent.confidencePct}%</span>
        </td>
        <td>
          <strong>${agent.focusTopic}</strong>
          ${
            agent.keyMetrics && agent.keyMetrics.length > 0
              ? `<div style="margin-top: 4pt; font-size: 8pt; color: #344563;">
                ${agent.keyMetrics.map((km) => `• ${km.label}: <strong>${km.value}</strong>`).join("<br/>")}
              </div>`
              : ""
          }
        </td>
        <td style="text-align: center;">
          <span class="${
            agent.stance === "Bullish"
              ? "badge-bull"
              : agent.stance === "Bearish"
                ? "badge-bear"
                : "badge-neutral"
          }">
            ${agent.stance}
          </span>
        </td>
        <td>
          Target: <strong>${stock.currency}${agent.targetPrice.toFixed(2)}</strong><br/>
          Stop-Loss: <strong style="color: #bf2600;">${stock.currency}${agent.stopLossPrice.toFixed(2)}</strong>
        </td>
        <td style="font-size: 9pt; line-height: 1.35;">
          ${agent.commentary}
        </td>
        <td style="font-size: 8.5pt; color: #006644; font-weight: bold;">
          ${agent.actionRecommendation}
        </td>
      </tr>
      `,
        )
        .join("")}
    </tbody>
  </table>

  <!-- Section 4: Consensus Verdict & Complete Trade Plan -->
  <div class="conclusion-card">
    <div class="conclusion-title">4. Consensus Trade Plan & Execution Strategy</div>
    <div>
      <span class="verdict-badge">VERDICT: ${prediction.consensusVerdict}</span>
      &nbsp;&nbsp;
      <span style="font-size: 10pt; color: #006644; font-weight: bold;">
        Profit Probability: ${prediction.profitProbability}% | Loss Probability: ${prediction.lossProbability}% | Model: Pretrained Multi-Agent Consensus
      </span>
    </div>

    <table class="data-table" style="background-color: #ffffff; margin-top: 10pt;">
      <tr>
        <th width="25%">Planned Shares</th>
        <td width="25%"><strong>${shares > 0 ? `${shares} shares` : "Not specified"}</strong></td>
        <th width="25%">Capital Required</th>
        <td width="25%"><strong>${shares > 0 ? `${stock.currency}${(shares * stock.price).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "Enter shares to calculate"}</strong></td>
      </tr>
      <tr>
        <th>Predicted Price (${horizon})</th>
        <td><strong style="color: ${prediction.isProfitPredicted ? "#00875a" : "#bf2600"};">${stock.currency}${prediction.targetPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${prediction.targetGainPct >= 0 ? "+" : ""}${prediction.targetGainPct}%)</strong></td>
        <th>Target Timing Window</th>
        <td><strong>${prediction.withdrawProfitDate}</strong></td>
      </tr>
      <tr>
        <th>Projected Profit / Loss</th>
        <td><strong style="color: ${prediction.isProfitPredicted ? "#00875a" : "#bf2600"};">${shares > 0 ? `${prediction.expectedPLAmount >= 0 ? "+" : "-"}${stock.currency}${Math.abs(prediction.expectedPLAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "Enter shares to calculate"}</strong></td>
        <th>Automated Stop-Loss Guard</th>
        <td><strong style="color: #bf2600;">${stock.currency}${prediction.stopLossPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} (-${prediction.stopLossLossPct}%)</strong></td>
      </tr>
    </table>

    <div style="margin-top: 10pt; font-size: 9.5pt; color: #172b4d; line-height: 1.45;">
      <strong>Strategic Synthesis:</strong><br/>
      ${prediction.rationale}
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    Generated autonomously by Mindspace 3D AI Stock Market Intelligence System.<br/>
    This document is for educational and quantitative paper-trading simulation purposes.
  </div>

</body>
</html>
`;

  const blob = new Blob(["\ufeff", docHtml], {
    type: "application/msword",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const cleanSym = stock.symbol.replace(/[^a-zA-Z0-9_-]/g, "");
  const fileDate = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `Mindspace_Analysis_${cleanSym}_${horizon}_${fileDate}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exports the user's Agent Discussions & Q&A Roundtable sessions into a neatly
 * organized Microsoft Word (.doc) document with structured tables.
 */
export function exportDiscussionsToWordDoc(turns: DiscussionTurn[], username?: string): void {
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalMessages = turns.reduce((sum, t) => sum + t.messages.length, 0);

  const docHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>Mindspace 4-Agent Roundtable & Q&A Discussions Report</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body {
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      margin: 36pt 42pt;
      color: #1a202c;
      background-color: #ffffff;
      line-height: 1.45;
    }
    .header-table {
      width: 100%;
      border-bottom: 3pt solid #00a86b;
      padding-bottom: 12pt;
      margin-bottom: 18pt;
    }
    .brand-title {
      font-size: 24pt;
      font-weight: 900;
      color: #00875a;
      letter-spacing: 2px;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 9pt;
      color: #5e6c84;
      font-weight: bold;
      letter-spacing: 1px;
      margin-top: 2pt;
    }
    .doc-meta {
      text-align: right;
      font-size: 9pt;
      color: #6b778c;
    }
    h2 {
      font-size: 13.5pt;
      color: #091e42;
      border-bottom: 1.5pt solid #00a86b;
      padding-bottom: 4pt;
      margin-top: 18pt;
      margin-bottom: 8pt;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8pt;
      margin-bottom: 16pt;
      font-size: 9.5pt;
    }
    table.data-table th, table.data-table td {
      border: 1pt solid #dfe1e6;
      padding: 7pt 9pt;
      text-align: left;
      vertical-align: top;
    }
    table.data-table th {
      background-color: #f4f5f7;
      font-weight: bold;
      color: #172b4d;
    }
    .role-bull { color: #006644; font-weight: bold; }
    .role-bear { color: #bf2600; font-weight: bold; }
    .role-stag { color: #0052cc; font-weight: bold; }
    .role-rabbit { color: #b35c00; font-weight: bold; }
    .role-assistant { color: #00875a; font-weight: bold; }
    .role-user { color: #5243aa; font-weight: bold; }
    .footer {
      margin-top: 24pt;
      border-top: 1pt solid #ebecf0;
      padding-top: 8pt;
      font-size: 8pt;
      color: #7a869a;
      text-align: center;
    }
  </style>
</head>
<body>

  <table class="header-table" cellpadding="0" cellspacing="0">
    <tr>
      <td>
        <h1 class="brand-title">MINDSPACE</h1>
        <div class="brand-subtitle">4-AGENT STRATEGY ROUNDTABLE & USER Q&A TRANSCRIPT</div>
      </td>
      <td class="doc-meta">
        <strong>Exported On:</strong> ${dateStr} at ${timeStr}<br/>
        <strong>Workspace User:</strong> ${username ? `@${username}` : "Mindspace Trader"}<br/>
        <strong>Total Topics / Responses:</strong> ${turns.length} Sessions (${totalMessages} Messages)
      </td>
    </tr>
  </table>

  <h2>1. Executive Overview of Discussed Topics & Questions</h2>
  <table class="data-table">
    <thead>
      <tr>
        <th width="8%">#</th>
        <th width="18%">Session Type</th>
        <th width="56%">Topic / User Question</th>
        <th width="18%">Timestamp</th>
      </tr>
    </thead>
    <tbody>
      ${turns
        .map(
          (t, idx) => `
      <tr>
        <td><strong>${idx + 1}</strong></td>
        <td><strong>${t.userQuestion ? "❓ User Q&A" : "💡 Agent Roundtable"}</strong></td>
        <td>${t.topic}</td>
        <td>${t.timestamp}</td>
      </tr>`,
        )
        .join("")}
    </tbody>
  </table>

  ${turns
    .map(
      (turn, idx) => `
  <h2>${idx + 2}. ${turn.userQuestion ? `User Q&A Session: "${turn.topic}"` : `Roundtable Topic: ${turn.topic}`}</h2>
  <table class="data-table">
    <thead>
      <tr>
        <th width="18%">Participant / Agent</th>
        <th width="22%">Domain Specialty</th>
        <th width="48%">Detailed Insights & Actionable Advice</th>
        <th width="12%">Time</th>
      </tr>
    </thead>
    <tbody>
      ${turn.messages
        .map((m) => {
          const cls =
            m.sender === "bull"
              ? "role-bull"
              : m.sender === "bear"
                ? "role-bear"
                : m.sender === "stag"
                  ? "role-stag"
                  : m.sender === "rabbit"
                    ? "role-rabbit"
                    : m.sender === "assistant"
                      ? "role-assistant"
                      : "role-user";
          return `
      <tr>
        <td class="${cls}">${m.avatar} ${m.name}</td>
        <td><strong>${m.roleTitle || (m.sender === "user" ? "Investor Question" : m.sender === "assistant" ? "Mindspace AI Chatbot" : "AI Specialist")}</strong></td>
        <td style="line-height: 1.4;">${m.message}</td>
        <td>${m.timestamp}</td>
      </tr>`;
        })
        .join("")}
    </tbody>
  </table>
  `,
    )
    .join("")}

  <div class="footer">
    Generated by Mindspace 3D AI Stock Market Intelligence — 4-Agent Roundtable (Bull, Bear, Stag & Rabbit).<br/>
    Organized for personal investment study and strategy review.
  </div>

</body>
</html>
`;

  const blob = new Blob(["\ufeff", docHtml], {
    type: "application/msword",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const fileDate = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `Mindspace_Agent_Discussions_${fileDate}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
