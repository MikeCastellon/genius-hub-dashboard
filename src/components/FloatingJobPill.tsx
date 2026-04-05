import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Square } from 'lucide-react'
import { useAuth, useActiveJob, useJobs, cancelJob } from '@/lib/store'
import { Job } from '@/lib/types'
import StartJobModal from './StartJobModal'
import FinishJobModal from './FinishJobModal'

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
  const { jobs: allJobs, loading: jobsLoading, refresh: refreshJobs } = useJobs(profile?.business_id, {
    technicianId: profile?.id,
    role: profile?.role,
  })
  const navigate = useNavigate()

  const [showQueue, setShowQueue] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [startingJob, setStartingJob] = useState<Job | null>(null)
  const [showFinish, setShowFinish] = useState(false)
  const [hidden, setHidden] = useState(() => localStorage.getItem('floatingPillHidden') === 'true')

  const isAdminRole = profile?.role === 'admin' || profile?.role === 'super_admin'

  const handleHide = () => {
    setHidden(true)
    setShowQueue(false)
    localStorage.setItem('floatingPillHidden', 'true')
  }

  const handleShow = () => {
    setHidden(false)
    localStorage.removeItem('floatingPillHidden')
  }

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

  // Role gate — visible for all staff (not customers)
  if (!profile || profile.role === 'customer') return null

  const queuedJobs = allJobs.filter((j) => j.status === 'queued')

  // Loading state — don't show anything yet
  if (activeLoading) return null

  const handleCancelJob = async () => {
    if (!activeJob) return
    if (!confirm('Stop this job and return it to the queue?')) return
    await cancelJob(activeJob.id)
    refreshActive()
    refreshJobs()
  }

  // ── Active job pill ──
  if (activeJob?.status === 'in_progress') {
    return (
      <>
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
          {/* Stop button */}
          <button
            onClick={handleCancelJob}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-full shadow-lg bg-white border border-red-200 hover:shadow-xl hover:bg-red-50 transition-all cursor-pointer"
            title="Stop job"
          >
            <Square size={12} className="text-red-500 fill-red-500" />
            <span className="text-xs font-semibold text-red-600">Stop</span>
          </button>
          {/* Finish button */}
          <button
            onClick={() => setShowFinish(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg bg-white border border-green-200 hover:shadow-xl transition-shadow cursor-pointer"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="font-bold text-zinc-900 tabular-nums font-mono text-sm">
              {formatElapsed(elapsed)}
            </span>
            <span className="text-zinc-500 text-sm truncate max-w-[120px]">
              {getCustomerName(activeJob)}
            </span>
          </button>
        </div>
        {showFinish && (
          <FinishJobModal
            job={activeJob}
            onClose={() => setShowFinish(false)}
            onFinished={() => { setShowFinish(false); refreshActive() }}
          />
        )}
      </>
    )
  }

  // ── No active job — FAB + queue drawer ──
  // Admin/super_admin can hide the pill
  if (hidden && isAdminRole) {
    return (
      <button
        onClick={handleShow}
        className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-zinc-200 hover:bg-zinc-300 shadow-sm flex items-center justify-center transition-colors"
        title="Show job queue"
      >
        <ClipboardList size={16} className="text-zinc-500" />
      </button>
    )
  }

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
      <div className="fixed bottom-6 right-6 z-40">
        {isAdminRole && (
          <button
            onClick={handleHide}
            className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-zinc-600 text-white flex items-center justify-center text-[10px] font-bold hover:bg-zinc-800 transition-colors shadow-sm z-10"
            title="Hide queue button"
          >
            ✕
          </button>
        )}
        <button
          onClick={() => setShowQueue((v) => !v)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-red-600 to-red-500 shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
        >
          <ClipboardList size={22} className="text-white" />
        </button>
      </div>

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
