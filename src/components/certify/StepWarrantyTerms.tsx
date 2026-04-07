import { useEffect } from 'react'
import { Shield, Calendar } from 'lucide-react'
import type { BusinessType } from '@/lib/types'
import { WARRANTY_DURATION_OPTIONS, DEFAULT_VOID_CONDITIONS, MECHANICAL_MILEAGE_CAPS } from '@/lib/warranty-constants'

interface Props {
  businessType: BusinessType
  serviceDate: string
  setServiceDate: (d: string) => void
  durationMonths: number | null
  setDurationMonths: (m: number) => void
  mileageCap: number | null
  setMileageCap: (m: number | null) => void
  odometerAtService: number | null
  setOdometerAtService: (o: number | null) => void
  voidConditions: string[]
  setVoidConditions: (c: string[]) => void
}

const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all'

export default function StepWarrantyTerms({
  businessType, serviceDate, setServiceDate,
  durationMonths, setDurationMonths,
  mileageCap, setMileageCap,
  odometerAtService, setOdometerAtService,
  voidConditions, setVoidConditions,
}: Props) {
  const options = WARRANTY_DURATION_OPTIONS[businessType] || []
  const requiresOdometer = businessType === 'MECHANICAL' || businessType === 'WHEELS_TIRES' || businessType === 'CERAMIC_COATING'

  // Auto-populate void conditions when business type changes
  useEffect(() => {
    if (voidConditions.length === 0) {
      setVoidConditions(DEFAULT_VOID_CONDITIONS[businessType] || [])
    }
  }, [businessType])

  // Auto-set mileage cap for mechanical
  useEffect(() => {
    if (businessType === 'MECHANICAL' && durationMonths) {
      const cap = MECHANICAL_MILEAGE_CAPS[durationMonths]
      if (cap) setMileageCap(cap)
    }
  }, [businessType, durationMonths])

  // Compute expiry
  const computedExpiry = (() => {
    if (!serviceDate || !durationMonths) return null
    const d = new Date(serviceDate)
    d.setMonth(d.getMonth() + durationMonths)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  })()

  return (
    <div className="space-y-5">
      {/* Service Date */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
          <Calendar size={16} className="text-red-600" /> Service Date
        </h3>
        <input
          type="date"
          value={serviceDate}
          onChange={e => setServiceDate(e.target.value)}
          className={`${inputClass} max-w-xs`}
        />
      </div>

      {/* Duration Picker */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
          <Shield size={16} className="text-red-600" /> Warranty Duration
        </h3>
        <div className="flex flex-wrap gap-2">
          {options.map(opt => (
            <button
              key={opt.months}
              onClick={() => setDurationMonths(opt.months)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                durationMonths === opt.months
                  ? 'bg-red-600 text-white shadow-sm shadow-red-700/20'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {computedExpiry && (
          <p className="text-xs text-zinc-500 mt-2">
            Warranty expires: <span className="font-medium text-zinc-700">{computedExpiry}</span>
            {mileageCap && (
              <span> or at <span className="font-medium text-zinc-700">{mileageCap.toLocaleString()} miles</span> (whichever comes first)</span>
            )}
          </p>
        )}
      </div>

      {/* Odometer */}
      {requiresOdometer && (
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">Odometer at Service</label>
          <input
            type="number"
            value={odometerAtService || ''}
            onChange={e => setOdometerAtService(e.target.value ? parseInt(e.target.value) : null)}
            placeholder="Current mileage"
            className={`${inputClass} max-w-xs`}
          />
        </div>
      )}

      {/* Mileage Cap (manual for wheels/tires) */}
      {businessType === 'WHEELS_TIRES' && (
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">Mileage Cap (optional)</label>
          <input
            type="number"
            value={mileageCap || ''}
            onChange={e => setMileageCap(e.target.value ? parseInt(e.target.value) : null)}
            placeholder="e.g. 60000"
            className={`${inputClass} max-w-xs`}
          />
        </div>
      )}

      {/* Void Conditions */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 mb-3">Void Conditions</h3>
        <div className="space-y-2">
          {voidConditions.map((cond, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs text-zinc-400 mt-1 shrink-0">{i + 1}.</span>
              <input
                type="text"
                value={cond}
                onChange={e => {
                  const updated = [...voidConditions]
                  updated[i] = e.target.value
                  setVoidConditions(updated)
                }}
                className={`${inputClass} text-xs`}
              />
              <button
                onClick={() => setVoidConditions(voidConditions.filter((_, idx) => idx !== i))}
                className="text-xs text-red-500 hover:text-red-700 shrink-0 mt-2"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={() => setVoidConditions([...voidConditions, ''])}
            className="text-xs text-red-600 hover:text-red-700 font-medium"
          >
            + Add condition
          </button>
        </div>
      </div>
    </div>
  )
}
