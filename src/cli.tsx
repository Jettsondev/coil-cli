#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { execa } from 'execa';
import { App } from './App.js';

const VERSION = '0.2.0';

const ENTER_ALT_SCREEN = '\x1b[?1049h\x1b[2J\x1b[H';
const LEAVE_ALT_SCREEN = '\x1b[?1049l';

async function ensureNvidiaSmi(): Promise<void> {
  try {
    await execa('nvidia-smi', ['--query-gpu=name', '--format=csv,noheader']);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(
      `\ncoil: could not run nvidia-smi.\n` +
        `Make sure NVIDIA drivers are installed and nvidia-smi is on your PATH.\n` +
        `\nUnderlying error:\n  ${msg}\n\n`,
    );
    process.exit(1);
  }
}

function setupAltScreen(): () => void {
  if (!process.stdout.isTTY) return () => {};

  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    process.stdout.write(LEAVE_ALT_SCREEN);
  };

  process.stdout.write(ENTER_ALT_SCREEN);
  process.on('exit', restore);
  process.on('SIGINT', () => {
    restore();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    restore();
    process.exit(0);
  });
  return restore;
}

async function main(): Promise<void> {
  const program = new Command();

  program
    .name('coil')
    .description('See your NVIDIA GPU in real time.')
    .version(VERSION, '-v, --version', 'output the version')
    .option(
      '-i, --interval <ms>',
      'refresh interval in milliseconds',
      value => {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 100) {
          throw new Error('interval must be a number >= 100');
        }
        return n;
      },
      1000,
    )
    .action(async opts => {
      await ensureNvidiaSmi();
      const restoreScreen = setupAltScreen();
      try {
        const { waitUntilExit } = render(
          <App version={VERSION} refreshMs={opts.interval as number} />,
          { exitOnCtrlC: true },
        );
        await waitUntilExit();
      } finally {
        restoreScreen();
      }
    });

  await program.parseAsync(process.argv);
}

main().catch(err => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`coil: fatal error: ${msg}\n`);
  process.exit(1);
});
