import { useState } from 'react'
import { callRepairsCarMD } from '@/lib/store'
import {
  Vehicle,
  RepairPart,
  DTC_CODE_PATTERN,
  URGENCY_LABELS,
  URGENCY_COLORS,
  DIFFICULTY_LABELS,
} from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import {
  Search,
  Loader2,
  Star,
  Clock,
  ShoppingCart,
  AlertTriangle,
  Package,
  Sparkles,
} from 'lucide-react'
import RepairCostCompare from './RepairCostCompare'

interface Props {
  vehicle: Vehicle
  onOrderParts: (partName: string) => void
  onGenerateGuide?: (repairDesc: string, dtcCode: string) => void
}

interface DiagResult {
  dtc_code: string
  description: string
  urgency: number | null
  urgency_desc: string | null
  difficulty: number | null
  labor_hours: number | null
  part_cost: number | null
  labor_cost: number | null
  misc_cost: number | null
  total_cost: number | null
  parts: RepairPart[]
  repair_desc: string | null
}

export default function DiagnosticsTool({ vehicle, onOrderParts, onGenerateGuide }: Props) {
  const [dtcCode, setDtcCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DiagResult | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  const handleInputChange = (value: string) => {
    const upper = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    setDtcCode(upper)
    setError(null)
  }

  const handleDiagnose = async () => {
    if (!dtcCode) {
      setError('Enter a DTC code')
      return
    }
    if (!DTC_CODE_PATTERN.test(dtcCode)) {
      setError('Invalid DTC format. Must be like P0420, B1234, C0001, or U0100')
      return
    }

    setLoading(true)
    setApiError(null)
    setResult(null)

    try {
      const [diagRes, repairRes] = await Promise.all([
        callRepairsCarMD({
          action: 'diag',
          vin: vehicle.vin,
          mileage: vehicle.mileage ?? undefined,
          dtc: dtcCode,
        }),
        callRepairsCarMD({
          action: 'repair',
          vin: vehicle.vin,
          mileage: vehicle.mileage ?? undefined,
          dtc: dtcCode,
        }),
      ])

      setResult({
        dtc_code: dtcCode,
        description: diagRes?.description || `Diagnostic code ${dtcCode}`,
        urgency: diagRes?.urgency ?? repairRes?.urgency ?? null,
        urgency_desc: diagRes?.urgency_desc ?? repairRes?.urgency_desc ?? null,
        difficulty: repairRes?.difficulty ?? null,
        labor_hours: repairRes?.labor_hours ?? null,
        part_cost: repairRes?.part_cost ?? null,
        labor_cost: repairRes?.labor_cost ?? null,
        misc_cost: repairRes?.misc_cost ?? null,
        total_cost: repairRes?.total_cost ?? null,
        parts: repairRes?.parts ?? repairRes?.parts_json ?? [],
        repair_desc: repairRes?.description ?? null,
      })
    } catch (err: any) {
      setApiError(err?.message || 'Failed to fetch diagnostic data')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="glass rounded-2xl p-4">
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
          DTC Code
        </label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={dtcCode}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDiagnose()}
              placeholder="e.g. P0420"
              maxLength={5}
              className={`w-full px-3 py-2 rounded-xl border bg-white text-sm font-mono uppercase tracking-wider focus:outline-none transition-colors ${
                error
                  ? 'border-red-300 focus:border-red-400'
                  : 'border-zinc-200 focus:border-red-300'
              }`}
            />
            {error && (
              <p className="absolute -bottom-5 left-0 text-[11px] text-red-500 font-medium">
                {error}
              </p>
            )}
          </div>
          <button
            onClick={handleDiagnose}
            disabled={loading || !dtcCode}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Search size={14} />
            )}
            Diagnose
          </button>
        </div>
      </div>

      {/* API Error */}
      {apiError && (
        <div className="glass rounded-2xl p-4 border border-red-200 bg-red-50/40">
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertTriangle size={14} />
            <span className="font-medium">{apiError}</span>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-red-500" />
            <span className="text-sm text-zinc-500 font-medium">
              Analyzing {dtcCode} for {vehicle.year} {vehicle.make} {vehicle.model}...
            </span>
          </div>
          <div className="space-y-3">
            <div className="h-5 w-3/4 bg-zinc-200 rounded-lg animate-pulse" />
            <div className="h-4 w-1/2 bg-zinc-100 rounded-lg animate-pulse" />
            <div className="h-4 w-2/3 bg-zinc-100 rounded-lg animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-24 bg-zinc-100 rounded-xl animate-pulse" />
              <div className="h-24 bg-zinc-100 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !result && !apiError && (
        <div className="glass rounded-2xl p-8 text-center">
          <Search size={28} className="mx-auto text-zinc-300 mb-3" />
          <p className="text-sm text-zinc-400 font-medium">
            Enter a DTC code to diagnose the issue
          </p>
          <p className="text-xs text-zinc-300 mt-1">
            Supports powertrain (P), body (B), chassis (C), and network (U) codes
          </p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4">
          {/* Main Result Card */}
          <div className="glass rounded-2xl p-5">
            {/* DTC Header */}
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-lg bg-zinc-900 text-white text-xs font-mono font-bold tracking-wider">
                    {result.dtc_code}
                  </span>
                  {result.urgency != null && URGENCY_LABELS[result.urgency] && (
                    <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${URGENCY_COLORS[result.urgency]}`}>
                      {URGENCY_LABELS[result.urgency]}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-zinc-900 mt-2">
                  {result.description}
                </h3>
                {result.repair_desc && result.repair_desc !== result.description && (
                  <p className="text-sm text-zinc-500 mt-1">{result.repair_desc}</p>
                )}
              </div>
            </div>

            {/* Metrics Row */}
            <div className="flex flex-wrap items-center gap-4 mb-4 pb-4 border-b border-zinc-100">
              {/* Difficulty Stars */}
              {result.difficulty != null && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">
                    Difficulty
                  </span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star
                        key={i}
                        size={14}
                        className={
                          i <= result.difficulty!
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'fill-zinc-200 text-zinc-200'
                        }
                      />
                    ))}
                  </div>
                  <span className="text-xs text-zinc-500">
                    {DIFFICULTY_LABELS[result.difficulty]}
                  </span>
                </div>
              )}

              {/* Labor Hours */}
              {result.labor_hours != null && (
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-zinc-400" />
                  <span className="text-xs text-zinc-500">
                    <span className="font-semibold text-zinc-700">{result.labor_hours}</span> labor hrs
                  </span>
                </div>
              )}
            </div>

            {/* Cost Comparison */}
            <RepairCostCompare
              partCost={result.part_cost}
              laborCost={result.labor_cost}
              miscCost={result.misc_cost}
              totalCost={result.total_cost}
              difficulty={result.difficulty}
            />
          </div>

          {/* Parts List */}
          {result.parts.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Package size={12} /> Parts Required ({result.parts.length})
              </p>
              <div className="space-y-2">
                {result.parts.map((part, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 bg-zinc-50 rounded-xl px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-800 truncate">
                        {part.desc}
                      </p>
                      {part.manufacturer && (
                        <p className="text-[11px] text-zinc-400">{part.manufacturer}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-zinc-700">
                          {formatCurrency(part.price)}
                        </p>
                        {Number(part.qty) > 1 && (
                          <p className="text-[11px] text-zinc-400">x{part.qty}</p>
                        )}
                      </div>
                      <button
                        onClick={() => onOrderParts(part.desc)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold transition-colors"
                      >
                        <ShoppingCart size={10} /> Find Parts
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generate AI Guide Button */}
          {onGenerateGuide && (
            <button
              onClick={() =>
                onGenerateGuide(
                  result.repair_desc || result.description,
                  result.dtc_code,
                )
              }
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold transition-all"
            >
              <Sparkles size={16} />
              Generate AI Repair Guide
            </button>
          )}
        </div>
      )}
    </div>
  )
}
