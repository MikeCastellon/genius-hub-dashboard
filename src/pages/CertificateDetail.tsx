import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCertificate, updateCertificate, getCertificatePhotoUrl } from '@/lib/store'
import { Certificate } from '@/lib/types'
import { ArrowLeft, Link2, Check, Loader2, Award, Eye, EyeOff, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { QRCodeSVG } from 'qrcode.react'

const STATUS_COLORS: Record<Certificate['status'], string> = {
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-amber-100 text-amber-700',
  voided: 'bg-red-100 text-red-600',
}

export default function CertificateDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [cert, setCert] = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [updating, setUpdating] = useState(false)

  const load = async () => {
    if (!id) return
    setLoading(true)
    const data = await getCertificate(id)
    setCert(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const verifyUrl = `${window.location.origin}/verify/${id}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(verifyUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleTogglePublic = async () => {
    if (!cert) return
    setUpdating(true)
    await updateCertificate(cert.id, { is_public: !cert.is_public })
    await load()
    setUpdating(false)
  }

  const handleVoid = async () => {
    if (!cert || !confirm('Are you sure you want to void this certificate? This cannot be undone.')) return
    setUpdating(true)
    await updateCertificate(cert.id, { status: 'voided' })
    await load()
    setUpdating(false)
  }

  if (loading) return (
    <div className="flex justify-center items-center h-full">
      <Loader2 size={24} className="animate-spin text-red-600" />
    </div>
  )

  if (!cert) return (
    <div className="p-6 text-center text-zinc-400">Certificate not found</div>
  )

  const intake = (cert as any).intake
  const customer = intake?.customer
  const photos = (cert as any).photos || []
  const vehicleLabel = [intake?.year, intake?.make, intake?.model].filter(Boolean).join(' ') || '—'
  const isWarrantyActive = cert.status === 'active' && new Date(cert.warranty_expiry) > new Date()
  const warrantyDaysLeft = Math.max(0, Math.ceil((new Date(cert.warranty_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))

  return (
    <div className="p-4 md:p-6">
      {/* Top actions */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate('/certify')} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800">
          <ArrowLeft size={15} /> Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleCopyLink} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
            {copied ? <Check size={14} className="text-emerald-500" /> : <Link2 size={14} />}
            {copied ? 'Copied!' : 'Share Link'}
          </button>
          <button
            onClick={handleTogglePublic}
            disabled={updating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            {cert.is_public ? <Eye size={14} /> : <EyeOff size={14} />}
            {cert.is_public ? 'Public' : 'Private'}
          </button>
        </div>
      </div>

      {/* Certificate document */}
      <div className="glass rounded-2xl p-6 md:p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Award size={20} className="text-red-600" />
              <h1 className="text-2xl font-bold text-zinc-900">{cert.certificate_number}</h1>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[cert.status]}`}>
              {cert.status.toUpperCase()}
            </span>
          </div>
          <div className="bg-white p-2 rounded-xl border border-zinc-100 shadow-sm">
            <QRCodeSVG value={verifyUrl} size={100} />
          </div>
        </div>

        {/* Vehicle info */}
        <div className="mb-6 p-4 bg-zinc-50 rounded-xl">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Vehicle</p>
          <p className="font-semibold text-zinc-900">{vehicleLabel}</p>
          {intake?.vin && <p className="text-sm text-zinc-500 font-mono">{intake.vin}</p>}
          {intake?.color && <p className="text-sm text-zinc-500 capitalize">{intake.color}</p>}
        </div>

        {/* Customer */}
        {customer && (
          <div className="mb-6 p-4 bg-zinc-50 rounded-xl">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Customer</p>
            <p className="font-semibold text-zinc-900">{customer.name}</p>
            {customer.phone && <p className="text-sm text-zinc-500">{customer.phone}</p>}
            {customer.email && <p className="text-sm text-zinc-500">{customer.email}</p>}
          </div>
        )}

        {/* Coating details */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-zinc-50 rounded-xl">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Coating Brand</p>
            <p className="font-semibold text-zinc-900">{cert.coating_brand}</p>
          </div>
          <div className="p-4 bg-zinc-50 rounded-xl">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Coating Product</p>
            <p className="font-semibold text-zinc-900">{cert.coating_product}</p>
          </div>
          {cert.odometer && (
            <div className="p-4 bg-zinc-50 rounded-xl">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Odometer</p>
              <p className="font-semibold text-zinc-900">{cert.odometer.toLocaleString()} mi</p>
            </div>
          )}
          <div className="p-4 bg-zinc-50 rounded-xl">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Install Date</p>
            <p className="font-semibold text-zinc-900">{formatDate(cert.created_at)}</p>
          </div>
        </div>

        {/* Technician */}
        {(cert as any).technician?.display_name && (
          <div className="mb-6 p-4 bg-zinc-50 rounded-xl">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Installer / Technician</p>
            <p className="font-semibold text-zinc-900">{(cert as any).technician.display_name}</p>
          </div>
        )}

        {/* Warranty status bar */}
        <div className={`mb-6 p-4 rounded-xl border-2 ${isWarrantyActive ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Warranty</p>
            <p className={`text-sm font-bold ${isWarrantyActive ? 'text-emerald-700' : 'text-red-600'}`}>
              {isWarrantyActive ? `${warrantyDaysLeft} days remaining` : 'Expired'}
            </p>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-600">{cert.warranty_years} year{cert.warranty_years > 1 ? 's' : ''}</span>
            <span className="text-zinc-600">Expires {formatDate(cert.warranty_expiry)}</span>
          </div>
          {isWarrantyActive && (
            <div className="mt-2 h-2 bg-emerald-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${Math.max(5, (warrantyDaysLeft / (cert.warranty_years * 365)) * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Photos gallery */}
        {photos.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Photos</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {photos.map((photo: any) => (
                <div key={photo.id} className="relative rounded-xl overflow-hidden aspect-square border border-zinc-200">
                  <img
                    src={getCertificatePhotoUrl(photo.storage_path)}
                    alt={photo.photo_type}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center py-1 capitalize font-medium">
                    {photo.photo_type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {cert.notes && (
          <div className="pt-4 border-t border-zinc-100">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-zinc-600">{cert.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {cert.status === 'active' && (
        <div className="mt-4">
          <button
            onClick={handleVoid}
            disabled={updating}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
          >
            <XCircle size={15} />
            Void Certificate
          </button>
        </div>
      )}
    </div>
  )
}
