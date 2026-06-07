import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Box, useApp, useInput, useStdin, useStdout } from 'ink';
import {
  fetchSnapshot,
  GpuSnapshot,
  GpuStats,
  processesForGpu,
} from './gpu.js';
import { Header } from './components/Header.js';
import { Footer } from './components/Footer.js';
import { StatCard } from './components/StatCard.js';
import { ProcessTable } from './components/ProcessTable.js';
import { ErrorPanel } from './components/ErrorPanel.js';
import {
  severityForPercent,
  severityForTemp,
  clampPct,
} from './theme.js';
import { generateShareCard } from './share.js';
import { CoilConfig } from './config.js';
import { History } from './history.js';
import { AlertManager } from './alerts.js';

interface AppProps {
  version: string;
  refreshMs: number;
  config: CoilConfig;
}

function formatMemory(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb} MB`;
}

// Header (≈9) + two stat rows w/ sparklines (≈10) + footer (≈2) + chrome.
const FIXED_UI_HEIGHT = 30;
const MIN_TABLE_ROWS = 3;
const MAX_TABLE_ROWS = 10;
const HISTORY_LEN = 120;

const PLACEHOLDER: GpuStats = {
  index: 0,
  uuid: 'placeholder',
  name: 'querying nvidia-smi…',
  utilizationGpu: 0,
  utilizationMemory: 0,
  memoryUsed: 0,
  memoryTotal: 0,
  temperature: 0,
  powerDraw: 0,
  powerLimit: 0,
  fanSpeed: 0,
};

export const App: React.FC<AppProps> = ({ version, refreshMs, config }) => {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();
  const { stdout } = useStdout();
  const [terminalRows, setTerminalRows] = useState<number>(stdout?.rows ?? 40);
  const [snapshot, setSnapshot] = useState<GpuSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [focused, setFocused] = useState<number>(0);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);
  const sharingRef = useRef<boolean>(false);
  const snapshotRef = useRef<GpuSnapshot | null>(null);
  snapshotRef.current = snapshot;
  const focusedRef = useRef<number>(0);
  focusedRef.current = focused;

  const history = useRef<History>(new History(HISTORY_LEN));
  const alerts = useRef<AlertManager>(
    new AlertManager(config.alerts, config.thresholds),
  );

  const procFilter = useMemo(() => {
    if (!config.processFilter) return null;
    try {
      return new RegExp(config.processFilter, 'i');
    } catch {
      return null; // invalid regex — silently ignore, validated at CLI layer
    }
  }, [config.processFilter]);

  const showToast = useCallback((message: string, ms = 2200) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), ms);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!stdout) return;
    const onResize = () => setTerminalRows(stdout.rows ?? 40);
    stdout.on('resize', onResize);
    return () => {
      stdout.off('resize', onResize);
    };
  }, [stdout]);

  const maxProcessRows = Math.max(
    MIN_TABLE_ROWS,
    Math.min(MAX_TABLE_ROWS, terminalRows - FIXED_UI_HEIGHT),
  );

  const tick = useCallback(async () => {
    if (sharingRef.current) return;
    try {
      const snap = await fetchSnapshot();
      history.current.record(snap.stats);
      const alertMsg = alerts.current.update(snap.stats);
      setSnapshot(snap);
      setError(null);
      // Keep focus in range if a GPU disappears (e.g. driver reset).
      if (focusedRef.current >= snap.stats.length && snap.stats.length > 0) {
        setFocused(snap.stats.length - 1);
      }
      if (alertMsg) showToast(alertMsg, 3200);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    }
  }, [showToast]);

  const switchGpu = useCallback(
    (delta: number) => {
      const count = snapshotRef.current?.stats.length ?? 0;
      if (count <= 1) return;
      setFocused(prev => (prev + delta + count) % count);
    },
    [],
  );

  const handleShare = useCallback(async () => {
    if (sharingRef.current) return;
    const snap = snapshotRef.current;
    const gpu = snap?.stats[focusedRef.current] ?? snap?.stats[0];
    if (!gpu || !snap) {
      showToast('⚠ No GPU snapshot yet — try again in a moment.');
      return;
    }
    sharingRef.current = true;
    showToast('… generating share card');
    try {
      const procs = processesForGpu(snap.processes, gpu, snap.stats.length);
      const result = await generateShareCard(gpu, procs);
      const clipNote =
        result.clipboard === 'image'
          ? ' · copied to clipboard'
          : result.clipboard === 'path-text'
          ? ' · path copied to clipboard'
          : '';
      showToast(`✓ Saved ${result.filePath}${clipNote}`, 3200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`⚠ Share failed: ${msg}`, 3200);
    } finally {
      setTimeout(() => {
        sharingRef.current = false;
      }, 500);
    }
  }, [showToast]);

  useEffect(() => {
    void tick();
    const id = setInterval(() => {
      void tick();
    }, refreshMs);
    return () => clearInterval(id);
  }, [tick, refreshMs]);

  useInput(
    (input, key) => {
      if (input === 'q' || input === 'Q' || (key.ctrl && input === 'c')) {
        exit();
        return;
      }
      if (input === 's' || input === 'S') {
        void handleShare();
        return;
      }
      if (key.leftArrow || (key.shift && key.tab)) {
        switchGpu(-1);
        return;
      }
      if (key.rightArrow || key.tab) {
        switchGpu(1);
        return;
      }
      // Number keys jump straight to a GPU index.
      if (/^[0-9]$/.test(input)) {
        const target = Number(input);
        const count = snapshotRef.current?.stats.length ?? 0;
        if (target < count) setFocused(target);
      }
    },
    { isActive: Boolean(isRawModeSupported) },
  );

  useEffect(() => {
    const onSignal = () => exit();
    process.on('SIGINT', onSignal);
    process.on('SIGTERM', onSignal);
    return () => {
      process.off('SIGINT', onSignal);
      process.off('SIGTERM', onSignal);
    };
  }, [exit]);

  if (error && !snapshot) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={0}>
        <ErrorPanel message={error} />
        <Footer version={version} refreshMs={refreshMs} errored />
      </Box>
    );
  }

  if (snapshot && snapshot.stats.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={0}>
        <ErrorPanel message="nvidia-smi returned no GPUs." />
        <Footer version={version} refreshMs={refreshMs} errored />
      </Box>
    );
  }

  const allStats = snapshot?.stats ?? [];
  const focusedIdx = Math.min(focused, Math.max(0, allStats.length - 1));
  const gpu = allStats[focusedIdx] ?? PLACEHOLDER;
  const t = config.thresholds;

  let processes = snapshot
    ? processesForGpu(snapshot.processes, gpu, allStats.length)
    : [];
  if (procFilter) processes = processes.filter(p => procFilter.test(p.name));

  const memPct = gpu.memoryTotal > 0
    ? (gpu.memoryUsed / gpu.memoryTotal) * 100
    : 0;
  const powerPct = gpu.powerLimit > 0
    ? (gpu.powerDraw / gpu.powerLimit) * 100
    : 0;
  const tempPct = clampPct((gpu.temperature / 100) * 100);

  const hist = history.current.get(gpu.uuid);

  return (
    <Box flexDirection="column" paddingX={1} paddingY={0}>
      <Header
        gpuName={gpu.name}
        driverInfo={gpu.fanSpeed > 0 ? `Fan ${gpu.fanSpeed}%` : undefined}
        gpus={allStats}
        focused={focusedIdx}
      />

      <Box flexDirection="row">
        <StatCard
          title="GPU UTILIZATION"
          value={`${gpu.utilizationGpu}%`}
          percent={gpu.utilizationGpu}
          severity={severityForPercent(gpu.utilizationGpu, t.util)}
          history={hist.util}
        />
        <StatCard
          title="VRAM"
          value={formatMemory(gpu.memoryUsed)}
          subValue={`/ ${formatMemory(gpu.memoryTotal)}`}
          percent={memPct}
          severity={severityForPercent(memPct, t.mem)}
          history={hist.mem}
        />
      </Box>

      <Box flexDirection="row">
        <StatCard
          title="TEMPERATURE"
          value={`${gpu.temperature}°C`}
          percent={tempPct}
          severity={severityForTemp(gpu.temperature, t.temp)}
          history={hist.temp}
        />
        <StatCard
          title="POWER"
          value={`${gpu.powerDraw.toFixed(1)} W`}
          subValue={`/ ${gpu.powerLimit.toFixed(0)} W`}
          percent={powerPct}
          severity={severityForPercent(powerPct, t.power)}
          history={hist.power}
        />
      </Box>

      <ProcessTable processes={processes} maxRows={maxProcessRows} />

      <Footer
        version={version}
        refreshMs={refreshMs}
        errored={Boolean(error)}
        toast={toast}
        multiGpu={allStats.length > 1}
        alertsOn={alerts.current.enabled}
      />
    </Box>
  );
};
