import { useState } from 'react'
import { Vehicle, VehicleDBWarranty } from '@/lib/types'
import { Car, Gauge, Palette, Hash, Shield, AlertTriangle, Settings, Wrench, Bell, Sparkles, CheckCircle } from 'lucide-react'

interface Props {
  vehicle: Vehicle
  warranty?: VehicleDBWarranty | null
  recallCount?: number
  onMileageUpdate: (mileage: number) => void
  onTabSelect: (tab: string) => void
}

export default function VehicleProfileCard({ vehicle, warranty, recallCount = 0, onMileageUpdate, onTabSelect }: Props) {
  const [editingMileage, setEditingMileage] = useState(false)
  const [mileageValue, setMileageValue] = useState(String(vehicle.mileage || ''))

  const handleMileageSave = () => {
    const val = parseInt(mileageValue)
    if (!isNaN(val) && val > 0) {
      onMileageUpdate(val)
    }
    setEditingMileage(false)
  }

  return (
    <div className="glass rounded-2xl p-5 mb-5">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Vehicle Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Car size={18} className="text-red-600" />
            <h3 className="text-lg font-bold text-zinc-900">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <div className="flex items-center gap-1.5 text-zinc-500">
              <Hash size={12} />
              <span className="font-mono text-xs tracking-wide">{vehicle.vin}</span>
            </div>

            {vehicle.engine && (
              <div className="flex items-center gap-1.5 text-zinc-500">
                <Settings size={12} />
                <span>{vehicle.engine}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-zinc-500">
              <Gauge size={12} />
              {editingMileage ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    className="w-24 px-2 py-0.5 rounded-lg border border-zinc-200 text-xs focus:outline-none focus:border-red-300"
                    value={mileageValue}
                    onChange={e => setMileageValue(e.target.value)}
                    onBlur={handleMileageSave}
                    onKeyDown={e => e.key === 'Enter' && handleMileageSave()}
                    autoFocus
                  />
                  <span className="text-xs">mi</span>
                </div>
              ) : (
                <button
                  onClick={() => setEditingMileage(true)}
                  className="hover:text-red-600 transition-colors"
                >
                  {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} mi` : 'Add mileage'}
                </button>
              )}
            </div>

            {vehicle.color && (
              <div className="flex items-center gap-1.5 text-zinc-500">
                <Palette size={12} />
                <span>{vehicle.color}</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-col gap-2 sm:items-end">
          {warranty ? (() => {
            const isExpired = (w: { expired: boolean; months: number; miles: number }) => {
              if (w.expired) return true
              if (vehicle.mileage && vehicle.mileage > w.miles) return true
              if (vehicle.year) {
                const ageMonths = (new Date().getFullYear() - vehicle.year) * 12
                if (ageMonths > w.months) return true
              }
              return false
            }
            const hasActive = (warranty.basic && !isExpired(warranty.basic))
              || (warranty.powertrain && !isExpired(warranty.powertrain))
            return hasActive ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold">
                <CheckCircle size={12} /> Warranty: Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-zinc-100 text-zinc-500 text-xs font-semibold">
                <Shield size={12} /> Warranty: Expired
              </span>
            )
          })() : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-zinc-100 text-zinc-600 text-xs font-semibold">
              <Shield size={12} /> Warranty: Unknown
            </span>
          )}
          {recallCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
              <AlertTriangle size={12} /> Recalls: {recallCount}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold">
              <CheckCircle size={12} /> Recalls: None
            </span>
          )}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-100 overflow-x-auto">
        {[
          { key: 'repairs', icon: Wrench, label: 'Repairs' },
          { key: 'recalls', icon: Bell, label: 'Recalls' },
          { key: 'ai_guide', icon: Sparkles, label: 'AI Guide' },
        ].map(btn => (
          <button
            key={btn.key}
            onClick={() => onTabSelect(btn.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-xs font-semibold text-zinc-600 transition-colors whitespace-nowrap"
          >
            <btn.icon size={12} /> {btn.label}
          </button>
        ))}
      </div>
    </div>
  )
}
