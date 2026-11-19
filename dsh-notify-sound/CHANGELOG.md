# Changelog

All notable changes to this project are documented here.
This project adheres to [Semantic Versioning](https://semver.org/).

## [1.1.0]

### Added
- Cross-platform playback: macOS (`afplay`, falling back to the system Glass sound / beep) and Linux (`paplay` → `aplay`; system sound via the freedesktop bell / `canberra-gtk-play`), in addition to Windows.
- Release metadata: Unlicense, repository / author / keywords, `.gitignore`, and this changelog.

### Changed
- Refactored playback into per-platform command builders; unsupported platforms are a silent no-op.
- Description and UI locale strings now reflect cross-platform support.

## [1.0.0]

### Added
- Initial release. Windows notification sound (PowerShell `Media.SoundPlayer`, a custom chime with automatic fallback to the system sound) for permission/approval requests and user questions.
- Observer-only listeners (`prepend`, always `return next()`); per-trigger toggles; per-trigger-type cooldown.
