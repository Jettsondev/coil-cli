import type { Threshold } from './config.js';

export type Severity = 'ok' | 'warn' | 'crit';

/** Default thresholds, used when no config is supplied. */
const DEFAULT_PCT: Threshold = { warn: 60, crit: 85 };
const DEFAULT_TEMP: Threshold = { warn: 70, crit: 80 };

/** Severity of a percentage against a warn/crit threshold pair. */
export function severityForPercent(
  pct: number,
  t: Threshold = DEFAULT_PCT,
): Severity {
  if (pct >= t.crit) return 'crit';
  if (pct >= t.warn) return 'warn';
  return 'ok';
}

/** Severity of a temperature (°C) against a warn/crit threshold pair. */
export function severityForTemp(
  tempC: number,
  t: Threshold = DEFAULT_TEMP,
): Severity {
  if (tempC >= t.crit) return 'crit';
  if (tempC >= t.warn) return 'warn';
  return 'ok';
}

export const severityColor: Record<Severity, string> = {
  ok: 'blueBright',
  warn: 'yellow',
  crit: 'red',
};

export function clampPct(pct: number): number {
  if (!Number.isFinite(pct)) return 0;
  if (pct < 0) return 0;
  if (pct > 100) return 100;
  return pct;
}
