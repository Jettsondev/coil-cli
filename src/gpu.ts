import { execa } from 'execa';

export interface GpuStats {
  index: number;
  uuid: string;
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
  /** UUID of the GPU this process is running on (for multi-GPU mapping). */
  gpuUuid: string | null;
}

const STATS_QUERY = [
  'index',
  'uuid',
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

const PROC_QUERY = ['pid', 'process_name', 'used_memory', 'gpu_uuid'].join(',');

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

function cleanString(value: string | undefined, fallback: string): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed || trimmed === '[N/A]' || trimmed === '[Not Supported]') {
    return fallback;
  }
  return trimmed;
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
    .map((line, i) => {
      const cols = line.split(',').map(c => c.trim());
      return {
        index: cols[0] != null && cols[0] !== '' ? parseNumber(cols[0]) : i,
        uuid: cleanString(cols[1], `gpu-${i}`),
        name: cleanString(cols[2], 'Unknown GPU'),
        utilizationGpu: parseNumber(cols[3] ?? ''),
        utilizationMemory: parseNumber(cols[4] ?? ''),
        memoryUsed: parseNumber(cols[5] ?? ''),
        memoryTotal: parseNumber(cols[6] ?? ''),
        temperature: parseNumber(cols[7] ?? ''),
        powerDraw: parseNumber(cols[8] ?? ''),
        powerLimit: parseNumber(cols[9] ?? ''),
        fanSpeed: parseNumber(cols[10] ?? ''),
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
      const rawUuid = (cols[3] ?? '').trim();
      return {
        pid: parseNumber(cols[0] ?? ''),
        name,
        memoryUsed: parseOptionalNumber(cols[2] ?? ''),
        gpuUuid: rawUuid && rawUuid !== '[N/A]' ? rawUuid : null,
      } satisfies GpuProcess;
    })
    .filter(p => p.pid > 0);
}

/**
 * Processes belonging to a given GPU. If processes carry no UUID (older
 * drivers, or single-GPU boxes where the mapping is unambiguous) we fall back
 * to showing all of them — better to over-report than hide a running job.
 */
export function processesForGpu(
  processes: GpuProcess[],
  gpu: GpuStats,
  totalGpus: number,
): GpuProcess[] {
  const anyTagged = processes.some(p => p.gpuUuid != null);
  if (!anyTagged || totalGpus <= 1) return processes;
  return processes.filter(p => p.gpuUuid === null || p.gpuUuid === gpu.uuid);
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
