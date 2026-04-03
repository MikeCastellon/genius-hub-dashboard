import { useState } from 'react'
import { useIntakes, useAuth, createCertificate, uploadCertificatePhoto } from '@/lib/store'
import { X, Loader2, Search, Camera } from 'lucide-react'

interface Props {
  preselectedIntakeId?: string
  onClose: () => void
  onSaved: () => void
}

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10 transition-all'

const WARRANTY_OPTIONS = [
  { value: 1, label: '1 Year' },
  { value: 2, label: '2 Years' },
  { value: 3, label: '3 Years' },
  { value: 5, label: '5 Years' },
  { value: 10, label: '10 Years' },
]

type PhotoEntry = { file: File; type: 'before' | 'after' | 'product' | 'other'; preview: string }

export default function CertificateBuilder({ preselectedIntakeId, onClose, onSaved }: Props) {
  const { intakes } = useIntakes()
  const { profile } = useAuth()

  const [intakeId, setIntakeId] = useState(preselectedIntakeId || '')
  const [intakeSearch, setIntakeSearch] = useState('')
  const [coatingBrand, setCoatingBrand] = useState('')
  const [coatingProduct, setCoatingProduct] = useState('')
  const [odometer, setOdometer] = useState('')
  const [warrantyYears, setWarrantyYears] = useState(2)
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [saving, setSaving] = useState(false)

  const selectedIntake = intakes.find(i => i.id === intakeId)

  const filteredIntakes = intakes.filter(i => {
    if (!intakeSearch) return true
    const q = intakeSearch.toLowerCase()
    const customer = (i as any).customer
    return (
      customer?.name?.toLowerCase().includes(q) ||
      i.vin?.toLowerCase().includes(q) ||
      [i.year, i.make, i.model].filter(Boolean).join(' ').toLowerCase().includes(q)
    )
  })

  const warrantyExpiry = new Date()
  warrantyExpiry.setFullYear(warrantyExpiry.getFullYear() + warrantyYears)
  const expiryStr = warrantyExpiry.toISOString().split('T')[0]

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>, type: PhotoEntry['type']) => {
    const files = Array.from(e.target.files || [])
    const newPhotos = files.map(file => ({
      file,
      type,
      preview: URL.createObjectURL(file),
    }))
    setPhotos(prev => [...prev, ...newPhotos])
    e.target.value = ''
  }

  const removePhoto = (idx: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[idx].preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const handleSave = async () => {
    if (!intakeId || !coatingBrand || !coatingProduct || !profile?.business_id) return
    setSaving(true)
    try {
      const cert = await createCertificate({
        business_id: profile.business_id,
        intake_id: intakeId,
        coating_brand: coatingBrand,
        coating_product: coatingProduct,
        odometer: odometer ? parseInt(odometer) : null,
        warranty_years: warrantyYears,
        warranty_expiry: expiryStr,
        technician_id: profile.id || null,
        status: 'active',
        is_public: true,
        notes: notes || null,
      })

      // Upload photos
      for (const photo of photos) {
        await uploadCertificatePhoto(cert.id, profile.business_id, photo.file, photo.type)
      }

      onSaved()
    } catch (err: any) {
      alert('Error creating certificate: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const canSave = intakeId && coatingBrand && coatingProduct

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="font-bold text-zinc-900">New Certificate</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Step 1: Select Intake */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Select Vehicle Intake</label>
            {!selectedIntake ? (
              <>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300" />
                  <input
                    className={`${inputClass} pl-9`}
                    placeholder="Search by customer, VIN, vehicle..."
                    value={intakeSearch}
                    onChange={e => setIntakeSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-zinc-200 divide-y divide-zinc-100">
                  {filteredIntakes.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-zinc-400 text-center">No intakes found</p>
                  ) : (
                    filteredIntakes.slice(0, 20).map(intake => {
                      const customer = (intake as any).customer
                      const vehicle = [intake.year, intake.make, intake.model].filter(Boolean).join(' ')
                      return (
                        <button
                          key={intake.id}
                          onClick={() => setIntakeId(intake.id)}
                          className="w-full text-left px-3 py-2.5 hover:bg-red-50/50 transition-colors"
                        >
                          <p className="text-sm font-medium text-zinc-800">{customer?.name || 'Unknown'}</p>
                          <p className="text-[11px] text-zinc-400">{vehicle || 'No vehicle info'} {intake.vin ? `· ${intake.vin}` : ''}</p>
                        </button>
                      )
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 border border-red-100">
                <div>
                  <p className="text-sm font-medium text-zinc-800">{(selectedIntake as any).customer?.name || 'Unknown'}</p>
                  <p className="text-[11px] text-zinc-400">
                    {[selectedIntake.year, selectedIntake.make, selectedIntake.model].filter(Boolean).join(' ')}
                    {selectedIntake.vin ? ` · ${selectedIntake.vin}` : ''}
                  </p>
                </div>
                <button onClick={() => setIntakeId('')} className="text-xs text-red-600 font-semibold hover:underline">Change</button>
              </div>
            )}
          </div>

          {/* Step 2: Coating Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Coating Brand</label>
              <input className={inputClass} placeholder="e.g. Ceramic Pro" value={coatingBrand} onChange={e => setCoatingBrand(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Coating Product</label>
              <input className={inputClass} placeholder="e.g. Gold Package" value={coatingProduct} onChange={e => setCoatingProduct(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Odometer (optional)</label>
            <input className={inputClass} type="number" placeholder="Current mileage" value={odometer} onChange={e => setOdometer(e.target.value)} />
          </div>

          {/* Step 3: Warranty */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Warranty Duration</label>
            <div className="flex gap-2 flex-wrap">
              {WARRANTY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setWarrantyYears(opt.value)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    warrantyYears === opt.value
                      ? 'bg-gradient-to-r from-red-700 to-red-600 text-white shadow-sm'
                      : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1.5">Expires: {new Date(expiryStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>

          {/* Step 4: Photos */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Photos</label>
            <div className="grid grid-cols-2 gap-2">
              {(['before', 'after', 'product', 'other'] as const).map(type => (
                <label
                  key={type}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-zinc-200 hover:border-red-300 cursor-pointer transition-colors"
                >
                  <Camera size={20} className="text-zinc-300 mb-1" />
                  <span className="text-[11px] font-semibold text-zinc-400 capitalize">{type}</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoAdd(e, type)} />
                </label>
              ))}
            </div>
            {photos.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {photos.map((p, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-zinc-200">
                    <img src={p.preview} className="w-full h-full object-cover" alt="" />
                    <button
                      onClick={() => removePhoto(idx)}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px]"
                    >
                      ×
                    </button>
                    <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] text-center py-0.5 capitalize">{p.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Notes (optional)</label>
            <textarea className={`${inputClass} resize-none`} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional details about the installation..." />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !canSave}
            className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating...
              </>
            ) : (
              'Create Certificate'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
