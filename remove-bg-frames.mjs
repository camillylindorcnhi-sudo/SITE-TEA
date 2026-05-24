import sharp from 'sharp';
import { readdirSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const framesDir = resolve(__dirname, 'frames');

// Main dark-pixel removal
const HARD   = 80;   // all channels < this → fully transparent
const SOFT   = 120;  // all channels < this → feathered edge (gradual alpha)

// Bottom shadow/reflection
const BOTTOM_FRACTION = 0.20;  // bottom 20% of image
const BOTTOM_SAT_MAX  = 0.25;  // saturation below this = considered unsaturated
const BOTTOM_VAL_MAX  = 0.50;  // brightness below this = considered dark

function toHSV(r, g, b) {
  const rf = r / 255, gf = g / 255, bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const s = max === 0 ? 0 : (max - min) / max;
  return { s, v: max };
}

const files = readdirSync(framesDir)
  .filter(f => f.endsWith('.png'))
  .sort();

console.log(`Processing ${files.length} frames...`);
console.log(`  Hard cut  : all channels < ${HARD}`);
console.log(`  Feathering: all channels < ${SOFT} (low-sat pixels only)`);
console.log(`  Bottom ${BOTTOM_FRACTION * 100}%: sat < ${BOTTOM_SAT_MAX} AND brightness < ${BOTTOM_VAL_MAX}\n`);

let done = 0;

for (const file of files) {
  const filePath = join(framesDir, file);

  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const px = new Uint8Array(data);

  const bottomStart = Math.floor(height * (1 - BOTTOM_FRACTION));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = px[i], g = px[i + 1], b = px[i + 2];
      const maxCh = Math.max(r, g, b);

      // 1. Hard removal: all channels below HARD threshold
      if (r < HARD && g < HARD && b < HARD) {
        px[i + 3] = 0;
        continue;
      }

      // 2. Soft feathering: all channels below SOFT, and low saturation
      //    (avoids feathering colored content like a blue-lit camera body)
      if (r < SOFT && g < SOFT && b < SOFT) {
        const { s } = toHSV(r, g, b);
        if (s < 0.35) {
          // Linear ramp from 0 (at HARD) to 255 (at SOFT)
          const alpha = Math.round(((maxCh - HARD) / (SOFT - HARD)) * 255);
          px[i + 3] = Math.max(0, Math.min(255, alpha));
          continue;
        }
      }

      // 3. Bottom-zone shadow / reflection removal
      if (y >= bottomStart) {
        const { s, v } = toHSV(r, g, b);
        if (s < BOTTOM_SAT_MAX && v < BOTTOM_VAL_MAX) {
          px[i + 3] = 0;
          continue;
        }

        // Smooth fade in the very bottom 5% regardless of color
        const fadeStart = Math.floor(height * 0.95);
        if (y >= fadeStart) {
          const t = (y - fadeStart) / (height - fadeStart); // 0 → 1
          const fadeAlpha = Math.round((1 - t) * px[i + 3]);
          px[i + 3] = fadeAlpha;
        }
      }
    }
  }

  await sharp(Buffer.from(px), { raw: { width, height, channels } })
    .png()
    .toFile(filePath);

  done++;
  process.stdout.write(`\r  ${done}/${files.length}  (${file})`);
}

console.log('\n\nDone.');
