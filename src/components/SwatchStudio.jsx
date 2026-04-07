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
    notify(`${dPicks.length} colors sent to queue!`)
    setDPicks([])
    rebuildGrid(dHue, dShade, dZoom, dMode)
    setActiveTab('browse')
  }

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

        <div className="picks-bar">
          {dPicks.length === 0 ? (
            <span className="ph">Tap to pick · tap again to remove</span>
          ) : (
            dPicks.map(hex => (
              <div key={hex} className="pc" style={{ background: hex }} title={hex}
                onClick={() => togglePick(hex)} />
            ))
          )}
          {dPicks.length > 0 && (
            <button className="stp-icon" onClick={sendPicksToQueue} title="Send to queue">↓</button>
          )}
        </div>

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

      {/* ═══════════ BROWSE (Stage 2) ═══════════ */}
      <div className={`panel${activeTab === 'browse' ? ' on' : ''}`}>
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--t2)', fontSize: 11 }}>
          Browse tab — coming in Stage 2
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
