import { useState } from 'react'
import { Car, ScanLine, Loader2, Search } from 'lucide-react'
import { decodeVin, isLikelyVin } from '@/lib/utils'

interface VehicleData {
  vin: string
  year: string
  make: string
  model: string
  color: string
  license_plate: string
}

interface Props {
  value: VehicleData
  onChange: (v: VehicleData) => void
  onScanClick: () => void
}

const inputClass = 'w-full px-3.5 py-3 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10 transition-all'

export default function VehicleForm({ value, onChange, onScanClick }: Props) {
  const [decoding, setDecoding] = useState(false)
  const [decodeError, setDecodeError] = useState('')

  const set = (field: keyof VehicleData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [field]: e.target.value })

  const handleVinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, vin: e.target.value.toUpperCase() })
    setDecodeError('')
  }

  const handleDecodeVin = async () => {
    const vin = value.vin.trim()
    if (!isLikelyVin(vin)) { setDecodeError('Enter a valid 17-character VIN'); return }
    setDecoding(true)
    setDecodeError('')
    try {
      const info = await decodeVin(vin)
      if (info) {
        onChange({ ...value, year: info.year, make: info.make, model: info.model })
      } else {
        setDecodeError('VIN not found in NHTSA database')
      }
    } catch {
      setDecodeError('Decode failed — check VIN and try again')
    } finally {
      setDecoding(false)
    }
  }

  // Single smart button: scan when empty, decode when typing
  const isTyping = value.vin.length > 0
  const canDecode = value.vin.length === 17

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-zinc-800 flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center">
          <Car size={13} className="text-red-600" />
        </div>
        Vehicle Information
      </h3>

      {/* VIN row — input + single smart button */}
      <div className="mb-4">
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">VIN</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={value.vin}
            onChange={handleVinChange}
            placeholder="17-CHARACTER VIN..."
            maxLength={17}
            className={`${inputClass} flex-1 min-w-0 font-mono uppercase`}
          />
          {!isTyping ? (
            /* Scan button */
            <button
              type="button"
              onClick={onScanClick}
              className="shrink-0 flex items-center gap-1.5 px-4 py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm shadow-red-700/20 active:opacity-90 transition-all"
            >
              <ScanLine size={15} />
              Scan
            </button>
          ) : (
            /* Decode button */
            <button
              type="button"
              onClick={handleDecodeVin}
              disabled={decoding || !canDecode}
              className="shrink-0 flex items-center gap-1.5 px-4 py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm shadow-red-700/20 active:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {decoding
                ? <Loader2 size={14} className="animate-spin" />
                : <><Search size={14} /> Check</>
              }
            </button>
          )}
        </div>
        {/* VIN length indicator when typing */}
        {isTyping && !decodeError && (
          <p className={`text-[11px] mt-1.5 font-medium ${canDecode ? 'text-emerald-500' : 'text-zinc-400'}`}>
            {canDecode ? '✓ 17 characters — tap Check to decode' : `${value.vin.length}/17 characters`}
          </p>
        )}
        {decodeError && <p className="text-[11px] text-red-500 mt-1.5">{decodeError}</p>}
      </div>

      {/* Year / Make / Model */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Year</label>
          <input type="text" value={value.year} onChange={set('year')} placeholder="2020" className={inputClass} />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Make</label>
          <input type="text" value={value.make} onChange={set('make')} placeholder="Toyota" className={inputClass} />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Model</label>
          <input type="text" value={value.model} onChange={set('model')} placeholder="Camry" className={inputClass} />
        </div>
      </div>

      {/* Color / Plate */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Color</label>
          <input type="text" value={value.color} onChange={set('color')} placeholder="White" className={inputClass} />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">License Plate</label>
          <input type="text" value={value.license_plate} onChange={set('license_plate')} placeholder="ABC-1234" className={`${inputClass} uppercase`} />
        </div>
      </div>
    </div>
  )
}
