// ============================================================
// PaintBrain — Swatch Studio v7
// Tabs: Discover · Browse · Palettes · Scanned
// ============================================================

import { useState, useRef, useEffect } from 'react'
import logo from '../assets/PB_LOGO_GRAPHFIX_1.png'
import { formatCopy, parsePaletteURL } from '../lib/colorUtils'
import { ANTHROPIC_API, HAIKU_MODEL } from '../lib/constants'
import { generateSchemesLAB } from '../lib/colorMath'
import * as db from '../lib/db'
import { fetchAndMergeSyncedPalettes } from '../lib/colorhuntSync'
import { ntcName } from '../lib/ntc'

// ─── LAB color math (inline for Discover) ────────────────────
const GOLDEN = 0.618033988749895

function labToHex(L, A, B) {
  L = Math.max(4, Math.min(96, L))
  const fy = (L + 16) / 116, fx = A / 500 + fy, fz = fy - B / 200
  const x = 0.95047 * (fx > 0.2069 ? fx ** 3 : (fx - 16 / 116) / 7.787)
  const y = 1.0 * (fy > 0.2069 ? fy ** 3 : (fy - 16 / 116) / 7.787)
  const z = 1.08883 * (fz > 0.2069 ? fz ** 3 : (fz - 16 / 116) / 7.787)
  let r = x * 3.2406 + y * -1.5372 + z * -0.4986
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415
  let b = x * 0.0557 + y * -0.2040 + z * 1.057
  const h = v => { const c = v > 0.0031308 ? 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055 : 12.92 * v; return Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, '0') }
  return '#' + h(r) + h(g) + h(b)
}

function hexToLab(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255
  let g = parseInt(hex.slice(3, 5), 16) / 255
  let b = parseInt(hex.slice(5, 7), 16) / 255
  const f = v => v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92
  r = f(r); g = f(g); b = f(b)
  const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
  const Y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0
  const Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883
  const ff = v => v > 0.008856 ? Math.cbrt(v) : (7.787 * v) + 16 / 116
  return [116 * ff(Y) - 16, 500 * (ff(X) - ff(Y)), 200 * (ff(Y) - ff(Z))]
}

function hueToLab(h) {
  const r = h * Math.PI / 180
  return labToHex(52, 55 * Math.cos(r), 55 * Math.sin(r))
}

function hueName(h) {
  h = ((h % 360) + 360) % 360
  if (h < 15 || h >= 345) return 'Red'
  if (h < 45) return 'Orange'
  if (h < 75) return 'Yellow'
  if (h < 165) return 'Green'
  if (h < 200) return 'Teal'
  if (h < 260) return 'Blue'
  if (h < 295) return 'Violet'
  return 'Pink'
}

function brightName(b) {
  if (b < 18) return 'Very dark'
  if (b < 36) return 'Dark'
  if (b < 54) return 'Midtone'
  if (b < 72) return 'Light'
  return 'Pale'
}

const HUE_RANGES = {
  Red: [-15, 15], Orange: [15, 45], Yellow: [45, 75], Green: [75, 165],
  Teal: [165, 200], Blue: [200, 260], Violet: [260, 295], Pink: [295, 345],
}

function genAll(n, startIdx) {
  const res = []
  let idx = startIdx
  for (let i = 0; i < n; i++) {
    const h = ((idx * GOLDEN) % 1) * 360; idx++
    const t = i % 3
    const L = t === 0 ? 18 + Math.random() * 14 : t === 1 ? 40 + Math.random() * 22 : 65 + Math.random() * 20
    const ch = i % 2 === 0 ? 54 + Math.random() * 32 : 15 + Math.random() * 20
    const r = h * Math.PI / 180
    res.push({ hex: labToHex(L, ch * Math.cos(r), ch * Math.sin(r)), h })
  }
  return { colors: res, nextIdx: idx }
}

function genCustom(n, dHue, dBright) {
  const name = hueName(dHue)
  const range = HUE_RANGES[name] || [-20, 20]
  const span = range[1] - range[0]
  const cL = 18 + (dBright / 100) * 68
  const Lmin = Math.max(10, cL - 26), Lmax = Math.min(92, cL + 26)
  const cols = 3, rows = Math.ceil(n / cols), res = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (res.length >= n) break
      const L = Lmax - (r / (rows - 1 || 1)) * (Lmax - Lmin)
      const hOff = (c / (cols - 1 || 1)) * span * 0.55 - span * 0.275
      const hA = ((range[0] + span / 2 + dHue + hOff) % 360 + 360) % 360
      const mf = 1 - Math.abs((r / (rows - 1 || 1)) - 0.5) * 0.3
      const ch = (50 + Math.random() * 26) * mf
      const rad = hA * Math.PI / 180
      res.push({ hex: labToHex(L, ch * Math.cos(rad), ch * Math.sin(rad)), h: hA })
    }
  }
  return res
}

// ─── Image preprocessing ─────────────────────────────────────
function preprocessImage(imgElement, mode = 'quick') {
  const maxSize = mode === 'precise' ? 800 : 300
  const blurRadius = mode === 'precise' ? 2 : 6
  const quality = mode === 'precise' ? 0.95 : 0.85
  let { width, height } = imgElement
  if (width > maxSize || height > maxSize) {
    const scale = maxSize / Math.max(width, height)
    width = Math.round(width * scale); height = Math.round(height * scale)
  }
  const c1 = document.createElement('canvas')
  c1.width = width; c1.height = height
  c1.getContext('2d').drawImage(imgElement, 0, 0, width, height)
  const c2 = document.createElement('canvas')
  c2.width = width; c2.height = height
  const ctx2 = c2.getContext('2d')
  ctx2.filter = `blur(${blurRadius}px)`
  ctx2.drawImage(c1, 0, 0)
  return { base64: c2.toDataURL('image/jpeg', quality).split(',')[1] }
}

// ─── Browse families (from reference) ────────────────────────
const BROWSE_FAMS = [
  { n: 'Yellows', c: ['#FFFFF0', '#FFFF99', '#FFFF00', '#FFD700', '#FFC200', '#FFB300', '#E6AC00', '#CC9900'] },
  { n: 'Oranges', c: ['#FFE4B5', '#FFD5A8', '#FFB347', '#FF8C42', '#FF7518', '#FF6200', '#E04000', '#CC3300'] },
  { n: 'Reds', c: ['#FFB3B3', '#FF8080', '#FF4444', '#FF0000', '#DC143C', '#C00000', '#A00000', '#800000'] },
  { n: 'Pinks', c: ['#FFD1DC', '#FFB6C1', '#FF69B4', '#FF1493', '#EA2264', '#C060A1', '#993556', '#72243E'] },
  { n: 'Purples', c: ['#E8D5FF', '#CC99FF', '#B13BFF', '#8B00FF', '#471396', '#35155D', '#26215C', '#090040'] },
  { n: 'Blues', c: ['#E6F0FF', '#B3CCFF', '#8CABFF', '#4477CE', '#1E90FF', '#0066CC', '#065084', '#000080'] },
  { n: 'Teals', c: ['#E0FFFF', '#80DEEA', '#26C6DA', '#00ACC1', '#0F828C', '#006064', '#00897B', '#00695C'] },
  { n: 'Greens', c: ['#E8F5E9', '#C8E6C9', '#A5D6A7', '#66BB6A', '#43A047', '#2E7D32', '#1B5E20', '#8BC34A'] },
  { n: 'Neutrals', c: ['#F5F5F5', '#E0E0E0', '#BDBDBD', '#9E9E9E', '#757575', '#424242', '#D2691E', '#8B4513'] },
]

const HUE_DOT_COLORS = ['#888', '#7B35FF', '#4477CE', '#0F828C', '#639922', '#FFCC00', '#EB5B00', '#E24B4A', '#EA2264']

const THEMES = [
  { ac: '#8CABFF' }, { ac: '#78C9C5' }, { ac: '#F07858' }, { ac: '#C060A8' }, { ac: '#D0A020' },
]
const THEME_DOTS = ['#8CABFF', '#78C9C5', '#F07858', '#C060A8', '#D0A020']

// ═════════════════════════════════════════════════════════════
// Main component
// ═════════════════════════════════════════════════════════════

export default function SwatchStudio() {
  // ── Init ──
  useEffect(() => {
    db.seedIfNeeded()
    fetchAndMergeSyncedPalettes().then(() => refreshPalettes())
  }, [])

  // ── Theme ──
  const [themeIdx, setThemeIdx] = useState(0)
  useEffect(() => {
    const ac = THEMES[themeIdx].ac
    const r = document.documentElement.style
    r.setProperty('--ac', ac)
    r.setProperty('--ac2', ac + '1a')
    r.setProperty('--bdr', ac + '2e')
    r.setProperty('--theme-accent', ac)
    // Update header borders
    document.querySelectorAll('.app-hdr,.disc-ctrl,.br-hdr,.pl-hdr,.scan-ctrl').forEach(el => {
      if (el) el.style.borderBottomColor = ac
    })
  }, [themeIdx])

  // ── Tabs ──
  const [activeTab, setActiveTab] = useState('discover')
  const scrollRefs = useRef({})
  function switchTab(tab) {
    // Save scroll position
    const current = document.getElementById(`tc-${activeTab}`)
    if (current) {
      const scrollable = current.querySelector('.d-grid-wrap, .br-lib, .pl-list, .scan-content')
      if (scrollable) scrollRefs.current[activeTab] = scrollable.scrollTop
    }
    setActiveTab(tab)
    if (tab === 'palettes') refreshPalettes()
    if (tab === 'scanned') setScanHistory(db.getScanHistory())
    // Restore scroll position after render
    requestAnimationFrame(() => {
      const next = document.getElementById(`tc-${tab}`)
      if (next) {
        const scrollable = next.querySelector('.d-grid-wrap, .br-lib, .pl-list, .scan-content')
        if (scrollable && scrollRefs.current[tab] != null) scrollable.scrollTop = scrollRefs.current[tab]
      }
    })
  }

  // ── Toast ──
  const [toast, setToast] = useState('')
  function notify(msg) { setToast(msg); setTimeout(() => setToast(''), 2000) }

  // ── Data ──
  const [userPalettes, setUserPalettes] = useState([])
  const [browsePalettes, setBrowsePalettes] = useState([])
  function refreshPalettes() {
    setUserPalettes(db.getUserPalettes())
    setBrowsePalettes(db.getBrowsePalettes())
  }

  // ══════════════════════════════════════════════════════════
  // DISCOVER STATE
  // ══════════════════════════════════════════════════════════
  const [dMode, setDMode] = useState('all')
  const [dHue, setDHue] = useState(180)
  const [dBright, setDBright] = useState(50)
  const [dCols, setDCols] = useState(() => {
    try { return parseInt(localStorage.getItem('discover_zoom_cols') || '3') } catch { return 3 }
  })
  const [dColors, setDColors] = useState(() => genAll(18, 0).colors)
  const [dPicks, setDPicks] = useState([])
  const dIdxRef = useRef(18)
  useEffect(() => { localStorage.setItem('discover_zoom_cols', String(dCols)) }, [dCols])

  function togglePick(c) {
    setDPicks(prev => prev.find(p => p.hex === c.hex) ? prev.filter(p => p.hex !== c.hex) : [...prev, c])
  }

  function handleSetMode(m) {
    setDMode(m)
    dIdxRef.current = 0
    if (m === 'all') {
      const r = genAll(18, 0)
      setDColors(r.colors); dIdxRef.current = r.nextIdx
    } else {
      setDColors(genCustom(18, dHue, dBright))
    }
  }

  function handleHueChange(v) {
    setDHue(v)
    dIdxRef.current = 0
    setDColors(genCustom(18, v, dBright))
  }

  function handleBrightChange(v) {
    setDBright(v)
    dIdxRef.current = 0
    setDColors(genCustom(18, dHue, v))
  }

  function moreColors() {
    if (dMode === 'all') {
      const r = genAll(9, dIdxRef.current)
      setDColors(prev => [...prev, ...r.colors]); dIdxRef.current = r.nextIdx
    } else {
      setDColors(prev => [...prev, ...genCustom(9, dHue, dBright)])
    }
  }

  function addToLibrary() {
    const n = dPicks.length
    dPicks.forEach(c => {
      const [, colorName] = ntcName(c.hex)
      db.upsertColor({ hex: c.hex, name: colorName, source: 'discovered' })
    })
    setDPicks([])
    if (n > 0) notify(`${n} color${n === 1 ? '' : 's'} added to Browse`)
  }

  // ══════════════════════════════════════════════════════════
  // BROWSE STATE
  // ══════════════════════════════════════════════════════════
  const [bStrip, setBStrip] = useState([])
  const [bSel, setBSel] = useState(null)
  const [bGenScheme, setBGenScheme] = useState([])
  const [bGenActive, setBGenActive] = useState(false)
  const [bCols, setBCols] = useState(8)
  const [bFidelity, setBFidelity] = useState(50)
  const [bPalName, setBPalName] = useState('')
  const [bLibColors, setBLibColors] = useState([])
  // Carousel: 0 = user palette, 1 = generated scheme
  const [carouselState, setCarouselState] = useState(0)
  const [carouselSplit, setCarouselSplit] = useState(false)
  const carouselTouchRef = useRef(null)
  const carouselTapRef = useRef(0)

  // Sync discovered colors into browse library
  useEffect(() => {
    setBLibColors(db.getColors({ source: 'discovered' }))
  }, [activeTab])

  function selectBColor(hex) {
    setBSel(hex)
  }

  function addToStrip() {
    if (!bSel || bStrip.length >= 8) return
    if (!bStrip.includes(bSel)) setBStrip(prev => [...prev, bSel])
  }

  function removeFromStrip(hex) {
    setBStrip(prev => prev.filter(h => h !== hex))
  }

  function generateBrowseScheme() {
    if (!bSel) return
    const variance = 8 + (bFidelity / 100) * 55
    const [L, A, Bv] = hexToLab(bSel)
    const scheme = []
    for (let i = 0; i < 5; i++) {
      const t = i / 4 - 0.5
      const nL = Math.max(15, Math.min(90, L + t * variance * 0.8))
      const nA = A * (1 - Math.abs(t) * 0.4) + t * variance * 0.3
      const nB = Bv * (1 - Math.abs(t) * 0.4) - t * variance * 0.3
      scheme.push(labToHex(nL, nA, nB))
    }
    setBGenScheme(scheme)
    setBGenActive(true)
  }

  function addGenAll() {
    bGenScheme.forEach(h => {
      if (!bStrip.includes(h) && bStrip.length < 8) setBStrip(prev => prev.includes(h) ? prev : [...prev, h])
    })
  }

  function closeGen() { setBGenScheme([]); setBGenActive(false) }

  async function autoNameBrowse() {
    if (!bStrip.length) return
    try {
      const res = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: HAIKU_MODEL, max_tokens: 100, system: 'Give this color palette a short evocative 2-3 word name. Return ONLY the name.', messages: [{ role: 'user', content: JSON.stringify(bStrip) }] }),
      })
      const data = await res.json()
      const n = (data.content?.[0]?.text || '').trim().replace(/"/g, '')
      if (n) setBPalName(n)
    } catch {}
  }

  function saveBrowsePal() {
    if (!bStrip.length && !carouselSplit) return
    const name = bPalName.trim() || `Palette ${Date.now() % 10000}`
    // In split view, save both palettes
    if (carouselSplit && bGenScheme.length > 0) {
      const userColors = bStrip.map(hex => ({ hex, name: ntcName(hex)[1] }))
      const genColors = bGenScheme.map(hex => ({ hex, name: ntcName(hex)[1] }))
      db.insertPalette({ name, colors: userColors, source: 'custom' })
      db.insertPalette({ name: name + ' (generated)', colors: genColors, source: 'generated' })
      notify('Both palettes saved'); refreshPalettes(); setBStrip([]); setBPalName(''); setBGenScheme([]); setBGenActive(false); setCarouselSplit(false)
      return
    }
    // Save whichever carousel state is visible
    const hexes = carouselState === 1 && bGenScheme.length > 0 ? bGenScheme : bStrip
    if (!hexes.length) return
    const colors = hexes.map(hex => ({ hex, name: ntcName(hex)[1] }))
    const source = carouselState === 1 && bGenScheme.length > 0 ? 'generated' : 'custom'
    const result = db.insertPalette({ name, colors, source })
    if (result) { notify('Palette saved'); refreshPalettes(); setBStrip([]); setBPalName(''); if (source === 'generated') { setBGenScheme([]); setBGenActive(false) } }
    else notify('Duplicate palette')
  }

  function copyBrowsePal() {
    if (!bStrip.length) return
    const name = bPalName.trim() || 'Palette'
    const colors = bStrip.map(hex => ({ hex }))
    navigator.clipboard.writeText(formatCopy(name, colors)).catch(() => {})
    notify('Copied!')
  }

  // ══════════════════════════════════════════════════════════
  // PALETTES STATE
  // ══════════════════════════════════════════════════════════
  const [palSrc, setPalSrc] = useState('all')
  const [palHue, setPalHue] = useState(0)
  const [palSearch, setPalSearch] = useState('')
  const [palSearchResults, setPalSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)

  const filteredPalettes = (() => {
    let pals = palSearchResults || userPalettes
    if (palSrc === 'colorhunt') pals = pals.filter(p => p.source === 'colorhunt' || p.source === 'coolors')
    else if (palSrc === 'custom') pals = pals.filter(p => p.source === 'custom' || p.source === 'user')
    else if (palSrc === 'generated') pals = pals.filter(p => p.source === 'scanned' || p.source === 'generated')
    // Hue dot filter (index 0 = all)
    if (palHue > 0) {
      const hueNames = ['', 'violet', 'blue', 'teal', 'green', 'yellow', 'orange', 'red', 'pink']
      const target = hueNames[palHue]
      if (target) pals = pals.filter(p => {
        const primary = p.colors?.[0]?.hex
        if (!primary) return false
        const name = ntcName(primary)[1]?.toLowerCase() || ''
        return name.includes(target)
      })
    }
    return pals
  })()

  function handlePalSearch() {
    const v = palSearch.trim()
    if (!v) { setPalSearchResults(null); return }
    // Check URL first
    const parsed = parsePaletteURL(v)
    if (parsed) {
      const name = parsed.source === 'colorhunt' ? `ColorHunt ${parsed.slug.slice(0, 12)}` : 'Coolors import'
      const result = db.insertPalette({ name, colors: parsed.colors, source: parsed.source, sourceSlug: parsed.slug, autoNamed: false })
      if (result) { setPalSearch(''); refreshPalettes(); notify('Palette imported'); autoNamePalette(result.id) }
      else { setPalSearch(''); notify('Already imported') }
      return
    }
    // NLP search
    searchPalettes(v)
  }

  async function searchPalettes(query) {
    setSearching(true)
    try {
      const all = db.getPalettes()
      const res = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: HAIKU_MODEL, max_tokens: 1200,
          system: `Palette search. Return up to 8 matching as JSON array of {id}. Database: ${JSON.stringify(all.map(p => ({ id: p.id, name: p.name, colors: p.colorsCache, tags: p.categoryTags })))}`,
          messages: [{ role: 'user', content: query }] }),
      })
      const data = await res.json()
      const ids = JSON.parse((data.content?.[0]?.text || '').replace(/```json|```/g, '').trim()).map(r => r.id)
      setPalSearchResults(all.filter(p => ids.includes(p.id)))
    } catch { notify('Search failed') }
    finally { setSearching(false) }
  }

  async function autoNamePalette(id) {
    const p = db.getPaletteById(id)
    if (!p) return
    try {
      const res = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: HAIKU_MODEL, max_tokens: 100, system: 'Give this palette a short 2-3 word name. Return ONLY the name.', messages: [{ role: 'user', content: JSON.stringify(p.colors.map(c => c.hex)) }] }),
      })
      const data = await res.json()
      const name = (data.content?.[0]?.text || '').trim().replace(/"/g, '')
      if (name) { db.updatePalette(id, { name, autoNamed: true }); refreshPalettes() }
    } catch {}
  }

  function loadPalette(p) {
    setBStrip(p.colors.map(c => c.hex))
    setBPalName(p.name)
    notify('Loaded into Browse builder')
  }

  function copyPalette(p) {
    navigator.clipboard.writeText(formatCopy(p.name, p.colors)).catch(() => {})
    notify('Copied!')
  }

  function sharePalette(p) {
    const text = formatCopy(p.name, p.colors)
    navigator.share ? navigator.share({ title: p.name, text }).catch(() => {}) : (navigator.clipboard.writeText(text).catch(() => {}), notify('Copied'))
  }

  function deletePalette(id) {
    db.deletePalette(id); refreshPalettes(); notify('Deleted')
  }

  // ══════════════════════════════════════════════════════════
  // SCANNED STATE
  // ══════════════════════════════════════════════════════════
  const [scanning, setScanning] = useState(false)
  const [scanColors, setScanColors] = useState([])
  const [scanImage, setScanImage] = useState(null)
  const [scanWarning, setScanWarning] = useState(null)
  const [scanSchemes, setScanSchemes] = useState([])
  const [scanSchemeTab, setScanSchemeTab] = useState(0)
  const [scanHistory, setScanHistory] = useState(db.getScanHistory)
  const fileRef = useRef(null)
  const cameraRef = useRef(null)

  async function handleScanFile(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    let dataUrl = ''
    await new Promise(resolve => { reader.onload = ev => { dataUrl = ev.target.result; setScanImage(dataUrl); resolve() }; reader.readAsDataURL(file) })
    setScanColors([]); setScanWarning(null); setScanSchemes([]); setScanning(true)
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image(); el.onload = () => resolve(el); el.onerror = reject; el.src = dataUrl
      })
      const { base64 } = preprocessImage(img, 'quick')
      const res = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: HAIKU_MODEL, max_tokens: 600,
          system: 'Extract 3-6 dominant colors. Return ONLY JSON: [{"hex":"#RRGGBB","name":"name","coverage":"dominant|accent|subtle"}]',
          messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } }, { type: 'text', text: 'Extract colors.' }] }] }),
      })
      const data = await res.json()
      const colors = JSON.parse((data.content?.[0]?.text || '').replace(/```json|```/g, '').trim())
      setScanColors(colors)
      colors.forEach(c => db.upsertColor({ hex: c.hex, name: c.name, source: 'scanned' }))
      if (colors.length >= 8) setScanWarning('Too many colors — scan a smaller area')
      db.addScanToHistory({ id: Date.now(), colors, date: new Date().toLocaleDateString('en-CA'), image: dataUrl })
      setScanHistory(db.getScanHistory())
    } catch { setScanWarning("Couldn't read this image — try closer with even lighting") }
    finally { setScanning(false) }
  }

  function saveScanAsPalette(colors) {
    const name = `Scan ${new Date().toLocaleDateString('en-CA')}`
    const result = db.insertPalette({ name, colors, source: 'scanned', categoryTags: ['scanned'] })
    if (result) { notify('Saved to Palettes'); refreshPalettes() } else notify('Already saved')
  }

  function generateScanScheme() {
    if (!scanColors.length) return
    setScanSchemes(generateSchemesLAB(scanColors[0].hex))
    setScanSchemeTab(0)
  }

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div className="app-shell">
      {toast && <div className="toast">{toast}</div>}

      {/* ── Header ── */}
      <div className="app-hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={logo} alt="PaintBrain" style={{ width: 50, height: 50, borderRadius: 10, objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none' }} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, background: 'linear-gradient(90deg,#B13BFF,#EA2264,#EB5B00)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>PaintBrain</div>
            <div style={{ fontSize: 9, color: 'var(--tx3)', letterSpacing: '0.06em', marginTop: 1 }}>Swatch Studio</div>
          </div>
        </div>
        <div className="theme-dots">
          {THEME_DOTS.map((col, i) => (
            <div key={i} className={`tdot${themeIdx === i ? ' on' : ''}`} style={{ background: col }} onClick={() => setThemeIdx(i)} />
          ))}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="tabbar">
        {['discover', 'browse', 'palettes', 'scanned'].map(id => (
          <button key={id}
            className={`tab${activeTab === id ? ` on t-${id}` : ''}`}
            onClick={() => switchTab(id)}>
            {id.charAt(0).toUpperCase() + id.slice(1)}
          </button>
        ))}
      </div>

      {/* ═══════════ DISCOVER ═══════════ */}
      <div className={`tc${activeTab === 'discover' ? ' on' : ''}`} id="tc-discover">
        <div className="disc-ctrl">
          <div className="mtoggle">
            <button className={`mt${dMode === 'all' ? ' on' : ''}`} onClick={() => handleSetMode('all')}>All</button>
            <button className={`mt${dMode === 'custom' ? ' on' : ''}`} onClick={() => handleSetMode('custom')}>Custom</button>
          </div>
          {dMode === 'custom' && (
            <>
              <div className="sl-row">
                <span className="sl-lbl">Hue</span>
                <div className="sl-track-wrap hue-track">
                  <input type="range" min="0" max="360" value={dHue} step="1" onChange={e => handleHueChange(+e.target.value)} />
                  <div className="sl-knob" style={{ left: `${dHue / 360 * 100}%`, background: hueToLab(dHue) }} />
                </div>
                <div className="sl-circle" style={{ background: hueToLab(dHue) }} />
                <span className="sl-val">{hueName(dHue)} · {Math.round(dHue)}°</span>
              </div>
              <div className="sl-row">
                <span className="sl-lbl">Brightness</span>
                <div className="sl-track-wrap bright-track">
                  <input type="range" min="0" max="100" value={dBright} step="1" onChange={e => handleBrightChange(+e.target.value)} />
                  <div className="sl-knob" style={{ left: `${dBright}%`, background: `rgb(${Math.round(dBright / 100 * 215)},${Math.round(dBright / 100 * 215)},${Math.round(dBright / 100 * 215)})` }} />
                </div>
                <div className="sl-circle" style={{ background: `rgb(${Math.round(dBright / 100 * 215)},${Math.round(dBright / 100 * 215)},${Math.round(dBright / 100 * 215)})` }} />
                <span className="sl-val">{brightName(dBright)}</span>
              </div>
            </>
          )}
          <div className="picks-inline">
            <span className="picks-lbl">Picks</span>
            <div className="picks-chips">
              {dPicks.length === 0 ? (
                <span className="picks-hint">Tap colors below</span>
              ) : dPicks.map(c => (
                <div key={c.hex} className="pk" style={{ background: c.hex }}
                  onClick={() => togglePick(c)} />
              ))}
            </div>
            <button className="add-lib" onClick={addToLibrary}>Add to library</button>
          </div>
        </div>
        <div className="d-grid-wrap">
          <div className="zoom-ctrl">
            <span className="zoom-lbl">Size</span>
            <button className="zoom-btn" onClick={() => setDCols(c => Math.max(2, c - 1))}>−</button>
            <button className="zoom-btn" onClick={() => setDCols(c => Math.min(6, c + 1))}>+</button>
          </div>
          <div className="d-grid" style={{ gridTemplateColumns: `repeat(${dCols}, 1fr)` }}>
            {dColors.map((c, i) => (
              <div key={c.hex + i} className={`dc${dPicks.find(p => p.hex === c.hex) ? ' sel' : ''}`}
                style={{ background: c.hex }} onClick={() => togglePick(c)}>
                <div className="dc-hex">{c.hex}</div>
              </div>
            ))}
          </div>
          <button className="more-btn" onClick={moreColors}>Generate more</button>
        </div>
      </div>

      {/* ═══════════ BROWSE ═══════════ */}
      <div className={`tc${activeTab === 'browse' ? ' on' : ''}`} id="tc-browse">
        <div className="br-hdr">
          {/* Preview strip — carousel */}
          <div className="preview-strip"
            onTouchStart={e => { carouselTouchRef.current = e.touches[0].clientX }}
            onTouchEnd={e => {
              const dx = e.changedTouches[0].clientX - (carouselTouchRef.current || 0)
              if (Math.abs(dx) > 40 && bGenScheme.length > 0) {
                setCarouselState(dx < 0 ? 1 : 0)
                setCarouselSplit(false)
              }
            }}
            onClick={() => {
              const now = Date.now()
              if (now - carouselTapRef.current < 350 && bGenScheme.length > 0) {
                setCarouselSplit(prev => !prev)
              }
              carouselTapRef.current = now
            }}>
            {bStrip.length === 0 && !carouselSplit ? (
              <div className="ps-hint">Tap any color below to preview · tap + to add to palette</div>
            ) : carouselSplit && bGenScheme.length > 0 ? (
              /* Split view — user palette left, generated right */
              <>
                <div style={{ display: 'flex', flex: 1 }}>
                  {bStrip.map(hex => (
                    <div key={hex} className="ps-chip" style={{ background: hex, flex: 1 }} title={hex} />
                  ))}
                </div>
                <div style={{ width: 1, background: '#000', flexShrink: 0 }} />
                <div style={{ display: 'flex', flex: 1 }}>
                  {bGenScheme.map(h => (
                    <div key={h} style={{ background: h, flex: 1 }} />
                  ))}
                </div>
              </>
            ) : carouselState === 1 && bGenScheme.length > 0 ? (
              /* Generated scheme view */
              bGenScheme.map(h => (
                <div key={h} className="ps-chip" style={{ background: h }} title={h}
                  onClick={e => { e.stopPropagation(); if (!bStrip.includes(h) && bStrip.length < 8) setBStrip(prev => [...prev, h]) }} />
              ))
            ) : (
              /* User palette view (default) */
              bStrip.map(hex => (
                <div key={hex} className="ps-chip" style={{ background: hex }} title={hex}
                  onClick={e => { e.stopPropagation(); removeFromStrip(hex) }} />
              ))
            )}
          </div>
          {/* Carousel indicators */}
          {bGenScheme.length > 0 && (
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 4, marginTop: -4 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: carouselState === 0 && !carouselSplit ? 'var(--ac)' : 'var(--tx3)', transition: 'background 0.15s' }} />
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: carouselState === 1 && !carouselSplit ? 'var(--ac)' : 'var(--tx3)', transition: 'background 0.15s' }} />
            </div>
          )}
          {/* Palette actions */}
          <div className="pal-acts">
            <input className="nin" placeholder="Palette name..." value={bPalName} onChange={e => setBPalName(e.target.value)} />
            <button className="wbtn" onClick={autoNameBrowse}>Auto</button>
            <button className="wbtn" onClick={saveBrowsePal}>Save</button>
            <button className="wbtn" onClick={copyBrowsePal}>Copy</button>
            <button className="wbtn" onClick={() => { setBStrip([]); setBPalName('') }}>Clear</button>
          </div>
          {/* Context row — selected color */}
          {bSel && (
            <div className="ctx-row">
              <div className="ctx-sw" style={{ background: bSel }} />
              <span className="ctx-hex">{bSel}</span>
              <span className="ctx-nm">· {ntcName(bSel)[1]}</span>
              <div className="ctx-acts">
                <button className="wbtn" onClick={addToStrip}>+ Add</button>
                <button className="wbtn" onClick={() => { navigator.clipboard.writeText(bSel).catch(() => {}); notify('Copied!') }}>Copy</button>
                <button className="wbtn" onClick={generateBrowseScheme}>
                  {bGenActive ? 'Regenerate ▾' : 'Generate ▾'}
                </button>
              </div>
            </div>
          )}
          {/* Generated scheme row */}
          {bGenActive && bGenScheme.length > 0 && (
            <div className="gen-row">
              <div className="gen-strip">
                {bGenScheme.map(h => (
                  <div key={h} className="gs" style={{ background: h }}
                    onClick={() => { if (!bStrip.includes(h) && bStrip.length < 8) setBStrip(prev => [...prev, h]) }} />
                ))}
              </div>
              <button className="wbtn" onClick={addGenAll}>+ All</button>
              <button className="wbtn" onClick={closeGen}>✕</button>
            </div>
          )}
          {/* Fidelity slider */}
          <div className="fid-wrap">
            <span className="fid-lbl">Fidelity</span>
            <div className="fid-track">
              <input type="range" min="0" max="100" value={bFidelity} step="1"
                onChange={e => { setBFidelity(+e.target.value); if (bGenActive) generateBrowseScheme() }} />
              <div className="fid-knob" style={{ left: `${bFidelity}%` }} />
            </div>
            <span className="fid-lbl">Wild</span>
          </div>
        </div>
        {/* Library */}
        <div className="br-lib">
          <div className="lib-zoom">
            <span className="zoom-lbl">Density</span>
            <button className="zoom-btn" onClick={() => setBCols(c => Math.max(4, c - 1))}>−</button>
            <button className="zoom-btn" onClick={() => setBCols(c => Math.min(12, c + 1))}>+</button>
          </div>
          {/* User's discovered colors */}
          {bLibColors.length > 0 && (
            <div>
              <div className="fam-lbl">Your library · {bLibColors.length}</div>
              <div className="b-grid" style={{ gridTemplateColumns: `repeat(${bCols}, 1fr)` }}>
                {bLibColors.map(c => (
                  <div key={c.hex} className={`bch${bSel === c.hex ? ' sel' : ''}`}
                    style={{ background: c.hex, height: Math.round(280 / bCols) }}
                    onClick={() => selectBColor(c.hex)} />
                ))}
              </div>
            </div>
          )}
          {/* Built-in families */}
          {BROWSE_FAMS.map(fam => (
            <div key={fam.n}>
              <div className="fam-lbl">{fam.n}</div>
              <div className="b-grid" style={{ gridTemplateColumns: `repeat(${bCols}, 1fr)` }}>
                {fam.c.map(hex => (
                  <div key={hex} className={`bch${bSel === hex ? ' sel' : ''}`}
                    style={{ background: hex, height: Math.round(280 / bCols) }}
                    onClick={() => selectBColor(hex)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ PALETTES ═══════════ */}
      <div className={`tc${activeTab === 'palettes' ? ' on' : ''}`} id="tc-palettes">
        <div className="pl-hdr">
          <div className="sr">
            <input className="si" placeholder="Search or paste a ColorHunt URL..."
              value={palSearch} onChange={e => setPalSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handlePalSearch() }} />
            <button className="sb" onClick={handlePalSearch} disabled={searching}>
              {searching ? '...' : 'Search'}
            </button>
          </div>
          <div className="src-row">
            {['all', 'colorhunt', 'custom', 'generated'].map(s => (
              <button key={s} className={`src${palSrc === s ? ' on' : ''}`}
                onClick={() => { setPalSrc(s); setPalSearchResults(null) }}>
                {s === 'all' ? 'All' : s === 'colorhunt' ? 'ColorHunt' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="hue-dots-row">
            {HUE_DOT_COLORS.map((col, i) => (
              <div key={i} className={`hd${palHue === i ? ' on' : ''}`} style={{ background: col }}
                onClick={() => setPalHue(palHue === i ? 0 : i)} />
            ))}
          </div>
        </div>
        <div className="pl-list">
          {filteredPalettes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 11, color: 'var(--tx3)' }}>No palettes match</div>
          ) : filteredPalettes.map(p => (
            <div key={p.id} className="plc">
              <div className="pl-strip">
                {p.colors.map((c, i) => (
                  <div key={(c.hex || c) + i} className="pl-seg" style={{ background: c.hex || c }}
                    onClick={() => { setBStrip(p.colors.map(cc => cc.hex || cc)); setBPalName(p.name) }} />
                ))}
              </div>
              <div className="pl-info">
                <div className="pl-name">{p.name}</div>
                <div className="pl-meta">
                  <span className="pl-badge">{p.source}</span>
                  {(p.categoryTags || []).join(' · ')}
                  {p.addedAt && ` · ${p.addedAt.split('T')[0]}`}
                </div>
                <div className="pl-btns">
                  <button className="pl-btn" onClick={() => loadPalette(p)}>Load</button>
                  <button className="pl-btn" onClick={() => copyPalette(p)}>Copy</button>
                  <button className="pl-btn" onClick={() => sharePalette(p)}>Share</button>
                  {p.source !== 'curated' && (
                    <button className="pl-btn del" onClick={() => deletePalette(p.id)}>Delete</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ SCANNED ═══════════ */}
      <div className={`tc${activeTab === 'scanned' ? ' on' : ''}`} id="tc-scanned">
        <div className="scan-ctrl">
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--tx2)', marginBottom: 14 }}>Upload or scan a photo to extract colors</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="wbtn" onClick={() => fileRef.current?.click()}
                style={{ border: '1.5px solid var(--ac)', padding: '8px 16px', borderRadius: 8, color: 'var(--ac)' }}>
                Upload photo
              </button>
              <button className="wbtn" onClick={() => cameraRef.current?.click()}
                style={{ border: '1px solid var(--bdr2)', padding: '8px 16px', borderRadius: 8 }}>
                Open camera
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleScanFile} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleScanFile} />
          </div>
        </div>
        <div className="scan-content">
          {scanning && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', padding: '16px 0' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--bdr)', borderTopColor: 'var(--ac)', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 13, color: 'var(--tx)' }}>Extracting colors…</span>
            </div>
          )}

          {scanWarning && !scanning && (
            <div style={{ display: 'flex', gap: 8, padding: '8px 12px', borderRadius: 8, border: '1.5px solid rgba(255,180,0,0.3)', background: 'rgba(255,180,0,0.05)', fontSize: 11, color: '#ffd080', marginBottom: 10 }}>
              <span style={{ flex: 1 }}>{scanWarning}</span>
              <button onClick={() => setScanWarning(null)} style={{ background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer' }}>×</button>
            </div>
          )}

          {scanColors.length > 0 && !scanning && (
            <div style={{ border: '1.5px solid var(--bdr2)', borderRadius: 11, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 12, padding: 12 }}>
                {scanImage && <img src={scanImage} alt="" style={{ width: 100, height: 100, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--bdr2)' }} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--tx)', marginBottom: 6 }}>{scanColors.length} colors detected</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {scanColors.map((c, i) => {
                      const displayName = c.name && c.name !== c.hex ? c.name : ntcName(c.hex)[1]
                      return (
                        <div key={c.hex + i} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                          <div style={{ width: 28, height: 28, borderRadius: 4, background: c.hex, border: '0.5px solid var(--bdr2)' }} />
                          <span style={{ fontSize: 9, color: 'var(--tx2)' }}>{displayName}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div style={{ padding: '6px 12px', borderTop: '1px solid var(--bdr2)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button className="wbtn" onClick={generateScanScheme} style={{ color: 'var(--ac)' }}>Generate</button>
                <button className="wbtn" onClick={() => saveScanAsPalette(scanColors)}>Save to Palettes</button>
                <button className="wbtn" onClick={() => { setScanColors([]); setScanImage(null); setScanWarning(null); setScanSchemes([]) }} style={{ marginLeft: 'auto' }}>Clear</button>
              </div>
              {/* Inline generated schemes */}
              {scanSchemes.length > 0 && (
                <div style={{ padding: '6px 12px 10px', borderTop: '1px solid var(--bdr2)' }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6, overflowX: 'auto' }}>
                    {scanSchemes.map((s, i) => (
                      <button key={s.name} className="wbtn" onClick={() => setScanSchemeTab(i)}
                        style={{ fontSize: 9, padding: '2px 8px', borderRadius: 12, border: scanSchemeTab === i ? '1.5px solid var(--ac)' : '1px solid var(--bdr2)', color: scanSchemeTab === i ? 'var(--ac)' : 'var(--tx3)', flexShrink: 0 }}>
                        {s.name.replace(' Gradient', '').replace(' Palette', '')}
                      </button>
                    ))}
                    <button className="wbtn" onClick={() => setScanSchemes([])} style={{ fontSize: 9, marginLeft: 'auto', color: 'var(--tx3)' }}>×</button>
                  </div>
                  <div style={{ display: 'flex', height: 32, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--bdr2)' }}>
                    {scanSchemes[scanSchemeTab].colors.map((c, i) => (
                      <div key={c.hex + i} style={{ flex: 1, background: c.hex, cursor: 'pointer' }} title={`${ntcName(c.hex)[1]} ${c.hex}`} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <button className="wbtn" onClick={() => saveScanAsPalette(scanSchemes[scanSchemeTab].colors)} style={{ color: 'var(--ac)' }}>Save theme</button>
                    <button className="wbtn" onClick={() => { navigator.clipboard.writeText(formatCopy(scanSchemes[scanSchemeTab].name, scanSchemes[scanSchemeTab].colors)).catch(() => {}); notify('Copied!') }}>Copy</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Scan history */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Scan library · {scanHistory.length} scan{scanHistory.length !== 1 ? 's' : ''}
              </span>
              {scanHistory.length > 0 && (
                <button className="wbtn" onClick={() => { db.clearScanHistory(); setScanHistory([]); notify('Cleared') }} style={{ fontSize: 9 }}>Clear all</button>
              )}
            </div>
            {scanHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 11, color: 'var(--tx3)' }}>No scans yet</div>
            ) : scanHistory.map(scan => (
              <div key={scan.id} className="plc" style={{ cursor: 'pointer', marginBottom: 8 }}
                onClick={() => { setScanImage(scan.image); setScanColors(scan.colors || []); setScanWarning(null); setScanSchemes([]) }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8 }}>
                  {scan.image && <img src={scan.image} alt="" style={{ width: 50, height: 50, borderRadius: 6, objectFit: 'cover' }} />}
                  <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                    {(scan.colors || []).slice(0, 5).map((c, i) => (
                      <div key={c.hex + i} style={{ width: 22, height: 22, borderRadius: 3, background: c.hex, border: '0.5px solid var(--bdr2)' }} />
                    ))}
                  </div>
                  <div style={{ flex: 1, fontSize: 10, color: 'var(--tx3)' }}>{scan.date}</div>
                  <button className="wbtn" onClick={e => { e.stopPropagation(); saveScanAsPalette(scan.colors || []) }} style={{ fontSize: 9 }}>+ Save</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
