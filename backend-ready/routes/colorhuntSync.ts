// ─── POST /api/colorhunt/sync ────────────────────────────────
// Receives palette codes from the Chrome extension.
// Deduplicates, inserts, and queues for auto-naming.
//
// Drop this into the Express backend when Phase B ships.
// Requires: schema.ts (palettes, colors tables), db.ts, autoName.ts

import { Router } from 'express'
// import { db } from '../db'
// import { palettes, colors } from '../schema'
// import { eq } from 'drizzle-orm'
// import { batchAutoName } from '../lib/autoName'

const router = Router()

// Auth middleware
function authSync(req: any, res: any, next: any) {
  const key = req.headers['x-api-key']
  if (!key || key !== process.env.COLORHUNT_SYNC_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' })
  }
  next()
}

router.post('/sync', authSync, async (req, res) => {
  try {
    const { codes, source } = req.body

    if (!Array.isArray(codes)) {
      return res.status(400).json({ error: 'codes must be an array' })
    }

    let imported = 0
    let skipped = 0
    const newPaletteIds: string[] = []

    for (const code of codes) {
      // Validate: must be 24 hex chars (4 colors × 6)
      const clean = code.replace(/[^a-fA-F0-9]/g, '')
      if (clean.length < 24) { skipped++; continue }

      // Parse 4 colors
      const paletteColors = []
      for (let i = 0; i < 4; i++) {
        const hex = '#' + clean.slice(i * 6, i * 6 + 6).toUpperCase()
        paletteColors.push(hex)
      }

      // Build dedupe hash
      const dedupeHash = [...paletteColors].sort().join('-')

      // Check if exists
      // const existing = await db.select().from(palettes)
      //   .where(eq(palettes.dedupeHash, dedupeHash)).limit(1)
      // if (existing.length > 0) { skipped++; continue }

      // Upsert individual colors
      // for (const hex of paletteColors) {
      //   await db.insert(colors)
      //     .values({ hex, name: 'ColorHunt', hueFamily: hexToHueFamily(hex), source: 'colorhunt' })
      //     .onConflictDoNothing()
      // }

      // Insert palette
      // const [palette] = await db.insert(palettes).values({
      //   name: `ColorHunt ${clean.slice(0, 8)}`,
      //   colorsCache: paletteColors,
      //   source: 'colorhunt',
      //   sourceSlug: clean,
      //   categoryTags: ['colorhunt', 'favorites'],
      //   autoNamed: false,
      //   dedupeHash,
      // }).returning()

      // newPaletteIds.push(palette.id)
      imported++
    }

    // Auto-name new palettes (max 20 per Haiku call)
    // if (newPaletteIds.length > 0) {
    //   await batchAutoName(newPaletteIds)
    // }

    res.json({
      imported,
      skipped,
      total: codes.length,
      source: source || 'colorhunt_extension',
    })

  } catch (err: any) {
    console.error('ColorHunt sync error:', err)
    res.status(500).json({ error: 'Sync failed' })
  }
})

export default router
