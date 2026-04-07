import { useState, useEffect } from 'react'
import { Search, Car, Loader2, UserCircle, ScanLine } from 'lucide-react'
import { searchVehicles, useCustomers, useIntakes } from '@/lib/store'
import { decodeVin, isLikelyVin } from '@/lib/utils'
import type { Vehicle, VehicleIntake } from '@/lib/types'
import BarkoderScanner from '@/components/BarkoderScanner'

interface VehicleData {
  vin: string
  year: number | null
  make: string | null
  model: string | null
  trim: string | null
  color: string | null
}

interface Props {
  vehicle: VehicleData
  setVehicle: (v: VehicleData) => void
  customerId: string | null
  setCustomerId: (id: string | null) => void
}

const inputClass = 'w-full px-3.5 py-3 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10 transition-all'

export default function StepVehicle({ vehicle, setVehicle, customerId, setCustomerId }: Props) {
  const [vinSearch, setVinSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Vehicle[]>([])
  const [searching, setSearching] = useState(false)
  const [decoding, setDecoding] = useState(false)
  const [decodeError, setDecodeError] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const { customers } = useCustomers()
  const { intakes } = useIntakes()
  const [customerSearch, setCustomerSearch] = useState('')

  // Search intakes by VIN or vehicle info when typing
  const filteredIntakes = vinSearch.length >= 2
    ? intakes.filter(i => {
        const q = vinSearch.toLowerCase()
        const customer = (i as any).customer
        return (
          i.vin?.toLowerCase().includes(q) ||
          i.make?.toLowerCase().includes(q) ||
          i.model?.toLowerCase().includes(q) ||
          customer?.name?.toLowerCase().includes(q) ||
          [i.year, i.make, i.model].filter(Boolean).join(' ').toLowerCase().includes(q)
        )
      }).slice(0, 8)
    : []

  // Debounced vehicle DB search
  useEffect(() => {
    if (vinSearch.length < 3) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      const results = await searchVehicles(vinSearch)
      setSearchResults(results)
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [vinSearch])

  const handleVinDecode = async () => {
    const vin = vehicle.vin.trim()
    if (!isLikelyVin(vin)) { setDecodeError('Enter a valid 17-character VIN'); return }
    setDecoding(true)
    setDecodeError('')
    try {
      const info = await decodeVin(vin)
      if (info) {
        setVehicle({
          ...vehicle,
          year: info.year ? parseInt(info.year) : vehicle.year,
          make: info.make ?? vehicle.make,
          model: info.model ?? vehicle.model,
        })
      } else {
        setDecodeError('VIN not found in NHTSA database')
      }
    } catch {
      setDecodeError('Decode failed — check VIN and try again')
    } finally {
      setDecoding(false)
    }
  }

  const handleVinDetected = (vin: string) => {
    setShowScanner(false)
    setVehicle({ ...vehicle, vin: vin.toUpperCase() })
    setVinSearch('')
  }

  const selectExistingVehicle = (v: Vehicle) => {
    setVehicle({
      vin: v.vin,
      year: v.year,
      make: v.make,
      model: v.model,
      trim: v.trim,
      color: v.color,
    })
    setVinSearch('')
    setSearchResults([])
  }

  const selectFromIntake = (intake: VehicleIntake) => {
    setVehicle({
      vin: intake.vin || '',
      year: intake.year,
      make: intake.make,
      model: intake.model,
      trim: null,
      color: intake.color,
    })
    // Also auto-select the customer if available
    if (intake.customer_id && !customerId) {
      setCustomerId(intake.customer_id)
    }
    setVinSearch('')
  }

  const filteredCustomers = customerSearch.length >= 2
    ? customers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch)
      ).slice(0, 8)
    : []

  const selectedCustomer = customers.find(c => c.id === customerId)

  const isTyping = vehicle.vin.length > 0
  const canDecode = vehicle.vin.length === 17

  return (
    <>
      {showScanner && (
        <BarkoderScanner
          onClose={() => setShowScanner(false)}
          onDetected={handleVinDetected}
          onFail={() => setShowScanner(false)}
        />
      )}

      <div className="space-y-6">
        {/* Vehicle Section */}
        <div>
          <h3 className="text-[13px] font-semibold text-zinc-800 flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center">
              <Car size={13} className="text-red-600" />
            </div>
            Vehicle Information
          </h3>

          {/* Search existing intakes/vehicles */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by VIN, vehicle, or customer name..."
              value={vinSearch}
              onChange={e => setVinSearch(e.target.value)}
              className={`${inputClass} pl-9`}
            />
            {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-zinc-400" />}
          </div>

          {/* Intake history results */}
          {filteredIntakes.length > 0 && (
            <div className="border border-zinc-200 rounded-xl mb-3 overflow-hidden">
              <div className="px-3 py-1.5 bg-zinc-50 border-b border-zinc-100">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">From Intake History</span>
              </div>
              {filteredIntakes.map(intake => {
                const customer = (intake as any).customer
                const vehicleStr = [intake.year, intake.make, intake.model].filter(Boolean).join(' ')
                return (
                  <button
                    key={intake.id}
                    onClick={() => selectFromIntake(intake)}
                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-red-50/50 border-b border-zinc-100 last:border-0 transition-colors"
                  >
                    <span className="font-medium text-zinc-700">{vehicleStr || 'Unknown Vehicle'}</span>
                    {intake.vin && <span className="ml-2 font-mono text-xs text-zinc-400">{intake.vin}</span>}
                    {customer?.name && <span className="ml-2 text-zinc-400 text-xs">— {customer.name}</span>}
                  </button>
                )
              })}
            </div>
          )}

          {/* Vehicle DB results */}
          {searchResults.length > 0 && filteredIntakes.length === 0 && (
            <div className="border border-zinc-200 rounded-xl mb-3 overflow-hidden">
              <div className="px-3 py-1.5 bg-zinc-50 border-b border-zinc-100">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Vehicles Database</span>
              </div>
              {searchResults.map(v => (
                <button
                  key={v.id}
                  onClick={() => selectExistingVehicle(v)}
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-red-50/50 border-b border-zinc-100 last:border-0 transition-colors"
                >
                  <span className="font-medium text-zinc-700">{v.year} {v.make} {v.model}</span>
                  <span className="ml-2 font-mono text-xs text-zinc-400">{v.vin}</span>
                </button>
              ))}
            </div>
          )}

          {/* VIN Input + Scan/Decode */}
          <div className="mb-3">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">VIN</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={vehicle.vin}
                onChange={e => { setVehicle({ ...vehicle, vin: e.target.value.toUpperCase().slice(0, 17) }); setDecodeError('') }}
                placeholder="17-CHARACTER VIN..."
                maxLength={17}
                className={`${inputClass} flex-1 min-w-0 font-mono uppercase`}
              />
              {!isTyping ? (
                <button
                  type="button"
                  onClick={() => setShowScanner(true)}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm shadow-red-700/20 active:opacity-90 transition-all"
                >
                  <ScanLine size={15} />
                  Scan
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleVinDecode}
                  disabled={decoding || !canDecode}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm shadow-red-700/20 active:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {decoding
                    ? <Loader2 size={14} className="animate-spin" />
                    : <><Search size={14} /> Check</>
                  }
                </button>
              )}
            </div>
            {isTyping && !decodeError && (
              <p className={`text-[11px] mt-1.5 font-medium ${canDecode ? 'text-emerald-500' : 'text-zinc-400'}`}>
                {canDecode ? '✓ 17 characters — tap Check to decode' : `${vehicle.vin.length}/17 characters`}
              </p>
            )}
            {decodeError && <p className="text-[11px] text-red-500 mt-1.5">{decodeError}</p>}
          </div>

          {/* Vehicle Fields */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Year</label>
              <input
                type="number"
                value={vehicle.year || ''}
                onChange={e => setVehicle({ ...vehicle, year: e.target.value ? parseInt(e.target.value) : null })}
                className={inputClass}
                placeholder="2024"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Make</label>
              <input
                type="text"
                value={vehicle.make || ''}
                onChange={e => setVehicle({ ...vehicle, make: e.target.value })}
                className={inputClass}
                placeholder="Toyota"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Model</label>
              <input
                type="text"
                value={vehicle.model || ''}
                onChange={e => setVehicle({ ...vehicle, model: e.target.value })}
                className={inputClass}
                placeholder="Camry"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Trim</label>
              <input
                type="text"
                value={vehicle.trim || ''}
                onChange={e => setVehicle({ ...vehicle, trim: e.target.value })}
                className={inputClass}
                placeholder="XSE"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Color</label>
              <input
                type="text"
                value={vehicle.color || ''}
                onChange={e => setVehicle({ ...vehicle, color: e.target.value })}
                className={inputClass}
                placeholder="White"
              />
            </div>
          </div>
        </div>

        {/* Customer Selection */}
        <div>
          <h3 className="text-[13px] font-semibold text-zinc-800 flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center">
              <UserCircle size={13} className="text-red-600" />
            </div>
            Customer
          </h3>

          {selectedCustomer ? (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-zinc-800">{selectedCustomer.name}</p>
                <p className="text-xs text-zinc-500">{selectedCustomer.phone} {selectedCustomer.email ? `| ${selectedCustomer.email}` : ''}</p>
              </div>
              <button
                onClick={() => setCustomerId(null)}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className={`${inputClass} pl-9`}
                />
              </div>
              {filteredCustomers.length > 0 && (
                <div className="border border-zinc-200 rounded-xl mt-2 overflow-hidden">
                  {filteredCustomers.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setCustomerId(c.id); setCustomerSearch('') }}
                      className="w-full text-left px-3 py-2.5 text-sm hover:bg-red-50/50 border-b border-zinc-100 last:border-0 transition-colors"
                    >
                      <span className="font-medium text-zinc-700">{c.name}</span>
                      <span className="ml-2 text-zinc-400">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
