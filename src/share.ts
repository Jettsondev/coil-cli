import { createCanvas, SKRSContext2D } from '@napi-rs/canvas';
import { writeFile, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execa } from 'execa';
import clipboard from 'clipboardy';
import { GpuStats, GpuProcess } from './gpu.js';
import { severityForPercent, severityForTemp, Severity } from './theme.js';

// ─────────────────────────────────────────────────────────────────────────────
// Canvas + layout
// ─────────────────────────────────────────────────────────────────────────────

const W = 1600;
const H = 900;

// ─────────────────────────────────────────────────────────────────────────────
// Windows XP "Luna" theme palette
// ─────────────────────────────────────────────────────────────────────────────

const XP = {
  // Space/nebula wallpaper background (XP "Vortec Space"-inspired)
  spaceTop: '#050a1f',
  spaceMid: '#070d24',
  spaceBot: '#02030a',

  // Window chrome
  titleBarTop: '#0a55c8',
  titleBarMid: '#3a82e0',
  titleBarBot: '#0a4ab8',
  titleBarHighlight: 'rgba(255, 255, 255, 0.55)',
  windowBody: '#ece9d8',
  windowBorder: '#003c74',
  windowBorderInner: '#0058ee',

  // Group boxes / panels
  groupBorder: '#929b9d',
  groupHighlight: '#ffffff',
  groupLabel: '#0a246a',
  panel: '#ffffff',
  panelBorderDark: '#7f9db9',
  panelBorderLight: '#ffffff',

  // Buttons
  closeBtnTop: '#f99988',
  closeBtnBot: '#cb3424',
  closeBtnX: '#ffffff',
  minMaxTop: '#5da4ed',
  minMaxBot: '#1a5cc4',

  // Status bar
  statusBg: '#ece9d8',
  statusBorder: '#929b9d',
  statusText: '#222222',

  // Start button
  startGreenTop: '#5eaa1e',
  startGreenMid: '#7fc436',
  startGreenBot: '#3a7a14',
  startBorder: '#2c5b0d',

  // Text
  textBody: '#000000',
  textDim: '#555555',
  textHeading: '#0a246a',
  link: '#0a47a6',
};

// XP-flavored severity colors — toned down to match the era's palette
const SEV: Record<Severity, { fill: string; track: string }> = {
  ok: { fill: '#1660ce', track: '#cfdbe9' },
  warn: { fill: '#c98a08', track: '#e8dccf' },
  crit: { fill: '#c92929', track: '#e9cfcf' },
};

const SEV_TEXT: Record<Severity, string> = {
  ok: '#0a3b9a',
  warn: '#8a5b00',
  crit: '#9b0a0a',
};

// XP fonts
function fontTahoma(weight: number, size: number): string {
  return `${weight} ${size}px "Tahoma", "Segoe UI", "Inter", sans-serif`;
}
function fontTrebuchet(weight: number, size: number): string {
  return `${weight} ${size}px "Trebuchet MS", "Tahoma", "Segoe UI", sans-serif`;
}
function fontMono(weight: number, size: number): string {
  return `${weight} ${size}px "Lucida Console", "Consolas", monospace`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawing primitives
// ─────────────────────────────────────────────────────────────────────────────

function roundRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | { tl: number; tr: number; br: number; bl: number },
): void {
  const tl = typeof r === 'number' ? r : r.tl;
  const tr = typeof r === 'number' ? r : r.tr;
  const br = typeof r === 'number' ? r : r.br;
  const bl = typeof r === 'number' ? r : r.bl;
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  ctx.lineTo(x + bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

// ─────────────────────────────────────────────────────────────────────────────
// Deep-space wallpaper background — dark navy + nebula glows + starfield
// ─────────────────────────────────────────────────────────────────────────────

function drawBackground(ctx: SKRSContext2D): void {
  // Vertical gradient base
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, XP.spaceTop);
  base.addColorStop(0.55, XP.spaceMid);
  base.addColorStop(1, XP.spaceBot);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // Big blue nebula in the upper-right
  const neb1 = ctx.createRadialGradient(W * 0.82, H * 0.18, 0, W * 0.82, H * 0.18, 780);
  neb1.addColorStop(0, 'rgba(60, 130, 230, 0.45)');
  neb1.addColorStop(0.35, 'rgba(40, 95, 200, 0.18)');
  neb1.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = neb1;
  ctx.fillRect(0, 0, W, H);

  // Smaller purple nebula bottom-left for balance
  const neb2 = ctx.createRadialGradient(W * 0.08, H * 0.88, 0, W * 0.08, H * 0.88, 560);
  neb2.addColorStop(0, 'rgba(140, 70, 200, 0.30)');
  neb2.addColorStop(0.5, 'rgba(80, 40, 140, 0.10)');
  neb2.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = neb2;
  ctx.fillRect(0, 0, W, H);

  // Soft horizon glow band (cyan) — a faint streak suggesting an aurora
  const aurora = ctx.createLinearGradient(0, H * 0.55, 0, H * 0.7);
  aurora.addColorStop(0, 'rgba(0, 0, 0, 0)');
  aurora.addColorStop(0.5, 'rgba(94, 200, 255, 0.05)');
  aurora.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = aurora;
  ctx.fillRect(0, 0, W, H);

  // Starfield (seeded)
  drawStarfield(ctx, 280, 0xa17c);

  // Vignette
  const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.35, W / 2, H / 2, W * 0.85);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function drawStarfield(ctx: SKRSContext2D, count: number, seed: number): void {
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const big = rand() < 0.08;
    const r = big ? 1.6 + rand() * 1.4 : 0.6 + rand() * 0.6;
    const a = big ? 0.7 + rand() * 0.3 : 0.18 + rand() * 0.55;
    ctx.fillStyle = `rgba(220, 230, 255, ${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // Tiny glow on bigger stars
    if (big) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
      g.addColorStop(0, 'rgba(180, 210, 255, 0.35)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// XP window — title bar + body
// ─────────────────────────────────────────────────────────────────────────────

function drawWindow(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
): { bodyX: number; bodyY: number; bodyW: number; bodyH: number } {
  const titleH = 38;
  const cornerR = 10;

  // Drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0, 30, 80, 0.45)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, x, y, w, h, { tl: cornerR, tr: cornerR, br: 4, bl: 4 });
  ctx.fillStyle = XP.windowBorder;
  ctx.fill();
  ctx.restore();

  // Title bar with classic Luna gradient
  const tbGrad = ctx.createLinearGradient(x, y, x, y + titleH);
  tbGrad.addColorStop(0, XP.titleBarTop);
  tbGrad.addColorStop(0.35, XP.titleBarMid);
  tbGrad.addColorStop(0.5, '#2c79e0');
  tbGrad.addColorStop(0.65, XP.titleBarMid);
  tbGrad.addColorStop(1, XP.titleBarBot);

  ctx.save();
  roundRect(ctx, x + 2, y + 2, w - 4, titleH, { tl: cornerR - 2, tr: cornerR - 2, br: 0, bl: 0 });
  ctx.clip();
  ctx.fillStyle = tbGrad;
  ctx.fillRect(x, y, w, titleH + 2);

  // Glossy highlight strip
  const gloss = ctx.createLinearGradient(0, y + 2, 0, y + titleH * 0.5);
  gloss.addColorStop(0, 'rgba(255,255,255,0.55)');
  gloss.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(x, y, w, titleH * 0.55);
  ctx.restore();

  // Title text with subtle shadow
  ctx.font = fontTrebuchet(700, 17);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillText(title, x + 17, y + titleH / 2 + 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, x + 16, y + titleH / 2);

  // Window control buttons (—, □, ×)
  const btnY = y + 6;
  const btnH = 22;
  const btnW = 26;
  const gap = 2;
  const closeX = x + w - 8 - btnW;
  const maxX = closeX - gap - btnW;
  const minX = maxX - gap - btnW;
  drawWindowButton(ctx, minX, btnY, btnW, btnH, '_');
  drawWindowButton(ctx, maxX, btnY, btnW, btnH, '□');
  drawCloseButton(ctx, closeX, btnY, btnW, btnH);

  // Body fill
  const bodyY = y + titleH;
  const bodyH = h - titleH;
  roundRect(ctx, x + 2, bodyY, w - 4, bodyH - 2, { tl: 0, tr: 0, br: 3, bl: 3 });
  ctx.fillStyle = XP.windowBody;
  ctx.fill();

  // Inner highlight border
  roundRect(ctx, x + 1, y + 1, w - 2, h - 2, { tl: cornerR - 1, tr: cornerR - 1, br: 3, bl: 3 });
  ctx.strokeStyle = XP.windowBorderInner;
  ctx.lineWidth = 1;
  ctx.stroke();

  return {
    bodyX: x + 6,
    bodyY: bodyY + 6,
    bodyW: w - 12,
    bodyH: bodyH - 12,
  };
}

function drawWindowButton(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  glyph: string,
): void {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, XP.minMaxTop);
  g.addColorStop(0.5, '#2f78dc');
  g.addColorStop(1, XP.minMaxBot);
  roundRect(ctx, x, y, w, h, 4);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Glossy top
  ctx.save();
  roundRect(ctx, x + 1, y + 1, w - 2, h * 0.45, { tl: 3, tr: 3, br: 0, bl: 0 });
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.font = fontTahoma(700, 14);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(glyph, x + w / 2, y + h / 2 + 1);
  ctx.textAlign = 'left';
}

function drawCloseButton(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, XP.closeBtnTop);
  g.addColorStop(0.5, '#e25640');
  g.addColorStop(1, XP.closeBtnBot);
  roundRect(ctx, x, y, w, h, 4);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Gloss
  ctx.save();
  roundRect(ctx, x + 1, y + 1, w - 2, h * 0.45, { tl: 3, tr: 3, br: 0, bl: 0 });
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.moveTo(cx - 5, cy - 4);
  ctx.lineTo(cx + 5, cy + 4);
  ctx.moveTo(cx + 5, cy - 4);
  ctx.lineTo(cx - 5, cy + 4);
  ctx.stroke();
}

// ─────────────────────────────────────────────────────────────────────────────
// XP-style "GroupBox" — thin border with a floating label
// ─────────────────────────────────────────────────────────────────────────────

function drawGroupBox(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
): { ix: number; iy: number; iw: number; ih: number } {
  const labelPaddingX = 10;
  ctx.font = fontTahoma(700, 12);
  const labelW = ctx.measureText(label).width + labelPaddingX * 2;

  // Outer (lighter) border for the chiseled look
  ctx.strokeStyle = XP.groupHighlight;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1, y + 1, w - 1, h - 1);

  // Main border with a gap for the label
  ctx.strokeStyle = XP.groupBorder;
  ctx.lineWidth = 1;
  // top, broken by label region
  ctx.beginPath();
  ctx.moveTo(x + 0.5, y + 6.5);
  ctx.lineTo(x + 10, y + 6.5);
  ctx.moveTo(x + 10 + labelW, y + 6.5);
  ctx.lineTo(x + w - 0.5, y + 6.5);
  // right
  ctx.lineTo(x + w - 0.5, y + h - 0.5);
  // bottom
  ctx.lineTo(x + 0.5, y + h - 0.5);
  // left
  ctx.lineTo(x + 0.5, y + 6.5);
  ctx.stroke();

  // Label text
  ctx.fillStyle = XP.groupLabel;
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 10 + labelPaddingX, y + 7);

  return {
    ix: x + 12,
    iy: y + 22,
    iw: w - 24,
    ih: h - 30,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// XP "Sunken" panel — inset white area for content
// ─────────────────────────────────────────────────────────────────────────────

function drawSunkenPanel(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill = XP.panel,
): void {
  // Dark top/left lines
  ctx.strokeStyle = XP.panelBorderDark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 0.5, y + h - 0.5);
  ctx.lineTo(x + 0.5, y + 0.5);
  ctx.lineTo(x + w - 0.5, y + 0.5);
  ctx.stroke();
  // Light bottom/right
  ctx.strokeStyle = XP.panelBorderLight;
  ctx.beginPath();
  ctx.moveTo(x + w - 0.5, y + 0.5);
  ctx.lineTo(x + w - 0.5, y + h - 0.5);
  ctx.lineTo(x + 0.5, y + h - 0.5);
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// XP progress bar (smooth Luna gradient)
// ─────────────────────────────────────────────────────────────────────────────

function drawXpBar(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  percent: number,
  severity: Severity,
): void {
  // Sunken track
  drawSunkenPanel(ctx, x, y, w, h, '#ffffff');

  const pad = 2;
  const fillW = Math.max(0, Math.min(w - pad * 2, ((percent / 100) * (w - pad * 2))));
  if (fillW <= 0) return;

  const sev = SEV[severity];
  const g = ctx.createLinearGradient(x, y + pad, x, y + h - pad);
  // Lighter top, fuller mid, slight darker bottom — XP's "shiny" bar
  g.addColorStop(0, lighten(sev.fill, 0.45));
  g.addColorStop(0.5, sev.fill);
  g.addColorStop(1, darken(sev.fill, 0.15));
  ctx.fillStyle = g;
  ctx.fillRect(x + pad, y + pad, fillW, h - pad * 2);

  // Glossy highlight strip
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(x + pad, y + pad, fillW, (h - pad * 2) * 0.4);
}

function clampHex(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}
function hexToRgb(h: string): [number, number, number] {
  const s = h.replace('#', '');
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}
function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map(n => clampHex(n).toString(16).padStart(2, '0'))
      .join('')
  );
}
function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}
function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat box
// ─────────────────────────────────────────────────────────────────────────────

interface StatBlock {
  label: string;
  value: string;
  sub?: string;
  percent: number;
  severity: Severity;
}

function drawStatBox(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  b: StatBlock,
): void {
  const inner = drawGroupBox(ctx, x, y, w, h, b.label);

  // Value (big)
  ctx.font = fontTrebuchet(700, 36);
  ctx.fillStyle = SEV_TEXT[b.severity];
  ctx.textBaseline = 'top';
  ctx.fillText(b.value, inner.ix + 4, inner.iy + 10);
  const valW = ctx.measureText(b.value).width;

  // Sub label
  if (b.sub) {
    ctx.font = fontTahoma(400, 16);
    ctx.fillStyle = XP.textDim;
    ctx.fillText(b.sub, inner.ix + 4 + valW + 8, inner.iy + 28);
  }

  // Bar
  const barH = 18;
  const barW = inner.iw - 8;
  const barY = inner.iy + inner.ih - barH - 6;
  drawXpBar(ctx, inner.ix + 4, barY, barW, barH, b.percent, b.severity);

  // Percent text to the right of the bar
  ctx.font = fontTahoma(700, 11);
  ctx.fillStyle = XP.textDim;
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(b.percent)} %`, inner.ix + inner.iw - 2, barY - 16);
  ctx.textAlign = 'left';
}

// ─────────────────────────────────────────────────────────────────────────────
// XP ListView for processes
// ─────────────────────────────────────────────────────────────────────────────

function drawProcessList(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  processes: GpuProcess[],
): void {
  const inner = drawGroupBox(
    ctx,
    x,
    y,
    w,
    h,
    `Active GPU processes  ( ${processes.length} total )`,
  );

  // Sunken white panel inside
  drawSunkenPanel(ctx, inner.ix, inner.iy, inner.iw, inner.ih);

  // Column headers row (button-like)
  const headerH = 22;
  const colPidW = 90;
  const colVramW = 130;
  const colNameW = inner.iw - colPidW - colVramW;

  drawListColumnHeader(ctx, inner.ix, inner.iy, colPidW, headerH, 'PID');
  drawListColumnHeader(ctx, inner.ix + colPidW, inner.iy, colNameW, headerH, 'Process');
  drawListColumnHeader(
    ctx,
    inner.ix + colPidW + colNameW,
    inner.iy,
    colVramW,
    headerH,
    'VRAM',
  );

  // Rows
  const sorted = processes
    .slice()
    .sort((a, b) => (b.memoryUsed ?? -1) - (a.memoryUsed ?? -1));
  const rowH = 24;
  const maxRows = Math.floor((inner.ih - headerH - 8) / rowH);
  const rows = sorted.slice(0, Math.max(0, maxRows));

  if (rows.length === 0) {
    ctx.font = fontTahoma(400, 14);
    ctx.fillStyle = XP.textDim;
    ctx.fillText('No active GPU processes.', inner.ix + 8, inner.iy + headerH + 8);
    return;
  }

  rows.forEach((p, i) => {
    const ry = inner.iy + headerH + i * rowH;
    if (i % 2 === 0) {
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(inner.ix + 1, ry, inner.iw - 2, rowH);
    }

    ctx.font = fontTahoma(400, 13);
    ctx.fillStyle = XP.textBody;
    ctx.textBaseline = 'middle';

    // PID
    ctx.fillText(String(p.pid), inner.ix + 8, ry + rowH / 2);
    // Name with tiny icon dot
    ctx.fillStyle = XP.titleBarTop;
    ctx.beginPath();
    ctx.arc(inner.ix + colPidW + 8, ry + rowH / 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = XP.textBody;
    ctx.fillText(truncate(p.name, 52), inner.ix + colPidW + 18, ry + rowH / 2);

    // VRAM right-aligned
    ctx.fillStyle = p.memoryUsed === null ? XP.textDim : XP.titleBarTop;
    ctx.textAlign = 'right';
    ctx.fillText(formatMem(p.memoryUsed), inner.ix + inner.iw - 10, ry + rowH / 2);
    ctx.textAlign = 'left';
  });

  const remaining = sorted.length - rows.length;
  if (remaining > 0) {
    const ry = inner.iy + headerH + rows.length * rowH;
    ctx.font = fontTahoma(400, 12);
    ctx.fillStyle = XP.textDim;
    ctx.textBaseline = 'middle';
    ctx.fillText(`+ ${remaining} more…`, inner.ix + 8, ry + rowH / 2);
  }
}

function drawListColumnHeader(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
): void {
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#f9f9f9');
  g.addColorStop(1, '#d6d6d6');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#a0a0a0';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  ctx.font = fontTahoma(700, 12);
  ctx.fillStyle = XP.textBody;
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 8, y + h / 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Status bar / taskbar with start button + clock
// ─────────────────────────────────────────────────────────────────────────────

function drawTaskbar(ctx: SKRSContext2D, version: string, when: Date): void {
  const tbY = H - 50;
  const tbH = 50;

  // Taskbar gradient (Luna blue)
  const g = ctx.createLinearGradient(0, tbY, 0, tbY + tbH);
  g.addColorStop(0, '#2a72e3');
  g.addColorStop(0.5, '#1d5dd0');
  g.addColorStop(1, '#0c3f9b');
  ctx.fillStyle = g;
  ctx.fillRect(0, tbY, W, tbH);

  // Top highlight line
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(0, tbY, W, 2);

  // Start button (green capsule)
  const startW = 130;
  const startH = 34;
  const startX = 16;
  const startY = tbY + (tbH - startH) / 2;
  const sg = ctx.createLinearGradient(startX, startY, startX, startY + startH);
  sg.addColorStop(0, XP.startGreenMid);
  sg.addColorStop(0.5, XP.startGreenTop);
  sg.addColorStop(1, XP.startGreenBot);
  roundRect(ctx, startX, startY, startW, startH, { tl: 4, tr: 18, br: 18, bl: 4 });
  ctx.fillStyle = sg;
  ctx.fill();
  ctx.strokeStyle = XP.startBorder;
  ctx.lineWidth = 1;
  ctx.stroke();

  // start button gloss
  ctx.save();
  roundRect(ctx, startX + 2, startY + 2, startW - 4, startH * 0.4, { tl: 3, tr: 16, br: 0, bl: 0 });
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();
  ctx.restore();

  // "J_" mark (Jettson, terminal-prompt style) — replaces the Windows flag
  const jX = startX + 14;
  const jY = startY + startH / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(140, 210, 255, 0.85)';
  ctx.shadowBlur = 8;
  ctx.font = fontTrebuchet(900, 24);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('J_', jX, jY);
  ctx.restore();
  const jBlockW = ctx.measureText('J_').width;

  // start label, placed after J_ with a tasteful gap
  const coilX = jX + jBlockW + 10;
  ctx.font = fontTrebuchet(700, 16);
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillText('coil', coilX + 1, startY + startH / 2 + 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('coil', coilX, startY + startH / 2);

  // System tray on the right (clock + version)
  const trayW = 220;
  const trayX = W - trayW - 16;
  const trayY = tbY + 6;
  const trayH = tbH - 12;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  roundRect(ctx, trayX, trayY, trayW, trayH, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.stroke();

  // Clock
  const timeStr = when
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    .toUpperCase();
  ctx.font = fontTahoma(700, 14);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.fillText(timeStr, W - 26, tbY + tbH / 2 - 8);

  ctx.font = fontTahoma(400, 11);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(`coil v${version}`, W - 26, tbY + tbH / 2 + 8);
  ctx.textAlign = 'left';
}

// ─────────────────────────────────────────────────────────────────────────────
// Status-bar strip inside the window (jettson.dev tagline)
// ─────────────────────────────────────────────────────────────────────────────

function drawWindowStatusBar(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  // Sunken bar
  ctx.fillStyle = XP.statusBg;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = XP.statusBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 0.5, y + 0.5);
  ctx.lineTo(x + w - 0.5, y + 0.5);
  ctx.stroke();

  // Left: "Ready" with little status dot
  ctx.fillStyle = '#3a8df5';
  ctx.beginPath();
  ctx.arc(x + 12, y + h / 2, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = fontTahoma(400, 13);
  ctx.fillStyle = XP.statusText;
  ctx.textBaseline = 'middle';
  ctx.fillText('Ready', x + 22, y + h / 2);

  // Resize grip (diagonal dots, bottom-right) — drawn first so the link sits clear of it
  const gripX = x + w - 6;
  const gripY = y + h - 6;
  ctx.fillStyle = '#a0a0a0';
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j <= i; j++) {
      ctx.fillRect(gripX - i * 4, gripY - j * 4, 2, 2);
    }
  }

  // Right: jettson.dev link, kept clear of the grip
  ctx.fillStyle = XP.link;
  ctx.font = fontTahoma(700, 13);
  ctx.textAlign = 'right';
  ctx.fillText('jettson.dev', x + w - 28, y + h / 2);
  ctx.textAlign = 'left';
}

// ─────────────────────────────────────────────────────────────────────────────
// "System summary" hero band inside the window — GPU name w/ icon
// ─────────────────────────────────────────────────────────────────────────────

function drawHeroBand(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  gpuName: string,
  when: Date,
): void {
  // Sky-blue header strip (very pale Luna)
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#dee9f7');
  g.addColorStop(1, '#bdd2ee');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#7e9dc0';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  // Small "GPU" pseudo-icon: stacked green chip on the left
  const iconX = x + 14;
  const iconY = y + h / 2 - 22;
  drawGpuIcon(ctx, iconX, iconY, 44, 44);

  // GPU name big
  ctx.font = fontTrebuchet(700, 32);
  ctx.fillStyle = XP.textHeading;
  ctx.textBaseline = 'top';
  ctx.fillText(gpuName, x + 76, y + 12);

  // Subtitle
  const dateStr = when
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = when
    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  ctx.font = fontTahoma(400, 13);
  ctx.fillStyle = XP.textDim;
  ctx.fillText(`GPU snapshot · ${dateStr} · ${timeStr}`, x + 76, y + 52);

  // Right side: tiny "COIL · A JETTSON PRODUCT"
  ctx.font = fontTrebuchet(700, 22);
  ctx.fillStyle = XP.textHeading;
  ctx.textAlign = 'right';
  ctx.fillText('COIL', x + w - 14, y + 10);
  ctx.font = fontTahoma(400, 11);
  ctx.fillStyle = XP.textDim;
  ctx.fillText('A  JETTSON  PRODUCT', x + w - 14, y + 40);
  ctx.textAlign = 'left';
}

function drawGpuIcon(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  // PCB green base
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, '#3aa039');
  g.addColorStop(1, '#1f6b1d');
  roundRect(ctx, x, y, w, h, 4);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#0e3d0c';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Chip in the middle
  const cx = x + 8;
  const cy = y + 8;
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(cx, cy, w - 16, h - 16);
  ctx.strokeStyle = '#888';
  ctx.strokeRect(cx + 0.5, cy + 0.5, w - 17, h - 17);

  // Chip text "GPU"
  ctx.font = fontTahoma(700, 9);
  ctx.fillStyle = '#9be38f';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText('GPU', x + w / 2, y + h / 2);
  ctx.textAlign = 'left';
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatGB(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb} MB`;
}

function formatMem(mb: number | null): string {
  if (mb === null) return '—';
  return formatGB(mb);
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)) + '…';
}

function timestampSlug(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Desktop resolution (Windows OneDrive-aware)
// ─────────────────────────────────────────────────────────────────────────────

async function resolveDesktopDir(): Promise<string> {
  const home = os.homedir();
  const userProfile = process.env.USERPROFILE;
  const candidates = [
    userProfile ? path.join(userProfile, 'OneDrive', 'Desktop') : null,
    path.join(home, 'OneDrive', 'Desktop'),
    userProfile ? path.join(userProfile, 'Desktop') : null,
    path.join(home, 'Desktop'),
  ].filter((p): p is string => Boolean(p));

  for (const c of candidates) {
    try {
      await access(c);
      return c;
    } catch {
      // try next
    }
  }
  return home;
}

// ─────────────────────────────────────────────────────────────────────────────
// Clipboard
// ─────────────────────────────────────────────────────────────────────────────

async function copyImageToClipboard(filePath: string): Promise<boolean> {
  try {
    if (process.platform === 'win32') {
      const script =
        'Add-Type -AssemblyName System.Windows.Forms,System.Drawing;' +
        `$img = [System.Drawing.Image]::FromFile('${filePath.replace(/'/g, "''")}');` +
        '[System.Windows.Forms.Clipboard]::SetImage($img);' +
        '$img.Dispose();';
      await execa('powershell', ['-NoProfile', '-STA', '-Command', script]);
      return true;
    }
    if (process.platform === 'darwin') {
      const script = `set the clipboard to (read (POSIX file "${filePath}") as «class PNGf»)`;
      await execa('osascript', ['-e', script]);
      return true;
    }
    await execa('xclip', ['-selection', 'clipboard', '-t', 'image/png', '-i', filePath]);
    return true;
  } catch {
    return false;
  }
}

async function copyPathAsText(filePath: string): Promise<boolean> {
  try {
    await clipboard.write(filePath);
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface ShareResult {
  filePath: string;
  clipboard: 'image' | 'path-text' | 'none';
}

export interface ShareOptions {
  outDir?: string;
  version?: string;
  now?: Date;
  skipClipboard?: boolean;
}

export async function generateShareCard(
  stats: GpuStats,
  processes: GpuProcess[],
  options: ShareOptions = {},
): Promise<ShareResult> {
  const now = options.now ?? new Date();
  const version = options.version ?? '0.2.0';
  const outDir = options.outDir ?? (await resolveDesktopDir());

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  drawBackground(ctx);

  // ── XP window
  const windowX = 60;
  const windowY = 50;
  const windowW = W - windowX * 2;
  const windowH = H - windowY - 80; // leave room for taskbar
  const body = drawWindow(
    ctx,
    windowX,
    windowY,
    windowW,
    windowH,
    'COIL — GPU Performance · System Properties',
  );

  // ── Inside window
  // Hero band (GPU summary)
  const heroH = 78;
  drawHeroBand(ctx, body.bodyX, body.bodyY, body.bodyW, heroH, stats.name, now);

  // 2×2 stat grid
  const gridY = body.bodyY + heroH + 14;
  const gridGap = 12;
  const statW = (body.bodyW - gridGap) / 2;
  const statH = 130;

  const memPct = stats.memoryTotal > 0 ? (stats.memoryUsed / stats.memoryTotal) * 100 : 0;
  const powerPct = stats.powerLimit > 0 ? (stats.powerDraw / stats.powerLimit) * 100 : 0;

  const grid: StatBlock[] = [
    {
      label: 'GPU Utilization',
      value: `${stats.utilizationGpu}%`,
      percent: stats.utilizationGpu,
      severity: severityForPercent(stats.utilizationGpu),
    },
    {
      label: 'Video Memory',
      value: formatGB(stats.memoryUsed),
      sub: `of ${formatGB(stats.memoryTotal)}`,
      percent: memPct,
      severity: severityForPercent(memPct),
    },
    {
      label: 'Temperature',
      value: `${stats.temperature} °C`,
      percent: Math.min(100, stats.temperature),
      severity: severityForTemp(stats.temperature),
    },
    {
      label: 'Power Draw',
      value: `${stats.powerDraw.toFixed(1)} W`,
      sub: `of ${stats.powerLimit.toFixed(0)} W`,
      percent: powerPct,
      severity: severityForPercent(powerPct),
    },
  ];

  drawStatBox(ctx, body.bodyX, gridY, statW, statH, grid[0]);
  drawStatBox(ctx, body.bodyX + statW + gridGap, gridY, statW, statH, grid[1]);
  drawStatBox(ctx, body.bodyX, gridY + statH + gridGap, statW, statH, grid[2]);
  drawStatBox(
    ctx,
    body.bodyX + statW + gridGap,
    gridY + statH + gridGap,
    statW,
    statH,
    grid[3],
  );

  // Process listview
  const listY = gridY + statH * 2 + gridGap * 2;
  const statusBarH = 24;
  const listH = body.bodyY + body.bodyH - listY - statusBarH - 8;
  drawProcessList(ctx, body.bodyX, listY, body.bodyW, listH, processes);

  // Window status bar
  drawWindowStatusBar(
    ctx,
    body.bodyX,
    body.bodyY + body.bodyH - statusBarH,
    body.bodyW,
    statusBarH,
  );

  // ── Taskbar (start button + clock)
  drawTaskbar(ctx, version, now);

  // ── Encode + save
  const buffer = await canvas.encode('png');
  const filename = `coil-share-${timestampSlug(now)}.png`;
  const filePath = path.join(outDir, filename);
  await writeFile(filePath, buffer);

  // ── Clipboard
  let clip: ShareResult['clipboard'] = 'none';
  if (!options.skipClipboard) {
    if (await copyImageToClipboard(filePath)) clip = 'image';
    else if (await copyPathAsText(filePath)) clip = 'path-text';
  }

  return { filePath, clipboard: clip };
}
