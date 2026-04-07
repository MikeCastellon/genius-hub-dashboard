import { useState, useEffect } from 'react'
import { callRepairsVehicleDB } from '@/lib/store'
import type { Vehicle } from '@/lib/types'
import { FileText, Calendar, ChevronDown, ChevronUp } from 'lucide-react'

interface TSBItem {
  tsb_number: string
  date: string
  category: string
  subject: string
  description: string
  corrective_action: string
}

interface Props {
  vehicle: Vehicle
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="glass rounded-xl p-4 space-y-2 animate-pulse">
          <div className="h-4 bg-zinc-200 rounded w-2/3" />
          <div className="h-3 bg-zinc-100 rounded w-full" />
          <div className="h-3 bg-zinc-100 rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}

function TSBCard({ item }: { item: TSBItem }) {
  const [expanded, setExpanded] = useState(false)

  const categoryColors: Record<string, string> = {
    Engine: 'bg-red-100 text-red-700',
    Electrical: 'bg-blue-100 text-blue-700',
    Suspension: 'bg-amber-100 text-amber-700',
    Transmission: 'bg-purple-100 text-purple-700',
    Brakes: 'bg-orange-100 text-orange-700',
    HVAC: 'bg-cyan-100 text-cyan-700',
    Body: 'bg-zinc-100 text-zinc-700',
  }

  const colorClass = categoryColors[item.category] || 'bg-zinc-100 text-zinc-700'

  return (
    <div className="glass rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-zinc-50/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${colorClass}`}>
                {item.category}
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">{item.tsb_number}</span>
            </div>
            <h4 className="text-sm font-bold text-zinc-900">{item.subject}</h4>
            <div className="flex items-center gap-1 mt-1">
              <Calendar size={11} className="text-zinc-400" />
              <span className="text-[11px] text-zinc-400">
                {new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
          {expanded ? (
            <ChevronUp size={16} className="text-zinc-400 shrink-0 mt-1" />
          ) : (
            <ChevronDown size={16} className="text-zinc-400 shrink-0 mt-1" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-zinc-100 pt-3">
          <div>
            <h5 className="text-xs font-semibold text-zinc-500 uppercase mb-1">Description</h5>
            <p className="text-sm text-zinc-700 leading-relaxed">{item.description}</p>
          </div>
          {item.corrective_action && (
            <div className="bg-emerald-50 rounded-lg p-3">
              <h5 className="text-xs font-semibold text-emerald-700 uppercase mb-1">Corrective Action</h5>
              <p className="text-sm text-emerald-800 leading-relaxed">{item.corrective_action}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function TSBPanel({ vehicle }: Props) {
  const [items, setItems] = useState<TSBItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    if (!vehicle.vin) return
    setLoading(true)

    callRepairsVehicleDB({ action: 'tsb', vin: vehicle.vin })
      .then(result => {
        const data = result?.data ?? result
        setItems(Array.isArray(data) ? data : [])
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [vehicle.vin])

  if (loading) return <LoadingSkeleton />

  if (items.length === 0) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <FileText size={28} className="mx-auto text-zinc-300 mb-3" />
        <p className="text-sm text-zinc-400 font-medium">No Technical Service Bulletins found for this vehicle</p>
      </div>
    )
  }

  const categories = ['all', ...Array.from(new Set(items.map(i => i.category)))]
  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold text-zinc-800">Technical Service Bulletins</h3>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600">
            {items.length}
          </span>
        </div>
      </div>

      {/* Category Filter */}
      {categories.length > 2 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                filter === cat
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((item, idx) => (
          <TSBCard key={idx} item={item} />
        ))}
      </div>
    </div>
  )
}
