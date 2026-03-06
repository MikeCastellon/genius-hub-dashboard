import { useState } from 'react'
import { Wrench, Plus, Minus, Search } from 'lucide-react'
import { Service, CartItem } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'

interface Props {
  services: Service[]
  cart: CartItem[]
  onCartChange: (cart: CartItem[]) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  'Full Detail': 'bg-blue-50 text-blue-600 border-blue-100',
  'Exterior': 'bg-sky-50 text-sky-600 border-sky-100',
  'Interior': 'bg-violet-50 text-violet-600 border-violet-100',
  'Paint': 'bg-rose-50 text-rose-600 border-rose-100',
  'Engine': 'bg-amber-50 text-amber-600 border-amber-100',
  'General': 'bg-zinc-50 text-zinc-600 border-zinc-100',
}

export default function ServicePicker({ services, cart, onCartChange }: Props) {
  const [search, setSearch] = useState('')

  const filtered = services.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  )

  const categories = Array.from(new Set(filtered.map(s => s.category)))

  const getQty = (serviceId: string) =>
    cart.find(i => i.service.id === serviceId)?.quantity || 0

  const addService = (service: Service) => {
    const existing = cart.find(i => i.service.id === service.id)
    if (existing) {
      onCartChange(cart.map(i => i.service.id === service.id
        ? { ...i, quantity: i.quantity + 1 }
        : i
      ))
    } else {
      onCartChange([...cart, { service, quantity: 1, unitPrice: service.price }])
    }
  }

  const removeService = (serviceId: string) => {
    const existing = cart.find(i => i.service.id === serviceId)
    if (!existing) return
    if (existing.quantity <= 1) {
      onCartChange(cart.filter(i => i.service.id !== serviceId))
    } else {
      onCartChange(cart.map(i => i.service.id === serviceId
        ? { ...i, quantity: i.quantity - 1 }
        : i
      ))
    }
  }

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-zinc-800 flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
          <Wrench size={13} className="text-blue-500" />
        </div>
        Services
      </h3>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search services..."
          className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
        />
      </div>

      {services.length === 0 ? (
        <div className="py-10 text-center text-sm text-zinc-400">
          No services configured yet.{' '}
          <span className="text-blue-500 font-medium">Add services in the Services tab.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map(cat => (
            <div key={cat}>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">{cat}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filtered.filter(s => s.category === cat).map(service => {
                  const qty = getQty(service.id)
                  const colorClass = CATEGORY_COLORS[cat] || CATEGORY_COLORS['General']

                  return (
                    <div
                      key={service.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        qty > 0
                          ? 'bg-blue-50/60 border-blue-200'
                          : 'bg-white border-zinc-100 hover:border-zinc-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-zinc-800 truncate">{service.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold ${colorClass}`}>
                            {cat}
                          </span>
                          {service.duration_minutes && (
                            <span className="text-[10px] text-zinc-400">{service.duration_minutes}min</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs font-bold text-blue-600">{formatCurrency(service.price)}</span>
                        {qty > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => removeService(service.id)}
                              className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="text-xs font-bold text-zinc-900 w-4 text-center">{qty}</span>
                            <button
                              type="button"
                              onClick={() => addService(service)}
                              className="w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addService(service)}
                            className="w-7 h-7 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-100 border border-blue-100 transition-colors"
                          >
                            <Plus size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
