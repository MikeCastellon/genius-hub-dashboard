import { useState } from 'react'
import { X, Plus, Loader2 } from 'lucide-react'
import { FormTemplate, FormFieldDef, FormStatus } from '@/lib/types'
import FormFieldEditor from '@/components/FormFieldEditor'

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10 transition-all'

interface Props {
  template?: FormTemplate
  onClose: () => void
  onSave: (data: { name: string; description: string | null; fields: FormFieldDef[]; status: FormStatus }) => Promise<void>
}

export default function FormBuilder({ template, onClose, onSave }: Props) {
  const isNew = !template
  const [name, setName] = useState(template?.name || '')
  const [description, setDescription] = useState(template?.description || '')
  const [status, setStatus] = useState<FormStatus>(template?.status || 'draft')
  const [fields, setFields] = useState<FormFieldDef[]>(template?.fields || [])
  const [saving, setSaving] = useState(false)

  const addField = () => {
    setFields([...fields, {
      id: crypto.randomUUID(),
      label: '',
      type: 'text',
      required: false,
      position: fields.length,
    }])
  }

  const updateField = (index: number, updated: FormFieldDef) => {
    setFields(fields.map((f, i) => i === index ? updated : f))
  }

  const deleteField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index).map((f, i) => ({ ...f, position: i })))
  }

  const moveField = (index: number, direction: -1 | 1) => {
    const newFields = [...fields]
    const swapIdx = index + direction
    if (swapIdx < 0 || swapIdx >= newFields.length) return
    ;[newFields[index], newFields[swapIdx]] = [newFields[swapIdx], newFields[index]]
    setFields(newFields.map((f, i) => ({ ...f, position: i })))
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        fields: fields.map((f, i) => ({ ...f, position: i })),
        status,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center">
      <div className="bg-white w-full md:max-w-2xl md:mx-4 rounded-t-2xl md:rounded-2xl max-h-[90vh] md:max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="font-bold text-zinc-900">{isNew ? 'Create Form' : 'Edit Form'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-100 transition-colors">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Name & Status */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Form Name *</label>
              <input className={inputClass} placeholder="e.g., Vehicle Condition Checklist" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Status</label>
              <select className={inputClass} value={status} onChange={e => setStatus(e.target.value as FormStatus)}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Description</label>
            <textarea className={inputClass + ' h-16 resize-none'} placeholder="Optional description..." value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {/* Fields */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Fields</label>
            <div className="space-y-2">
              {fields.map((field, i) => (
                <FormFieldEditor
                  key={field.id}
                  field={field}
                  onChange={updated => updateField(i, updated)}
                  onDelete={() => deleteField(i)}
                  onMoveUp={() => moveField(i, -1)}
                  onMoveDown={() => moveField(i, 1)}
                  isFirst={i === 0}
                  isLast={i === fields.length - 1}
                />
              ))}
            </div>
            <button
              onClick={addField}
              className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-zinc-300 text-xs font-semibold text-zinc-500 hover:border-red-300 hover:text-red-600 transition-colors w-full justify-center"
            >
              <Plus size={14} /> Add Field
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-zinc-100 flex gap-3" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm shadow-red-700/20 hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isNew ? 'Create Form' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
