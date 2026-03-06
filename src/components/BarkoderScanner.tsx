import { useEffect, useRef, useState } from 'react'
import { pickBestVinFromText, isLikelyVin, sanitizeVin } from '@/lib/utils'

interface Props {
  onClose: () => void
  onDetected: (vin: string) => void
  onFail?: () => void
}

export default function BarkoderScanner({ onClose, onDetected, onFail }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<any>(null)
  const videoTrackRef = useRef<MediaStreamTrack | null>(null)
  const onResultRef = useRef<((res: any) => void) | null>(null)
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

  const pickVinFromResult = (res: any): { vin: string; checksumOk: boolean } | null => {
    if (!res) return null
    const text = res.textualData || res.text || res.textual_data || (res.data && res.data.text) || ''
    if (!text) return null
    return pickBestVinFromText(text)
  }

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const envKey = import.meta.env.VITE_BARKODER_KEY || ''
        if (!envKey) {
          setErrorMsg('Scanner not configured (missing license key).')
          onFail?.()
          return
        }

        let BarkoderSDKMod: any = null
        try {
          const mod = await import('barkoder-wasm')
          BarkoderSDKMod = (mod as any)?.default || mod
        } catch {
          BarkoderSDKMod = (window as any).BarkoderSDK || (window as any).Barkoder || null
        }

        if (!BarkoderSDKMod) throw new Error('Barkoder SDK not found')

        const Barkoder = await BarkoderSDKMod.initialize(envKey)
        if (cancelled) return

        scannerRef.current = Barkoder

        if (containerRef.current) {
          containerRef.current.id = containerRef.current.id || 'barkoder-container'
          containerRef.current.style.width = containerRef.current.style.width || '100%'
          containerRef.current.style.height = containerRef.current.style.height || '100%'
        }

        try {
          if (typeof Barkoder.setCameraPosition === 'function') Barkoder.setCameraPosition('back')
          else if (typeof Barkoder.setCameraFacingMode === 'function') Barkoder.setCameraFacingMode('environment')

          if (typeof Barkoder.setCameraSwitchVisibility === 'function') Barkoder.setCameraSwitchVisibility(false)
          if (typeof Barkoder.setCloseButtonVisibility === 'function') Barkoder.setCloseButtonVisibility(false)
        } catch { /* ignore */ }

        try {
          const C = Barkoder.constants || BarkoderSDKMod.constants || {}
          const D = C.Decoders || C.BarcodeType || {}
          const decoders = [D.Code39, D.Code128, D.DataMatrix, D.PDF417, D.QR].filter(v => typeof v !== 'undefined')
          if (decoders.length && typeof Barkoder.setEnabledDecoders === 'function') {
            Barkoder.setEnabledDecoders(...decoders)
          } else if (typeof Barkoder.setBarcodeTypeEnabled === 'function') {
            decoders.forEach((t: any) => Barkoder.setBarcodeTypeEnabled(t, true))
          }
        } catch { /* ignore */ }

        const onResult = async (res: any) => {
          try {
            const best = pickVinFromResult(res)
            if (!best?.vin) return

            const now = Date.now()
            if (lastVinRef.current.vin === best.vin && now - lastVinRef.current.ts < 1500) return
            lastVinRef.current = { vin: best.vin, ts: now }

            setPendingVin(best.vin)
            setPendingVinMeta({ checksumOk: !!best.checksumOk })
          } catch { /* ignore */ }
        }

        onResultRef.current = onResult

        try {
          Barkoder.startScanner(onResult)
        } catch (e: any) {
          setErrorMsg('Scanner start failed: ' + (e?.message || String(e)))
        }

        ;(function pollForTrack(attempts = 30) {
          const videoEl = containerRef.current?.querySelector('video')
          const stream = (videoEl as HTMLVideoElement & { srcObject: MediaStream })?.srcObject
          const track = stream?.getVideoTracks?.()[0]
          if (track) { videoTrackRef.current = track; return }
          if (attempts > 0) setTimeout(() => pollForTrack(attempts - 1), 250)
        })()
      } catch (err: any) {
        setErrorMsg('Init failed: ' + (err?.message || String(err)))
        onFail?.()
      }
    })()

    return () => {
      cancelled = true
      try { scannerRef.current?.stopScanner?.() } catch { /* ignore */ }
      try { videoTrackRef.current?.stop?.() } catch { /* ignore */ }
    }
  }, [onFail])

  const handleUseVin = () => {
    if (!pendingVin) return
    const cleaned = sanitizeVin(pendingVin)
    if (isLikelyVin(cleaned)) {
      onDetected(cleaned)
    } else {
      onDetected(pendingVin)
    }
    setPendingVin('')
    setPendingVinMeta(null)
  }

  const handleDismiss = async () => {
    setPendingVin('')
    setPendingVinMeta(null)
    lastVinRef.current = { vin: '', ts: 0 }
    try {
      const Barkoder = scannerRef.current
      if (Barkoder && onResultRef.current) {
        try { Barkoder.stopScanner?.() } catch { /* ignore */ }
        await new Promise(r => setTimeout(r, 150))
        Barkoder.startScanner?.(onResultRef.current)
      }
    } catch { /* ignore */ }
  }

  const vinModalOpen = !!pendingVin

  return (
    <div className={`scanner-overlay ${vinModalOpen ? 'scanner-overlay--blur' : ''}`}>
      <div className={`scanner-box ${vinModalOpen ? 'scanner-box--blurred' : ''}`}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        {errorMsg && (
          <div style={{
            position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)', color: 'white', padding: '0.5rem',
            fontSize: '0.7rem', maxWidth: '90%', borderRadius: 6, textAlign: 'center',
          }}>
            {errorMsg}
          </div>
        )}
        <button className="scanner-close" type="button" onClick={onClose}>
          Close
        </button>
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
        .barkoder-close, .barkoder-close-button, .barkoder-camera-switch,
        .barkoder-camera-switch-button { display: none !important; }
      `}</style>
    </div>
  )
}
