import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Wrench, Search, Loader2, AlertTriangle, X } from 'lucide-react'
import {
  useAuth, useVehicle, upsertVehicle, decodeVin,
  callRepairsVehicleDB, useRecallLookups, upsertRecallLookups,
} from '@/lib/store'
import { Vehicle, VehicleDBWarranty } from '@/lib/types'
import { sanitizeVin, isLikelyVin } from '@/lib/utils'
import VehicleProfileCard from '@/components/repairs/VehicleProfileCard'
import RepairsOverview from '@/components/repairs/RepairsOverview'
import RepairEstimates from '@/components/repairs/RepairEstimates'
import RecallsPanel from '@/components/repairs/RecallsPanel'
import RepairGuidePanel from '@/components/repairs/RepairGuidePanel'
import MaintenancePanel from '@/components/repairs/MaintenancePanel'
import TSBPanel from '@/components/repairs/TSBPanel'
import OwnerManualPanel from '@/components/repairs/OwnerManualPanel'

type RepairTab = 'overview' | 'repairs' | 'recalls' | 'maintenance' | 'tsb' | 'manual' | 'ai_guide'

const TABS: { key: RepairTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'repairs', label: 'Repairs & Estimates' },
  { key: 'recalls', label: 'Recalls' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'tsb', label: 'Service Bulletins' },
  { key: 'manual', label: "Owner's Manual" },
  { key: 'ai_guide', label: 'AI Guide' },
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

  // Warranty data from API
  const [warranty, setWarranty] = useState<VehicleDBWarranty | null>(null)

  // AI Guide panel state
  const [showGuidePanel, setShowGuidePanel] = useState(false)
  const [guideContext] = useState<{ repairDescription?: string }>({})

  const { refresh: refreshVehicle } = useVehicle(currentVehicle?.vin)

  // Badge data
  const { recalls, refresh: refreshRecalls } = useRecallLookups(currentVehicle?.id)
  const recallCount = recalls.filter(r => r.type === 'recall').length

  // Auto-decode if route param present
  useEffect(() => {
    if (routeVin && isLikelyVin(routeVin)) {
      handleDecode(routeVin)
    }
  }, [routeVin])

  const triggerParallelLookups = async (vin: string, vehicle: Vehicle) => {
    const results = await Promise.allSettled([
      callRepairsVehicleDB({ action: 'repairs', vin }),
      callRepairsVehicleDB({ action: 'repair_estimates', vin }),
      callRepairsVehicleDB({ action: 'recalls', vin }),
      callRepairsVehicleDB({
        action: 'warranty',
        year: String(vehicle.year ?? ''),
        make: vehicle.make ?? '',
        model: vehicle.model ?? '',
      }),
    ])

    // Save recall data to recall_lookups table
    const recallsResult = results[2]
    if (recallsResult.status === 'fulfilled' && recallsResult.value?.data && vehicle.business_id) {
      const recallData = recallsResult.value.data
      if (Array.isArray(recallData)) {
        await upsertRecallLookups(vehicle.id, vehicle.business_id, recallData)
        refreshRecalls()
      }
    }

    // Capture warranty data from the 4th result
    const warrantyResult = results[3]
    if (warrantyResult.status === 'fulfilled' && warrantyResult.value?.data) {
      setWarranty(warrantyResult.value.data as VehicleDBWarranty)
    }
  }

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

      // Fire parallel data lookups in background
      triggerParallelLookups(vin, vehicle)
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

  const getBadge = (tabKey: RepairTab) => {
    if (tabKey === 'recalls' && recallCount > 0) {
      return <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">{recallCount}</span>
    }
    return null
  }

  return (
    <div>
      <div className="sticky top-0 z-20 bg-[#f5f5f5]/95 backdrop-blur-md px-4 md:px-6 pt-4 md:pt-6 pb-3">
        {/* Header */}
        <div className="mb-5">
          <h2 className="text-lg md:text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Wrench size={18} className="text-red-600" /> Repairs
          </h2>
          <p className="text-[12px] md:text-[13px] text-zinc-400 mt-0.5">Vehicle repairs, recalls & AI-powered guides</p>
        </div>
      </div>

      <div className="px-4 md:px-6 pb-4">
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
            warranty={warranty}
            recallCount={recallCount}
            onMileageUpdate={handleMileageUpdate}
            onTabSelect={(tab) => setActiveTab(tab as RepairTab)}
          />

          {/* Tab Bar */}
          <div className="flex gap-1 mb-5 bg-zinc-100 rounded-xl p-1 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center ${
                  activeTab === t.key
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                {t.label}
                {getBadge(t.key)}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="glass rounded-2xl p-6">
            {activeTab === 'overview' && (
              <RepairsOverview vehicle={currentVehicle} warranty={warranty} />
            )}
            {activeTab === 'repairs' && (
              <RepairEstimates vehicle={currentVehicle} />
            )}
            {activeTab === 'recalls' && (
              <RecallsPanel vehicleId={currentVehicle.id} />
            )}
            {activeTab === 'maintenance' && (
              <MaintenancePanel vehicle={currentVehicle} />
            )}
            {activeTab === 'tsb' && (
              <TSBPanel vehicle={currentVehicle} />
            )}
            {activeTab === 'manual' && (
              <OwnerManualPanel vehicle={currentVehicle} />
            )}
            {activeTab === 'ai_guide' && (
              <RepairGuidePanel
                vehicle={currentVehicle}
                repairDescription={guideContext.repairDescription}
                onClose={() => setActiveTab('overview')}
              />
            )}
          </div>
        </>
      )}
      </div>

      {/* AI Guide Modal Overlay (when triggered from other tabs) */}
      {showGuidePanel && currentVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl max-h-[70vh] overflow-y-auto m-4 bg-white rounded-2xl shadow-2xl">
            <button
              onClick={() => setShowGuidePanel(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-zinc-100 transition-colors z-10"
            >
              <X size={18} className="text-zinc-500" />
            </button>
            <RepairGuidePanel
              vehicle={currentVehicle}
              repairDescription={guideContext.repairDescription}
              onClose={() => setShowGuidePanel(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
