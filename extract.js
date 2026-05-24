import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const input  = resolve(__dirname, 'puzzle.mp4');
const output = resolve(__dirname, 'frames/frame%03d.png');

ffmpeg.setFfmpegPath(ffmpegStatic);
mkdirSync(resolve(__dirname, 'frames'), { recursive: true });

console.log('Input :', input);
console.log('Output:', output);
console.log('Extracting frames as PNG (alpha preserved)...\n');

ffmpeg(input)
  .outputOptions([
    '-vf',               'scale=1920:1080',
    '-compression_level','1',   // fast encode, slightly larger files
    '-start_number',     '1'
  ])
  .output(output)
  .on('start',    cmd  => console.log('cmd:', cmd))
  .on('progress', p    => { if (p.frames) process.stdout.write(`\r  frames: ${p.frames}`); })
  .on('end',      ()   => console.log('\nDone.'))
  .on('error',    err  => { console.error('\nError:', err.message); process.exit(1); })
  .run();
