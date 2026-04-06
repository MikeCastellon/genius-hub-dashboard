import { useState, useEffect } from 'react'
import { Search, Loader2, Filter, PackageX } from 'lucide-react'
import { callRepairsPartsTech, createPartsOrder, useAuth } from '@/lib/store'
import type { Vehicle } from '@/lib/types'
import SupplierCard, { type SupplierResult } from './SupplierCard'

interface Props {
  vehicle: Vehicle
  initialSearch?: string
}

type SortOption = 'price_asc' | 'distance'

export default function PartsSearch({ vehicle, initialSearch = '' }: Props) {
  const { profile } = useAuth()
  const [searchInput, setSearchInput] = useState(initialSearch)
  const [results, setResults] = useState<SupplierResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  // Filters
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('price_asc')

  // Order feedback
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null)

  // Auto-search when initialSearch is provided
  useEffect(() => {
    if (initialSearch) {
      handleSearch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSearch() {
    const query = searchInput.trim()
    if (!query) return

    setLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const data = await callRepairsPartsTech({
        action: 'search',
        vin: vehicle.vin,
        part_name: query,
      })
      setResults(Array.isArray(data) ? data : data?.results ?? [])
    } catch (err: any) {
      setError(err?.message || 'Failed to search parts. Please try again.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  // Filtered + sorted results
  const filtered = results
    .filter(r => !inStockOnly || r.stock_status !== 'Out of Stock')
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price
      // distance: parse leading number
      const dA = parseFloat(a.distance) || 0
      const dB = parseFloat(b.distance) || 0
      return dA - dB
    })

  async function handleOrder(supplier: SupplierResult) {
    if (!profile) return
    try {
      await createPartsOrder({
        vehicle_id: vehicle.id,
        repair_lookup_id: null,
        supplier: supplier.supplier,
        parts_json: [
          {
            name: supplier.part_name,
            part_number: supplier.part_number,
            qty: 1,
            price: supplier.price,
          },
        ],
        total_cost: supplier.price,
        status: 'pending',
        partstech_order_id: null,
        created_by: profile.id,
        business_id: profile.business_id!,
      })
      setOrderSuccess(supplier.supplier)
      setTimeout(() => setOrderSuccess(null), 3000)
    } catch (err: any) {
      setError(err?.message || 'Failed to place order.')
    }
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Part name or OEM part number..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 bg-white/80 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !searchInput.trim()}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Search
        </button>
      </div>

      {/* VIN context */}
      {vehicle.vin && (
        <p className="text-xs text-zinc-400">
          Fitment for VIN: <span className="font-mono text-zinc-500">{vehicle.vin}</span>
          {vehicle.year && vehicle.make && vehicle.model && (
            <span className="ml-1">
              ({vehicle.year} {vehicle.make} {vehicle.model})
            </span>
          )}
        </p>
      )}

      {/* Filters row */}
      {hasSearched && results.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Filter size={12} />
            <span className="font-semibold">Filters:</span>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-zinc-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={e => setInStockOnly(e.target.checked)}
              className="rounded border-zinc-300 text-blue-500 focus:ring-blue-400/40"
            />
            In Stock Only
          </label>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortOption)}
            className="text-xs border border-zinc-200 rounded-lg px-2 py-1 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
          >
            <option value="price_asc">Price: Low to High</option>
            <option value="distance">Distance: Nearest</option>
          </select>

          <span className="text-[11px] text-zinc-400 ml-auto">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Success toast */}
      {orderSuccess && (
        <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-medium animate-in fade-in">
          Order placed with {orderSuccess}!
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-zinc-500">Searching suppliers...</span>
        </div>
      )}

      {/* Results grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((s, i) => (
            <SupplierCard
              key={`${s.supplier}-${s.part_number}-${i}`}
              supplier={s}
              vehicleId={vehicle.id}
              onOrder={() => handleOrder(s)}
            />
          ))}
        </div>
      )}

      {/* Empty state — no results after search */}
      {!loading && hasSearched && results.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
          <PackageX size={32} className="mb-2" />
          <p className="text-sm font-medium">No parts found</p>
          <p className="text-xs mt-1">Try a different search term or part number</p>
        </div>
      )}

      {/* Empty state — filtered to zero */}
      {!loading && hasSearched && results.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
          <p className="text-sm">No results match your filters</p>
        </div>
      )}

      {/* Initial empty state */}
      {!loading && !hasSearched && (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
          <Search size={32} className="mb-2" />
          <p className="text-sm font-medium">Search for parts to see supplier pricing</p>
        </div>
      )}
    </div>
  )
}
