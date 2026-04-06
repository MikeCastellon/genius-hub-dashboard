import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getCertificate, updateCertificate, getCertificatePhotoUrl } from '@/lib/store'
import { Certificate, BUSINESS_TYPE_LABELS, type WarrantyClaim } from '@/lib/types'
import { ArrowLeft, Link2, Check, Loader2, Award, Eye, EyeOff, XCircle, FileWarning, AlertTriangle, ExternalLink, Printer } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { QRCodeSVG } from 'qrcode.react'
import ClaimModal from '@/components/certify/ClaimModal'

const STATUS_COLORS: Record<Certificate['status'], string> = {
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-amber-100 text-amber-700',
  voided: 'bg-red-100 text-red-600',
}

const CLAIM_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  denied: 'bg-red-100 text-red-600',
  resolved: 'bg-blue-100 text-blue-700',
}

export default function CertificateDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [cert, setCert] = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [showClaimModal, setShowClaimModal] = useState(false)

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
    const reason = prompt('Reason for voiding:')
    setUpdating(true)
    await updateCertificate(cert.id, { status: 'voided', void_reason: reason || undefined })
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

  // Support both legacy (intake-based) and new (vehicle-based) certs
  const isNewFormat = !!cert.vehicle_id
  const intake = (cert as any).intake
  const customer = cert.customer || intake?.customer
  const vehicle = cert.vehicle
  const photos = cert.photos || []
  const claims = cert.claims || []

  const vehicleLabel = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(' ')
    : [intake?.year, intake?.make, intake?.model].filter(Boolean).join(' ') || '—'
  const vin = vehicle?.vin || intake?.vin
  const vehicleColor = vehicle?.color || intake?.color

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
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 print:hidden">
            <Printer size={14} /> Print
          </button>
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
      <div className="glass rounded-2xl p-6 md:p-8" id="certificate-printable">
        {/* Company Header */}
        {cert.business && (
          <div className="text-center mb-6 pb-6 border-b border-zinc-200">
            {cert.business.logo_url && (
              <img src={cert.business.logo_url} alt={cert.business.name} className="h-12 mx-auto mb-2" />
            )}
            <h2 className="text-lg font-bold text-zinc-900">{cert.business.name}</h2>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Award size={20} className="text-red-600" />
              <h1 className="text-2xl font-bold text-zinc-900">{cert.certificate_number}</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[cert.status]}`}>
                {cert.status.toUpperCase()}
              </span>
              {cert.business_type && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600">
                  {BUSINESS_TYPE_LABELS[cert.business_type]}
                </span>
              )}
            </div>
          </div>
          <div className="bg-white p-2 rounded-xl border border-zinc-100 shadow-sm">
            <QRCodeSVG value={verifyUrl} size={100} />
          </div>
        </div>

        {/* Vehicle info */}
        <div className="mb-6 p-4 bg-zinc-50 rounded-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Vehicle</p>
            {vin && (
              <Link to={`/vin/${vin}`} className="text-[11px] text-red-600 hover:text-red-700 flex items-center gap-1">
                VIN History <ExternalLink size={10} />
              </Link>
            )}
          </div>
          <p className="font-semibold text-zinc-900">{vehicleLabel}</p>
          {vin && <p className="text-sm text-zinc-500 font-mono">{vin}</p>}
          {vehicleColor && <p className="text-sm text-zinc-500 capitalize">{vehicleColor}</p>}
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

        {/* Service details - legacy */}
        {!isNewFormat && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <InfoBox label="Coating Brand" value={cert.coating_brand} />
            <InfoBox label="Coating Product" value={cert.coating_product} />
            {cert.odometer && <InfoBox label="Odometer" value={`${cert.odometer.toLocaleString()} mi`} />}
            <InfoBox label="Install Date" value={formatDate(cert.created_at)} />
          </div>
        )}

        {/* Service details - new format */}
        {isNewFormat && (
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InfoBox label="Service Date" value={cert.service_date ? formatDate(cert.service_date) : formatDate(cert.created_at)} />
              {cert.odometer_at_service && <InfoBox label="Odometer at Service" value={`${cert.odometer_at_service.toLocaleString()} mi`} />}
            </div>
            {cert.details && <DetailSection businessType={cert.business_type!} details={cert.details} />}
          </div>
        )}

        {/* Issuing Company */}
        {cert.business && (
          <div className="mb-6 p-4 bg-zinc-50 rounded-xl">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Issuing Company</p>
            <p className="font-semibold text-zinc-900">{cert.business.name}</p>
          </div>
        )}

        {/* Technician */}
        {(cert.technician_name || (cert as any).technician?.display_name) && (
          <div className="mb-6 p-4 bg-zinc-50 rounded-xl">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Installer / Technician</p>
            <p className="font-semibold text-zinc-900">{cert.technician_name || (cert as any).technician?.display_name}</p>
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
          {cert.warranty_mileage_cap && (
            <p className="text-xs text-zinc-500 mt-1">
              Mileage cap: {cert.warranty_mileage_cap.toLocaleString()} miles
            </p>
          )}
          {isWarrantyActive && (
            <div className="mt-2 h-2 bg-emerald-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${Math.max(5, (warrantyDaysLeft / (cert.warranty_years * 365)) * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Void conditions */}
        {cert.void_conditions && cert.void_conditions.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Void Conditions</p>
            <ul className="space-y-1.5">
              {cert.void_conditions.map((cond, i) => (
                <li key={i} className="text-xs text-zinc-600 flex items-start gap-1.5">
                  <AlertTriangle size={10} className="text-amber-500 shrink-0 mt-0.5" />
                  {cond}
                </li>
              ))}
            </ul>
          </div>
        )}

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
          <div className="pt-4 border-t border-zinc-100 mb-6">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-zinc-600">{cert.notes}</p>
          </div>
        )}

        {cert.void_reason && (
          <div className="pt-4 border-t border-zinc-100 mb-6">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">Void Reason</p>
            <p className="text-sm text-red-600">{cert.void_reason}</p>
          </div>
        )}

        {/* Warranty Claims */}
        <div className="pt-4 border-t border-zinc-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Warranty Claims</p>
            {cert.status === 'active' && isWarrantyActive && (
              <button
                onClick={() => setShowClaimModal(true)}
                className="flex items-center gap-1 text-xs text-red-600 font-medium hover:text-red-700"
              >
                <FileWarning size={12} /> File Claim
              </button>
            )}
          </div>
          {claims.length === 0 ? (
            <p className="text-xs text-zinc-400">No claims filed</p>
          ) : (
            <div className="space-y-2">
              {claims.map((claim: WarrantyClaim) => (
                <div key={claim.id} className="p-3 bg-zinc-50 rounded-xl">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-zinc-500">{formatDate(claim.claim_date)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${CLAIM_STATUS_COLORS[claim.status]}`}>
                      {claim.status}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-700">{claim.description}</p>
                  {claim.resolution && (
                    <p className="text-xs text-zinc-500 mt-1">Resolution: {claim.resolution}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Company Footer */}
        {cert.business && (
          <div className="mt-6 pt-6 border-t border-zinc-200 text-center text-sm text-zinc-500">
            {cert.business.address && <p>{cert.business.address}</p>}
            <div className="flex items-center justify-center gap-3 mt-1">
              {cert.business.phone && <span>{cert.business.phone}</span>}
              {cert.business.website && <span>{cert.business.website}</span>}
            </div>
            {(cert.technician_name || (cert as any).technician?.display_name) && (
              <p className="mt-2 text-xs text-zinc-400">
                Installed by {cert.technician_name || (cert as any).technician?.display_name}
              </p>
            )}
            <p className="mt-1 text-xs text-zinc-400">Certificate {cert.certificate_number}</p>
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

      {showClaimModal && (
        <ClaimModal
          certificateId={cert.id}
          businessId={cert.business_id}
          onClose={() => setShowClaimModal(false)}
          onSaved={() => { setShowClaimModal(false); load() }}
        />
      )}
    </div>
  )
}

function InfoBox({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="p-4 bg-zinc-50 rounded-xl">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="font-semibold text-zinc-900">{value || '—'}</p>
    </div>
  )
}

function DetailSection({ details }: { businessType: string; details: Record<string, any> }) {
  const entries = Object.entries(details).filter(([key, val]) => {
    if (key === 'certificate_id' || key === 'created_at') return false
    if (val === null || val === undefined || val === '') return false
    if (Array.isArray(val) && val.length === 0) return false
    return true
  })

  if (entries.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-4">
      {entries.map(([key, val]) => {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        let display: string
        if (typeof val === 'boolean') display = val ? 'Yes' : 'No'
        else if (Array.isArray(val) && typeof val[0] === 'string') display = val.map((s: string) => s.replace(/_/g, ' ')).join(', ')
        else if (Array.isArray(val)) display = `${val.length} item(s)`
        else display = String(val)
        // Add % for VLT and rejection percentage fields
        if (key.startsWith('vlt_') || key.endsWith('_pct')) display = `${display}%`
        return <InfoBox key={key} label={label} value={display} />
      })}
    </div>
  )
}
