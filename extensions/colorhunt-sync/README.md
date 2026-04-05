# PaintBrain · ColorHunt Sync

Chrome extension that automatically syncs your ColorHunt favorites to PaintBrain Swatch Studio.

## How it works

1. You browse ColorHunt and heart palettes like normal
2. The extension detects every heart in real-time
3. Palette codes are sent to PaintBrain's API
4. New palettes appear in your Swatch Studio Palettes tab automatically
5. Duplicates are silently skipped

No buttons. No manual sync. It just works.

## Installation (30 seconds)

1. Open Chrome → navigate to `chrome://extensions`
2. Enable **Developer Mode** (toggle in top right)
3. Click **Load unpacked**
4. Select this folder: `extensions/colorhunt-sync/`
5. Visit [colorhunt.co](https://colorhunt.co) — your existing favorites sync immediately
6. From now on, heart anything on ColorHunt and it appears in Swatch Studio

## Configuration

Edit `config.js` before loading the extension:

```js
const PAINTBRAIN_API = 'http://localhost:3001/api/colorhunt/sync'
const PAINTBRAIN_KEY = 'your-api-key-here'
```

- **Local dev**: use `http://localhost:3001/api/colorhunt/sync`
- **Production**: update to your deployed API URL
- **API key**: must match `COLORHUNT_SYNC_API_KEY` in your backend `.env`

## What gets synced

- All palettes in your ColorHunt "My Collection" (localStorage key: `myCollection`)
- Each palette = 4 hex colors parsed from the 24-char code
- Synced palettes tagged as `source: "colorhunt"` with `categoryTags: ["colorhunt", "favorites"]`
- Auto-named by Haiku after import

## Extension popup

Click the extension icon to see:
- Sync status (Active / Waiting)
- Total palettes synced
- Last sync timestamp
- New palettes from last sync

## Technical notes

- Uses Manifest V3 (Chrome 88+)
- Content script runs on `colorhunt.co/*` only
- Intercepts ColorHunt's `like()` function for real-time sync
- Falls back to 2-second polling if function intercept fails
- Deduplication via sorted hex hash — safe to send full collection every time
- No background service worker needed — runs only when ColorHunt tab is open
