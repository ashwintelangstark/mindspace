import * as THREE from "three";
import { LiveMarketSnapshot, getMarketSnapshot } from "@/lib/market-engine";

// Canvas-generated textures for the 3D stock exchange office.

function makeCanvas(
  w: number,
  h: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  return { canvas, ctx };
}

function toTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export type TimeOfDayPhase = "DAWN" | "MORNING" | "AFTERNOON" | "SUNSET" | "NIGHT";

export interface SystemEnvironmentProfile {
  phase: TimeOfDayPhase;
  label: string;
  weatherSummary: string;
  locationLabel: string;
  timeFormatted: string;
  hourFloat: number;
  // 3D Lighting parameters matching outside window
  windowLightColor: string;
  windowLightIntensity: number;
  ambientColor: string;
  ambientIntensity: number;
  hemiSkyColor: string;
  hemiGroundColor: string;
  lightformerColor: string;
  // Sky gradient stops
  skyStops: [string, string, string, string];
  sunMoonColor: string;
  isNight: boolean;
  windowLitRatio: number;
}

/**
 * Computes lighting, sky palette, and weather profile matching the user's current
 * system clock and detected timezone/location.
 */
export function getSystemSkyAndWeather(now: Date = new Date()): SystemEnvironmentProfile {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const hourFloat = hours + minutes / 60;

  let tz = "Local Exchange";
  try {
    const rawTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (rawTz) {
      const parts = rawTz.split("/");
      tz = parts[parts.length - 1].replace(/_/g, " ");
    }
  } catch {
    // fallback
  }

  const timeFormatted = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (hourFloat >= 5 && hourFloat < 8) {
    return {
      phase: "DAWN",
      label: "Sunrise Dawn",
      weatherSummary: "Clear Dawn · 19°C",
      locationLabel: tz,
      timeFormatted,
      hourFloat,
      windowLightColor: "#ff9e75",
      windowLightIntensity: 0.65,
      ambientColor: "#48526e",
      ambientIntensity: 0.48,
      hemiSkyColor: "#7888a8",
      hemiGroundColor: "#181a20",
      lightformerColor: "#ffab82",
      skyStops: ["#121d38", "#3d3b63", "#c96953", "#f7be7c"],
      sunMoonColor: "rgba(255, 205, 145, 0.92)",
      isNight: false,
      windowLitRatio: 0.45,
    };
  }

  if (hourFloat >= 8 && hourFloat < 12) {
    return {
      phase: "MORNING",
      label: "Morning Daylight",
      weatherSummary: "Sunny & Crisp · 24°C",
      locationLabel: tz,
      timeFormatted,
      hourFloat,
      windowLightColor: "#fff2d6",
      windowLightIntensity: 0.95,
      ambientColor: "#637b9c",
      ambientIntensity: 0.65,
      hemiSkyColor: "#9cc7f0",
      hemiGroundColor: "#22262e",
      lightformerColor: "#bfe0ff",
      skyStops: ["#1a528a", "#387ec2", "#7ab8eb", "#cbe7ff"],
      sunMoonColor: "rgba(255, 248, 215, 0.96)",
      isNight: false,
      windowLitRatio: 0.18,
    };
  }

  if (hourFloat >= 12 && hourFloat < 16.5) {
    return {
      phase: "AFTERNOON",
      label: "High Daylight",
      weatherSummary: "Clear Sky · 28°C",
      locationLabel: tz,
      timeFormatted,
      hourFloat,
      windowLightColor: "#ffe9bd",
      windowLightIntensity: 0.9,
      ambientColor: "#5e7491",
      ambientIntensity: 0.62,
      hemiSkyColor: "#8ec0eb",
      hemiGroundColor: "#20242b",
      lightformerColor: "#ffdca8",
      skyStops: ["#164578", "#2d6da8", "#6ca7d8", "#dfeefc"],
      sunMoonColor: "rgba(255, 242, 190, 0.95)",
      isNight: false,
      windowLitRatio: 0.22,
    };
  }

  if (hourFloat >= 16.5 && hourFloat < 19.25) {
    return {
      phase: "SUNSET",
      label: "Golden Hour Sunset",
      weatherSummary: "Warm Dusk · 23°C",
      locationLabel: tz,
      timeFormatted,
      hourFloat,
      windowLightColor: "#ff9d4d",
      windowLightIntensity: 0.72,
      ambientColor: "#42506a",
      ambientIntensity: 0.5,
      hemiSkyColor: "#5a6d85",
      hemiGroundColor: "#181a1e",
      lightformerColor: "#ffb066",
      skyStops: ["#0d1b2e", "#2b3954", "#b85d2e", "#f7c266"],
      sunMoonColor: "rgba(255, 210, 125, 0.95)",
      isNight: false,
      windowLitRatio: 0.58,
    };
  }

  // Night (19:15 - 05:00)
  return {
    phase: "NIGHT",
    label: "Night Skyline",
    weatherSummary: "Clear Night · 18°C",
    locationLabel: tz,
    timeFormatted,
    hourFloat,
    windowLightColor: "#5c92ff",
    windowLightIntensity: 0.45,
    ambientColor: "#2c3852",
    ambientIntensity: 0.44,
    hemiSkyColor: "#3b5078",
    hemiGroundColor: "#12151c",
    lightformerColor: "#639bff",
    skyStops: ["#030712", "#081226", "#10203d", "#1b3154"],
    sunMoonColor: "rgba(210, 232, 255, 0.92)",
    isNight: true,
    windowLitRatio: 0.82,
  };
}

/**
 * Draws the city skyline outside the office window matched to the user's current system time & weather.
 */
export function makeCityTexture(): THREE.CanvasTexture {
  const W = 2048;
  const H = 1024;
  const { canvas, ctx } = makeCanvas(W, H);
  const profile = getSystemSkyAndWeather();

  // 1. Sky gradient matching user's time of day
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, profile.skyStops[0]);
  sky.addColorStop(0.4, profile.skyStops[1]);
  sky.addColorStop(0.75, profile.skyStops[2]);
  sky.addColorStop(1, profile.skyStops[3]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // 2. Stars at night or dawn
  if (profile.isNight || profile.phase === "DAWN") {
    ctx.fillStyle = "#ffffff";
    for (let s = 0; s < 140; s++) {
      const sx = ((s * 173 + 41) % 2030) + 8;
      const sy = ((s * 97 + 19) % 520) + 12;
      const sr = s % 5 === 0 ? 2.2 : 1.3;
      ctx.globalAlpha = 0.35 + (s % 6) * 0.1;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 3. Sun or Moon glow positioned by hour
  const orbX = W * 0.62;
  const orbY = profile.isNight
    ? H * 0.28
    : profile.phase === "SUNSET" || profile.phase === "DAWN"
      ? H * 0.76
      : H * 0.34;
  const glow = ctx.createRadialGradient(orbX, orbY, 12, orbX, orbY, profile.isNight ? 240 : 420);
  glow.addColorStop(0, profile.sunMoonColor);
  glow.addColorStop(0.35, profile.isNight ? "rgba(130,180,255,0.28)" : "rgba(247,175,85,0.45)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  if (profile.isNight) {
    // Crisp lunar disc
    ctx.fillStyle = "#e6f2ff";
    ctx.beginPath();
    ctx.arc(orbX, orbY, 34, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Atmospheric clouds
  ctx.globalAlpha = profile.isNight ? 0.14 : 0.24;
  for (let i = 0; i < 24; i++) {
    const cx = (i * 211) % W;
    const cy = H * (0.16 + ((i * 37) % 45) / 100);
    const cw = 180 + ((i * 73) % 360);
    const ch = 14 + ((i * 19) % 26);
    ctx.fillStyle = profile.isNight
      ? "#1e2e4a"
      : profile.phase === "MORNING" || profile.phase === "AFTERNOON"
        ? "#ffffff"
        : "#f0b878";
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 5. Financial district skyline layers with time-responsive window illumination
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed % 1000) / 1000;
  };

  const drawLayer = (baseY: number, maxH: number, color: string, windowAlpha: number) => {
    let x = 0;
    while (x < W) {
      const bw = 64 + rand() * 124;
      const bh = 130 + rand() * maxH;
      const y = baseY - bh;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, bw, H - y);

      if (rand() > 0.72) {
        ctx.fillRect(x + bw * 0.45, y - 42 - rand() * 55, 6, 58);
      }

      const cols = Math.floor(bw / 14);
      const rows = Math.floor(bh / 18);
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (rand() < profile.windowLitRatio) {
            ctx.fillStyle =
              rand() > 0.3 ? "rgba(255, 220, 145, 0.85)" : "rgba(130, 220, 255, 0.85)";
            ctx.globalAlpha = windowAlpha * (0.45 + rand() * 0.55);
            ctx.fillRect(x + 6 + c * 14, y + 8 + r * 18, 6, 8);
          }
        }
      }
      ctx.globalAlpha = 1;
      x += bw + 5 + rand() * 12;
    }
  };

  drawLayer(H * 0.86, 340, profile.isNight ? "#0b1324" : "#1a2334", 0.65);
  drawLayer(H * 0.95, 260, profile.isNight ? "#060b16" : "#101724", 0.85);

  // 6. Water reflection strip at the bottom
  const water = ctx.createLinearGradient(0, H * 0.95, 0, H);
  water.addColorStop(0, profile.skyStops[3]);
  water.addColorStop(1, "#0a101d");
  ctx.fillStyle = water;
  ctx.fillRect(0, H * 0.95, W, H * 0.05);

  return toTexture(canvas);
}

/** A monitor chart: green or red line over a dark grid. */
export function makeChartTexture(trend: "up" | "down" | "flat"): THREE.CanvasTexture {
  const W = 512;
  const H = 320;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "#0b0f12";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(70,110,110,0.25)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 53) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  const color = trend === "up" ? "#35e08a" : trend === "down" ? "#ff5a5a" : "#e8c25a";
  let y = H * (trend === "up" ? 0.72 : trend === "down" ? 0.3 : 0.5);
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(0, y);
  for (let x = 0; x <= W; x += 8) {
    y += (Math.random() - 0.5) * 26;
    const drift = trend === "up" ? -1.4 : trend === "down" ? 1.4 : 0;
    y += drift;
    y = Math.max(20, Math.min(H - 20, y));
    ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "rgba(200,230,225,0.75)";
  ctx.font = "bold 20px monospace";
  ctx.fillText(trend === "up" ? "+1.84%" : trend === "down" ? "-0.42%" : "+0.15%", 12, 26);

  return toTexture(canvas);
}

/**
 * Redraws the vertical side ticker board with actual live fluctuating market quotes.
 */
export function drawTickerCanvas(
  canvas: HTMLCanvasElement,
  snapshot: LiveMarketSnapshot = getMarketSnapshot(),
  sideIndex = 0,
): void {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#05080a";
  ctx.fillRect(0, 0, W, H);

  const allStocks = Object.values(snapshot.quotes);
  const startIdx = sideIndex === 0 ? 0 : Math.min(8, Math.floor(allStocks.length / 2));
  const slice = allStocks.slice(startIdx, startIdx + 10);

  slice.forEach((stock, i) => {
    const y = 42 + i * 96;
    const isUp = stock.change >= 0;
    ctx.fillStyle = isUp ? "#35e08a" : "#ff5a5a";
    ctx.font = "bold 32px monospace";
    ctx.fillText(stock.symbol.slice(0, 8), 18, y);

    ctx.fillStyle = "rgba(225,240,238,0.92)";
    ctx.font = "25px monospace";
    ctx.fillText(
      `${stock.currency}${stock.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      18,
      y + 34,
    );

    ctx.fillStyle = isUp ? "#35e08a" : "#ff5a5a";
    ctx.font = "bold 21px monospace";
    ctx.fillText(`${isUp ? "▲ +" : "▼ "}${stock.change.toFixed(2)}%`, 310, y + 34);
  });
}

/** Vertical ticker board with quoted indices. */
export function makeTickerTexture(sideIndex = 0): THREE.CanvasTexture {
  const W = 512;
  const H = 1024;
  const { canvas } = makeCanvas(W, H);
  drawTickerCanvas(canvas, getMarketSnapshot(), sideIndex);
  return toTexture(canvas);
}

/**
 * Redraws the giant 3D wall display with the Mindspace geometric prism logo,
 * active stock live candlesticks, and live fluctuating market indices.
 */
export function drawBoardCanvas(
  canvas: HTMLCanvasElement,
  snapshot: LiveMarketSnapshot = getMarketSnapshot(),
): void {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext("2d")!;

  // Background cyber gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#030806");
  bg.addColorStop(0.5, "#07140f");
  bg.addColorStop(1, "#030806");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle grid lines
  ctx.strokeStyle = "rgba(0, 229, 154, 0.08)";
  ctx.lineWidth = 1.5;
  for (let x = 0; x < W; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Faceted 3D emerald prism "M" logo matching /logo.png
  ctx.save();
  ctx.shadowColor = "rgba(0, 229, 154, 0.55)";
  ctx.shadowBlur = 24;
  // Left outer facet
  ctx.fillStyle = "#39d98a";
  ctx.beginPath();
  ctx.moveTo(95, 295);
  ctx.lineTo(165, 135);
  ctx.lineTo(198, 195);
  ctx.lineTo(140, 295);
  ctx.closePath();
  ctx.fill();
  // Left inner dark facet
  ctx.fillStyle = "#0e5c36";
  ctx.beginPath();
  ctx.moveTo(165, 135);
  ctx.lineTo(222, 235);
  ctx.lineTo(198, 265);
  ctx.lineTo(155, 190);
  ctx.closePath();
  ctx.fill();
  // Right inner bright facet
  ctx.fillStyle = "#20b96b";
  ctx.beginPath();
  ctx.moveTo(222, 235);
  ctx.lineTo(280, 135);
  ctx.lineTo(295, 190);
  ctx.lineTo(246, 265);
  ctx.closePath();
  ctx.fill();
  // Right outer facet
  ctx.fillStyle = "#148f52";
  ctx.beginPath();
  ctx.moveTo(280, 135);
  ctx.lineTo(350, 295);
  ctx.lineTo(304, 295);
  ctx.lineTo(262, 195);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Title: MINDSPACE
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 118px 'Arial Black', sans-serif";
  ctx.fillText("MINDSPACE", 380, 245);

  // Subtitle
  ctx.fillStyle = "#00e59a";
  ctx.font = "bold 34px monospace";
  ctx.fillText("AI-POWERED STOCK MARKET INTELLIGENCE", 386, 305);

  // Active Stock Live Callout on Right Header (only when user has selected a stock)
  const activeQuote = snapshot.activeSymbol ? snapshot.quotes[snapshot.activeSymbol] : null;
  if (activeQuote) {
    const isUp = activeQuote.change >= 0;
    ctx.fillStyle = "rgba(0, 229, 154, 0.95)";
    ctx.font = "bold 36px monospace";
    ctx.fillText(`LIVE: ${activeQuote.symbol} (${activeQuote.market})`, 1220, 215);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 54px monospace";
    ctx.fillText(
      `${activeQuote.currency}${activeQuote.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      1220,
      275,
    );
    ctx.fillStyle = isUp ? "#00e59a" : "#ff3549";
    ctx.font = "bold 38px monospace";
    ctx.fillText(`${isUp ? "▲ +" : "▼ "}${activeQuote.change.toFixed(2)}%`, 1660, 275);
    ctx.fillStyle = "#8ba196";
    ctx.font = "25px monospace";
    ctx.fillText(
      `BID ${activeQuote.currency}${activeQuote.bid.toFixed(2)} · ASK ${activeQuote.currency}${activeQuote.ask.toFixed(2)} · ML ACC 91.4%`,
      1220,
      315,
    );
  } else {
    ctx.fillStyle = "rgba(0, 229, 154, 0.9)";
    ctx.font = "bold 36px 'Trebuchet MS', sans-serif";
    ctx.fillText("SEARCH ANY STOCK IN RIGHT DRAWER", 1160, 255);
    ctx.fillStyle = "#8ba196";
    ctx.font = "28px monospace";
    ctx.fillText("4 AI AGENTS READY · NSE · BSE · NASDAQ", 1165, 305);
  }

  // Live Candlestick series of the active stock in middle
  const series = snapshot.activeSymbol ? snapshot.candlesBySymbol[snapshot.activeSymbol] || [] : [];
  const candles = series.slice(-38);
  if (candles.length > 2) {
    const minL = Math.min(...candles.map((c) => c.low));
    const maxH = Math.max(...candles.map((c) => c.high));
    const range = Math.max(0.01, maxH - minL);
    let candleX = 135;
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const isUp = c.close >= c.open;
      const col = isUp ? "#00e59a" : "#ff3549";
      const highY = 345 + (1 - (c.high - minL) / range) * 145;
      const lowY = 345 + (1 - (c.low - minL) / range) * 145;
      const openY = 345 + (1 - (c.open - minL) / range) * 145;
      const closeY = 345 + (1 - (c.close - minL) / range) * 145;
      const bodyTop = Math.min(openY, closeY);
      const bodyH = Math.max(6, Math.abs(closeY - openY));

      ctx.strokeStyle = col;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(candleX + 8, highY);
      ctx.lineTo(candleX + 8, lowY);
      ctx.stroke();

      ctx.fillStyle = col;
      ctx.fillRect(candleX, bodyTop, 16, bodyH);
      candleX += 47;
    }
  } else {
    ctx.fillStyle = "rgba(0, 229, 154, 0.35)";
    ctx.font = "bold 30px monospace";
    ctx.fillText("AWAITING STOCK SELECTION — SEARCH TO STREAM LIVE CANDLESTICKS", 410, 430);
  }

  // Divider line
  ctx.strokeStyle = "rgba(0, 229, 154, 0.35)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(110, 520);
  ctx.lineTo(W - 110, 520);
  ctx.stroke();

  // Live Index quotes row at bottom
  const topFour = snapshot.indices.slice(0, 4);
  topFour.forEach((q, i) => {
    const x = 130 + i * 465;
    const y = 615;
    ctx.fillStyle = "#e0ede6";
    ctx.font = "bold 46px monospace";
    ctx.fillText(q.name, x, y);

    ctx.font = "42px monospace";
    ctx.fillText(q.price, x, y + 58);

    ctx.fillStyle = q.isUp ? "#00e59a" : "#ff3549";
    ctx.font = "bold 36px monospace";
    ctx.fillText((q.isUp ? "▲ " : "▼ ") + q.change, x + 235, y + 58);
  });
}

/** Big wall display: brand + live index board. */
export function makeBoardTexture(): THREE.CanvasTexture {
  const W = 2048;
  const H = 768;
  const { canvas } = makeCanvas(W, H);
  drawBoardCanvas(canvas, getMarketSnapshot());
  return toTexture(canvas);
}

/** Roblox-style smiling face for the character heads. */
export function makeFaceTexture(): THREE.CanvasTexture {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S, S);
  ctx.fillStyle = "#00000000";
  ctx.clearRect(0, 0, S, S);

  ctx.fillStyle = "#151515";
  for (const ex of [78, 178]) {
    ctx.beginPath();
    ctx.roundRect(ex - 16, 88, 32, 44, 12);
    ctx.fill();
  }
  ctx.strokeStyle = "#151515";
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(128, 138, 52, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();

  return toTexture(canvas);
}

/** Floating name tag above each character. */
export function makeNameTagTexture(name: string): THREE.CanvasTexture {
  const W = 512;
  const H = 160;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "rgba(0,0,0,0)";
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = "#2ecc7f";
  ctx.shadowColor = "#2ecc7f";
  ctx.shadowBlur = 18;
  ctx.font = "bold 84px 'Trebuchet MS', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(name, W / 2, H / 2 + 30);

  return toTexture(canvas);
}
