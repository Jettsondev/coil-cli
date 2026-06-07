#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { execa } from 'execa';
import { App } from './App.js';
import { loadConfig, CoilConfig } from './config.js';
import { runOneShotExport, runWatchJson } from './export.js';

const VERSION = '0.3.0';

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

interface CliOpts {
  interval?: number;
  json?: boolean;
  watchJson?: boolean;
  prom?: boolean;
  filter?: string;
  /**
   * Tri-state from commander's negatable boolean: `true` for `--alerts`,
   * `false` for `--no-alerts`, `undefined` when neither is passed.
   */
  alerts?: boolean;
}

/** Resolve the effective interval: --interval > config > 1000ms. */
function resolveInterval(opts: CliOpts, config: CoilConfig): number {
  if (typeof opts.interval === 'number') return opts.interval;
  return config.interval;
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
    )
    .option('--json', 'print one GPU snapshot as JSON and exit')
    .option('--watch-json', 'stream snapshots as NDJSON (one line per interval)')
    .option('--prom', 'print a Prometheus textfile snapshot and exit')
    .option(
      '-f, --filter <regex>',
      'only show processes whose name matches this regex',
    )
    .option('--alerts', 'enable threshold alerts (bell + notifications)')
    .option('--no-alerts', 'disable threshold alerts even if config enables them')
    .action(async (opts: CliOpts) => {
      await ensureNvidiaSmi();

      const { config, warning } = await loadConfig();
      if (warning) process.stderr.write(`coil: ${warning}\n`);

      // Layer CLI flags over the loaded config.
      if (opts.filter !== undefined) {
        try {
          new RegExp(opts.filter);
        } catch {
          process.stderr.write(`coil: invalid --filter regex: ${opts.filter}\n`);
          process.exit(1);
        }
        config.processFilter = opts.filter;
      }
      // Tri-state: --alerts forces on, --no-alerts forces off, neither leaves
      // the config value untouched.
      if (opts.alerts === true) config.alerts.enabled = true;
      else if (opts.alerts === false) config.alerts.enabled = false;

      const interval = resolveInterval(opts, config);
      const filter = config.processFilter
        ? new RegExp(config.processFilter, 'i')
        : null;

      // Non-interactive export modes: no TUI, no alt-screen.
      if (opts.json) {
        await runOneShotExport('json', filter);
        return;
      }
      if (opts.prom) {
        await runOneShotExport('prom');
        return;
      }
      if (opts.watchJson) {
        await runWatchJson(interval, filter);
        return;
      }

      const restoreScreen = setupAltScreen();
      try {
        const { waitUntilExit } = render(
          <App version={VERSION} refreshMs={interval} config={config} />,
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
