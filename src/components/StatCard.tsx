import React from 'react';
import { Box, Text } from 'ink';
import { Bar } from './Bar.js';
import { Severity, severityColor } from '../theme.js';

interface StatCardProps {
  title: string;
  value: string;
  subValue?: string;
  percent: number;
  severity: Severity;
  width?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subValue,
  percent,
  severity,
  width = 32,
}) => {
  const color = severityColor[severity];

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
        <Bar percent={percent} severity={severity} width={width - 4} />
      </Box>
    </Box>
  );
};
