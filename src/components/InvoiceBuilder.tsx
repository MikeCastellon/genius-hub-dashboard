import { useState } from 'react'
import { useCustomers } from '@/lib/store'
import { Invoice, InvoiceItem } from '@/lib/types'
import { X, Plus, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface LineItem {
  description: string
  quantity: number
  unit_price: number
  total: number
}

interface Props {
  initialData?: Invoice
  onClose: () => void
  onSave: (data: any) => Promise<void>
}

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10 transition-all'

export default function InvoiceBuilder({ initialData, onClose, onSave }: Props) {
  const { customers } = useCustomers()
  const [customerId, setCustomerId] = useState(initialData?.customer_id || '')
  const [dueDate, setDueDate] = useState(initialData?.due_date || '')
  const [taxRate, setTaxRate] = useState((initialData?.tax_rate ?? 0) * 100)
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [saving, setSaving] = useState(false)

  const [items, setItems] = useState<LineItem[]>(
    initialData?.items?.length
      ? initialData.items.map((i: InvoiceItem) => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price, total: i.total }))
      : [{ description: '', quantity: 1, unit_price: 0, total: 0 }]
  )

  const updateItem = (idx: number, field: keyof LineItem, val: string | number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: val }
      if (field === 'quantity' || field === 'unit_price') {
        updated.total = Number(updated.quantity) * Number(updated.unit_price)
      }
      return updated
    }))
  }

  const addItem = () => setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, total: 0 }])
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))

  const subtotal = items.reduce((s, i) => s + i.total, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total = subtotal + taxAmount

  const handleSave = async () => {
    if (items.every(i => !i.description)) return
    setSaving(true)
    try {
      await onSave({
        customer_id: customerId || null,
        due_date: dueDate || null,
        subtotal,
        tax_rate: taxRate / 100,
        tax_amount: taxAmount,
        total,
        notes,
        items: items.filter(i => i.description),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl max-h-[70vh] md:max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
          <h2 className="font-bold text-zinc-900">{initialData ? 'Edit Invoice' : 'New Invoice'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Customer + Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Customer</label>
              <select className={inputClass} value={customerId} onChange={e => setCustomerId(e.target.value)}>
                <option value="">No customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Due Date</label>
              <input type="date" className={inputClass} value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          {/* Line items */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Line Items</label>
            <div className="space-y-2">
              {/* Header row - hidden on mobile */}
              <div className="hidden md:grid grid-cols-[1fr_56px_80px_80px_32px] gap-2 px-1">
                <span className="text-[10px] font-semibold text-zinc-400">DESCRIPTION</span>
                <span className="text-[10px] font-semibold text-zinc-400 text-center">QTY</span>
                <span className="text-[10px] font-semibold text-zinc-400 text-right">RATE</span>
                <span className="text-[10px] font-semibold text-zinc-400 text-right">TOTAL</span>
                <span />
              </div>
              {items.map((item, idx) => (
                <div key={idx}>
                  {/* Desktop row */}
                  <div className="hidden md:grid grid-cols-[1fr_56px_80px_80px_32px] gap-2 items-center">
                    <input
                      className={inputClass}
                      placeholder="Service or item..."
                      value={item.description}
                      onChange={e => updateItem(idx, 'description', e.target.value)}
                    />
                    <input
                      className={`${inputClass} text-center px-2`}
                      type="number" min="1" step="1"
                      value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 1)}
                    />
                    <input
                      className={`${inputClass} text-right px-2`}
                      type="number" min="0" step="0.01"
                      value={item.unit_price}
                      onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                    <div className="text-right text-sm font-semibold text-zinc-700 pr-1">{formatCurrency(item.total)}</div>
                    <button onClick={() => removeItem(idx)} disabled={items.length === 1}
                      className="p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-20">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {/* Mobile stacked layout */}
                  <div className="md:hidden space-y-2 rounded-xl border border-zinc-100 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-zinc-400 uppercase">Item {idx + 1}</span>
                      <button onClick={() => removeItem(idx)} disabled={items.length === 1}
                        className="p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-20">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <input
                      className={inputClass}
                      placeholder="Service or item..."
                      value={item.description}
                      onChange={e => updateItem(idx, 'description', e.target.value)}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-zinc-400 uppercase block mb-1">Qty</label>
                        <input
                          className={`${inputClass} text-center px-2`}
                          type="number" min="1" step="1"
                          value={item.quantity}
                          onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-zinc-400 uppercase block mb-1">Rate</label>
                        <input
                          className={`${inputClass} text-right px-2`}
                          type="number" min="0" step="0.01"
                          value={item.unit_price}
                          onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-zinc-400 uppercase block mb-1">Total</label>
                        <div className="text-sm font-semibold text-zinc-700 py-2.5 text-right">{formatCurrency(item.total)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addItem} className="mt-2 flex items-center gap-1.5 text-sm text-red-600 font-medium hover:text-red-700">
              <Plus size={14} /> Add line item
            </button>
          </div>

          {/* Tax + Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Tax Rate (%)</label>
              <input
                type="number" min="0" max="100" step="0.1"
                className={inputClass}
                placeholder="0"
                value={taxRate || ''}
                onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Notes</label>
            <textarea className={`${inputClass} resize-none`} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment instructions, thank you note..." />
          </div>

          {/* Totals preview */}
          <div className="bg-zinc-50 rounded-xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-zinc-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            {taxRate > 0 && <div className="flex justify-between text-zinc-600"><span>Tax ({taxRate}%)</span><span>{formatCurrency(taxAmount)}</span></div>}
            <div className="flex justify-between font-bold text-zinc-900 pt-1.5 border-t border-zinc-200"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-100 flex gap-3 shrink-0" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || items.every(i => !i.description)}
            className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold disabled:opacity-40"
          >
            {saving ? 'Saving...' : initialData ? 'Save Changes' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  )
}
