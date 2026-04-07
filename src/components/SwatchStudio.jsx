// ============================================================
// PaintBrain — ColorShare Studio v3
// Tabs: Discover · Browse · Palettes · Scanned
// Stage 1: Shell + Discover tab
// ============================================================

import { useState, useRef, useEffect } from 'react'
import logo from '../assets/PB_LOGO_GRAPHFIX_1.png'

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

function buildDiscColors(hue, shade, cols, mode) {
  const n = Math.max(50, cols * 9)
  if (mode === 'all') {
    const colors = []
    for (let i = 0; i < n; i++) {
      const ha = (hue + (i / n) * 360) % 360
      const sat = 55 + sr(i * 5) * 30
      const row = Math.floor(i / cols)
      const totalRows = Math.ceil(n / cols)
      const L = Math.max(15, Math.min(88, shade - 20 + (row / totalRows) * 40))
      const rad = ha * Math.PI / 180
      colors.push({ hex: l2h(L, sat * Math.cos(rad), sat * Math.sin(rad)), hue: ha, L })
    }
    colors.sort((a, b) => { const hd = a.hue - b.hue; if (Math.abs(hd) > 8) return hd; return a.L - b.L })
    return colors.map(c => c.hex)
  } else {
    const spread = 30, colors = []
    for (let i = 0; i < n; i++) {
      const ha = hue + (sr(i * 7) - 0.5) * spread * 2
      const row = Math.floor(i / cols)
      const totalRows = Math.ceil(n / cols)
      const L = Math.max(15, Math.min(88, shade + 18 - (row / Math.max(totalRows, 1)) * 36))
      const sat = i % 2 === 0 ? 55 + sr(i * 5) * 30 : 25 + sr(i * 5) * 25
      const rad = ha * Math.PI / 180
      colors.push({ hex: l2h(L, sat * Math.cos(rad), sat * Math.sin(rad)), L, sat })
    }
    colors.sort((a, b) => b.L - a.L)
    return colors.map(c => c.hex)
  }
}

// ─── Theme presets ───────────────────────────────────────────
const THEMES = [{ a: '#8CABFF' }, { a: '#6EC98A' }, { a: '#F78D60' }, { a: '#C060C0' }, { a: '#FFCC44' }]
const LAB_COMBOS = [
  { c1: '#8CABFF', c2: '#6EC98A', c3: '#F07848', c4: '#C060C0', c5: 'rgba(255,255,255,.35)' },
  { c1: '#6EC98A', c2: '#FFCC44', c3: '#8CABFF', c4: '#F07848', c5: 'rgba(255,255,255,.35)' },
  { c1: '#F07848', c2: '#FFCC44', c3: '#6EC98A', c4: '#8CABFF', c5: 'rgba(255,255,255,.35)' },
  { c1: '#C060C0', c2: '#8CABFF', c3: '#FFCC44', c4: '#6EC98A', c5: 'rgba(255,255,255,.35)' },
  { c1: '#FFCC44', c2: '#F07848', c3: '#C060C0', c4: '#6EC98A', c5: 'rgba(255,255,255,.35)' },
]

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

  // ── Tabs ──
  const [activeTab, setActiveTab] = useState('discover')

  // ── Toast ──
  const [toast, setToast] = useState('')
  function notify(msg) { setToast(msg); setTimeout(() => setToast(''), 1700) }
  function copyHex(text) { try { navigator.clipboard.writeText(text) } catch {} notify('Copied!') }

  // ══════════════════════════════════════════════════════════
  // DISCOVER STATE
  // ══════════════════════════════════════════════════════════
  const [dMode, setDModeRaw] = useState('all')
  const [dHue, setDHue] = useState(200)
  const [dShade, setDShade] = useState(50)
  const [dZoom, setDZoom] = useState(5)
  const [dPicks, setDPicks] = useState([])
  const [dColors, setDColors] = useState(() => buildDiscColors(200, 50, 5, 'all'))

  function rebuildGrid(hue, shade, zoom, mode) {
    setDColors(buildDiscColors(hue, shade, zoom, mode))
  }

  function setDMode(m) {
    setDModeRaw(m)
    rebuildGrid(dHue, dShade, dZoom, m)
  }

  function onHueChange(v) {
    setDHue(v)
    rebuildGrid(v, dShade, dZoom, dMode)
  }

  function onShadeChange(v) {
    setDShade(v)
    rebuildGrid(dHue, v, dZoom, dMode)
  }

  function onZoomChange(v) {
    setDZoom(v)
    rebuildGrid(dHue, dShade, v, dMode)
  }

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
    rebuildGrid(dHue, dShade, dZoom, dMode)
    setActiveTab('browse')
  }

  // ══════════════════════════════════════════════════════════
  // BROWSE STATE — two-stage: queue → push ↑ → palette editor
  // ══════════════════════════════════════════════════════════
  const [queue, setQueue] = useState([])
  const [palettes, setPalettes] = useState([]) // array of arrays
  const [viewState, setViewState] = useState(0) // 0,1,2... or 'split'
  const [genRound, setGenRound] = useState(0)
  const [genScheme, setGenScheme] = useState([])
  const [genVisible, setGenVisible] = useState(false)
  const [fidelity, setFidelity] = useState(40)
  const pushRef = useRef(null)

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

  const hueCircleColor = hslHex(dHue, 72, 52)
  const shadeCircleColor = hslHex(dHue, 70, dShade / 100 * 70 + 15)
  const shadeTrackBg = `linear-gradient(to right, ${hslHex(dHue, 70, 15)}, ${hslHex(dHue, 75, 50)}, ${hslHex(dHue, 60, 82)})`

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div className="app-shell">
      {toast && <div className="toast-msg">{toast}</div>}

      {/* ── Header ── */}
      <div className="hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <img src={logo} alt="PaintBrain" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }}
            onError={e => { e.target.style.display = 'none' }} />
          <div>
            <div className="brand-name">PaintBrain</div>
            <div className="brand-sub">ColorShare Studio</div>
          </div>
        </div>
        <div className="tdots">
          {THEMES.map((t, i) => (
            <div key={i} className={`tdot${themeIdx === i ? ' on' : ''}`}
              style={{ background: t.a }} onClick={() => setThemeIdx(i)} />
          ))}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="tabs">
        {['discover', 'browse', 'palettes', 'scanned'].map(id => (
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
            <div style={{ display: 'flex' }}>
              <button className={`mtab${dMode === 'all' ? ' on-all' : ''}`} onClick={() => setDMode('all')}>All</button>
              <button className={`mtab${dMode === 'custom' ? ' on-cust' : ''}`} onClick={() => setDMode('custom')}>Custom</button>
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

          <div className="sliders-blk">
            <div className="slr-row">
              <span className="slr-lbl">Hue</span>
              <div className="slrw">
                <div className="slrt" style={{ background: 'linear-gradient(to right,hsl(0,85%,52%),hsl(45,90%,52%),hsl(90,80%,40%),hsl(150,78%,42%),hsl(200,85%,50%),hsl(260,80%,58%),hsl(300,78%,50%),hsl(340,85%,50%),hsl(360,85%,52%))' }} />
                <div className="slrk" style={{ left: `${(dHue / 360) * 100}%`, background: hueCircleColor }} />
                <input type="range" min="0" max="360" value={dHue} step="1"
                  onChange={e => onHueChange(+e.target.value)} />
              </div>
              <div className="circ" style={{ background: hueCircleColor }} />
            </div>
            <div className="slr-row">
              <span className="slr-lbl">Shade</span>
              <div className="slrw">
                <div className="slrt" style={{ background: shadeTrackBg }} />
                <div className="slrk" style={{ left: `${((dShade - 15) / 70) * 100}%`, background: shadeCircleColor }} />
                <input type="range" min="15" max="85" value={dShade} step="1"
                  onChange={e => onShadeChange(+e.target.value)} />
              </div>
              <div className="circ" style={{ background: shadeCircleColor }} />
            </div>
          </div>
        </div>

        {/* Picks grid — same size as library chips, 5 wide */}
        <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--div)' }}>
          {dPicks.length === 0 ? (
            <div style={{ padding: '6px 4px', fontSize: 10, color: 'var(--t2)' }}>Tap to pick · tap again to remove</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="cgrid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', flex: 1 }}>
                {dPicks.map(hex => (
                  <div key={hex} className="chip" style={{ background: hex }}
                    onClick={() => togglePick(hex)}>
                    <div className="chex">{hex}</div>
                  </div>
                ))}
              </div>
              <button className="stp-icon" onClick={sendPicksToQueue} title="Send to Browse"
                style={{ whiteSpace: 'nowrap', width: 'auto', padding: '0 10px', fontSize: 12, fontWeight: 600, gap: 4 }}>
                → Browse
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 3, background: 'var(--div2)', flexShrink: 0 }} />

        <div className="grid-wrap">
          <div className="cgrid" style={{ gridTemplateColumns: `repeat(${dZoom}, 1fr)` }}>
            {dColors.map((hex, i) => (
              <div key={hex + i}
                className={`chip${dPicks.includes(hex) ? ' sel' : ''}`}
                style={{ background: hex }}
                onClick={() => togglePick(hex)}>
                <div className="chex">{hex}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════ BROWSE ═══════════ */}
      <div className={`panel${activeTab === 'browse' ? ' on' : ''}`}>
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
            <button className="ib" onClick={() => notify('Share — coming soon')} title="Share">
              <span className="ib-icon" style={{ color: 'var(--ic4)' }}>↗</span>
              <span className="ib-lbl" style={{ color: 'var(--ic4)' }}>Share</span>
            </button>
            <div className="ib-div" />
            <button className="ib" onClick={clearAll} title="Clear">
              <span className="ib-icon" style={{ color: 'var(--ic5)' }}>✕</span>
              <span className="ib-lbl" style={{ color: 'var(--ic5)' }}>Clear</span>
            </button>
          </div>

          {/* Row 2: Palette editor strip */}
          <div className="pal-editor-zone">
            <div className="mstrip" onClick={onStripTap}>
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

      {/* ═══════════ PALETTES (Stage 3) ═══════════ */}
      <div className={`panel${activeTab === 'palettes' ? ' on' : ''}`}>
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--t2)', fontSize: 11 }}>
          Palettes tab — coming in Stage 3
        </div>
      </div>

      {/* ═══════════ SCANNED (Stage 4) ═══════════ */}
      <div className={`panel${activeTab === 'scanned' ? ' on' : ''}`}>
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--t2)', fontSize: 11 }}>
          Scanned tab — coming in Stage 4
        </div>
      </div>
    </div>
  )
}
