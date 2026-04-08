import { useState, useMemo, useRef, useEffect } from 'react'
import { useAppointments, deleteAppointment, useAuth, useAdminUsers, updateAppointment, createAppointment, useBusinesses, createJob, upsertCustomer } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { Appointment, AppointmentStatus, Job } from '@/lib/types'
import { Calendar, Plus, Loader2, ChevronLeft, ChevronRight, Link2, Check, Play } from 'lucide-react'
import AppointmentModal from '@/components/AppointmentModal'
import StartJobModal from '@/components/StartJobModal'

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  confirmed: 'bg-red-50 text-red-700 border-red-200',
  in_progress: 'bg-violet-100 text-violet-700 border-violet-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-zinc-100 text-zinc-500 border-zinc-200',
}

const STATUS_DOT: Record<AppointmentStatus, string> = {
  pending: 'bg-amber-400',
  confirmed: 'bg-red-500',
  in_progress: 'bg-violet-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-zinc-400',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// Generate hours from 6am to 9pm
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6)

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatHour(hour: number) {
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
  return `${h} ${ampm}`
}

export default function Schedule() {
  const { profile } = useAuth()
  const { appointments, loading, refresh } = useAppointments()
  const { users } = useAdminUsers()
  const { businesses } = useBusinesses()
  const [weekOffset, setWeekOffset] = useState(0)
  const [dayOffset, setDayOffset] = useState(0) // mobile 3-day navigation
  const [selected, setSelected] = useState<Appointment | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [copied, setCopied] = useState(false)
  const [startingJob, setStartingJob] = useState<Job | null>(null)
  const [jobStatuses, setJobStatuses] = useState<Record<string, 'in_progress' | 'completed'>>({})
  const [loadingApptId, setLoadingApptId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  const gridRef = useRef<HTMLDivElement>(null)

  // Week grid
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + weekOffset * 7)
  weekStart.setHours(0, 0, 0, 0)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  // Mobile shows 3 days centered; clamp dayOffset so we never go out of range
  const clampedDayOffset = Math.min(Math.max(dayOffset, 0), 4)
  const visibleDays = isMobile ? weekDays.slice(clampedDayOffset, clampedDayOffset + 3) : weekDays
  const numCols = visibleDays.length

  const apptsByDay = useMemo(() => weekDays.map(day => ({
    date: day,
    appts: appointments.filter(a => {
      const ad = new Date(a.scheduled_at)
      return ad.toDateString() === day.toDateString()
    }).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
  })), [weekDays[0].getTime(), appointments])

  const copyBookingLink = async () => {
    const biz = businesses.find(b => b.id === profile?.business_id)
    const slug = biz?.slug || ''
    if (!slug) { alert('No booking slug found. Set one in business settings.'); return }
    const url = `${window.location.origin}/book/${slug}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Book an Appointment', text: 'Schedule your service appointment', url })
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCreate = async (data: Omit<Appointment, 'id' | 'created_at' | 'technician'>) => {
    await createAppointment(data)
    refresh()
    setShowNew(false)
  }

  const handleUpdate = async (id: string, updates: Partial<Appointment>) => {
    await updateAppointment(id, updates)
    refresh()
    setSelected(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this appointment?')) return
    await deleteAppointment(id)
    refresh()
    setSelected(null)
  }

  const today = new Date()
  const todayStr = today.toDateString()

  const isApptToday = (appt: Appointment) =>
    new Date(appt.scheduled_at).toDateString() === todayStr

  const handleStartJob = async (appt: Appointment) => {
    if (!profile?.business_id) return
    const businessId = profile.business_id
    setLoadingApptId(appt.id)
    try {
      // Check if a job already exists for this appointment
      const { data: existingJob } = await supabase
        .from('jobs')
        .select('*')
        .eq('appointment_id', appt.id)
        .maybeSingle()

      if (existingJob) {
        if (existingJob.status === 'in_progress') {
          setJobStatuses(s => ({ ...s, [appt.id]: 'in_progress' }))
          return
        }
        if (existingJob.status === 'completed') {
          setJobStatuses(s => ({ ...s, [appt.id]: 'completed' }))
          return
        }
        // queued — open modal
        setStartingJob(existingJob as Job)
        return
      }

      // No job exists — upsert customer then create job
      const customer = await upsertCustomer(
        {
          name: appt.customer_name,
          phone: appt.customer_phone,
          email: appt.customer_email,
          vehicle_year: appt.vehicle_year || undefined,
          vehicle_make: appt.vehicle_make || undefined,
          vehicle_model: appt.vehicle_model || undefined,
          vehicle_color: appt.vehicle_color || undefined,
        },
        businessId
      )

      const job = await createJob({
        business_id: businessId,
        appointment_id: appt.id,
        customer_id: customer.id,
        technician_id: appt.technician_id,
      })
      setStartingJob(job)
    } catch (e: any) {
      alert(e.message || 'Failed to start job')
    } finally {
      setLoadingApptId(null)
    }
  }

  const ROW_HEIGHT = 60 // px per hour

  return (
    <div className="p-4 md:p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Calendar size={18} className="text-red-600" /> Schedule
          </h2>
          <p className="text-[12px] md:text-[13px] text-zinc-400 mt-0.5">{appointments.length} appointments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={copyBookingLink} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${copied ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'}`}>
            {copied ? <Check size={14} className="text-emerald-500" /> : <Link2 size={14} />}
            <span className={copied ? '' : 'hidden sm:inline'}>{copied ? 'Copied!' : 'Booking Link'}</span>
          </button>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm">
            <Plus size={14} /> New
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
          {/* Week/day nav */}
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <button
              onClick={() => {
                if (isMobile) {
                  if (clampedDayOffset === 0) { setWeekOffset(o => o - 1); setDayOffset(4) }
                  else setDayOffset(d => d - 1)
                } else { setWeekOffset(o => o - 1) }
              }}
              className="p-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50"
            ><ChevronLeft size={16} /></button>
            <span className="text-sm font-semibold text-zinc-700 flex-1 text-center">
              {isMobile
                ? `${visibleDays[0].toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${visibleDays[2].toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                : `${weekDays[0].toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`
              }
            </span>
            <button
              onClick={() => {
                if (isMobile) {
                  if (clampedDayOffset >= 4) { setWeekOffset(o => o + 1); setDayOffset(0) }
                  else setDayOffset(d => d + 1)
                } else { setWeekOffset(o => o + 1) }
              }}
              className="p-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50"
            ><ChevronRight size={16} /></button>
            <button onClick={() => { setWeekOffset(0); setDayOffset(0) }} className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50">Today</button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-red-600" /></div>
          ) : (
            <>
              {/* Calendar grid */}
              <div className="flex-1 border border-zinc-200 rounded-xl overflow-hidden bg-white flex flex-col min-h-0">
                {/* Day headers */}
                <div className="border-b border-zinc-200 bg-zinc-50 shrink-0">
                  <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${numCols}, 1fr)` }}>
                    <div className="border-r border-zinc-200" />
                    {visibleDays.map((day, i) => {
                      const isToday = day.toDateString() === today.toDateString()
                      return (
                        <div key={i} className={`text-center py-2.5 border-r border-zinc-100 last:border-r-0 ${isToday ? 'bg-red-50' : ''}`}>
                          <p className={`text-[10px] font-semibold uppercase tracking-wider ${isToday ? 'text-red-600' : 'text-zinc-400'}`}>{DAYS[day.getDay()]}</p>
                          <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-red-600' : 'text-zinc-800'}`}>
                            {isToday ? (
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-600 text-white text-sm">{day.getDate()}</span>
                            ) : (
                              day.getDate()
                            )}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Scrollable time grid */}
                <div className="flex-1 overflow-y-auto" ref={gridRef}>
                  <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${numCols}, 1fr)`, position: 'relative', height: HOURS.length * ROW_HEIGHT }}>
                    {/* Time labels */}
                    {HOURS.map((hour, i) => (
                      <div
                        key={hour}
                        className="absolute left-0 w-[60px] text-right pr-2 -translate-y-1/2 text-[10px] font-medium text-zinc-400"
                        style={{ top: i * ROW_HEIGHT }}
                      >
                        {formatHour(hour)}
                      </div>
                    ))}

                    {/* Horizontal grid lines */}
                    {HOURS.map((_, i) => (
                      <div
                        key={i}
                        className="absolute left-[60px] right-0 border-t border-zinc-100"
                        style={{ top: i * ROW_HEIGHT }}
                      />
                    ))}

                    {/* Day columns with vertical separators */}
                    {visibleDays.map((day, colIdx) => {
                      const isToday = day.toDateString() === today.toDateString()
                      const weekIdx = weekDays.findIndex(d => d.toDateString() === day.toDateString())
                      const dayAppts = weekIdx >= 0 ? apptsByDay[weekIdx].appts : []

                      return (
                        <div
                          key={colIdx}
                          className={`absolute top-0 bottom-0 border-r border-zinc-100 ${isToday ? 'bg-red-50/30' : ''}`}
                          style={{
                            left: `calc(60px + ${colIdx} * ((100% - 60px) / ${numCols}))`,
                            width: `calc((100% - 60px) / ${numCols})`,
                          }}
                        >
                          {/* Appointments */}
                          {dayAppts.map(appt => {
                            const apptDate = new Date(appt.scheduled_at)
                            const startHour = apptDate.getHours() + apptDate.getMinutes() / 60
                            const duration = (appt.duration_minutes || 60) / 60
                            const top = (startHour - HOURS[0]) * ROW_HEIGHT
                            const height = Math.max(duration * ROW_HEIGHT, 28)
                            const apptIsToday = isApptToday(appt)
                            const jobStatus = jobStatuses[appt.id]

                            return (
                              <button
                                key={appt.id}
                                onClick={() => setSelected(appt)}
                                className={`absolute left-1 right-1 rounded-lg border text-left overflow-hidden transition-shadow hover:shadow-md cursor-pointer z-10 ${STATUS_COLORS[appt.status]}`}
                                style={{ top: Math.max(top, 0), height }}
                              >
                                <div className="px-2 py-1">
                                  <div className="flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[appt.status]}`} />
                                    <p className="text-[11px] font-semibold truncate">{appt.customer_name}</p>
                                  </div>
                                  <p className="text-[10px] opacity-70 truncate">{formatTime(appt.scheduled_at)}</p>
                                  {height > 48 && appt.vehicle_make && (
                                    <p className="text-[9px] opacity-60 truncate mt-0.5">
                                      {[appt.vehicle_year, appt.vehicle_make, appt.vehicle_model].filter(Boolean).join(' ')}
                                    </p>
                                  )}
                                </div>
                                {apptIsToday && appt.status !== 'cancelled' && height > 48 && (
                                  <div className="px-1.5 pb-1">
                                    {jobStatus === 'in_progress' ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-violet-100 text-violet-700">In Progress</span>
                                    ) : jobStatus === 'completed' ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-700">Completed</span>
                                    ) : (
                                      <span
                                        onClick={(e) => { e.stopPropagation(); handleStartJob(appt) }}
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gradient-to-r from-red-700 to-red-600 text-white text-[9px] font-semibold shadow-sm hover:shadow transition-all"
                                      >
                                        {loadingApptId === appt.id ? (
                                          <Loader2 size={8} className="animate-spin" />
                                        ) : (
                                          <Play size={8} />
                                        )}
                                        Start Job
                                      </span>
                                    )}
                                  </div>
                                )}
                              </button>
                            )
                          })}

                          {/* Current time indicator */}
                          {isToday && (() => {
                            const now = new Date()
                            const currentHour = now.getHours() + now.getMinutes() / 60
                            if (currentHour >= HOURS[0] && currentHour <= HOURS[HOURS.length - 1]) {
                              const top = (currentHour - HOURS[0]) * ROW_HEIGHT
                              return (
                                <div className="absolute left-0 right-0 z-20" style={{ top }}>
                                  <div className="flex items-center">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-600 -ml-1" />
                                    <div className="flex-1 h-[2px] bg-red-600" />
                                  </div>
                                </div>
                              )
                            }
                            return null
                          })()}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Pending appointments list */}
              {appointments.filter(a => a.status === 'pending').length > 0 && (
                <div className="mt-4 shrink-0">
                  <h3 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    Pending Confirmation ({appointments.filter(a => a.status === 'pending').length})
                  </h3>
                  <div className="space-y-2">
                    {appointments.filter(a => a.status === 'pending').map(a => (
                      <div key={a.id} className="glass rounded-2xl p-4 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-zinc-900 text-sm">{a.customer_name}</p>
                          <p className="text-xs text-zinc-400">{new Date(a.scheduled_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at {formatTime(a.scheduled_at)}</p>
                          {(a.vehicle_make || a.vehicle_model) && (
                            <p className="text-xs text-zinc-400">{[a.vehicle_year, a.vehicle_make, a.vehicle_model].filter(Boolean).join(' ')}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleUpdate(a.id, { status: 'confirmed' })} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold">Confirm</button>
                          <button onClick={() => handleUpdate(a.id, { status: 'cancelled' })} className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 text-xs font-semibold">Decline</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      {/* Appointment detail modal */}
      {selected && (
        <AppointmentModal
          appointment={selected}
          users={users}
          businessId={profile?.business_id || ''}
          onClose={() => setSelected(null)}
          onUpdate={(updates) => handleUpdate(selected.id, updates)}
          onDelete={() => handleDelete(selected.id)}
        />
      )}

      {showNew && (
        <AppointmentModal
          users={users}
          businessId={profile?.business_id || ''}
          onClose={() => setShowNew(false)}
          onCreate={handleCreate}
        />
      )}

      {startingJob && profile && (
        <StartJobModal
          job={startingJob}
          technicianId={profile.id}
          onClose={() => setStartingJob(null)}
          onStarted={() => {
            if (startingJob.appointment_id) {
              setJobStatuses(s => ({ ...s, [startingJob.appointment_id!]: 'in_progress' }))
            }
            setStartingJob(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}
