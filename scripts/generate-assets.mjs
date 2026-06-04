import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const iconDir = new URL('../public/icons/', import.meta.url);
const splashDir = new URL('../public/splash/', import.meta.url);

mkdirSync(iconDir, { recursive: true });
mkdirSync(splashDir, { recursive: true });

const crcTable = new Uint32Array(256).map((_, index) => {
  let c = index;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
};

const mix = (a, b, t) => Math.round(a + (b - a) * t);

const gradientColor = (x, y, width, height) => {
  const nx = x / width;
  const ny = y / height;
  const glow = Math.max(0, 1 - Math.hypot(nx - 0.38, ny - 0.42) * 1.8);
  const blue = Math.max(0, 1 - Math.hypot(nx - 0.72, ny - 0.28) * 2);
  return [
    mix(18, 255, glow * 0.62) + mix(0, 60, blue * 0.12),
    mix(10, 198, glow * 0.38) + mix(0, 80, blue * 0.2),
    mix(38, 130, glow * 0.5) + mix(0, 120, blue * 0.4),
    255
  ];
};

const drawPng = (width, height, drawPixel) => {
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = drawPixel(x, y, width, height);
      const offset = 1 + x * 4;
      row[offset] = Math.max(0, Math.min(255, r));
      row[offset + 1] = Math.max(0, Math.min(255, g));
      row[offset + 2] = Math.max(0, Math.min(255, b));
      row[offset + 3] = Math.max(0, Math.min(255, a));
    }
    rows.push(row);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0))
  ]);
};

const iconPixel = (x, y, width, height) => {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.42;
  const distance = Math.hypot(x - cx, y - cy);
  let [r, g, b, a] = gradientColor(x, y, width, height);

  if (distance > radius) {
    const fade = Math.max(0, 1 - (distance - radius) / (width * 0.12));
    a = Math.round(255 * fade);
  }

  const shipY = height * 0.61;
  const shipWidth = width * 0.42;
  const shipHeight = height * 0.12;
  const inHull =
    Math.abs(x - cx) < shipWidth &&
    Math.abs(y - shipY) < shipHeight * (0.75 + 0.25 * Math.cos(((x - cx) / shipWidth) * Math.PI));
  const inGlow = Math.hypot(x - cx, y - height * 0.47) < width * 0.1;

  if (inHull) {
    return [31, 22, 50, a];
  }
  if (inGlow) {
    return [255, 238, 177, a];
  }

  if ((x * 13 + y * 17) % 499 === 0) {
    return [255, 248, 220, a];
  }

  return [r, g, b, a];
};

const splashPixel = (x, y, width, height) => {
  const [r, g, b] = gradientColor(x, y, width, height);
  const star = (x * 7 + y * 11) % 947 === 0;
  const windowBand = y > height * 0.22 && y < height * 0.74 && x > width * 0.08 && x < width * 0.92;
  if (star) {
    return [255, 248, 220, 255];
  }
  if (windowBand) {
    return [r + 20, g + 14, b + 24, 255];
  }
  return [Math.max(8, r * 0.45), Math.max(4, g * 0.42), Math.max(18, b * 0.55), 255];
};

writeFileSync(new URL('icon-192.png', iconDir), drawPng(192, 192, iconPixel));
writeFileSync(new URL('icon-512.png', iconDir), drawPng(512, 512, iconPixel));
writeFileSync(new URL('maskable-512.png', iconDir), drawPng(512, 512, iconPixel));
writeFileSync(new URL('apple-touch-icon.png', iconDir), drawPng(180, 180, iconPixel));
writeFileSync(new URL('splash-640x1136.png', splashDir), drawPng(640, 1136, splashPixel));
