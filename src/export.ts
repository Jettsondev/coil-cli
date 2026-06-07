import { fetchSnapshot, GpuSnapshot, GpuStats, processesForGpu } from './gpu.js';

function pct(used: number, total: number): number {
  return total > 0 ? (used / total) * 100 : 0;
}

/** Plain, stable JSON shape for scripts. One object per GPU, plus a timestamp. */
export function snapshotToJson(
  snap: GpuSnapshot,
  filter?: RegExp | null,
): unknown {
  return {
    timestamp: snap.timestamp,
    gpuCount: snap.stats.length,
    gpus: snap.stats.map(g => {
      let procs = processesForGpu(snap.processes, g, snap.stats.length);
      if (filter) procs = procs.filter(p => filter.test(p.name));
      return {
        index: g.index,
        uuid: g.uuid,
        name: g.name,
        utilizationGpu: g.utilizationGpu,
        utilizationMemory: g.utilizationMemory,
        memoryUsedMb: g.memoryUsed,
        memoryTotalMb: g.memoryTotal,
        memoryPercent: Number(pct(g.memoryUsed, g.memoryTotal).toFixed(1)),
        temperatureC: g.temperature,
        powerDrawW: g.powerDraw,
        powerLimitW: g.powerLimit,
        powerPercent: Number(pct(g.powerDraw, g.powerLimit).toFixed(1)),
        fanSpeedPct: g.fanSpeed,
        processes: procs.map(p => ({
          pid: p.pid,
          name: p.name,
          memoryUsedMb: p.memoryUsed,
        })),
      };
    }),
  };
}

function promLine(
  name: string,
  labels: Record<string, string | number>,
  value: number,
): string {
  const lbl = Object.entries(labels)
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, '\\"')}"`)
    .join(',');
  return `${name}{${lbl}} ${value}`;
}

const PROM_METRICS: Array<{
  name: string;
  help: string;
  value: (g: GpuStats) => number;
}> = [
  {
    name: 'coil_gpu_utilization_percent',
    help: 'GPU compute utilization (percent).',
    value: g => g.utilizationGpu,
  },
  {
    name: 'coil_gpu_memory_used_bytes',
    help: 'VRAM used (bytes).',
    value: g => g.memoryUsed * 1024 * 1024,
  },
  {
    name: 'coil_gpu_memory_total_bytes',
    help: 'VRAM total (bytes).',
    value: g => g.memoryTotal * 1024 * 1024,
  },
  {
    name: 'coil_gpu_temperature_celsius',
    help: 'GPU core temperature (Celsius).',
    value: g => g.temperature,
  },
  {
    name: 'coil_gpu_power_watts',
    help: 'GPU power draw (watts).',
    value: g => g.powerDraw,
  },
  {
    name: 'coil_gpu_power_limit_watts',
    help: 'GPU power limit (watts).',
    value: g => g.powerLimit,
  },
  {
    name: 'coil_gpu_fan_speed_percent',
    help: 'GPU fan speed (percent).',
    value: g => g.fanSpeed,
  },
];

/** Prometheus text exposition format (one block per metric, HELP/TYPE + samples). */
export function snapshotToProm(snap: GpuSnapshot): string {
  const lines: string[] = [];
  for (const m of PROM_METRICS) {
    lines.push(`# HELP ${m.name} ${m.help}`);
    lines.push(`# TYPE ${m.name} gauge`);
    for (const g of snap.stats) {
      lines.push(
        promLine(
          m.name,
          { gpu: g.index, uuid: g.uuid, name: g.name },
          m.value(g),
        ),
      );
    }
  }
  return lines.join('\n') + '\n';
}

/** One-shot: print a single snapshot in the chosen format, then return. */
export async function runOneShotExport(
  format: 'json' | 'prom',
  filter?: RegExp | null,
): Promise<void> {
  const snap = await fetchSnapshot();
  if (format === 'json') {
    process.stdout.write(
      JSON.stringify(snapshotToJson(snap, filter), null, 2) + '\n',
    );
  } else {
    process.stdout.write(snapshotToProm(snap));
  }
}

/**
 * Streaming NDJSON: one compact JSON object per line, per interval, until the
 * process is killed. Ideal for piping into a log or a dashboard.
 */
export async function runWatchJson(
  intervalMs: number,
  filter?: RegExp | null,
): Promise<void> {
  const emit = async () => {
    try {
      const snap = await fetchSnapshot();
      process.stdout.write(JSON.stringify(snapshotToJson(snap, filter)) + '\n');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`coil: ${msg}\n`);
    }
  };
  await emit();
  const id = setInterval(() => void emit(), intervalMs);
  await new Promise<void>(resolve => {
    const stop = () => {
      clearInterval(id);
      resolve();
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  });
}
