import React from 'react';
import { Text } from 'ink';
import { sparkline } from '../history.js';
import { severityColor, Severity } from '../theme.js';

interface SparklineProps {
  values: number[];
  width?: number;
  min?: number;
  max?: number;
  severity?: Severity;
}

export const Sparkline: React.FC<SparklineProps> = ({
  values,
  width = 24,
  min = 0,
  max = 100,
  severity = 'ok',
}) => {
  const line = sparkline(values, width, min, max);
  return <Text color={severityColor[severity]}>{line}</Text>;
};
