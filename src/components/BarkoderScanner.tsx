import { useEffect, useRef, useState, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { pickBestVinFromText, isLikelyVin, sanitizeVin } from '@/lib/utils'
import { getBarkoderLicenseKey, VIN_DECODERS, DUPLICATES_DELAY_MS } from '@/lib/barkoderConfig'
import type { Barkoder as BarkoderWasm, BKResult } from 'barkoder-wasm'

interface Props {
  onClose: () => void
  onDetected: (vin: string) => void
  onFail?: () => void
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function BarkoderScanner({ onClose, onDetected, onFail: _onFail }: Props) {
  const barkoderRef = useRef<BarkoderWasm | null>(null)
  const [pendingVin, setPendingVin] = useState('')
  const [pendingVinMeta, setPendingVinMeta] = useState<{ checksumOk: boolean } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(true)
  // Use native barkoder-capacitor on iOS and Android.
  const isNative = Capacitor.isNativePlatform()

  const processResult = useCallback((text: string) => {
    const best = pickBestVinFromText(text)
    if (best?.vin) {
      setPendingVin(best.vin)
      setPendingVinMeta({ checksumOk: !!best.checksumOk })
      return true
    }
    // No VIN pattern found — show the raw decoded text so user can see what was scanned
    const cleaned = text.trim()
    if (cleaned) {
      setPendingVin(cleaned)
      setPendingVinMeta(null)
      return true
    }
    return false
  }, [])

  // ── Web path: barkoder-wasm ──
  useEffect(() => {
    if (isNative) return

    let stopped = false

    async function initWeb() {
      try {
        // Wait a tick to ensure the container div is in the DOM
        // barkoder-wasm grabs document.getElementById('barkoder-container') at module load
        await new Promise(r => requestAnimationFrame(r))

        const containerEl = document.getElementById('barkoder-container')
        console.log('[BarkoderScanner] container element:', containerEl ? 'found' : 'NOT FOUND')
        if (!containerEl) {
          setLoading(false)
          setErrorMsg('Scanner container not found')
          return
        }

        console.log('[BarkoderScanner] importing barkoder-wasm...')
        const { initialize } = await import('barkoder-wasm')
        if (stopped) return

        const key = getBarkoderLicenseKey()
        console.log('[BarkoderScanner] initializing with key:', key ? `${key.slice(0, 20)}...` : '(empty)')
        const barkoder = await initialize(key)
        console.log('[BarkoderScanner] initialized successfully, version:', JSON.stringify(barkoder.getVersion()))
        if (stopped) {
          barkoder.stopScanner()
          return
        }

        barkoderRef.current = barkoder

        // Configure VIN decoders
        barkoder.setEnabledDecoders(
          VIN_DECODERS.Code39,
          VIN_DECODERS.Code128,
          VIN_DECODERS.Datamatrix,
          VIN_DECODERS.PDF417,
          VIN_DECODERS.QR,
        )
        barkoder.setEnableVINRestrictions(0) // Disabled — we validate VINs ourselves via pickBestVinFromText
        barkoder.setDecodingSpeed(2) // DecodingSpeed.Slow for better accuracy
        barkoder.setCameraResolution(1) // CameraResolution.FHD
        barkoder.setContinuous(true)
        barkoder.setDuplicatesDelayMs(DUPLICATES_DELAY_MS)
        barkoder.setEnableMisshaped1D(1) // Handle damaged/curved barcodes

        // UI customization — large ROI for easy aiming
        barkoder.setRegionOfInterestVisible(true)
        barkoder.setRegionOfInterest(2, 20, 96, 60) // Wide + tall ROI
        barkoder.setRoiLineColor('#60a5fa') // Blue to match app theme
        barkoder.setRoiOverlayBackgroundColor('rgba(0,0,0,0.45)')
        barkoder.setLocationInPreviewEnabled(true)
        barkoder.setLocationLineColor('#22c55e')
        barkoder.setFlashEnabled(true)
        barkoder.setZoomEnabled(true)
        barkoder.setCloseEnabled(false) // We overlay our own close button
        barkoder.setBeepOnSuccessEnabled(true)
        barkoder.setCameraPickerEnabled(true) // Allow switching cameras

        setLoading(false)
        console.log('[BarkoderScanner] starting scanner...')
        barkoder.startScanner((result: BKResult) => {
          console.log('[BarkoderScanner] raw result:', JSON.stringify(result, null, 2))
          if (result.error) {
            console.warn('[BarkoderScanner] decode error:', result.error)
            const errName = result.error?.name || ''
            const errMsg = result.error?.message || ''
            if (errName === 'NotAllowedError' || errMsg.toLowerCase().includes('permission')) {
              setLoading(false)
              setErrorMsg('Camera permission denied. Please allow camera access and try again.')
            }
            return
          }

          // Try top-level textualData first, then check results array
          let text = result.textualData
          if (!text && result.results?.length) {
            text = result.results[0].textualData
          }
          if (!text) return

          console.log('[BarkoderScanner] decoded text:', text, '| type:', result.barcodeTypeName)
          barkoder.setPauseDecoding(true)
          processResult(text)
        })
      } catch (err: any) {
        if (stopped) return
        console.error('[BarkoderScanner] web init failed:', err)
        setLoading(false)
        setErrorMsg(err?.message || 'Failed to initialize scanner')
        // Don't call onFail here — let user see the error and close manually
      }
    }

    initWeb()

    return () => {
      stopped = true
      try { barkoderRef.current?.stopScanner() } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNative, processResult])

  // ── Native path: barkoder-capacitor ──
  useEffect(() => {
    if (!isNative) return

    let stopped = false
    let listenerHandle: { remove: () => void } | null = null

    async function initNative() {
      try {
        const { Barkoder: BarkoderPlugin, BarcodeType, DecodingSpeed, BarkoderResolution } = await import('barkoder-capacitor')
        if (stopped) return

        const key = getBarkoderLicenseKey()

        // Initialize the native view (full-screen)
        await BarkoderPlugin.initialize({ width: window.innerWidth, height: window.innerHeight, x: 0, y: 0 })
        await BarkoderPlugin.registerWithLicenseKey({ licenseKey: key })

        // Enable VIN barcode types
        await BarkoderPlugin.setBarcodeTypeEnabled({ type: BarcodeType.code39, enabled: true })
        await BarkoderPlugin.setBarcodeTypeEnabled({ type: BarcodeType.code128, enabled: true })
        await BarkoderPlugin.setBarcodeTypeEnabled({ type: BarcodeType.datamatrix, enabled: true })
        await BarkoderPlugin.setBarcodeTypeEnabled({ type: BarcodeType.pdf417, enabled: true })
        await BarkoderPlugin.setBarcodeTypeEnabled({ type: BarcodeType.qr, enabled: true })
        await BarkoderPlugin.setEnableVINRestrictions({ value: true })
        await BarkoderPlugin.setDecodingSpeed({ value: DecodingSpeed.slow })
        await BarkoderPlugin.setBarkoderResolution({ value: BarkoderResolution.FHD })
        await BarkoderPlugin.setRegionOfInterest({ left: 2, top: 30, width: 96, height: 15 })
        await BarkoderPlugin.setRegionOfInterestVisible({ value: true })
        await BarkoderPlugin.setLocationInPreviewEnabled({ enabled: true })
        await BarkoderPlugin.setBeepOnSuccessEnabled({ enabled: true })
        await BarkoderPlugin.setVibrateOnSuccessEnabled({ enabled: true })
        await BarkoderPlugin.setCloseSessionOnResultEnabled({ enabled: true })
        await BarkoderPlugin.setThresholdBetweenDuplicatesScans({ value: DUPLICATES_DELAY_MS })

        // UI colors
        await BarkoderPlugin.setRoiLineColor({ value: '#60a5fa' })
        await BarkoderPlugin.setRoiOverlayBackgroundColor({ value: 'rgba(0,0,0,0.55)' })
        await BarkoderPlugin.setLocationLineColor({ value: '#22c55e' })

        // Listen for scan results
        listenerHandle = await BarkoderPlugin.addListener('barkoderResultEvent', (data: any) => {
          if (stopped) return
          const results = data?.decoderResults || data?.results || []
          for (const r of results) {
            if (r.textualData && processResult(r.textualData)) break
          }
        })

        if (stopped) return
        setLoading(false)

        await BarkoderPlugin.startScanning()
      } catch (err: any) {
        if (stopped) return
        console.error('[BarkoderScanner] native init failed:', err)
        setLoading(false)
        setErrorMsg(err?.message || 'Failed to initialize native scanner')
      }
    }

    initNative()

    return () => {
      stopped = true
      listenerHandle?.remove()
      import('barkoder-capacitor').then(({ Barkoder: BarkoderPlugin }) => {
        BarkoderPlugin.stopScanning().catch(() => {})
      }).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNative, processResult])

  const handleUseVin = () => {
    if (!pendingVin) return
    const cleaned = sanitizeVin(pendingVin)
    onDetected(isLikelyVin(cleaned) ? cleaned : pendingVin)
    setPendingVin('')
    setPendingVinMeta(null)
  }

  const handleScanAgain = useCallback(async () => {
    setPendingVin('')
    setPendingVinMeta(null)

    if (isNative) {
      try {
        const { Barkoder: BarkoderPlugin } = await import('barkoder-capacitor')
        await BarkoderPlugin.startScanning()
      } catch { /* ignore */ }
    } else {
      barkoderRef.current?.setPauseDecoding(false)
    }
  }, [isNative])

  const vinModalOpen = !!pendingVin

  return (
    <div className="sc-overlay">
      {/* Web: Barkoder renders its camera view inside this container */}
      {!isNative && (
        <div id="barkoder-container" className="sc-barkoder-container" />
      )}

      {/* Native: dark background when scanner dismissed for confirmation */}
      {isNative && vinModalOpen && (
        <div className="sc-native-bg" />
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="sc-loading">
          <div className="sc-spinner" />
          <span>Starting scanner...</span>
        </div>
      )}

      {/* Top bar with close button */}
      <div className="sc-topbar">
        <button type="button" className="sc-icon-btn" onClick={onClose} aria-label="Close">
          <IconClose />
        </button>
        <span className="sc-title">Scan VIN</span>
        <div style={{ width: 40 }} />
      </div>

      {errorMsg && <div className="sc-error">{errorMsg}</div>}

      {/* VIN result sheet */}
      {vinModalOpen && (
        <div className="sc-result">
          <div>
            <div className="sc-result-label">Detected VIN</div>
            <div className="sc-result-value">{pendingVin}</div>
            {pendingVinMeta && (
              <div className="sc-result-meta">
                {pendingVinMeta.checksumOk ? '\u2713 Checksum verified' : '~ Pattern match only'}
              </div>
            )}
          </div>
          <div className="sc-result-actions">
            <button type="button" className="sc-result-primary" onClick={handleUseVin}>Use VIN</button>
            <button type="button" className="sc-result-secondary" onClick={handleScanAgain}>Scan Again</button>
          </div>
        </div>
      )}

      <style>{`
        .sc-overlay {
          position: fixed; inset: 0; z-index: 2200;
          background: #000; overflow: hidden;
          display: flex; flex-direction: column;
        }
        .sc-barkoder-container {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
        }
        .sc-native-bg {
          position: absolute; inset: 0;
          background: #000;
        }

        /* ── loading ── */
        .sc-loading {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 16px; z-index: 5;
          color: rgba(255,255,255,0.8);
          font-size: 0.85rem;
        }
        .sc-spinner {
          width: 32px; height: 32px;
          border: 3px solid rgba(255,255,255,0.2);
          border-top-color: #60a5fa;
          border-radius: 50%;
          animation: sc-spin 0.8s linear infinite;
        }
        @keyframes sc-spin {
          to { transform: rotate(360deg); }
        }

        /* ── top bar ── */
        .sc-topbar {
          position: absolute; top: 0; left: 0; right: 0;
          display: flex; align-items: center; justify-content: space-between;
          padding: env(safe-area-inset-top, 12px) 16px 12px;
          padding-top: max(env(safe-area-inset-top), 12px);
          background: linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, transparent 100%);
          z-index: 10;
        }
        .sc-title {
          color: #fff; font-size: 1rem; font-weight: 600;
          letter-spacing: 0.01em;
        }
        .sc-icon-btn {
          width: 40px; height: 40px; border-radius: 50%;
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.25);
          color: #fff; display: grid; place-items: center;
          cursor: pointer; -webkit-tap-highlight-color: transparent;
        }
        .sc-icon-btn:active { background: rgba(255,255,255,0.32); }

        /* ── error ── */
        .sc-error {
          position: absolute; bottom: 120px; left: 50%;
          transform: translateX(-50%);
          background: rgba(220,38,38,0.9); color: #fff;
          padding: 0.5rem 1rem; border-radius: 10px;
          font-size: 0.78rem; max-width: 85%; text-align: center;
          z-index: 10;
        }

        /* ── result sheet ── */
        .sc-result {
          position: fixed; left: 0; right: 0; bottom: 0;
          background: #fff; color: #0f172a;
          border-radius: 20px 20px 0 0;
          box-shadow: 0 -8px 40px rgba(0,0,0,0.35);
          padding: 20px 20px;
          padding-bottom: max(env(safe-area-inset-bottom), 24px);
          z-index: 2300;
          display: flex; flex-direction: column; gap: 14px;
        }
        .sc-result-label {
          font-size: 0.7rem; text-transform: uppercase;
          color: #6b7280; letter-spacing: 0.06em;
        }
        .sc-result-value {
          font-family: ui-monospace, monospace;
          font-size: 1.05rem; font-weight: 600;
          word-break: break-all; margin-top: 4px;
        }
        .sc-result-meta {
          margin-top: 4px; font-size: 0.78rem; color: #16a34a; font-weight: 500;
        }
        .sc-result-actions { display: flex; gap: 10px; }
        .sc-result-primary, .sc-result-secondary {
          height: 48px; font-size: 0.95rem; padding: 0 1rem;
          cursor: pointer; font-weight: 700; border-radius: 12px;
          border: none; -webkit-tap-highlight-color: transparent;
        }
        .sc-result-primary { flex: 1; background: #2563eb; color: #fff; }
        .sc-result-primary:active { background: #1d4ed8; }
        .sc-result-secondary { background: #f1f5f9; color: #0f172a; min-width: 120px; }
        .sc-result-secondary:active { background: #e2e8f0; }
      `}</style>
    </div>
  )
}
