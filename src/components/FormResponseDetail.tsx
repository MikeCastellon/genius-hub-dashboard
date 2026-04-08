import { X } from 'lucide-react'
import { FormSubmission } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'

interface Props {
  submission: FormSubmission
  onClose: () => void
}

export default function FormResponseDetail({ submission, onClose }: Props) {
  const template = submission.form_template
  const sortedFields = template ? [...template.fields].sort((a, b) => a.position - b.position) : []

  const renderValue = (field: { type: string }, value: any) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-zinc-300 italic">Not provided</span>
    }
    if (field.type === 'checkbox') {
      return <span className={value ? 'text-emerald-600 font-medium' : 'text-zinc-400'}>{value ? 'Yes' : 'No'}</span>
    }
    if (field.type === 'signature' || field.type === 'photo') {
      return (
        <img src={value} alt={field.type} className="w-full max-w-xs h-24 object-contain rounded-lg border border-zinc-200 bg-white" />
      )
    }
    return <span className="text-zinc-900">{String(value)}</span>
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center">
      <div className="bg-white w-full md:max-w-md md:mx-4 rounded-t-2xl md:rounded-2xl max-h-[90vh] md:max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div>
            <h2 className="font-bold text-zinc-900">{template?.name || 'Response'}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {formatDateTime(submission.created_at)}
              {submission.customer && ` — ${submission.customer.name}`}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-100 transition-colors">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {sortedFields.map(field => (
            <div key={field.id}>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                {field.label}
              </p>
              <div className="text-sm">
                {renderValue(field, submission.responses[field.id])}
              </div>
            </div>
          ))}

          {sortedFields.length === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-zinc-400">No fields in this form template</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-zinc-100" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
