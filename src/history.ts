import type { GpuStats } from './gpu.js';

/** The four metrics we keep history for, per GPU. */
export interface MetricHistory {
  util: number[];
  temp: number[];
  power: number[];
  mem: number[];
}

const EMPTY: MetricHistory = { util: [], temp: [], power: [], mem: [] };

/**
 * Fixed-capacity ring of recent samples, keyed by GPU UUID so history stays
 * attached to the right card even as you switch focus. Plain mutable class —
 * one instance lives for the process lifetime in a React ref.
 */
export class History {
  private readonly capacity: number;
  private readonly byGpu = new Map<string, MetricHistory>();

  constructor(capacity = 60) {
    this.capacity = Math.max(2, capacity);
  }

  private push(arr: number[], value: number): void {
    arr.push(Number.isFinite(value) ? value : 0);
    if (arr.length > this.capacity) arr.shift();
  }

  /** Record one sample for every GPU in a snapshot. */
  record(stats: GpuStats[]): void {
    for (const g of stats) {
      let h = this.byGpu.get(g.uuid);
      if (!h) {
        h = { util: [], temp: [], power: [], mem: [] };
        this.byGpu.set(g.uuid, h);
      }
      this.push(h.util, g.utilizationGpu);
      this.push(h.temp, g.temperature);
      this.push(
        h.power,
        g.powerLimit > 0 ? (g.powerDraw / g.powerLimit) * 100 : 0,
      );
      this.push(
        h.mem,
        g.memoryTotal > 0 ? (g.memoryUsed / g.memoryTotal) * 100 : 0,
      );
    }
  }

  get(uuid: string): MetricHistory {
    return this.byGpu.get(uuid) ?? EMPTY;
  }
}

const SPARK_CHARS = '▁▂▃▄▅▆▇█';

/**
 * Render a series as a unicode sparkline of fixed width, scaled to [min, max].
 * Right-aligned (newest sample on the right); pads on the left while warming up.
 */
export function sparkline(
  values: number[],
  width: number,
  min = 0,
  max = 100,
): string {
  if (width <= 0) return '';
  const slice = values.slice(-width);
  const span = max - min || 1;
  const body = slice
    .map(v => {
      const norm = Math.max(0, Math.min(1, (v - min) / span));
      const idx = Math.round(norm * (SPARK_CHARS.length - 1));
      return SPARK_CHARS[idx];
    })
    .join('');
  if (body.length >= width) return body;
  return ' '.repeat(width - body.length) + body;
}
