import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const objectAssets = [
  'planet_lumen_rest',
  'planet_vela_rest',
  'planet_marrowlight',
  'planet_bluewake',
  'space_station_lumen_rest',
  'asteroid_belt_outpost'
];

const backdropAssets = [
  'nebula_vista_01',
  'nebula_vista_02',
  'nebula_vista_03'
];

const sourcePath = (id) => fileURLToPath(new URL(`../source-images/${id}_source.png`, import.meta.url));
const outputPath = (id) => fileURLToPath(new URL(`../public/images/${id}.webp`, import.meta.url));

const keyedAlpha = async (id) => {
  const input = sourcePath(id);
  if (!existsSync(input)) {
    throw new Error(`Missing source image: ${input}`);
  }

  const image = sharp(readFileSync(input)).resize(768, 768, {
    fit: 'contain',
    background: '#00ff00'
  }).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index] ?? 0;
    const green = data[index + 1] ?? 0;
    const blue = data[index + 2] ?? 0;
    const greenDominance = green - Math.max(red, blue);
    const keyStrength = Math.max(0, Math.min(1, (greenDominance - 34) / 86)) *
      Math.max(0, Math.min(1, (green - 92) / 118));

    if (keyStrength > 0) {
      data[index + 3] = Math.round(255 * (1 - keyStrength));
    }
  }

  await sharp(data, { raw: info })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(outputPath(id));
  console.log(`Processed transparent destination ${id}`);
};

const opaqueBackdrop = async (id) => {
  const input = sourcePath(id);
  if (!existsSync(input)) {
    throw new Error(`Missing source image: ${input}`);
  }

  await sharp(input)
    .resize(1200, 760, { fit: 'cover' })
    .webp({ quality: 88 })
    .toFile(outputPath(id));
  console.log(`Processed backdrop destination ${id}`);
};

for (const id of objectAssets) {
  await keyedAlpha(id);
}

for (const id of backdropAssets) {
  await opaqueBackdrop(id);
}
