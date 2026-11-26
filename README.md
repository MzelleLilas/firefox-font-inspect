# Font Inspect

Firefox extension to inspect the font of any text with a click.

## Usage

1. Click the **Font Inspect** icon in the toolbar (or press `Alt+Shift+F`).
2. Hover over the page: the element under the cursor is highlighted.
3. Click on some text: a panel shows
   - `font-family`
   - `font-size` (px + rem equivalent)
   - `font-weight` (value + name: Regular, Bold…)
   - `line-height` (px + unitless ratio)
   - `letter-spacing` (px + em equivalent)
   - `color`: the value as authored in the CSS (hex, rgba, hsl, oklch, var()…), the rule it comes from, the resolved `var()` value, and always a **hex** conversion (`#rrggbbaa` when transparent)
4. Click a value to copy it.
5. Press `Esc` or click the icon again to exit.

## Display modes

The panel has two views. Pick the default one in the add-on settings (⚙ button in the panel header, or `about:addons` → Font Inspect → Options), or switch at any time with the ⊟ / ⊞ button in the panel header. The choice is saved.

- **Full** (default): text preview, every value with its conversions, the full `font-family` stack and where the color is defined.
- **Compact**: the smallest possible panel, with one line per property, the first font only (`+N` for the others) and the color as hex. Details show on hover, and copying still gives the full value.

## Configuration

In the same options page, choose which rows the panel shows: `font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`, `color` and the text preview. The choice applies to both views and takes effect immediately, even on an open panel.

## Development install

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select `manifest.json`

Or with [web-ext](https://github.com/mozilla/web-ext):

```bash
npx web-ext run
```

## Structure

- `manifest.json` — Manifest V3
- `background.js` — injects the script when the icon is clicked, manages the "ON" badge
- `content.js` — highlighting, click capture, info panel (Shadow DOM, isolated from the page's CSS)
- `options/` — options page (display mode, rows to display), saved with `storage.sync`
- `_locales/` — UI strings: English (default) and French. To add a language, copy `_locales/en/messages.json` to `_locales/<lang>/messages.json` and translate the `message` values
- `icons/icon.svg`
- `test/colors.html` — test page covering the different color formats

## License

[MIT](LICENSE)
