import { useState } from 'react'
import { createWarrantyClaim } from '@/lib/store'
import { X, Loader2 } from 'lucide-react'

interface Props {
  certificateId: string
  businessId: string
  onClose: () => void
  onSaved: () => void
}

const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all'

export default function ClaimModal({ certificateId, businessId, onClose, onSaved }: Props) {
  const [description, setDescription] = useState('')
  const [odometer, setOdometer] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!description.trim()) return
    setSaving(true)
    setError(null)
    try {
      await createWarrantyClaim({
        certificate_id: certificateId,
        business_id: businessId,
        claim_date: new Date().toISOString().split('T')[0],
        description: description.trim(),
        status: 'pending',
        resolution: null,
        resolved_date: null,
        odometer_at_claim: odometer ? parseInt(odometer) : null,
      })
      onSaved()
    } catch (err: any) {
      setError(err.message || 'Failed to file claim')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-zinc-900">File Warranty Claim</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">Description *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the issue..."
              className={`${inputClass} resize-none`}
            />
          </div>

          <div>
            <label className="block text-[11px] text-zinc-500 mb-1">Current Odometer (optional)</label>
            <input
              type="number"
              value={odometer}
              onChange={e => setOdometer(e.target.value)}
              placeholder="Current mileage"
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-100">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!description.trim() || saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm shadow-red-700/20 disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            File Claim
          </button>
        </div>
      </div>
    </div>
  )
}
