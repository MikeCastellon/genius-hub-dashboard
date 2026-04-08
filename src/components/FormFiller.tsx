import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Loader2, Camera, Trash2 } from 'lucide-react'
import { FormTemplate, FormFieldDef, Customer } from '@/lib/types'
import { uploadFormFile } from '@/lib/store'

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10 transition-all'

interface Props {
  template: FormTemplate
  customers: Customer[]
  businessId: string
  onClose: () => void
  onSubmit: (responses: Record<string, any>, customerId: string | null) => Promise<void>
}

export default function FormFiller({ template, customers, businessId, onClose, onSubmit }: Props) {
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [customerId, setCustomerId] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const set = (fieldId: string, value: any) => setResponses(r => ({ ...r, [fieldId]: value }))

  const sortedFields = [...template.fields].sort((a, b) => a.position - b.position)

  const requiredFieldsFilled = sortedFields
    .filter(f => f.required)
    .every(f => {
      const v = responses[f.id]
      if (f.type === 'checkbox') return true
      return v !== undefined && v !== '' && v !== null
    })

  const handleSubmit = async () => {
    if (!requiredFieldsFilled) return
    setSubmitting(true)
    try {
      await onSubmit(responses, customerId || null)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredCustomers = customerSearch.length >= 2
    ? customers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch)
      ).slice(0, 5)
    : []

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center">
      <div className="bg-white w-full md:max-w-2xl md:mx-4 rounded-t-2xl md:rounded-2xl max-h-[90vh] md:max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <div>
            <h2 className="font-bold text-zinc-900">{template.name}</h2>
            {template.description && <p className="text-xs text-zinc-400 mt-0.5">{template.description}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-100 transition-colors">
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Customer (optional) */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Customer (optional)</label>
            <div className="relative">
              <input
                className={inputClass}
                placeholder="Search by name or phone..."
                value={customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); setCustomerId('') }}
              />
              {filteredCustomers.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full glass rounded-xl border border-zinc-200 shadow-lg max-h-40 overflow-y-auto">
                  {filteredCustomers.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setCustomerId(c.id); setCustomerSearch(c.name) }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 flex justify-between"
                    >
                      <span className="text-zinc-900">{c.name}</span>
                      <span className="text-zinc-400 text-xs">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Fields */}
          {sortedFields.map(field => (
            <FieldRenderer
              key={field.id}
              field={field}
              value={responses[field.id]}
              onChange={v => set(field.id, v)}
              businessId={businessId}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-zinc-100 flex gap-3" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !requiredFieldsFilled}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm shadow-red-700/20 hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Field Renderer ──────────────────────────────────────

function FieldRenderer({ field, value, onChange, businessId }: {
  field: FormFieldDef; value: any; onChange: (v: any) => void; businessId: string
}) {
  const label = (
    <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
      {field.label} {field.required && '*'}
    </label>
  )

  switch (field.type) {
    case 'text':
      return <div>{label}<input className={inputClass} value={value || ''} onChange={e => onChange(e.target.value)} /></div>
    case 'textarea':
      return <div>{label}<textarea className={inputClass + ' h-20 resize-none'} value={value || ''} onChange={e => onChange(e.target.value)} /></div>
    case 'number':
      return <div>{label}<input type="number" className={inputClass} value={value || ''} onChange={e => onChange(e.target.value)} /></div>
    case 'date':
      return <div>{label}<input type="date" className={inputClass} value={value || ''} onChange={e => onChange(e.target.value)} /></div>
    case 'checkbox':
      return (
        <label className="flex items-center gap-2.5 cursor-pointer py-1">
          <input
            type="checkbox"
            checked={!!value}
            onChange={e => onChange(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-300 text-red-600 focus:ring-red-500"
          />
          <span className="text-sm text-zinc-700">{field.label} {field.required && <span className="text-red-500">*</span>}</span>
        </label>
      )
    case 'select':
      return (
        <div>
          {label}
          <select className={inputClass} value={value || ''} onChange={e => onChange(e.target.value)}>
            <option value="">Select...</option>
            {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      )
    case 'signature':
      return <div>{label}<SignaturePad value={value} onChange={onChange} businessId={businessId} /></div>
    case 'photo':
      return <div>{label}<PhotoField value={value} onChange={onChange} businessId={businessId} /></div>
    default:
      return <div>{label}<input className={inputClass} value={value || ''} onChange={e => onChange(e.target.value)} /></div>
  }
}

// ── Signature Pad ───────────────────────────────────────

function SignaturePad({ value, onChange, businessId }: { value: string; onChange: (v: string) => void; businessId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [uploading, setUploading] = useState(false)

  const getCtx = () => canvasRef.current?.getContext('2d')

  const startDraw = useCallback((x: number, y: number) => {
    const ctx = getCtx()
    if (!ctx) return
    setDrawing(true)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, [])

  const draw = useCallback((x: number, y: number) => {
    if (!drawing) return
    const ctx = getCtx()
    if (!ctx) return
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#18181b'
    ctx.lineTo(x, y)
    ctx.stroke()
  }, [drawing])

  const endDraw = useCallback(async () => {
    if (!drawing) return
    setDrawing(false)
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob(async blob => {
      if (!blob) return
      setUploading(true)
      try {
        const file = new File([blob], 'signature.png', { type: 'image/png' })
        const url = await uploadFormFile(file, businessId)
        onChange(url)
      } finally {
        setUploading(false)
      }
    })
  }, [drawing, businessId, onChange])

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const touch = e.touches[0]
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top }
  }

  const clear = () => {
    const ctx = getCtx()
    const canvas = canvasRef.current
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height)
    onChange('')
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
  }, [])

  if (value) {
    return (
      <div className="relative">
        <img src={value} alt="Signature" className="w-full h-24 border border-zinc-200 rounded-xl object-contain bg-white" />
        <button onClick={clear} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full">
          <Trash2 size={12} className="text-white" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full h-24 border-2 border-dashed border-zinc-200 rounded-xl bg-white cursor-crosshair touch-none"
        onMouseDown={e => { const p = getPos(e); startDraw(p.x, p.y) }}
        onMouseMove={e => { const p = getPos(e); draw(p.x, p.y) }}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={e => { e.preventDefault(); const p = getTouchPos(e); startDraw(p.x, p.y) }}
        onTouchMove={e => { e.preventDefault(); const p = getTouchPos(e); draw(p.x, p.y) }}
        onTouchEnd={endDraw}
      />
      {uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
          <Loader2 size={16} className="animate-spin text-red-600" />
        </div>
      )}
      <p className="text-[10px] text-zinc-400 mt-1 text-center">Draw your signature above</p>
    </div>
  )
}

// ── Photo Field ─────────────────────────────────────────

function PhotoField({ value, onChange, businessId }: { value: string; onChange: (v: string) => void; businessId: string }) {
  const [uploading, setUploading] = useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFormFile(file, businessId)
      onChange(url)
    } finally {
      setUploading(false)
    }
  }

  if (value) {
    return (
      <div className="relative w-full h-32 rounded-xl overflow-hidden border border-zinc-200">
        <img src={value} alt="Upload" className="w-full h-full object-cover" />
        <button onClick={() => onChange('')} className="absolute top-2 right-2 p-1 bg-black/50 rounded-full">
          <Trash2 size={12} className="text-white" />
        </button>
      </div>
    )
  }

  return (
    <label className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 cursor-pointer hover:border-red-300 transition-colors">
      {uploading ? (
        <Loader2 size={20} className="animate-spin text-red-600" />
      ) : (
        <>
          <Camera size={20} className="text-zinc-400" />
          <span className="text-xs text-zinc-400">Upload photo</span>
        </>
      )}
      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} disabled={uploading} />
    </label>
  )
}
