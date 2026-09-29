// Exporta index.html a MP4 (1280x720, 30 fps) con los efectos de sonido.
// Uso: FFMPEG=/ruta/ffmpeg node render.mjs [salida.mp4] [fonts.css opcional con @font-face inline]
// Requiere playwright (con Chromium) y ffmpeg.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(process.argv[2] || path.join(dir, 'out', 'juegos-fwp.mp4'));
const fontsCss = process.argv[3] ? fs.readFileSync(process.argv[3], 'utf8') : '';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = 30, SR = 44100;
fs.mkdirSync(path.dirname(out), { recursive: true });

let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
if (fontsCss) html = html.replace(/<link rel="stylesheet"[^>]*>/, `<style>${fontsCss}</style>`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);
const { duration, events } = await page.evaluate(() => ({ duration: window.FWP.duration, events: window.FWP.events }));

// ---- audio: same effects as the page, synthesized offline ----
const N = Math.ceil(duration * SR), buf = new Float32Array(N);
let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const wave = (type, ph) => type === 'sine' ? Math.sin(ph) : type === 'square' ? Math.sign(Math.sin(ph)) : type === 'sawtooth' ? 2 * ((ph / (2 * Math.PI)) % 1) - 1 : 2 * Math.abs(2 * ((ph / (2 * Math.PI)) % 1) - 1) - 1;
function tone(t0, f, dur, type = 'sine', vol = .2, at = 0, f2) {
  const s0 = Math.floor((t0 + at) * SR), n = Math.floor(dur * SR); let ph = 0;
  for (let i = 0; i < n && s0 + i < N; i++) {
    const k = i / n, f_ = f2 ? f * Math.pow(f2 / f, k) : f; ph += 2 * Math.PI * f_ / SR;
    const env = Math.min(1, i / (.01 * SR)) * Math.pow(.0008 / vol, k) * vol;
    buf[s0 + i] += wave(type, ph) * env;
  }
}
function noise(t0, dur, vol = .2, fq = 1200) {
  const s0 = Math.floor(t0 * SR), n = Math.floor(dur * SR); let y1 = 0, y2 = 0;
  const w = 2 * Math.PI * fq / SR, q = 1.2, al = Math.sin(w) / (2 * q), a0 = 1 + al;
  const b0 = al / a0, b2 = -al / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - al) / a0; let x1 = 0, x2 = 0;
  for (let i = 0; i < n && s0 + i < N; i++) {
    const x = rnd() * (1 - i / n), y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y;
    buf[s0 + i] += y * vol;
  }
}
const SFX = {
  chime: t => { tone(t, 880, .35, 'sine', .22); tone(t, 1320, .5, 'sine', .2, .12) },
  buzz: t => { tone(t, 140, .55, 'sawtooth', .16); tone(t, 147, .55, 'square', .08) },
  ding: t => { tone(t, 1760, 1, 'sine', .18); tone(t, 2640, .6, 'sine', .08) },
  pop: t => tone(t, 420, .1, 'sine', .25, 0, 900),
  whoosh: t => noise(t, .35, .35, 900),
  zap: t => { tone(t, 300, .3, 'sawtooth', .08, 0, 1400); noise(t, .2, .2, 3000) },
  drop: t => tone(t, 160, .18, 'sine', .35, 0, 60),
  coin: t => { tone(t, 988, .08, 'square', .08); tone(t, 1319, .25, 'square', .08, .08) },
  whistle: t => { tone(t, 2600, .6, 'sine', .18, 0, 2500); tone(t, 2650, .6, 'triangle', .08) },
  tick: t => tone(t, 1500, .05, 'square', .05),
  tada: t => { [523, 659, 784, 1047].forEach((f, i) => tone(t, f, .5, 'triangle', .14, i * .09)); noise(t, .6, .12, 2500) },
};
events.forEach(e => SFX[e.type] && SFX[e.type](e.t));
const wav = Buffer.alloc(44 + N * 2);
wav.write('RIFF', 0); wav.writeUInt32LE(36 + N * 2, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 2, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i] * .9)) * 32767), 44 + i * 2);
const wavPath = out.replace(/\.mp4$/, '') + '.sfx.wav';
fs.writeFileSync(wavPath, wav);

// ---- video: pipe JPEG frames into ffmpeg ----
const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-i', wavPath, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-c:a', 'aac', '-b:a', '160k',
  '-shortest', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
const frames = Math.round(duration * FPS);
for (let f = 0; f < frames; f++) {
  const b64 = await page.evaluate(t => { window.FWP.renderAt(t); return document.getElementById('stage').toDataURL('image/jpeg', .93).split(',')[1] }, f / FPS);
  if (!ff.stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 300 === 0) console.log(`frame ${f}/${frames}`);
}
ff.stdin.end();
await new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
fs.unlinkSync(wavPath);
await browser.close();
console.log('listo:', out);
