# ColorShare

Collect colors you love and turn them into beautiful palettes. A MyPoorBrain app.

## Files
- `index.html`: the page
- `styles.css`: the look (dark theme, layout)
- `app.js`: everything the app does: color engine, scan studio, palettes, library, settings
- `manifest.webmanifest` + `icons/`: lets it install to the iPhone Home Screen
- `sw.js`: retires the old Swatch Studio offline cache on devices that had it

## Deploy
Netlify publishes this folder as-is on every push to `main` (see `netlify.toml`). No build step.

## Data
Palettes are saved on each device (browser storage). Photos are stored on the device too.
The previous React version (v3.1.2) lives in this repo's git history.
