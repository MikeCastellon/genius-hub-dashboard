import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicFormTemplate, submitPublicForm, uploadFormFile } from '@/lib/store'
import { FormTemplate, FormFieldDef } from '@/lib/types'
import { Loader2, CheckCircle, Camera, Trash2 } from 'lucide-react'

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10 transition-all'

export default function PublicForm() {
  const { templateId } = useParams<{ templateId: string }>()
  const [template, setTemplate] = useState<FormTemplate | null>(null)
  const [business, setBusiness] = useState<any>(null)
  const [notFound, setNotFound] = useState(false)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!templateId) return
    getPublicFormTemplate(templateId).then(result => {
      if (!result) { setNotFound(true); return }
      setTemplate(result.template)
      setBusiness(result.business)
    })
  }, [templateId])

  const set = (fieldId: string, value: any) => setResponses(r => ({ ...r, [fieldId]: value }))

  const sortedFields = template ? [...template.fields].sort((a, b) => a.position - b.position) : []

  const requiredFieldsFilled = sortedFields
    .filter(f => f.required)
    .every(f => {
      const v = responses[f.id]
      if (f.type === 'checkbox') return true
      return v !== undefined && v !== '' && v !== null
    })

  const handleSubmit = async () => {
    if (!template || !requiredFieldsFilled) return
    setSubmitting(true)
    setError(null)
    try {
      await submitPublicForm({
        form_template_id: template.id,
        business_id: template.business_id,
        responses,
      })
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Failed to submit form')
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (!template && !notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 size={32} className="animate-spin text-red-600" />
      </div>
    )
  }

  // Not found
  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="text-center">
          <p className="text-lg font-bold text-zinc-900 mb-2">Form Not Found</p>
          <p className="text-sm text-zinc-400">This form may no longer be available.</p>
        </div>
      </div>
    )
  }

  // Success
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <p className="text-lg font-bold text-zinc-900 mb-2">Form Submitted</p>
          <p className="text-sm text-zinc-400">Thank you! Your response has been recorded.</p>
          {business?.name && (
            <p className="text-xs text-zinc-400 mt-4">{business.name}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {business?.logo_url && (
            <img src={business.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
          )}
          <div>
            <h1 className="font-bold text-zinc-900">{template!.name}</h1>
            {business?.name && <p className="text-xs text-zinc-400">{business.name}</p>}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {template!.description && (
          <p className="text-sm text-zinc-500 bg-white rounded-xl p-3 border border-zinc-100">{template!.description}</p>
        )}

        {sortedFields.map(field => (
          <PublicFieldRenderer
            key={field.id}
            field={field}
            value={responses[field.id]}
            onChange={v => set(field.id, v)}
            businessId={template!.business_id}
          />
        ))}

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || !requiredFieldsFilled}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm shadow-red-700/20 hover:shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 size={14} className="animate-spin" />}
          Submit
        </button>

        <p className="text-[10px] text-zinc-400 text-center">
          Powered by Detailers Hub
        </p>
      </div>
    </div>
  )
}

// ── Field Renderer (self-contained, no auth dependencies) ──

function PublicFieldRenderer({ field, value, onChange, businessId }: {
  field: FormFieldDef; value: any; onChange: (v: any) => void; businessId: string
}) {
  const label = (
    <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
      {field.label} {field.required && <span className="text-red-500">*</span>}
    </label>
  )

  switch (field.type) {
    case 'text':
      return <div className="bg-white rounded-xl p-3 border border-zinc-100">{label}<input className={inputClass} value={value || ''} onChange={e => onChange(e.target.value)} /></div>
    case 'textarea':
      return <div className="bg-white rounded-xl p-3 border border-zinc-100">{label}<textarea className={inputClass + ' h-20 resize-none'} value={value || ''} onChange={e => onChange(e.target.value)} /></div>
    case 'number':
      return <div className="bg-white rounded-xl p-3 border border-zinc-100">{label}<input type="number" className={inputClass} value={value || ''} onChange={e => onChange(e.target.value)} /></div>
    case 'date':
      return <div className="bg-white rounded-xl p-3 border border-zinc-100">{label}<input type="date" className={inputClass} value={value || ''} onChange={e => onChange(e.target.value)} /></div>
    case 'checkbox':
      return (
        <div className="bg-white rounded-xl p-3 border border-zinc-100">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} className="w-4 h-4 rounded border-zinc-300 text-red-600 focus:ring-red-500" />
            <span className="text-sm text-zinc-700">{field.label} {field.required && <span className="text-red-500">*</span>}</span>
          </label>
        </div>
      )
    case 'select':
      return (
        <div className="bg-white rounded-xl p-3 border border-zinc-100">
          {label}
          <select className={inputClass} value={value || ''} onChange={e => onChange(e.target.value)}>
            <option value="">Select...</option>
            {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      )
    case 'signature':
      return <div className="bg-white rounded-xl p-3 border border-zinc-100">{label}<PublicSignaturePad value={value} onChange={onChange} businessId={businessId} /></div>
    case 'photo':
      return <div className="bg-white rounded-xl p-3 border border-zinc-100">{label}<PublicPhotoField value={value} onChange={onChange} businessId={businessId} /></div>
    default:
      return <div className="bg-white rounded-xl p-3 border border-zinc-100">{label}<input className={inputClass} value={value || ''} onChange={e => onChange(e.target.value)} /></div>
  }
}

// ── Signature Pad ──

function PublicSignaturePad({ value, onChange, businessId }: { value: string; onChange: (v: string) => void; businessId: string }) {
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

// ── Photo Field ──

function PublicPhotoField({ value, onChange, businessId }: { value: string; onChange: (v: string) => void; businessId: string }) {
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
