# ColorShare — Claude Code Build Prompt V4
## Session: Discovery LAB Engine + Tab Rename + Scan Post-Processing

---

## CONTEXT

ColorShare is a React/Vite/TypeScript PWA under the MyPoorBrain (MPB) brand. It is a color palette tool for content creators, web designers, and social media managers. The core value proposition is: **discover beautiful colors, build palettes, share them instantly.**

The app has four tabs. We are renaming one tab and doing significant work on three of them this session.

---

## TAB NAMES (apply globally)

| Old Name | New Name |
|----------|----------|
| Discover | Discover (unchanged) |
| Browse   | **Create** |
| Palettes | Palettes (unchanged) |
| Scanned  | Scan (unchanged) |

Update all references: tab labels, route names, component names, aria labels, any comments.

---

## PRIORITY 1 — LAB COLOR ENGINE OVERHAUL (Discover Tab)

This is the most important change in this prompt. The current generator produces a limited, dull range of colors. The goal is Khroma-quality output: rich, varied, perceptually beautiful colors that feel handpicked even though they are generated.

### The Problem
The current LAB generation is likely sampling too conservatively — probably staying in a narrow L* and C* range, producing muddy or washed-out results. It also fails to sort by lightness before rendering, causing visible checkerboarding in the grid.

### The Fix — LAB Generation Rules

Replace the existing color generation function with one that follows these rules:

```typescript
// Target LAB ranges for beautiful, natural colors:
// L* (lightness): 25–85  — avoid near-black and blown-out white
// a* (green-red axis): -50 to +50
// b* (blue-yellow axis): -50 to +50
// Chroma (sqrt(a²+b²)): minimum 15 — reject near-grey colors
// Maximum chroma: 70 — avoid garish oversaturated colors

function generateBeautifulLABColor(): LABColor {
  let attempts = 0;
  while (attempts < 20) {
    const L = randomFloat(25, 85);
    const a = randomFloat(-50, 50);
    const b = randomFloat(-50, 50);
    const chroma = Math.sqrt(a * a + b * b);
    
    if (chroma >= 15 && chroma <= 70) {
      // Convert to RGB and verify it's in gamut
      const rgb = labToRGB(L, a, b);
      if (isInGamut(rgb)) {
        return { L, a, b };
      }
    }
    attempts++;
  }
  // Fallback: guaranteed in-gamut teal family
  return { L: 55, a: -20, b: -15 };
}
```

### Sorting — Dark to Light

When rendering a batch of colors in the grid, sort by L* ascending before display:

```typescript
const sortedColors = [...colorBatch].sort((a, b) => a.L - b.L);
```

This eliminates the checkerboard effect. Apply this sort per batch, not globally across all loaded colors (that would break the endless scroll feel).

### Endless Scroll — Batch Generation

- Generate **40 colors** on initial load
- When user scrolls within **200px of the bottom**, generate the next batch of 40
- Each batch is sorted by L* independently before appending
- Show a subtle loading indicator (small spinner or fade-in) between batches
- No maximum — this is genuinely endless

### Two Discovery Modes

Add a toggle in the Discover tab header: **Random** | **Uniform**

**Random mode** (default):
- Pure LAB space exploration using the generator above
- No predictable pattern — genuinely serendipitous
- This is the Khroma-feel mode

**Uniform mode**:
- Systematically covers the LAB color space
- Divide hue angle into even steps (e.g., 36 steps × 10° each)
- For each hue, generate colors at consistent L* intervals: 30, 45, 60, 75
- Result: a structured library the user can navigate
- Still sorted dark-to-light within each hue family

### Zoom Slider

The existing zoom slider stays. Behavior:
- **Zoomed out**: small swatches, many per row (tight grid, good for overview)
- **Zoomed in**: 1–2 large swatches per row
- When a swatch is large enough (zoom level ≥ threshold), show the **hex code** directly on the swatch

---

## PRIORITY 2 — SWIPE NAVIGATION

The tab bar stays visible at all times. Swiping left/right on the main content area is an **alternative** to tapping tabs — it produces exactly the same result.

Implementation:
- Use `framer-motion` drag gesture or a touch event handler (`touchstart` / `touchend`)
- Swipe left → advance to next tab
- Swipe right → go to previous tab
- The active tab underline indicator animates to the new tab (same as tap behavior)
- Minimum swipe distance: 50px to register (prevent accidental triggers)
- No animation required on the content itself — just switch the active tab state

If `framer-motion` is already in the project, use it. If not, use native touch events to keep bundle size down.

---

## PRIORITY 3 — SCAN TAB: POST-PROCESSING CENTER

### Current flow (broken / incomplete):
Photo captured → directly processed for color extraction

### New flow:
Photo captured → **Post-Processing Center** → Color extraction → Palette generated

### Post-Processing Center UI

After the user captures or uploads a photo, instead of immediately extracting colors, show a full-screen post-processing view with:

**The image preview** — takes up ~60% of the screen height, showing the current processed state

**Adjustment sliders** (stacked below the image):

1. **Blur** (0–20) — applies Gaussian blur to the canvas before color extraction. Higher blur = smoother color averaging, better for scenes with texture/noise. Use canvas `filter: blur(Xpx)` or a manual convolution if CSS filter isn't available on the canvas context.

2. **Warmth** (−50 to +50) — shifts the image toward cool (negative) or warm (positive) before extraction. Implement as a per-pixel hue rotation in the red/yellow range.

3. **Brightness** (−50 to +50) — lightens or darkens the image before extraction.

4. **Saturation** (0–200%) — boosts or reduces color saturation before extraction.

**Two buttons at the bottom:**
- **Re-shoot** — returns to camera
- **Generate Palette** — runs extraction on the current processed canvas state

### Why this matters
The user holds their phone near a physical object (a wall, fabric, a sunset) and shoots. The post-processing center lets them:
- Blur away texture noise to get cleaner average colors
- Warm/cool the image to match what they're seeing with their eye
- Then extract. The result is far more controllable than raw extraction.

---

## PRIORITY 4 — COLOR HUNT SYNC (Palettes Tab — Diagnosis)

The Palettes tab is supposed to sync with the user's Color Hunt favorites. This is currently not working.

**Do not rebuild this yet.** First:

1. Find the Color Hunt sync code and add `console.log` statements at each step:
   - When the fetch is initiated
   - What URL is being called
   - What the response status is
   - What data (if any) comes back

2. Run the app, attempt a sync, and report back what the console shows.

3. Do not change any logic — just instrument it so we can diagnose.

**Color credit system** (implement once sync is working):
- Palettes from Color Hunt → display "via Color Hunt" credit with their logo/link
- Palettes created by the user in the Create tab → credited to their username (default: **A-Train**)
- Future: other scrape sources get their own credit attribution

---

## KNOWN BUGS — Fix these if encountered, do not introduce new ones

These were documented in V3 of the prompt and may or may not have been fixed:

1. Camera permissions not persisting on iOS Safari
2. LAB → RGB conversion producing out-of-gamut values without clamping (this should be fixed by the new generator's `isInGamut` check)
3. Palette state not persisting across tab switches
4. Theme rotation sometimes producing illegible text on light swatches

---

## DO NOT BUILD YET

These are confirmed future features — do not implement:

- Live camera Gaussian blur (real-time filter on camera feed)
- Social sharing with username
- Pro tier / paywall
- Accounts / login system
- Embeddable widget for PaintBrain

---

## DESIGN PRINCIPLES (remind yourself before touching any UI)

- **Mobile first.** Every control should be usable one-handed.
- **Less chrome, more color.** The colors are the UI. Controls should fade into the background.
- **Share is the primary action.** It should always be one tap away.
- **LAB is the engine.** Never fall back to RGB or HSL for generation — only for display.

---

## SUGGESTED BUILD ORDER

1. LAB engine overhaul + dark-to-light sort (this unlocks everything — do this first)
2. Random / Uniform toggle in Discover
3. Tab rename (Browse → Create)
4. Swipe navigation
5. Scan post-processing center
6. Color Hunt sync diagnosis

Do #1 first and show Alan the results before moving to #2. The visual quality of the discovery grid is the north star for this entire session.

---

*ColorShare is a MyPoorBrain (MPB) product. Build prompt V4 — April 2026.*
