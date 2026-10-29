import { StockPrediction } from "@/types/stock";

/**
 * Generates and downloads a cleanly formatted Microsoft Word (.doc) document
 * with tabular columns for the 4 AI agent analyses and a consensus conclusion.
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
    }
    .badge-bear {
      color: #bf2600;
      background-color: #ffebe6;
      font-weight: bold;
    }
    .badge-neutral {
      color: #172b4d;
      background-color: #fff0b3;
      font-weight: bold;
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
        <strong>Ensemble Model:</strong> ${ml.modelName}<br/>
        <strong>Validation Accuracy:</strong> ${prediction.accuracyRate}% Directional
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
      <th>Forecast Horizon</th>
      <td><strong>${horizon}</strong></td>
      <th>Planned Shares Quantity</th>
      <td><strong>${shares > 0 ? `${shares} shares (${stock.currency}${(shares * stock.price).toLocaleString()})` : "Not specified"}</strong></td>
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

  <!-- Section 2: Four AI Agent Topic Reports in Tabular Format -->
  <h2>2. 4 AI Agent Specialized Topic Reports</h2>
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

  <!-- Section 3: Consensus Verdict & Complete Trade Plan -->
  <div class="conclusion-card">
    <div class="conclusion-title">3. Consensus Trade Plan & Execution Strategy</div>
    <div>
      <span class="verdict-badge">VERDICT: ${prediction.consensusVerdict}</span>
      &nbsp;&nbsp;
      <span style="font-size: 10pt; color: #006644; font-weight: bold;">
        Directional Validation Accuracy: ${prediction.accuracyRate}% (Confidence: ${prediction.confidenceScore}%)
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
        <th>Profit Target Price</th>
        <td><strong style="color: #00875a;">${stock.currency}${prediction.targetPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} (+${prediction.targetGainPct}%)</strong></td>
        <th>Target Withdrawal Timing</th>
        <td><strong>${prediction.withdrawProfitDate}</strong></td>
      </tr>
      <tr>
        <th>Projected Net Profit</th>
        <td><strong style="color: #00875a;">${shares > 0 ? `+${stock.currency}${prediction.projectedProfitAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "Enter shares to calculate"}</strong></td>
        <th>Risk-to-Reward Ratio</th>
        <td><strong>1 : ${(Math.max(0.01, prediction.targetGainPct) / Math.max(0.01, prediction.stopLossLossPct)).toFixed(2)}</strong></td>
      </tr>
      <tr>
        <th>Automated Stop-Loss Guard</th>
        <td><strong style="color: #bf2600;">${stock.currency}${prediction.stopLossPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} (-${prediction.stopLossLossPct}%)</strong></td>
        <th>Stop-Loss Exit Condition</th>
        <td><strong>${prediction.withdrawCutLossDate}</strong></td>
      </tr>
      <tr>
        <th>Max Capped Downside Risk</th>
        <td><strong style="color: #bf2600;">${shares > 0 ? `-${stock.currency}${prediction.projectedLossAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "Enter shares to calculate"}</strong></td>
        <th>Fair Value Midpoint</th>
        <td><strong>${stock.currency}${prediction.forecastMidpoint.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></td>
      </tr>
    </table>

    <div style="margin-top: 10pt; font-size: 9.5pt; color: #172b4d; line-height: 1.45;">
      <strong>Strategic Synthesis:</strong><br/>
      ${prediction.rationale}
    </div>
  </div>

  <!-- Section 4: Quantitative Ensemble Architecture Details -->
  <h2>4. Quantitative ML Architecture & Validation Audit</h2>
  <table class="data-table">
    <tr>
      <th width="25%">Ensemble Stacking</th>
      <td>${ml.architecture}</td>
    </tr>
    <tr>
      <th>Data Sampling Split</th>
      <td>${ml.trainValTestSplit}</td>
    </tr>
    <tr>
      <th>Time-Series Stationarity</th>
      <td>${ml.stationarityCheck}</td>
    </tr>
    <tr>
      <th>Validation Error Metrics</th>
      <td>MAE: <strong>${stock.currency}${ml.validationMAE}</strong> &nbsp;|&nbsp; RMSE: <strong>${stock.currency}${ml.validationRMSE}</strong></td>
    </tr>
  </table>

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
