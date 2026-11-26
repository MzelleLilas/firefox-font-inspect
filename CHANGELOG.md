# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-11-26

### Added

- Compact display mode: one line per property, first font only, line-height ratio and hex color, with details on hover. Copying still gives the full value.
- Options page to choose the default display mode (full or compact).
- Button in the panel header to switch between the full and compact views. The choice is saved.
- Settings button (⚙) in the panel header to open the options page.
- Configuration in the options page to choose which rows the panel shows (each font property, color, text preview), in both views.

### Changed

- New `storage` permission, used only to save the display preferences (synced with the Firefox account when sync is on).
- Larger click area for the panel header buttons.

## [0.2.0] - 2026-11-20

### Added

- English user interface by default, with a French translation picked automatically from the Firefox language (`_locales/`).
- Data collection declaration (`data_collection_permissions`: none), required for addons.mozilla.org.
- MIT license.

### Changed

- Permanent add-on ID: `firefox-font-inspect@mzellelilas`.
- Minimum Firefox version raised to 140 on desktop and 142 on Android.
- Test files are no longer included in the build package.

## [0.1.0] - 2026-11-20

### Added

- Inspection mode toggled from the toolbar button or `Alt+Shift+F`, with an "ON" badge.
- Highlight of the element under the cursor, and an info panel on click.
- Font details: `font-family`, `font-size` (px + rem), `font-weight` (value + name), `line-height` (px + unitless ratio), `letter-spacing` (px + em).
- Color details: the value as authored in the CSS (hex, rgba, hsl, oklch, `var()`…), the rule it comes from or the element it is inherited from, the resolved `var()` value, and a hex conversion (`#rrggbbaa` when transparent).
- Click a value to copy it; `Esc` to exit.

[Unreleased]: https://github.com/MzelleLilas/firefox-font-inspect/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/MzelleLilas/firefox-font-inspect/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/MzelleLilas/firefox-font-inspect/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/MzelleLilas/firefox-font-inspect/releases/tag/v0.1.0
