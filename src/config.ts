import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

/** A warn/crit threshold pair, in the metric's natural units. */
export interface Threshold {
  warn: number;
  crit: number;
}

export interface Thresholds {
  /** GPU utilization, percent. */
  util: Threshold;
  /** VRAM usage, percent of total. */
  mem: Threshold;
  /** Temperature, degrees Celsius. */
  temp: Threshold;
  /** Power draw, percent of limit. */
  power: Threshold;
}

export interface AlertConfig {
  /** Master switch. When false, no bell and no notifications. */
  enabled: boolean;
  /** Ring the terminal bell when a metric crosses into crit. */
  bell: boolean;
  /** Fire a native desktop notification on crit transitions. */
  desktop: boolean;
}

export interface CoilConfig {
  thresholds: Thresholds;
  /** Default refresh interval (ms). Overridden by --interval. */
  interval: number;
  /** Only show processes whose name matches this regex (case-insensitive). */
  processFilter: string | null;
  alerts: AlertConfig;
}

export const DEFAULT_CONFIG: CoilConfig = {
  thresholds: {
    util: { warn: 60, crit: 85 },
    mem: { warn: 60, crit: 85 },
    temp: { warn: 70, crit: 80 },
    power: { warn: 60, crit: 85 },
  },
  interval: 1000,
  processFilter: null,
  alerts: { enabled: false, bell: true, desktop: false },
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function mergeThreshold(base: Threshold, raw: unknown): Threshold {
  if (!isObject(raw)) return base;
  const warn = typeof raw.warn === 'number' ? raw.warn : base.warn;
  const crit = typeof raw.crit === 'number' ? raw.crit : base.crit;
  return { warn, crit };
}

/** Merge a parsed JSON object over the defaults, ignoring unknown keys. */
export function mergeConfig(
  raw: unknown,
  base: CoilConfig = DEFAULT_CONFIG,
): CoilConfig {
  if (!isObject(raw)) return base;

  const t = isObject(raw.thresholds) ? raw.thresholds : {};
  const a = isObject(raw.alerts) ? raw.alerts : {};

  return {
    thresholds: {
      util: mergeThreshold(base.thresholds.util, t.util),
      mem: mergeThreshold(base.thresholds.mem, t.mem),
      temp: mergeThreshold(base.thresholds.temp, t.temp),
      power: mergeThreshold(base.thresholds.power, t.power),
    },
    interval:
      typeof raw.interval === 'number' && raw.interval >= 100
        ? raw.interval
        : base.interval,
    processFilter:
      typeof raw.processFilter === 'string' && raw.processFilter.trim()
        ? raw.processFilter.trim()
        : base.processFilter,
    alerts: {
      enabled:
        typeof a.enabled === 'boolean' ? a.enabled : base.alerts.enabled,
      bell: typeof a.bell === 'boolean' ? a.bell : base.alerts.bell,
      desktop:
        typeof a.desktop === 'boolean' ? a.desktop : base.alerts.desktop,
    },
  };
}

/** Candidate config paths, in priority order. */
export function configPaths(): string[] {
  const home = os.homedir();
  return [
    path.join(home, '.coilrc'),
    path.join(home, '.coilrc.json'),
    path.join(home, '.config', 'coil', 'config.json'),
  ];
}

export interface LoadedConfig {
  config: CoilConfig;
  /** Path the config was read from, or null if defaults were used. */
  source: string | null;
  /** Non-fatal problem (e.g. malformed JSON) to surface to the user. */
  warning: string | null;
}

/**
 * Load and merge the first config file that exists. Missing files are fine
 * (defaults). A malformed file is reported as a warning but never throws —
 * coil should always start.
 */
export async function loadConfig(): Promise<LoadedConfig> {
  for (const file of configPaths()) {
    let text: string;
    try {
      text = await readFile(file, 'utf8');
    } catch {
      continue; // not found / unreadable — try next candidate
    }
    try {
      const parsed = JSON.parse(text);
      return { config: mergeConfig(parsed), source: file, warning: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        config: DEFAULT_CONFIG,
        source: file,
        warning: `Ignoring ${file}: invalid JSON (${msg})`,
      };
    }
  }
  return { config: DEFAULT_CONFIG, source: null, warning: null };
}
