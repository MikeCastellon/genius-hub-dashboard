import { useState } from 'react'
import {
  X, Eye, EyeOff, Trash2, Plus, GripVertical, ArrowUp, ArrowDown,
  Banknote, Wallet, Smartphone, CreditCard, DollarSign, Receipt, QrCode, Landmark, Send, CircleDollarSign,
} from 'lucide-react'
import { IntakeSectionDef, IntakeFieldDef, IntakeSectionKey, getSectionFields, PAYMENT_ICONS, PAYMENT_GRADIENTS } from '@/lib/types'

interface Props {
  sectionKey: IntakeSectionKey
  section: IntakeSectionDef
  onSave: (updated: IntakeSectionDef) => void
  onDelete?: () => void // only for custom sections
  onClose: () => void
}

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10 transition-all'

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Banknote, Wallet, Smartphone, CreditCard, DollarSign, Receipt, QrCode, Landmark, Send, CircleDollarSign,
}

export default function SectionEditModal({ sectionKey, section, onSave, onDelete, onClose }: Props) {
  const [label, setLabel] = useState(section.label)
  const [visible, setVisible] = useState(section.visible)
  const [fields, setFields] = useState<IntakeFieldDef[]>(
    JSON.parse(JSON.stringify(getSectionFields(sectionKey, section)))
  )

  const isPayment = sectionKey === 'payment'

  // New field form
  const [showAddField, setShowAddField] = useState(false)
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldType, setNewFieldType] = useState<IntakeFieldDef['fieldType']>('text')
  const [newFieldRequired, setNewFieldRequired] = useState(false)
  const [newFieldOptions, setNewFieldOptions] = useState('')
  const [newFieldIcon, setNewFieldIcon] = useState('Banknote')
  const [newFieldGradient, setNewFieldGradient] = useState('from-zinc-400 to-zinc-500')

  // Editing field inline (for payment label/icon/gradient)
  const [editingFieldIdx, setEditingFieldIdx] = useState<number | null>(null)

  const hasFields = sectionKey === 'vehicle' || sectionKey === 'customer' || sectionKey === 'payment' || fields.length > 0

  const toggleFieldVisibility = (idx: number) => {
    setFields(prev => prev.map((f, i) => i === idx ? { ...f, visible: !f.visible } : f))
  }

  const updateField = (idx: number, updates: Partial<IntakeFieldDef>) => {
    setFields(prev => prev.map((f, i) => i === idx ? { ...f, ...updates } : f))
  }

  const removeField = (idx: number) => {
    setFields(prev => prev.filter((_, i) => i !== idx))
  }

  const moveField = (idx: number, direction: 'up' | 'down') => {
    setFields(prev => {
      const arr = [...prev]
      if (direction === 'up' && idx > 0) {
        [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
      } else if (direction === 'down' && idx < arr.length - 1) {
        [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
      }
      return arr
    })
  }

  const addField = () => {
    if (!newFieldLabel.trim()) return
    const key = isPayment ? newFieldLabel.trim().toLowerCase().replace(/\s+/g, '_') : `custom_${Date.now()}`
    const newField: IntakeFieldDef = {
      key,
      label: newFieldLabel.trim(),
      fieldType: newFieldType,
      required: newFieldRequired,
      visible: true,
      builtIn: false,
      ...(isPayment ? { icon: newFieldIcon, gradient: newFieldGradient } : {}),
      ...(newFieldType === 'select' ? { options: newFieldOptions.split(',').map(s => s.trim()).filter(Boolean) } : {}),
    }
    setFields(prev => [...prev, newField])
    setNewFieldLabel('')
    setNewFieldType('text')
    setNewFieldRequired(false)
    setNewFieldOptions('')
    setNewFieldIcon('Banknote')
    setNewFieldGradient('from-zinc-400 to-zinc-500')
    setShowAddField(false)
  }

  const handleSave = () => {
    onSave({
      ...section,
      label: label.trim() || section.label,
      visible,
      fields: hasFields ? fields : undefined,
    })
  }

  const renderIconPreview = (iconName: string, gradient: string, size: number = 14) => {
    const Icon = ICON_MAP[iconName] || Banknote
    return (
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br ${gradient} shrink-0`}>
        <Icon size={size} className="text-white" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="text-base font-bold text-zinc-900">Edit Section</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Section label + visibility row */}
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">Section Label</label>
              <input className={inputClass} value={label} onChange={e => setLabel(e.target.value)} />
            </div>
            <div className="flex items-center gap-3 pb-0.5">
              <span className="text-sm font-medium text-zinc-700 whitespace-nowrap">Visible</span>
              <button
                onClick={() => setVisible(!visible)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  visible ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-zinc-100 text-zinc-400 border border-zinc-200'
                }`}
              >
                {visible ? <><Eye size={12} /> Visible</> : <><EyeOff size={12} /> Hidden</>}
              </button>
            </div>
          </div>

          {/* Fields list */}
          {hasFields && (
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">
                {isPayment ? 'Payment Methods' : 'Fields'}
              </label>
              <div className="border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-100">
                {fields.map((field, idx) => (
                  <div key={field.key}>
                    <div className={`flex items-center gap-2 px-3 py-2.5 ${!field.visible ? 'opacity-50 bg-zinc-50' : ''}`}>
                      <GripVertical size={12} className="text-zinc-300 shrink-0" />

                      {/* Move buttons */}
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button onClick={() => moveField(idx, 'up')} disabled={idx === 0}
                          className="p-0.5 rounded text-zinc-400 hover:text-zinc-700 disabled:opacity-20">
                          <ArrowUp size={10} />
                        </button>
                        <button onClick={() => moveField(idx, 'down')} disabled={idx === fields.length - 1}
                          className="p-0.5 rounded text-zinc-400 hover:text-zinc-700 disabled:opacity-20">
                          <ArrowDown size={10} />
                        </button>
                      </div>

                      {/* Icon preview for payment methods */}
                      {isPayment && field.icon && field.gradient && renderIconPreview(field.icon, field.gradient)}

                      {/* Field info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-800">{field.label}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {!isPayment && (
                            <span className="text-[9px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-full font-semibold uppercase">
                              {field.fieldType}
                            </span>
                          )}
                          {field.required && (
                            <span className="text-[9px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full font-semibold uppercase">
                              Required
                            </span>
                          )}
                          {field.builtIn && (
                            <span className="text-[9px] bg-zinc-50 text-zinc-400 px-1.5 py-0.5 rounded-full font-semibold uppercase">
                              Built-in
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Edit button (payment methods - to change label/icon/gradient) */}
                      {isPayment && (
                        <button
                          onClick={() => setEditingFieldIdx(editingFieldIdx === idx ? null : idx)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                            editingFieldIdx === idx ? 'bg-red-50 text-red-600' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
                          }`}
                        >
                          Edit
                        </button>
                      )}

                      {/* Visibility toggle */}
                      <button
                        onClick={() => toggleFieldVisibility(idx)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          field.visible ? 'text-emerald-500 hover:bg-emerald-50' : 'text-zinc-300 hover:bg-zinc-100'
                        }`}
                        title={field.visible ? 'Hide' : 'Show'}
                      >
                        {field.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>

                      {/* Delete (custom fields only) */}
                      {!field.builtIn && (
                        <button onClick={() => removeField(idx)}
                          className="p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Expanded edit row for payment methods */}
                    {isPayment && editingFieldIdx === idx && (
                      <div className="px-4 py-3 bg-zinc-50 border-t border-zinc-100 space-y-3">
                        {/* Label */}
                        <div>
                          <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">Label</label>
                          <input
                            className={inputClass}
                            value={field.label}
                            onChange={e => updateField(idx, { label: e.target.value })}
                          />
                        </div>
                        {/* Icon picker */}
                        <div>
                          <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Icon</label>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.keys(PAYMENT_ICONS).map(iconName => {
                              const Icon = ICON_MAP[iconName]
                              const isActive = field.icon === iconName
                              return (
                                <button
                                  key={iconName}
                                  onClick={() => updateField(idx, { icon: iconName })}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                    isActive
                                      ? 'bg-red-600 text-white shadow-sm'
                                      : 'bg-white border border-zinc-200 text-zinc-500 hover:border-zinc-300'
                                  }`}
                                  title={iconName}
                                >
                                  <Icon size={14} />
                                </button>
                              )
                            })}
                          </div>
                        </div>
                        {/* Gradient picker */}
                        <div>
                          <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Color</label>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(PAYMENT_GRADIENTS).map(([name, grad]) => {
                              const isActive = field.gradient === grad
                              return (
                                <button
                                  key={name}
                                  onClick={() => updateField(idx, { gradient: grad })}
                                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${grad} transition-all ${
                                    isActive ? 'ring-2 ring-red-600 ring-offset-1 scale-110' : 'hover:scale-105'
                                  }`}
                                  title={name}
                                />
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add field / payment method */}
              {!showAddField ? (
                <button onClick={() => setShowAddField(true)}
                  className="flex items-center gap-1.5 text-sm text-red-600 font-semibold hover:text-red-700 mt-3">
                  <Plus size={14} /> {isPayment ? 'Add Payment Method' : 'Add Field'}
                </button>
              ) : (
                <div className="mt-3 border border-zinc-200 rounded-xl p-3 space-y-2.5 bg-zinc-50">
                  <input
                    className={inputClass}
                    placeholder={isPayment ? 'Payment method name (e.g. Apple Pay, PayPal...)' : 'Field label (e.g. Company, Mileage...)'}
                    value={newFieldLabel}
                    onChange={e => setNewFieldLabel(e.target.value)}
                    autoFocus
                  />
                  {isPayment ? (
                    <>
                      {/* Icon picker for new payment method */}
                      <div>
                        <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Icon</label>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.keys(PAYMENT_ICONS).map(iconName => {
                            const Icon = ICON_MAP[iconName]
                            const isActive = newFieldIcon === iconName
                            return (
                              <button
                                key={iconName}
                                type="button"
                                onClick={() => setNewFieldIcon(iconName)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                  isActive
                                    ? 'bg-red-600 text-white shadow-sm'
                                    : 'bg-white border border-zinc-200 text-zinc-500 hover:border-zinc-300'
                                }`}
                                title={iconName}
                              >
                                <Icon size={14} />
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      {/* Gradient picker for new payment method */}
                      <div>
                        <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Color</label>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(PAYMENT_GRADIENTS).map(([name, grad]) => {
                            const isActive = newFieldGradient === grad
                            return (
                              <button
                                key={name}
                                type="button"
                                onClick={() => setNewFieldGradient(grad)}
                                className={`w-8 h-8 rounded-lg bg-gradient-to-br ${grad} transition-all ${
                                  isActive ? 'ring-2 ring-red-600 ring-offset-1 scale-110' : 'hover:scale-105'
                                }`}
                                title={name}
                              />
                            )
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <select className={inputClass} value={newFieldType} onChange={e => setNewFieldType(e.target.value as any)}>
                          <option value="text">Text</option>
                          <option value="textarea">Text Area</option>
                          <option value="number">Number</option>
                          <option value="tel">Phone</option>
                          <option value="email">Email</option>
                          <option value="select">Dropdown</option>
                          <option value="checkbox">Checkbox</option>
                        </select>
                        <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
                          <input type="checkbox" checked={newFieldRequired} onChange={e => setNewFieldRequired(e.target.checked)}
                            className="rounded border-zinc-300 text-red-600" />
                          Required
                        </label>
                      </div>
                      {newFieldType === 'select' && (
                        <input className={inputClass} placeholder="Options (comma-separated)" value={newFieldOptions} onChange={e => setNewFieldOptions(e.target.value)} />
                      )}
                    </>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => setShowAddField(false)} className="flex-1 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600">Cancel</button>
                    <button onClick={addField} disabled={!newFieldLabel.trim()}
                      className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold disabled:opacity-40">Add</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-100 flex items-center gap-3">
          {onDelete && (
            <button onClick={onDelete}
              className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors">
              Delete Section
            </button>
          )}
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600">
            Cancel
          </button>
          <button onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
