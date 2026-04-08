import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCertificates } from '@/lib/store'
import { Certificate, BUSINESS_TYPE_LABELS, type BusinessType } from '@/lib/types'
import { Award, Plus, Loader2, Search } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import CertificateBuilder from '@/components/CertificateBuilder'

const STATUS_COLORS: Record<Certificate['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-zinc-100 text-zinc-500',
  voided: 'bg-red-100 text-red-600',
}

export default function Certify() {
  const { certificates, loading, refresh } = useCertificates()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const preselectedIntake = searchParams.get('intake')
  const [showBuilder, setShowBuilder] = useState(!!preselectedIntake)
  const [filter, setFilter] = useState<Certificate['status'] | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<BusinessType | 'all'>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return certificates.filter(cert => {
      const matchStatus = filter === 'all' || cert.status === filter
      const matchType = typeFilter === 'all' || cert.business_type === typeFilter
      // Support both legacy (intake-based) and new (vehicle/customer-based) certs
      const customer = cert.customer || (cert as any).intake?.customer
      const vin = cert.vehicle?.vin || (cert as any).intake?.vin
      const matchSearch = !search ||
        cert.certificate_number.toLowerCase().includes(search.toLowerCase()) ||
        customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        vin?.toLowerCase().includes(search.toLowerCase())
      return matchStatus && matchType && matchSearch
    })
  }, [certificates, filter, typeFilter, search])

  // Collect unique business types present in certs
  const presentTypes = useMemo(() => {
    const types = new Set<BusinessType>()
    certificates.forEach(c => { if (c.business_type) types.add(c.business_type) })
    return Array.from(types)
  }, [certificates])

  return (
    <div>
      <div className="sticky top-0 z-20 bg-[#f5f5f5]/95 backdrop-blur-md px-4 md:px-6 pt-4 md:pt-6 pb-3">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <Award size={18} className="text-red-600" /> Certify
            </h2>
            <p className="text-[12px] md:text-[13px] text-zinc-400 mt-0.5">{certificates.length} total certificates</p>
          </div>
          <button
            onClick={() => navigate('/certify/new')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm shadow-red-700/20 hover:shadow-md transition-all"
          >
            <Plus size={15} /> New Certificate
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:border-red-300"
              placeholder="Search by cert #, customer, VIN..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {(['all', 'active', 'expired', 'voided'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${filter === s ? 'bg-gradient-to-r from-red-700 to-red-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'}`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Business type filter */}
        {presentTypes.length > 0 && (
          <div className="flex gap-1.5 mb-4 flex-wrap">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${typeFilter === 'all' ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
            >
              All Types
            </button>
            {presentTypes.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${typeFilter === t ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
              >
                {BUSINESS_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 md:px-6 pb-4">
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-red-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <Award size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No certificates yet</p>
          <p className="text-sm mt-1">Create your first certificate above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(cert => {
            // Support both legacy and new cert formats
            const customer = cert.customer || (cert as any).intake?.customer
            const intake = (cert as any).intake
            const vehicle = cert.vehicle
            const vehicleLabel = vehicle
              ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')
              : [intake?.year, intake?.make, intake?.model].filter(Boolean).join(' ') || '—'
            const isWarrantyActive = cert.status === 'active' && new Date(cert.warranty_expiry) > new Date()
            const serviceLabel = cert.business_type
              ? BUSINESS_TYPE_LABELS[cert.business_type]
              : cert.coating_brand || ''

            return (
              <div
                key={cert.id}
                onClick={() => navigate(`/certify/${cert.id}`)}
                className="glass rounded-2xl p-4 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-zinc-900">{cert.certificate_number}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${STATUS_COLORS[cert.status]}`}>
                        {cert.status}
                      </span>
                      {cert.business_type && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 font-medium">
                          {BUSINESS_TYPE_LABELS[cert.business_type]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-600">{customer?.name || 'Unknown'}</p>
                    <p className="text-[11px] text-zinc-400">{vehicleLabel}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-xs font-medium text-zinc-700">{serviceLabel}</p>
                    {cert.coating_product && !cert.business_type && (
                      <p className="text-[11px] text-zinc-400">{cert.coating_product}</p>
                    )}
                    <p className={`text-[10px] mt-1 font-semibold ${isWarrantyActive ? 'text-emerald-600' : 'text-red-500'}`}>
                      {isWarrantyActive ? `Warranty until ${formatDate(cert.warranty_expiry)}` : `Expired ${formatDate(cert.warranty_expiry)}`}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </div>

      {/* Legacy builder modal for intake-based certs */}
      {showBuilder && (
        <CertificateBuilder
          preselectedIntakeId={preselectedIntake || undefined}
          onClose={() => { setShowBuilder(false); setSearchParams({}) }}
          onSaved={() => { setShowBuilder(false); setSearchParams({}); refresh() }}
        />
      )}
    </div>
  )
}
