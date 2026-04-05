// ============================================================
// PaintBrain — Swatch Studio v2
// SwatchStudio.jsx
//
// FREE TIER FEATURES:
//   - Auto color scan (Haiku vision, no equipment needed)
//   - RAW mode toggle (instructions + confidence boost)
//   - Device profile (phone-specific color correction)
//   - Confidence indicator (green / yellow / red)
//   - Scan history (localStorage, last 50 scans)
//   - ColorHunt + Coolors URL import
//   - Haiku AI palette generator
//   - Core color library (22 curated colors)
//   - Palette builder — save / load / share
//
// TODO: Pro mode (grey card + daylight LED, Phase 2)
//   - Grey card detection in frame
//   - Hard mathematical correction off card reference
//   - DNG metadata parsing for ProRAW
//   - Paint store color database matching
//   See: docs/SwatchStudio_ProMode.md
//
// SETUP:
//   1. Copy PB_LOGO_GRAPHFIX_1.png to src/assets/
//   2. Uncomment logo import below and update <img src>
//   3. Add VITE_ANTHROPIC_API_KEY to .env
//   4. Route: <Route path="/swatch-studio" element={<SwatchStudio />} />
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react'
// import logo from '../assets/PB_LOGO_GRAPHFIX_1.png'

// ─── Constants ───────────────────────────────────────────────

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const HAIKU_MODEL   = 'claude-haiku-4-5-20251001'
const PAL_KEY       = 'pb_ss_palettes'
const SCAN_KEY      = 'pb_ss_scans'
const PREFS_KEY     = 'pb_ss_prefs'
const DBL_TAP_MS    = 320
const MAX_SCANS     = 50

// ─── Static data ─────────────────────────────────────────────

const CORE_COLORS = [
  { hex: '#090040', name: 'Void' },
  { hex: '#0D1164', name: 'Indigo night' },
  { hex: '#00005C', name: 'Abyss navy' },
  { hex: '#35155D', name: 'Midnight plum' },
  { hex: '#3B185F', name: 'Dark grape' },
  { hex: '#320A6B', name: 'Deep violet' },
  { hex: '#471396', name: 'Electric violet' },
  { hex: '#512B81', name: 'Royal purple' },
  { hex: '#640D5F', name: 'Deep magenta' },
  { hex: '#065084', name: 'Ocean blue' },
  { hex: '#4477CE', name: 'Cornflower' },
  { hex: '#8CABFF', name: 'Periwinkle' },
  { hex: '#B13BFF', name: 'Neon purple' },
  { hex: '#C060A1', name: 'Orchid' },
  { hex: '#EA2264', name: 'Hot magenta' },
  { hex: '#0F828C', name: 'Deep teal' },
  { hex: '#78B9B5', name: 'Muted teal' },
  { hex: '#B12C00', name: 'Burnt crimson' },
  { hex: '#EB5B00', name: 'Blaze orange' },
  { hex: '#F78D60', name: 'Warm peach' },
  { hex: '#F0CAA3', name: 'Sand' },
  { hex: '#FFCC00', name: 'Solar gold' },
]

const THEMES = [
  { hi: '#8CABFF', border: 'rgba(140,107,255,0.22)', borderHi: 'rgba(140,107,255,0.5)' },
  { hi: '#78B9B5', border: 'rgba(120,185,181,0.2)',  borderHi: 'rgba(120,185,181,0.48)' },
  { hi: '#F78D60', border: 'rgba(247,141,96,0.2)',   borderHi: 'rgba(247,141,96,0.48)' },
  { hi: '#C060A1', border: 'rgba(192,96,161,0.22)',  borderHi: 'rgba(192,96,161,0.48)' },
  { hi: '#FFCC00', border: 'rgba(255,204,0,0.18)',   borderHi: 'rgba(255,204,0,0.42)' },
]

const DEVICES = [
  {
    id: 'iphone_15_pro',
    label: 'iPhone 15 Pro / Pro Max',
    notes: 'Slight red/warm boost, aggressive HDR tone mapping. ProRAW available.',
    rawSetting: 'Settings → Camera → Formats → Apple ProRAW',
  },
  {
    id: 'iphone_14_13_12',
    label: 'iPhone 12 / 13 / 14',
    notes: 'Moderate warm bias, strong computational sharpening. ProRAW on Pro models.',
    rawSetting: 'Settings → Camera → Formats → Apple ProRAW (Pro models only)',
  },
  {
    id: 'pixel_8_7',
    label: 'Google Pixel 7 / 8',
    notes: 'Strong shadow processing, slight cool bias. RAW available in Camera app.',
    rawSetting: 'Camera app → Settings → More settings → RAW',
  },
  {
    id: 'samsung_s24_s23',
    label: 'Samsung S23 / S24',
    notes: 'High saturation boost, vivid processing pipeline. RAW in Pro mode.',
    rawSetting: 'Camera app → switch to Pro mode → RAW format',
  },
  {
    id: 'other',
    label: 'Other Android',
    notes: 'Generic correction applied.',
    rawSetting: 'Camera app → Settings → Photo format → RAW or DNG',
  },
]

const CONFIDENCE_UI = {
  high:   { label: 'Good match',                          dot: 'bg-green-400',  text: 'text-green-400' },
  medium: { label: 'Use as reference',                    dot: 'bg-yellow-400', text: 'text-yellow-400' },
  low:    { label: 'Mixed lighting — result approximate', dot: 'bg-red-400',    text: 'text-red-400' },
}

// ─── Helpers ─────────────────────────────────────────────────

function hexToRgb(hex) {
  return [1,3,5].map(i => parseInt(hex.slice(i, i+2), 16)).join(', ')
}

function storage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
  catch { return fallback }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload  = () => resolve(r.result.split(',')[1])
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

function parsePaletteURL(input) {
  const s = input.trim()
  // ColorHunt: colorhunt.co/palette/003049d62828f77f00fcbf49
  const ch = s.match(/palette\/([a-f0-9]{24})/i)
  if (ch) {
    const colors = []
    for (let i = 0; i < ch[1].length; i += 6)
      colors.push({ hex: '#' + ch[1].slice(i, i+6).toUpperCase(), name: 'ColorHunt' })
    return { colors, label: 'ColorHunt import' }
  }
  // Coolors: coolors.co/003049-d62828-f77f00-fcbf49
  const co = s.match(/coolors\.co\/([a-f0-9-]+)/i)
  if (co) {
    const colors = co[1].split('-').filter(h => h.length === 6)
      .map(h => ({ hex: '#' + h.toUpperCase(), name: 'Coolors' }))
    return { colors, label: 'Coolors import' }
  }
  return null
}

// ─── Sub-components ──────────────────────────────────────────

function Swatch({ color, inTray, onTap, ringColor }) {
  const lastTap = useRef({ hex: null, t: 0 })
  const timer   = useRef(null)

  function handleClick() {
    const now = Date.now()
    const dbl = lastTap.current.hex === color.hex && now - lastTap.current.t < DBL_TAP_MS
    lastTap.current = { hex: color.hex, t: now }
    onTap(color, dbl ? 'remove' : 'add')
  }

  return (
    <div
      onClick={handleClick}
      onTouchStart={() => { timer.current = setTimeout(() => onTap(color, 'remove'), 400) }}
      onTouchEnd={() => clearTimeout(timer.current)}
      title={`${color.name} ${color.hex}`}
      style={{
        background: color.hex,
        outline: inTray ? `2.5px solid ${ringColor || '#8CABFF'}` : 'none',
        outlineOffset: '2px',
      }}
      className="aspect-square rounded-lg cursor-pointer border border-white/5
        transition-transform duration-100 hover:scale-110 relative select-none"
    />
  )
}

function TrayChip({ color, onRemove, onSelect }) {
  const [drag, setDrag] = useState(false)
  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData('text/plain', color.hex); setDrag(true) }}
      onDragEnd={() => setDrag(false)}
      onClick={() => onSelect(color)}
      style={{ background: color.hex }}
      className={`w-12 h-12 rounded-lg cursor-grab active:cursor-grabbing border border-white/5
        relative flex-shrink-0 transition-transform group
        ${drag ? 'opacity-30 scale-95' : 'hover:scale-105'}`}
    >
      <button
        onClick={e => { e.stopPropagation(); onRemove(color.hex) }}
        className="absolute inset-0 hidden group-hover:flex items-center justify-center
          text-white text-xl font-light bg-black/40 rounded-lg"
      >×</button>
    </div>
  )
}

function ConfidenceBadge({ level }) {
  if (!level || !CONFIDENCE_UI[level]) return null
  const ui = CONFIDENCE_UI[level]
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ui.dot}`}/>
      <span className={`text-[11px] ${ui.text}`}>{ui.label}</span>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────

export default function SwatchStudio() {

  const [themeIdx, setThemeIdx] = useState(0)
  const theme = THEMES[themeIdx]
  useEffect(() => {
    const r = document.documentElement.style
    r.setProperty('--ss-hi',       theme.hi)
    r.setProperty('--ss-border',   theme.border)
    r.setProperty('--ss-borderhi', theme.borderHi)
  }, [themeIdx])

  const [prefs, setPrefs] = useState(() => storage(PREFS_KEY, { deviceId: 'iphone_15_pro', rawMode: false }))
  useEffect(() => save(PREFS_KEY, prefs), [prefs])
  const device = DEVICES.find(d => d.id === prefs.deviceId) || DEVICES[0]

  const [libraryGroups, setLibraryGroups] = useState([
    { label: 'Core library', colors: CORE_COLORS, removable: false },
  ])

  const [tray,      setTray]      = useState([])
  const [saved,     setSaved]     = useState(() => storage(PAL_KEY, []))
  const [palName,   setPalName]   = useState('')
  const [trashOver, setTrashOver] = useState(false)
  useEffect(() => save(PAL_KEY, saved), [saved])

  const [scanHistory, setScanHistory] = useState(() => storage(SCAN_KEY, []))
  useEffect(() => save(SCAN_KEY, scanHistory), [scanHistory])

  const [scanning,   setScanning]   = useState(false)
  const [scanResult, setScanResult] = useState(null)
  const [scanImage,  setScanImage]  = useState(null)

  const [urlInput,   setUrlInput]   = useState('')
  const [aiPrompt,   setAiPrompt]   = useState('')
  const [generating, setGenerating] = useState(false)

  const [selected,  setSelected]  = useState(null)
  const [toast,     setToast]     = useState('')
  const [activeTab, setActiveTab] = useState('scan')

  const fileRef   = useRef(null)
  const cameraRef = useRef(null)

  function notify(msg) { setToast(msg); setTimeout(() => setToast(''), 2000) }

  const inTray = useCallback(hex => tray.some(c => c.hex === hex), [tray])

  function addToTray(color) {
    setTray(prev => prev.find(c => c.hex === color.hex) ? prev : [...prev, { ...color }])
    setSelected(color)
  }
  function removeFromTray(hex) { setTray(prev => prev.filter(c => c.hex !== hex)) }
  function handleSwatchTap(color, action) {
    setSelected(color)
    action === 'remove' ? removeFromTray(color.hex) : addToTray(color)
  }
  function handleTrashDrop(e) {
    e.preventDefault()
    const hex = e.dataTransfer.getData('text/plain')
    if (hex) removeFromTray(hex)
    setTrashOver(false)
  }
  function clearTray() { setTray([]); setSelected(null) }

  function savePalette() {
    if (!tray.length) return
    const name  = palName.trim() || `Palette ${saved.length + 1}`
    const entry = { id: Date.now(), name, colors: [...tray], date: new Date().toLocaleDateString('en-CA') }
    setSaved(prev => [entry, ...prev])
    clearTray(); setPalName('')
    notify(`"${name}" saved`)
  }
  function loadPalette(p) { clearTray(); p.colors.forEach(c => addToTray(c)); notify(`"${p.name}" loaded`) }
  function deletePalette(id) { setSaved(prev => prev.filter(p => p.id !== id)) }
  function sharePalette(p) {
    const text = `${p.name}\n${p.colors.map(c => `${c.hex} ${c.name}`).join('\n')}`
    navigator.share ? navigator.share({ title: p.name, text }).catch(() => {})
      : (navigator.clipboard.writeText(text).catch(() => {}), notify('Copied to clipboard'))
  }
  function copyHexes() {
    if (!tray.length) return
    navigator.clipboard.writeText(tray.map(c => c.hex).join(', ')).catch(() => {})
    notify('Hex values copied')
  }

  function handleURLImport() {
    const result = parsePaletteURL(urlInput)
    if (!result) { notify('Paste a ColorHunt or Coolors URL'); return }
    setLibraryGroups(prev => [...prev, { ...result, removable: true }])
    setUrlInput(''); notify(`${result.colors.length} colors added`); setActiveTab('library')
  }

  async function generatePalette() {
    if (!aiPrompt.trim()) return
    setGenerating(true)
    try {
      const res  = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: HAIKU_MODEL, max_tokens: 400,
          system: `You are a color palette designer. Generate 6-8 harmonious colors matching the mood or style described.
Return ONLY valid JSON array, no markdown: [{"hex":"#RRGGBB","name":"descriptive name"}]`,
          messages: [{ role: 'user', content: `Generate a color palette for: ${aiPrompt}` }],
        }),
      })
      const data   = await res.json()
      const colors = JSON.parse((data.content?.[0]?.text || '').replace(/```json|```/g, '').trim())
      setLibraryGroups(prev => [...prev, { label: aiPrompt, colors, removable: true }])
      setAiPrompt(''); notify(`${colors.length} colors generated`); setActiveTab('library')
    } catch (err) {
      console.error(err); notify('Generation failed — try again')
    } finally { setGenerating(false) }
  }

  async function handleScanFile(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''

    // Store preview as data URL for history
    const reader = new FileReader()
    let dataUrl = ''
    await new Promise(resolve => {
      reader.onload = ev => { dataUrl = ev.target.result; setScanImage(dataUrl); resolve() }
      reader.readAsDataURL(file)
    })

    setScanResult(null); setScanning(true)

    try {
      const base64    = await fileToBase64(file)
      const mediaType = file.type || 'image/jpeg'

      const systemPrompt = `You are an expert color analyst for professional painters.
Analyze the image and identify the dominant paint or surface color.

Device: ${device.label}
Device color bias: ${device.notes}
Image format: ${prefs.rawMode
  ? 'RAW/DNG — unprocessed sensor data, high fidelity, trust the color values'
  : 'JPEG — apply correction for device-specific processing pipeline'}

Steps:
1. Identify the main surface color — ignore shadows, specular highlights, reflections
2. Apply device-specific bias correction listed above
3. Detect ambient lighting type from scene context (tungsten/warm, daylight/neutral, fluorescent/cool, mixed)
4. Apply white balance correction based on detected lighting
5. Rate confidence: high (single neutral light source, flat matte surface, close-up), medium (indoor mixed light), low (multiple sources, strong shadows, glossy surface)
6. Suggest nearest 3 paint colors from Benjamin Moore, Sherwin-Williams, or Behr

Return ONLY valid JSON, no markdown:
{
  "hex": "#RRGGBB",
  "name": "descriptive color name",
  "confidence": "high|medium|low",
  "confidence_notes": "brief reason for confidence rating",
  "lighting_detected": "description of lighting in scene",
  "correction_applied": "what correction was applied",
  "nearest_matches": [
    {"brand":"Benjamin Moore","name":"","code":"","hex":""},
    {"brand":"Sherwin-Williams","name":"","code":"","hex":""},
    {"brand":"Behr","name":"","code":"","hex":""}
  ]
}`

      const res  = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: HAIKU_MODEL, max_tokens: 600,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
              { type: 'text',  text: 'Analyze this surface color and return the JSON.' },
            ],
          }],
        }),
      })

      const data   = await res.json()
      const result = JSON.parse((data.content?.[0]?.text || '').replace(/```json|```/g, '').trim())
      setScanResult(result)

      // Save to history
      setScanHistory(prev => [{
        id: Date.now(),
        hex: result.hex, name: result.name,
        confidence: result.confidence,
        lighting: result.lighting_detected,
        matches: result.nearest_matches,
        rawMode: prefs.rawMode,
        device: device.label,
        date: new Date().toLocaleDateString('en-CA'),
        time: new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' }),
        image: dataUrl,
      }, ...prev].slice(0, MAX_SCANS))

    } catch (err) {
      console.error('Scan error:', err)
      notify('Scan failed — check your API key')
    } finally { setScanning(false) }
  }

  // ─── Render helpers ───────────────────────────────────────

  const tabBtn = id => `px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer border
    ${activeTab === id
      ? 'border-white/20 text-white/90 bg-white/5'
      : 'border-transparent text-white/35 hover:text-white/60'}`

  const ibtn = `text-xs px-3 py-2 rounded-lg border border-white/10
    text-white/40 hover:text-white/70 hover:border-white/25 transition-colors`

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black flex items-start justify-center p-3 md:p-8">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none
          bg-white/10 backdrop-blur text-white text-xs px-4 py-2 rounded-full border border-white/15">
          {toast}
        </div>
      )}

      <div className="w-full max-w-2xl bg-[#0e0e12] rounded-2xl border border-purple-500/25 overflow-hidden">

        {/* Header */}
        <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <img
              src="/assets/PB_LOGO_GRAPHFIX_1.png"   // replace with: src={logo}
              alt="PaintBrain"
              className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
              onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block' }}
            />
            <div className="w-16 h-16 rounded-xl hidden flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#471396,#EA2264,#EB5B00)' }}/>
            <div>
              <div className="text-2xl font-semibold leading-tight"
                style={{ background: 'linear-gradient(90deg,#B13BFF,#EA2264,#EB5B00)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                PaintBrain
              </div>
              <div className="text-sm text-white/35 tracking-wide">Swatch Studio</div>
            </div>
          </div>
          <div className="flex gap-1.5">
            {THEMES.map((t,i) => (
              <button key={i} onClick={() => setThemeIdx(i)} style={{ background: t.hi }}
                className={`w-3.5 h-3.5 rounded-full transition-transform hover:scale-125
                  ${themeIdx===i ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0e0e12]' : ''}`}/>
            ))}
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-1.5 px-4 pt-3 pb-1 border-b border-white/5">
          {[
            { id: 'scan',     label: 'Scan' },
            { id: 'library',  label: 'Library' },
            { id: 'history',  label: `History${scanHistory.length ? ` (${scanHistory.length})` : ''}` },
            { id: 'settings', label: 'Settings' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={tabBtn(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4">

          {/* ── SCAN TAB ── */}
          {activeTab === 'scan' && (
            <div className="space-y-3">

              {/* RAW banner */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg border
                ${prefs.rawMode ? 'border-green-500/30 bg-green-500/5' : 'border-white/8'}`}>
                <div>
                  <div className="text-xs text-white/60">
                    {prefs.rawMode ? 'RAW mode on — higher accuracy' : 'JPEG mode — standard accuracy'}
                  </div>
                  <div className="text-[10px] text-white/25 mt-0.5">
                    {prefs.rawMode ? 'Shooting in RAW/DNG reduces processing artifacts'
                      : 'Enable RAW in Settings for better results'}
                  </div>
                </div>
                <button onClick={() => setPrefs(p => ({ ...p, rawMode: !p.rawMode }))}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors flex-shrink-0
                    ${prefs.rawMode ? 'border-green-500/40 text-green-400' : 'border-white/10 text-white/35'}`}>
                  {prefs.rawMode ? 'On' : 'Off'}
                </button>
              </div>

              {/* Scan buttons */}
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
                    border border-white/10 text-white/50 text-sm hover:border-white/25 hover:text-white/80 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                  </svg>
                  Upload photo
                </button>
                <button onClick={() => cameraRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm transition-colors"
                  style={{ borderColor: theme.hi, color: theme.hi }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  Scan surface
                </button>
                <input ref={fileRef}   type="file" accept="image/*" className="hidden" onChange={handleScanFile}/>
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanFile}/>
              </div>

              {/* Tips */}
              <div className="text-[11px] text-white/20 space-y-0.5">
                <div>· Get close — fill the frame with the surface</div>
                <div>· Open shade or bright even light works best</div>
                <div>· Avoid direct sun, deep shadows, or glossy reflections</div>
              </div>

              {/* Scanning */}
              {scanning && (
                <div className="flex items-center gap-3 py-5 justify-center">
                  <div className="w-5 h-5 border-2 border-white/10 border-t-white/50 rounded-full animate-spin"/>
                  <span className="text-sm text-white/40">Analyzing color…</span>
                </div>
              )}

              {/* Result */}
              {scanResult && !scanning && (
                <div className="border border-white/10 rounded-xl overflow-hidden">
                  <div className="flex gap-3 p-3">
                    {scanImage && (
                      <img src={scanImage} alt="scan"
                        className="w-20 h-20 rounded-lg object-cover border border-white/5 flex-shrink-0"/>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <div className="w-9 h-9 rounded-md flex-shrink-0 border border-white/10"
                          style={{ background: scanResult.hex }}/>
                        <div>
                          <div className="text-sm font-medium font-mono text-white/90">{scanResult.hex}</div>
                          <div className="text-[11px] text-white/45">{scanResult.name}</div>
                        </div>
                      </div>
                      <ConfidenceBadge level={scanResult.confidence}/>
                      <div className="text-[10px] text-white/25 mt-1">{scanResult.confidence_notes}</div>
                      <div className="text-[10px] text-white/18 mt-0.5">
                        Light: {scanResult.lighting_detected}
                      </div>
                    </div>
                  </div>

                  {scanResult.nearest_matches?.length > 0 && (
                    <div className="border-t border-white/5 px-3 py-2.5">
                      <div className="text-[10px] font-medium tracking-widest uppercase text-white/20 mb-2">
                        Nearest paint matches
                      </div>
                      <div className="space-y-1.5">
                        {scanResult.nearest_matches.map((m, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded flex-shrink-0 border border-white/5"
                              style={{ background: m.hex || scanResult.hex }}/>
                            <span className="text-[11px] text-white/45">{m.brand} · </span>
                            <span className="text-[11px] text-white/75">{m.name}</span>
                            {m.code && <span className="text-[10px] text-white/25">#{m.code}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t border-white/5 px-3 py-2 flex gap-2">
                    <button
                      onClick={() => addToTray({ hex: scanResult.hex, name: scanResult.name })}
                      className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
                      style={{ borderColor: theme.hi, color: theme.hi }}>
                      + Add to palette
                    </button>
                    <button
                      onClick={() => { navigator.clipboard.writeText(scanResult.hex).catch(() => {}); notify('Copied!') }}
                      className={ibtn}>
                      Copy hex
                    </button>
                    <button onClick={() => setScanResult(null)} className={`${ibtn} ml-auto`}>
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/*
                TODO: Pro mode — Phase 2
                ─────────────────────────────────────────
                Add below this comment:
                - <ProModeToggle /> — grey card + daylight LED guide
                - Grey card detection in same frame as surface
                - Hard calibration correction off 18% grey reference
                - DNG metadata parsing for ProRAW accuracy boost
                - Paint store color database for precise matching
                See: docs/SwatchStudio_ProMode.md
              */}

            </div>
          )}

          {/* ── LIBRARY TAB ── */}
          {activeTab === 'library' && (
            <div className="space-y-4">
              {libraryGroups.map((group, gi) => (
                <div key={gi}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-medium tracking-widest uppercase text-white/25">
                      {group.label}
                    </p>
                    {group.removable && (
                      <button onClick={() => setLibraryGroups(prev => prev.filter((_,i) => i !== gi))}
                        className="text-[10px] text-white/20 hover:text-white/50 transition-colors">
                        remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-8 gap-1.5">
                    {group.colors.map((c, ci) => (
                      <Swatch key={c.hex+gi+ci} color={c} inTray={inTray(c.hex)}
                        onTap={handleSwatchTap} ringColor={theme.hi}/>
                    ))}
                  </div>
                </div>
              ))}

              <p className="text-center text-[11px] text-white/18">
                Single tap adds · double-tap removes · long-press on mobile
              </p>

              <div className="border-t border-white/5 pt-3 space-y-3">
                <div>
                  <p className="text-[10px] font-medium tracking-widest uppercase text-white/25 mb-2">
                    Import from URL
                  </p>
                  <div className="flex gap-2">
                    <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleURLImport()}
                      placeholder="Paste a ColorHunt or Coolors URL…"
                      className="flex-1 text-xs px-3 py-2 rounded-lg border border-white/10
                        bg-transparent text-white/80 placeholder-white/20 focus:outline-none focus:border-white/25"/>
                    <button onClick={handleURLImport} className={ibtn}>Import</button>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-medium tracking-widest uppercase text-white/25 mb-2">
                    Generate with AI
                  </p>
                  <div className="flex gap-2">
                    <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && generatePalette()}
                      placeholder="Describe a mood, room or style…"
                      className="flex-1 text-xs px-3 py-2 rounded-lg border border-white/10
                        bg-transparent text-white/80 placeholder-white/20 focus:outline-none focus:border-white/25"/>
                    <button onClick={generatePalette} disabled={generating}
                      className="text-xs px-3 py-2 rounded-lg border flex-shrink-0 transition-colors disabled:opacity-40"
                      style={{ borderColor: theme.hi, color: theme.hi }}>
                      {generating
                        ? <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"/>
                            Generating
                          </span>
                        : 'Generate'}
                    </button>
                  </div>
                  <p className="text-[10px] text-white/18 mt-1.5">
                    Try: "coastal beach house" · "industrial warehouse" · "warm Scandinavian kitchen"
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── HISTORY TAB ── */}
          {activeTab === 'history' && (
            <div>
              {scanHistory.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-white/20 text-sm">No scans yet</div>
                  <div className="text-white/15 text-xs mt-1">Scanned colors will appear here</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] font-medium tracking-widest uppercase text-white/25">
                      {scanHistory.length} scan{scanHistory.length !== 1 ? 's' : ''} saved
                    </div>
                    <button onClick={() => { setScanHistory([]); notify('History cleared') }}
                      className="text-[10px] text-white/20 hover:text-white/50 transition-colors">
                      Clear all
                    </button>
                  </div>
                  {scanHistory.map(scan => (
                    <div key={scan.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-white/8 hover:border-white/15 transition-colors">
                      {scan.image && (
                        <img src={scan.image} alt=""
                          className="w-10 h-10 rounded-md object-cover border border-white/5 flex-shrink-0"/>
                      )}
                      <div className="w-10 h-10 rounded-md flex-shrink-0 border border-white/5"
                        style={{ background: scan.hex }}/>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono text-white/80">{scan.hex}</div>
                        <div className="text-[11px] text-white/40">{scan.name}</div>
                        <div className="text-[10px] text-white/20">{scan.date} {scan.time} · {scan.device}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className={`w-2 h-2 rounded-full
                          ${scan.confidence === 'high' ? 'bg-green-400'
                            : scan.confidence === 'low' ? 'bg-red-400' : 'bg-yellow-400'}`}/>
                        <button onClick={() => addToTray({ hex: scan.hex, name: scan.name })}
                          className="text-[10px] px-2 py-0.5 rounded border border-white/10
                            text-white/35 hover:text-white/65 transition-colors">
                          + Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SETTINGS TAB ── */}
          {activeTab === 'settings' && (
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-medium tracking-widest uppercase text-white/25 mb-2">Your phone</p>
                <div className="space-y-1.5">
                  {DEVICES.map(d => (
                    <button key={d.id} onClick={() => setPrefs(p => ({ ...p, deviceId: d.id }))}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors
                        ${prefs.deviceId === d.id ? 'border-white/25 bg-white/5' : 'border-white/8 hover:border-white/15'}`}>
                      <div className="text-xs text-white/75">{d.label}</div>
                      <div className="text-[10px] text-white/30 mt-0.5">{d.notes}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-medium tracking-widest uppercase text-white/25 mb-2">RAW mode</p>
                <div className="border border-white/10 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-white/65">Enable RAW capture</div>
                      <div className="text-[10px] text-white/28 mt-0.5">
                        Bypasses phone processing for more accurate color data
                      </div>
                    </div>
                    <button onClick={() => setPrefs(p => ({ ...p, rawMode: !p.rawMode }))}
                      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0
                        ${prefs.rawMode ? 'bg-green-500/60' : 'bg-white/10'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform
                        ${prefs.rawMode ? 'translate-x-5' : 'translate-x-0.5'}`}/>
                    </button>
                  </div>
                  {prefs.rawMode && (
                    <div className="border-t border-white/5 pt-2">
                      <div className="text-[10px] text-white/35 mb-1">How to enable on your device:</div>
                      <div className="text-[11px] text-white/55 font-mono bg-white/3 rounded px-2 py-1.5">
                        {device.rawSetting}
                      </div>
                      <div className="text-[10px] text-white/22 mt-1.5">
                        After enabling, shoot photos normally — they save as RAW/DNG automatically
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-medium tracking-widest uppercase text-white/25 mb-2">
                  Accuracy guide
                </p>
                <div className="space-y-1.5">
                  {[
                    ['JPEG, mixed light, unknown phone', '~60% — color family only'],
                    ['JPEG, daylight, known phone',      '~72%'],
                    ['RAW, daylight, known phone',       '~85%'],
                    ['RAW, daylight + macro close-up',   '~91%+'],
                  ].map(([setup, acc]) => (
                    <div key={setup} className="flex justify-between gap-2 text-[11px]">
                      <span className="text-white/30">{setup}</span>
                      <span className="text-white/50 flex-shrink-0">{acc}</span>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-white/18 mt-2">
                  Pro mode with grey card + daylight LED — coming Phase 2
                </div>
              </div>

              <div className="border-t border-white/5 pt-3">
                <div className="text-[10px] text-white/18">
                  PaintBrain Swatch Studio v2 · Free tier · Powered by Claude Haiku
                </div>
              </div>
            </div>
          )}

          {/* ── PALETTE BUILDER — always visible ── */}
          <div className="border-t border-white/5 pt-4 space-y-3">

            {/* Detail bar */}
            <div className="rounded-xl border border-white/8 px-3 py-2.5 flex items-center gap-3 min-h-[50px]">
              {selected ? (
                <>
                  <div className="w-8 h-8 rounded-md flex-shrink-0 border border-white/10"
                    style={{ background: selected.hex }}/>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium font-mono text-white/90">{selected.hex}</div>
                    <div className="text-[11px] text-white/35">
                      rgb({hexToRgb(selected.hex)}) · {selected.name}
                    </div>
                  </div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(selected.hex).catch(() => {}); notify('Copied!') }}
                    className={`${ibtn} flex-shrink-0`}>
                    Copy
                  </button>
                  {inTray(selected.hex) && (
                    <span className="text-[11px] flex-shrink-0" style={{ color: theme.hi }}>· in palette</span>
                  )}
                </>
              ) : (
                <span className="text-xs text-white/20">Tap any color to preview</span>
              )}
            </div>

            {/* Tray label */}
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium tracking-widest uppercase text-white/25">Current palette</p>
              {tray.length > 0 && (
                <span className="text-[11px] text-white/25">{tray.length} color{tray.length !== 1 ? 's' : ''}</span>
              )}
            </div>

            {/* Tray */}
            <div className="rounded-xl border border-white/8 p-2.5 min-h-[68px] flex flex-wrap gap-1.5 content-start">
              {tray.length === 0
                ? <span className="text-xs text-white/20 self-center">Tap colors to build your palette</span>
                : tray.map(c => (
                  <TrayChip key={c.hex} color={c} onRemove={removeFromTray} onSelect={setSelected}/>
                ))
              }
            </div>

            {/* Trash zone */}
            <div
              onDragOver={e => { e.preventDefault(); setTrashOver(true) }}
              onDragLeave={() => setTrashOver(false)}
              onDrop={handleTrashDrop}
              className={`flex items-center justify-center gap-1.5 rounded-lg border border-dashed
                px-3 py-2 text-[11px] transition-colors
                ${trashOver ? 'border-red-400 text-red-400' : 'border-white/8 text-white/20'}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
              </svg>
              Drag here to remove
            </div>

            {/* Palette actions */}
            <div className="flex gap-2 flex-wrap items-center">
              <input value={palName} onChange={e => setPalName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && savePalette()}
                placeholder="Name this palette…"
                className="flex-1 min-w-[110px] text-xs px-3 py-2 rounded-lg border border-white/10
                  bg-transparent text-white/80 placeholder-white/20 focus:outline-none focus:border-white/25"/>
              <button onClick={savePalette}
                className="text-xs px-3 py-2 rounded-lg border transition-colors flex-shrink-0"
                style={{ borderColor: theme.hi, color: theme.hi }}>
                Save
              </button>
              <button onClick={clearTray} className={ibtn}>Clear</button>
              <button onClick={copyHexes} className={ibtn}>Copy hex</button>
            </div>

            {/* Saved palettes */}
            {saved.length > 0 && (
              <div className="border-t border-white/5 pt-3">
                <p className="text-[10px] font-medium tracking-widest uppercase text-white/25 mb-3">
                  Saved palettes
                </p>
                {saved.map(p => (
                  <div key={p.id} className="border border-white/8 rounded-xl px-3 py-2.5 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-sm font-medium text-white/80">{p.name}</div>
                        <div className="text-[11px] text-white/25">{p.colors.length} colors · {p.date}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {p.colors.map(c => (
                        <div key={c.hex} style={{ background: c.hex }}
                          className="w-7 h-7 rounded border border-white/5" title={c.hex}/>
                      ))}
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <button onClick={() => loadPalette(p)} className={ibtn}>Load</button>
                      <button onClick={() => {
                          navigator.clipboard.writeText(p.colors.map(c => c.hex).join(', ')).catch(() => {})
                          notify('Copied')
                        }} className={ibtn}>Copy hex</button>
                      <button onClick={() => sharePalette(p)} className={ibtn}>Share</button>
                      <button onClick={() => deletePalette(p.id)} className={`${ibtn} ml-auto`}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
