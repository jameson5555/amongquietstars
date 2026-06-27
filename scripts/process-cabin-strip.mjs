import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = fileURLToPath(
  new URL('../source-images/cabin_strip_v1.png', import.meta.url)
);

const variants = [
  {
    width: 2304,
    height: 1024,
    output: fileURLToPath(
      new URL('../public/images/cabin_strip_2304.webp', import.meta.url)
    )
  },
  {
    width: 4608,
    height: 2048,
    output: fileURLToPath(
      new URL('../public/images/cabin_strip_4608.webp', import.meta.url)
    )
  }
];

// The strip is [Map | Cockpit | Radio | Ship]. These points match the
// cockpit-window calibration in src/data/cabinScene.ts.
const cockpitWindow = [
  [0.10, 0.16],
  [0.90, 0.16],
  [0.94, 0.22],
  [0.91, 0.505],
  [0.84, 0.56],
  [0.16, 0.56],
  [0.09, 0.505],
  [0.06, 0.22]
];

const createWindowCutout = (width, height) => {
  const stationWidth = width / 4;
  const cockpitOffset = stationWidth;
  const points = cockpitWindow
    .map(([x, y]) => `${cockpitOffset + x * stationWidth},${y * height}`)
    .join(' ');

  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <polygon points="${points}" fill="#fff"/>
    </svg>`
  );
};

await Promise.all(
  variants.map(async ({ width, height, output }) => {
    await sharp(source)
      .resize(width, height, { fit: 'fill' })
      .ensureAlpha()
      .composite([
        {
          input: createWindowCutout(width, height),
          blend: 'dest-out'
        }
      ])
      .webp({ quality: 88, alphaQuality: 100 })
      .toFile(output);
  })
);

console.log('Generated cabin strip variants with a transparent cockpit window');
