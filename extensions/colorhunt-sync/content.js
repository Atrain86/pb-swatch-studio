// ─── PaintBrain · ColorHunt Sync ─────────────────────────────
// Content script — runs on colorhunt.co pages
// Watches for favorite changes, syncs to PaintBrain API

;(function () {
  'use strict'

  let lastSyncedHash = ''

  // ── Post palette codes to PaintBrain ──
  async function postToPaintBrain(codes) {
    if (!codes.length) return

    // Dedupe against last sync to avoid spamming
    const hash = codes.sort().join(',')
    if (hash === lastSyncedHash) return
    lastSyncedHash = hash

    try {
      const res = await fetch(PAINTBRAIN_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': PAINTBRAIN_KEY,
        },
        body: JSON.stringify({ codes, source: 'colorhunt_extension' }),
      })

      if (res.ok) {
        const data = await res.json()
        // Save sync status to extension storage
        chrome.storage.local.set({
          lastSync: new Date().toISOString(),
          lastCount: codes.length,
          lastImported: data.imported || 0,
          totalSynced: data.total || codes.length,
        })
        console.log(`[PaintBrain] Synced ${data.imported} new, ${data.skipped} existing, ${data.total} total`)
      } else {
        console.warn(`[PaintBrain] Sync failed: ${res.status}`)
      }
    } catch (err) {
      console.warn('[PaintBrain] Sync error:', err.message)
    }
  }

  // ── Read current favorites from ColorHunt localStorage ──
  function getCurrentCodes() {
    const raw = localStorage.getItem('myCollection')
    if (!raw) return []
    return raw.split(',').filter(c => c && c.length >= 24)
  }

  // ── Initial sync on page load ──
  function initialSync() {
    const codes = getCurrentCodes()
    if (codes.length > 0) {
      console.log(`[PaintBrain] Found ${codes.length} ColorHunt favorites, syncing...`)
      postToPaintBrain(codes)
    } else {
      console.log('[PaintBrain] No ColorHunt favorites found')
    }
  }

  // ── Listen for localStorage changes from OTHER tabs ──
  window.addEventListener('storage', event => {
    if (event.key === 'myCollection') {
      const codes = (event.newValue || '').split(',').filter(c => c && c.length >= 24)
      postToPaintBrain(codes)
    }
  })

  // ── Intercept same-tab like/unlike actions ──
  // ColorHunt's like() function modifies localStorage directly.
  // The 'storage' event doesn't fire in the same tab, so we
  // intercept the function to catch real-time hearts.
  function interceptLikeFunction() {
    if (typeof window.like === 'function') {
      const _origLike = window.like
      window.like = function (code) {
        _origLike.call(this, code)
        // Small delay to let ColorHunt update localStorage
        setTimeout(() => {
          const codes = getCurrentCodes()
          postToPaintBrain(codes)
        }, 200)
      }
      console.log('[PaintBrain] Like function intercepted')
    }
  }

  // ── Also watch for DOM mutations (fallback) ──
  // If like() isn't available, poll for changes
  let pollInterval = null
  function startPolling() {
    let lastRaw = localStorage.getItem('myCollection') || ''
    pollInterval = setInterval(() => {
      const currentRaw = localStorage.getItem('myCollection') || ''
      if (currentRaw !== lastRaw) {
        lastRaw = currentRaw
        const codes = currentRaw.split(',').filter(c => c && c.length >= 24)
        postToPaintBrain(codes)
      }
    }, 2000) // Check every 2 seconds
  }

  // ── Boot ──
  // Wait a moment for ColorHunt's JS to initialize
  setTimeout(() => {
    initialSync()
    interceptLikeFunction()
    startPolling()
  }, 1500)
})()
