/**
 * Shared Barkoder SDK configuration for web (WASM).
 *
 * Minimal config matching the proven-working Auto Sync implementation.
 * An earlier version of this file applied ~18 speculative "optimizations"
 * (ROI, length ranges, DPM mode, extra decoders, setFormatting, etc.) and
 * those broke scanning. Keep this minimal — if Auto Sync doesn't do it,
 * don't do it here either.
 */

export function getBarkoderLicenseKey(): string {
  return import.meta.env.VITE_BARKODER_KEY || ''
}

/** Deduplication delay in ms to prevent duplicate VIN captures */
export const DUPLICATES_DELAY_MS = 1500

// ── On-screen debug log capture ──
// We can't easily open DevTools on mobile. Every `[scanner]`/`[barkoder]`
// log line is mirrored into this in-memory ring buffer, and the scanner
// component renders it as a visible overlay. Screenshot-friendly debugging.
type DebugLine = { ts: number; level: 'log' | 'warn' | 'error'; text: string }
const _debugLines: DebugLine[] = []
const _debugListeners = new Set<() => void>()
const MAX_DEBUG_LINES = 40

function pushDebugLine(level: DebugLine['level'], args: unknown[]) {
  try {
    const text = args
      .map((a) => {
        if (a instanceof Error) return a.message
        if (typeof a === 'string') return a
        try { return JSON.stringify(a) } catch { return String(a) }
      })
      .join(' ')
    _debugLines.push({ ts: Date.now(), level, text })
    if (_debugLines.length > MAX_DEBUG_LINES) _debugLines.shift()
    _debugListeners.forEach((fn) => { try { fn() } catch { /* ignore */ } })
  } catch { /* never let logging crash the app */ }
}

let _consoleInstalled = false
export function installScannerConsoleCapture() {
  if (_consoleInstalled || typeof window === 'undefined') return
  _consoleInstalled = true
  const origLog = console.log.bind(console)
  const origWarn = console.warn.bind(console)
  const origError = console.error.bind(console)
  const relevant = (args: unknown[]) => {
    const first = args[0]
    return typeof first === 'string' && (first.startsWith('[scanner]') || first.startsWith('[barkoder]'))
  }
  console.log = (...args: unknown[]) => {
    if (relevant(args)) pushDebugLine('log', args)
    origLog(...args)
  }
  console.warn = (...args: unknown[]) => {
    if (relevant(args)) pushDebugLine('warn', args)
    origWarn(...args)
  }
  console.error = (...args: unknown[]) => {
    if (relevant(args)) pushDebugLine('error', args)
    origError(...args)
  }
}

export function getDebugLines(): DebugLine[] {
  return _debugLines
}

export function subscribeDebugLines(fn: () => void): () => void {
  _debugListeners.add(fn)
  return () => { _debugListeners.delete(fn) }
}

export function clearDebugLines() {
  _debugLines.length = 0
  _debugListeners.forEach((fn) => { try { fn() } catch { /* ignore */ } })
}

// Install the capture immediately when this module loads so that ALL
// subsequent [scanner]/[barkoder] logs (including from preloadBarkoderWasm
// below, which fires first on page mount) are captured.
installScannerConsoleCapture()

// ── Singleton: WASM initialized once, reused across all scanner opens ──
let _barkoderInstance: any = null
let _initPromise: Promise<{ bk: any; SDK: any }> | null = null

/**
 * Call this as early as possible (e.g. when NewIntake mounts) to pre-warm
 * the WASM. Subsequent calls return the cached promise immediately.
 */
export function preloadBarkoderWasm(): Promise<{ bk: any; SDK: any }> {
  if (_initPromise) return _initPromise

  _initPromise = (async () => {
    console.log('[barkoder] preload: starting')
    const key = getBarkoderLicenseKey()
    if (!key) {
      console.error('[barkoder] preload: MISSING VITE_BARKODER_KEY')
      throw new Error('Missing Barkoder license key')
    }
    console.log('[barkoder] preload: key length=', key.length)

    let SDK: any = null
    try {
      const mod = await import('barkoder-wasm')
      SDK = (mod as any)?.default || mod
      console.log('[barkoder] preload: module imported, initialize fn:', typeof SDK?.initialize)
    } catch (e) {
      console.error('[barkoder] preload: module import failed:', e)
      SDK = (window as any).BarkoderSDK || (window as any).Barkoder || null
    }

    if (!SDK?.initialize) throw new Error('barkoder-wasm: initialize not found')

    const bk = await SDK.initialize(key)
    console.log('[barkoder] preload: initialized successfully')

    _barkoderInstance = bk
    return { bk, SDK }
  })()

  _initPromise.catch((err) => {
    console.error('[barkoder] preload: failed, resetting for retry:', err)
    _initPromise = null
    _barkoderInstance = null
  })

  return _initPromise
}

/** Returns the cached instance if already initialized, null otherwise. */
export function getBarkoderInstance(): any {
  return _barkoderInstance
}
