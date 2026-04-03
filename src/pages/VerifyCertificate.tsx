import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicCertificate, getCertificatePhotoUrl } from '@/lib/store'
import { Certificate } from '@/lib/types'
import { Loader2, ShieldCheck, ShieldOff, Lock } from 'lucide-react'
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

  // Private certificate
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

  const intake = (cert as any).intake
  const customer = intake?.customer
  const photos = (cert as any).photos || []
  const vehicleLabel = [intake?.year, intake?.make, intake?.model].filter(Boolean).join(' ') || '—'
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
        <p className="text-white/80 text-sm mt-1">Verified by Pro Hub</p>
        <div className="mt-3 flex justify-center">
          <img src="https://www.autocaregenius.com/cdn/shop/files/v11_1.svg?v=1760731533&width=160" alt="Auto Care Genius" className="h-6 opacity-90" />
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 -mt-4">
        <div className="bg-white rounded-2xl shadow-lg p-5 space-y-5">
          {/* Certificate number */}
          <div className="text-center pb-4 border-b border-zinc-100">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Certificate</p>
            <p className="text-lg font-bold text-zinc-900">{cert.certificate_number}</p>
          </div>

          {/* Vehicle */}
          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Vehicle</p>
            <p className="font-semibold text-zinc-900">{vehicleLabel}</p>
            {intake?.vin && <p className="text-xs text-zinc-400 font-mono">{intake.vin}</p>}
          </div>

          {/* Customer */}
          {customer && (
            <div>
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Owner</p>
              <p className="font-semibold text-zinc-900">{customer.name}</p>
            </div>
          )}

          {/* Coating */}
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
          <p className="text-sm font-bold text-zinc-600 mt-0.5">Pro Hub</p>
          <p className="text-[10px] text-zinc-400">Sales & Service by Auto Care Genius</p>
        </div>
      </div>
    </div>
  )
}
