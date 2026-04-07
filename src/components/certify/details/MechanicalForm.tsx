import { MECHANICAL_CATEGORIES } from '@/lib/warranty-constants'
import { Plus, X } from 'lucide-react'

interface Props {
  details: Record<string, any>
  onChange: (d: Record<string, any>) => void
}

const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all'

export default function MechanicalForm({ details, onChange }: Props) {
  // Parts used helpers
  const addPart = () =>
    onChange({ ...details, parts_used: [...(details.parts_used || []), { part_name: '', part_number: '', brand: '', oem_or_aftermarket: '', new_or_reman: '', cost: '' }] })
  const removePart = (idx: number) =>
    onChange({ ...details, parts_used: (details.parts_used || []).filter((_: any, i: number) => i !== idx) })
  const updatePart = (idx: number, key: string, value: string | number) => {
    const items = [...(details.parts_used || [])]
    items[idx] = { ...items[idx], [key]: value }
    onChange({ ...details, parts_used: items })
  }

  // Fluids used helpers
  const addFluid = () =>
    onChange({ ...details, fluids_used: [...(details.fluids_used || []), { fluid_type: '', brand: '', spec: '' }] })
  const removeFluid = (idx: number) =>
    onChange({ ...details, fluids_used: (details.fluids_used || []).filter((_: any, i: number) => i !== idx) })
  const updateFluid = (idx: number, key: string, value: string) => {
    const items = [...(details.fluids_used || [])]
    items[idx] = { ...items[idx], [key]: value }
    onChange({ ...details, fluids_used: items })
  }

  return (
    <div className="space-y-4">
      {/* service_category */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">Service Category</label>
        <select
          value={details.service_category || ''}
          onChange={e => onChange({ ...details, service_category: e.target.value })}
          className={inputClass}
        >
          <option value="">Select...</option>
          {MECHANICAL_CATEGORIES.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* parts_used — dynamic array */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">Parts Used</label>
        <div className="space-y-2">
          {(details.parts_used || []).map((item: any, idx: number) => (
            <div key={idx} className="space-y-2 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={item.part_name || ''}
                  onChange={e => updatePart(idx, 'part_name', e.target.value)}
                  className={inputClass}
                  placeholder="Part Name"
                />
                <input
                  type="text"
                  value={item.part_number || ''}
                  onChange={e => updatePart(idx, 'part_number', e.target.value)}
                  className={inputClass}
                  placeholder="Part Number"
                />
                <input
                  type="text"
                  value={item.brand || ''}
                  onChange={e => updatePart(idx, 'brand', e.target.value)}
                  className={inputClass}
                  placeholder="Brand"
                />
              </div>
              <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
                <select
                  value={item.oem_or_aftermarket || ''}
                  onChange={e => updatePart(idx, 'oem_or_aftermarket', e.target.value)}
                  className={inputClass}
                >
                  <option value="">OEM / Aftermarket</option>
                  <option value="OEM">OEM</option>
                  <option value="Aftermarket">Aftermarket</option>
                </select>
                <select
                  value={item.new_or_reman || ''}
                  onChange={e => updatePart(idx, 'new_or_reman', e.target.value)}
                  className={inputClass}
                >
                  <option value="">New / Remanufactured</option>
                  <option value="New">New</option>
                  <option value="Remanufactured">Remanufactured</option>
                </select>
                <input
                  type="number"
                  value={item.cost || ''}
                  onChange={e => updatePart(idx, 'cost', e.target.value ? Number(e.target.value) : '')}
                  className={inputClass}
                  placeholder="Cost"
                />
                <button
                  type="button"
                  onClick={() => removePart(idx)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addPart}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 transition-all"
        >
          <Plus size={14} /> Add Part
        </button>
      </div>

      {/* labor_description */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">Labor Description</label>
        <textarea
          value={details.labor_description || ''}
          onChange={e => onChange({ ...details, labor_description: e.target.value })}
          className={inputClass}
          rows={3}
          placeholder="Describe labor performed..."
        />
      </div>

      {/* dtc_codes_cleared */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">DTC Codes Cleared (comma-separated)</label>
        <input
          type="text"
          value={(details.dtc_codes_cleared || []).join(', ')}
          onChange={e => onChange({
            ...details,
            dtc_codes_cleared: e.target.value
              .split(',')
              .map((s: string) => s.trim())
              .filter((s: string) => s),
          })}
          className={inputClass}
          placeholder="P0300, P0171, P0420..."
        />
      </div>

      {/* torque_specs_confirmed checkbox */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={details.torque_specs_confirmed ?? false}
          onChange={e => onChange({ ...details, torque_specs_confirmed: e.target.checked })}
          className="rounded border-zinc-300 text-red-600 focus:ring-red-500/30"
        />
        <label className="text-[11px] text-zinc-500">Torque specs confirmed</label>
      </div>

      {/* fluids_used — dynamic array */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">Fluids Used</label>
        <div className="space-y-2">
          {(details.fluids_used || []).map((item: any, idx: number) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
              <input
                type="text"
                value={item.fluid_type || ''}
                onChange={e => updateFluid(idx, 'fluid_type', e.target.value)}
                className={inputClass}
                placeholder="Fluid Type"
              />
              <input
                type="text"
                value={item.brand || ''}
                onChange={e => updateFluid(idx, 'brand', e.target.value)}
                className={inputClass}
                placeholder="Brand"
              />
              <input
                type="text"
                value={item.spec || ''}
                onChange={e => updateFluid(idx, 'spec', e.target.value)}
                className={inputClass}
                placeholder="Spec"
              />
              <button
                type="button"
                onClick={() => removeFluid(idx)}
                className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addFluid}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 transition-all"
        >
          <Plus size={14} /> Add Fluid
        </button>
      </div>

      {/* maintenance_schedule */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">Maintenance Schedule</label>
        <textarea
          value={details.maintenance_schedule || ''}
          onChange={e => onChange({ ...details, maintenance_schedule: e.target.value })}
          className={inputClass}
          rows={3}
          placeholder="Required follow-up maintenance..."
        />
      </div>
    </div>
  )
}
