import { WHEELS_SERVICE_TYPES, WHEELS_PRORATE_METHODS } from '@/lib/warranty-constants'
import { Plus, X } from 'lucide-react'

interface Props {
  details: Record<string, any>
  onChange: (d: Record<string, any>) => void
}

const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all'

const TIRE_SERVICES = ['NEW_TIRES', 'ALIGNMENT', 'BALANCING']
const WHEEL_SERVICES = ['WHEEL_REPAIR', 'POWDER_COAT', 'REFINISH']

export default function WheelsTiresForm({ details, onChange }: Props) {
  const serviceType = details.service_type || ''
  const showTires = TIRE_SERVICES.includes(serviceType)
  const showWheels = WHEEL_SERVICES.includes(serviceType)

  // Tire specs helpers
  const addTire = () =>
    onChange({ ...details, tire_specs: [...(details.tire_specs || []), { brand: '', model: '', size: '', dot_number: '', speed_rating: '', load_index: '' }] })
  const removeTire = (idx: number) =>
    onChange({ ...details, tire_specs: (details.tire_specs || []).filter((_: any, i: number) => i !== idx) })
  const updateTire = (idx: number, key: string, value: string) => {
    const items = [...(details.tire_specs || [])]
    items[idx] = { ...items[idx], [key]: value }
    onChange({ ...details, tire_specs: items })
  }

  // Wheel specs helpers
  const addWheel = () =>
    onChange({ ...details, wheel_specs: [...(details.wheel_specs || []), { brand: '', size: '', offset: '', bolt_pattern: '', finish_type: '' }] })
  const removeWheel = (idx: number) =>
    onChange({ ...details, wheel_specs: (details.wheel_specs || []).filter((_: any, i: number) => i !== idx) })
  const updateWheel = (idx: number, key: string, value: string) => {
    const items = [...(details.wheel_specs || [])]
    items[idx] = { ...items[idx], [key]: value }
    onChange({ ...details, wheel_specs: items })
  }

  return (
    <div className="space-y-4">
      {/* service_type */}
      <div>
        <label className="block text-[11px] text-zinc-500 mb-1">Service Type</label>
        <select
          value={details.service_type || ''}
          onChange={e => onChange({ ...details, service_type: e.target.value })}
          className={inputClass}
        >
          <option value="">Select...</option>
          {WHEELS_SERVICE_TYPES.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* tire_specs — dynamic array, shown only for tire services */}
      {showTires && (
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">Tire Specs</label>
          <div className="space-y-2">
            {(details.tire_specs || []).map((item: any, idx: number) => (
              <div key={idx} className="space-y-2 p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={item.brand || ''}
                    onChange={e => updateTire(idx, 'brand', e.target.value)}
                    className={inputClass}
                    placeholder="Brand"
                  />
                  <input
                    type="text"
                    value={item.model || ''}
                    onChange={e => updateTire(idx, 'model', e.target.value)}
                    className={inputClass}
                    placeholder="Model"
                  />
                  <input
                    type="text"
                    value={item.size || ''}
                    onChange={e => updateTire(idx, 'size', e.target.value)}
                    className={inputClass}
                    placeholder="Size (e.g. 255/35R19)"
                  />
                </div>
                <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                  <input
                    type="text"
                    value={item.dot_number || ''}
                    onChange={e => updateTire(idx, 'dot_number', e.target.value)}
                    className={inputClass}
                    placeholder="DOT Number"
                  />
                  <input
                    type="text"
                    value={item.speed_rating || ''}
                    onChange={e => updateTire(idx, 'speed_rating', e.target.value)}
                    className={inputClass}
                    placeholder="Speed Rating"
                  />
                  <input
                    type="text"
                    value={item.load_index || ''}
                    onChange={e => updateTire(idx, 'load_index', e.target.value)}
                    className={inputClass}
                    placeholder="Load Index"
                  />
                  <button
                    type="button"
                    onClick={() => removeTire(idx)}
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
            onClick={addTire}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 transition-all"
          >
            <Plus size={14} /> Add Tire
          </button>
        </div>
      )}

      {/* wheel_specs — dynamic array, shown only for wheel services */}
      {showWheels && (
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">Wheel Specs</label>
          <div className="space-y-2">
            {(details.wheel_specs || []).map((item: any, idx: number) => (
              <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-2 items-end">
                <input
                  type="text"
                  value={item.brand || ''}
                  onChange={e => updateWheel(idx, 'brand', e.target.value)}
                  className={inputClass}
                  placeholder="Brand"
                />
                <input
                  type="text"
                  value={item.size || ''}
                  onChange={e => updateWheel(idx, 'size', e.target.value)}
                  className={inputClass}
                  placeholder="Size"
                />
                <input
                  type="text"
                  value={item.offset || ''}
                  onChange={e => updateWheel(idx, 'offset', e.target.value)}
                  className={inputClass}
                  placeholder="Offset"
                />
                <input
                  type="text"
                  value={item.bolt_pattern || ''}
                  onChange={e => updateWheel(idx, 'bolt_pattern', e.target.value)}
                  className={inputClass}
                  placeholder="Bolt Pattern"
                />
                <input
                  type="text"
                  value={item.finish_type || ''}
                  onChange={e => updateWheel(idx, 'finish_type', e.target.value)}
                  className={inputClass}
                  placeholder="Finish Type"
                />
                <button
                  type="button"
                  onClick={() => removeWheel(idx)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addWheel}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 transition-all"
          >
            <Plus size={14} /> Add Wheel
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* tread_depth_32nds */}
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">Tread Depth (32nds)</label>
          <input
            type="number"
            value={details.tread_depth_32nds || ''}
            onChange={e => onChange({ ...details, tread_depth_32nds: e.target.value ? Number(e.target.value) : '' })}
            className={inputClass}
            placeholder="32nds of an inch"
          />
        </div>

        {/* lug_torque_ft_lbs */}
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">Lug Torque (ft-lbs) *</label>
          <input
            type="number"
            required
            value={details.lug_torque_ft_lbs || ''}
            onChange={e => onChange({ ...details, lug_torque_ft_lbs: e.target.value ? Number(e.target.value) : '' })}
            className={inputClass}
            placeholder="ft-lbs"
          />
        </div>

        {/* prorate_method */}
        <div className="col-span-2">
          <label className="block text-[11px] text-zinc-500 mb-1">Pro-Rate Method</label>
          <select
            value={details.prorate_method || ''}
            onChange={e => onChange({ ...details, prorate_method: e.target.value })}
            className={inputClass}
          >
            <option value="">Select...</option>
            {WHEELS_PRORATE_METHODS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={details.tpms_reset ?? false}
            onChange={e => onChange({ ...details, tpms_reset: e.target.checked })}
            className="rounded border-zinc-300 text-red-600 focus:ring-red-500/30"
          />
          <label className="text-[11px] text-zinc-500">TPMS reset</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={details.road_hazard_coverage ?? false}
            onChange={e => onChange({ ...details, road_hazard_coverage: e.target.checked })}
            className="rounded border-zinc-300 text-red-600 focus:ring-red-500/30"
          />
          <label className="text-[11px] text-zinc-500">Road hazard coverage</label>
        </div>
      </div>
    </div>
  )
}
