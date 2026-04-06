import { formatCurrency } from '@/lib/utils'
import { DIFFICULTY_LABELS } from '@/lib/types'
import { Wrench, DollarSign, Hammer } from 'lucide-react'

interface Props {
  partCost: number | null
  laborCost: number | null
  miscCost: number | null
  totalCost: number | null
  difficulty: number | null
}

export default function RepairCostCompare({ partCost, laborCost, miscCost, totalCost, difficulty }: Props) {
  const diyCost = partCost ?? 0
  const proCost = totalCost ?? 0
  const savings = proCost - diyCost

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* DIY Card */}
      <div className="glass rounded-2xl overflow-hidden border border-emerald-200">
        <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-green-500" />
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Hammer size={16} className="text-emerald-600" />
            <h4 className="text-sm font-bold text-zinc-900">DIY</h4>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Parts</span>
              <span className="font-semibold text-zinc-800">
                {partCost != null ? formatCurrency(partCost) : '--'}
              </span>
            </div>

            <div className="border-t border-zinc-100 pt-2 flex justify-between">
              <span className="font-bold text-zinc-700">Total</span>
              <span className="font-bold text-zinc-900">
                {partCost != null ? formatCurrency(diyCost) : '--'}
              </span>
            </div>
          </div>

          {/* Difficulty indicator */}
          {difficulty != null && (
            <div className="mt-3 pt-3 border-t border-zinc-100">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">
                Difficulty
              </p>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(level => (
                    <div
                      key={level}
                      className={`w-4 h-1.5 rounded-full ${
                        level <= difficulty
                          ? difficulty >= 4
                            ? 'bg-red-400'
                            : difficulty >= 3
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          : 'bg-zinc-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-zinc-500">
                  {DIFFICULTY_LABELS[difficulty]}
                </span>
              </div>
            </div>
          )}

          {/* Savings callout */}
          {savings > 0 && partCost != null && totalCost != null && (
            <div className="mt-3 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <p className="text-xs text-emerald-600 font-semibold">
                Save {formatCurrency(savings)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Professional Card */}
      <div className="glass rounded-2xl overflow-hidden border border-blue-200">
        <div className="h-1.5 bg-gradient-to-r from-blue-400 to-blue-600" />
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wrench size={16} className="text-blue-600" />
            <h4 className="text-sm font-bold text-zinc-900">Professional</h4>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Parts</span>
              <span className="text-zinc-700">
                {partCost != null ? formatCurrency(partCost) : '--'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Labor</span>
              <span className="text-zinc-700">
                {laborCost != null ? formatCurrency(laborCost) : '--'}
              </span>
            </div>
            {miscCost != null && miscCost > 0 && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Misc</span>
                <span className="text-zinc-700">{formatCurrency(miscCost)}</span>
              </div>
            )}

            <div className="border-t border-zinc-100 pt-2 flex justify-between">
              <span className="font-bold text-zinc-700">Total</span>
              <span className="font-bold text-zinc-900">
                {totalCost != null ? formatCurrency(totalCost) : '--'}
              </span>
            </div>
          </div>

          {/* Pro benefit note */}
          <div className="mt-3 pt-3 border-t border-zinc-100">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <DollarSign size={10} />
              <span>Includes warranty &amp; expertise</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
