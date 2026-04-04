import { useState, useEffect } from 'react'
import { Search, Car, Loader2, UserCircle } from 'lucide-react'
import { searchVehicles, decodeVin, useCustomers } from '@/lib/store'
import type { Vehicle } from '@/lib/types'

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

const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all'

export default function StepVehicle({ vehicle, setVehicle, customerId, setCustomerId }: Props) {
  const [vinSearch, setVinSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Vehicle[]>([])
  const [searching, setSearching] = useState(false)
  const [decoding, setDecoding] = useState(false)
  const { customers } = useCustomers()
  const [customerSearch, setCustomerSearch] = useState('')

  // Debounced vehicle search
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
    if (vehicle.vin.length !== 17) return
    setDecoding(true)
    const decoded = await decodeVin(vehicle.vin)
    if (decoded) {
      setVehicle({
        ...vehicle,
        year: decoded.year ?? vehicle.year,
        make: decoded.make ?? vehicle.make,
        model: decoded.model ?? vehicle.model,
        trim: decoded.trim ?? vehicle.trim,
      })
    }
    setDecoding(false)
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

  const filteredCustomers = customerSearch.length >= 2
    ? customers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch)
      ).slice(0, 8)
    : []

  const selectedCustomer = customers.find(c => c.id === customerId)

  return (
    <div className="space-y-6">
      {/* VIN Search */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
          <Car size={16} className="text-red-600" /> Vehicle
        </h3>

        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by VIN..."
            value={vinSearch}
            onChange={e => setVinSearch(e.target.value.toUpperCase())}
            className={`${inputClass} pl-9`}
          />
          {searching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-zinc-400" />}
        </div>

        {searchResults.length > 0 && (
          <div className="border border-zinc-200 rounded-xl mb-3 overflow-hidden">
            {searchResults.map(v => (
              <button
                key={v.id}
                onClick={() => selectExistingVehicle(v)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 border-b border-zinc-100 last:border-0 transition-colors"
              >
                <span className="font-mono text-xs text-zinc-500">{v.vin}</span>
                <span className="ml-2 text-zinc-700">{v.year} {v.make} {v.model}</span>
              </button>
            ))}
          </div>
        )}

        {/* VIN Input + Decode */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 mb-3">
          <input
            type="text"
            placeholder="Enter 17-digit VIN"
            value={vehicle.vin}
            onChange={e => setVehicle({ ...vehicle, vin: e.target.value.toUpperCase().slice(0, 17) })}
            maxLength={17}
            className={`${inputClass} font-mono tracking-wider`}
          />
          <button
            onClick={handleVinDecode}
            disabled={vehicle.vin.length !== 17 || decoding}
            className="px-4 py-2.5 rounded-xl bg-zinc-100 text-sm font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-default transition-all flex items-center gap-1.5"
          >
            {decoding ? <Loader2 size={14} className="animate-spin" /> : null}
            Decode VIN
          </button>
        </div>

        {/* Vehicle Fields */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">Year</label>
            <input
              type="number"
              value={vehicle.year || ''}
              onChange={e => setVehicle({ ...vehicle, year: e.target.value ? parseInt(e.target.value) : null })}
              className={inputClass}
              placeholder="2024"
            />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">Make</label>
            <input
              type="text"
              value={vehicle.make || ''}
              onChange={e => setVehicle({ ...vehicle, make: e.target.value })}
              className={inputClass}
              placeholder="Toyota"
            />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">Model</label>
            <input
              type="text"
              value={vehicle.model || ''}
              onChange={e => setVehicle({ ...vehicle, model: e.target.value })}
              className={inputClass}
              placeholder="Camry"
            />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">Trim</label>
            <input
              type="text"
              value={vehicle.trim || ''}
              onChange={e => setVehicle({ ...vehicle, trim: e.target.value })}
              className={inputClass}
              placeholder="XSE"
            />
          </div>
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">Color</label>
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
        <h3 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
          <UserCircle size={16} className="text-red-600" /> Customer
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
                    className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 border-b border-zinc-100 last:border-0 transition-colors"
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
  )
}
