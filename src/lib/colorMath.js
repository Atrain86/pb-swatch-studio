// ─── colorMath.js ────────────────────────────────────────────
// Perceptually accurate color math using CIE LAB color space
// Replaces HSL-based scheme generation in PaintBrain Swatch Studio

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255
  ]
}

function rgbToLab(hex) {
  let [r, g, b] = hexToRgb(hex)
  // Step 1: linearize RGB (remove gamma encoding)
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92
  // Step 2: convert to XYZ using D65 illuminant
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
  const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883
  // Step 3: convert XYZ to LAB
  const f = v => v > 0.008856 ? Math.cbrt(v) : (7.787 * v) + (16 / 116)
  return [
    (116 * f(y)) - 16,   // L: lightness 0-100
    500 * (f(x) - f(y)), // A: green-red axis
    200 * (f(y) - f(z))  // B: blue-yellow axis
  ]
}

function labToHex(L, A, B) {
  // Clamp L to valid range
  L = Math.max(5, Math.min(95, L))
  const fy = (L + 16) / 116
  const fx = A / 500 + fy
  const fz = fy - B / 200
  const x = 0.95047 * (fx > 0.2069 ? Math.pow(fx, 3) : (fx - 16 / 116) / 7.787)
  const y = 1.00000 * (fy > 0.2069 ? Math.pow(fy, 3) : (fy - 16 / 116) / 7.787)
  const z = 1.08883 * (fz > 0.2069 ? Math.pow(fz, 3) : (fz - 16 / 116) / 7.787)
  // XYZ to linear RGB
  let r = x *  3.2406 + y * -1.5372 + z * -0.4986
  let g = x * -0.9689 + y *  1.8758 + z *  0.0415
  let b = x *  0.0557 + y * -0.2040 + z *  1.0570
  // Apply gamma and clamp to 0-255
  const toHex = v => {
    const gamma = v > 0.0031308
      ? 1.055 * Math.pow(v, 1 / 2.4) - 0.055
      : 12.92 * v
    return Math.round(Math.max(0, Math.min(1, gamma)) * 255)
      .toString(16).padStart(2, '0')
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

// Perceptual color distance between two hex values
// < 3 = very similar, > 10 = clearly different
export function deltaE(hex1, hex2) {
  const [L1, A1, B1] = rgbToLab(hex1)
  const [L2, A2, B2] = rgbToLab(hex2)
  return Math.sqrt(
    Math.pow(L2 - L1, 2) +
    Math.pow(A2 - A1, 2) +
    Math.pow(B2 - B1, 2)
  )
}

// ─── LAB-based scheme generation ─────────────────────────────
// Raw LAB math — returns plain hex arrays in an object.

function generateSchemesRaw(seedHex) {
  const [L, A, B] = rgbToLab(seedHex)

  // Generic Gradient — walks lightness dark→light while gently
  // desaturating — like a professional tonal range
  const genericGradient = Array.from({ length: 6 }, (_, i) => {
    const t = i / 5
    const newL = Math.max(15, Math.min(88, L - 30 + t * 60))
    const fade = 1 - t * 0.25
    return labToHex(newL, A * fade, B * fade)
  })

  // Matching Gradient — travels from seed toward its true LAB
  // complement (-A, -B) — perceptually balanced hue journey
  const matchingGradient = Array.from({ length: 6 }, (_, i) => {
    const t = i / 5
    return labToHex(L, A * (1 - 2 * t), B * (1 - 2 * t))
  })

  // Spot Palette — seed + two progressively lighter tints of
  // same hue + one true perceptual complement as accent
  const spotPalette = [
    seedHex.toUpperCase(),
    labToHex(Math.min(88, L + 18), A * 0.65, B * 0.65),
    labToHex(Math.min(93, L + 35), A * 0.30, B * 0.30),
    labToHex(L, A * -0.85, B * -0.85)
  ]

  // Twisted Spot — seed + split pair (rotate A and B independently)
  // + near-neutral anchor — more surprising combinations
  const twistedSpot = [
    seedHex.toUpperCase(),
    labToHex(Math.min(85, L + 8), A * -0.65, B * 1.10),
    labToHex(Math.max(20, L - 8), A * 1.10, B * -0.65),
    labToHex(L, A * 0.12, B * 0.12)
  ]

  return { genericGradient, matchingGradient, spotPalette, twistedSpot }
}

// Wrapped version — returns the array-of-palette-objects shape
// expected by SwatchStudio UI (tab labels, .colors[].hex, etc.)
export function generateSchemesLAB(seedHex) {
  const raw = generateSchemesRaw(seedHex)

  return [
    {
      name: 'Generic Gradient',
      source: 'ColorSpace',
      categoryTags: ['gradient'],
      colors: raw.genericGradient.map((hex, i) => ({ hex, name: `Step ${i + 1}` })),
    },
    {
      name: 'Matching Gradient',
      source: 'ColorSpace',
      categoryTags: ['gradient', 'complementary'],
      colors: raw.matchingGradient.map((hex, i) => ({ hex, name: `Step ${i + 1}` })),
    },
    {
      name: 'Spot Palette',
      source: 'ColorSpace',
      categoryTags: ['spot'],
      colors: raw.spotPalette.map((hex, i) =>
        ({ hex, name: ['Seed', 'Light tint', 'Pale tint', 'Complement'][i] })),
    },
    {
      name: 'Twisted Spot',
      source: 'ColorSpace',
      categoryTags: ['split-complementary'],
      colors: raw.twistedSpot.map((hex, i) =>
        ({ hex, name: ['Seed', 'Split A', 'Split B', 'Neutral'][i] })),
    },
  ]
}

// ─── Near-duplicate palette detection ────────────────────────
// Compare two palettes by average Delta-E across paired colors.
// Palettes must have the same number of colors. Returns average
// perceptual distance. Threshold < 8 = near-identical.

export function paletteDistance(colorsA, colorsB) {
  const hexA = colorsA.map(c => (c.hex || c).toUpperCase()).sort()
  const hexB = colorsB.map(c => (c.hex || c).toUpperCase()).sort()
  if (hexA.length !== hexB.length) return Infinity
  let total = 0
  for (let i = 0; i < hexA.length; i++) {
    total += deltaE(hexA[i], hexB[i])
  }
  return total / hexA.length
}

// Run near-duplicate cleanup on a list of palettes.
// Keeps the palette with more likes when two are within threshold.
// Returns array of palette IDs to remove.
export function findNearDuplicates(palettes, threshold = 8) {
  const toRemove = new Set()
  for (let i = 0; i < palettes.length; i++) {
    if (toRemove.has(palettes[i].id)) continue
    for (let j = i + 1; j < palettes.length; j++) {
      if (toRemove.has(palettes[j].id)) continue
      const dist = paletteDistance(palettes[i].colors, palettes[j].colors)
      if (dist < threshold) {
        const removable = (palettes[j].likes || 0) > (palettes[i].likes || 0) ? palettes[i] : palettes[j]
        toRemove.add(removable.id)
      }
    }
  }
  return [...toRemove]
}
