// ============================================================
// PaintBrain — ColorShare Studio v3
// Tabs: Discover · Create · Palettes · Scan
// ============================================================

import { useState, useRef, useEffect } from 'react'
import logo from '../assets/PB_LOGO_GRAPHFIX_1.png'
import { ArrowUpToLine, Copy, Share2, Trash2 } from 'lucide-react'

// ─── LAB color math ──────────────────────────────────────────
function l2h(L, A, B) {
  L = Math.max(8, Math.min(92, L))
  const fy = (L + 16) / 116, fx = A / 500 + fy, fz = fy - B / 200
  const x = 0.95047 * (fx > 0.2069 ? fx ** 3 : (fx - 16 / 116) / 7.787)
  const y = fy > 0.2069 ? fy ** 3 : (fy - 16 / 116) / 7.787
  const z = 1.08883 * (fz > 0.2069 ? fz ** 3 : (fz - 16 / 116) / 7.787)
  let r = x * 3.2406 + y * -1.5372 + z * -0.4986
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415
  let b = x * 0.0557 + y * -0.2040 + z * 1.057
  const gm = v => v > 0.0031308 ? 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055 : 12.92 * v
  const c = v => Math.max(0, Math.min(255, Math.round(gm(v) * 255)))
  return `#${c(r).toString(16).padStart(2, '0')}${c(g).toString(16).padStart(2, '0')}${c(b).toString(16).padStart(2, '0')}`
}

function hslHex(h, s, l) {
  h /= 360; s /= 100; l /= 100
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
  const f = (_p, _q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return _p + (_q - _p) * 6 * t; if (t < 0.5) return _q; if (t < 2 / 3) return _p + (_q - _p) * (2 / 3 - t) * 6; return _p }
  return '#' + [f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}

// Seeded random for daily consistency
const daySeed = (() => { const d = new Date(); return d.getFullYear() * 365 + d.getMonth() * 30 + d.getDate() })()
function sr(n) { let x = Math.sin(daySeed + n * 7.93) * 1e5; return x - Math.floor(x) }

// ─── LAB color engine — Khroma-quality generation ────────────
function labInGamut(L, A, B) {
  // Convert LAB → linear RGB, check all channels in [0,1]
  const fy = (L + 16) / 116, fx = A / 500 + fy, fz = fy - B / 200
  const x = 0.95047 * (fx > 0.2069 ? fx ** 3 : (fx - 16/116) / 7.787)
  const y =            (fy > 0.2069 ? fy ** 3 : (fy - 16/116) / 7.787)
  const z = 1.08883 * (fz > 0.2069 ? fz ** 3 : (fz - 16/116) / 7.787)
  const r = x * 3.2406 + y * -1.5372 + z * -0.4986
  const g = x * -0.9689 + y * 1.8758 + z * 0.0415
  const b = x * 0.0557 + y * -0.2040 + z * 1.057
  return r >= -0.01 && r <= 1.01 && g >= -0.01 && g <= 1.01 && b >= -0.01 && b <= 1.01
}

// Generate one beautiful LAB color using pure Math.random (not seeded — truly random each call)
function randomLabColor() {
  for (let attempts = 0; attempts < 30; attempts++) {
    const L = 25 + Math.random() * 60        // 25–85
    const a = (Math.random() - 0.5) * 100    // -50 to +50
    const b = (Math.random() - 0.5) * 100    // -50 to +50
    const chroma = Math.sqrt(a * a + b * b)
    if (chroma >= 15 && chroma <= 70 && labInGamut(L, a, b)) {
      return { hex: l2h(L, a, b), L, a, b }
    }
  }
  return { hex: l2h(55, -20, -15), L: 55, a: -20, b: -15 } // teal fallback
}

// Generate one batch of n random LAB colors, sorted dark→light
function genRandomBatch(n = 40) {
  const batch = []
  while (batch.length < n) batch.push(randomLabColor())
  batch.sort((x, y) => x.L - y.L)
  return batch.map(c => c.hex)
}

// Generate a uniform batch covering LAB space systematically, sorted dark→light
function genUniformBatch(offset = 0, n = 40) {
  const hueSteps = 36, lSteps = [30, 45, 60, 75]
  const colors = []
  for (let hi = 0; hi < hueSteps; hi++) {
    const angleRad = ((hi * 10) + offset * 5) * Math.PI / 180
    const chroma = 40
    for (const L of lSteps) {
      const a = chroma * Math.cos(angleRad), b = chroma * Math.sin(angleRad)
      if (labInGamut(L, a, b)) colors.push({ hex: l2h(L, a, b), L })
    }
  }
  colors.sort((x, y) => x.L - y.L)
  // Return n colors starting at offset position
  const start = (offset * n) % Math.max(colors.length, 1)
  const slice = [...colors.slice(start), ...colors.slice(0, start)].slice(0, n)
  return slice.map(c => c.hex)
}

// ─── Hue filter dots for Palettes tab ────────────────────────
const HUE_DOTS = [
  { h: null, c: '#505060' }, { h: 0, c: '#e05050' }, { h: 25, c: '#e07820' }, { h: 55, c: '#c4b010' },
  { h: 120, c: '#38a838' }, { h: 175, c: '#18a098' }, { h: 215, c: '#3068d0' }, { h: 265, c: '#7040c8' }, { h: 320, c: '#c03888' },
]

// ─── Theme presets ───────────────────────────────────────────
const THEMES = [{ a: '#8CABFF' }, { a: '#6EC98A' }, { a: '#F78D60' }, { a: '#C060C0' }, { a: '#FFCC44' }]
const LAB_COMBOS = [
  { c1: '#8CABFF', c2: '#6EC98A', c3: '#F07848', c4: '#C060C0', c5: 'rgba(255,255,255,.35)' },
  { c1: '#6EC98A', c2: '#FFCC44', c3: '#8CABFF', c4: '#F07848', c5: 'rgba(255,255,255,.35)' },
  { c1: '#F07848', c2: '#FFCC44', c3: '#6EC98A', c4: '#8CABFF', c5: 'rgba(255,255,255,.35)' },
  { c1: '#C060C0', c2: '#8CABFF', c3: '#FFCC44', c4: '#6EC98A', c5: 'rgba(255,255,255,.35)' },
  { c1: '#FFCC44', c2: '#F07848', c3: '#C060C0', c4: '#6EC98A', c5: 'rgba(255,255,255,.35)' },
]

const APP_VERSION = '3.1.0'

// ═════════════════════════════════════════════════════════════
export default function SwatchStudio() {
  // ── Theme ──
  const [themeIdx, setThemeIdx] = useState(0)
  useEffect(() => {
    const t = THEMES[themeIdx], c = LAB_COMBOS[themeIdx], r = document.documentElement.style
    r.setProperty('--a', t.a)
    r.setProperty('--ic1', c.c1); r.setProperty('--ic2', c.c2)
    r.setProperty('--ic3', c.c3); r.setProperty('--ic4', c.c4); r.setProperty('--ic5', c.c5)
  }, [themeIdx])

  // ── Update banner ──
  const [updateReady, setUpdateReady] = useState(false)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.addEventListener('controllerchange', () => setUpdateReady(true))
  }, [])

  // ── Tabs ──
  const TABS = ['discover', 'create', 'palettes', 'scan']
  const [activeTab, setActiveTab] = useState('discover')

  // ── Swipe navigation ──
  const swipeTouchRef = useRef(null)
  function onSwipeTouchStart(e) { swipeTouchRef.current = e.touches[0].clientX }
  function onSwipeTouchEnd(e) {
    if (swipeTouchRef.current === null) return
    const dx = e.changedTouches[0].clientX - swipeTouchRef.current
    swipeTouchRef.current = null
    if (Math.abs(dx) < 50) return
    const idx = TABS.indexOf(activeTab)
    if (dx < 0 && idx < TABS.length - 1) setActiveTab(TABS[idx + 1])
    else if (dx > 0 && idx > 0) setActiveTab(TABS[idx - 1])
  }

  // ── Toast ──
  const [toast, setToast] = useState('')
  function notify(msg) { setToast(msg); setTimeout(() => setToast(''), 1700) }
  function copyHex(text) { try { navigator.clipboard.writeText(text) } catch {} notify('Copied!') }

  // ══════════════════════════════════════════════════════════
  // DISCOVER STATE
  // ══════════════════════════════════════════════════════════
  const [dMode, setDModeRaw] = useState('random') // 'random' | 'uniform'
  const [dZoom, setDZoom] = useState(5)
  const [dPicks, setDPicks] = useState([])
  const [dColors, setDColors] = useState(() => genRandomBatch(40))
  const [dLoading, setDLoading] = useState(false)
  const [dBatchOffset, setDBatchOffset] = useState(1)
  const discGridRef = useRef(null)

  function setDMode(m) {
    setDModeRaw(m)
    setDBatchOffset(1)
    setDColors(m === 'random' ? genRandomBatch(40) : genUniformBatch(0, 40))
  }

  function onZoomChange(v) { setDZoom(v) }

  function loadMoreColors() {
    if (dLoading) return
    setDLoading(true)
    setTimeout(() => {
      setDColors(prev => {
        const next = dMode === 'random'
          ? [...prev, ...genRandomBatch(40)]
          : [...prev, ...genUniformBatch(dBatchOffset, 40)]
        return next
      })
      setDBatchOffset(n => n + 1)
      setDLoading(false)
    }, 80)
  }

  // Scroll sentinel for endless scroll
  useEffect(() => {
    const el = discGridRef.current
    if (!el) return
    const onScroll = () => {
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) loadMoreColors()
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  })

  function togglePick(hex) {
    if (dPicks.includes(hex)) {
      setDPicks(prev => prev.filter(h => h !== hex))
    } else {
      setDPicks(prev => [...prev, hex])
      copyHex(hex)
    }
  }

  function sendPicksToQueue() {
    if (!dPicks.length) return
    setQueue(prev => [...prev, ...dPicks.filter(h => !prev.includes(h))])
    notify(`${dPicks.length} colors sent to queue!`)
    setDPicks([])
    setActiveTab('create')
  }

  // ══════════════════════════════════════════════════════════
  // CREATE STATE — two-stage: queue → push ↑ → palette editor
  // ══════════════════════════════════════════════════════════
  const [queue, setQueue] = useState([])
  const [palettes, setPalettes] = useState([]) // array of arrays
  const [viewState, setViewState] = useState(0) // 0,1,2... or 'split'
  const [genRound, setGenRound] = useState(0)
  const [genScheme, setGenScheme] = useState([])
  const [genVisible, setGenVisible] = useState(false)
  const [fidelity, setFidelity] = useState(40)
  const [hexImport, setHexImport] = useState('')
  const pushRef = useRef(null)

  function importHexes() {
    if (!hexImport.trim()) return
    const raw = hexImport.replace(/[^#0-9a-fA-F,\s]/g, '').split(/[\s,]+/)
    const valid = raw.map(s => {
      const h = s.startsWith('#') ? s : '#' + s
      return /^#[0-9a-fA-F]{6}$/.test(h) ? h.toUpperCase() : null
    }).filter(Boolean)
    if (!valid.length) { notify('No valid hex colors found'); return }
    const added = valid.filter(h => !queue.includes(h))
    setQueue(prev => [...prev, ...added])
    setHexImport('')
    notify(`${added.length} color${added.length !== 1 ? 's' : ''} added to queue`)
  }

  // Browse library — sorted by hue then lightness
  const [browseLib] = useState(() => {
    const hues = [0, 18, 36, 55, 75, 100, 130, 155, 175, 200, 225, 250, 272, 295, 315, 335]
    const lib = []
    hues.forEach((h, hi) => {
      for (let i = 0; i < 6; i++) {
        const L = 20 + i * 12, sat = 50 + sr(hi * 6 + i) * 30, rad = h * Math.PI / 180
        lib.push({ hex: l2h(L, sat * Math.cos(rad), sat * Math.sin(rad)), hue: h, L })
      }
    })
    lib.sort((a, b) => { if (Math.abs(a.hue - b.hue) > 6) return a.hue - b.hue; return a.L - b.L })
    return lib
  })

  function toggleQueueColor(hex) {
    if (queue.includes(hex)) {
      setQueue(prev => prev.filter(h => h !== hex))
    } else {
      setQueue(prev => [...prev, hex])
      copyHex(hex)
    }
  }

  function pushQueue() {
    if (!queue.length) return
    const filled = palettes.filter(p => p && p.length)
    if (!filled.length) {
      setPalettes([[...queue]])
    } else {
      setPalettes(prev => [...prev, [...queue]])
      setViewState('split')
    }
    setQueue([])
    // Pulse animation
    if (pushRef.current) {
      pushRef.current.classList.add('pulse')
      setTimeout(() => pushRef.current?.classList.remove('pulse'), 400)
    }
    notify('Pushed to palette editor!')
  }

  function onStripTap() {
    const filled = palettes.filter(p => p && p.length)
    if (!filled.length) return
    if (viewState === 'split') setViewState(0)
    else if (typeof viewState === 'number' && viewState < palettes.length - 1) setViewState(viewState + 1)
    else if (filled.length > 1) setViewState('split')
    else setViewState(0)
  }

  function removeStripColor(palIdx, colorIdx) {
    setPalettes(prev => {
      const next = prev.map(p => [...p])
      next[palIdx].splice(colorIdx, 1)
      if (!next[palIdx].length) next.splice(palIdx, 1)
      return next
    })
    if (!palettes.filter(p => p && p.length).length) setViewState(0)
  }

  function deletePalColumn(palIdx) {
    setPalettes(prev => {
      const next = [...prev]
      next.splice(palIdx, 1)
      return next
    })
    const remaining = palettes.filter((p, i) => i !== palIdx && p && p.length)
    if (remaining.length < 2) setViewState(0)
  }

  // Generation: uses all palette colors as seed pool
  function hexToLab(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255
    const lin = v => v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92
    r = lin(r); g = lin(g); b = lin(b)
    const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, y = r * 0.2126 + g * 0.7152 + b * 0.0722, z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883
    const f = v => v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116
    return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))]
  }

  function genPalette(seeds, fid, rnd) {
    if (!seeds.length) return []
    const labs = seeds.map(hexToLab)
    const cL = labs.reduce((s, v) => s + v[0], 0) / labs.length
    const cA = labs.reduce((s, v) => s + v[1], 0) / labs.length
    const cB = labs.reduce((s, v) => s + v[2], 0) / labs.length
    const v = fid / 100, maxD = v * 72, retain = (1 - v) * 0.65
    return Array.from({ length: 5 }, (_, i) => {
      const t = i / 4
      if (Math.random() < retain && seeds.length) {
        const pick = seeds[Math.floor(sr(i * 3 + rnd * 17) * seeds.length)]
        const [L, A, B] = hexToLab(pick)
        const j = maxD * 0.28
        return l2h(Math.max(12, Math.min(90, L + (sr(i * 5 + rnd) - 0.5) * j * 0.8)), A + (sr(i * 7 + rnd) - 0.5) * j, B + (sr(i * 11 + rnd) - 0.5) * j)
      }
      const ang = (t * 360 + rnd * 47) % 360, rad = ang * Math.PI / 180
      const ch = 18 + v * 58 + sr(i * 3 + rnd) * v * 32
      const nL = Math.max(14, Math.min(88, cL - 32 + t * 64 + (sr(i * 2 + rnd) - 0.5) * maxD * 0.5))
      return l2h(nL, cA * (1 - v) + ch * Math.cos(rad) * v + (sr(i * 9 + rnd) - 0.5) * maxD * 0.4, cB * (1 - v) + ch * Math.sin(rad) * v + (sr(i * 13 + rnd) - 0.5) * maxD * 0.4)
    })
  }

  function doGenerate() {
    const all = palettes.flat().filter(Boolean)
    if (!all.length) { notify('Push colors up first ↑'); return }
    const newRound = genRound + 1
    setGenRound(newRound)
    setGenScheme(genPalette(all, fidelity, newRound))
    setGenVisible(true)
    notify(`Generated #${newRound}`)
  }

  function clearAll() {
    setPalettes([]); setQueue([]); setGenRound(0); setGenScheme([]); setGenVisible(false); setViewState(0)
  }

  function copyBrowsePal() {
    const pal = viewState === 'split' ? palettes.flat().filter(Boolean) : (palettes[viewState] || [])
    if (pal.length) copyHex(pal.join(', '))
  }

  const fidLabel = fidelity < 30 ? 'tight' : fidelity > 70 ? 'wild' : 'balanced'
  const filledPalettes = palettes.filter(p => p && p.length)

  // ══════════════════════════════════════════════════════════
  // PALETTES STATE
  // ══════════════════════════════════════════════════════════
  const [savedPals, setSavedPals] = useState([
    { name: 'Fire & Ember', colors: ['#B12C00', '#EB5B00', '#F78D60', '#FFCC44'], src: 'colorhunt', date: 'Apr 4', tags: ['warm'] },
    { name: 'Orchid Night', colors: ['#1A0030', '#6A0DAD', '#C060C0', '#F0A8D0'], src: 'colorhunt', date: 'Apr 4', tags: ['dark'] },
    { name: 'Ocean Drift', colors: ['#003049', '#006494', '#0096C7', '#90E0EF'], src: 'colorhunt', date: 'Apr 3', tags: ['cool'] },
    { name: 'Sage Morning', colors: ['#2D4739', '#4E8B6B', '#A8C5A0', '#D8E8D0'], src: 'generated', date: 'Apr 3', tags: ['natural'] },
  ])
  const [palSrc, setPalSrc] = useState('all')
  const [palHueDot, setPalHueDot] = useState(0)
  const [palSearch, setPalSearch] = useState('')

  const filteredSavedPals = savedPals.filter(p => {
    if (palSrc !== 'all' && p.src !== palSrc) return false
    if (palHueDot > 0) {
      const dot = HUE_DOTS[palHueDot]
      if (dot && dot.h !== null) {
        const avg = p.colors.reduce((s, hex) => {
          const [r, g, b] = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
          if (mx === mn) return s
          const d = mx - mn
          let hh; if (mx === r) hh = ((g - b) / d + (g < b ? 6 : 0)) / 6; else if (mx === g) hh = ((b - r) / d + 2) / 6; else hh = ((r - g) / d + 4) / 6
          return s + hh * 360
        }, 0) / p.colors.length
        const d = Math.abs(avg - dot.h)
        if (d > 50 && d < 310) return false
      }
    }
    return true
  })

  function handlePalSearch() {
    const v = palSearch.trim()
    if (!v) return
    // Check for ColorHunt URL
    if (v.includes('colorhunt.co/palette/')) {
      const cols = (v.split('/palette/')[1] || '').match(/[0-9a-fA-F]{6}/g) || []
      if (cols.length >= 4) {
        setSavedPals(prev => [{ name: 'ColorHunt Import', colors: cols.slice(0, 4).map(c => `#${c}`), src: 'colorhunt', date: new Date().toLocaleDateString(), tags: ['imported'] }, ...prev])
        setPalSearch('')
        notify('Imported!')
        return
      }
    }
    notify('Searching…')
  }

  // ══════════════════════════════════════════════════════════
  // SCANNED STATE
  // ══════════════════════════════════════════════════════════
  const [scanColors, setScanColors] = useState([])
  const [scanImage, setScanImage] = useState(null)
  const [scanRawImage, setScanRawImage] = useState(null) // original before post-processing
  const [scanHistory, setScanHistory] = useState([])
  const [scanning, setScanning] = useState(false)
  const [scanPostMode, setScanPostMode] = useState(false) // show post-processing center
  const [ppBlur, setPpBlur] = useState(4)
  const [ppWarmth, setPpWarmth] = useState(0)
  const [ppBrightness, setPpBrightness] = useState(0)
  const [ppSaturation, setPpSaturation] = useState(100)
  const fileRef = useRef(null)
  const cameraRef = useRef(null)

  function gaussianBlurCanvas(srcCanvas, radius) {
    // Pure JS box-blur approximation of Gaussian (3 passes = very close to Gaussian)
    const src = srcCanvas.getContext('2d').getImageData(0, 0, srcCanvas.width, srcCanvas.height)
    const w = src.width, h = src.height
    const d = new Uint8ClampedArray(src.data)
    const tmp = new Uint8ClampedArray(src.data.length)
    const r = Math.max(1, Math.round(radius))
    function boxBlurH(inp, out) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let rr = 0, g = 0, b = 0, a = 0, cnt = 0
          for (let kx = -r; kx <= r; kx++) {
            const cx = Math.min(w - 1, Math.max(0, x + kx))
            const i = (y * w + cx) * 4
            rr += inp[i]; g += inp[i+1]; b += inp[i+2]; a += inp[i+3]; cnt++
          }
          const i = (y * w + x) * 4
          out[i] = rr/cnt; out[i+1] = g/cnt; out[i+2] = b/cnt; out[i+3] = a/cnt
        }
      }
    }
    function boxBlurV(inp, out) {
      for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
          let rr = 0, g = 0, b = 0, a = 0, cnt = 0
          for (let ky = -r; ky <= r; ky++) {
            const cy = Math.min(h - 1, Math.max(0, y + ky))
            const i = (cy * w + x) * 4
            rr += inp[i]; g += inp[i+1]; b += inp[i+2]; a += inp[i+3]; cnt++
          }
          const i = (y * w + x) * 4
          out[i] = rr/cnt; out[i+1] = g/cnt; out[i+2] = b/cnt; out[i+3] = a/cnt
        }
      }
    }
    // 3 passes for Gaussian approximation
    boxBlurH(d, tmp); boxBlurV(tmp, d)
    boxBlurH(d, tmp); boxBlurV(tmp, d)
    boxBlurH(d, tmp); boxBlurV(tmp, d)
    const out = srcCanvas.getContext('2d').createImageData(w, h)
    out.data.set(d)
    const dst = document.createElement('canvas')
    dst.width = w; dst.height = h
    dst.getContext('2d').putImageData(out, 0, 0)
    return dst
  }

  function applyPostProcessing(imgEl, blur, warmth, brightness, saturation) {
    const maxSize = 400
    let { width, height } = imgEl
    if (width > maxSize || height > maxSize) {
      const scale = maxSize / Math.max(width, height)
      width = Math.round(width * scale); height = Math.round(height * scale)
    }
    const c = document.createElement('canvas')
    c.width = width; c.height = height
    const ctx = c.getContext('2d')
    ctx.drawImage(imgEl, 0, 0, width, height)

    // Per-pixel adjustments: warmth, brightness, saturation
    if (warmth !== 0 || brightness !== 0 || saturation !== 100) {
      const id = ctx.getImageData(0, 0, width, height)
      const d = id.data
      const bFactor = 1 + brightness / 100
      const sFactor = saturation / 100
      const wShift = warmth * 0.8 // warmth shifts R up/B down (warm) or R down/B up (cool)
      for (let i = 0; i < d.length; i += 4) {
        let r = d[i], g = d[i+1], b = d[i+2]
        // Brightness
        r *= bFactor; g *= bFactor; b *= bFactor
        // Warmth
        r += wShift; b -= wShift * 0.5
        // Saturation — convert to grey and lerp
        const grey = 0.299 * r + 0.587 * g + 0.114 * b
        r = grey + (r - grey) * sFactor
        g = grey + (g - grey) * sFactor
        b = grey + (b - grey) * sFactor
        d[i] = Math.max(0, Math.min(255, r))
        d[i+1] = Math.max(0, Math.min(255, g))
        d[i+2] = Math.max(0, Math.min(255, b))
      }
      ctx.putImageData(id, 0, 0)
    }

    // Blur pass
    if (blur > 0) {
      const blurred = gaussianBlurCanvas(c, blur)
      return blurred.toDataURL('image/jpeg', 0.88).split(',')[1]
    }
    return c.toDataURL('image/jpeg', 0.88).split(',')[1]
  }

  async function runExtraction(base64, dataUrl) {
    setScanColors([]); setScanning(true)
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 600,
          system: 'Extract 3-6 dominant colors. Return ONLY JSON: [{"hex":"#RRGGBB","name":"name","coverage":"dominant|accent|subtle"}]',
          messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } }, { type: 'text', text: 'Extract colors.' }] }] }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error.message || 'API error')
      const raw = (data.content?.[0]?.text || '').replace(/```json|```/g, '').trim()
      if (!raw) throw new Error('Empty response')
      const colors = JSON.parse(raw)
      if (!Array.isArray(colors) || !colors.length) throw new Error('No colors returned')
      setScanColors(colors)
      setScanPostMode(false)
      setScanHistory(prev => [{ colors: colors.map(c => c.hex), date: new Date().toLocaleDateString(), image: dataUrl }, ...prev])
    } catch (err) {
      console.error('[Scan]', err)
      notify(err.message?.includes('API') ? 'API error — check key' : "Couldn't read the image")
    } finally { setScanning(false) }
  }

  async function handleScanFile(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    let dataUrl = ''
    await new Promise(resolve => { reader.onload = ev => { dataUrl = ev.target.result; resolve() }; reader.readAsDataURL(file) })
    setScanRawImage(dataUrl)
    setScanImage(dataUrl)
    setScanColors([])
    setPpBlur(4); setPpWarmth(0); setPpBrightness(0); setPpSaturation(100)
    setScanPostMode(true)
  }

  async function handleGeneratePalette() {
    if (!scanRawImage) return
    const img = await new Promise((resolve, reject) => {
      const el = new Image(); el.onload = () => resolve(el); el.onerror = reject; el.src = scanRawImage
    })
    const base64 = applyPostProcessing(img, ppBlur, ppWarmth, ppBrightness, ppSaturation)
    await runExtraction(base64, scanRawImage)
  }

  // ══════════════════════════════════════════════════════════
  // OVERLAYS
  // ══════════════════════════════════════════════════════════
  const [expandOpen, setExpandOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareData, setShareData] = useState({ name: '', colors: [] })

  function openExpand() {
    if (!filledPalettes.length) return
    setExpandOpen(true)
  }

  function openShare(name, colors) {
    setShareData({ name, colors })
    setShareOpen(true)
  }

  function doShareOpt(type) {
    if (type === 'hex') {
      copyHex(`/* ${shareData.name} */\n${shareData.colors.join(', ')}`)
    } else if (type === 'css') {
      const css = shareData.colors.map((h, i) => `  --color-${i + 1}: ${h};`).join('\n')
      copyHex(`:root {\n${css}\n}`)
    } else {
      notify(`${type} — coming soon`)
    }
    setShareOpen(false)
  }

  // Wire double-tap on strip to open expand
  const stripTapRef = useRef(0)
  function handleStripClick(e) {
    if (e.target.classList?.contains('ps-chip') || e.target.classList?.contains('pcol-del')) return
    const now = Date.now()
    if (now - stripTapRef.current < 320) { openExpand(); stripTapRef.current = 0; return }
    stripTapRef.current = now
    onStripTap()
  }

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div className="app-shell"
      onTouchStart={onSwipeTouchStart}
      onTouchEnd={onSwipeTouchEnd}>
      {toast && <div className="toast-msg">{toast}</div>}

      {/* ── Header ── */}
      <div className="hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <img src={logo} alt="PaintBrain" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none' }} />
          <div>
            <div className="brand-name">PaintBrain</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div className="brand-sub">ColorShare Studio</div>
              <span className="ver-badge">v{APP_VERSION}</span>
            </div>
          </div>
        </div>
        <div className="tdots">
          {THEMES.map((t, i) => (
            <div key={i} className={`tdot${themeIdx === i ? ' on' : ''}`}
              style={{ background: t.a }} onClick={() => setThemeIdx(i)} />
          ))}
        </div>
      </div>

      {/* ── Update banner ── */}
      {updateReady && (
        <div className="update-banner" onClick={() => window.location.reload()}>
          Update available — tap to refresh
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="tabs">
        {TABS.map(id => (
          <button key={id} data-t={id}
            className={`tab${activeTab === id ? ' on' : ''}`}
            onClick={() => setActiveTab(id)}>
            {id.charAt(0).toUpperCase() + id.slice(1)}
          </button>
        ))}
      </div>

      {/* ═══════════ DISCOVER ═══════════ */}
      <div className={`panel${activeTab === 'discover' ? ' on' : ''}`}>
        <div className="disc-hdr">
          <div className="mode-row">
            <div className="disc-toggle">
              <button className={`disc-topt${dMode === 'random' ? ' on' : ''}`} onClick={() => setDMode('random')}>Random</button>
              <button className={`disc-topt${dMode === 'uniform' ? ' on' : ''}`} onClick={() => setDMode('uniform')}>Uniform</button>
            </div>
            <div className="zoom-grp">
              <div className="zoom-slrw">
                <div className="zoom-slrt" />
                <div className="zoom-slrk" style={{ left: `${((dZoom - 2) / 8) * 100}%` }} />
                <input type="range" min="2" max="10" value={dZoom} step="1"
                  onChange={e => onZoomChange(+e.target.value)} />
              </div>
              <span className="zoom-lbl">{dZoom}×</span>
            </div>
          </div>
        </div>

        {/* Picks bar */}
        <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--div)', flexShrink: 0 }}>
          {dPicks.length === 0 ? (
            <div style={{ padding: '4px 4px', fontSize: 10, color: 'var(--t2)' }}>Tap to pick · tap again to remove</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="cgrid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', flex: 1 }}>
                {dPicks.map(hex => (
                  <div key={hex} className="chip" style={{ background: hex }} onClick={() => togglePick(hex)}>
                    <div className="chex">{hex}</div>
                  </div>
                ))}
              </div>
              <button className="stp-icon" onClick={sendPicksToQueue} title="Send to Create"
                style={{ whiteSpace: 'nowrap', width: 'auto', padding: '0 10px', fontSize: 12, fontWeight: 600, gap: 4 }}>
                → Create
              </button>
            </div>
          )}
        </div>

        <div style={{ height: 3, background: 'var(--div2)', flexShrink: 0 }} />

        <div className="grid-wrap" ref={discGridRef}>
          <div className="cgrid" style={{ gridTemplateColumns: `repeat(${dZoom}, 1fr)` }}>
            {dColors.map((hex, i) => (
              <div key={hex + i}
                className={`chip${dPicks.includes(hex) ? ' sel' : ''}`}
                style={{ background: hex }}
                onClick={() => togglePick(hex)}>
                {dZoom <= 4 && <div className="chex">{hex}</div>}
              </div>
            ))}
          </div>
          {dLoading && <div className="disc-loading">···</div>}
        </div>
      </div>

      {/* ═══════════ CREATE ═══════════ */}
      <div className={`panel${activeTab === 'create' ? ' on' : ''}`}>
        <div className="brow-ctrl">
          {/* Row 1: Icon action buttons */}
          <div className="icon-row">
            <button className="ib" onClick={() => notify('Auto-naming...')} title="Auto-name">
              <span className="ib-icon" style={{ color: 'var(--ic1)' }}>✦</span>
              <span className="ib-lbl" style={{ color: 'var(--ic1)' }}>Auto</span>
            </button>
            <button className="ib" onClick={() => {
              const pal = viewState === 'split' ? palettes[0] || [] : palettes[viewState] || []
              if (!pal.length) { notify('Nothing to save'); return }
              notify('Saved!')
            }} title="Save">
              <span className="ib-icon" style={{ color: 'var(--ic2)' }}>↓</span>
              <span className="ib-lbl" style={{ color: 'var(--ic2)' }}>Save</span>
            </button>
            <button className="ib" onClick={copyBrowsePal} title="Copy">
              <span className="ib-icon" style={{ color: 'var(--ic3)' }}>⎘</span>
              <span className="ib-lbl" style={{ color: 'var(--ic3)' }}>Copy</span>
            </button>
            <button className="ib" onClick={() => {
              const pal = viewState === 'split' ? palettes[0] || [] : palettes[viewState] || []
              if (pal.length) openShare('Palette', pal); else notify('Nothing to share')
            }} title="Share">
              <span className="ib-icon" style={{ color: 'var(--ic4)' }}>↗</span>
              <span className="ib-lbl" style={{ color: 'var(--ic4)' }}>Share</span>
            </button>
            <div className="ib-div" />
            <button className="ib" onClick={clearAll} title="Clear">
              <span className="ib-icon" style={{ color: 'var(--ic5)' }}>✕</span>
              <span className="ib-lbl" style={{ color: 'var(--ic5)' }}>Clear</span>
            </button>
            <div className="ib-div" />
            <div className="hex-import-wrap">
              <input
                className="hex-import-inp"
                type="text"
                placeholder="#hex, #hex…"
                value={hexImport}
                onChange={e => setHexImport(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') importHexes() }}
              />
              <button className="hex-import-btn" onClick={importHexes} title="Import">+</button>
            </div>
          </div>

          {/* Row 2: Palette editor strip */}
          <div className="pal-editor-zone">
            <div className="mstrip" onClick={handleStripClick}>
              {filledPalettes.length === 0 ? (
                <span className="pe-empty">Push colors ↑ to build palettes here</span>
              ) : viewState === 'split' ? (
                filledPalettes.map((pal, ci) => {
                  const ri = palettes.indexOf(pal)
                  return (
                    <div key={ci} className="pcol">
                      <div className="pcol-del" onClick={e => { e.stopPropagation(); deletePalColumn(ri) }}>×</div>
                      {pal.map((h, i) => (
                        <div key={h + i} className="ps-chip" style={{ background: h }}
                          onClick={e => { e.stopPropagation(); removeStripColor(ri, i); copyHex(h) }} />
                      ))}
                    </div>
                  )
                })
              ) : (
                (palettes[viewState] || []).map((h, i) => (
                  <div key={h + i} className="ps-chip" style={{ background: h }}
                    onClick={e => { e.stopPropagation(); removeStripColor(typeof viewState === 'number' ? viewState : 0, i); copyHex(h) }} />
                ))
              )}
            </div>
          </div>

          {/* Row 3: Fidelity · ↑ Push · Generate */}
          <div className="mid-ctrl">
            <span className="fid-lbl">Fidelity</span>
            <div className="slrw">
              <div className="slrt" style={{ background: 'linear-gradient(to right, var(--ic1), var(--ic3))' }} />
              <div className="slrk" style={{ left: `${fidelity}%` }} />
              <input type="range" min="0" max="100" value={fidelity} step="1"
                onChange={e => setFidelity(+e.target.value)} />
            </div>
            <span className="fid-lbl">Wild</span>
            <button ref={pushRef} className="push-btn" onClick={pushQueue} disabled={!queue.length} title="Push to editor">↑</button>
            <button className="gen-btn" onClick={doGenerate}>
              {genRound > 0 ? 'Regenerate' : 'Generate'}
            </button>
            <span className="fid-info">{fidLabel}</span>
          </div>

          {/* Row 3b: Generated scheme preview */}
          {genVisible && genScheme.length > 0 && (
            <div className="sch-area on" style={{ display: 'block' }}>
              <div className="sch-chips">
                {genScheme.map((hex, i) => (
                  <div key={hex + i} className="ssc" style={{ background: hex }}
                    onClick={() => { setQueue(prev => prev.includes(hex) ? prev : [...prev, hex]); notify('Added to queue') }} />
                ))}
              </div>
              <button className="sch-clear" onClick={() => { setGenScheme([]); setGenVisible(false) }}>✕ clear</button>
            </div>
          )}

          {/* Row 4: Queue */}
          <div className="queue-zone">
            <div className="queue-label">
              <span>QUEUE</span>
              <span style={{ color: 'var(--t2)' }}>{queue.length ? `${queue.length} queued` : ''}</span>
            </div>
            <div className="queue-grid">
              {queue.length === 0 ? (
                <span className="q-empty">Tap library colors below to stage them here</span>
              ) : queue.map((hex, i) => (
                <div key={hex + i} className="qchip" style={{ background: hex }}
                  onClick={() => setQueue(prev => prev.filter((_, j) => j !== i))} />
              ))}
            </div>
          </div>
        </div>

        {/* Browse color library */}
        <div className="grid-wrap">
          <div className="cgrid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {browseLib.map((c, i) => (
              <div key={c.hex + i}
                className={`chip${queue.includes(c.hex) ? ' sel' : ''}`}
                style={{ background: c.hex }}
                onClick={() => toggleQueueColor(c.hex)}>
                <div className="chex">{c.hex}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════ PALETTES ═══════════ */}
      <div className={`panel${activeTab === 'palettes' ? ' on' : ''}`}>
        <div className="ptab-ctrl">
          {/* Search/URL bar */}
          <div className="srch-row">
            <input className="srch-inp" type="text" placeholder="Search or paste a ColorHunt URL…"
              value={palSearch} onChange={e => setPalSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handlePalSearch() }} />
            <button className="srch-btn" onClick={handlePalSearch}>Search</button>
          </div>
          {/* Filter words */}
          <div className="filt-words">
            {['all', 'colorhunt', 'custom', 'generated'].map(s => (
              <button key={s} className={`fw${palSrc === s ? ' on' : ''}`}
                onClick={() => setPalSrc(s)}>
                {s === 'all' ? 'All' : s === 'colorhunt' ? 'ColorHunt' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          {/* Hue dots */}
          <div className="hdots">
            {HUE_DOTS.map((dot, i) => (
              <div key={i} className={`hd${palHueDot === i ? ' on' : ''}`}
                style={{ background: dot.c }}
                onClick={() => setPalHueDot(palHueDot === i ? 0 : i)} />
            ))}
          </div>
        </div>
        {/* Palette cards list */}
        <div className="pal-list">
          {filteredSavedPals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, fontSize: 11, color: 'var(--t3)' }}>No palettes yet</div>
          ) : filteredSavedPals.map((p, pi) => (
            <div key={pi} className="pcard">
              <div className="pstrip-row">
                {p.colors.map((h, i) => (
                  <div key={h + i} className="psc" style={{ background: h }} onClick={() => copyHex(h)}>
                    <div className="psc-hex">{h}</div>
                  </div>
                ))}
              </div>
              <div className="pinfo">
                <div className="pmeta-wrap">
                  <span className="pname">{p.name}</span>
                  <div className="pmeta-inline">
                    <span className="ptag">{p.src}</span>
                    {(p.tags || []).map(t => <span key={t} className="ptag">{t}</span>)}
                    <span className="pdate">{p.date}</span>
                  </div>
                </div>
                <div className="picons">
                  <button className="pi" title="Load" style={{ color: '#6EC98A' }}
                    onClick={() => { setQueue(p.colors.filter(h => !queue.includes(h))); setActiveTab('create'); notify('Loaded into queue') }}>
                    <ArrowUpToLine size={14} />
                  </button>
                  <button className="pi" title="Copy" style={{ color: '#8CABFF' }}
                    onClick={() => copyHex(`/* ${p.name} */\n${p.colors.join(', ')}`)}>
                    <Copy size={14} />
                  </button>
                  <button className="pi" title="Share" style={{ color: '#FFCC44' }}
                    onClick={() => openShare(p.name, p.colors)}>
                    <Share2 size={14} />
                  </button>
                  <button className="pi" title="Delete" style={{ color: '#FF5555' }}
                    onClick={() => { setSavedPals(prev => prev.filter((_, j) => j !== pi)); notify('Deleted') }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════ SCAN ═══════════ */}
      <div className={`panel${activeTab === 'scan' ? ' on' : ''}`}>

        {/* Post-Processing Center */}
        {scanPostMode && scanRawImage ? (
          <div className="pp-center">
            <div className="pp-image-wrap">
              <img src={scanRawImage} alt="scan preview" className="pp-image"
                style={{ filter: `brightness(${1 + ppBrightness/100}) saturate(${ppSaturation/100})` }} />
            </div>
            <div className="pp-sliders">
              {[
                { label: 'Blur', value: ppBlur, set: setPpBlur, min: 0, max: 20, step: 1 },
                { label: 'Warmth', value: ppWarmth, set: setPpWarmth, min: -50, max: 50, step: 1 },
                { label: 'Brightness', value: ppBrightness, set: setPpBrightness, min: -50, max: 50, step: 1 },
                { label: 'Saturation', value: ppSaturation, set: setPpSaturation, min: 0, max: 200, step: 1 },
              ].map(({ label, value, set, min, max, step }) => (
                <div key={label} className="pp-row">
                  <span className="pp-lbl">{label}</span>
                  <input type="range" className="pp-slider" min={min} max={max} step={step} value={value}
                    onChange={e => set(+e.target.value)} />
                  <span className="pp-val">{value}</span>
                </div>
              ))}
            </div>
            <div className="pp-btns">
              <button className="sbt" onClick={() => { setScanPostMode(false); setScanRawImage(null) }}>Re-shoot</button>
              <button className="sbt primary" onClick={handleGeneratePalette} disabled={scanning}>
                {scanning ? 'Extracting…' : 'Generate Palette'}
              </button>
            </div>
          </div>
        ) : (
          <div className="scan-ctrl">
            <div className="scan-title">Upload or scan a photo to extract colors</div>
            <div className="scan-btns-row">
              <button className="sbt primary" onClick={() => fileRef.current?.click()}>Upload photo</button>
              <button className="sbt" onClick={() => cameraRef.current?.click()}>Open camera</button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleScanFile} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleScanFile} />
          </div>
        )}

        {/* Scan result */}
        {scanColors.length > 0 && (
          <div className="scan-result">
            <div className="scan-inner">
              {scanImage && (
                <div style={{ width: 54, height: 54, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                  <img src={scanImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: 'white', fontWeight: 600, marginBottom: 6 }}>{scanColors.length} colors detected</div>
                <div className="scan-cg">
                  {scanColors.map((c, i) => (
                    <div key={i} className="scan-item" onClick={() => copyHex(c.hex)}>
                      <div className="scan-sw" style={{ background: c.hex }} />
                      <span className="scan-cn">{c.hex}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="scan-acts">
              <button className="wa wa-keep" onClick={() => {
                setSavedPals(prev => [...prev, { name: `Scan ${new Date().toLocaleDateString()}`, colors: scanColors.map(c => c.hex), src: 'scanned', date: new Date().toLocaleDateString(), tags: ['scanned'] }])
                notify('Saved to Palettes!')
              }}>Save to Palettes</button>
              <span className="wa-sep">·</span>
              <button className="wa wa-copy" onClick={() => {
                setQueue(prev => [...prev, ...scanColors.map(c => c.hex).filter(h => !prev.includes(h))])
                setActiveTab('create')
                notify('Colors in queue — tap ↑ to push')
              }}>Send to Queue</button>
              <span className="wa-sep">·</span>
              <button className="wa wa-share" onClick={() => notify('Share — coming soon')}>Share</button>
              <span className="wa-sep">·</span>
              <button className="wa wa-dis" onClick={() => { setScanColors([]); setScanImage(null) }}>Clear</button>
            </div>
          </div>
        )}

        {/* Scan library */}
        <div className="scan-list-wrap">
          <div className="scan-lib-hdr">
            <span className="scan-lib-lbl">SCAN LIBRARY · {scanHistory.length} SCANS</span>
            {scanHistory.length > 0 && (
              <button className="wa wa-dis" onClick={() => { setScanHistory([]); notify('Cleared') }}>Clear all</button>
            )}
          </div>
          {scanHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, fontSize: 11, color: 'var(--t3)' }}>No scans yet</div>
          ) : scanHistory.map((scan, i) => (
            <div key={i} className="sentry">
              {scan.image && (
                <div style={{ width: 46, height: 46, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                  <img src={scan.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="se-chips">
                  {scan.colors.map((h, j) => (
                    <div key={j} className="se-chip" style={{ background: h }} onClick={() => copyHex(h)} />
                  ))}
                </div>
                <div className="se-meta">{scan.date}</div>
                <div className="se-acts">
                  <button className="wa wa-keep" onClick={() => {
                    setSavedPals(prev => [...prev, { name: `Scan ${scan.date}`, colors: [...scan.colors], src: 'scanned', date: scan.date, tags: ['scanned'] }])
                    notify('Saved!')
                  }}>+ Save</button>
                  <span className="wa-sep">·</span>
                  <button className="wa wa-share" onClick={() => notify('Share — coming soon')}>Share</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* ═══════════ EXPAND OVERLAY ═══════════ */}
      {expandOpen && (
        <div className="exp-ov on" onClick={e => { if (e.target === e.currentTarget) setExpandOpen(false) }}>
          <div className="exp-hint">Tap color to copy · × on palette to delete it · tap background to close</div>
          <div className="exp-pals">
            {filledPalettes.map((pal, ci) => {
              const ri = palettes.indexOf(pal)
              return (
                <div key={ci} className="exp-pal-col">
                  <div className="exp-pal-lbl">Palette {'ABCDEFGH'[ci]}</div>
                  <div className="exp-pal-del" onClick={e => {
                    e.stopPropagation()
                    deletePalColumn(ri)
                    if (palettes.filter(p => p && p.length).length <= 1) setExpandOpen(false)
                  }}>×</div>
                  {pal.map((h, i) => (
                    <div key={h + i} className="exp-color-chip" style={{ background: h }}
                      onClick={e => {
                        e.stopPropagation()
                        copyHex(h)
                        removeStripColor(ri, i)
                        if (!palettes.flat().filter(Boolean).length) setExpandOpen(false)
                      }} />
                  ))}
                </div>
              )
            })}
          </div>
          <div className="exp-close">Tap background to close</div>
        </div>
      )}

      {/* ═══════════ SHARE SHEET ═══════════ */}
      {shareOpen && (
        <div className="share-ov on" onClick={e => { if (e.target === e.currentTarget) setShareOpen(false) }}>
          <div className="share-sheet" onClick={e => e.stopPropagation()}>
            <div className="share-title">{shareData.name}</div>
            <div className="share-strip">
              {shareData.colors.map((h, i) => (
                <div key={h + i} style={{ flex: 1, background: h }} />
              ))}
            </div>
            <div className="share-opts">
              <div className="share-opt" onClick={() => doShareOpt('hex')}>
                <div className="share-opt-icon">📋</div>
                <div className="share-opt-lbl">Copy hex codes</div>
              </div>
              <div className="share-opt" onClick={() => doShareOpt('css')}>
                <div className="share-opt-icon">💻</div>
                <div className="share-opt-lbl">Copy as CSS</div>
              </div>
              <div className="share-opt" onClick={() => doShareOpt('img')}>
                <div className="share-opt-icon">🖼</div>
                <div className="share-opt-lbl">Share as image</div>
              </div>
              <div className="share-opt" onClick={() => doShareOpt('link')}>
                <div className="share-opt-icon">🔗</div>
                <div className="share-opt-lbl">Copy share link</div>
              </div>
            </div>
            <button className="share-cancel" onClick={() => setShareOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
