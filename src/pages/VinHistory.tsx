import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getVinHistory, decodeVin } from '@/lib/store'
import { Certificate, BUSINESS_TYPE_LABELS } from '@/lib/types'
import { Loader2, Car, ShieldCheck, ShieldOff, Search, ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function VinHistory() {
  const { vin } = useParams<{ vin: string }>()
  const [certs, setCerts] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [vehicleInfo, setVehicleInfo] = useState<{ year: number | null; make: string | null; model: string | null } | null>(null)

  useEffect(() => {
    if (!vin) return
    Promise.all([
      getVinHistory(vin).then(setCerts),
      decodeVin(vin).then(setVehicleInfo),
    ]).finally(() => setLoading(false))
  }, [vin])

  const vehicleLabel = vehicleInfo
    ? [vehicleInfo.year, vehicleInfo.make, vehicleInfo.model].filter(Boolean).join(' ')
    : certs[0]?.vehicle
      ? [certs[0].vehicle.year, certs[0].vehicle.make, certs[0].vehicle.model].filter(Boolean).join(' ')
      : null

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <Loader2 size={32} className="animate-spin text-red-600" />
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 px-4 py-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Search size={24} className="text-white/70" />
        </div>
        <h1 className="text-xl font-bold text-white">Vehicle History</h1>
        <p className="text-white/60 text-sm mt-1 font-mono tracking-wider">{vin}</p>
        {vehicleLabel && (
          <p className="text-white/80 text-sm mt-2 flex items-center justify-center gap-1.5">
            <Car size={14} /> {vehicleLabel}
          </p>
        )}
      </div>

      <div className="max-w-lg mx-auto p-4 -mt-4">
        {certs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
              <Search size={28} className="text-zinc-300" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 mb-2">No Records Found</h2>
            <p className="text-sm text-zinc-500">
              No warranty certificates have been registered for this VIN.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-zinc-400 font-medium">
              {certs.length} certificate{certs.length !== 1 ? 's' : ''} found
            </p>

            {/* Timeline */}
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-zinc-200" />

              {certs.map((cert) => {
                const isWarrantyActive = cert.status === 'active' && new Date(cert.warranty_expiry) > new Date()
                const serviceType = cert.business_type
                  ? BUSINESS_TYPE_LABELS[cert.business_type]
                  : cert.coating_brand || 'Service'

                return (
                  <div key={cert.id} className="relative pl-10 pb-4">
                    {/* Timeline dot */}
                    <div className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 ${
                      isWarrantyActive
                        ? 'bg-emerald-500 border-emerald-200'
                        : cert.status === 'voided'
                        ? 'bg-red-500 border-red-200'
                        : 'bg-zinc-400 border-zinc-200'
                    }`} />

                    <Link
                      to={`/verify/${cert.id}`}
                      className="block bg-white rounded-xl shadow-sm border border-zinc-100 p-4 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-zinc-700">{serviceType}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                              isWarrantyActive
                                ? 'bg-emerald-100 text-emerald-700'
                                : cert.status === 'voided'
                                ? 'bg-red-100 text-red-600'
                                : 'bg-zinc-100 text-zinc-500'
                            }`}>
                              {isWarrantyActive ? 'Active' : cert.status === 'voided' ? 'Voided' : 'Expired'}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500">
                            {cert.service_date ? formatDate(cert.service_date) : formatDate(cert.created_at)}
                          </p>
                          {cert.business?.name && (
                            <p className="text-[11px] text-zinc-400 mt-0.5">by {cert.business.name}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          {isWarrantyActive ? (
                            <ShieldCheck size={16} className="text-emerald-500" />
                          ) : (
                            <ShieldOff size={16} className="text-zinc-300" />
                          )}
                          <p className="text-[10px] text-zinc-400 mt-1">
                            Exp. {formatDate(cert.warranty_expiry)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-red-600">
                        <ExternalLink size={9} /> View certificate
                      </div>
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 pb-8">
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium">Powered by</p>
          <p className="text-sm font-bold text-zinc-600 mt-0.5">Pro Hub</p>
          <p className="text-[10px] text-zinc-400 mt-1">Aftermarket Service History</p>
        </div>
      </div>
    </div>
  )
}
