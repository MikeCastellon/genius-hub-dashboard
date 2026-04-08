import { useState, useEffect, useMemo } from 'react'
import { useJobs, useActiveJob, useAuth, cancelJob } from '@/lib/store'
import { Job } from '@/lib/types'
import { ClipboardList, Loader2, Square } from 'lucide-react'
import StartJobModal from '@/components/StartJobModal'

const AVATAR_COLORS = [
  'bg-red-100 text-red-700',
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
]

function nameToColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

type StatusFilter = 'all' | 'queued' | 'in_progress' | 'completed'

const STATUS_BADGE: Record<Job['status'], string> = {
  queued: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-zinc-100 text-zinc-600',
}

const STATUS_LABEL: Record<Job['status'], string> = {
  queued: 'Queued',
  in_progress: 'In Progress',
  completed: 'Completed',
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function ElapsedTime({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    const calc = () => {
      const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      if (h > 0) setElapsed(`${h}h ${m}m ${s}s`)
      else if (m > 0) setElapsed(`${m}m ${s}s`)
      else setElapsed(`${s}s`)
    }
    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  return <span className="text-sm font-mono text-green-700">{elapsed}</span>
}

function getVehicleInfo(job: Job): string | null {
  if (job.intake) {
    const { year, make, model, color } = job.intake
    const parts = [year, make, model].filter(Boolean).join(' ')
    if (!parts) return null
    return color ? `${parts} · ${color}` : parts
  }
  if (job.appointment) {
    const { vehicle_year, vehicle_make, vehicle_model, vehicle_color } = job.appointment
    const parts = [vehicle_year, vehicle_make, vehicle_model].filter(Boolean).join(' ')
    if (!parts) return 'Scheduled Service'
    return vehicle_color ? `${parts} · ${vehicle_color}` : parts
  }
  return null
}

function getCustomerName(job: Job): string {
  if (job.customer?.name) return job.customer.name
  if (job.appointment?.customer_name) return job.appointment.customer_name
  return 'Unknown Customer'
}

function getServices(job: Job): string[] {
  if (job.intake?.intake_services?.length) {
    return job.intake.intake_services
      .map(s => s.service?.name || 'Unknown Service')
  }
  return []
}

export default function Queue() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const { jobs, loading, refresh } = useJobs(profile?.business_id, {
    technicianId: profile?.id,
    role: profile?.role,
  })
  const { job: activeJob, refresh: refreshActive } = useActiveJob(profile?.id)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [startingJob, setStartingJob] = useState<Job | null>(null)

  const filtered = useMemo(() => {
    if (filter === 'all') return jobs
    return jobs.filter(j => j.status === filter)
  }, [jobs, filter])

  const handleStartJob = (job: Job) => {
    if (activeJob) {
      alert('Finish your current job first')
      return
    }
    setStartingJob(job)
  }

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'queued', label: 'Queued' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
  ]

  return (
    <div className="p-4 md:p-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <ClipboardList size={18} className="text-red-600" /> Job Queue
          </h2>
          <p className="text-[12px] md:text-[13px] text-zinc-400 mt-0.5">{jobs.length} job{jobs.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {filterTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${filter === t.key ? 'bg-gradient-to-r from-red-700 to-red-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-red-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No jobs in queue</p>
          <p className="text-sm mt-1">Jobs will appear here when created from intakes or appointments</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(job => {
            const name = getCustomerName(job)
            const vehicle = getVehicleInfo(job)
            const initial = name.charAt(0).toUpperCase()
            const avatarColor = nameToColor(name)
            const isWalkIn = !!job.intake_id
            const isScheduled = !!job.appointment_id
            const services = getServices(job)

            return (
              <div
                key={job.id}
                className="flex items-center gap-4 p-4 rounded-2xl border border-zinc-200/60 bg-white shadow-sm"
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor}`}>
                  {initial}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-zinc-900 truncate">{name}</p>
                    {isWalkIn && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-600">Walk-in</span>
                    )}
                    {isScheduled && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600">Scheduled</span>
                    )}
                  </div>
                  {vehicle && (
                    <p className="text-[12px] md:text-[13px] text-zinc-400 mt-0.5 truncate">{vehicle}</p>
                  )}
                  {services.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {services.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-600">{s}</span>
                      ))}
                    </div>
                  )}
                  {isAdmin && job.technician?.display_name && (
                    <p className="text-[11px] text-zinc-400 mt-1">
                      <span className="font-medium text-zinc-500">Tech:</span> {job.technician.display_name}
                    </p>
                  )}
                </div>

                {/* Status & actions */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Status badge */}
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_BADGE[job.status]}`}>
                    {job.status === 'in_progress' && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                    )}
                    {STATUS_LABEL[job.status]}
                  </span>

                  {/* Elapsed time for in-progress */}
                  {job.status === 'in_progress' && job.started_at && (
                    <ElapsedTime startedAt={job.started_at} />
                  )}

                  {/* Completed info */}
                  {job.status === 'completed' && (
                    <div className="text-right">
                      {job.duration_minutes != null && (
                        <p className="text-sm font-semibold text-zinc-700">{formatDuration(job.duration_minutes)}</p>
                      )}
                      {job.finished_at && (
                        <p className="text-[11px] text-zinc-400">{formatDate(job.finished_at)}</p>
                      )}
                    </div>
                  )}

                  {/* Stop button for in-progress */}
                  {job.status === 'in_progress' && (
                    <button
                      onClick={async () => {
                        if (!confirm('Stop this job and return it to the queue?')) return
                        await cancelJob(job.id)
                        await Promise.all([refresh(), refreshActive()])
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-all"
                    >
                      <Square size={12} className="fill-red-500" />
                      Stop
                    </button>
                  )}

                  {/* Start button for queued */}
                  {job.status === 'queued' && (
                    <button
                      onClick={() => handleStartJob(job)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm shadow-red-700/20 hover:shadow-md transition-all"
                    >
                      Start Job
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {startingJob && profile && (
        <StartJobModal
          job={startingJob}
          technicianId={profile.id}
          onClose={() => setStartingJob(null)}
          onStarted={async () => {
            setStartingJob(null)
            await Promise.all([refresh(), refreshActive()])
          }}
        />
      )}
    </div>
  )
}
