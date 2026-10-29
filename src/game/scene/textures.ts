import * as THREE from "three";

// Canvas-generated textures so the office needs no external assets.

function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
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

/** Sunset city skyline seen through the window wall. */
export function makeCityTexture(): THREE.CanvasTexture {
  const W = 2048;
  const H = 1024;
  const { canvas, ctx } = makeCanvas(W, H);

  // Sky gradient: deep blue top, orange/gold horizon
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#0d1b2e");
  sky.addColorStop(0.35, "#27354f");
  sky.addColorStop(0.6, "#8a4a2b");
  sky.addColorStop(0.78, "#d97b33");
  sky.addColorStop(0.9, "#f2a544");
  sky.addColorStop(1, "#f7c66a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Sun glow
  const sunY = H * 0.8;
  const glow = ctx.createRadialGradient(W * 0.62, sunY, 10, W * 0.62, sunY, 420);
  glow.addColorStop(0, "rgba(255,220,140,0.95)");
  glow.addColorStop(0.35, "rgba(247,160,70,0.55)");
  glow.addColorStop(1, "rgba(247,160,70,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Clouds
  ctx.globalAlpha = 0.22;
  for (let i = 0; i < 26; i++) {
    const cx = Math.random() * W;
    const cy = H * (0.15 + Math.random() * 0.5);
    const cw = 180 + Math.random() * 420;
    const ch = 14 + Math.random() * 30;
    ctx.fillStyle = Math.random() > 0.5 ? "#f0b878" : "#2c3a55";
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw, ch, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Far skyline layer
  const drawLayer = (baseY: number, maxH: number, color: string, windowAlpha: number) => {
    let x = 0;
    while (x < W) {
      const bw = 60 + Math.random() * 130;
      const bh = 120 + Math.random() * maxH;
      const y = baseY - bh;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, bw, H - y);

      // spire on some towers
      if (Math.random() > 0.72) {
        ctx.fillRect(x + bw * 0.45, y - 40 - Math.random() * 60, 6, 60);
      }

      // lit windows
      const cols = Math.floor(bw / 14);
      const rows = Math.floor(bh / 18);
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          if (Math.random() > 0.55) {
            ctx.fillStyle = Math.random() > 0.25 ? "rgba(255,214,140,ALPHA)" : "rgba(160,220,255,ALPHA)";
            ctx.globalAlpha = windowAlpha * (0.4 + Math.random() * 0.6);
            ctx.fillRect(x + 6 + c * 14, y + 8 + r * 18, 6, 8);
          }
        }
      }
      ctx.globalAlpha = 1;
      x += bw + 4 + Math.random() * 14;
    }
  };

  drawLayer(H * 0.86, 340, "#1a2334", 0.5);
  drawLayer(H * 0.95, 260, "#101724", 0.65);

  // Water reflection strip at the very bottom
  const water = ctx.createLinearGradient(0, H * 0.95, 0, H);
  water.addColorStop(0, "rgba(242,165,68,0.5)");
  water.addColorStop(1, "rgba(20,26,40,0.9)");
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

  // grid
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

  // price line
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

  // axis labels
  ctx.fillStyle = "rgba(200,230,225,0.75)";
  ctx.font = "bold 20px monospace";
  ctx.fillText(trend === "up" ? "+1.24%" : trend === "down" ? "-0.21%" : "+0.03%", 12, 26);

  return toTexture(canvas);
}

/** Vertical ticker board with quoted indices. */
export function makeTickerTexture(): THREE.CanvasTexture {
  const W = 512;
  const H = 1024;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "#05080a";
  ctx.fillRect(0, 0, W, H);

  const rows: Array<[string, string, "up" | "down"]> = [
    ["RELI", "2,861.40", "up"],
    ["TCS", "4,102.05", "up"],
    ["HDFC", "1,672.80", "down"],
    ["INFY", "1,847.35", "up"],
    ["ICICI", "1,214.90", "up"],
    ["SBIN", "812.25", "down"],
    ["BAJAJ", "9,986.10", "up"],
    ["LT", "3,640.55", "down"],
    ["WIPRO", "568.30", "up"],
    ["ASIAN", "2,240.75", "down"],
  ];

  rows.forEach((row, i) => {
    const y = 40 + i * 98;
    const [sym, price, dir] = row;
    ctx.fillStyle = dir === "up" ? "#35e08a" : "#ff5a5a";
    ctx.font = "bold 34px monospace";
    ctx.fillText(sym, 18, y);
    ctx.fillStyle = "rgba(220,235,235,0.9)";
    ctx.font = "26px monospace";
    ctx.fillText(price, 18, y + 34);
    ctx.fillStyle = dir === "up" ? "#35e08a" : "#ff5a5a";
    ctx.font = "bold 22px monospace";
    ctx.fillText(dir === "up" ? "▲ +0.8%" : "▼ -0.4%", 320, y + 34);
  });

  return toTexture(canvas);
}

/** Big wall display: brand + index board, like the reference. */
export function makeBoardTexture(): THREE.CanvasTexture {
  const W = 2048;
  const H = 768;
  const { canvas, ctx } = makeCanvas(W, H);
  ctx.fillStyle = "#04070a";
  ctx.fillRect(0, 0, W, H);

  // chevron mark
  ctx.strokeStyle = "#2ecc7f";
  ctx.lineWidth = 26;
  ctx.shadowColor = "#2ecc7f";
  ctx.shadowBlur = 30;
  ctx.beginPath();
  ctx.moveTo(120, 300);
  ctx.lineTo(220, 170);
  ctx.lineTo(320, 300);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(240, 300);
  ctx.lineTo(340, 170);
  ctx.lineTo(440, 300);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#f2f6f5";
  ctx.font = "bold 150px 'Arial Black', sans-serif";
  ctx.fillText("SIL SCIENCE", 500, 290);

  ctx.fillStyle = "#2ecc7f";
  ctx.font = "44px monospace";
  ctx.fillText("STOCK EXCHANGE FLOOR", 505, 360);

  // index row
  const quotes: Array<[string, string, string, "up" | "down"]> = [
    ["NIFTY", "24,612.30", "+1.24%", "up"],
    ["NASDAQ", "18,320.44", "-0.21%", "down"],
    ["SENSEX", "80,452.16", "+1.11%", "up"],
    ["BTC", "68,224.10", "+2.17%", "up"],
  ];
  quotes.forEach((q, i) => {
    const x = 160 + (i % 2) * 940;
    const y = 500 + Math.floor(i / 2) * 150;
    ctx.fillStyle = "#e8f0ee";
    ctx.font = "bold 62px monospace";
    ctx.fillText(q[0], x, y);
    ctx.font = "58px monospace";
    ctx.fillText(q[1], x + 300, y);
    ctx.fillStyle = q[3] === "up" ? "#35e08a" : "#ff5a5a";
    ctx.font = "bold 48px monospace";
    ctx.fillText((q[3] === "up" ? "▲ " : "▼ ") + q[2], x + 640, y);
  });

  return toTexture(canvas);
}

/** Roblox-style smiling face for the character heads. */
export function makeFaceTexture(): THREE.CanvasTexture {
  const S = 256;
  const { canvas, ctx } = makeCanvas(S, S);
  ctx.fillStyle = "#00000000";
  ctx.clearRect(0, 0, S, S);

  // eyes: two black rounded rectangles
  ctx.fillStyle = "#151515";
  for (const ex of [78, 178]) {
    ctx.beginPath();
    ctx.roundRect(ex - 16, 88, 32, 44, 12);
    ctx.fill();
  }
  // smile
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
