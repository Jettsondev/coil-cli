export type Severity = 'ok' | 'warn' | 'crit';

export function severityForPercent(pct: number): Severity {
  if (pct >= 85) return 'crit';
  if (pct >= 60) return 'warn';
  return 'ok';
}

export function severityForTemp(tempC: number): Severity {
  if (tempC >= 80) return 'crit';
  if (tempC >= 70) return 'warn';
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
