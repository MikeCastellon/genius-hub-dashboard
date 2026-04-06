import { formatCurrency } from '@/lib/utils'
import { MapPin, Truck, ShoppingCart } from 'lucide-react'

export interface SupplierResult {
  supplier: string
  part_name: string
  part_number: string
  price: number
  stock_status: string
  distance: string
  delivery_estimate: string
  logo_url?: string
}

interface Props {
  supplier: SupplierResult
  vehicleId: string
  onOrder: () => void
}

const STOCK_BADGE: Record<string, string> = {
  'In Stock': 'bg-green-100 text-green-700 border-green-200',
  'Limited': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Out of Stock': 'bg-red-100 text-red-700 border-red-200',
}

export default function SupplierCard({ supplier, vehicleId, onOrder }: Props) {
  const badgeClass = STOCK_BADGE[supplier.stock_status] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'
  const outOfStock = supplier.stock_status === 'Out of Stock'

  return (
    <div className="glass rounded-2xl overflow-hidden border border-zinc-200" data-vehicle={vehicleId}>
      <div className="h-1.5 bg-gradient-to-r from-blue-400 to-blue-600" />
      <div className="p-4 space-y-3">
        {/* Supplier header */}
        <div className="flex items-center gap-3">
          {supplier.logo_url ? (
            <img
              src={supplier.logo_url}
              alt={supplier.supplier}
              className="w-8 h-8 rounded-lg object-contain bg-white border border-zinc-100"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 text-xs font-bold">
              {supplier.supplier.charAt(0)}
            </div>
          )}
          <h4 className="text-base font-bold text-zinc-900 truncate">{supplier.supplier}</h4>
        </div>

        {/* Part info */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-700 truncate">{supplier.part_name}</p>
          <p className="text-xs text-zinc-400 font-mono">#{supplier.part_number}</p>
        </div>

        {/* Price + stock badge */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-red-600">
            {formatCurrency(supplier.price)}
          </span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${badgeClass}`}>
            {supplier.stock_status}
          </span>
        </div>

        {/* Distance + delivery */}
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <MapPin size={12} />
            {supplier.distance}
          </span>
          <span className="flex items-center gap-1">
            <Truck size={12} />
            {supplier.delivery_estimate}
          </span>
        </div>

        {/* Order button */}
        <button
          onClick={onOrder}
          disabled={outOfStock}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all ${
            outOfStock
              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 active:scale-[0.98]'
          }`}
        >
          <ShoppingCart size={14} />
          {outOfStock ? 'Unavailable' : 'Order'}
        </button>
      </div>
    </div>
  )
}
