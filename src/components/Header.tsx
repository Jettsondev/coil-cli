import React from 'react';
import { Box, Text } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';

interface HeaderProps {
  gpuName: string;
  driverInfo?: string;
}

export const Header: React.FC<HeaderProps> = ({ gpuName, driverInfo }) => {
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
    </Box>
  );
};
