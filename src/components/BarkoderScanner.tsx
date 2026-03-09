import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library'
import { pickBestVinFromText, isLikelyVin, sanitizeVin } from '@/lib/utils'

interface Props {
  onClose: () => void
  onDetected: (vin: string) => void
  onFail?: () => void
}

export default function BarkoderScanner({ onClose, onDetected, onFail }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const lastVinRef = useRef({ vin: '', ts: 0 })

  const [errorMsg, setErrorMsg] = useState('')
  const [pendingVin, setPendingVin] = useState('')
  const [pendingVinMeta, setPendingVinMeta] = useState<{ checksumOk: boolean } | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia('(max-width: 640px)').matches)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    let stopped = false

    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_128,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.PDF_417,
      BarcodeFormat.QR_CODE,
    ])
    hints.set(DecodeHintType.TRY_HARDER, true)

    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 })

    ;(async () => {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices()
        if (!devices.length) throw new Error('No camera found')

        // prefer back/rear camera
        const back = devices.find(d => /back|rear|environment/i.test(d.label)) ?? devices[devices.length - 1]

        if (stopped) return

        const controls = await reader.decodeFromVideoDevice(back.deviceId, videoRef.current!, (result, err) => {
          if (stopped) return
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
        if (!stopped) controlsRef.current = controls
      } catch (err: any) {
        if (stopped) return
        setErrorMsg(err?.message || 'Camera error')
        onFail?.()
      }
    })()

    return () => {
      stopped = true
      try { controlsRef.current?.stop() } catch { /* ignore */ }
    }
  }, [onFail])

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
    <div className={`scanner-overlay ${vinModalOpen ? 'scanner-overlay--blur' : ''}`}>
      <div className={`scanner-box ${vinModalOpen ? 'scanner-box--blurred' : ''}`}>
        <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {errorMsg && (
          <div style={{
            position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)', color: 'white', padding: '0.5rem',
            fontSize: '0.7rem', maxWidth: '90%', borderRadius: 6, textAlign: 'center',
          }}>
            {errorMsg}
          </div>
        )}
        <div className="scanner-aim" />
        <button className="scanner-close" type="button" onClick={onClose}>Close</button>
      </div>

      {vinModalOpen && (
        <div className={`scanner-result-sheet ${!isMobile ? 'scanner-result-sheet--center' : ''}`}>
          <div>
            <div className="scanner-result-label">Detected VIN</div>
            <div className="scanner-result-value">{pendingVin}</div>
            {pendingVinMeta && (
              <div style={{ marginTop: 6, fontSize: '0.8rem', color: '#6b7280' }}>
                {pendingVinMeta.checksumOk ? 'Checksum verified' : 'Pattern match only'}
              </div>
            )}
          </div>
          <div className="scanner-result-actions">
            <button type="button" className="scanner-result-primary" onClick={handleUseVin}>
              Use VIN
            </button>
            <button type="button" className="scanner-result-secondary" onClick={handleDismiss}>
              Scan Again
            </button>
          </div>
        </div>
      )}

      <style>{`
        .scanner-overlay {
          position: fixed; inset: 0; z-index: 2200;
          background: rgba(0,0,0,0.78); display: grid; place-items: center;
        }
        .scanner-overlay--blur { backdrop-filter: blur(4px); }
        .scanner-box {
          position: relative; width: min(900px, 96vw); height: min(720px, 84vh);
          background: #0b1020; border-radius: 12px; overflow: hidden;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .scanner-box--blurred { filter: blur(2px); opacity: 0.6; }
        .scanner-aim {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 72%; height: 18%;
          border: 2px solid rgba(37,99,235,0.8);
          border-radius: 6px;
          box-shadow: 0 0 0 2000px rgba(0,0,0,0.35);
          pointer-events: none;
        }
        .scanner-close {
          position: absolute; top: 10px; right: 10px;
          background: rgba(255,255,255,0.12); color: white;
          border: 1px solid rgba(255,255,255,0.18);
          padding: 0.35rem 0.6rem; cursor: pointer; font-weight: 700; border-radius: 8px;
        }
        .scanner-result-sheet {
          position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%);
          width: min(680px, 92vw); background: #ffffff; color: #0f172a;
          border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.25);
          padding: 0.9rem 1rem; z-index: 2300;
          display: flex; flex-direction: column; gap: 0.9rem; max-height: 170px;
        }
        .scanner-result-sheet--center {
          left: 50%; right: auto; bottom: auto; top: 50%;
          transform: translate(-50%, -50%); width: min(520px, 92vw);
          max-height: none; border: 1px solid rgba(2,6,23,0.12);
          box-shadow: 0 14px 40px rgba(0,0,0,0.28);
        }
        .scanner-result-label { font-size: 0.75rem; text-transform: uppercase; color: #6b7280; letter-spacing: 0.02em; }
        .scanner-result-value { font-family: ui-monospace, monospace; font-size: 1rem; word-break: break-all; margin-top: 6px; }
        .scanner-result-actions { display: flex; gap: 0.5rem; }
        .scanner-result-primary, .scanner-result-secondary {
          height: 35px; font-size: 0.9rem; padding: 0 0.9rem;
          cursor: pointer; font-weight: 700; border-radius: 8px;
          border: 1px solid rgba(2,6,23,0.08);
        }
        .scanner-result-primary { flex: 1; background: #2563eb; border-color: rgba(37,99,235,0.25); color: #fff; }
        .scanner-result-secondary { background: #f3f4f6; color: #0f172a; min-width: 120px; }
      `}</style>
    </div>
  )
}
