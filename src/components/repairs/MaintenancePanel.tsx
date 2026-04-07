import { useState, useEffect } from 'react'
import { callRepairsVehicleDB } from '@/lib/store'
import type { Vehicle } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Settings, Clock, CheckCircle, DollarSign } from 'lucide-react'

interface MaintenanceItem {
  description: string
  due_mileage: number | null
  is_oem: boolean
  cycle_mileage: number | null
  part_cost: number | null
  labor_cost: number | null
  total_cost: number | null
}

interface Props {
  vehicle: Vehicle
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="glass rounded-xl p-4 space-y-2 animate-pulse">
          <div className="h-4 bg-zinc-200 rounded w-1/2" />
          <div className="h-3 bg-zinc-100 rounded w-3/4" />
          <div className="h-3 bg-zinc-100 rounded w-1/3" />
        </div>
      ))}
    </div>
  )
}

function MaintenanceCard({ item, currentMileage }: { item: MaintenanceItem; currentMileage: number | null }) {
  const isDue = currentMileage != null && item.due_mileage != null && currentMileage >= item.due_mileage
  const milesUntilDue = item.due_mileage != null && currentMileage != null
    ? item.due_mileage - currentMileage
    : null

  return (
    <div className={`glass rounded-xl p-4 border-l-4 ${isDue ? 'border-amber-500' : 'border-emerald-400'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Settings size={14} className={isDue ? 'text-amber-500' : 'text-zinc-400'} />
            <h4 className="text-sm font-bold text-zinc-900">{item.description}</h4>
            {item.is_oem && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-blue-50 text-blue-600 rounded">OEM</span>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1.5">
            {item.due_mileage != null && (
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Clock size={11} />
                Due at {item.due_mileage.toLocaleString()} mi
              </span>
            )}
            {item.cycle_mileage != null && (
              <span className="text-xs text-zinc-400">
                Every {item.cycle_mileage.toLocaleString()} mi
              </span>
            )}
          </div>
          {milesUntilDue != null && (
            <p className={`text-xs mt-1.5 font-semibold ${isDue ? 'text-amber-600' : 'text-emerald-600'}`}>
              {isDue ? (
                <span className="flex items-center gap-1">Overdue by {Math.abs(milesUntilDue).toLocaleString()} mi</span>
              ) : (
                <span className="flex items-center gap-1"><CheckCircle size={11} /> {milesUntilDue.toLocaleString()} mi remaining</span>
              )}
            </p>
          )}
        </div>
        {item.total_cost != null && (
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-zinc-800">{formatCurrency(item.total_cost)}</p>
            {(item.part_cost != null || item.labor_cost != null) && (
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {item.part_cost != null && <span>Parts: {formatCurrency(item.part_cost)}</span>}
                {item.part_cost != null && item.labor_cost != null && <span> · </span>}
                {item.labor_cost != null && <span>Labor: {formatCurrency(item.labor_cost)}</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MaintenancePanel({ vehicle }: Props) {
  const [items, setItems] = useState<MaintenanceItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!vehicle.vin) return

    setLoading(true)

    callRepairsVehicleDB({ action: 'maintenance', vin: vehicle.vin })
      .then(result => {
        const data = result?.data ?? result
        const arr = Array.isArray(data) ? data : []
        setItems(arr)
      })
      .catch(() => {
        setItems([])
      })
      .finally(() => setLoading(false))
  }, [vehicle.vin])

  if (loading) return <LoadingSkeleton />

  if (items.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <Settings size={28} className="mx-auto text-zinc-300 mb-3" />
        <p className="text-sm text-zinc-400 font-medium">No maintenance schedule available for this vehicle</p>
      </div>
    )
  }

  const dueItems = vehicle.mileage
    ? items.filter(i => i.due_mileage != null && vehicle.mileage! >= i.due_mileage)
    : []
  const upcomingItems = items.filter(i => !dueItems.includes(i))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold text-zinc-800">Maintenance Schedule</h3>
        </div>
        {vehicle.mileage && dueItems.length > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
            {dueItems.length} due now
          </span>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-zinc-800">{items.length}</p>
          <p className="text-[11px] text-zinc-400 font-medium">Service Items</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-amber-600">{dueItems.length}</p>
          <p className="text-[11px] text-zinc-400 font-medium">Due / Overdue</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-zinc-800 flex items-center justify-center gap-0.5">
            <DollarSign size={16} />
            {formatCurrency(items.reduce((sum, i) => sum + (i.total_cost ?? 0), 0)).replace('$', '')}
          </p>
          <p className="text-[11px] text-zinc-400 font-medium">Total Est. Cost</p>
        </div>
      </div>

      {/* Due now */}
      {dueItems.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-3">
            Due / Overdue ({dueItems.length})
          </h4>
          <div className="space-y-2">
            {dueItems.map((item, idx) => (
              <MaintenanceCard key={`due-${idx}`} item={item} currentMileage={vehicle.mileage ?? null} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcomingItems.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Upcoming ({upcomingItems.length})
          </h4>
          <div className="space-y-2">
            {upcomingItems.map((item, idx) => (
              <MaintenanceCard key={`upcoming-${idx}`} item={item} currentMileage={vehicle.mileage ?? null} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
