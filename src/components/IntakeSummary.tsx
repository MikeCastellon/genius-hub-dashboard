import { X } from 'lucide-react'
import { CartItem } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

interface Props {
  cart: CartItem[]
  onCartChange: (cart: CartItem[]) => void
}

export default function IntakeSummary({ cart, onCartChange }: Props) {
  const total = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  const removeItem = (serviceId: string) =>
    onCartChange(cart.filter(i => i.service.id !== serviceId))

  const updatePrice = (serviceId: string, price: number) =>
    onCartChange(cart.map(i => i.service.id === serviceId ? { ...i, unitPrice: price } : i))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold text-zinc-800">Order Summary</h3>
        {cart.length > 0 && (
          <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">
            {cart.reduce((s, i) => s + i.quantity, 0)} services
          </span>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-zinc-300">No services added yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cart.map(item => (
            <div key={item.service.id} className="flex items-center gap-2 py-2 border-b border-zinc-50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-700 truncate">{item.service.name}</p>
                <p className="text-[10px] text-zinc-400">qty {item.quantity}</p>
              </div>
              <input
                type="number"
                value={item.unitPrice}
                onChange={e => updatePrice(item.service.id, parseFloat(e.target.value) || 0)}
                step="0.01"
                min="0"
                className="w-20 px-2 py-1 text-xs rounded-lg border border-zinc-200 text-right focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
              />
              <button
                type="button"
                onClick={() => removeItem(item.service.id)}
                className="text-zinc-300 hover:text-red-400 transition-colors shrink-0"
              >
                <X size={13} />
              </button>
            </div>
          ))}

          <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
            <span className="text-sm font-bold text-zinc-900">Total</span>
            <span className="text-base font-bold text-blue-600">{formatCurrency(total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
