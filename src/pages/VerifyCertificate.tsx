import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPublicCertificate, getCertificatePhotoUrl } from '@/lib/store'
import { Certificate, BUSINESS_TYPE_LABELS } from '@/lib/types'
import { Loader2, ShieldCheck, ShieldOff, Lock, ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function VerifyCertificate() {
  const { certId } = useParams<{ certId: string }>()
  const [cert, setCert] = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!certId) return
    getPublicCertificate(certId).then(data => {
      if (data) {
        setCert(data)
      } else {
        setNotFound(true)
      }
      setLoading(false)
    })
  }, [certId])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <Loader2 size={32} className="animate-spin text-red-600" />
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
          <Lock size={28} className="text-zinc-400" />
        </div>
        <h1 className="text-xl font-bold text-zinc-900 mb-2">Certificate Not Available</h1>
        <p className="text-sm text-zinc-500">This certificate is either private or does not exist.</p>
      </div>
    </div>
  )

  if (!cert) return null

  // Support both legacy and new formats
  const isNewFormat = !!cert.vehicle_id
  const intake = (cert as any).intake
  const customer = cert.customer || intake?.customer
  const vehicle = cert.vehicle
  const photos = cert.photos || []
  const business = cert.business

  const vehicleLabel = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(' ')
    : [intake?.year, intake?.make, intake?.model].filter(Boolean).join(' ') || '—'
  const vin = vehicle?.vin || intake?.vin
  const isWarrantyActive = cert.status === 'active' && new Date(cert.warranty_expiry) > new Date()

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className={`px-4 py-6 text-center ${isWarrantyActive ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-red-600'}`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          {isWarrantyActive ? <ShieldCheck size={28} className="text-white" /> : <ShieldOff size={28} className="text-white" />}
        </div>
        <h1 className="text-xl font-bold text-white">
          {isWarrantyActive ? 'Verified Installation' : cert.status === 'voided' ? 'Certificate Voided' : 'Warranty Expired'}
        </h1>
        {business?.name && (
          <p className="text-white/80 text-sm mt-1">Verified by {business.name}</p>
        )}
        {business?.logo_url && (
          <div className="mt-3 flex justify-center">
            <img src={business.logo_url} alt={business.name} className="h-6 opacity-90" />
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto p-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-lg p-5 space-y-5">
          {/* Certificate number + type badge */}
          <div className="text-center pb-4 border-b border-zinc-100">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Certificate</p>
            <p className="text-lg font-bold text-zinc-900">{cert.certificate_number}</p>
            {cert.business_type && (
              <span className="inline-block mt-1.5 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                {BUSINESS_TYPE_LABELS[cert.business_type]}
              </span>
            )}
          </div>

          {/* Vehicle */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Vehicle</p>
            <p className="font-semibold text-zinc-900">{vehicleLabel}</p>
            {vin && (
              <div className="flex items-center gap-2">
                <p className="text-xs text-zinc-400 font-mono">{vin}</p>
                <Link to={`/vin/${vin}`} className="text-[10px] text-red-600 hover:text-red-700 flex items-center gap-0.5">
                  History <ExternalLink size={8} />
                </Link>
              </div>
            )}
          </div>

          {/* Customer */}
          {customer && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Owner</p>
              <p className="font-semibold text-zinc-900">{customer.name}</p>
            </div>
          )}

          {/* Service details */}
          {isNewFormat && cert.details ? (
            <PublicDetailSection businessType={cert.business_type!} details={cert.details} serviceDate={cert.service_date} technicianName={cert.technician_name || (cert as any).technician?.display_name} />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Coating</p>
                <p className="text-sm font-semibold text-zinc-900">{cert.coating_brand}</p>
                <p className="text-xs text-zinc-500">{cert.coating_product}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Installed</p>
                <p className="text-sm font-semibold text-zinc-900">{formatDate(cert.created_at)}</p>
                {(cert as any).technician?.display_name && (
                  <p className="text-xs text-zinc-500">by {(cert as any).technician.display_name}</p>
                )}
              </div>
            </div>
          )}

          {/* Warranty status */}
          <div className={`p-4 rounded-xl ${isWarrantyActive ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Warranty Status</p>
                <p className={`text-lg font-bold ${isWarrantyActive ? 'text-emerald-700' : 'text-red-600'}`}>
                  {isWarrantyActive ? 'Active' : cert.status === 'voided' ? 'Voided' : 'Expired'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-zinc-600">{cert.warranty_years} year{cert.warranty_years > 1 ? 's' : ''}</p>
                <p className="text-xs text-zinc-400">{isWarrantyActive ? 'Expires' : 'Expired'} {formatDate(cert.warranty_expiry)}</p>
                {cert.warranty_mileage_cap && (
                  <p className="text-xs text-zinc-400">or {cert.warranty_mileage_cap.toLocaleString()} mi</p>
                )}
              </div>
            </div>
          </div>

          {/* Photos */}
          {photos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Installation Photos</p>
              <div className="grid grid-cols-2 gap-2">
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
        </div>

        {/* Footer branding */}
        <div className="text-center mt-6 pb-8">
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium">Powered by</p>
          <p className="text-sm font-bold text-zinc-600 mt-0.5">{business?.name || 'Pro Hub'}</p>
        </div>
      </div>
    </div>
  )
}

function PublicDetailSection({ businessType, details, serviceDate, technicianName }: {
  businessType: string
  details: Record<string, any>
  serviceDate: string | null
  technicianName: string | null
}) {
  // Show key fields based on business type
  const keyFields: Record<string, any> = {}
  const d = details as any

  if (businessType === 'CERAMIC_COATING') {
    if (d.coating_brand) keyFields['Brand'] = d.coating_brand
    if (d.coating_product) keyFields['Product'] = d.coating_product
    if (d.layers_applied) keyFields['Layers'] = d.layers_applied
    if (d.surfaces_coated?.length) keyFields['Surfaces'] = d.surfaces_coated.map((s: string) => s.replace(/_/g, ' ')).join(', ')
  } else if (businessType === 'WINDOW_TINT') {
    if (d.film_brand) keyFields['Brand'] = d.film_brand
    if (d.film_product) keyFields['Product'] = d.film_product
    if (d.film_type) keyFields['Type'] = d.film_type
  } else if (businessType === 'PPF') {
    if (d.film_brand) keyFields['Brand'] = d.film_brand
    if (d.film_product) keyFields['Product'] = d.film_product
    if (d.coverage_areas?.length) keyFields['Coverage'] = d.coverage_areas.map((s: string) => s.replace(/_/g, ' ')).join(', ')
  } else if (businessType === 'AUDIO_ELECTRONICS') {
    if (d.install_type?.length) keyFields['Install Type'] = d.install_type.map((s: string) => s.replace(/_/g, ' ')).join(', ')
    if (d.labor_scope) keyFields['Scope'] = d.labor_scope
  } else if (businessType === 'MECHANICAL') {
    if (d.service_category) keyFields['Category'] = d.service_category
    if (d.labor_description) keyFields['Work'] = d.labor_description
  } else if (businessType === 'WHEELS_TIRES') {
    if (d.service_type) keyFields['Service'] = d.service_type.replace(/_/g, ' ')
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {Object.entries(keyFields).map(([label, val]) => (
        <div key={label}>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-sm font-semibold text-zinc-900">{val}</p>
        </div>
      ))}
      <div>
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Service Date</p>
        <p className="text-sm font-semibold text-zinc-900">{serviceDate ? formatDate(serviceDate) : '—'}</p>
        {technicianName && <p className="text-xs text-zinc-500">by {technicianName}</p>}
      </div>
    </div>
  )
}
