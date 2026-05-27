# Changelog

All notable changes to `coil` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-05-27

### Added
- **Share card** — press `S` in the TUI to snapshot the current GPU stats into a 1600×900 PNG.
  - Styled as a Windows XP "System Properties" window over a deep-space wallpaper.
  - Saved to your Desktop (OneDrive-aware on Windows) as `coil-share-YYYYMMDD-HHMM.png`.
  - Copied to your system clipboard as an actual image, via OS-native paths
    (WinForms on Windows, AppleScript on macOS, `xclip` on Linux).
  - Graceful fallback: if the image-clipboard call fails, the file path is copied as text instead.
- New keyboard hint in the footer: `Press S to share · Q to quit`.
- Two new dependencies: [`@napi-rs/canvas`](https://www.npmjs.com/package/@napi-rs/canvas)
  for PNG rendering and [`clipboardy`](https://www.npmjs.com/package/clipboardy)
  for text-clipboard fallback.

### Changed
- Footer now toggles into a toast notification for ~2 s after a successful share
  (`✓ Saved …`) — without changing the layout height, so the TUI never reflows.

## [0.1.0] — 2026-05-27

### Added
- Initial public release.
- Live NVIDIA GPU monitor built on [Ink](https://github.com/vadimdemedes/ink)
  (React for the terminal).
- Header with `COIL` gradient wordmark and the active GPU name.
- 2×2 stat grid: GPU Utilization, VRAM, Temperature, Power Draw.
- Color-coded bars with severity thresholds — blue under 60%, yellow 60–85%, red above 85%.
- Process table listing every PID using the GPU, sorted by VRAM.
- Alternate-screen rendering (`vim`/`htop`-style) so quitting restores the previous shell.
- `Q` / `Ctrl+C` / `SIGINT` for clean exit.
- `--interval <ms>` flag to override the 1 s refresh rate.
- Cross-platform: Windows, Linux, and macOS (over SSH to an NVIDIA host).
- Graceful preflight error if `nvidia-smi` is missing.

[0.2.0]: https://github.com/Jettsondev/coil-cli/releases/tag/v0.2.0
[0.1.0]: https://github.com/Jettsondev/coil-cli/releases/tag/v0.1.0
