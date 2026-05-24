import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';

const src = 'Icons/peca-do-quebra-cabeca-simbolo-do-autismo-1009x1024.webp';
const dst = 'Icons/puzzle-icon.png';

const img = sharp(src);
const { data, info } = await img
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
const pixels = new Uint8Array(data);

// Flood-fill from all 4 corners to find contiguous white/near-white background
const WHITE_THRESHOLD = 240;

const visited = new Uint8Array(width * height);
const queue = [];

function idx(x, y) { return (y * width + x) * channels; }
function pixIdx(x, y) { return y * width + x; }

function isWhitish(x, y) {
  const i = idx(x, y);
  return pixels[i] >= WHITE_THRESHOLD &&
         pixels[i + 1] >= WHITE_THRESHOLD &&
         pixels[i + 2] >= WHITE_THRESHOLD;
}

// Seed corners
for (const [cx, cy] of [[0,0],[width-1,0],[0,height-1],[width-1,height-1]]) {
  if (!visited[pixIdx(cx, cy)] && isWhitish(cx, cy)) {
    queue.push([cx, cy]);
    visited[pixIdx(cx, cy)] = 1;
  }
}

// BFS flood fill
while (queue.length > 0) {
  const [x, y] = queue.pop();
  const pi = idx(x, y);
  // make transparent
  pixels[pi + 3] = 0;

  for (const [nx, ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
    const ni = pixIdx(nx, ny);
    if (!visited[ni] && isWhitish(nx, ny)) {
      visited[ni] = 1;
      queue.push([nx, ny]);
    }
  }
}

// Write PNG
await sharp(Buffer.from(pixels), { raw: { width, height, channels } })
  .png()
  .toFile(dst);

console.log(`Saved: ${dst} (${width}x${height})`);
