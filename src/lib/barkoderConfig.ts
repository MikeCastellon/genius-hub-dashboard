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
 * pre-warm the WASM AND apply all config. Subsequent calls return the
 * cached promise immediately. The scanner component calls this too — if
 * pre-warming already finished, it resolves instantly and the scanner
 * only has to call startScanner().
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

    // ── Apply ALL config ONCE during preload ──
    // Moving ~20 config calls out of the scanner hot path. These each do a
    // WASM round-trip; consolidating them here means the scanner open latency
    // is just startScanner(cb) — no config overhead.
    const C = bk.constants || SDK.constants || {}
    const D = C.Decoders || {}

    try {
      // Hide built-in UI chrome
      if (typeof bk.setCameraSwitchVisibility === 'function') bk.setCameraSwitchVisibility(false)
      else if (typeof bk.setCameraSwitchButtonVisible === 'function') bk.setCameraSwitchButtonVisible(false)
      if (typeof bk.setCloseButtonVisibility === 'function') bk.setCloseButtonVisibility(false)
      else if (typeof bk.setCloseButtonVisible === 'function') bk.setCloseButtonVisible(false)
      else if (typeof bk.setCloseEnabled === 'function') bk.setCloseEnabled(false)

      // Every realistic VIN barcode type on vehicles + docs
      const toEnable = [
        D.Code39, D.Code128, D.Code93,
        D.Datamatrix,
        D.PDF417, D.PDF417Micro,
        D.QR, D.QRMicro,
        D.Aztec,
      ].filter((v: any) => v !== undefined)
      if (toEnable.length) bk.setEnabledDecoders(...toEnable)

      // Speed
      bk.setDecodingSpeed?.(0)           // Fast
      bk.setCameraResolution?.(0)        // HD (not FHD)
      bk.setMaximumResultsCount?.(1)     // stop at first hit
      bk.setMulticodeCachingEnabled?.(0) // disabled
      bk.setContinuous?.(true)
      bk.setDuplicatesDelayMs?.(DUPLICATES_DELAY_MS)

      // VIN length constraint — decoder short-circuits on wrong length
      if (D.Code39 !== undefined) bk.setLengthRange?.(D.Code39, 17, 25)
      if (D.Code128 !== undefined) bk.setLengthRange?.(D.Code128, 17, 25)
      if (D.Code93 !== undefined) bk.setLengthRange?.(D.Code93, 17, 25)

      // Coverage for worn/etched labels
      bk.setEnableMisshaped1D?.(1)
      bk.setDatamatrixDpmModeEnabled?.(true)
      bk.setFormatting?.(1) // Automatic

      // ROI
      bk.setRegionOfInterestVisible?.(true)
      bk.setRegionOfInterest?.(3, 25, 94, 50)
      bk.setRoiLineColor?.('#60a5fa')
      bk.setRoiOverlayBackgroundColor?.('rgba(0,0,0,0.45)')
      bk.setLocationInPreviewEnabled?.(true)
      bk.setLocationLineColor?.('#22c55e')
      bk.setBeepOnSuccessEnabled?.(true)
    } catch (err) {
      console.warn('[barkoder] config warning:', err)
      // Non-fatal — scanner can still start with defaults
    }

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
