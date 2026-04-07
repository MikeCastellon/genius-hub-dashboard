import { useState, useEffect } from 'react'
import { useRecallLookups, useRepairGuides, callRepairsVehicleDB } from '@/lib/store'
import type { Vehicle, RepairGuide, VehicleDBWarranty, VehicleDBRepairEstimate } from '@/lib/types'
import { formatDate, formatCurrency } from '@/lib/utils'
import { AlertTriangle, BookOpen, Shield, Clock, CheckCircle, XCircle, Settings, Wrench, DollarSign } from 'lucide-react'

interface MaintenanceItem {
  description: string
  due_mileage: number | null
  total_cost: number | null
}

/** Check if a single warranty type is truly expired based on vehicle mileage and age */
function isWarrantyExpired(
  w: { expired: boolean; months: number; miles: number },
  vehicle: Vehicle,
): boolean {
  if (w.expired) return true
  if (vehicle.mileage && vehicle.mileage > w.miles) return true
  if (vehicle.year) {
    const ageMonths = (new Date().getFullYear() - vehicle.year) * 12
    if (ageMonths > w.months) return true
  }
  return false
}

interface Props {
  vehicle: Vehicle
  warranty?: VehicleDBWarranty | null
}

function SkeletonCard() {
  return (
    <div className="glass rounded-xl p-4 space-y-2 animate-pulse">
      <div className="h-4 bg-zinc-200 rounded w-3/4" />
      <div className="h-3 bg-zinc-200 rounded w-1/2" />
      <div className="h-3 bg-zinc-200 rounded w-1/3" />
    </div>
  )
}

function SkeletonStatRow() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2].map((i) => (
        <div key={i} className="glass rounded-xl p-4 animate-pulse">
          <div className="h-8 bg-zinc-200 rounded w-12 mb-2" />
          <div className="h-3 bg-zinc-200 rounded w-24" />
        </div>
      ))}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number
  icon: React.ComponentType<{ size?: number; className?: string }>
  accent: 'red' | 'green' | 'blue'
}) {
  const bgMap = {
    red: 'bg-red-50 border-red-200',
    green: 'bg-emerald-50 border-emerald-200',
    blue: 'bg-blue-50 border-blue-200',
  }
  const textMap = {
    red: 'text-red-600',
    green: 'text-emerald-600',
    blue: 'text-blue-600',
  }

  return (
    <div className={`glass rounded-xl p-4 border ${bgMap[accent]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} className={textMap[accent]} />
        <span className={`text-2xl font-bold ${textMap[accent]}`}>{value}</span>
      </div>
      <p className="text-xs text-zinc-500 font-medium">{label}</p>
    </div>
  )
}

export default function RepairsOverview({ vehicle, warranty }: Props) {
  const { recalls, loading: recallsLoading } = useRecallLookups(vehicle.id)
  const { guides, loading: guidesLoading } = useRepairGuides(vehicle.id)

  // Fetch repairs and maintenance for overview summaries
  const [estimates, setEstimates] = useState<VehicleDBRepairEstimate[]>([])
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    if (!vehicle.vin) return
    setDataLoading(true)
    Promise.allSettled([
      callRepairsVehicleDB({ action: 'repair_estimates', vin: vehicle.vin }),
      callRepairsVehicleDB({ action: 'maintenance', vin: vehicle.vin }),
    ]).then(([estResult, maintResult]) => {
      if (estResult.status === 'fulfilled') {
        const d = estResult.value?.data ?? estResult.value
        setEstimates(Array.isArray(d) ? d : [])
      }
      if (maintResult.status === 'fulfilled') {
        const d = maintResult.value?.data ?? maintResult.value
        setMaintenance(Array.isArray(d) ? d : [])
      }
      setDataLoading(false)
    })
  }, [vehicle.vin])

  const statsLoading = recallsLoading || guidesLoading

  const activeRecalls = recalls?.length ?? 0
  const guideCount = guides?.length ?? 0

  const maintenanceDue = vehicle.mileage
    ? maintenance.filter(m => m.due_mileage != null && vehicle.mileage! >= m.due_mileage)
    : []

  const recentGuides: RepairGuide[] = (guides ?? [])
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3)

  return (
    <div className="space-y-5">
      {/* Quick Stats */}
      {statsLoading ? (
        <SkeletonStatRow />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Active Recalls"
            value={activeRecalls}
            icon={AlertTriangle}
            accent={activeRecalls > 0 ? 'red' : 'green'}
          />
          <StatCard
            label="Repair Estimates"
            value={estimates.length}
            icon={Wrench}
            accent="blue"
          />
          <StatCard
            label="Maintenance Items"
            value={maintenance.length}
            icon={Settings}
            accent={maintenanceDue.length > 0 ? 'red' : 'green'}
          />
          <StatCard
            label="Repair Guides"
            value={guideCount}
            icon={BookOpen}
            accent="blue"
          />
        </div>
      )}

      {/* Warranty Summary */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-red-600" />
          <h4 className="text-sm font-semibold text-zinc-800">Warranty Status</h4>
        </div>
        {warranty ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { key: 'basic', label: 'Basic' },
              { key: 'powertrain', label: 'Powertrain' },
              { key: 'corrosion', label: 'Corrosion' },
              { key: 'emissions', label: 'Emissions' },
            ] as const).map(({ key, label }) => {
              const w = warranty[key]
              if (!w) return null
              const expired = isWarrantyExpired(w, vehicle)
              return (
                <div key={key} className={`rounded-lg p-3 border ${expired ? 'bg-zinc-50 border-zinc-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-zinc-700">{label}</span>
                    {expired ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-400">
                        <XCircle size={11} /> Expired
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                        <CheckCircle size={11} /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">{w.description}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {Math.floor(w.months / 12)} yr / {(w.miles).toLocaleString()} mi
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">Warranty data not available for this vehicle.</p>
        )}
      </div>

      {/* Repairs Summary */}
      {!dataLoading && estimates.length > 0 && (
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wrench size={16} className="text-red-600" />
            <h4 className="text-sm font-semibold text-zinc-800">Common Repairs</h4>
            <span className="text-[10px] font-bold text-zinc-400 ml-auto">{estimates.length} found</span>
          </div>
          <div className="space-y-2">
            {estimates.slice(0, 3).map((est, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg bg-zinc-50/60 px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <DollarSign size={12} className="text-zinc-400 shrink-0" />
                  <span className="text-sm text-zinc-700 truncate">{est.repair_name}</span>
                </div>
                <span className="text-xs font-semibold text-zinc-500 shrink-0 ml-3">
                  {formatCurrency(est.total_low)} – {formatCurrency(est.total_high)}
                </span>
              </div>
            ))}
            {estimates.length > 3 && (
              <p className="text-[11px] text-zinc-400 text-center pt-1">+ {estimates.length - 3} more</p>
            )}
          </div>
        </div>
      )}

      {/* Maintenance Summary */}
      {!dataLoading && maintenance.length > 0 && (
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Settings size={16} className="text-red-600" />
            <h4 className="text-sm font-semibold text-zinc-800">Maintenance Schedule</h4>
            {maintenanceDue.length > 0 && (
              <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                {maintenanceDue.length} due
              </span>
            )}
          </div>
          <div className="space-y-2">
            {maintenance.slice(0, 4).map((item, idx) => {
              const isDue = vehicle.mileage != null && item.due_mileage != null && vehicle.mileage >= item.due_mileage
              return (
                <div key={idx} className={`flex items-center justify-between rounded-lg px-3 py-2 ${isDue ? 'bg-amber-50' : 'bg-zinc-50/60'}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    {isDue ? <AlertTriangle size={12} className="text-amber-500 shrink-0" /> : <CheckCircle size={12} className="text-emerald-400 shrink-0" />}
                    <span className={`text-sm truncate ${isDue ? 'text-amber-800 font-medium' : 'text-zinc-700'}`}>{item.description}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    {item.due_mileage != null && (
                      <span className="text-[11px] text-zinc-400">{item.due_mileage.toLocaleString()} mi</span>
                    )}
                    {item.total_cost != null && (
                      <span className="text-xs font-semibold text-zinc-500">{formatCurrency(item.total_cost)}</span>
                    )}
                  </div>
                </div>
              )
            })}
            {maintenance.length > 4 && (
              <p className="text-[11px] text-zinc-400 text-center pt-1">+ {maintenance.length - 4} more</p>
            )}
          </div>
        </div>
      )}

      {/* Recalls Summary */}
      {!recallsLoading && activeRecalls > 0 && (
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-600" />
            <h4 className="text-sm font-semibold text-zinc-800">Active Recalls</h4>
            <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
              {activeRecalls}
            </span>
          </div>
          <div className="space-y-2">
            {recalls.slice(0, 3).map((recall) => (
              <div key={recall.id} className="flex items-start gap-2 rounded-lg bg-red-50/50 px-3 py-2">
                <AlertTriangle size={12} className="text-red-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-700 truncate">{recall.description}</p>
                  {recall.nhtsa_id && (
                    <span className="text-[10px] font-medium text-red-500">NHTSA {recall.nhtsa_id}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Repair Guides */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} className="text-red-600" />
          <h4 className="text-sm font-semibold text-zinc-800">Recent Repair Guides</h4>
        </div>

        {guidesLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : recentGuides.length === 0 ? (
          <p className="text-sm text-zinc-400 py-4 text-center">No repair guides generated yet.</p>
        ) : (
          <div className="space-y-3">
            {recentGuides.map((guide) => (
              <div key={guide.id} className="flex items-start gap-3 rounded-lg bg-zinc-50/60 p-3">
                <Clock size={14} className="text-zinc-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-700 truncate">
                    {guide.user_prompt || `${guide.content.steps.length}-step guide`}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {formatDate(guide.created_at)} &middot; {guide.content.steps.length} steps
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
