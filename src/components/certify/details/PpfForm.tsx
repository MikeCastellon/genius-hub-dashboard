import { PPF_COVERAGE_AREAS, PPF_FINISH_TYPES, PPF_EDGE_TECHNIQUES } from '@/lib/warranty-constants'

interface Props {
  details: Record<string, any>
  onChange: (d: Record<string, any>) => void
}

const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all'

export default function PpfForm({ details, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* film_brand */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">Film Brand *</label>
        <input
          type="text"
          required
          value={details.film_brand || ''}
          onChange={e => onChange({ ...details, film_brand: e.target.value })}
          className={inputClass}
          placeholder="e.g. XPEL, SunTek"
        />
      </div>

      {/* film_product */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">Film Product *</label>
        <input
          type="text"
          required
          value={details.film_product || ''}
          onChange={e => onChange({ ...details, film_product: e.target.value })}
          className={inputClass}
          placeholder="e.g. Ultimate Plus"
        />
      </div>

      {/* coverage_areas — full width */}
      <div className="col-span-2">
        <label className="block text-[11px] text-zinc-500 mb-1">Coverage Areas</label>
        <div className="flex flex-wrap gap-2">
          {PPF_COVERAGE_AREAS.map(opt => {
            const selected = (details.coverage_areas || []).includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  const current = details.coverage_areas || []
                  onChange({
                    ...details,
                    coverage_areas: selected
                      ? current.filter((s: string) => s !== opt)
                      : [...current, opt],
                  })
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${selected ? 'bg-red-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
              >
                {opt.replace(/_/g, ' ')}
              </button>
            )
          })}
        </div>
      </div>

      {/* finish_type */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">Finish Type</label>
        <select
          value={details.finish_type || ''}
          onChange={e => onChange({ ...details, finish_type: e.target.value })}
          className={inputClass}
        >
          <option value="">Select...</option>
          {PPF_FINISH_TYPES.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* edge_technique */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">Edge Technique</label>
        <select
          value={details.edge_technique || ''}
          onChange={e => onChange({ ...details, edge_technique: e.target.value })}
          className={inputClass}
        >
          <option value="">Select...</option>
          {PPF_EDGE_TECHNIQUES.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* self_healing_confirmed */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={details.self_healing_confirmed ?? false}
          onChange={e => onChange({ ...details, self_healing_confirmed: e.target.checked })}
          className="rounded border-zinc-300 text-red-600 focus:ring-red-500/30"
        />
        <label className="text-[11px] text-zinc-500">Self-Healing Confirmed</label>
      </div>

      {/* manufacturer_cert_id */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">Manufacturer Cert ID</label>
        <input
          type="text"
          value={details.manufacturer_cert_id || ''}
          onChange={e => onChange({ ...details, manufacturer_cert_id: e.target.value })}
          className={inputClass}
          placeholder="Brand portal cert ID"
        />
      </div>
    </div>
  )
}
