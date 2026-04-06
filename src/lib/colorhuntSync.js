// ─── ColorHunt Sync — fetches from backend ──────────────────

import * as db from './db'
import { findNearDuplicates } from './colorMath'

const BACKEND_URL = 'https://pb-swatch-studio.onrender.com'
const SYNC_STATUS_KEY = 'pb_colorhunt_sync'

// Fetch synced palettes from backend and merge into local db
export async function fetchAndMergeSyncedPalettes() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/colorhunt/palettes`)
    if (!res.ok) return null

    const data = await res.json()
    if (!data.palettes?.length) return data

    let imported = 0
    for (const p of data.palettes) {
      const result = db.insertPalette({
        name: p.name,
        colors: p.colors,
        source: 'colorhunt',
        sourceSlug: p.sourceSlug,
        categoryTags: p.categoryTags || ['colorhunt'],
        autoNamed: p.autoNamed || false,
      })
      if (result) imported++
    }

    // Post-import: run Delta-E near-duplicate cleanup
    let removed = 0
    if (imported > 0) {
      try {
        const allPalettes = db.getPalettes({ source: ['colorhunt', 'coolors'] })
        const dupeIds = findNearDuplicates(allPalettes, 8)
        dupeIds.forEach(id => { db.deletePalette(id); removed++ })
      } catch {}
    }

    const status = {
      lastSync: new Date().toISOString(),
      total: data.count,
      imported,
      nearDupesRemoved: removed,
    }
    try { localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status)) } catch {}
    return status
  } catch (err) {
    console.warn('[ColorHunt Sync] Fetch failed:', err.message)
    return null
  }
}

// Run Delta-E near-duplicate cleanup across all imported palettes
// Call after any batch import (ColorHunt sync, Apify scrape, etc.)
export function runNearDuplicateCleanup(threshold = 8) {
  const palettes = db.getPalettes({ source: ['colorhunt', 'coolors'] })
  const dupeIds = findNearDuplicates(palettes, threshold)
  dupeIds.forEach(id => db.deletePalette(id))
  return dupeIds.length
}

// Get sync status for UI display
export function getSyncStatus() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_STATUS_KEY)) || null
  } catch {
    return null
  }
}
