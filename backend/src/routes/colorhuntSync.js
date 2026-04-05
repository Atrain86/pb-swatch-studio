import { Router } from 'express'
import { store } from '../index.js'

const router = Router()

// Auth middleware
function authSync(req, res, next) {
  const key = req.headers['x-api-key']
  const expected = process.env.COLORHUNT_SYNC_API_KEY
  if (!expected || !key || key !== expected) {
    return res.status(401).json({ error: 'Invalid API key' })
  }
  next()
}

// POST /api/colorhunt/sync
// Receives palette codes from Chrome extension
router.post('/sync', authSync, (req, res) => {
  try {
    const { codes, source } = req.body

    if (!Array.isArray(codes)) {
      return res.status(400).json({ error: 'codes must be an array' })
    }

    let imported = 0
    let skipped = 0

    for (const code of codes) {
      const clean = code.replace(/[^a-fA-F0-9]/g, '')
      if (clean.length < 24) { skipped++; continue }

      // Parse 4 colors
      const colors = []
      for (let i = 0; i < 4; i++) {
        colors.push('#' + clean.slice(i * 6, i * 6 + 6).toUpperCase())
      }

      // Dedupe hash
      const dedupeHash = [...colors].sort().join('-')

      // Check if exists
      if (store.palettes.some(p => p.dedupeHash === dedupeHash)) {
        skipped++
        continue
      }

      // Insert
      const palette = {
        id: crypto.randomUUID(),
        name: `ColorHunt ${clean.slice(0, 8)}`,
        colors: colors.map(hex => ({ hex, name: 'ColorHunt' })),
        colorsCache: colors,
        categoryTags: ['colorhunt', 'favorites'],
        source: 'colorhunt',
        sourceSlug: clean,
        autoNamed: false,
        dedupeHash,
        addedAt: new Date().toISOString(),
      }
      store.palettes.push(palette)
      imported++
    }

    console.log(`[ColorHunt Sync] imported=${imported} skipped=${skipped} total=${codes.length}`)

    res.json({
      imported,
      skipped,
      total: codes.length,
      source: source || 'colorhunt_extension',
    })

  } catch (err) {
    console.error('ColorHunt sync error:', err)
    res.status(500).json({ error: 'Sync failed' })
  }
})

// GET /api/colorhunt/palettes
// Frontend fetches synced palettes
router.get('/palettes', (req, res) => {
  res.json({
    palettes: store.palettes,
    count: store.palettes.length,
    lastSync: store.palettes.length > 0
      ? store.palettes[store.palettes.length - 1].addedAt
      : null,
  })
})

export { router as colorhuntSync }
