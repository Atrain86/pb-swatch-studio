// ─── ColorHunt Sync — fetches from backend ──────────────────

import * as db from './db'

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

    const status = {
      lastSync: new Date().toISOString(),
      total: data.count,
      imported,
    }
    try { localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status)) } catch {}
    return status
  } catch (err) {
    console.warn('[ColorHunt Sync] Fetch failed:', err.message)
    return null
  }
}

// Get sync status for UI display
export function getSyncStatus() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_STATUS_KEY)) || null
  } catch {
    return null
  }
}
