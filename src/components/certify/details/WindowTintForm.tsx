import { TINT_FILM_TYPES, TINT_WINDOWS } from '@/lib/warranty-constants'

interface Props {
  details: Record<string, any>
  onChange: (d: Record<string, any>) => void
}

const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all'

export default function WindowTintForm({ details, onChange }: Props) {
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
          placeholder="e.g. XPEL, 3M"
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
          placeholder="e.g. PRIME XR Plus"
        />
      </div>

      {/* film_type */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">Film Type</label>
        <select
          value={details.film_type || ''}
          onChange={e => onChange({ ...details, film_type: e.target.value })}
          className={inputClass}
        >
          <option value="">Select...</option>
          {TINT_FILM_TYPES.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* spacer for grid alignment */}
      <div />

      {/* windows_covered — full width */}
      <div className="col-span-2">
        <label className="block text-[11px] text-zinc-500 mb-1">Windows Covered</label>
        <div className="flex flex-wrap gap-2">
          {TINT_WINDOWS.map(opt => {
            const selected = (details.windows_covered || []).includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  const current = details.windows_covered || []
                  onChange({
                    ...details,
                    windows_covered: selected
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

      {/* VLT fields — full width grid */}
      <div className="col-span-2">
        <label className="block text-[11px] text-zinc-500 mb-1">VLT by Window</label>
        <div className="grid grid-cols-5 gap-2">
          {[
            { key: 'vlt_windshield', label: 'Windshield' },
            { key: 'vlt_front', label: 'Front' },
            { key: 'vlt_rear', label: 'Rear' },
            { key: 'vlt_back', label: 'Back' },
            { key: 'vlt_sunroof', label: 'Sunroof' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-[11px] text-zinc-400 mb-0.5">{label}</label>
              <input
                type="number"
                value={details[key] || ''}
                onChange={e => onChange({ ...details, [key]: e.target.value ? Number(e.target.value) : '' })}
                className={inputClass}
                placeholder="VLT %"
              />
            </div>
          ))}
        </div>
      </div>

      {/* uv_rejection_pct */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">UV Rejection %</label>
        <input
          type="number"
          value={details.uv_rejection_pct || ''}
          onChange={e => onChange({ ...details, uv_rejection_pct: e.target.value ? Number(e.target.value) : '' })}
          className={inputClass}
          placeholder="%"
        />
      </div>

      {/* ir_rejection_pct */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">IR Rejection %</label>
        <input
          type="number"
          value={details.ir_rejection_pct || ''}
          onChange={e => onChange({ ...details, ir_rejection_pct: e.target.value ? Number(e.target.value) : '' })}
          className={inputClass}
          placeholder="%"
        />
      </div>

      {/* state_compliant */}
      <div className="col-span-2 flex items-center gap-2">
        <input
          type="checkbox"
          checked={details.state_compliant ?? true}
          onChange={e => onChange({ ...details, state_compliant: e.target.checked })}
          className="rounded border-zinc-300 text-red-600 focus:ring-red-500/30"
        />
        <label className="text-[11px] text-zinc-500">State Compliant</label>
      </div>
    </div>
  )
}
