import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList } from 'lucide-react'
import { useAuth, useActiveJob, useJobs } from '@/lib/store'
import { Job } from '@/lib/types'
import StartJobModal from './StartJobModal'

function getCustomerName(job: Job): string {
  if (job.customer?.name) return job.customer.name
  if (job.appointment?.customer_name) return job.appointment.customer_name
  return 'Unknown Customer'
}

function getVehicleInfo(job: Job): string | null {
  if (job.intake) {
    const { year, make, model } = job.intake
    return [year, make, model].filter(Boolean).join(' ') || null
  }
  if (job.appointment) {
    const { vehicle_year, vehicle_make, vehicle_model } = job.appointment
    return [vehicle_year, vehicle_make, vehicle_model].filter(Boolean).join(' ') || null
  }
  return null
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function FloatingJobPill() {
  const { profile } = useAuth()
  const { job: activeJob, loading: activeLoading, refresh: refreshActive } = useActiveJob(profile?.id)
  const { jobs: allJobs, loading: jobsLoading, refresh: refreshJobs } = useJobs(profile?.business_id)
  const navigate = useNavigate()

  const [showQueue, setShowQueue] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [startingJob, setStartingJob] = useState<Job | null>(null)
  // TODO: wire showFinish to FinishJobModal when it exists
  const [showFinish, setShowFinish] = useState(false)
  void showFinish // suppress unused warning until FinishJobModal is wired

  // Timer for active job
  useEffect(() => {
    if (!activeJob?.started_at) return
    const calc = () =>
      Math.max(0, Math.floor((Date.now() - new Date(activeJob.started_at!).getTime()) / 1000))
    setElapsed(calc())
    const id = setInterval(() => setElapsed(calc()), 1000)
    return () => clearInterval(id)
  }, [activeJob?.started_at])

  // Close queue when a job becomes active
  useEffect(() => {
    if (activeJob) setShowQueue(false)
  }, [activeJob])

  // Role gate — only visible for technicians (role === 'user')
  if (profile?.role !== 'user') return null

  const queuedJobs = allJobs.filter((j) => j.status === 'queued')

  // Loading state — don't show anything yet
  if (activeLoading) return null

  // ── Active job pill ──
  if (activeJob?.status === 'in_progress') {
    return (
      <>
        <button
          onClick={() => setShowFinish(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg bg-white border border-green-200 hover:shadow-xl transition-shadow cursor-pointer"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="font-bold text-zinc-900 tabular-nums font-mono text-sm">
            {formatElapsed(elapsed)}
          </span>
          <span className="text-zinc-500 text-sm truncate max-w-[120px]">
            {getCustomerName(activeJob)}
          </span>
        </button>
        {/* TODO: render FinishJobModal when showFinish is true */}
      </>
    )
  }

  // ── No active job — FAB + queue drawer ──
  return (
    <>
      {/* Mini queue drawer */}
      {showQueue && (
        <div className="fixed bottom-20 right-6 z-40 w-80 rounded-2xl bg-white shadow-2xl border border-zinc-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900">
              Job Queue{' '}
              <span className="text-zinc-400 font-normal">({queuedJobs.length})</span>
            </h3>
          </div>

          {/* List */}
          <div className="max-h-[280px] overflow-y-auto">
            {jobsLoading ? (
              <div className="px-4 py-6 text-center text-zinc-400 text-sm">Loading...</div>
            ) : queuedJobs.length === 0 ? (
              <div className="px-4 py-6 text-center text-zinc-400 text-sm">No queued jobs</div>
            ) : (
              queuedJobs.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  className="px-4 py-3 border-b border-zinc-50 last:border-b-0 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-900 truncate">
                      {getCustomerName(job)}
                    </p>
                    {getVehicleInfo(job) && (
                      <p className="text-xs text-zinc-500 truncate">{getVehicleInfo(job)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowQueue(false)
                      setStartingJob(job)
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-700 to-red-600 text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all"
                  >
                    Start
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {queuedJobs.length > 0 && (
            <div className="px-4 py-2.5 border-t border-zinc-100">
              <button
                onClick={() => {
                  setShowQueue(false)
                  navigate('/queue')
                }}
                className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors"
              >
                View All
              </button>
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowQueue((v) => !v)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-red-600 to-red-500 shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
      >
        <ClipboardList size={22} className="text-white" />
      </button>

      {/* Start Job Modal */}
      {startingJob && profile && (
        <StartJobModal
          job={startingJob}
          technicianId={profile.id}
          onClose={() => setStartingJob(null)}
          onStarted={() => {
            setStartingJob(null)
            refreshActive()
            refreshJobs()
          }}
        />
      )}
    </>
  )
}
