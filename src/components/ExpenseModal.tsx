import { useState } from 'react'
import { X, Upload, Loader2 } from 'lucide-react'
import { Expense, EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, ExpenseCategory } from '@/lib/types'

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10 transition-all'

interface Props {
  expense?: Expense
  onClose: () => void
  onSave: (data: {
    amount: number
    description: string
    category: ExpenseCategory
    vendor: string | null
    date: string
    is_recurring: boolean
    receiptFile?: File
  }) => Promise<void>
}

export default function ExpenseModal({ expense, onClose, onSave }: Props) {
  const isNew = !expense
  const [form, setForm] = useState({
    amount: expense?.amount?.toString() || '',
    description: expense?.description || '',
    category: (expense?.category || 'other') as ExpenseCategory,
    vendor: expense?.vendor || '',
    date: expense?.date || new Date().toISOString().split('T')[0],
    is_recurring: expense?.is_recurring || false,
  })
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(expense?.receipt_url || null)
  const [saving, setSaving] = useState(false)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptFile(file)
    setReceiptPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!form.amount || !form.description || !form.date) return
    setSaving(true)
    try {
      await onSave({
        amount: parseFloat(form.amount),
        description: form.description,
        category: form.category,
        vendor: form.vendor || null,
        date: form.date,
        is_recurring: form.is_recurring,
        receiptFile: receiptFile || undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="font-bold text-zinc-900">{isNew ? 'Add Expense' : 'Edit Expense'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-100 transition-colors">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Amount *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass + ' pl-7'}
                  placeholder="0.00"
                  value={form.amount}
                  onChange={set('amount')}
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Date *</label>
              <input type="date" className={inputClass} value={form.date} onChange={set('date')} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Description *</label>
            <input className={inputClass} placeholder="What was this expense for?" value={form.description} onChange={set('description')} />
          </div>

          {/* Category & Vendor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Category</label>
              <select className={inputClass} value={form.category} onChange={set('category')}>
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Vendor</label>
              <input className={inputClass} placeholder="Vendor name" value={form.vendor} onChange={set('vendor')} />
            </div>
          </div>

          {/* Recurring */}
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_recurring}
              onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))}
              className="w-4 h-4 rounded border-zinc-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-zinc-700">Recurring monthly expense</span>
          </label>

          {/* Receipt Upload */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Receipt</label>
            {receiptPreview ? (
              <div className="relative w-full h-32 rounded-xl overflow-hidden border border-zinc-200">
                <img src={receiptPreview} alt="Receipt" className="w-full h-full object-cover" />
                <button
                  onClick={() => { setReceiptFile(null); setReceiptPreview(null) }}
                  className="absolute top-2 right-2 p-1 bg-black/50 rounded-full"
                >
                  <X size={14} className="text-white" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 cursor-pointer hover:border-red-300 transition-colors">
                <Upload size={20} className="text-zinc-400" />
                <span className="text-xs text-zinc-400">Upload receipt photo</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleReceiptChange} />
              </label>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.amount || !form.description || !form.date}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm shadow-red-700/20 hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {isNew ? 'Add Expense' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
