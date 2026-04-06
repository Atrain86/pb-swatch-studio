// ─── localStorage database layer ─────────────────────────────
// Two "tables": pb_colors (individual colors) and pb_palettes (named groups)
// Will migrate to Supabase Postgres in Phase B

import { hexToHueFamily, hexToHueAngle, hexToLightness, computeDedupeHash, palettePrimaryHue } from './colorUtils'
import { CURATED_PALETTES } from './constants'
import { ntcName } from './ntc'

const COLORS_KEY  = 'pb_colors'
const PALETTES_KEY = 'pb_palettes'
const SEED_KEY     = 'pb_seeded_v6'

// ─── Low-level storage ───────────────────────────────────────

function load(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
  catch { return fallback }
}

function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}

// ─── Colors table ────────────────────────────────────────────

export function getColors(filters = {}) {
  let colors = load(COLORS_KEY)
  if (filters.hueFamily) {
    colors = colors.filter(c => c.hueFamily === filters.hueFamily)
  }
  if (filters.source) {
    colors = colors.filter(c => c.source === filters.source)
  }
  return colors
}

export function getColorByHex(hex) {
  const colors = load(COLORS_KEY)
  return colors.find(c => c.hex.toUpperCase() === hex.toUpperCase()) || null
}

// Check if a color name is generic (just a hex code, placeholder, or source tag)
function isGenericName(name, hex) {
  if (!name) return true
  const n = name.trim().toUpperCase()
  const h = hex.toUpperCase()
  if (n === h || n === h.slice(1)) return true
  if (['COLORHUNT', 'COOLORS', 'SCANNED', 'CUSTOM', 'STEP 1', 'STEP 2', 'STEP 3', 'STEP 4', 'STEP 5', 'STEP 6', 'SEED', 'LIGHT TINT', 'PALE TINT', 'COMPLEMENT', 'SPLIT A', 'SPLIT B', 'NEUTRAL', 'TRIAD A', 'TRIAD B', 'ACCENT'].includes(n)) return true
  return false
}

export function upsertColor({ hex, name, source = 'custom' }) {
  const colors = load(COLORS_KEY)
  const normalized = hex.toUpperCase()
  const existing = colors.find(c => c.hex === normalized)
  if (existing) return existing

  // Use ntc.js to get a real color name when none is provided or name is generic
  let colorName = name
  if (isGenericName(name, normalized)) {
    const [, ntcColorName] = ntcName(normalized)
    colorName = ntcColorName
  }

  const color = {
    id: crypto.randomUUID(),
    hex: normalized,
    name: colorName,
    hueFamily: hexToHueFamily(normalized),
    hueAngle: hexToHueAngle(normalized),
    lightness: hexToLightness(normalized),
    source,
    addedAt: new Date().toISOString(),
  }
  colors.push(color)
  save(COLORS_KEY, colors)
  return color
}

export function upsertColors(colorList, source = 'custom') {
  return colorList.map(c => upsertColor({ hex: c.hex, name: c.name, source }))
}

// ─── Palettes table ──────────────────────────────────────────

export function getPalettes(filters = {}) {
  let palettes = load(PALETTES_KEY)

  if (filters.source) {
    if (Array.isArray(filters.source)) {
      palettes = palettes.filter(p => filters.source.includes(p.source))
    } else {
      palettes = palettes.filter(p => p.source === filters.source)
    }
  }

  if (filters.hueFamily && filters.hueFamily !== 'All') {
    const hue = filters.hueFamily.toLowerCase()
    palettes = palettes.filter(p => {
      const primary = palettePrimaryHue(p.colors)
      return primary === hue
    })
  }

  if (filters.tag) {
    const tag = filters.tag.toLowerCase()
    palettes = palettes.filter(p =>
      (p.categoryTags || []).some(t => t.toLowerCase() === tag)
    )
  }

  // Sort by likes descending, then by addedAt descending
  palettes.sort((a, b) => (b.likes || 0) - (a.likes || 0) || new Date(b.addedAt) - new Date(a.addedAt))

  return palettes
}

export function getPaletteById(id) {
  const palettes = load(PALETTES_KEY)
  return palettes.find(p => p.id === id) || null
}

export function insertPalette({ name, colors, categoryTags = [], source = 'custom', sourceSlug = '', likes = 0, autoNamed = false }) {
  const palettes = load(PALETTES_KEY)

  // Dedupe check
  const dedupeHash = computeDedupeHash(colors.map(c => c.hex))
  if (palettes.some(p => p.dedupeHash === dedupeHash)) {
    return null // duplicate
  }

  // Upsert individual colors
  upsertColors(colors, source === 'custom' || source === 'user' ? 'custom' : source)

  // Enrich individual color names via ntc.js
  const enrichedColors = colors.map(c => {
    const hex = c.hex.toUpperCase()
    if (isGenericName(c.name, hex)) {
      const [, ntcColorName] = ntcName(hex)
      return { hex, name: ntcColorName }
    }
    return { hex, name: c.name || hex }
  })

  const palette = {
    id: crypto.randomUUID(),
    name: name || `Palette ${palettes.length + 1}`,
    colors: enrichedColors,
    colorsCache: colors.map(c => c.hex.toUpperCase()),
    categoryTags,
    source,
    sourceSlug,
    likes,
    autoNamed,
    dedupeHash,
    addedAt: new Date().toISOString(),
  }
  palettes.push(palette)
  save(PALETTES_KEY, palettes)
  return palette
}

export function updatePalette(id, updates) {
  const palettes = load(PALETTES_KEY)
  const idx = palettes.findIndex(p => p.id === id)
  if (idx === -1) return null
  palettes[idx] = { ...palettes[idx], ...updates }
  save(PALETTES_KEY, palettes)
  return palettes[idx]
}

export function deletePalette(id) {
  const palettes = load(PALETTES_KEY)
  save(PALETTES_KEY, palettes.filter(p => p.id !== id))
}

// Get palettes that need auto-naming
export function getUnnamedPalettes() {
  return load(PALETTES_KEY).filter(p => !p.autoNamed && p.source !== 'curated' && p.source !== 'user' && !p.name.match(/^[A-Z]/))
}

// Batch update names from auto-naming results
export function batchUpdateNames(nameMap) {
  const palettes = load(PALETTES_KEY)
  let updated = 0
  nameMap.forEach(({ id, name }) => {
    const idx = palettes.findIndex(p => p.id === id)
    if (idx !== -1) {
      palettes[idx].name = name
      palettes[idx].autoNamed = true
      updated++
    }
  })
  save(PALETTES_KEY, palettes)
  return updated
}

// ─── User palettes (My Palettes tab) ─────────────────────────

export function getUserPalettes() {
  return getPalettes({ source: ['user', 'custom', 'colorhunt', 'coolors', 'curated', 'scanned', 'generated'] })
}

// ─── Browse palettes (Browse tab) ────────────────────────────

export function getBrowsePalettes(filters = {}) {
  return getPalettes(filters)
}

// ─── Seed curated palettes on first load ─────────────────────

export function seedIfNeeded() {
  if (localStorage.getItem(SEED_KEY)) return false

  CURATED_PALETTES.forEach(p => {
    insertPalette({
      name: p.name,
      colors: p.colors,
      categoryTags: p.categoryTags,
      source: 'curated',
      likes: 0,
      autoNamed: true,
    })
  })

  localStorage.setItem(SEED_KEY, 'true')
  return true
}

// ─── Scan history (keep existing pattern) ────────────────────

const SCAN_KEY = 'pb_ss_scans'
const MAX_SCANS = 50

export function getScanHistory() {
  return load(SCAN_KEY)
}

export function addScanToHistory(scan) {
  const history = load(SCAN_KEY)
  history.unshift(scan)
  save(SCAN_KEY, history.slice(0, MAX_SCANS))
}

export function clearScanHistory() {
  save(SCAN_KEY, [])
}

// ─── Preferences ─────────────────────────────────────────────

const PREFS_KEY = 'pb_ss_prefs'

export function getPrefs() {
  return load(PREFS_KEY, { deviceId: 'iphone_15_pro', rawMode: false })
}

export function savePrefs(prefs) {
  save(PREFS_KEY, prefs)
}
