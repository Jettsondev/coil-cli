// One-off script to render a sample share card for design review.
// Run with: node scripts/test-card.mjs
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateShareCard } from '../dist/share.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Mixed severities so the design review sees ok / warn / crit colors at once.
const stats = {
  name: 'NVIDIA GeForce RTX 5070',
  utilizationGpu: 91,       // crit (red)
  utilizationMemory: 31,
  memoryUsed: 3820,         // 31% → ok (blue)
  memoryTotal: 12227,
  temperature: 72,          // warn (yellow)
  powerDraw: 132.5,         // 53% → ok (blue)
  powerLimit: 250,
  fanSpeed: 56,
};

const processes = [
  { pid: 4821, name: 'python.exe', memoryUsed: 6420 },
  { pid: 19672, name: 'msedgewebview2.exe', memoryUsed: 1284 },
  { pid: 7380, name: 'explorer.exe', memoryUsed: 412 },
  { pid: 18320, name: 'RazerAppEngine.exe', memoryUsed: 184 },
];

const result = await generateShareCard(stats, processes, {
  outDir: projectRoot,
  version: '0.2.0',
  now: new Date('2026-05-27T14:47:00'),
  skipClipboard: true,
});

console.log('SAVED:', result.filePath);
console.log('CLIPBOARD:', result.clipboard);
