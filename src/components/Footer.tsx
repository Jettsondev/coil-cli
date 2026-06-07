import React from 'react';
import { Box, Text } from 'ink';

interface FooterProps {
  version: string;
  refreshMs: number;
  errored?: boolean;
  toast?: string | null;
  /** Show the ←/→ GPU-switch hint (multi-GPU rigs only). */
  multiGpu?: boolean;
  /** Show that alerts are armed. */
  alertsOn?: boolean;
}

export const Footer: React.FC<FooterProps> = ({
  version,
  refreshMs,
  errored,
  toast,
  multiGpu,
  alertsOn,
}) => {
  if (toast) {
    const color = toast.startsWith('⚠')
      ? 'red'
      : toast.startsWith('✓')
      ? 'blueBright'
      : 'gray';
    return (
      <Box paddingX={1}>
        <Text color={color} bold>
          {toast}
        </Text>
      </Box>
    );
  }

  return (
    <Box paddingX={1}>
      {multiGpu ? (
        <>
          <Text color="blueBright" bold>←/→</Text>
          <Text color="gray"> switch GPU · </Text>
        </>
      ) : null}
      <Text color="blueBright" bold>S</Text>
      <Text color="gray"> share · </Text>
      <Text color="blueBright" bold>Q</Text>
      <Text color="gray"> quit · {refreshMs / 1000}s · </Text>
      <Text color="magenta" bold>coil v{version}</Text>
      {alertsOn ? <Text color="yellow"> · 🔔 alerts</Text> : null}
      {errored ? <Text color="red"> · ⚠ nvidia-smi error</Text> : null}
    </Box>
  );
};
