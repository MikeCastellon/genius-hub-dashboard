import { useEffect, useRef, useState, useCallback } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library'
import { pickBestVinFromText, isLikelyVin, sanitizeVin } from '@/lib/utils'
import { isNativeScannerAvailable, scanBarcode } from '@/lib/barcodeScanner'

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
function IconFlashOn() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="#fbbf24">
      <path d="M13 2L4.09 13H11L10 22L19.91 11H13L13 2Z" />
    </svg>
  )
}
function IconFlashOff() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
      <path d="M13 2L4.09 13H11L10 22L19.91 11H13L13 2Z" />
    </svg>
  )
}
function IconFlip() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="2.5" fill="white" stroke="none"/>
      <polyline points="17 1 21 5 17 9" /><line x1="21" y1="5" x2="9" y2="5" />
    </svg>
  )
}

const HINTS = new Map()
HINTS.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_128,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.PDF_417,
  BarcodeFormat.QR_CODE,
])
HINTS.set(DecodeHintType.TRY_HARDER, true)

type FacingMode = 'environment' | 'user'

export default function BarkoderScanner({ onClose, onDetected, onFail }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastVinRef = useRef({ vin: '', ts: 0 })

  const [errorMsg, setErrorMsg] = useState('')
  const [pendingVin, setPendingVin] = useState('')
  const [pendingVinMeta, setPendingVinMeta] = useState<{ checksumOk: boolean } | null>(null)
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [facing, setFacing] = useState<FacingMode>('environment')

  const startCamera = useCallback(async (facingMode: FacingMode, stopped: { v: boolean }) => {
    try {
      controlsRef.current?.stop()
      streamRef.current?.getTracks().forEach(t => t.stop())
      setTorchOn(false)

      const reader = new BrowserMultiFormatReader(HINTS, { delayBetweenScanAttempts: 150 })

      const controls = await reader.decodeFromConstraints(
        { video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } } },
        videoRef.current!,
        (result, err) => {
          if (stopped.v) return
          if (err instanceof NotFoundException || !result) return
          const text = result.getText()
          if (!text) return
          const best = pickBestVinFromText(text)
          if (!best?.vin) return
          const now = Date.now()
          if (lastVinRef.current.vin === best.vin && now - lastVinRef.current.ts < 1500) return
          lastVinRef.current = { vin: best.vin, ts: now }
          setPendingVin(best.vin)
          setPendingVinMeta({ checksumOk: !!best.checksumOk })
        }
      )

      if (!stopped.v) {
        controlsRef.current = controls
        // grab stream for torch detection
        await new Promise(r => setTimeout(r, 400))
        const vid = videoRef.current
        const stream = (vid as any)?.srcObject as MediaStream | null
        streamRef.current = stream
        const track = stream?.getVideoTracks()[0]
        const caps = (track as any)?.getCapabilities?.() as any
        setTorchSupported(!!caps?.torch)
      }
    } catch (err: any) {
      if (stopped.v) return
      setErrorMsg(err?.message || 'Camera error')
      onFail?.()
    }
  }, [onFail])

  useEffect(() => {
    if (isNativeScannerAvailable()) {
      scanBarcode().then((result) => {
        if (result) {
          onDetected(result.value);
        } else {
          onFail?.();
        }
        onClose();
      });
      return;
    }

    const stopped = { v: false }
    startCamera('environment', stopped)
    return () => {
      stopped.v = true
      try { controlsRef.current?.stop() } catch { /* ignore */ }
      try { streamRef.current?.getTracks().forEach(t => t.stop()) } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startCamera])

  const handleFlipCamera = async () => {
    const next: FacingMode = facing === 'environment' ? 'user' : 'environment'
    setFacing(next)
    const stopped = { v: false }
    await startCamera(next, stopped)
  }

  const handleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    try {
      await (track as any).applyConstraints({ advanced: [{ torch: !torchOn }] })
      setTorchOn(t => !t)
    } catch { /* torch not supported on this device */ }
  }

  const handleUseVin = () => {
    if (!pendingVin) return
    const cleaned = sanitizeVin(pendingVin)
    onDetected(isLikelyVin(cleaned) ? cleaned : pendingVin)
    setPendingVin('')
    setPendingVinMeta(null)
  }

  const handleDismiss = () => {
    setPendingVin('')
    setPendingVinMeta(null)
    lastVinRef.current = { vin: '', ts: 0 }
  }

  const vinModalOpen = !!pendingVin

  return (
    <div className="sc-overlay">
      <video ref={videoRef} className="sc-video" playsInline muted autoPlay />

      {/* aim box with dark surround */}
      <div className={`sc-aim ${vinModalOpen ? 'sc-aim--found' : ''}`}>
        <span className="sc-corner sc-corner--tl" />
        <span className="sc-corner sc-corner--tr" />
        <span className="sc-corner sc-corner--bl" />
        <span className="sc-corner sc-corner--br" />
        {!vinModalOpen && <div className="sc-scanline" />}
      </div>

      {/* hint below aim box */}
      {!vinModalOpen && (
        <div className="sc-hint">Align VIN barcode inside the frame</div>
      )}

      {/* top bar */}
      <div className="sc-topbar">
        <button type="button" className="sc-icon-btn" onClick={onClose} aria-label="Close">
          <IconClose />
        </button>
        <span className="sc-title">Scan VIN</span>
        <div style={{ width: 40 }} />
      </div>

      {/* bottom controls — always rendered, torch hidden if not supported */}
      <div className="sc-bottombar">
        <button
          type="button"
          className={`sc-ctrl-btn ${torchOn ? 'sc-ctrl-btn--active' : ''} ${!torchSupported ? 'sc-ctrl-btn--hidden' : ''}`}
          onClick={handleTorch}
          aria-label="Toggle flashlight"
        >
          {torchOn ? <IconFlashOn /> : <IconFlashOff />}
          <span className="sc-ctrl-label">{torchOn ? 'Flash On' : 'Flash'}</span>
        </button>

        <button
          type="button"
          className="sc-ctrl-btn"
          onClick={handleFlipCamera}
          aria-label="Flip camera"
        >
          <IconFlip />
          <span className="sc-ctrl-label">Flip</span>
        </button>
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
                {pendingVinMeta.checksumOk ? '✓ Checksum verified' : '~ Pattern match only'}
              </div>
            )}
          </div>
          <div className="sc-result-actions">
            <button type="button" className="sc-result-primary" onClick={handleUseVin}>Use VIN</button>
            <button type="button" className="sc-result-secondary" onClick={handleDismiss}>Scan Again</button>
          </div>
        </div>
      )}

      <style>{`
        .sc-overlay {
          position: fixed; inset: 0; z-index: 2200;
          background: #000; overflow: hidden;
          display: flex; flex-direction: column;
        }
        .sc-video {
          position: absolute; inset: 0;
          width: 100%; height: 100%; object-fit: cover;
        }

        /* ── aim box ── */
        .sc-aim {
          position: absolute;
          top: 38%; left: 50%;
          transform: translate(-50%, -50%);
          width: min(88vw, 400px);
          height: clamp(70px, 20vw, 110px);
          box-shadow: 0 0 0 9999px rgba(0,0,0,0.6);
          border-radius: 8px;
          z-index: 1;
        }
        .sc-aim--found {
          box-shadow: 0 0 0 9999px rgba(0,0,0,0.6), 0 0 0 3px #22c55e;
        }
        .sc-corner {
          position: absolute; width: 24px; height: 24px;
          border-color: #60a5fa; border-style: solid;
        }
        .sc-corner--tl { top: -2px; left: -2px; border-width: 3px 0 0 3px; border-radius: 4px 0 0 0; }
        .sc-corner--tr { top: -2px; right: -2px; border-width: 3px 3px 0 0; border-radius: 0 4px 0 0; }
        .sc-corner--bl { bottom: -2px; left: -2px; border-width: 0 0 3px 3px; border-radius: 0 0 0 4px; }
        .sc-corner--br { bottom: -2px; right: -2px; border-width: 0 3px 3px 0; border-radius: 0 0 4px 0; }
        .sc-scanline {
          position: absolute; left: 4px; right: 4px; height: 2px;
          background: linear-gradient(90deg, transparent, #3b82f6, #93c5fd, #3b82f6, transparent);
          animation: sc-scan 1.6s ease-in-out infinite;
          border-radius: 1px;
        }
        @keyframes sc-scan {
          0%   { top: 2px; opacity: 0.9; }
          50%  { opacity: 0.6; }
          100% { top: calc(100% - 4px); opacity: 0.9; }
        }

        /* ── hint ── */
        .sc-hint {
          position: absolute;
          top: calc(38% + clamp(35px, 10vw, 55px) + 14px);
          left: 50%; transform: translateX(-50%);
          color: rgba(255,255,255,0.8);
          font-size: 0.8rem; white-space: nowrap;
          text-shadow: 0 1px 6px rgba(0,0,0,0.9);
          z-index: 2; pointer-events: none;
          letter-spacing: 0.01em;
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

        /* ── bottom controls ── */
        .sc-bottombar {
          position: absolute; bottom: 0; left: 0; right: 0;
          display: flex; align-items: flex-end; justify-content: space-around;
          padding: 20px 40px;
          padding-bottom: max(env(safe-area-inset-bottom), 28px);
          background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);
          z-index: 10;
        }
        .sc-ctrl-btn {
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 16px;
          padding: 14px 20px;
          color: #fff; cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          min-width: 72px;
          transition: background 0.15s;
        }
        .sc-ctrl-btn:active { background: rgba(255,255,255,0.3); }
        .sc-ctrl-btn--active {
          background: rgba(251,191,36,0.2);
          border-color: rgba(251,191,36,0.5);
        }
        .sc-ctrl-btn--hidden { opacity: 0; pointer-events: none; }
        .sc-ctrl-label {
          font-size: 0.7rem; font-weight: 600;
          color: rgba(255,255,255,0.85);
          letter-spacing: 0.02em;
        }

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
