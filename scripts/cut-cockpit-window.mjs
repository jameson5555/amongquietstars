import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const input = fileURLToPath(new URL('../source-images/view_cockpit_forward_source.png', import.meta.url));
const output = fileURLToPath(new URL('../public/images/view_cockpit_forward.webp', import.meta.url));

const source = readFileSync(input);
const width = 941;
const height = 1672;
const keyed = await sharp(source)
  .resize(width, height, { fit: 'fill' })
  .ensureAlpha()
  .raw()
  .toBuffer();

for (let index = 0; index < keyed.length; index += 4) {
  const red = keyed[index] ?? 0;
  const green = keyed[index + 1] ?? 0;
  const blue = keyed[index + 2] ?? 0;
  const greenDominance = green - Math.max(red, blue);
  const brightness = green;
  const keyStrength = Math.max(
    0,
    Math.min(1, (greenDominance - 38) / 82)
  ) * Math.max(0, Math.min(1, (brightness - 96) / 118));

  if (keyStrength > 0) {
    keyed[index + 3] = Math.round(255 * (1 - keyStrength));
  }
}

await sharp(keyed, { raw: { width, height, channels: 4 } })
  .webp({ quality: 88, alphaQuality: 100 })
  .toFile(output);

console.log(`Chroma-keyed cockpit window alpha into ${output}`);
