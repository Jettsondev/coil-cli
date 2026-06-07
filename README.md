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

<img src="https://raw.githubusercontent.com/Jettsondev/coil-cli/main/.github/assets/demo.gif" alt="coil — live NVIDIA GPU monitor with animated bars and a Windows XP–themed share card" width="900" />

<sub>↑ Live demo. <code>coil</code> running on an RTX 5070 — utilization, VRAM, temperature, and power bars update in real time. Press <strong>S</strong> to snapshot your stats into a shareable PNG card.</sub>

<br /><br />

<img src="https://raw.githubusercontent.com/Jettsondev/coil-cli/main/.github/assets/terminal.png" alt="static screenshot of coil running in a terminal — first-frame still of the demo above" width="600" />

<sub>Static still — first frame of the demo, in case the gif fails to load.</sub>

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
- **Multi-GPU** — every NVIDIA card in the box. Switch focus with `←`/`→` (or `Tab`, or number keys); the header shows a `GPU 0 1 2 · 1/3` tab strip, and the process table + share card scope to the focused card.
- **Inline sparklines** — each stat card carries a live trend line of its last ~120 samples, so you see the shape of the load, not just the instant.
- **Color-coded bars** — blue under 60%, yellow 60–85%, red above 85%, so anomalies catch your eye immediately. Thresholds are configurable.
- **Process table** — every PID using the GPU, sorted by VRAM, with names instead of full executable paths. Filter by regex with `--filter`.
- **Threshold alerts** — `--alerts` rings the bell and fires a desktop notification when a metric goes critical, debounced so it never spams.
- **Scriptable exporters** — `--json`, `--watch-json` (NDJSON stream), and `--prom` (Prometheus) for dashboards, logging, and scraping.
- **Share card** — press **S** and `coil` generates a 1600×900 PNG of your stats styled like a Windows XP "System Properties" dialog. Saved to your Desktop, copied to your clipboard, ready to paste into Twitter, Discord, Reddit, or iMessage.
- **Clean alternate-screen TUI** — built with [Ink](https://github.com/vadimdemedes/ink) (React for the terminal). Uses the alt-screen buffer like `vim` or `htop`, so quitting restores your shell completely untouched.
- **Zero config required** — run `coil` and go. An optional `~/.coilrc` is there if you want it.
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
coil                       # launch the live monitor
coil --interval 500        # refresh every 500ms instead of 1s
coil --filter "python|node"  # only show processes matching a regex
coil --alerts              # ring the bell + notify on critical thresholds
coil --json                # print one snapshot as JSON and exit
coil --watch-json          # stream snapshots as NDJSON, one line per interval
coil --prom                # print a Prometheus textfile snapshot and exit
coil --version             # print version
coil --help                # show all options
```

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `←` / `→` | Switch focus to the previous / next GPU (multi-GPU rigs) |
| `Tab` / `Shift+Tab` | Cycle GPUs forward / back |
| `0`–`9` | Jump straight to that GPU index |
| `S` | Snapshot the focused GPU into a PNG share card (saved to Desktop + copied to clipboard) |
| `Q` | Quit cleanly (restores your shell — nothing left behind) |
| `Ctrl+C` | Same as `Q` |

## Share your card

Press **S** while `coil` is running and it generates a 1600×900 PNG of your current stats — styled as a Windows XP "System Properties" window sitting on a deep-space wallpaper.

<div align="center">

<img src="https://raw.githubusercontent.com/Jettsondev/coil-cli/main/.github/assets/hero.png" alt="coil share card — Windows XP Luna-themed snapshot of an NVIDIA RTX 5070, showing GPU utilization, VRAM, temperature, power, and the active process list" width="900" />

</div>

The card is:

- **Saved** to your Desktop as `coil-share-YYYYMMDD-HHMM.png` (OneDrive-aware on Windows)
- **Copied** to your system clipboard as an actual image — paste it directly into Twitter, Discord, Reddit, iMessage, Slack, anywhere

If the OS image-clipboard call fails (rare — typically a missing `xclip` on Linux), `coil` falls back to copying the file *path* as text so you can still attach the saved PNG manually.

## Multiple GPUs

On a rig with more than one NVIDIA card, `coil` shows one GPU in full detail and a tab strip up top:

```
GPU  0  1  2   ·  1/3
```

- `←` / `→` (or `Tab` / `Shift+Tab`) cycle the focused card.
- Number keys `0`–`9` jump straight to a GPU by index.
- The **process table** and the **share card** follow the focused GPU — processes are mapped to their card by GPU UUID. (On drivers that don't tag processes with a UUID, `coil` shows all processes rather than hide a running job.)
- Each card's **sparkline** history is kept per-GPU, so switching back and forth doesn't lose a card's trend.

## Configuration

`coil` needs no config, but you can drop a JSON file at `~/.coilrc` (also accepted: `~/.coilrc.json`, `~/.config/coil/config.json`) to set your own defaults:

```json
{
  "interval": 1000,
  "processFilter": "python|node",
  "thresholds": {
    "util":  { "warn": 60, "crit": 85 },
    "mem":   { "warn": 60, "crit": 85 },
    "temp":  { "warn": 70, "crit": 80 },
    "power": { "warn": 60, "crit": 85 }
  },
  "alerts": { "enabled": false, "bell": true, "desktop": false }
}
```

Every field is optional and merges over the defaults shown above. Thresholds drive the bar colors (blue → yellow → red) and the alert system. A malformed file is reported as a warning and ignored — `coil` always starts. Command-line flags (`--interval`, `--filter`, `--alerts` / `--no-alerts`) win over the config file.

## Alerts

```bash
coil --alerts
```

When a metric crosses its **crit** threshold, `coil` rings the terminal bell and (if `alerts.desktop` is enabled) fires a native desktop notification — a WinForms balloon on Windows, `osascript` on macOS, `notify-send` on Linux. Alerts fire on the *transition* into critical (per GPU), so a card pegged at 90 °C doesn't ring every second; it re-arms once the card recovers.

## Exporters

`coil` doubles as a machine-readable data source — these modes print and exit (or stream), with no TUI:

```bash
coil --json         # one structured snapshot: all GPUs + per-GPU processes
coil --watch-json   # NDJSON, one compact line per interval — pipe into a log/dashboard
coil --prom         # Prometheus text exposition: coil_gpu_* gauges, labeled by gpu/uuid/name
```

Example — scrape into a Prometheus textfile collector every 5 s:

```bash
while true; do coil --prom > /var/lib/node_exporter/coil.prom.$$; \
  mv /var/lib/node_exporter/coil.prom.$$ /var/lib/node_exporter/coil.prom; sleep 5; done
```

`--json` and `--watch-json` honor `--filter` too, so you can export only the processes you care about.

## How does it compare?

| Feature | **coil** | `nvidia-smi` | `nvtop` | `gpustat` | `btop` |
|--------|:---:|:---:|:---:|:---:|:---:|
| Live updating UI | ✅ | ❌ static | ✅ | ⚠️ poll loop | ✅ |
| Multi-GPU | ✅ | ✅ | ✅ | ✅ | ✅ |
| Inline history sparklines | ✅ | ❌ | ✅ | ❌ | ✅ |
| Color severity thresholds | ✅ | ❌ | ✅ | ❌ | ✅ |
| Configurable thresholds | ✅ | ❌ | ⚠️ | ❌ | ✅ |
| Per-process VRAM table | ✅ | ✅ | ✅ | ✅ | partial |
| JSON / Prometheus export | ✅ | ⚠️ XML | ❌ | ✅ JSON | ❌ |
| Threshold alerts | ✅ | ❌ | ❌ | ❌ | ❌ |
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
nvidia-smi --query-gpu=index,uuid,name,utilization.gpu,utilization.memory,memory.used,memory.total,\
           temperature.gpu,power.draw,power.limit,fan.speed --format=csv,noheader,nounits

nvidia-smi --query-compute-apps=pid,process_name,used_memory,gpu_uuid \
           --format=csv,noheader,nounits
```

The `index`/`uuid` columns are what make multi-GPU work: every GPU row carries its UUID, every process row carries the UUID of the GPU it's running on, and `coil` joins the two so each card shows only its own processes.

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

`v0.3` is a big one — multi-GPU, sparklines, config, alerts, and exporters all landed:

- [x] **Multi-GPU support** — focus + switch with `←`/`→`/`Tab`/number keys and a header tab strip
- [x] **Custom thresholds** — `~/.coilrc` for personal warn/crit cutoffs
- [x] **Historical sparklines** — last ~120 samples of each metric inline in the TUI
- [x] **Alerts** — terminal bell + native desktop notification when a threshold is crossed
- [x] **JSON / Prometheus exporters** — `coil --json` / `--watch-json` for scripts, `coil --prom` for scraping
- [x] **Process regex filter** — `coil --filter` shows only processes matching a pattern

Still on the list:

- [ ] **Rig overview grid** — all GPUs at once, one compact row each, for 8-GPU boxes
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

**Thresholds, yes** — drop a `~/.coilrc` with your own `warn`/`crit` cutoffs per metric (see [Configuration](#configuration)). They drive both the bar colors and the alert system. Themeable share cards are still on the roadmap.
</details>

<details>
<summary><strong>How do I monitor more than one GPU?</strong></summary>

`coil` finds every NVIDIA card automatically. It focuses one at a time — press `←`/`→` (or `Tab`, or a number key) to switch. The header tab strip shows which card you're on, and the process list + share card follow your focus. A full all-GPUs-at-once overview grid is on the roadmap. See [Multiple GPUs](#multiple-gpus).
</details>

<details>
<summary><strong>Can I get the data into a script, log, or dashboard?</strong></summary>

Yes — `coil --json` prints one structured snapshot and exits, `coil --watch-json` streams NDJSON one line per interval, and `coil --prom` emits Prometheus-format gauges for scraping. None of these open the TUI. See [Exporters](#exporters).
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
