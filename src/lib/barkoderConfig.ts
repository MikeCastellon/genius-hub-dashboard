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
