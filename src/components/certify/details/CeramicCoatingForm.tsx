import { CERAMIC_SURFACES, CERAMIC_PREP_METHODS, CERAMIC_CURE_METHODS } from '@/lib/warranty-constants'

interface Props {
  details: Record<string, any>
  onChange: (d: Record<string, any>) => void
}

const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all'

export default function CeramicCoatingForm({ details, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* coating_brand */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">Coating Brand *</label>
        <input
          type="text"
          required
          value={details.coating_brand || ''}
          onChange={e => onChange({ ...details, coating_brand: e.target.value })}
          className={inputClass}
          placeholder="e.g. Gtechniq, CQuartz"
        />
      </div>

      {/* coating_product */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">Coating Product *</label>
        <input
          type="text"
          required
          value={details.coating_product || ''}
          onChange={e => onChange({ ...details, coating_product: e.target.value })}
          className={inputClass}
          placeholder="e.g. Crystal Serum Ultra"
        />
      </div>

      {/* layers_applied */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">Layers Applied</label>
        <input
          type="number"
          value={details.layers_applied || ''}
          onChange={e => onChange({ ...details, layers_applied: e.target.value ? Number(e.target.value) : '' })}
          className={inputClass}
          placeholder="Number of layers"
        />
      </div>

      {/* prep_method */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">Prep Method</label>
        <select
          value={details.prep_method || ''}
          onChange={e => onChange({ ...details, prep_method: e.target.value })}
          className={inputClass}
        >
          <option value="">Select...</option>
          {CERAMIC_PREP_METHODS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* surfaces_coated — full width */}
      <div className="col-span-2">
        <label className="block text-[11px] text-zinc-500 mb-1">Surfaces Coated</label>
        <div className="flex flex-wrap gap-2">
          {CERAMIC_SURFACES.map(opt => {
            const selected = (details.surfaces_coated || []).includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  const current = details.surfaces_coated || []
                  onChange({
                    ...details,
                    surfaces_coated: selected
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

      {/* cure_temp_f */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">Cure Temp</label>
        <input
          type="number"
          value={details.cure_temp_f || ''}
          onChange={e => onChange({ ...details, cure_temp_f: e.target.value ? Number(e.target.value) : '' })}
          className={inputClass}
          placeholder="Fahrenheit"
        />
      </div>

      {/* cure_humidity */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">Cure Humidity</label>
        <input
          type="number"
          value={details.cure_humidity || ''}
          onChange={e => onChange({ ...details, cure_humidity: e.target.value ? Number(e.target.value) : '' })}
          className={inputClass}
          placeholder="%"
        />
      </div>

      {/* cure_method */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">Cure Method</label>
        <select
          value={details.cure_method || ''}
          onChange={e => onChange({ ...details, cure_method: e.target.value })}
          className={inputClass}
        >
          <option value="">Select...</option>
          {CERAMIC_CURE_METHODS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
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

      {/* maintenance_required */}
      <div className="col-span-2 flex items-center gap-2">
        <input
          type="checkbox"
          checked={details.maintenance_required ?? true}
          onChange={e => onChange({ ...details, maintenance_required: e.target.checked })}
          className="rounded border-zinc-300 text-red-600 focus:ring-red-500/30"
        />
        <label className="text-[11px] text-zinc-500">Maintenance Required</label>
      </div>
    </div>
  )
}
