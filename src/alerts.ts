import { execa } from 'execa';
import type { GpuStats } from './gpu.js';
import type { AlertConfig, Thresholds } from './config.js';
import { severityForPercent, severityForTemp, Severity } from './theme.js';

type Metric = 'util' | 'mem' | 'temp' | 'power';

const METRIC_LABEL: Record<Metric, string> = {
  util: 'Utilization',
  mem: 'VRAM',
  temp: 'Temperature',
  power: 'Power',
};

/** Worst severity currently present on a GPU, with the offending metric. */
function evaluate(
  gpu: GpuStats,
  t: Thresholds,
): { metric: Metric; severity: Severity; detail: string } | null {
  const memPct =
    gpu.memoryTotal > 0 ? (gpu.memoryUsed / gpu.memoryTotal) * 100 : 0;
  const powerPct =
    gpu.powerLimit > 0 ? (gpu.powerDraw / gpu.powerLimit) * 100 : 0;

  const checks: Array<{ metric: Metric; severity: Severity; detail: string }> = [
    {
      metric: 'util',
      severity: severityForPercent(gpu.utilizationGpu, t.util),
      detail: `${gpu.utilizationGpu}%`,
    },
    {
      metric: 'mem',
      severity: severityForPercent(memPct, t.mem),
      detail: `${memPct.toFixed(0)}%`,
    },
    {
      metric: 'temp',
      severity: severityForTemp(gpu.temperature, t.temp),
      detail: `${gpu.temperature}°C`,
    },
    {
      metric: 'power',
      severity: severityForPercent(powerPct, t.power),
      detail: `${gpu.powerDraw.toFixed(0)}W`,
    },
  ];

  const crit = checks.find(c => c.severity === 'crit');
  return crit ?? null;
}

async function notifyDesktop(title: string, body: string): Promise<void> {
  try {
    if (process.platform === 'win32') {
      // Lightweight balloon via the dependency-free WinForms NotifyIcon path.
      // Loads System.Drawing for SystemIcons; -STA is required for NotifyIcon.
      const esc = (s: string) => s.replace(/'/g, "''");
      const script = [
        'Add-Type -AssemblyName System.Windows.Forms,System.Drawing;',
        '$n = New-Object System.Windows.Forms.NotifyIcon;',
        '$n.Icon = [System.Drawing.SystemIcons]::Warning;',
        '$n.Visible = $true;',
        `$n.ShowBalloonTip(5000, '${esc(title)}', '${esc(body)}', [System.Windows.Forms.ToolTipIcon]::Warning);`,
        'Start-Sleep -Milliseconds 6000; $n.Dispose();',
      ].join(' ');
      await execa('powershell', ['-NoProfile', '-STA', '-Command', script]);
      return;
    }
    if (process.platform === 'darwin') {
      const esc = (s: string) => s.replace(/"/g, '\\"');
      await execa('osascript', [
        '-e',
        `display notification "${esc(body)}" with title "${esc(title)}"`,
      ]);
      return;
    }
    await execa('notify-send', ['-u', 'critical', title, body]);
  } catch {
    // Notifications are best-effort; never let one break the monitor.
  }
}

/**
 * Tracks per-GPU alert state and fires on the *transition* into crit, so a card
 * sitting pegged at 90% doesn't ring the bell every second. Re-arms once the
 * GPU drops back out of crit.
 */
export class AlertManager {
  private readonly inCrit = new Map<string, Metric>();

  constructor(
    private readonly config: AlertConfig,
    private readonly thresholds: Thresholds,
  ) {}

  get enabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Feed the latest stats. Returns a human-readable message for any *new*
   * crit transition (for the TUI toast), or null. Side effects (bell, desktop
   * notification) fire here too.
   */
  update(stats: GpuStats[]): string | null {
    if (!this.config.enabled) return null;

    let firstMessage: string | null = null;

    for (const gpu of stats) {
      const hit = evaluate(gpu, this.thresholds);
      const prev = this.inCrit.get(gpu.uuid);

      if (hit) {
        // Only fire when entering crit, or when a *different* metric trips.
        if (prev !== hit.metric) {
          this.inCrit.set(gpu.uuid, hit.metric);
          const label = METRIC_LABEL[hit.metric];
          const title = `coil · GPU ${gpu.index} ${label} critical`;
          const body = `${gpu.name} — ${label} at ${hit.detail}`;
          if (!firstMessage) firstMessage = `⚠ ${title.replace('coil · ', '')}`;

          if (this.config.bell) process.stdout.write('\x07');
          if (this.config.desktop) void notifyDesktop(title, body);
        }
      } else if (prev) {
        this.inCrit.delete(gpu.uuid); // re-arm
      }
    }

    return firstMessage;
  }
}
