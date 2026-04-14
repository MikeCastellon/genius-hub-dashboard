import { useEffect, useRef, useState, useCallback, useSyncExternalStore } from 'react'
import { pickBestVinFromText, isLikelyVin, sanitizeVin } from '@/lib/utils'
import {
  preloadBarkoderWasm,
  DUPLICATES_DELAY_MS,
  getDebugLines,
  subscribeDebugLines,
  clearDebugLines,
} from '@/lib/barkoderConfig'

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

// Extract textual data from a Barkoder result in all the shapes we've seen.
function extractBarkoderText(res: any): string {
  if (!res) return ''
  return (
    res.textualData ||
    res.text ||
    res.textual_data ||
    res?.data?.text ||
    res?.results?.[0]?.textualData ||
    ''
  )
}

// Known-valid demo VIN: 2003 Honda Accord EX, passes VIN checksum,
// decodes cleanly via NHTSA. Used when Barkoder runs in unlicensed
// demo mode and watermarks the scan output, so the user can still
// test the entire downstream intake flow.
const DEMO_TEST_VIN = '1HGCM82633A004352'

export default function BarkoderScanner({ onClose, onDetected, onFail }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const barkoderRef = useRef<any>(null)
  const onResultRef = useRef<((res: any) => void) | null>(null)
  const lastVinRef = useRef<{ vin: string; ts: number }>({ vin: '', ts: 0 })
  const [pendingVin, setPendingVin] = useState('')
  const [pendingVinMeta, setPendingVinMeta] = useState<{ checksumOk: boolean } | null>(null)
  const [unlicensedDetected, setUnlicensedDetected] = useState(false)
  const [unlicensedSample, setUnlicensedSample] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [debugOpen, setDebugOpen] = useState(true)

  // Live debug log — re-renders whenever a new [scanner]/[barkoder] log arrives.
  const debugLines = useSyncExternalStore(
    subscribeDebugLines,
    getDebugLines,
    getDebugLines
  )

  useEffect(() => {
    let cancelled = false
    clearDebugLines()
    console.log('[scanner] component mounted, UA=', navigator.userAgent.slice(0, 80))
    console.log('[scanner] getUserMedia available?', !!navigator.mediaDevices?.getUserMedia)
    console.log('[scanner] secure context?', window.isSecureContext)

    // Catch any uncaught errors/rejections that happen during scanning
    // (Barkoder internals, event handlers, etc) so they appear in the panel.
    const onErr = (ev: ErrorEvent) => {
      console.error('[scanner] window error:', ev.message, ev.filename + ':' + ev.lineno)
    }
    const onRej = (ev: PromiseRejectionEvent) => {
      const reason: any = ev.reason
      console.error('[scanner] unhandled rejection:', reason?.message || String(reason))
    }
    window.addEventListener('error', onErr)
    window.addEventListener('unhandledrejection', onRej)

    async function initScanner() {
      try {
        console.log('[scanner] mount: awaiting preload')
        const { bk: Barkoder, SDK } = await preloadBarkoderWasm()
        if (cancelled) {
          console.log('[scanner] mount: cancelled after preload')
          return
        }
        console.log('[scanner] mount: preload resolved')

        barkoderRef.current = Barkoder

        // Ensure the container div has the expected id (Barkoder may use it internally)
        if (containerRef.current) {
          containerRef.current.id = containerRef.current.id || 'barkoder-container'
          containerRef.current.style.width = containerRef.current.style.width || '100%'
          containerRef.current.style.height = containerRef.current.style.height || '100%'
        }

        // ── Camera: prefer back-facing on mobile ──
        try {
          if (typeof Barkoder.setCameraPosition === 'function') Barkoder.setCameraPosition('back')
          else if (typeof Barkoder.setCameraFacingMode === 'function') Barkoder.setCameraFacingMode('environment')
          else if (typeof Barkoder.setPreferredCamera === 'function') Barkoder.setPreferredCamera('environment')
        } catch (e) { console.warn('[scanner] camera setup warn:', e) }

        // ── Hide built-in UI chrome — we render our own close button ──
        try {
          if (typeof Barkoder.setCameraSwitchVisibility === 'function') Barkoder.setCameraSwitchVisibility(false)
          else if (typeof Barkoder.setCameraSwitchButtonVisible === 'function') Barkoder.setCameraSwitchButtonVisible(false)
          if (typeof Barkoder.setCloseButtonVisibility === 'function') Barkoder.setCloseButtonVisibility(false)
          else if (typeof Barkoder.setCloseButtonVisible === 'function') Barkoder.setCloseButtonVisible(false)
          else if (typeof Barkoder.setCloseEnabled === 'function') Barkoder.setCloseEnabled(false)
        } catch (e) { console.warn('[scanner] ui-hide warn:', e) }

        // ── Decoders: exactly the set that works in Auto Sync ──
        // Code39 + Code128: door jamb / under-hood VIN stickers
        // DataMatrix: modern manufacturer labels
        // PDF417: driver's license / registration cards
        // QR: newer dashboards / registration QRs
        try {
          const C = Barkoder.constants || SDK.constants || {}
          const D = C.Decoders || C.BarcodeType || {}
          const decodersToEnable = [D.Code39, D.Code128, D.DataMatrix, D.Datamatrix, D.PDF417, D.QR]
            .filter((v: any) => typeof v !== 'undefined')
          console.log('[scanner] decoders to enable:', decodersToEnable)
          if (decodersToEnable.length && typeof Barkoder.setEnabledDecoders === 'function') {
            Barkoder.setEnabledDecoders(...decodersToEnable)
          }
        } catch (e) { console.warn('[scanner] decoder setup warn:', e) }

        const onResult = (res: any) => {
          console.log('[scanner] result callback fired:', res)
          try {
            if (res?.error) {
              console.warn('[scanner] result error field:', res.error)
              return
            }
            const text = extractBarkoderText(res)
            console.log('[scanner] extracted text:', JSON.stringify(text))
            if (!text) {
              console.log('[scanner] no text in result, ignoring')
              return
            }

            // ── Unlicensed demo-mode detection ──
            // If Barkoder's server rejected the license, the SDK replaces
            // real barcode text with a "(Unlicensed) ..." watermark. No
            // VIN can ever be parsed from that. Pop a demo modal with a
            // test VIN so the user can exercise the downstream intake
            // flow while we wait for a valid license from Barkoder.
            if (/unlicensed/i.test(text)) {
              console.warn('[scanner] unlicensed demo mode detected, offering test VIN')
              if (!unlicensedDetected) {
                setUnlicensedDetected(true)
                setUnlicensedSample(text)
              }
              return
            }

            const best = pickBestVinFromText(text)
            console.log('[scanner] pickBestVinFromText result:', best)
            if (!best?.vin) {
              console.log('[scanner] no VIN matched regex in:', text)
              return
            }

            const now = Date.now()
            if (lastVinRef.current.vin === best.vin && now - lastVinRef.current.ts < DUPLICATES_DELAY_MS) {
              console.log('[scanner] duplicate VIN within dedup window, ignoring')
              return
            }
            lastVinRef.current = { vin: best.vin, ts: now }

            console.log('[scanner] VIN accepted, showing modal:', best.vin)
            setPendingVin(best.vin)
            setPendingVinMeta({ checksumOk: !!best.checksumOk })
          } catch (err) {
            console.error('[scanner] onResult threw:', err)
          }
        }

        onResultRef.current = onResult
        setLoading(false)

        try {
          console.log('[scanner] calling startScanner')
          Barkoder.startScanner(onResult)
          console.log('[scanner] startScanner returned')
        } catch (e: any) {
          console.error('[scanner] startScanner threw:', e?.message || String(e))
          setErrorMsg('Scanner start failed: ' + (e?.message || String(e)))
        }

        // Probe where Barkoder mounted its video element
        setTimeout(() => {
          if (cancelled) return
          const containerVideo = containerRef.current?.querySelector('video')
          const anyVideo = document.querySelector('video')
          if (containerVideo) {
            const s = containerVideo as HTMLVideoElement
            console.log('[scanner] video in container:', s.videoWidth + 'x' + s.videoHeight, 'readyState=' + s.readyState, 'paused=' + s.paused)
          } else if (anyVideo) {
            console.warn('[scanner] video NOT in container, found elsewhere. parent=', anyVideo.parentElement?.tagName, anyVideo.parentElement?.id || '(no id)')
          } else {
            console.error('[scanner] NO video element in DOM after 1.2s')
          }
        }, 1200)
      } catch (err: any) {
        if (cancelled) return
        console.error('[scanner] init failed:', err?.message || String(err))
        setLoading(false)
        setErrorMsg(err?.message || 'Failed to initialize scanner')
        onFail?.()
      }
    }

    initScanner()

    return () => {
      cancelled = true
      window.removeEventListener('error', onErr)
      window.removeEventListener('unhandledrejection', onRej)
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

  const handleUseTestVin = () => {
    onDetected(DEMO_TEST_VIN)
    setUnlicensedDetected(false)
  }

  const handleEnterManually = () => {
    setUnlicensedDetected(false)
    onClose()
  }

  const vinModalOpen = !!pendingVin

  return (
    <div className="sc-overlay">
      {/* Barkoder renders its camera view inside this container */}
      <div ref={containerRef} id="barkoder-container" className="sc-barkoder-container" />

      {loading && (
        <div className="sc-loading">
          <div className="sc-spinner" />
          <span>Starting scanner...</span>
        </div>
      )}

      <div className="sc-topbar">
        <button type="button" className="sc-icon-btn" onClick={onClose} aria-label="Close">
          <IconClose />
        </button>
        <span className="sc-title">Scan VIN</span>
        <div style={{ width: 40 }} />
      </div>

      {errorMsg && <div className="sc-error">{errorMsg}</div>}

      {/* On-screen debug panel — mobile-friendly alternative to DevTools */}
      <div className={debugOpen ? 'sc-debug sc-debug--open' : 'sc-debug'}>
        <div className="sc-debug-header">
          <span>debug ({debugLines.length})</span>
          <button type="button" onClick={() => setDebugOpen((v) => !v)}>
            {debugOpen ? 'hide' : 'show'}
          </button>
        </div>
        {debugOpen && (
          <div className="sc-debug-body">
            {debugLines.length === 0 && <div className="sc-debug-empty">no logs yet…</div>}
            {debugLines.map((line, i) => (
              <div key={i} className={'sc-debug-line sc-debug-' + line.level}>
                {line.text}
              </div>
            ))}
          </div>
        )}
      </div>

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

      {unlicensedDetected && !vinModalOpen && (
        <div className="sc-result sc-result--warn">
          <div>
            <div className="sc-result-label sc-result-label--warn">Barkoder unlicensed demo mode</div>
            <div className="sc-result-warn-body">
              A barcode was detected and the scanner is working, but Barkoder's
              server rejected the license key so the real VIN text is being
              watermarked. Use the test VIN below to continue testing the
              intake flow until a valid license is installed.
            </div>
            {unlicensedSample && (
              <div className="sc-result-sample">watermark: <span>{unlicensedSample}</span></div>
            )}
            <div className="sc-result-testvin">
              <span className="sc-result-label">Test VIN</span>
              <code>{DEMO_TEST_VIN}</code>
              <span className="sc-result-sub">2003 Honda Accord EX · NHTSA decodable</span>
            </div>
          </div>
          <div className="sc-result-actions">
            <button type="button" className="sc-result-primary" onClick={handleUseTestVin}>Use test VIN</button>
            <button type="button" className="sc-result-secondary" onClick={handleEnterManually}>Enter manually</button>
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
        @keyframes sc-spin { to { transform: rotate(360deg); } }
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
        .sc-error {
          position: absolute; bottom: 120px; left: 50%;
          transform: translateX(-50%);
          background: rgba(220,38,38,0.9); color: #fff;
          padding: 0.5rem 1rem; border-radius: 10px;
          font-size: 0.78rem; max-width: 85%; text-align: center;
          z-index: 10;
        }
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

        /* Unlicensed demo-mode modal variant */
        .sc-result--warn {
          border-top: 4px solid #f59e0b;
        }
        .sc-result-label--warn {
          color: #b45309 !important;
        }
        .sc-result-warn-body {
          margin-top: 10px;
          font-size: 0.82rem;
          line-height: 1.4;
          color: #374151;
        }
        .sc-result-sample {
          margin-top: 10px;
          font-size: 0.72rem;
          color: #6b7280;
          font-family: ui-monospace, monospace;
          word-break: break-all;
        }
        .sc-result-sample span {
          color: #b45309;
        }
        .sc-result-testvin {
          margin-top: 14px;
          padding: 10px 12px;
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .sc-result-testvin code {
          font-family: ui-monospace, monospace;
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: 0.02em;
        }
        .sc-result-sub {
          font-size: 0.7rem;
          color: #78350f;
        }

        /* Debug panel */
        .sc-debug {
          position: absolute;
          left: 8px; right: 8px;
          top: calc(env(safe-area-inset-top, 12px) + 64px);
          max-height: 55vh;
          background: rgba(0, 0, 0, 0.82);
          color: #e5e7eb;
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 10px;
          font-family: ui-monospace, Menlo, monospace;
          font-size: 10.5px;
          line-height: 1.35;
          z-index: 20;
          overflow: hidden;
          pointer-events: auto;
        }
        .sc-debug-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 6px 10px;
          background: rgba(255,255,255,0.08);
          border-bottom: 1px solid rgba(255,255,255,0.12);
          font-weight: 700; letter-spacing: 0.03em;
        }
        .sc-debug-header button {
          background: rgba(255,255,255,0.15); color: #fff;
          border: none; border-radius: 6px;
          padding: 3px 10px; font-size: 10.5px; font-weight: 700;
          cursor: pointer;
        }
        .sc-debug-body {
          padding: 6px 10px;
          overflow-y: auto;
          max-height: calc(55vh - 32px);
        }
        .sc-debug-empty { color: rgba(255,255,255,0.4); font-style: italic; }
        .sc-debug-line {
          word-break: break-word;
          padding: 2px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .sc-debug-log { color: #e5e7eb; }
        .sc-debug-warn { color: #fbbf24; }
        .sc-debug-error { color: #f87171; font-weight: 600; }
      `}</style>
    </div>
  )
}
