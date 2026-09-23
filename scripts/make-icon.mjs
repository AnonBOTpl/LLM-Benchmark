// Generates app-icon.png (1024x1024 RGBA) with zero dependencies, so that
// `npx tauri icon app-icon.png` can produce every platform icon size.
import zlib from "node:zlib";
import fs from "node:fs";

const W = 1024;
const H = 1024;

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const mix = (a, b, t) => a + (b - a) * t;

// Rounded-rect coverage with 1px antialiasing.
function roundedRect(x, y, rx, ry, rw, rh, radius) {
  const cx = clamp(x, rx + radius, rx + rw - radius);
  const cy = clamp(y, ry + radius, ry + rh - radius);
  const d = Math.hypot(x - cx, y - cy);
  return clamp(radius - d + 0.5, 0, 1);
}

const BG_TOP = [13, 18, 32];
const BG_BOTTOM = [24, 34, 60];
const BARS = [
  { x: 244, y: 620, w: 148, h: 190, color: [34, 211, 238] },
  { x: 438, y: 452, w: 148, h: 358, color: [129, 140, 248] },
  { x: 632, y: 332, w: 148, h: 478, color: [52, 211, 153] },
];

const raw = Buffer.alloc(H * (W * 4 + 1));

for (let y = 0; y < H; y++) {
  const rowStart = y * (W * 4 + 1);
  raw[rowStart] = 0; // filter: none

  for (let x = 0; x < W; x++) {
    const i = rowStart + 1 + x * 4;

    const cardAlpha = roundedRect(x, y, 60, 60, W - 120, H - 120, 190);
    const t = (y - 60) / (H - 120);
    const bg = [0, 1, 2].map((c) => Math.round(mix(BG_TOP[c], BG_BOTTOM[c], t)));

    let r = bg[0];
    let g = bg[1];
    let b = bg[2];

    for (const bar of BARS) {
      const a = roundedRect(x, y, bar.x, bar.y, bar.w, bar.h, 34);
      if (a <= 0) continue;
      r = Math.round(mix(r, bar.color[0], a));
      g = Math.round(mix(g, bar.color[1], a));
      b = Math.round(mix(b, bar.color[2], a));
    }

    // Baseline under the bars.
    const baseline = roundedRect(x, y, 200, 806, W - 400, 18, 9);
    if (baseline > 0) {
      r = Math.round(mix(r, 226, baseline));
      g = Math.round(mix(g, 232, baseline));
      b = Math.round(mix(b, 240, baseline));
    }

    raw[i] = r;
    raw[i + 1] = g;
    raw[i + 2] = b;
    raw[i + 3] = Math.round(cardAlpha * 255);
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

fs.writeFileSync("app-icon.png", png);
console.log(`app-icon.png written (${(png.length / 1024).toFixed(1)} KB)`);
