import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Wrench, Search, Loader2, AlertTriangle } from 'lucide-react'
import { useAuth, useVehicle, upsertVehicle, decodeVin } from '@/lib/store'
import { Vehicle } from '@/lib/types'
import { sanitizeVin, isLikelyVin } from '@/lib/utils'
import VehicleProfileCard from '@/components/repairs/VehicleProfileCard'

type RepairTab = 'overview' | 'maintenance' | 'diagnostics' | 'recalls' | 'parts'

const TABS: { key: RepairTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'diagnostics', label: 'Diagnostics' },
  { key: 'recalls', label: 'Recalls & TSBs' },
  { key: 'parts', label: 'Parts' },
]

export default function Repairs() {
  const { vin: routeVin } = useParams<{ vin: string }>()
  const { profile } = useAuth()
  const [vinInput, setVinInput] = useState(routeVin || '')
  const [mileageInput, setMileageInput] = useState('')
  const [activeTab, setActiveTab] = useState<RepairTab>('overview')
  const [decoding, setDecoding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle | null>(null)

  const { refresh: refreshVehicle } = useVehicle(currentVehicle?.vin)

  // Auto-decode if route param present
  useEffect(() => {
    if (routeVin && isLikelyVin(routeVin)) {
      handleDecode(routeVin)
    }
  }, [routeVin])

  const handleDecode = async (rawVin?: string) => {
    const vin = sanitizeVin(rawVin || vinInput)
    if (!isLikelyVin(vin)) {
      setError('Please enter a valid 17-character VIN')
      return
    }
    if (!profile?.business_id) {
      setError('No business assigned to your profile')
      return
    }

    setError(null)
    setDecoding(true)
    try {
      const decoded = await decodeVin(vin)
      if (!decoded) {
        setError('Could not decode VIN. Please check and try again.')
        return
      }

      const mileage = mileageInput ? parseInt(mileageInput) : null

      const vehicle = await upsertVehicle({
        vin,
        year: decoded.year,
        make: decoded.make,
        model: decoded.model,
        trim: decoded.trim,
        engine: null,
        engine_type: null,
        mileage,
        color: null,
        plate: null,
        business_id: profile.business_id,
        created_by: profile.id,
      })

      setCurrentVehicle(vehicle)
      refreshVehicle()
    } catch (err: any) {
      setError(err.message || 'Failed to decode VIN')
    } finally {
      setDecoding(false)
    }
  }

  const handleMileageUpdate = async (mileage: number) => {
    if (!currentVehicle) return
    try {
      const updated = await upsertVehicle({
        vin: currentVehicle.vin,
        year: currentVehicle.year,
        make: currentVehicle.make,
        model: currentVehicle.model,
        trim: currentVehicle.trim,
        engine: currentVehicle.engine ?? null,
        engine_type: currentVehicle.engine_type ?? null,
        mileage,
        color: currentVehicle.color,
        plate: currentVehicle.plate ?? null,
        business_id: currentVehicle.business_id!,
        created_by: currentVehicle.created_by ?? null,
      })
      setCurrentVehicle(updated)
    } catch (err: any) {
      alert(err.message || 'Failed to update mileage')
    }
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
          <Wrench size={18} className="text-red-600" /> Repairs
        </h2>
        <p className="text-[12px] text-zinc-400 mt-0.5">Vehicle diagnostics, maintenance & parts</p>
      </div>

      {/* VIN Input */}
      <div className="glass rounded-2xl p-5 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-zinc-500 mb-1.5">VIN Number</label>
            <input
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm font-mono tracking-wide uppercase focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all"
              placeholder="Enter 17-character VIN..."
              value={vinInput}
              onChange={e => setVinInput(e.target.value.toUpperCase())}
              maxLength={17}
            />
          </div>
          <div className="w-full sm:w-32">
            <label className="block text-xs font-semibold text-zinc-500 mb-1.5">Mileage</label>
            <input
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all"
              placeholder="Miles"
              type="number"
              value={mileageInput}
              onChange={e => setMileageInput(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => handleDecode()}
              disabled={decoding || vinInput.length < 17}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm shadow-red-700/20 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {decoding ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              {decoding ? 'Decoding...' : 'Decode'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
            <AlertTriangle size={14} /> {error}
          </div>
        )}
      </div>

      {/* Vehicle Profile Card + Tabs */}
      {currentVehicle && (
        <>
          <VehicleProfileCard
            vehicle={currentVehicle}
            onMileageUpdate={handleMileageUpdate}
            onTabSelect={(tab) => setActiveTab(tab as RepairTab)}
          />

          {/* Tab Bar */}
          <div className="flex gap-1 mb-5 bg-zinc-100 rounded-xl p-1 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === t.key
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content - placeholder for now, components will be added in later tasks */}
          <div className="glass rounded-2xl p-6">
            {activeTab === 'overview' && (
              <div className="text-center text-zinc-400 py-10">
                <Wrench size={32} className="mx-auto mb-3 text-zinc-300" />
                <p className="text-sm">Overview tab — coming soon</p>
              </div>
            )}
            {activeTab === 'maintenance' && (
              <div className="text-center text-zinc-400 py-10">
                <p className="text-sm">Maintenance tab — coming soon</p>
              </div>
            )}
            {activeTab === 'diagnostics' && (
              <div className="text-center text-zinc-400 py-10">
                <p className="text-sm">Diagnostics tab — coming soon</p>
              </div>
            )}
            {activeTab === 'recalls' && (
              <div className="text-center text-zinc-400 py-10">
                <p className="text-sm">Recalls & TSBs tab — coming soon</p>
              </div>
            )}
            {activeTab === 'parts' && (
              <div className="text-center text-zinc-400 py-10">
                <p className="text-sm">Parts tab — coming soon</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
