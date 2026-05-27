<div align="center">

# coil

**See your NVIDIA GPU in real time.**
A beautiful, live-updating terminal monitor — a modern, friendly replacement for `nvidia-smi`.

[![npm version](https://img.shields.io/npm/v/coil-cli.svg?color=5e9bff&label=npm)](https://www.npmjs.com/package/coil-cli)
[![npm downloads](https://img.shields.io/npm/dm/coil-cli.svg?color=5e9bff)](https://www.npmjs.com/package/coil-cli)
[![license: MIT](https://img.shields.io/badge/license-MIT-5e9bff.svg)](https://github.com/Jettsondev/coil-cli/blob/main/LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18-5e9bff.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-5e9bff.svg)](https://www.typescriptlang.org)
[![GitHub stars](https://img.shields.io/github/stars/Jettsondev/coil-cli?style=flat&color=5e9bff)](https://github.com/Jettsondev/coil-cli/stargazers)

<br />

<img src="https://raw.githubusercontent.com/Jettsondev/coil-cli/main/.github/assets/hero.png" alt="coil share card — a live snapshot of an NVIDIA RTX 5070, rendered in a Windows XP Luna theme" width="900" />

<br /><br />

</div>

## Quick start

```bash
npm install -g coil-cli
coil
```

Press **Q** to quit. Press **S** to snapshot your GPU into a shareable PNG.

That's the whole thing.

## Why coil?

`nvidia-smi` is great, but it's a static text dump. Every time you want the current state, you run it again. `coil` gives you the same data, live, with the polish a modern terminal tool deserves:

- **Live stats** — GPU utilization, VRAM, temperature, and power, refreshed every second.
- **Color-coded bars** — blue under 60%, yellow 60–85%, red above 85%, so anomalies catch your eye immediately.
- **Process table** — every PID using the GPU, sorted by VRAM, with names instead of full executable paths.
- **Share card** — press **S** and `coil` generates a 1600×900 PNG of your stats styled like a Windows XP "System Properties" dialog. Saved to your Desktop, copied to your clipboard, ready to paste into Twitter, Discord, Reddit, or iMessage.
- **Clean alternate-screen TUI** — built with [Ink](https://github.com/vadimdemedes/ink) (React for the terminal). Uses the alt-screen buffer like `vim` or `htop`, so quitting restores your shell completely untouched.
- **Zero config** — no flags required, no config files. Run `coil`.
- **Zero telemetry** — `coil` makes zero network calls. Ever. It only ever talks to `nvidia-smi` on your local machine.

## Install

```bash
# Global install (recommended for daily use)
npm install -g coil-cli

# Or run it once without installing
npx coil-cli
```

## Usage

```bash
coil                   # launch the live monitor
coil --interval 500    # refresh every 500ms instead of 1s
coil --version         # print version
coil --help            # show all options
```

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `S` | Snapshot the current stats into a PNG share card (saved to Desktop + copied to clipboard) |
| `Q` | Quit cleanly (restores your shell — nothing left behind) |
| `Ctrl+C` | Same as `Q` |

## Share your card

Press **S** while `coil` is running and it generates a 1600×900 PNG of your current stats — styled as a Windows XP "System Properties" window sitting on a deep-space wallpaper.

The card is:

- **Saved** to your Desktop as `coil-share-YYYYMMDD-HHMM.png` (OneDrive-aware on Windows)
- **Copied** to your system clipboard as an actual image — paste it directly into Twitter, Discord, Reddit, iMessage, Slack, anywhere

If the OS image-clipboard call fails (rare — typically a missing `xclip` on Linux), `coil` falls back to copying the file *path* as text so you can still attach the saved PNG manually.

## How does it compare?

| Feature | **coil** | `nvidia-smi` | `nvtop` | `gpustat` | `btop` |
|--------|:---:|:---:|:---:|:---:|:---:|
| Live updating UI | ✅ | ❌ static | ✅ | ⚠️ poll loop | ✅ |
| Color severity thresholds | ✅ | ❌ | ✅ | ❌ | ✅ |
| Per-process VRAM table | ✅ | ✅ | ✅ | ✅ | partial |
| Generates a shareable PNG card | ✅ | ❌ | ❌ | ❌ | ❌ |
| Alt-screen (`vim`/`htop`-style) | ✅ | n/a | ✅ | ❌ | ✅ |
| One-line install | `npm i -g` | ships w/ driver | `apt`/`brew` | `pip` | `apt`/`brew` |
| Cross-platform | Win · macOS · Linux | All | Linux | All | Linux · macOS |
| Zero configuration | ✅ | ✅ | ✅ | ✅ | ✅ |
| Zero telemetry | ✅ | ✅ | ✅ | ✅ | ✅ |

`coil` isn't trying to replace heavyweight tools like `nvtop` — it's the one you reach for when you want a fast, beautiful, glanceable view of your GPU without leaving your terminal.

## How it works

`coil` is a thin, friendly face on `nvidia-smi`. Every second it shells out to:

```bash
nvidia-smi --query-gpu=name,utilization.gpu,utilization.memory,memory.used,memory.total,\
           temperature.gpu,power.draw,power.limit,fan.speed --format=csv,noheader,nounits

nvidia-smi --query-compute-apps=pid,process_name,used_memory \
           --format=csv,noheader,nounits
```

…parses the CSV into typed objects, and renders the result using [Ink](https://github.com/vadimdemedes/ink) (React for the terminal). The share card is rendered with [`@napi-rs/canvas`](https://github.com/Brooooooklyn/canvas) — a fast, prebuilt-binary canvas implementation that works on Windows, macOS, and Linux without compilation. The clipboard handoff uses OS-native paths (WinForms on Windows, AppleScript on macOS, `xclip` on Linux).

## Requirements

- **NVIDIA GPU** with the official NVIDIA driver installed.
- **`nvidia-smi`** on your `PATH` (installed automatically with the driver).
- **Node.js 18+**.

Supported on Linux, Windows, and remote sessions (SSH into a Linux/Windows box — the TUI renders locally, stats come from the remote machine).

> **macOS:** modern Macs ship with Apple GPUs, not NVIDIA, so `nvidia-smi` is unavailable. `coil` installs fine via `npm`, but the most realistic way to use it on a Mac is over SSH to a machine that does have an NVIDIA card.
>
> **Windows per-process VRAM:** the NVIDIA WDDM driver does not report per-process VRAM, so that column shows `—` on Windows. All other stats are fully populated. Linux reports the full data.

## Roadmap

`v0.2` ships the share card. Coming next:

- [ ] **Multi-GPU support** — tabs / side-by-side cards for rigs with multiple GPUs
- [ ] **Custom thresholds** — `~/.coilrc` for personal warn/crit cutoffs
- [ ] **Historical sparklines** — last N seconds of each metric inline in the TUI
- [ ] **Alerts** — desktop notification or terminal bell when a threshold is crossed
- [ ] **JSON / Prometheus exporters** — `coil --json` for scripts, `coil --prom` for scraping
- [ ] **Process regex filter** — show only processes matching a pattern
- [ ] **Themeable share card** — pick from XP, modern dark, terminal-classic, custom
- [ ] **Web dashboard mode** — `coil --web` exposing a live dashboard at `localhost:3000`
- [ ] **AMD ROCm + Apple Silicon backends** — pluggable, behind the same TUI

Got a wishlist item? [Open an issue.](https://github.com/Jettsondev/coil-cli/issues)

## FAQ

<details>
<summary><strong>Does it work with AMD or Intel GPUs?</strong></summary>

Not yet. `coil` reads from `nvidia-smi`, which is NVIDIA-only. AMD (via ROCm's `rocm-smi`) and Apple Silicon support are on the roadmap behind a pluggable backend.
</details>

<details>
<summary><strong>Does it work on a Mac?</strong></summary>

`npm install -g coil-cli` works on macOS, but modern Macs don't ship with NVIDIA GPUs, so `nvidia-smi` won't be available and `coil` will refuse to start. The most useful pattern: SSH from your Mac into a Linux/Windows box that has an NVIDIA card, and run `coil` over the SSH session — the TUI renders locally on your Mac, stats come from the remote.
</details>

<details>
<summary><strong>Does coil phone home, collect analytics, or send any data anywhere?</strong></summary>

**No.** Zero network calls. `coil` only ever shells out to `nvidia-smi` on your local machine. The share card is rendered locally and copied to your local clipboard — nothing is uploaded.
</details>

<details>
<summary><strong>Why does the process table show "—" for VRAM on Windows?</strong></summary>

NVIDIA's WDDM driver on Windows doesn't expose per-process VRAM usage via `nvidia-smi --query-compute-apps`. That's a driver limitation, not a `coil` bug. PIDs and process names work fully; only the VRAM column is affected. On Linux the column is fully populated.
</details>

<details>
<summary><strong>Can I change the refresh interval?</strong></summary>

Yes. `coil --interval 500` refreshes every 500ms. Minimum is 100ms. Default is 1000ms (one second).
</details>

<details>
<summary><strong>Can I customize the color thresholds or card design?</strong></summary>

Not yet — thresholds and card theme are fixed in `v0.2`. Custom thresholds via `~/.coilrc` and themeable cards are both on the roadmap for `v0.3`.
</details>

<details>
<summary><strong>Where is the share card saved?</strong></summary>

To your Desktop, named `coil-share-YYYYMMDD-HHMM.png`. On Windows, `coil` is OneDrive-aware: it looks at `~/OneDrive/Desktop` first, then falls back to `~/Desktop`, then your home directory. On macOS/Linux it uses `~/Desktop` and falls back to your home directory.
</details>

<details>
<summary><strong>Does it work over SSH?</strong></summary>

Yes — that's actually one of the cleanest ways to use it. `ssh user@host "coil"` will render the TUI in your local terminal while the stats stream from the remote machine. Just make sure your remote box has Node 18+, `coil-cli` installed, and an NVIDIA GPU.
</details>

## Contributing

PRs are welcome — this is a fresh project and a great place to make a meaningful contribution.

```bash
git clone https://github.com/Jettsondev/coil-cli.git
cd coil-cli
npm install
npm run dev          # hot-reloading dev mode
npm run build        # compile to dist/
npm link             # symlink `coil` to your shell
```

Please open an issue before starting bigger features so we can align on direction.

## Star history

[![Star History Chart](https://api.star-history.com/svg?repos=Jettsondev/coil-cli&type=Date)](https://star-history.com/#Jettsondev/coil-cli&Date)

## License

[MIT](https://github.com/Jettsondev/coil-cli/blob/main/LICENSE) © 2026 Bryan Rodas / RWX-TEK INC

Built with care by [Jettson](https://github.com/Jettsondev).
