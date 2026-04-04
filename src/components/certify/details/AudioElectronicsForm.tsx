import { AUDIO_INSTALL_TYPES, AUDIO_LABOR_SCOPES } from '@/lib/warranty-constants'
import { Plus, X } from 'lucide-react'

interface Props {
  details: Record<string, any>
  onChange: (d: Record<string, any>) => void
}

const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all'

export default function AudioElectronicsForm({ details, onChange }: Props) {
  // Equipment list helpers
  const addEquipment = () =>
    onChange({ ...details, equipment_list: [...(details.equipment_list || []), { brand: '', model: '', serial_number: '', category: '' }] })
  const removeEquipment = (idx: number) =>
    onChange({ ...details, equipment_list: (details.equipment_list || []).filter((_: any, i: number) => i !== idx) })
  const updateEquipment = (idx: number, key: string, value: string) => {
    const items = [...(details.equipment_list || [])]
    items[idx] = { ...items[idx], [key]: value }
    onChange({ ...details, equipment_list: items })
  }

  return (
    <div className="space-y-4">
      {/* install_type — multi-select */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">Install Type</label>
        <div className="flex flex-wrap gap-2">
          {AUDIO_INSTALL_TYPES.map(opt => {
            const selected = (details.install_type || []).includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  const current = details.install_type || []
                  onChange({
                    ...details,
                    install_type: selected
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

      {/* equipment_list — dynamic array */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">Equipment List</label>
        <div className="space-y-2">
          {(details.equipment_list || []).map((item: any, idx: number) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end">
              <input
                type="text"
                value={item.brand || ''}
                onChange={e => updateEquipment(idx, 'brand', e.target.value)}
                className={inputClass}
                placeholder="Brand"
              />
              <input
                type="text"
                value={item.model || ''}
                onChange={e => updateEquipment(idx, 'model', e.target.value)}
                className={inputClass}
                placeholder="Model"
              />
              <input
                type="text"
                value={item.serial_number || ''}
                onChange={e => updateEquipment(idx, 'serial_number', e.target.value)}
                className={inputClass}
                placeholder="Serial #"
              />
              <input
                type="text"
                value={item.category || ''}
                onChange={e => updateEquipment(idx, 'category', e.target.value)}
                className={inputClass}
                placeholder="Category"
              />
              <button
                type="button"
                onClick={() => removeEquipment(idx)}
                className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addEquipment}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 transition-all"
        >
          <Plus size={14} /> Add Component
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* labor_scope */}
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">Labor Scope</label>
          <select
            value={details.labor_scope || ''}
            onChange={e => onChange({ ...details, labor_scope: e.target.value })}
            className={inputClass}
          >
            <option value="">Select...</option>
            {AUDIO_LABOR_SCOPES.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* wiring_diagram_url */}
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">Wiring Diagram</label>
          <input
            type="text"
            value={details.wiring_diagram_url || ''}
            onChange={e => onChange({ ...details, wiring_diagram_url: e.target.value })}
            className={inputClass}
            placeholder="URL or will upload photo"
          />
        </div>

        {/* parts_warranty_months */}
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">Parts Warranty (months)</label>
          <input
            type="number"
            value={details.parts_warranty_months || ''}
            onChange={e => onChange({ ...details, parts_warranty_months: e.target.value ? Number(e.target.value) : '' })}
            className={inputClass}
            placeholder="Months"
          />
        </div>

        {/* labor_warranty_months */}
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">Labor Warranty (months)</label>
          <input
            type="number"
            value={details.labor_warranty_months || ''}
            onChange={e => onChange({ ...details, labor_warranty_months: e.target.value ? Number(e.target.value) : '' })}
            className={inputClass}
            placeholder="Months"
          />
        </div>
      </div>

      {/* oem_integration checkbox */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={details.oem_integration ?? false}
          onChange={e => onChange({ ...details, oem_integration: e.target.checked })}
          className="rounded border-zinc-300 text-red-600 focus:ring-red-500/30"
        />
        <label className="text-[11px] text-zinc-500">OEM integration retained</label>
      </div>
    </div>
  )
}
