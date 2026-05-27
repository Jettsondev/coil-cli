import React from 'react';
import { Box, Text } from 'ink';

interface FooterProps {
  version: string;
  refreshMs: number;
  errored?: boolean;
  toast?: string | null;
}

export const Footer: React.FC<FooterProps> = ({
  version,
  refreshMs,
  errored,
  toast,
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
      <Text color="gray">Press </Text>
      <Text color="blueBright" bold>S</Text>
      <Text color="gray"> to share · </Text>
      <Text color="blueBright" bold>Q</Text>
      <Text color="gray"> to quit · refreshing every {refreshMs / 1000}s · </Text>
      <Text color="magenta" bold>coil v{version}</Text>
      {errored ? <Text color="red"> · ⚠ nvidia-smi error</Text> : null}
    </Box>
  );
};
