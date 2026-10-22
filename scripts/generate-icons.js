import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Low-level pure Node PNG generator
function createPng(width, height, drawFn) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  function crc32(buf) {
    let table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c;
    }
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    return (crc ^ (-1)) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const c = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(c, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdr = chunk('IHDR', ihdrData);
  const idat = chunk('IDAT', deflated);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdr, idat, iend]);
}

// Distance from point to rounded rectangle SDF
function sdRoundedRect(x, y, cx, cy, halfW, halfH, r) {
  const dx = Math.max(Math.abs(x - cx) - (halfW - r), 0);
  const dy = Math.max(Math.abs(y - cy) - (halfH - r), 0);
  return Math.sqrt(dx * dx + dy * dy) - r;
}

// Smoothstep anti-aliasing
function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

// Draw the authentic White Squircle App Icon with black "ō" symbol
function drawAppIcon(x, y, w, h) {
  // Squircle parameters (white background with rounded corners and safe padding)
  const squircleRadius = w * 0.22;
  const squirclePad = w * 0.04; // 4% safe padding so squircle is never cropped
  const distSquircle = sdRoundedRect(
    x,
    y,
    w / 2,
    h / 2,
    w / 2 - squirclePad,
    h / 2 - squirclePad,
    squircleRadius
  );

  const squircleAlpha = 1 - smoothstep(-0.8, 0.8, distSquircle);
  if (squircleAlpha <= 0) {
    return [0, 0, 0, 0];
  }

  // Draw black "ō" inside
  // 1. Macron pill bar
  const barCx = w / 2;
  const barCy = h * 0.30;
  const barHalfW = w * 0.16;
  const barHalfH = h * 0.036;
  const barRadius = barHalfH;
  const distBar = sdRoundedRect(x, y, barCx, barCy, barHalfW, barHalfH, barRadius);
  const barAlpha = 1 - smoothstep(-0.8, 0.8, distBar);

  // 2. Ring circle
  const ringCx = w / 2;
  const ringCy = h * 0.58;
  const outerR = w * 0.22;
  const innerR = w * 0.125;
  const distCenter = Math.hypot(x - ringCx, y - ringCy);
  const ringAlpha =
    (1 - smoothstep(-0.8, 0.8, distCenter - outerR)) *
    smoothstep(-0.8, 0.8, distCenter - innerR);

  const symbolAlpha = Math.max(barAlpha, ringAlpha);

  // Background is pure white, symbol is black
  const r = Math.round(255 * (1 - symbolAlpha));
  const g = Math.round(255 * (1 - symbolAlpha));
  const b = Math.round(255 * (1 - symbolAlpha));
  const a = Math.round(squircleAlpha * 255);

  return [r, g, b, a];
}

// Draw Maskable Icon with 20% safe padding
function drawMaskableIcon(x, y, w, h) {
  // Pure black full-bleed background
  const scale = 0.65; // scale into 65% safe-zone
  const cx = w / 2;
  const cy = h / 2;
  const nx = (x - cx) / scale + cx;
  const ny = (y - cy) / scale + cy;

  // Draw white "ō" symbol on pure black
  const barCx = w / 2;
  const barCy = h * 0.30;
  const barHalfW = w * 0.18;
  const barHalfH = h * 0.042;
  const barRadius = barHalfH;
  const distBar = sdRoundedRect(nx, ny, barCx, barCy, barHalfW, barHalfH, barRadius);
  const barAlpha = 1 - smoothstep(-0.8, 0.8, distBar);

  const ringCx = w / 2;
  const ringCy = h * 0.58;
  const outerR = w * 0.24;
  const innerR = w * 0.135;
  const distCenter = Math.hypot(nx - ringCx, ny - ringCy);
  const ringAlpha =
    (1 - smoothstep(-0.8, 0.8, distCenter - outerR)) *
    smoothstep(-0.8, 0.8, distCenter - innerR);

  const symbolAlpha = Math.max(barAlpha, ringAlpha);
  const val = Math.round(symbolAlpha * 255);

  return [val, val, val, 255];
}

// Draw white "ō" symbol on transparent background with generous margins
function drawOSymbolWhite(x, y, w, h) {
  const barCx = w / 2;
  const barCy = h * 0.20;
  const barHalfW = w * 0.24;
  const barHalfH = h * 0.052;
  const barRadius = barHalfH;
  const distBar = sdRoundedRect(x, y, barCx, barCy, barHalfW, barHalfH, barRadius);
  const barAlpha = 1 - smoothstep(-0.8, 0.8, distBar);

  const ringCx = w / 2;
  const ringCy = h * 0.58;
  const outerR = w * 0.29;
  const innerR = w * 0.16;
  const distCenter = Math.hypot(x - ringCx, y - ringCy);
  const ringAlpha =
    (1 - smoothstep(-0.8, 0.8, distCenter - outerR)) *
    smoothstep(-0.8, 0.8, distCenter - innerR);

  const symbolAlpha = Math.max(barAlpha, ringAlpha);
  const a = Math.round(symbolAlpha * 255);

  return [255, 255, 255, a];
}

console.log('Generating non-cropped PNG & SVG icon assets...');

// 1. App Icon PNGs (192x192, 512x512, apple-touch-icon 180x180, favicons)
fs.writeFileSync(path.join(publicDir, 'korero_app_icon_logo_white.png'), createPng(512, 512, drawAppIcon));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, drawAppIcon));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, drawAppIcon));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, drawAppIcon));
fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), createPng(32, 32, drawAppIcon));
fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), createPng(16, 16, drawAppIcon));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, drawMaskableIcon));

// 2. White "ō" symbol PNG
fs.writeFileSync(path.join(publicDir, 'korero_o_symbol_logo_white.png'), createPng(512, 512, drawOSymbolWhite));

// 3. SVG Favicon & Icons with safe margin inside viewBox="0 0 100 100"
const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="4" y="4" width="92" height="92" rx="20" fill="#ffffff" />
  <rect x="34" y="24" width="32" height="7.5" rx="3.75" fill="#000000" />
  <circle cx="50" cy="58" r="21" fill="none" stroke="#000000" stroke-width="9.5" />
</svg>`;

const svgWhiteSymbol = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="28" y="16" width="44" height="10" rx="5" fill="#ffffff" />
  <circle cx="50" cy="58" r="26" fill="none" stroke="#ffffff" stroke-width="12" />
</svg>`;

const svgWordmark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 90" fill="none">
  <style>
    .k-text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-weight: 700; font-size: 76px; fill: #ffffff; }
  </style>
  <text x="10" y="70" class="k-text" letter-spacing="-1.5">Kōrero</text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgFavicon);
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgFavicon);
fs.writeFileSync(path.join(publicDir, 'korero_symbol.svg'), svgWhiteSymbol);
fs.writeFileSync(path.join(publicDir, 'korero_wordmark.svg'), svgWordmark);

// Copy favicon.ico as PNG format
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPng(32, 32, drawAppIcon));

console.log('All uncropped assets and SVGs written successfully to /public!');
