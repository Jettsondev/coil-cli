import React, { useEffect, useState, useCallback } from 'react';
import { Box, useApp, useInput, useStdin, useStdout } from 'ink';
import { fetchSnapshot, GpuSnapshot } from './gpu.js';
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

interface AppProps {
  version: string;
  refreshMs: number;
}

function formatMemory(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb} MB`;
}

const FIXED_UI_HEIGHT = 26;
const MIN_TABLE_ROWS = 3;
const MAX_TABLE_ROWS = 10;

export const App: React.FC<AppProps> = ({ version, refreshMs }) => {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();
  const { stdout } = useStdout();
  const [terminalRows, setTerminalRows] = useState<number>(
    stdout?.rows ?? 40,
  );
  const [snapshot, setSnapshot] = useState<GpuSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const snap = await fetchSnapshot();
      setSnapshot(snap);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err);
      setError(message);
    }
  }, []);

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

  const gpu = snapshot?.stats[0] ?? {
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
  const processes = snapshot?.processes ?? [];

  if (snapshot && !gpu) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={0}>
        <ErrorPanel message="nvidia-smi returned no GPUs." />
        <Footer version={version} refreshMs={refreshMs} errored />
      </Box>
    );
  }

  const memPct = gpu.memoryTotal > 0
    ? (gpu.memoryUsed / gpu.memoryTotal) * 100
    : 0;
  const powerPct = gpu.powerLimit > 0
    ? (gpu.powerDraw / gpu.powerLimit) * 100
    : 0;
  const tempPct = clampPct((gpu.temperature / 100) * 100);

  return (
    <Box flexDirection="column" paddingX={1} paddingY={0}>
      <Header
        gpuName={gpu.name}
        driverInfo={
          gpu.fanSpeed > 0 ? `Fan ${gpu.fanSpeed}%` : undefined
        }
      />

      <Box flexDirection="row">
        <StatCard
          title="GPU UTILIZATION"
          value={`${gpu.utilizationGpu}%`}
          percent={gpu.utilizationGpu}
          severity={severityForPercent(gpu.utilizationGpu)}
        />
        <StatCard
          title="VRAM"
          value={formatMemory(gpu.memoryUsed)}
          subValue={`/ ${formatMemory(gpu.memoryTotal)}`}
          percent={memPct}
          severity={severityForPercent(memPct)}
        />
      </Box>

      <Box flexDirection="row">
        <StatCard
          title="TEMPERATURE"
          value={`${gpu.temperature}°C`}
          percent={tempPct}
          severity={severityForTemp(gpu.temperature)}
        />
        <StatCard
          title="POWER"
          value={`${gpu.powerDraw.toFixed(1)} W`}
          subValue={`/ ${gpu.powerLimit.toFixed(0)} W`}
          percent={powerPct}
          severity={severityForPercent(powerPct)}
        />
      </Box>

      <ProcessTable
        processes={processes}
        maxRows={maxProcessRows}
      />

      <Footer
        version={version}
        refreshMs={refreshMs}
        errored={Boolean(error)}
      />
    </Box>
  );
};
