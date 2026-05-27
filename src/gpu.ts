import { execa } from 'execa';

export interface GpuStats {
  name: string;
  utilizationGpu: number;
  utilizationMemory: number;
  memoryUsed: number;
  memoryTotal: number;
  temperature: number;
  powerDraw: number;
  powerLimit: number;
  fanSpeed: number;
}

export interface GpuProcess {
  pid: number;
  name: string;
  memoryUsed: number | null;
}

const STATS_QUERY = [
  'name',
  'utilization.gpu',
  'utilization.memory',
  'memory.used',
  'memory.total',
  'temperature.gpu',
  'power.draw',
  'power.limit',
  'fan.speed',
].join(',');

const PROC_QUERY = ['pid', 'process_name', 'used_memory'].join(',');

const CSV_FLAGS = '--format=csv,noheader,nounits';

function parseNumber(value: string): number {
  const cleaned = value.trim();
  if (!cleaned || cleaned === '[N/A]' || cleaned === '[Not Supported]') {
    return 0;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseOptionalNumber(value: string): number | null {
  const cleaned = value.trim();
  if (!cleaned || cleaned === '[N/A]' || cleaned === '[Not Supported]') {
    return null;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function basename(p: string): string {
  const trimmed = p.trim();
  if (!trimmed) return 'unknown';
  const last = trimmed.split(/[\\/]/).pop();
  return last && last.length > 0 ? last : trimmed;
}

export async function fetchGpuStats(): Promise<GpuStats[]> {
  const { stdout } = await execa('nvidia-smi', [
    `--query-gpu=${STATS_QUERY}`,
    CSV_FLAGS,
  ]);

  return stdout
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const cols = line.split(',').map(c => c.trim());
      return {
        name: cols[0] ?? 'Unknown GPU',
        utilizationGpu: parseNumber(cols[1] ?? ''),
        utilizationMemory: parseNumber(cols[2] ?? ''),
        memoryUsed: parseNumber(cols[3] ?? ''),
        memoryTotal: parseNumber(cols[4] ?? ''),
        temperature: parseNumber(cols[5] ?? ''),
        powerDraw: parseNumber(cols[6] ?? ''),
        powerLimit: parseNumber(cols[7] ?? ''),
        fanSpeed: parseNumber(cols[8] ?? ''),
      } satisfies GpuStats;
    });
}

export async function fetchGpuProcesses(): Promise<GpuProcess[]> {
  const { stdout } = await execa('nvidia-smi', [
    `--query-compute-apps=${PROC_QUERY}`,
    CSV_FLAGS,
  ]);

  return stdout
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const cols = line.split(',').map(c => c.trim());
      const rawName = cols[1] ?? '';
      const name =
        rawName === '[Insufficient Permissions]'
          ? '(permission denied)'
          : basename(rawName);
      return {
        pid: parseNumber(cols[0] ?? ''),
        name,
        memoryUsed: parseOptionalNumber(cols[2] ?? ''),
      } satisfies GpuProcess;
    })
    .filter(p => p.pid > 0);
}

export interface GpuSnapshot {
  stats: GpuStats[];
  processes: GpuProcess[];
  timestamp: number;
}

export async function fetchSnapshot(): Promise<GpuSnapshot> {
  const [stats, processes] = await Promise.all([
    fetchGpuStats(),
    fetchGpuProcesses().catch(() => []),
  ]);
  return { stats, processes, timestamp: Date.now() };
}
