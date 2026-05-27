import React from 'react';
import { Box, Text } from 'ink';

interface ErrorPanelProps {
  message: string;
}

export const ErrorPanel: React.FC<ErrorPanelProps> = ({ message }) => {
  return (
    <Box
      borderStyle="round"
      borderColor="red"
      flexDirection="column"
      paddingX={2}
      paddingY={0}
    >
      <Text color="red" bold>
        ⚠  nvidia-smi failed
      </Text>
      <Box marginTop={0}>
        <Text color="white">{message}</Text>
      </Box>
      <Box marginTop={0}>
        <Text color="gray" italic>
          Retrying every second. Press Q to quit.
        </Text>
      </Box>
    </Box>
  );
};
