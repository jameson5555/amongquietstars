import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const input = fileURLToPath(new URL('../source-images/view_cockpit_forward_source.webp', import.meta.url));
const output = fileURLToPath(new URL('../public/images/view_cockpit_forward.webp', import.meta.url));

const source = readFileSync(input);
const metadata = await sharp(source).metadata();
const width = metadata.width;
const height = metadata.height;

if (!width || !height) {
  throw new Error('Unable to read cockpit image dimensions.');
}

const points = [
  [0.245, 0.150],
  [0.775, 0.150],
  [0.815, 0.225],
  [0.790, 0.485],
  [0.768, 0.542],
  [0.240, 0.542],
  [0.206, 0.485],
  [0.172, 0.230]
].map(([x, y]) => [Math.round(x * width), Math.round(y * height)]);

const polygonPath = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x},${y}`).join(' ');

const maskSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <path d="M0,0 H${width} V${height} H0 Z ${polygonPath} Z" fill="white" fill-rule="evenodd" />
</svg>
`);

await sharp(source)
  .ensureAlpha()
  .composite([{ input: maskSvg, blend: 'dest-in' }])
  .webp({ quality: 88, alphaQuality: 100 })
  .toFile(output);

console.log(`Cut cockpit window alpha into ${output}`);
