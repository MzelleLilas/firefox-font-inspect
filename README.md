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
- `icons/icon.svg`
- `test/colors.html` — test page covering the different color formats
