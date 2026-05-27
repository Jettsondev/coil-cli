import React from 'react';
import { Box, Text } from 'ink';
import { clampPct, severityColor, Severity } from '../theme.js';

interface BarProps {
  percent: number;
  severity: Severity;
  width?: number;
  filledChar?: string;
  emptyChar?: string;
}

export const Bar: React.FC<BarProps> = ({
  percent,
  severity,
  width = 24,
  filledChar = '█',
  emptyChar = '░',
}) => {
  const pct = clampPct(percent);
  const filled = Math.round((pct / 100) * width);
  const empty = Math.max(0, width - filled);
  const color = severityColor[severity];

  return (
    <Box>
      <Text color={color}>{filledChar.repeat(filled)}</Text>
      <Text color="gray">{emptyChar.repeat(empty)}</Text>
    </Box>
  );
};
