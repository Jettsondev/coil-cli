import React from 'react';
import { Box, Text } from 'ink';
import { Bar } from './Bar.js';
import { Sparkline } from './Sparkline.js';
import { Severity, severityColor } from '../theme.js';

interface StatCardProps {
  title: string;
  value: string;
  subValue?: string;
  percent: number;
  severity: Severity;
  width?: number;
  /** Recent samples for the inline trend sparkline. */
  history?: number[];
  /** Scale bounds for the sparkline (defaults to 0–100). */
  historyMin?: number;
  historyMax?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subValue,
  percent,
  severity,
  width = 32,
  history,
  historyMin = 0,
  historyMax = 100,
}) => {
  const color = severityColor[severity];
  const inner = width - 4;

  return (
    <Box
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
      flexDirection="column"
      width={width}
      marginRight={1}
    >
      <Text color="cyan" bold>
        {title}
      </Text>
      <Box marginTop={0}>
        <Text color={color} bold>
          {value}
        </Text>
        {subValue ? <Text color="gray">  {subValue}</Text> : null}
      </Box>
      <Box marginTop={0}>
        <Bar percent={percent} severity={severity} width={inner} />
      </Box>
      {history && history.length > 1 ? (
        <Box marginTop={0}>
          <Sparkline
            values={history}
            width={inner}
            min={historyMin}
            max={historyMax}
            severity={severity}
          />
        </Box>
      ) : null}
    </Box>
  );
};
