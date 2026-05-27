# coil

> **See your NVIDIA GPU in real time.**
> A beautiful, live-updating terminal monitor — a modern, friendly replacement for `nvidia-smi`.

[![npm version](https://img.shields.io/npm/v/coil-cli.svg?color=ff5cff)](https://www.npmjs.com/package/coil-cli)
[![license: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-43853d.svg)](https://nodejs.org)
[![built by Jettson](https://img.shields.io/badge/built%20by-Jettson-7c5cff.svg)](https://github.com/jettsondev)

---

<!-- TODO: add gif -->
<p align="center">
  <em>[ demo gif coming soon ]</em>
</p>

## Why coil?

`nvidia-smi` is great, but it's a static text dump. `coil` gives you a live, glanceable view of your GPU:

- **Live stats** — GPU utilization, VRAM, temperature, and power, refreshed every second.
- **Color-coded bars** — green under 60%, yellow 60–85%, red above 85%, so problems jump out.
- **Process table** — every PID using the GPU, sorted by VRAM, with names instead of full paths.
- **Clean TUI** — built with [Ink](https://github.com/vadimdemedes/ink) (React for the terminal). No screen flicker, no `clear && nvidia-smi` loop.

## Install

```bash
# Global install (recommended for daily use)
npm install -g coil-cli

# Or run without installing
npx coil-cli
```

## Usage

```bash
coil                  # launch the live monitor
coil --interval 500   # refresh every 500ms
coil --version        # print version
coil --help           # show all options
```

Press **Q** (or **Ctrl+C**) to quit.

## Requirements

- **NVIDIA GPU** with the official NVIDIA driver installed.
- **`nvidia-smi`** on your `PATH` (installed automatically with the driver).
- **Node.js 18+**.

Supported on Linux, macOS (with eGPU), and Windows.

> **Note:** On Windows, per-process VRAM is reported as `—` by the NVIDIA driver (WDDM limitation). All other stats work fully.

## Roadmap

`v0.1` is the foundation. Here's where we're going:

- [ ] **Multi-GPU support** — tabs / side-by-side cards for rigs with multiple GPUs.
- [ ] **Alerts** — desktop notifications or terminal bells on thresholds (e.g. temp > 85°C).
- [ ] **Historical graphs** — sparkline of the last N seconds for each metric.
- [ ] **Web dashboard mode** — `coil --web` to expose a live dashboard at `localhost:3000`.
- [ ] **JSON / Prometheus exporter** — `coil --json` for scripts, `coil --prom` for Prometheus scraping.
- [ ] **Process filtering** — show only processes matching a regex.
- [ ] **Custom thresholds** — `~/.coilrc` for personal warn/crit cutoffs.
- [ ] **AMD ROCm + Apple Silicon support** — pluggable backends.

Got a wishlist item? [Open an issue.](https://github.com/jettsondev/coil-cli/issues)

## Contributing

PRs welcome — this is a fresh project and a great place to make a meaningful contribution.

```bash
git clone https://github.com/jettsondev/coil-cli.git
cd coil-cli
npm install
npm run dev          # hot-reloading dev mode
npm run build        # compile to dist/
npm link             # symlink `coil` to your shell
```

Please open an issue before starting big features so we can align on the design.

## License

[MIT](LICENSE) © 2026 Bryan Rodas / RWX-TEK INC

Built with care by [Jettson](https://github.com/jettsondev).
