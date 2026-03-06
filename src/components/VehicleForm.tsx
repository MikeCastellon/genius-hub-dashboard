import { useState } from 'react'
import { Car, ScanLine, Loader2 } from 'lucide-react'
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

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10 transition-all'

export default function VehicleForm({ value, onChange, onScanClick }: Props) {
  const [decoding, setDecoding] = useState(false)
  const [decodeError, setDecodeError] = useState('')

  const set = (field: keyof VehicleData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [field]: e.target.value })

  const handleVinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vin = e.target.value.toUpperCase()
    onChange({ ...value, vin })
    setDecodeError('')
  }

  const handleDecodeVin = async () => {
    const vin = value.vin.trim()
    if (!isLikelyVin(vin)) {
      setDecodeError('Enter a valid 17-character VIN first')
      return
    }
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
      setDecodeError('Decode failed. Check VIN and try again.')
    } finally {
      setDecoding(false)
    }
  }

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-zinc-800 flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
          <Car size={13} className="text-blue-500" />
        </div>
        Vehicle Information
      </h3>

      {/* VIN Row */}
      <div className="mb-3">
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">VIN</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={value.vin}
            onChange={handleVinChange}
            placeholder="17-character VIN..."
            maxLength={17}
            className={`${inputClass} flex-1 font-mono uppercase`}
          />
          <button
            type="button"
            onClick={onScanClick}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-colors shrink-0"
          >
            <ScanLine size={14} />
            <span className="hidden sm:inline">Scan</span>
          </button>
          <button
            type="button"
            onClick={handleDecodeVin}
            disabled={decoding || value.vin.length !== 17}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-sky-400 text-white text-xs font-semibold hover:shadow-md hover:shadow-blue-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {decoding ? <Loader2 size={13} className="animate-spin" /> : 'Decode'}
          </button>
        </div>
        {decodeError && <p className="text-[11px] text-red-500 mt-1">{decodeError}</p>}
      </div>

      {/* Year / Make / Model */}
      <div className="grid grid-cols-3 gap-3 mb-3">
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
      <div className="grid grid-cols-2 gap-3">
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
