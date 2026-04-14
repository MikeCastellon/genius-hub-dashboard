/**
 * Shared Barkoder SDK configuration for web (WASM) and native (Capacitor) platforms.
 * VIN-focused barcode scanning with Code 39, Code 128, Data Matrix, PDF417, QR.
 */

export function getBarkoderLicenseKey(): string {
  return import.meta.env.VITE_BARKODER_KEY || ''
}

/** Deduplication delay in ms to prevent duplicate VIN captures */
export const DUPLICATES_DELAY_MS = 1500

// ── Singleton: WASM initialized once, reused across all scanner opens ──
// This eliminates the cold-start download+compile on every scanner mount.
let _barkoderInstance: any = null
let _initPromise: Promise<any> | null = null

/**
 * Call this as early as possible (e.g. when the intake page mounts) to
 * pre-warm the WASM. Subsequent calls return the cached promise immediately.
 * The scanner component calls this too — if pre-warming already finished,
 * it resolves instantly.
 */
export function preloadBarkoderWasm(): Promise<any> {
  if (_initPromise) return _initPromise

  _initPromise = (async () => {
    const key = getBarkoderLicenseKey()
    if (!key) throw new Error('Missing Barkoder license key')

    const mod = await import('barkoder-wasm')
    const SDK = (mod as any)?.default || mod
    if (!SDK?.initialize) throw new Error('barkoder-wasm: initialize not found')

    const bk = await SDK.initialize(key)
    _barkoderInstance = bk
    return { bk, SDK }
  })()

  _initPromise.catch(() => {
    // Reset so a retry is possible on failure
    _initPromise = null
    _barkoderInstance = null
  })

  return _initPromise
}

/** Returns the cached instance if already initialized, null otherwise. */
export function getBarkoderInstance(): any {
  return _barkoderInstance
}
