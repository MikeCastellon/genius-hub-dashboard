import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useJobs, useIntakes, useCustomers, useAppointments } from '@/lib/store'
import { Job } from '@/lib/types'
import {
  Search, Plus, QrCode, DollarSign,
  ClipboardList, Loader2, X
} from 'lucide-react'

// ── Status Helpers ──────────────────────────────

const STATUS_STYLES: Record<Job['status'], { bg: string; text: string; dot: string; label: string }> = {
  in_progress: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'In progress' },
  queued: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Waiting' },
  completed: { bg: 'bg-zinc-100', text: 'text-zinc-500', dot: 'bg-zinc-400', label: 'Completed' },
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ── Smart Search Results ────────────────────────

interface SearchResult {
  type: 'customer' | 'vehicle' | 'job'
  title: string
  subtitle: string
  route: string
}

// ── Component ───────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const { jobs, loading: jobsLoading } = useJobs(profile?.business_id ?? undefined, {
    technicianId: profile?.id,
    role: profile?.role,
  })
  const { intakes, loading: intakesLoading } = useIntakes()
  const { customers } = useCustomers()
  const { appointments } = useAppointments()

  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User'
  const firstName = displayName.split(' ')[0]

  // Active jobs (not completed)
  const activeJobs = useMemo(
    () => jobs.filter(j => j.status !== 'completed').sort((a, b) => {
      if (a.status === 'in_progress' && b.status !== 'in_progress') return -1
      if (b.status === 'in_progress' && a.status !== 'in_progress') return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }),
    [jobs],
  )

  // Today's stats
  const todayStr = new Date().toDateString()
  const todayAppointments = useMemo(
    () => appointments.filter(a => new Date(a.scheduled_at).toDateString() === todayStr),
    [appointments, todayStr],
  )

  // Smart search
  const searchResults = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const results: SearchResult[] = []

    // Search customers by name, phone, email
    for (const c of customers) {
      if (
        c.name?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.email?.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'customer',
          title: c.name,
          subtitle: c.phone || c.email || '',
          route: `/customers`,
        })
      }
      if (results.length >= 8) break
    }

    // Search intakes by VIN, make, model, plate
    for (const i of intakes.slice(0, 200)) {
      if (
        i.vin?.toLowerCase().includes(q) ||
        i.make?.toLowerCase().includes(q) ||
        i.model?.toLowerCase().includes(q) ||
        i.license_plate?.toLowerCase().includes(q)
      ) {
        const vehicle = [i.year, i.make, i.model].filter(Boolean).join(' ')
        const customer = (i.customer as any)?.name || ''
        results.push({
          type: 'vehicle',
          title: vehicle || i.vin || 'Vehicle',
          subtitle: [customer, i.license_plate].filter(Boolean).join(' · '),
          route: `/history`,
        })
      }
      if (results.length >= 12) break
    }

    return results.slice(0, 8)
  }, [query, customers, intakes])

  // Close search on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQuery('')
        setSearchFocused(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const loading = jobsLoading || intakesLoading

  // Quick action tiles
  const tiles = [
    {
      icon: Plus,
      label: 'New Intake',
      subtitle: 'Walk-in or new vehicle',
      gradient: 'from-red-700 to-red-600',
      route: '/intake',
    },
    {
      icon: ClipboardList,
      label: "Today's Jobs",
      subtitle: `${activeJobs.length} vehicle${activeJobs.length !== 1 ? 's' : ''} in queue`,
      gradient: 'from-zinc-700 to-zinc-600',
      route: '/queue',
    },
    {
      icon: QrCode,
      label: 'Scan VIN',
      subtitle: 'Camera or manual entry',
      gradient: 'from-emerald-600 to-emerald-500',
      route: '/repairs',
    },
    {
      icon: DollarSign,
      label: 'Payments',
      subtitle: 'Collect or view history',
      gradient: 'from-zinc-700 to-zinc-600',
      route: '/invoices',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
            {profile?.business_id ? 'Detailers Hub' : 'Welcome'}
          </p>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900 tracking-tight">
            {getGreeting()}, {firstName}
          </h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-700 to-red-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            getInitials(displayName)
          )}
        </div>
      </div>

      {/* Smart Search */}
      <div className="relative mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            placeholder="Search name, phone, plate, or VIN..."
            className="w-full pl-11 pr-10 py-3 rounded-2xl border border-zinc-200 bg-white text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <X size={14} className="text-zinc-400" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchFocused && searchResults.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden">
            {searchResults.map((r, i) => (
              <button
                key={i}
                onMouseDown={() => {
                  navigate(r.route)
                  setQuery('')
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  r.type === 'customer' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                }`}>
                  {r.type === 'customer' ? (
                    <span className="text-xs font-bold">{getInitials(r.title)}</span>
                  ) : (
                    <QrCode size={14} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 truncate">{r.title}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{r.subtitle}</p>
                </div>
                <span className="text-[10px] text-zinc-300 uppercase font-semibold shrink-0">{r.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {tiles.map(tile => {
            const Icon = tile.icon
            return (
              <button
                key={tile.label}
                onClick={() => navigate(tile.route)}
                className="glass rounded-2xl p-4 text-left hover:shadow-lg hover:shadow-zinc-200/50 hover:-translate-y-0.5 transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tile.gradient} flex items-center justify-center shadow-sm mb-3`}>
                  <Icon size={18} className="text-white" />
                </div>
                <p className="text-sm font-bold text-zinc-900">{tile.label}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{tile.subtitle}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Active Jobs */}
      <div>
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Active Jobs</h2>
        {activeJobs.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center">
            <ClipboardList size={24} className="mx-auto text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-400 font-medium">No active jobs</p>
            <p className="text-[11px] text-zinc-300 mt-1">Jobs will appear here when customers check in</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeJobs.map(job => {
              const status = STATUS_STYLES[job.status]
              const vehicle = job.intake
                ? [job.intake.year, job.intake.make, job.intake.model].filter(Boolean).join(' ')
                : job.appointment
                  ? [job.appointment.vehicle_year, job.appointment.vehicle_make, job.appointment.vehicle_model].filter(Boolean).join(' ')
                  : 'No vehicle'
              const color = job.intake?.color || job.appointment?.vehicle_color || ''
              const services = job.intake?.intake_services
                ?.map(s => (s as any).service?.name || '')
                .filter(Boolean)
                .join(' + ') || ''
              const customerName = job.customer?.name
                || (job.intake?.customer as any)?.name
                || job.appointment?.customer_name
                || ''
              const techName = job.technician?.display_name || ''

              return (
                <button
                  key={job.id}
                  onClick={() => navigate('/queue')}
                  className="w-full glass rounded-2xl p-4 text-left hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${status.dot} ${
                      job.status === 'in_progress' ? 'animate-pulse' : ''
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-900 truncate">
                        {vehicle}{color ? ` — ${color}` : ''}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {[services, customerName, techName].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${status.bg} ${status.text} whitespace-nowrap`}>
                      {status.label}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Today's Appointments */}
      {todayAppointments.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Today's Appointments ({todayAppointments.length})
          </h2>
          <div className="space-y-2">
            {todayAppointments.map(appt => {
              const vehicle = [appt.vehicle_year, appt.vehicle_make, appt.vehicle_model].filter(Boolean).join(' ')
              const time = new Date(appt.scheduled_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
              return (
                <button
                  key={appt.id}
                  onClick={() => navigate('/schedule')}
                  className="w-full glass rounded-2xl p-4 text-left hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-900 truncate">
                        {vehicle || appt.customer_name}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {appt.customer_name}{appt.technician?.display_name ? ` · ${appt.technician.display_name}` : ''}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-700 whitespace-nowrap">
                      {time}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
