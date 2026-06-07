import React from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import type { GpuStats } from '../gpu.js';

interface HeaderProps {
  gpuName: string;
  driverInfo?: string;
  /** All GPUs, for the tab strip. */
  gpus?: GpuStats[];
  /** Index (into gpus) of the focused card. */
  focused?: number;
}

/** A compact "● 0  1  2" strip so multi-GPU rigs show what's focused. */
const GpuTabs: React.FC<{ gpus: GpuStats[]; focused: number }> = ({
  gpus,
  focused,
}) => (
  <Box marginTop={0}>
    <Text color="gray">GPU </Text>
    {gpus.map((g, i) => {
      const active = i === focused;
      return (
        <Box key={g.uuid} marginRight={1}>
          <Text
            color={active ? 'blueBright' : 'gray'}
            bold={active}
            inverse={active}
          >
            {` ${g.index} `}
          </Text>
        </Box>
      );
    })}
    <Text color="gray">  ·  {focused + 1}/{gpus.length}</Text>
  </Box>
);

export const Header: React.FC<HeaderProps> = ({
  gpuName,
  driverInfo,
  gpus,
  focused = 0,
}) => {
  const multi = gpus && gpus.length > 1;
  return (
    <Box
      borderStyle="round"
      borderColor="blueBright"
      flexDirection="column"
      paddingX={2}
      paddingY={0}
    >
      <Box flexDirection="row" alignItems="center">
        <Gradient name="vice">
          <BigText text="COIL" font="tiny" />
        </Gradient>
        <Box marginLeft={2} flexDirection="column">
          <Text color="gray">A</Text>
          <Text bold color="blueBright">JETTSON</Text>
          <Text color="gray">PRODUCT</Text>
        </Box>
      </Box>
      <Box>
        <Text color="gray">▎</Text>
        <Text bold color="white"> {gpuName}</Text>
        {driverInfo ? (
          <Text color="gray">  ·  {driverInfo}</Text>
        ) : null}
      </Box>
      {multi ? <GpuTabs gpus={gpus} focused={focused} /> : null}
    </Box>
  );
};
