import React from 'react';
import { Box, Text } from 'ink';
import { GpuProcess } from '../gpu.js';

interface ProcessTableProps {
  processes: GpuProcess[];
  maxRows?: number;
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, Math.max(0, max - 1)) + '…';
}

function formatMem(mb: number | null): string {
  if (mb === null) return '—';
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb} MB`;
}

const PID_COL = 8;
const NAME_COL = 42;
const VRAM_COL = 12;

export const ProcessTable: React.FC<ProcessTableProps> = ({
  processes,
  maxRows = 10,
}) => {
  const sorted = [...processes].sort((a, b) => {
    const am = a.memoryUsed ?? -1;
    const bm = b.memoryUsed ?? -1;
    return bm - am;
  });
  const rows = sorted.slice(0, maxRows);
  const remaining = Math.max(0, sorted.length - rows.length);

  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      flexDirection="column"
      paddingX={1}
    >
      <Box>
        <Text color="cyan" bold>GPU Processes</Text>
        <Text color="gray">  ({processes.length} active)</Text>
      </Box>
      <Box marginTop={0}>
        <Box width={PID_COL}><Text color="gray" bold>PID</Text></Box>
        <Box width={NAME_COL}><Text color="gray" bold>Process</Text></Box>
        <Box width={VRAM_COL}><Text color="gray" bold>VRAM</Text></Box>
      </Box>
      {rows.length === 0 ? (
        <Box marginTop={0}>
          <Text color="gray" italic>
            No active GPU processes.
          </Text>
        </Box>
      ) : (
        rows.map(p => (
          <Box key={p.pid}>
            <Box width={PID_COL}><Text color="white">{p.pid}</Text></Box>
            <Box width={NAME_COL}>
              <Text color="white">{truncate(p.name, NAME_COL - 2)}</Text>
            </Box>
            <Box width={VRAM_COL}>
              <Text color={p.memoryUsed === null ? 'gray' : 'blueBright'}>
                {formatMem(p.memoryUsed)}
              </Text>
            </Box>
          </Box>
        ))
      )}
      {remaining > 0 ? (
        <Box marginTop={0}>
          <Text color="gray" italic>
            …and {remaining} more
          </Text>
        </Box>
      ) : null}
    </Box>
  );
};
