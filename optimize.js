import { readFile, writeFile } from 'fs/promises';

const FILE = 'index.html';
let html = await readFile(FILE, 'utf8');
const before = html.length;

// 1. Add loading="lazy" to all <img> tags (familia.png is a CSS background, not an <img>)
html = html.replace(/<img\b(?![^>]*\bloading=)/g, '<img loading="lazy"');

// 2. No video changes needed — the only <video> is vídeo b-roll.mp4 (the excluded one)

// 3. Remove HTML comments <!-- ... --> but NOT inside <script> or <style> blocks
//    Strategy: split on <script>/<style> block boundaries, strip comments only from HTML parts
html = html.replace(/<!--[\s\S]*?-->/g, (match, offset) => {
  // Keep IE conditional comments (<!--[if ...]) just in case
  if (match.startsWith('<!--[')) return match;
  return '';
});

// 4. Add dns-prefetch for cdnjs (preconnect for fonts already exists)
html = html.replace(
  '  <link rel="preconnect" href="https://fonts.googleapis.com" />',
  '  <link rel="preconnect" href="https://fonts.googleapis.com" />\n  <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com" />'
);

// Clean up blank lines left by removed comments (max 2 consecutive blank lines → 1)
html = html.replace(/\n{3,}/g, '\n\n');

await writeFile(FILE, html, 'utf8');
const after = html.length;
const saved = before - after;
console.log(`Done.`);
console.log(`  lazy img tags added`);
console.log(`  HTML comments removed`);
console.log(`  dns-prefetch for cdnjs added`);
console.log(`  File: ${(before/1024).toFixed(1)} KB → ${(after/1024).toFixed(1)} KB  (saved ${(saved/1024).toFixed(1)} KB)`);
