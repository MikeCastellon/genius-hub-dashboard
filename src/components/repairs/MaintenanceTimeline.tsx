import { useState } from 'react'
import { useMaintenanceLookups } from '@/lib/store'
import { MaintenanceLookup } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import {
  Wrench,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Shield,
  AlertTriangle,
  Clock,
  Package,
} from 'lucide-react'

interface Props {
  vehicleId: string
  mileage: number | null
  onOrderParts: (item: MaintenanceLookup) => void
}

type ItemStatus = 'overdue' | 'upcoming' | 'normal'

function getStatus(item: MaintenanceLookup, mileage: number | null): ItemStatus {
  if (mileage == null || item.due_mileage == null) return 'normal'
  if (item.due_mileage < mileage) return 'overdue'
  if (item.due_mileage - mileage <= 3000) return 'upcoming'
  return 'normal'
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-zinc-200 animate-pulse" />
            <div className="w-0.5 flex-1 bg-zinc-100 animate-pulse" />
          </div>
          <div className="flex-1 glass rounded-2xl p-4 space-y-3">
            <div className="h-4 w-48 bg-zinc-200 rounded-lg animate-pulse" />
            <div className="h-3 w-32 bg-zinc-100 rounded-lg animate-pulse" />
            <div className="h-3 w-40 bg-zinc-100 rounded-lg animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function MaintenanceTimeline({ vehicleId, mileage, onOrderParts }: Props) {
  const { maintenance, loading } = useMaintenanceLookups(vehicleId)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) return <LoadingSkeleton />

  if (!mileage && maintenance.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <Wrench size={28} className="mx-auto text-zinc-300 mb-3" />
        <p className="text-sm text-zinc-400 font-medium">
          Enter mileage to see maintenance schedule
        </p>
      </div>
    )
  }

  if (maintenance.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <Wrench size={28} className="mx-auto text-zinc-300 mb-3" />
        <p className="text-sm text-zinc-400 font-medium">No maintenance data available</p>
      </div>
    )
  }

  const sorted = [...maintenance].sort((a, b) => {
    const sa = getStatus(a, mileage)
    const sb = getStatus(b, mileage)
    const order: Record<ItemStatus, number> = { overdue: 0, upcoming: 1, normal: 2 }
    if (order[sa] !== order[sb]) return order[sa] - order[sb]
    return (a.due_mileage ?? Infinity) - (b.due_mileage ?? Infinity)
  })

  return (
    <div className="space-y-0">
      {sorted.map((item, idx) => {
        const status = getStatus(item, mileage)
        const isExpanded = expandedIds.has(item.id)
        const isLast = idx === sorted.length - 1

        const dotColor =
          status === 'overdue'
            ? 'bg-red-500'
            : status === 'upcoming'
              ? 'bg-amber-400'
              : 'bg-zinc-300'

        const borderColor =
          status === 'overdue'
            ? 'border-red-200 bg-red-50/40'
            : status === 'upcoming'
              ? 'border-amber-200 bg-amber-50/30'
              : ''

        return (
          <div key={item.id} className="flex gap-4">
            {/* Timeline spine */}
            <div className="flex flex-col items-center pt-5">
              <div className={`w-3 h-3 rounded-full shrink-0 ring-2 ring-white ${dotColor}`} />
              {!isLast && <div className="w-0.5 flex-1 bg-zinc-200" />}
            </div>

            {/* Card */}
            <div className={`flex-1 glass rounded-2xl p-4 mb-3 border ${borderColor || 'border-transparent'}`}>
              {/* Header row */}
              <button
                onClick={() => toggleExpand(item.id)}
                className="w-full flex items-start justify-between gap-2 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-zinc-900 truncate">
                      {item.description}
                    </h4>

                    {item.is_oem && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wide shrink-0">
                        <Shield size={10} /> OEM
                      </span>
                    )}

                    {status === 'overdue' && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-red-100 text-red-700 text-[10px] font-bold uppercase tracking-wide shrink-0">
                        <AlertTriangle size={10} /> Overdue
                      </span>
                    )}

                    {status === 'upcoming' && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wide shrink-0">
                        <Clock size={10} /> Upcoming
                      </span>
                    )}
                  </div>

                  {/* Due mileage */}
                  {item.due_mileage != null && (
                    <p className="text-xs text-zinc-400 mt-1">
                      Due at {item.due_mileage.toLocaleString()} mi
                      {mileage != null && item.due_mileage > mileage && (
                        <span className="ml-1 text-zinc-300">
                          ({(item.due_mileage - mileage).toLocaleString()} mi away)
                        </span>
                      )}
                      {mileage != null && item.due_mileage < mileage && (
                        <span className="ml-1 text-red-400 font-semibold">
                          ({(mileage - item.due_mileage).toLocaleString()} mi past due)
                        </span>
                      )}
                    </p>
                  )}

                  {/* Cost summary */}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
                    {item.part_cost != null && (
                      <span>Parts: {formatCurrency(item.part_cost)}</span>
                    )}
                    {item.labor_cost != null && (
                      <span>Labor: {formatCurrency(item.labor_cost)}</span>
                    )}
                    {item.total_cost != null && (
                      <span className="font-semibold text-zinc-700">
                        Total: {formatCurrency(item.total_cost)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0 text-zinc-400 mt-0.5">
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-zinc-100 space-y-3">
                  {/* Parts list */}
                  {item.parts_json && item.parts_json.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <Package size={12} /> Parts ({item.parts_json.length})
                      </p>
                      <div className="space-y-1.5">
                        {item.parts_json.map((part, pi) => (
                          <div
                            key={pi}
                            className="flex items-center justify-between text-xs bg-zinc-50 rounded-lg px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="text-zinc-800 font-medium truncate">{part.desc}</p>
                              {part.manufacturer && (
                                <p className="text-zinc-400 text-[11px]">{part.manufacturer}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              <p className="text-zinc-700 font-semibold">
                                {formatCurrency(part.price)}
                              </p>
                              {Number(part.qty) > 1 && (
                                <p className="text-zinc-400 text-[11px]">x{part.qty}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400">No parts data available</p>
                  )}

                  {/* Cycle mileage info */}
                  {item.cycle_mileage != null && (
                    <p className="text-xs text-zinc-400">
                      Recurring every {item.cycle_mileage.toLocaleString()} mi
                    </p>
                  )}

                  {/* Order Parts button */}
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      onOrderParts(item)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
                  >
                    <ShoppingCart size={12} /> Order Parts
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
