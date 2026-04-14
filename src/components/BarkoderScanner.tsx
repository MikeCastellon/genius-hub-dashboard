import { useEffect, useRef, useState, useCallback } from 'react'
import { pickBestVinFromText, isLikelyVin, sanitizeVin } from '@/lib/utils'
import { getBarkoderLicenseKey, DUPLICATES_DELAY_MS } from '@/lib/barkoderConfig'

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

export default function BarkoderScanner({ onClose, onDetected, onFail }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const barkoderRef = useRef<any>(null)
  const onResultRef = useRef<((res: any) => void) | null>(null)
  const lastVinRef = useRef<{ vin: string; ts: number }>({ vin: '', ts: 0 })
  const [pendingVin, setPendingVin] = useState('')
  const [pendingVinMeta, setPendingVinMeta] = useState<{ checksumOk: boolean } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function initWeb() {
      try {
        const key = getBarkoderLicenseKey()
        if (!key) {
          setLoading(false)
          setErrorMsg('Scanner not configured (missing license key)')
          onFail?.()
          return
        }

        // barkoder-wasm exports via default, not as named exports
        const mod = await import('barkoder-wasm')
        const BarkoderSDK = (mod as any)?.default || mod
        if (cancelled) return

        if (!BarkoderSDK?.initialize) {
          throw new Error('Barkoder SDK not found — check barkoder-wasm package')
        }

        const Barkoder = await BarkoderSDK.initialize(key)
        if (cancelled) return

        // Attach the container div so Barkoder renders into it
        if (containerRef.current) {
          containerRef.current.id = containerRef.current.id || 'barkoder-container'
        }

        barkoderRef.current = Barkoder

        // Hide built-in UI buttons — we provide our own
        try {
          if (typeof Barkoder.setCameraSwitchVisibility === 'function') Barkoder.setCameraSwitchVisibility(false)
          else if (typeof Barkoder.setCameraSwitchButtonVisible === 'function') Barkoder.setCameraSwitchButtonVisible(false)
          if (typeof Barkoder.setCloseButtonVisibility === 'function') Barkoder.setCloseButtonVisibility(false)
          else if (typeof Barkoder.setCloseButtonVisible === 'function') Barkoder.setCloseButtonVisible(false)
          else if (typeof Barkoder.setCloseEnabled === 'function') Barkoder.setCloseEnabled(false)
        } catch { /* non-critical */ }

        // Enable VIN-relevant decoders using runtime constants (more reliable than hardcoded ints)
        try {
          const C = Barkoder.constants || BarkoderSDK.constants || {}
          const D = C.Decoders || C.BarcodeType || {}
          const toEnable = [D.Code39, D.Code128, D.DataMatrix, D.PDF417, D.QR].filter(v => v !== undefined)
          if (toEnable.length && typeof Barkoder.setEnabledDecoders === 'function') {
            Barkoder.setEnabledDecoders(...toEnable)
          } else if (typeof Barkoder.setBarcodeTypeEnabled === 'function') {
            toEnable.forEach((t: any) => Barkoder.setBarcodeTypeEnabled(t, true))
          }
        } catch { /* non-critical */ }

        // Optional config — skip if method doesn't exist on this SDK version
        try { Barkoder.setDecodingSpeed?.(2) } catch { /* ignore */ }
        try { Barkoder.setCameraResolution?.(1) } catch { /* ignore */ }
        try { Barkoder.setContinuous?.(true) } catch { /* ignore */ }
        try { Barkoder.setDuplicatesDelayMs?.(DUPLICATES_DELAY_MS) } catch { /* ignore */ }
        try { Barkoder.setRegionOfInterestVisible?.(true) } catch { /* ignore */ }
        try { Barkoder.setRegionOfInterest?.(2, 20, 96, 60) } catch { /* ignore */ }
        try { Barkoder.setRoiLineColor?.('#60a5fa') } catch { /* ignore */ }
        try { Barkoder.setRoiOverlayBackgroundColor?.('rgba(0,0,0,0.45)') } catch { /* ignore */ }
        try { Barkoder.setLocationInPreviewEnabled?.(true) } catch { /* ignore */ }
        try { Barkoder.setLocationLineColor?.('#22c55e') } catch { /* ignore */ }
        try { Barkoder.setBeepOnSuccessEnabled?.(true) } catch { /* ignore */ }

        const onResult = (res: any) => {
          try {
            const text =
              res?.textualData ||
              res?.text ||
              res?.results?.[0]?.textualData ||
              ''
            if (!text) return

            const best = pickBestVinFromText(text)
            if (!best?.vin) return

            const now = Date.now()
            if (lastVinRef.current.vin === best.vin && now - lastVinRef.current.ts < DUPLICATES_DELAY_MS) return
            lastVinRef.current = { vin: best.vin, ts: now }

            setPendingVin(best.vin)
            setPendingVinMeta({ checksumOk: !!best.checksumOk })
          } catch { /* ignore */ }
        }

        onResultRef.current = onResult
        setLoading(false)
        Barkoder.startScanner(onResult)
      } catch (err: any) {
        if (cancelled) return
        console.error('[BarkoderScanner] init failed:', err)
        setLoading(false)
        setErrorMsg(err?.message || 'Failed to initialize scanner')
        onFail?.()
      }
    }

    initWeb()

    return () => {
      cancelled = true
      try { barkoderRef.current?.stopScanner?.() } catch { /* ignore */ }
    }
  }, [onFail])

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
    lastVinRef.current = { vin: '', ts: 0 }
    const bk = barkoderRef.current
    if (bk && onResultRef.current) {
      try { bk.stopScanner?.() } catch { /* ignore */ }
      await new Promise(r => setTimeout(r, 150))
      try { bk.startScanner?.(onResultRef.current) } catch { /* ignore */ }
    }
  }, [])

  const vinModalOpen = !!pendingVin

  return (
    <div className="sc-overlay">
      {/* Barkoder renders its camera view inside this container */}
      <div ref={containerRef} id="barkoder-container" className="sc-barkoder-container" />

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
