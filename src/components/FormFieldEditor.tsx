import { GripVertical, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { FormFieldDef, FormFieldType } from '@/lib/types'

const FIELD_TYPE_OPTIONS: { value: FormFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
  { value: 'signature', label: 'Signature' },
  { value: 'photo', label: 'Photo' },
]

const inputClass = 'w-full px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10 transition-all'

interface Props {
  field: FormFieldDef
  onChange: (updated: FormFieldDef) => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  isFirst: boolean
  isLast: boolean
}

export default function FormFieldEditor({ field, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: Props) {
  const update = (patch: Partial<FormFieldDef>) => onChange({ ...field, ...patch })

  return (
    <div className="flex items-start gap-2 p-3 rounded-xl border border-zinc-100 bg-zinc-50/50">
      {/* Grip + Reorder */}
      <div className="flex flex-col items-center gap-0.5 pt-1">
        <GripVertical size={14} className="text-zinc-300" />
        <button onClick={onMoveUp} disabled={isFirst} className="p-0.5 rounded hover:bg-zinc-200 disabled:opacity-30">
          <ChevronUp size={12} className="text-zinc-400" />
        </button>
        <button onClick={onMoveDown} disabled={isLast} className="p-0.5 rounded hover:bg-zinc-200 disabled:opacity-30">
          <ChevronDown size={12} className="text-zinc-400" />
        </button>
      </div>

      {/* Field Config */}
      <div className="flex-1 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input
            className={inputClass}
            placeholder="Field label"
            value={field.label}
            onChange={e => update({ label: e.target.value })}
          />
          <select
            className={inputClass}
            value={field.type}
            onChange={e => update({ type: e.target.value as FormFieldType })}
          >
            {FIELD_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {field.type === 'select' && (
          <input
            className={inputClass}
            placeholder="Options (comma-separated)"
            value={field.options?.join(', ') || ''}
            onChange={e => update({ options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
          />
        )}

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={field.required}
            onChange={e => update({ required: e.target.checked })}
            className="w-3.5 h-3.5 rounded border-zinc-300 text-red-600 focus:ring-red-500"
          />
          <span className="text-[11px] text-zinc-500">Required</span>
        </label>
      </div>

      {/* Delete */}
      <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors mt-1">
        <Trash2 size={14} className="text-zinc-400 hover:text-red-500" />
      </button>
    </div>
  )
}
