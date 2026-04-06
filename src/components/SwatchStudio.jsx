// ============================================================
// PaintBrain — Swatch Studio v6
// Tabs: Browse · Palettes · Scanned
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react'
import logo from '../assets/PB_LOGO_GRAPHFIX_1.png'
import { hexToRgbString, formatCopy, parsePaletteURL, generateSchemes } from '../lib/colorUtils'
import { SPECTRUM, SPECTRUM_COLORS, COLLECTION_TAGS, THEMES, COLOR_FAMILIES, ANTHROPIC_API, HAIKU_MODEL } from '../lib/constants'
import * as db from '../lib/db'
import { getSyncStatus, fetchAndMergeSyncedPalettes } from '../lib/colorhuntSync'

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result.split(',')[1])
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

// ─── Hex popup ───────────────────────────────────────────────

function HexPopup({ color, onClose, onPick, onCopy }) {
  if (!color) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="rounded-xl p-4 w-64 space-y-3"
        style={{ background: 'var(--theme-header-bg)', border: '2px solid var(--theme-accent)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-lg" style={{ background: color.hex, border: '1.5px solid var(--theme-divider)' }}/>
          <div>
            <div className="text-base font-mono text-white">{color.hex}</div>
            <div className="text-xs text-white/70">rgb({hexToRgbString(color.hex)})</div>
            {color.name && <div className="text-[10px] text-white/50">{color.name}</div>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onCopy(color.hex)} className="btn-secondary flex-1">Copy hex</button>
          <button onClick={() => onPick(color)} className="btn-primary flex-1">Pick color</button>
        </div>
      </div>
    </div>
  )
}

// ─── Save dialog popup ──────────────────────────────────────

function SaveDialog({ tray, onSave, onAutoName, onClose }) {
  const [name, setName] = useState('')
  const [naming, setNaming] = useState(false)

  async function handleAuto() {
    setNaming(true)
    try {
      const res = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: HAIKU_MODEL, max_tokens: 100,
          system: 'Give this color palette a short evocative 2-3 word name — like "Harbour Fog" or "Ember Coast". Return ONLY the name.',
          messages: [{ role: 'user', content: JSON.stringify(tray.map(c => c.hex)) }],
        }),
      })
      const data = await res.json()
      const n = (data.content?.[0]?.text || '').trim().replace(/"/g, '')
      if (n) setName(n)
    } catch {}
    finally { setNaming(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="rounded-xl p-4 w-80 space-y-3"
        style={{ background: 'var(--theme-header-bg)', border: '2px solid var(--theme-accent)' }}
        onClick={e => e.stopPropagation()}>
        <div className="text-sm font-medium text-white">Save palette</div>
        <div className="flex h-10 rounded-lg overflow-hidden" style={{ border: '1.5px solid var(--theme-divider)' }}>
          {tray.map((c, i) => <div key={c.hex + i} style={{ background: c.hex }} className="flex-1"/>)}
        </div>
        <input value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && name.trim()) { onSave(name.trim()); onClose() } }}
          placeholder="Palette name…" className="input-field" autoFocus/>
        <div className="flex gap-2">
          <button onClick={handleAuto} disabled={naming} className="btn-secondary flex-1">
            {naming ? 'Naming…' : 'Auto-name'}</button>
          <button onClick={() => { onSave(name.trim() || `Palette ${Date.now() % 10000}`); onClose() }}
            className="btn-primary flex-1">Save</button>
        </div>
      </div>
    </div>
  )
}

// ─── Palette card ────────────────────────────────────────────

function PaletteCard({ palette, onLoad, onCopy, onShare, onDelete, onChipTap, selectedHex }) {
  const hasSelected = selectedHex && palette.colors.some(c => c.hex === selectedHex)
  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{ border: hasSelected ? `2px solid ${selectedHex}` : '1.5px solid var(--theme-accent)' }}>
      <div className="flex h-16">
        {palette.colors.map((c, i) => (
          <div key={c.hex + i} style={{ background: c.hex }}
            className="flex-1 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onChipTap?.(c)}
            onContextMenu={e => { e.preventDefault(); navigator.clipboard.writeText(c.hex).catch(() => {}) }}
            title={`${c.name} ${c.hex} · hold to copy`}/>
        ))}
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5" style={{ borderTop: '1px solid var(--theme-accent)' }}>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">{palette.name}</div>
          <div className="text-[9px] text-white/50">
            {palette.source && palette.source !== 'curated' ? palette.source : 'curated'}
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {onLoad && <button onClick={() => onLoad(palette)}
            className="text-[9px] px-2 py-0.5 rounded-full text-white"
            style={{ border: '1.5px solid var(--theme-accent)', background: 'transparent' }}>Load</button>}
          <button onClick={() => onCopy(palette)}
            className="text-[9px] px-2 py-0.5 rounded-full text-white"
            style={{ border: '1.5px solid var(--theme-accent)', background: 'transparent' }}>Copy</button>
          {onShare && <button onClick={() => onShare(palette)}
            className="text-[9px] px-2 py-0.5 rounded-full text-white"
            style={{ border: '1.5px solid var(--theme-accent)', background: 'transparent' }}>Share</button>}
          {onDelete && <button onClick={() => onDelete(palette.id)}
            className="text-[9px] px-2 py-0.5 rounded-full text-white"
            style={{ border: '1.5px solid var(--theme-accent)', background: 'transparent' }}>Del</button>}
        </div>
      </div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────

export default function SwatchStudio() {

  useEffect(() => {
    db.seedIfNeeded()
    // Fetch synced ColorHunt palettes from backend on load
    fetchAndMergeSyncedPalettes().then(() => refreshPalettes())
  }, [])

  const [themeIdx, setThemeIdx] = useState(0)
  const theme = THEMES[themeIdx]
  useEffect(() => {
    const r = document.documentElement.style
    r.setProperty('--theme-accent', theme.accent)
    r.setProperty('--theme-header-bg', theme.headerBg)
    r.setProperty('--theme-divider', theme.divider)
    r.setProperty('--theme-muted', theme.muted)
  }, [themeIdx])

  // Builder
  const [tray, setTray]           = useState([])
  const [selected, setSelected]   = useState(null)
  const [schemes, setSchemes]     = useState([])
  const [schemeTab, setSchemeTab]  = useState(0)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [savingFrom, setSavingFrom] = useState('user') // 'user' or 'agent'

  // Palettes tab
  const [userPalettes, setUserPalettes] = useState([])
  const [palFilter, setPalFilter]       = useState('all')
  const [searchQuery, setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching]       = useState(false)
  const [spectrumFilter, setSpectrumFilter] = useState('All')
  const [tagFilter, setTagFilter]           = useState(null)
  const [browsePalettes, setBrowsePalettes] = useState([])

  // Scanned
  const [scanning, setScanning]       = useState(false)
  const [scanColors, setScanColors]   = useState([])
  const [scanImage, setScanImage]     = useState(null)
  const [scanWarning, setScanWarning] = useState(null)
  const [scanSchemes, setScanSchemes] = useState([])
  const [scanSchemeTab, setScanSchemeTab] = useState(0)
  const [scanHistory, setScanHistory] = useState(db.getScanHistory)

  // UI
  const [toast, setToast]         = useState('')
  const [activeTab, setActiveTab] = useState('browse')
  const [hexPopup, setHexPopup]   = useState(null)
  const [builderCollapsed, setBuilderCollapsed] = useState(false)
  const [filtersVisible, setFiltersVisible] = useState(false)

  // Zoom: slider value = number of columns directly (3-16)
  const [zoomCols, setZoomCols] = useState(() => {
    try { return parseInt(localStorage.getItem('pb_zoom_cols') || '10') } catch { return 10 }
  })
  useEffect(() => { localStorage.setItem('pb_zoom_cols', String(zoomCols)) }, [zoomCols])

  const fileRef = useRef(null)
  const cameraRef = useRef(null)

  function notify(msg) { setToast(msg); setTimeout(() => setToast(''), 2000) }

  // Data
  function refreshPalettes() {
    setUserPalettes(db.getUserPalettes())
    const filters = {}
    if (spectrumFilter !== 'All') filters.hueFamily = spectrumFilter
    if (tagFilter) filters.tag = tagFilter
    setBrowsePalettes(db.getBrowsePalettes(filters))
  }
  useEffect(() => { refreshPalettes() }, [spectrumFilter, tagFilter])

  // Tray
  const inTray = useCallback(hex => tray.some(c => c.hex === hex), [tray])
  function addToTray(color) {
    setTray(prev => prev.find(c => c.hex === color.hex) ? prev : [...prev, { ...color }])
    setSelected(color)
  }
  function removeFromTray(hex) { setTray(prev => prev.filter(c => c.hex !== hex)) }
  function clearTray() { setTray([]); setSelected(null); setSchemes([]) }

  function handleChipTap(color) { setHexPopup(color) }
  function handleColorPick(color) { addToTray(color); setHexPopup(null) }
  function handleCopyHex(hex) { navigator.clipboard.writeText(hex).catch(() => {}); notify('Copied!') }

  // Palette ops
  function copyPalette(p) { navigator.clipboard.writeText(formatCopy(p.name, p.colors)).catch(() => {}); notify('Copied!') }
  function sharePalette(p) {
    const text = formatCopy(p.name, p.colors)
    navigator.share ? navigator.share({ title: p.name, text }).catch(() => {}) : (navigator.clipboard.writeText(text).catch(() => {}), notify('Copied'))
  }
  function loadPalette(p) { clearTray(); p.colors.forEach(c => addToTray(c)); setActiveTab('browse'); notify(`"${p.name}" loaded`) }
  function handleDeletePalette(id) { db.deletePalette(id); refreshPalettes(); notify('Deleted') }

  function savePalette(name) {
    if (!tray.length) return
    savePaletteFromColors(tray, name)
    clearTray()
  }

  function savePaletteFromColors(colors, name) {
    if (!colors.length) return
    const result = db.insertPalette({ name, colors: [...colors], source: 'custom' })
    if (result) { notify(`"${name}" saved`); refreshPalettes() } else { notify('Duplicate') }
  }

  function copyTrayHexes() {
    if (!tray.length) return
    navigator.clipboard.writeText(formatCopy('Palette', tray)).catch(() => {})
    notify('Copied!')
  }

  // Smart input — only auto-import on paste, not every keystroke
  function handleSmartInputChange(value) {
    setSearchQuery(value)
  }

  function handleSmartInputPaste(e) {
    const pasted = e.clipboardData?.getData('text') || ''
    const parsed = parsePaletteURL(pasted)
    if (parsed) {
      e.preventDefault()
      const name = parsed.source === 'colorhunt' ? `ColorHunt ${parsed.slug.slice(0, 12)}` : 'Coolors import'
      const result = db.insertPalette({ name, colors: parsed.colors, source: parsed.source, sourceSlug: parsed.slug, autoNamed: false })
      if (result) { setSearchQuery(''); refreshPalettes(); notify('Palette imported'); autoNamePalette(result.id) }
      else { setSearchQuery(''); notify('Already imported') }
    }
  }

  function handleSmartInputSubmit() {
    // Check if it's a URL first
    const parsed = parsePaletteURL(searchQuery)
    if (parsed) {
      const name = parsed.source === 'colorhunt' ? `ColorHunt ${parsed.slug.slice(0, 12)}` : 'Coolors import'
      const result = db.insertPalette({ name, colors: parsed.colors, source: parsed.source, sourceSlug: parsed.slug, autoNamed: false })
      if (result) { setSearchQuery(''); refreshPalettes(); notify('Palette imported'); autoNamePalette(result.id) }
      else { setSearchQuery(''); notify('Already imported') }
      return
    }
    searchPalettes()
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

  async function searchPalettes() {
    if (!searchQuery.trim()) { setSearchResults(null); return }
    setSearching(true)
    try {
      const all = db.getPalettes()
      const res = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: HAIKU_MODEL, max_tokens: 1200,
          system: `Palette search. Return up to 8 matching as JSON array. Database: ${JSON.stringify(all.map(p => ({ id: p.id, name: p.name, colors: p.colorsCache, tags: p.categoryTags })))}`,
          messages: [{ role: 'user', content: searchQuery }] }),
      })
      const data = await res.json()
      const ids = JSON.parse((data.content?.[0]?.text || '').replace(/```json|```/g, '').trim()).map(r => r.id)
      setSearchResults(all.filter(p => ids.includes(p.id)))
    } catch { notify('Search failed') }
    finally { setSearching(false) }
  }

  // Scan
  async function handleScanFile(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    let dataUrl = ''
    await new Promise(resolve => { reader.onload = ev => { dataUrl = ev.target.result; setScanImage(dataUrl); resolve() }; reader.readAsDataURL(file) })
    setScanColors([]); setScanWarning(null); setScanSchemes([]); setScanning(true)
    try {
      const base64 = await fileToBase64(file)
      const res = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: HAIKU_MODEL, max_tokens: 600,
          system: 'Extract 3-6 dominant colors. Return ONLY JSON: [{"hex":"#RRGGBB","name":"name","coverage":"dominant|accent|subtle"}]',
          messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: file.type || 'image/jpeg', data: base64 } }, { type: 'text', text: 'Extract colors.' }] }] }),
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

  // Filtered
  const displayPalettes = searchResults || browsePalettes
  const filteredUserPalettes = palFilter === 'all' ? userPalettes
    : userPalettes.filter(p => {
      if (palFilter === 'colorhunt') return p.source === 'colorhunt' || p.source === 'coolors'
      if (palFilter === 'custom') return p.source === 'custom' || p.source === 'user'
      if (palFilter === 'generated') return p.source === 'scanned' || p.source === 'generated'
      return true
    })

  const S = {
    accent: 'var(--theme-accent)', divider: 'var(--theme-divider)',
    muted: 'var(--theme-muted)', headerBg: 'var(--theme-header-bg)', libraryBg: 'var(--theme-library-bg)',
  }

  // Unified button styles — theme border, white text, no bg fill
  const btn = (active) => ({
    style: { border: `1.5px solid ${S.accent}`, color: '#fff', background: active ? `color-mix(in srgb, ${S.accent} 10%, transparent)` : 'transparent' },
    className: 'text-[10px] px-3 py-1 rounded-full text-white transition-colors whitespace-nowrap',
  })
  const btnSm = (active) => ({
    style: { border: `1.5px solid ${S.accent}`, color: '#fff', background: active ? `color-mix(in srgb, ${S.accent} 10%, transparent)` : 'transparent' },
    className: 'text-[9px] px-2.5 py-0.5 rounded-full text-white transition-colors whitespace-nowrap',
  })

  return (
    <div className="h-screen bg-black flex items-start justify-center p-3 md:p-8">

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none
          bg-white/10 backdrop-blur text-white text-xs px-4 py-2 rounded-full"
          style={{ border: `1.5px solid ${S.accent}` }}>{toast}</div>
      )}

      {/* Update banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 text-center py-1.5 text-[11px] font-bold text-white"
        style={{ background: 'var(--theme-accent)', color: '#000' }}>
        v6.9 LIVE
      </div>

      {/* HexPopup — preserved for Scanned tab only */}
      {activeTab === 'scanned' && hexPopup && (
        <HexPopup color={hexPopup} onClose={() => setHexPopup(null)}
          onPick={c => { addToTray(c); setSelected(c); setHexPopup(null) }}
          onCopy={hex => { handleCopyHex(hex); setHexPopup(null) }}/>
      )}

      {showSaveDialog && (
        <SaveDialog
          tray={savingFrom === 'agent' && schemes.length > 0 ? schemes[schemeTab].colors : tray}
          onSave={name => {
            const colors = savingFrom === 'agent' && schemes.length > 0 ? schemes[schemeTab].colors : tray
            const result = db.insertPalette({ name, colors: [...colors], source: savingFrom === 'agent' ? 'generated' : 'custom' })
            if (result) {
              notify(`"${name}" saved`)
              refreshPalettes()
            } else {
              notify('Duplicate palette')
            }
            if (savingFrom === 'user') clearTray()
          }}
          onClose={() => setShowSaveDialog(false)}/>
      )}

      <div className="w-full max-w-2xl h-full rounded-2xl flex flex-col overflow-hidden"
        style={{ background: S.libraryBg, border: `2px solid ${S.accent}` }}>

        {/* ═══ ZONE 1: Header ═══ */}
        <header className="flex-shrink-0 flex items-center px-4 py-1.5 relative"
          style={{ background: S.headerBg, borderBottom: `2px solid ${S.accent}` }}>
          <img src={logo} alt="PaintBrain" className="w-[75px] h-[75px] rounded-xl object-cover flex-shrink-0"
            onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}/>
          <div className="w-[75px] h-[75px] rounded-xl hidden items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#471396,#EA2264,#EB5B00)' }}/>
          <div className="flex-1 flex flex-col items-center">
            <div className="text-2xl font-bold text-white tracking-[0.2em] leading-none">SWATCH</div>
            <div className="text-sm font-bold text-white tracking-[0.3em] leading-none mt-0.5">STUDIO</div>
          </div>
          <div className="flex gap-1.5 flex-shrink-0">
            {THEMES.map((t,i) => (
              <button key={i} onClick={() => setThemeIdx(i)}
                style={{ background: t.accent }}
                className={`w-3 h-3 rounded-full hover:scale-125 transition-transform
                  ${themeIdx===i ? 'ring-2 ring-white ring-offset-1' : ''}`}/>
            ))}
          </div>
        </header>

        {/* Tabs */}
        <div className="flex-shrink-0 flex gap-2 px-4 pt-2 pb-1.5"
          style={{ background: S.headerBg, borderBottom: `2px solid ${S.accent}` }}>
          {['browse', 'palettes', 'scanned'].map(id => {
            const labels = { browse: 'Browse', palettes: 'Palettes', scanned: 'Scanned' }
            return (
              <button key={id} onClick={() => {
                setActiveTab(id)
                if (id === 'palettes') refreshPalettes()
                if (id === 'scanned') setScanHistory(db.getScanHistory())
              }}
                className="px-4 py-1.5 text-xs rounded-full text-white cursor-pointer transition-colors"
                style={{ border: `1.5px solid ${S.accent}`, background: activeTab === id ? `color-mix(in srgb, ${S.accent} 10%, transparent)` : 'transparent' }}>
                {labels[id]}</button>
            )
          })}
        </div>

        {/* ═══ ZONE 2: Compact builder (Browse only) ═══ */}
        {activeTab === 'browse' && (
          <div className="flex-shrink-0 px-4 py-2 space-y-1.5"
            style={{ background: S.headerBg, borderBottom: `2px solid ${S.accent}` }}>

            {/* Palette chips — tight fitted container, double-tap to remove */}
            {tray.length > 0 ? (
              <div className="flex rounded-lg overflow-hidden" style={{ border: `1.5px solid ${S.accent}` }}>
                {tray.map(c => {
                  const lastTapRef = { current: 0 }
                  return (
                    <div key={c.hex}
                      onClick={() => {
                        const now = Date.now()
                        if (now - (c._lastTap || 0) < 350) { removeFromTray(c.hex); return }
                        c._lastTap = now
                        setSelected(c)
                      }}
                      onContextMenu={e => { e.preventDefault(); removeFromTray(c.hex); notify('Removed') }}
                      style={{ background: c.hex, outline: selected?.hex === c.hex ? `2px solid #fff` : 'none', outlineOffset: '-2px' }}
                      className="flex-1 h-11 cursor-pointer hover:opacity-80 transition-opacity"
                      title={`${c.hex} · double-tap to remove`}/>
                  )
                })}
              </div>
            ) : (
              <div className="text-[10px] text-white/40 py-2">Tap colors below to build</div>
            )}

            {/* Buttons — separated */}
            <div className="flex gap-2 items-center pt-1">
              <button onClick={() => { if (tray.length) { setSchemes(generateSchemes((selected || tray[0]).hex)); setSchemeTab(0) } }}
                disabled={!tray.length} {...btn(false)} className={btn().className + ' disabled:opacity-30'}>Generate</button>
              <button onClick={() => { setSavingFrom('user'); setShowSaveDialog(true) }} disabled={!tray.length}
                {...btn(false)} className={btn().className + ' disabled:opacity-30'}>Save</button>
              <button onClick={clearTray} {...btn(false)}>Clear</button>
              <button onClick={copyTrayHexes} {...btn(false)}>Copy</button>
            </div>

            {/* Generated themes */}
            {schemes.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1 overflow-x-auto scrollbar-none">
                  {schemes.map((s, i) => (
                    <button key={s.name} onClick={() => setSchemeTab(i)} {...btnSm(schemeTab === i)}>
                      {s.name.replace(' Gradient','').replace(' Palette','')}</button>
                  ))}
                </div>
                <div className="flex h-7 rounded-lg overflow-hidden" style={{ border: `1.5px solid ${S.accent}` }}>
                  {schemes[schemeTab].colors.map((c, i) => (
                    <div key={c.hex+i} style={{ background: c.hex }}
                      className="flex-1 cursor-pointer hover:opacity-80" onClick={() => addToTray(c)} title={c.hex}/>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setSavingFrom('agent'); setShowSaveDialog(true) }} {...btn(false)}>Save generated</button>
                  <button onClick={() => copyPalette(schemes[schemeTab])} {...btn(false)}>Copy</button>
                  <button onClick={() => setSchemes([])} {...btn(false)}>Clear</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ ZONE 2b: Palettes — search first, then builder ═══ */}
        {activeTab === 'palettes' && (
          <div className="flex-shrink-0 px-4 py-1.5 space-y-2"
            style={{ background: S.headerBg, borderBottom: `2px solid ${S.accent}` }}>

            {/* Search — top */}
            <div className="flex gap-2">
              <input value={searchQuery} onChange={e => handleSmartInputChange(e.target.value)}
                onPaste={handleSmartInputPaste}
                onKeyDown={e => { if (e.key === 'Enter') handleSmartInputSubmit() }}
                placeholder="Search or paste URL..." className="input-field flex-1 !py-1.5 !text-[10px]"/>
              <button onClick={handleSmartInputSubmit} disabled={searching} {...btn(false)}
                className={btn().className + ' disabled:opacity-30'}>
                {searching ? '...' : 'Search'}</button>
              {searchResults && <button onClick={() => { setSearchResults(null); setSearchQuery('') }} {...btn(false)}>×</button>}
            </div>

            {/* Divider */}
            <div style={{ borderTop: `1px solid ${S.divider}` }}/>

            {/* Builder */}
            {tray.length > 0 ? (
              <div className="flex rounded-lg overflow-hidden" style={{ border: `1.5px solid ${S.accent}` }}>
                {tray.map(c => (
                  <div key={c.hex}
                    onClick={() => {
                      const now = Date.now()
                      if (now - (c._lastTap || 0) < 350) { removeFromTray(c.hex); return }
                      c._lastTap = now
                      setSelected(c)
                    }}
                    onContextMenu={e => { e.preventDefault(); removeFromTray(c.hex); notify('Removed') }}
                    style={{ background: c.hex, outline: selected?.hex === c.hex ? '2px solid #fff' : 'none', outlineOffset: '-2px' }}
                    className="flex-1 h-9 cursor-pointer hover:opacity-80 transition-opacity"
                    title={`${c.hex} · double-tap to remove`}/>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-white/40 py-1">Tap colors in palettes below</div>
            )}

            <div className="flex gap-2 items-center pt-1">
              <button onClick={() => { if (tray.length) { setSchemes(generateSchemes((selected || tray[0]).hex)); setSchemeTab(0) } }}
                disabled={!tray.length} {...btn(false)} className={btn().className + ' disabled:opacity-30'}>Generate</button>
              <button onClick={() => { setSavingFrom('user'); setShowSaveDialog(true) }} disabled={!tray.length}
                {...btn(false)} className={btn().className + ' disabled:opacity-30'}>Save</button>
              <button onClick={clearTray} {...btn(false)}>Clear</button>
              <button onClick={copyTrayHexes} {...btn(false)}>Copy</button>
            </div>

            {schemes.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1 overflow-x-auto scrollbar-none">
                  {schemes.map((s, i) => (
                    <button key={s.name} onClick={() => setSchemeTab(i)} {...btnSm(schemeTab === i)}>
                      {s.name.replace(' Gradient','').replace(' Palette','')}</button>
                  ))}
                </div>
                <div className="flex h-6 rounded-lg overflow-hidden" style={{ border: `1.5px solid ${S.accent}` }}>
                  {schemes[schemeTab].colors.map((c, i) => (
                    <div key={c.hex+i} style={{ background: c.hex }} className="flex-1 cursor-pointer hover:opacity-80"
                      onClick={() => addToTray(c)} title={c.hex}/>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setSavingFrom('agent'); setShowSaveDialog(true) }} {...btn(false)}>Save generated</button>
                  <button onClick={() => copyPalette(schemes[schemeTab])} {...btn(false)}>Copy</button>
                  <button onClick={() => setSchemes([])} {...btn(false)}>Clear</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ ZONE 3: Scrollable ═══ */}
        <div className="flex-1 overflow-y-auto" style={{ background: S.libraryBg }}>
          <div className="p-4 space-y-4">

          {/* ══════════ BROWSE — Color library ══════════ */}
          {activeTab === 'browse' && (
            <div className="space-y-2">
              {/* Zoom slider — left=small(more cols), right=big(fewer cols) */}
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[8px] text-white/30">sm</span>
                <input type="range" min="3" max="16" value={17 - zoomCols}
                  onChange={e => setZoomCols(17 - parseInt(e.target.value))}
                  className="flex-1 h-1 cursor-pointer"
                  style={{ accentColor: S.accent }}/>
                <span className="text-[8px] text-white/30">lg</span>
              </div>

              <div className="w-full overflow-hidden rounded-lg" style={{ background: '#111' }}>
                <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${zoomCols}, 1fr)`, gap: '1px' }}>
                  {COLOR_FAMILIES.flatMap(fam => fam.colors).map((c, i) => (
                    <div key={c.hex + i} onClick={() => addToTray(c)}
                      onContextMenu={e => { e.preventDefault(); navigator.clipboard.writeText(c.hex).catch(() => {}); notify('Copied ' + c.hex) }}
                      style={{
                        background: c.hex,
                        outline: inTray(c.hex) ? `2px solid ${S.accent}` : 'none',
                        outlineOffset: '-2px',
                        zIndex: inTray(c.hex) ? 10 : 0,
                      }}
                      className="aspect-square cursor-pointer hover:opacity-80 transition-opacity"
                      title={`${c.name} ${c.hex} · hold to copy`}/>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════ PALETTES — source filters (sticky) + cards ══════════ */}
          {activeTab === 'palettes' && (
            <div className="space-y-0">
              {/* Source filters — sticky inside scroll */}
              <div className="sticky top-0 z-10 flex gap-2 items-center px-1 py-2"
                style={{ background: S.libraryBg, borderBottom: `1px solid ${S.divider}` }}>
                {[{ id: 'all', label: 'All' }, { id: 'colorhunt', label: 'ColorHunt' }, { id: 'custom', label: 'Custom' }, { id: 'generated', label: 'Generated' }].map(f => (
                  <button key={f.id} onClick={() => setPalFilter(f.id)}
                    {...btn(palFilter === f.id)}>
                    {f.label}</button>
                ))}
                <button onClick={() => setFiltersVisible(!filtersVisible)}
                  className="text-[9px] px-2 py-0.5 rounded-full text-white ml-auto"
                  style={{ border: `1.5px solid ${S.accent}`, background: 'transparent' }}>
                  {filtersVisible ? '▲' : '▼'}</button>
              </div>

              {/* Dropdown filters */}
              {filtersVisible && (
                <div className="space-y-1 px-1 py-1.5" style={{ borderBottom: `1px solid ${S.divider}` }}>
                  <div className="flex gap-1 overflow-x-auto scrollbar-none">
                    {SPECTRUM.map(s => (
                      <button key={s} onClick={() => setSpectrumFilter(spectrumFilter === s && s !== 'All' ? 'All' : s)}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] flex-shrink-0 text-white whitespace-nowrap"
                        style={{ border: spectrumFilter === s ? `1px solid ${S.accent}` : '1px solid transparent', background: 'transparent' }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: SPECTRUM_COLORS[s] }}/>{s}</button>
                    ))}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {COLLECTION_TAGS.map(tag => (
                      <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                        className="px-1.5 py-0.5 rounded-full text-[8px] text-white"
                        style={{ border: tagFilter === tag ? `1px solid ${S.accent}` : `1px solid ${S.divider}`, background: 'transparent' }}>
                        {tag}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Palette cards */}
              <div className="space-y-3 pt-3">
                {(searchResults || (palFilter !== 'all' ? filteredUserPalettes : displayPalettes)).length === 0 ? (
                  <div className="text-center py-8 text-xs text-white/50">No palettes match</div>
                ) : (
                  <div className="grid gap-3">
                    {(searchResults || (palFilter !== 'all' ? filteredUserPalettes : displayPalettes)).map((p, i) => (
                      <PaletteCard key={p.id || p.name + i} palette={p}
                        onLoad={loadPalette} onCopy={copyPalette} onShare={sharePalette}
                        onDelete={p.source !== 'curated' ? handleDeletePalette : undefined}
                        onChipTap={c => { addToTray(c); setSelected(c) }}
                      selectedHex={selected?.hex}/>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════ SCANNED ══════════ */}
          {activeTab === 'scanned' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button onClick={() => fileRef.current?.click()} className="btn-secondary flex-1 flex items-center justify-center gap-2 !py-2.5 !text-sm !text-white">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                    Upload photo</button>
                  <button onClick={() => cameraRef.current?.click()} className="btn-primary flex-1 flex items-center justify-center gap-2 !py-2.5 !text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                      <circle cx="12" cy="13" r="4"/></svg>
                    Open camera</button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleScanFile}/>
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanFile}/>
                </div>
                <div className="text-[10px] text-white/50 text-center">Get close · even light · 3-5 colors max</div>
              </div>

              {scanning && (
                <div className="flex items-center gap-3 py-4 justify-center">
                  <div className="w-5 h-5 rounded-full animate-spin" style={{ border: `2px solid ${S.divider}`, borderTopColor: S.accent }}/>
                  <span className="text-sm text-white">Extracting colors…</span>
                </div>
              )}

              {scanWarning && !scanning && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg border-2 border-amber-500/40 bg-amber-500/5 text-xs text-amber-200">
                  <span className="flex-1">{scanWarning}</span>
                  <button onClick={() => setScanWarning(null)} className="text-white/40">×</button>
                </div>
              )}

              {scanColors.length > 0 && !scanning && (
                <div className="rounded-xl overflow-hidden" style={{ border: `1.5px solid ${S.divider}` }}>
                  <div className="flex items-start gap-3 p-3">
                    {scanImage && <img src={scanImage} alt="" className="w-[120px] h-[120px] rounded-lg object-cover flex-shrink-0" style={{ border: `1.5px solid ${S.divider}` }}/>}
                    <div className="flex-1 space-y-2">
                      <div className="text-xs text-white">{scanColors.length} colors detected</div>
                      <div className="flex flex-wrap gap-1.5">
                        {scanColors.map((c, i) => (
                          <div key={c.hex+i} className="flex items-center gap-1 cursor-pointer" onClick={() => handleChipTap(c)}>
                            <div className="w-8 h-8 rounded" style={{ background: c.hex, border: `1.5px solid ${S.divider}` }}/>
                            <span className="text-[9px] font-mono text-white/60">{c.hex}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="px-3 py-2 flex gap-2 flex-wrap" style={{ borderTop: `1px solid ${S.divider}` }}>
                    <button onClick={() => { if (scanColors.length) { setScanSchemes(generateSchemes(scanColors[0].hex)); setScanSchemeTab(0) } }} className="btn-primary btn-sm">Generate theme</button>
                    <button onClick={() => saveScanAsPalette(scanColors)} className="btn-secondary btn-sm">Save to Palettes</button>
                    <button onClick={() => { setScanColors([]); setScanImage(null); setScanWarning(null); setScanSchemes([]) }} className="btn-secondary btn-sm ml-auto">Clear</button>
                  </div>
                  {scanSchemes.length > 0 && (
                    <div className="px-3 py-2 space-y-1.5" style={{ borderTop: `1px solid ${S.divider}` }}>
                      <div className="flex gap-1 overflow-x-auto scrollbar-none">
                        {scanSchemes.map((s, i) => (
                          <button key={s.name} onClick={() => setScanSchemeTab(i)}
                            className="text-[9px] px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap text-white transition-colors"
                            style={scanSchemeTab === i
                              ? { border: `1.5px solid ${S.accent}`, background: `color-mix(in srgb, ${S.accent} 12%, transparent)` }
                              : { border: `1px solid ${S.divider}` }}>
                            {s.name.replace(' Gradient','').replace(' Palette','')}</button>
                        ))}
                        <button onClick={() => setScanSchemes([])} className="text-[9px] ml-auto text-white/40">×</button>
                      </div>
                      <div className="flex h-8 rounded-lg overflow-hidden" style={{ border: `1.5px solid ${S.divider}` }}>
                        {scanSchemes[scanSchemeTab].colors.map((c, i) => (
                          <div key={c.hex+i} style={{ background: c.hex }} className="flex-1 cursor-pointer hover:opacity-80" onClick={() => handleChipTap(c)} title={c.hex}/>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => saveScanAsPalette(scanSchemes[scanSchemeTab].colors)} className="btn-primary btn-sm">Save theme</button>
                        <button onClick={() => copyPalette(scanSchemes[scanSchemeTab])} className="btn-secondary btn-sm">Copy</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-medium tracking-widest uppercase text-white/60">
                    Scan library · {scanHistory.length} scan{scanHistory.length !== 1 ? 's' : ''}</div>
                  {scanHistory.length > 0 && <button onClick={() => { db.clearScanHistory(); setScanHistory([]); notify('Cleared') }} className="btn-secondary btn-sm">Clear all</button>}
                </div>
                {scanHistory.length === 0 ? (
                  <div className="text-center py-6 text-xs text-white/50">No scans yet</div>
                ) : (
                  <div className="space-y-2">
                    {scanHistory.map(scan => (
                      <div key={scan.id} className="flex items-center gap-3 p-2 rounded-xl transition-colors cursor-pointer"
                        style={{ border: `1.5px solid ${S.divider}` }}
                        onClick={() => { setScanImage(scan.image); setScanColors(scan.colors || []); setScanWarning(null); setScanSchemes([]) }}>
                        {scan.image && <img src={scan.image} alt="" className="w-[60px] h-[60px] rounded-md object-cover flex-shrink-0" style={{ border: `1px solid ${S.divider}` }}/>}
                        <div className="flex gap-1 flex-shrink-0">
                          {(scan.colors || []).slice(0, 5).map((c, i) => (
                            <div key={c.hex+i} className="w-6 h-6 rounded" style={{ background: c.hex, border: `1px solid ${S.divider}` }}
                              onClick={e => { e.stopPropagation(); handleChipTap(c) }} title={c.hex}/>
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] text-white/60">{scan.date}</div>
                        </div>
                        <button onClick={e => { e.stopPropagation(); saveScanAsPalette(scan.colors || []) }} className="btn-secondary btn-sm">+ Save</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          </div>
        </div>
      </div>
    </div>
  )
}
