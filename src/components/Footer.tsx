import React from 'react';
import { Box, Text } from 'ink';

interface FooterProps {
  version: string;
  refreshMs: number;
  errored?: boolean;
}

export const Footer: React.FC<FooterProps> = ({
  version,
  refreshMs,
  errored,
}) => {
  return (
    <Box paddingX={1}>
      <Text color="gray">Press </Text>
      <Text color="cyan" bold>Q</Text>
      <Text color="gray"> to quit · refreshing every {refreshMs / 1000}s · </Text>
      <Text color="magenta" bold>coil v{version}</Text>
      {errored ? <Text color="red"> · ⚠ nvidia-smi error</Text> : null}
    </Box>
  );
};
