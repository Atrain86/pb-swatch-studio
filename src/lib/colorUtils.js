// ─── Color math utilities ────────────────────────────────────

export function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

export function hexToRgbString(hex) {
  const { r, g, b } = hexToRgb(hex)
  return `${r}, ${g}, ${b}`
}

export function hexToHsl(hex) {
  const { r: r255, g: g255, b: b255 } = hexToRgb(hex)
  const r = r255 / 255, g = g255 / 255, b = b255 / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = ((g - b) / d + 6) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return { h: Math.round(h * 60), s: Math.round(s * 100), l: Math.round(l * 100) }
}

export function hexToHueAngle(hex) {
  return hexToHsl(hex).h
}

export function hexToLightness(hex) {
  return hexToHsl(hex).l
}

export function hexToHueFamily(hex) {
  const { h, s, l } = hexToHsl(hex)
  // Neutrals: very low saturation or very dark/light
  if (s < 10 || l < 8 || l > 95) return 'neutral'
  if (h >= 330 || h < 15) return 'red'
  if (h >= 15 && h < 45) return 'orange'
  if (h >= 45 && h < 70) return 'yellow'
  if (h >= 70 && h < 160) return 'green'
  if (h >= 160 && h < 200) return 'teal'
  if (h >= 200 && h < 260) return 'blue'
  if (h >= 260 && h < 300) return 'violet'
  if (h >= 300 && h < 330) return 'pink'
  return 'neutral'
}

// ─── HSL → RGB → Hex conversion ─────────────────────────────

export function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(100, s)) / 100
  l = Math.max(0, Math.min(100, l)) / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60)       { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else              { r = c; b = x }
  const toHex = v => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

// ─── Color scheme generation (pure client-side HSL math) ─────

export function generateSchemes(hex) {
  const { h, s, l } = hexToHsl(hex)

  // 1. Generic Gradient — 6 steps, hue shifts +15°/step, saturation decreases slightly
  const genericGradient = {
    name: 'Generic Gradient',
    source: 'ColorSpace',
    categoryTags: ['gradient'],
    colors: Array.from({ length: 6 }, (_, i) => {
      const newH = h + i * 15
      const newS = Math.max(10, s - i * 4)
      const newL = Math.min(90, Math.max(10, l + (i - 2) * 6))
      const hex = hslToHex(newH, newS, newL)
      return { hex, name: `Step ${i + 1}` }
    }),
  }

  // 2. Matching Gradient — 6 steps from seed to complementary (h+180)
  const matchingGradient = {
    name: 'Matching Gradient',
    source: 'ColorSpace',
    categoryTags: ['gradient', 'complementary'],
    colors: Array.from({ length: 6 }, (_, i) => {
      const t = i / 5
      const newH = h + t * 180
      const newS = s + (t < 0.5 ? -t * 10 : (t - 0.5) * 10)
      const newL = l + Math.sin(t * Math.PI) * 12
      const hex = hslToHex(newH, Math.max(15, newS), Math.max(15, Math.min(85, newL)))
      return { hex, name: `Step ${i + 1}` }
    }),
  }

  // 3. Spot Palette — seed + 30% lighter + 60% lighter + complementary accent
  const spotPalette = {
    name: 'Spot Palette',
    source: 'ColorSpace',
    categoryTags: ['spot'],
    colors: [
      { hex, name: 'Seed' },
      { hex: hslToHex(h, Math.max(15, s - 10), Math.min(90, l + 20)), name: 'Light tint' },
      { hex: hslToHex(h, Math.max(10, s - 20), Math.min(95, l + 40)), name: 'Pale tint' },
      { hex: hslToHex(h + 150, Math.min(100, s + 15), Math.max(25, Math.min(60, l))), name: 'Accent' },
    ],
  }

  // 4. Twisted Spot — seed + split-complementary pair + desaturated neutral
  const twistedSpot = {
    name: 'Twisted Spot',
    source: 'ColorSpace',
    categoryTags: ['split-complementary'],
    colors: [
      { hex, name: 'Seed' },
      { hex: hslToHex(h + 120, Math.min(90, s), Math.max(25, Math.min(70, l))), name: 'Triad A' },
      { hex: hslToHex(h + 240, Math.min(90, s), Math.max(25, Math.min(70, l))), name: 'Triad B' },
      { hex: hslToHex(h, Math.max(5, s * 0.2), Math.min(80, l + 15)), name: 'Neutral' },
    ],
  }

  return [genericGradient, matchingGradient, spotPalette, twistedSpot]
}

// Dedupe hash: sort hex values alphabetically, join with dashes
export function computeDedupeHash(hexArray) {
  return [...hexArray].map(h => h.toUpperCase()).sort().join('-')
}

// CSS comment copy format
export function formatCopy(name, colors) {
  return `/* ${name} */\n${colors.map(c => c.hex || c).join(', ')}`
}

// Parse ColorHunt or Coolors URL
export function parsePaletteURL(input) {
  const s = input.trim()
  // ColorHunt: colorhunt.co/palette/264653e76f512a9d8f
  const ch = s.match(/palette\/([a-f0-9]{24,32})/i)
  if (ch) {
    const raw = ch[1]
    const colors = []
    for (let i = 0; i < raw.length; i += 6) {
      if (i + 6 <= raw.length) {
        colors.push({ hex: '#' + raw.slice(i, i + 6).toUpperCase(), name: 'ColorHunt' })
      }
    }
    return { colors, source: 'colorhunt', slug: raw }
  }
  // Coolors: coolors.co/264653-e76f51-2a9d8f
  const co = s.match(/coolors\.co\/([a-f0-9-]+)/i)
  if (co) {
    const colors = co[1].split('-').filter(h => h.length === 6)
      .map(h => ({ hex: '#' + h.toUpperCase(), name: 'Coolors' }))
    return { colors, source: 'coolors', slug: co[1] }
  }
  return null
}

// Determine dominant hue family of a palette (most common hue among its colors)
export function palettePrimaryHue(colors) {
  const counts = {}
  colors.forEach(c => {
    const hue = hexToHueFamily(c.hex || c)
    counts[hue] = (counts[hue] || 0) + 1
  })
  let best = 'neutral', max = 0
  for (const [hue, count] of Object.entries(counts)) {
    if (count > max) { max = count; best = hue }
  }
  return best
}
