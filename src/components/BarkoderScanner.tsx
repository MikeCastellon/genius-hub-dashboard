import { useEffect, useRef, useState, useCallback } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library'
import { pickBestVinFromText, isLikelyVin, sanitizeVin } from '@/lib/utils'

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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L4.09 13H11L10 22L19.91 11H13L13 2Z" />
    </svg>
  )
}

function IconFlashOff() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M13 2L4.09 13H11L10 22L19.91 11H13L13 2Z" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  )
}

function IconFlip() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="2" />
      <path d="M18 3l3 4-3 4" /><path d="M6 3L3 7l3 4" />
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

export default function BarkoderScanner({ onClose, onDetected, onFail }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastVinRef = useRef({ vin: '', ts: 0 })

  const [errorMsg, setErrorMsg] = useState('')
  const [pendingVin, setPendingVin] = useState('')
  const [pendingVinMeta, setPendingVinMeta] = useState<{ checksumOk: boolean } | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia('(max-width: 640px)').matches)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const startCamera = useCallback(async (deviceId: string, stopped: { v: boolean }) => {
    try {
      controlsRef.current?.stop()

      const reader = new BrowserMultiFormatReader(HINTS, { delayBetweenScanAttempts: 150 })

      const controls = await reader.decodeFromVideoDevice(deviceId, videoRef.current!, (result, err) => {
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
      })

      if (!stopped.v) {
        controlsRef.current = controls
        // grab stream for torch
        const video = videoRef.current
        const stream = (video as any)?.srcObject as MediaStream | null
        streamRef.current = stream
        const track = stream?.getVideoTracks()[0]
        const caps = (track as any)?.getCapabilities?.()
        setTorchSupported(!!(caps as any)?.torch)
        setTorchOn(false)
      }
    } catch (err: any) {
      if (stopped.v) return
      setErrorMsg(err?.message || 'Camera error')
      onFail?.()
    }
  }, [onFail])

  useEffect(() => {
    const stopped = { v: false }
    ;(async () => {
      const list = await BrowserMultiFormatReader.listVideoInputDevices()
      if (!list.length) { setErrorMsg('No camera found'); onFail?.(); return }
      setDevices(list)
      // prefer back camera
      const backIdx = list.findIndex(d => /back|rear|environment/i.test(d.label))
      const idx = backIdx >= 0 ? backIdx : list.length - 1
      setActiveIdx(idx)
      await startCamera(list[idx].deviceId, stopped)
    })()
    return () => {
      stopped.v = true
      try { controlsRef.current?.stop() } catch { /* ignore */ }
    }
  }, [startCamera, onFail])

  const handleFlipCamera = async () => {
    if (devices.length < 2) return
    const nextIdx = (activeIdx + 1) % devices.length
    setActiveIdx(nextIdx)
    setTorchOn(false)
    const stopped = { v: false }
    await startCamera(devices[nextIdx].deviceId, stopped)
  }

  const handleTorch = async () => {
    const stream = streamRef.current
    const track = stream?.getVideoTracks()[0]
    if (!track) return
    try {
      await (track as any).applyConstraints({ advanced: [{ torch: !torchOn }] })
      setTorchOn(t => !t)
    } catch { /* torch not supported */ }
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
      {/* full-screen camera */}
      <video ref={videoRef} className="sc-video" playsInline muted />

      {/* dark vignette cutout — top, bottom, left, right around the aim box */}
      <div className="sc-vignette" />

      {/* aim box */}
      <div className={`sc-aim ${vinModalOpen ? 'sc-aim--found' : ''}`}>
        {/* corner brackets */}
        <span className="sc-corner sc-corner--tl" />
        <span className="sc-corner sc-corner--tr" />
        <span className="sc-corner sc-corner--bl" />
        <span className="sc-corner sc-corner--br" />
        {/* scan line */}
        {!vinModalOpen && <div className="sc-scanline" />}
      </div>

      {/* hint text */}
      {!vinModalOpen && (
        <div className="sc-hint">Align VIN barcode inside the frame</div>
      )}

      {/* top bar */}
      <div className="sc-topbar">
        <button type="button" className="sc-icon-btn" onClick={onClose} aria-label="Close">
          <IconClose />
        </button>
        <span className="sc-title">Scan VIN</span>
        <div style={{ width: 36 }} />
      </div>

      {/* bottom controls */}
      <div className="sc-bottombar">
        {torchSupported ? (
          <button type="button" className={`sc-icon-btn sc-icon-btn--lg ${torchOn ? 'sc-icon-btn--active' : ''}`} onClick={handleTorch} aria-label="Toggle flashlight">
            {torchOn ? <IconFlashOn /> : <IconFlashOff />}
          </button>
        ) : <div style={{ width: 48 }} />}

        {devices.length > 1 ? (
          <button type="button" className="sc-icon-btn sc-icon-btn--lg" onClick={handleFlipCamera} aria-label="Flip camera">
            <IconFlip />
          </button>
        ) : <div style={{ width: 48 }} />}
      </div>

      {/* error */}
      {errorMsg && (
        <div className="sc-error">{errorMsg}</div>
      )}

      {/* VIN result sheet */}
      {vinModalOpen && (
        <div className={`sc-result ${!isMobile ? 'sc-result--center' : ''}`}>
          <div>
            <div className="sc-result-label">Detected VIN</div>
            <div className="sc-result-value">{pendingVin}</div>
            {pendingVinMeta && (
              <div className="sc-result-meta">
                {pendingVinMeta.checksumOk
                  ? '✓ Checksum verified'
                  : '~ Pattern match only'}
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
        }
        .sc-video {
          position: absolute; inset: 0;
          width: 100%; height: 100%; object-fit: cover;
        }
        /* dark overlay around aim box via clip path shadow */
        .sc-vignette {
          position: absolute; inset: 0; pointer-events: none;
          background: rgba(0,0,0,0.55);
          /* punched out by aim box via mix-blend — we'll use box-shadow on aim instead */
        }
        /* aim box */
        .sc-aim {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -60%);
          width: min(80vw, 420px);
          height: min(18vw, 100px);
          box-shadow: 0 0 0 9999px rgba(0,0,0,0.55);
          border-radius: 6px;
          transition: box-shadow 0.2s;
        }
        .sc-aim--found {
          box-shadow: 0 0 0 9999px rgba(0,0,0,0.55), 0 0 0 3px #22c55e;
        }
        /* corner brackets */
        .sc-corner {
          position: absolute; width: 22px; height: 22px;
          border-color: #60a5fa; border-style: solid;
        }
        .sc-corner--tl { top: -2px; left: -2px; border-width: 3px 0 0 3px; border-radius: 4px 0 0 0; }
        .sc-corner--tr { top: -2px; right: -2px; border-width: 3px 3px 0 0; border-radius: 0 4px 0 0; }
        .sc-corner--bl { bottom: -2px; left: -2px; border-width: 0 0 3px 3px; border-radius: 0 0 0 4px; }
        .sc-corner--br { bottom: -2px; right: -2px; border-width: 0 3px 3px 0; border-radius: 0 0 4px 0; }
        /* animated scan line */
        .sc-scanline {
          position: absolute; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, #3b82f6, #60a5fa, #3b82f6, transparent);
          animation: sc-scan 1.6s ease-in-out infinite;
          border-radius: 1px;
        }
        @keyframes sc-scan {
          0% { top: 0; opacity: 1; }
          50% { opacity: 0.7; }
          100% { top: calc(100% - 2px); opacity: 1; }
        }
        /* hint */
        .sc-hint {
          position: absolute;
          top: calc(50% - 60px + min(9vw, 50px) + 18px);
          left: 50%; transform: translateX(-50%);
          color: rgba(255,255,255,0.75);
          font-size: 0.78rem; white-space: nowrap;
          text-shadow: 0 1px 4px rgba(0,0,0,0.8);
          pointer-events: none;
        }
        /* top bar */
        .sc-topbar {
          position: absolute; top: 0; left: 0; right: 0;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.6rem 0.75rem;
          background: linear-gradient(to bottom, rgba(0,0,0,0.6), transparent);
        }
        .sc-title {
          color: #fff; font-size: 1rem; font-weight: 600;
          letter-spacing: 0.01em;
        }
        /* icon buttons */
        .sc-icon-btn {
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(255,255,255,0.15);
          border: 1px solid rgba(255,255,255,0.2);
          color: #fff; display: grid; place-items: center;
          cursor: pointer; transition: background 0.15s;
        }
        .sc-icon-btn:hover { background: rgba(255,255,255,0.25); }
        .sc-icon-btn--lg { width: 48px; height: 48px; }
        .sc-icon-btn--active {
          background: rgba(250,204,21,0.25);
          border-color: rgba(250,204,21,0.6);
          color: #fbbf24;
        }
        /* bottom bar */
        .sc-bottombar {
          position: absolute; bottom: 0; left: 0; right: 0;
          display: flex; align-items: center; justify-content: space-around;
          padding: 1.2rem 2rem 2rem;
          background: linear-gradient(to top, rgba(0,0,0,0.65), transparent);
        }
        /* error */
        .sc-error {
          position: absolute; bottom: 5.5rem; left: 50%; transform: translateX(-50%);
          background: rgba(220,38,38,0.85); color: #fff;
          padding: 0.4rem 0.9rem; border-radius: 8px;
          font-size: 0.75rem; max-width: 90%; text-align: center;
        }
        /* result sheet */
        .sc-result {
          position: fixed; left: 50%; bottom: 0; transform: translateX(-50%);
          width: min(680px, 100vw);
          background: #fff; color: #0f172a;
          border-radius: 16px 16px 0 0;
          box-shadow: 0 -8px 40px rgba(0,0,0,0.35);
          padding: 1.1rem 1.2rem 2rem;
          z-index: 2300;
          display: flex; flex-direction: column; gap: 1rem;
        }
        .sc-result--center {
          bottom: auto; top: 50%;
          transform: translate(-50%, -50%);
          border-radius: 16px;
          padding: 1.4rem 1.4rem 1.4rem;
          width: min(480px, 92vw);
          box-shadow: 0 14px 50px rgba(0,0,0,0.4);
        }
        .sc-result-label {
          font-size: 0.7rem; text-transform: uppercase;
          color: #6b7280; letter-spacing: 0.06em;
        }
        .sc-result-value {
          font-family: ui-monospace, monospace;
          font-size: 1.05rem; font-weight: 600;
          word-break: break-all; margin-top: 4px; color: #0f172a;
        }
        .sc-result-meta {
          margin-top: 4px; font-size: 0.78rem; color: #16a34a;
        }
        .sc-result-actions { display: flex; gap: 0.5rem; }
        .sc-result-primary, .sc-result-secondary {
          height: 42px; font-size: 0.92rem; padding: 0 1rem;
          cursor: pointer; font-weight: 700; border-radius: 10px;
          border: none;
        }
        .sc-result-primary {
          flex: 1; background: #2563eb; color: #fff;
        }
        .sc-result-primary:hover { background: #1d4ed8; }
        .sc-result-secondary {
          background: #f1f5f9; color: #0f172a; min-width: 120px;
        }
        .sc-result-secondary:hover { background: #e2e8f0; }
      `}</style>
    </div>
  )
}
