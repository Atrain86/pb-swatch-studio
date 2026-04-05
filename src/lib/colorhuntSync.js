// ─── ColorHunt Sync — client-side processing ────────────────
// Processes palette codes from the Chrome extension.
// In Phase B this moves server-side. For now it runs in the
// browser via a simple fetch handler or direct import.

import { computeDedupeHash } from './colorUtils'
import * as db from './db'

const SYNC_STATUS_KEY = 'pb_colorhunt_sync'

// Process an array of ColorHunt palette codes
// Each code is 24 hex chars = 4 colors × 6 chars
export function processColorHuntCodes(codes) {
  let imported = 0
  let skipped = 0

  for (const code of codes) {
    // Validate: must be 24+ hex chars
    const clean = code.replace(/[^a-fA-F0-9]/g, '')
    if (clean.length < 24) { skipped++; continue }

    // Parse 4 colors
    const colors = []
    for (let i = 0; i < 4; i++) {
      const hex = '#' + clean.slice(i * 6, i * 6 + 6).toUpperCase()
      colors.push({ hex, name: 'ColorHunt' })
    }

    // Check dedupe
    const dedupeHash = computeDedupeHash(colors.map(c => c.hex))
    const existing = db.getPalettes()
    if (existing.some(p => p.dedupeHash === dedupeHash)) {
      skipped++
      continue
    }

    // Insert
    const result = db.insertPalette({
      name: `ColorHunt ${clean.slice(0, 8)}`,
      colors,
      source: 'colorhunt',
      sourceSlug: clean,
      categoryTags: ['colorhunt', 'favorites'],
      autoNamed: false,
    })

    if (result) imported++
    else skipped++
  }

  // Update sync status
  const status = {
    lastSync: new Date().toISOString(),
    imported,
    skipped,
    total: codes.length,
  }
  try { localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status)) } catch {}

  return status
}

// Get sync status for UI display
export function getSyncStatus() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_STATUS_KEY)) || null
  } catch {
    return null
  }
}
