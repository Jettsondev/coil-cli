# coil

> **See your NVIDIA GPU in real time.**
> A beautiful, live-updating terminal monitor — a modern, friendly replacement for `nvidia-smi`.

[![npm version](https://img.shields.io/npm/v/coil-cli.svg?color=ff5cff)](https://www.npmjs.com/package/coil-cli)
[![license: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-43853d.svg)](https://nodejs.org)
[![built by Jettson](https://img.shields.io/badge/built%20by-Jettson-7c5cff.svg)](https://github.com/jettsondev)

---

## Quick start

```bash
npm install -g coil-cli
coil
```

That's it. Press **Q** to quit.

<!-- TODO: replace with real demo gif -->
<p align="center">
  <em>· demo gif coming soon ·</em>
</p>

## Why coil?

`nvidia-smi` is great, but it's a static text dump. `coil` gives you a live, glanceable view of your GPU:

- **Live stats** — GPU utilization, VRAM, temperature, and power, refreshed every second.
- **Color-coded bars** — blue under 60%, yellow 60–85%, red above 85%, so problems jump out.
- **Process table** — every PID using the GPU, sorted by VRAM, with names instead of full paths.
- **Share card** — press **S** to snapshot your stats into a 1600×900 PNG card. Saved to your home directory and copied to your clipboard, ready to paste into Twitter, Discord, Reddit, or iMessage.
- **Clean TUI** — built with [Ink](https://github.com/vadimdemedes/ink) (React for the terminal). No screen flicker, no `clear && nvidia-smi` loop. Uses the alternate screen buffer like `vim` or `htop`, so quitting restores your shell untouched.

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

Inside the TUI:

- **S** — snapshot your current stats into a PNG share card.
- **Q** or **Ctrl+C** — quit.

## Share your card

Press **S** while `coil` is running and it will generate a beautiful 1600×900 PNG of your current stats — a "player card" of your rig.

The file is saved to your home directory as `~/coil-share-YYYYMMDD-HHMM.png` and copied to your system clipboard. Paste it straight into Twitter, Discord, Reddit, iMessage, or anywhere else.

<!-- TODO: add a sample card PNG here, e.g. ![sample share card](docs/sample-card.png) -->
<p align="center">
  <em>· sample share card coming soon ·</em>
</p>

> On Windows the image is placed on the clipboard directly. On Linux it requires `xclip` to be installed for image-clipboard support. If the OS image-clipboard call fails for any reason, `coil` falls back to copying the saved file's *path* as text so you can still attach it manually.

## Requirements

- **NVIDIA GPU** with the official NVIDIA driver installed.
- **`nvidia-smi`** on your `PATH` (installed automatically with the driver).
- **Node.js 18+**.

Supported on Linux, macOS (with eGPU), and Windows.

> **Note:** On Windows, per-process VRAM is reported as `—` by the NVIDIA driver (WDDM limitation). All other stats work fully.

## Roadmap

`v0.2` adds the share card. Here's where we're going next:

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
