import { useState, useMemo, useRef } from 'react'
import { useAppointments, deleteAppointment, useAuth, useAdminUsers, updateAppointment, createAppointment, useBusinesses } from '@/lib/store'
import { Appointment, AppointmentStatus } from '@/lib/types'
import { Calendar, Plus, Loader2, ChevronLeft, ChevronRight, Link2, Check } from 'lucide-react'
import AppointmentModal from '@/components/AppointmentModal'

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
  const [selected, setSelected] = useState<Appointment | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [copied, setCopied] = useState(false)
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

  const apptsByDay = useMemo(() => weekDays.map(day => ({
    date: day,
    appts: appointments.filter(a => {
      const ad = new Date(a.scheduled_at)
      return ad.toDateString() === day.toDateString()
    }).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
  })), [weekDays[0].getTime(), appointments])

  const copyBookingLink = () => {
    const biz = businesses.find(b => b.id === profile?.business_id)
    const slug = biz?.slug || ''
    if (!slug) { alert('No booking slug found. Set one in business settings.'); return }
    navigator.clipboard.writeText(`${window.location.origin}/book/${slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
  const ROW_HEIGHT = 60 // px per hour

  return (
    <div className="p-4 md:p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <Calendar size={18} className="text-red-600" /> Schedule
          </h2>
          <p className="text-[12px] text-zinc-400 mt-0.5">{appointments.length} appointments</p>
        </div>
        <div className="flex gap-2">
          <button onClick={copyBookingLink} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50">
            {copied ? <Check size={14} className="text-emerald-500" /> : <Link2 size={14} />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Booking Link'}</span>
          </button>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm">
            <Plus size={15} /> New
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
          {/* Week nav */}
          <div className="flex items-center gap-3 mb-3 shrink-0">
            <button onClick={() => setWeekOffset(o => o - 1)} className="p-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50"><ChevronLeft size={16} /></button>
            <span className="text-sm font-semibold text-zinc-700">
              {weekDays[0].toLocaleDateString([], { month: 'short', day: 'numeric' })} – {weekDays[6].toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <button onClick={() => setWeekOffset(o => o + 1)} className="p-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50"><ChevronRight size={16} /></button>
            <button onClick={() => setWeekOffset(0)} className="ml-auto px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50">Today</button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-red-600" /></div>
          ) : (
            <>
              {/* Calendar grid */}
              <div className="flex-1 border border-zinc-200 rounded-xl overflow-hidden bg-white flex flex-col min-h-0">
                {/* Day headers — sticky */}
                <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-zinc-200 bg-zinc-50 shrink-0">
                  <div className="border-r border-zinc-200" />
                  {weekDays.map((day, i) => {
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

                {/* Scrollable time grid */}
                <div className="flex-1 overflow-y-auto" ref={gridRef}>
                  <div className="grid grid-cols-[60px_repeat(7,1fr)] relative" style={{ height: HOURS.length * ROW_HEIGHT }}>
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
                    {weekDays.map((day, dayIdx) => {
                      const isToday = day.toDateString() === today.toDateString()
                      const dayAppts = apptsByDay[dayIdx].appts

                      return (
                        <div
                          key={dayIdx}
                          className={`absolute top-0 bottom-0 border-r border-zinc-100 ${isToday ? 'bg-red-50/30' : ''}`}
                          style={{
                            left: `calc(60px + ${dayIdx} * ((100% - 60px) / 7))`,
                            width: `calc((100% - 60px) / 7)`,
                          }}
                        >
                          {/* Appointments */}
                          {dayAppts.map(appt => {
                            const apptDate = new Date(appt.scheduled_at)
                            const startHour = apptDate.getHours() + apptDate.getMinutes() / 60
                            const duration = (appt.duration_minutes || 60) / 60
                            const top = (startHour - HOURS[0]) * ROW_HEIGHT
                            const height = Math.max(duration * ROW_HEIGHT, 28)

                            return (
                              <button
                                key={appt.id}
                                onClick={() => setSelected(appt)}
                                className={`absolute left-1 right-1 rounded-lg border px-2 py-1 text-left overflow-hidden transition-shadow hover:shadow-md z-10 ${STATUS_COLORS[appt.status]}`}
                                style={{ top: Math.max(top, 0), height }}
                              >
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
    </div>
  )
}
