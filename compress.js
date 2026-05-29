import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';

const FOLDER = '_FOTOS TRATADAS';
const MAX_WIDTH = 1200;
const QUALITY = 75;

async function folderSize(dir) {
  const files = await readdir(dir);
  let total = 0;
  for (const f of files) {
    const s = await stat(join(dir, f));
    total += s.size;
  }
  return total;
}

function fmt(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

const imageExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.bmp']);

async function main() {
  const files = (await readdir(FOLDER)).filter(f => imageExts.has(extname(f).toLowerCase()));

  const sizeBefore = await folderSize(FOLDER);
  console.log(`Files found: ${files.length}`);
  console.log(`Total size before: ${fmt(sizeBefore)}`);

  let processed = 0;
  for (const file of files) {
    const path = join(FOLDER, file);
    const tmp = path + '.tmp.jpg';
    try {
      await sharp(path)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: QUALITY })
        .toFile(tmp);
      const { rename } = await import('fs/promises');
      await rename(tmp, path);
      processed++;
      process.stdout.write(`\r  Processed: ${processed}/${files.length}`);
    } catch (err) {
      console.error(`\nFailed: ${file} — ${err.message}`);
      try { const { unlink } = await import('fs/promises'); await unlink(tmp); } catch {}
    }
  }

  const sizeAfter = await folderSize(FOLDER);
  const saved = sizeBefore - sizeAfter;
  console.log(`\n\nDone.`);
  console.log(`Files processed: ${processed}/${files.length}`);
  console.log(`Total size after:  ${fmt(sizeAfter)}`);
  console.log(`Space saved:       ${fmt(saved)} (${((saved / sizeBefore) * 100).toFixed(1)}%)`);
}

main();
