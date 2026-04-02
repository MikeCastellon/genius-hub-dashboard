import { useState } from 'react'
import { useAppointments, deleteAppointment, useAuth, useAdminUsers, updateAppointment, createAppointment, useBusinessHours, upsertBusinessHours } from '@/lib/store'
import { Appointment, AppointmentStatus, BusinessHours } from '@/lib/types'
import { Calendar, Plus, Loader2, ChevronLeft, ChevronRight, Link2, Check, Settings } from 'lucide-react'

import AppointmentModal from '@/components/AppointmentModal'

const STATUS_COLORS: Record<AppointmentStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-red-100 text-red-700',
  in_progress: 'bg-violet-100 text-violet-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-zinc-100 text-zinc-500',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function Schedule() {
  const { profile } = useAuth()
  const { appointments, loading, refresh } = useAppointments()
  const { users } = useAdminUsers()
  const { hours, refresh: refreshHours } = useBusinessHours()
  const [tab, setTab] = useState<'schedule' | 'hours'>('schedule')
  const [weekOffset, setWeekOffset] = useState(0)
  const [selected, setSelected] = useState<Appointment | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [copied, setCopied] = useState(false)
  const [savingHours, setSavingHours] = useState(false)
  const [localHours, setLocalHours] = useState<Partial<BusinessHours>[]>([])
  const [hoursInit, setHoursInit] = useState(false)

  // Init local hours from DB once
  if (!hoursInit && hours.length > 0) {
    setLocalHours(Array.from({ length: 7 }, (_, i) => {
      const bh = hours.find(h => h.day_of_week === i)
      return bh || { day_of_week: i, start_time: '08:00', end_time: '18:00', is_open: false }
    }))
    setHoursInit(true)
  }
  if (!hoursInit && hours.length === 0 && localHours.length === 0) {
    setLocalHours(Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i, start_time: '08:00', end_time: '18:00', is_open: i >= 1 && i <= 5
    })))
  }

  // Week grid
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + weekOffset * 7)
  weekStart.setHours(0, 0, 0, 0)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  const apptsByDay = weekDays.map(day => ({
    date: day,
    appts: appointments.filter(a => {
      const ad = new Date(a.scheduled_at)
      return ad.toDateString() === day.toDateString()
    })
  }))

  const copyBookingLink = () => {
    const slug = (profile as any)?.business?.slug || ''
    navigator.clipboard.writeText(`${window.location.origin}/book/${slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveHours = async () => {
    if (!profile?.business_id) return
    setSavingHours(true)
    try {
      await upsertBusinessHours(localHours.map(h => ({ ...h, business_id: profile.business_id! } as Omit<BusinessHours, 'id'>)))
      refreshHours()
    } finally {
      setSavingHours(false)
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

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
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

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 mb-5 w-fit">
        <button onClick={() => setTab('schedule')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'schedule' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>Calendar</button>
        <button onClick={() => setTab('hours')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${tab === 'hours' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>
          <Settings size={13} /> Business Hours
        </button>
      </div>

      {tab === 'schedule' && (
        <>
          {/* Week nav */}
          <div className="flex items-center gap-3 mb-4">
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
            <div className="grid grid-cols-7 gap-2">
              {apptsByDay.map(({ date, appts }) => {
                const isToday = date.toDateString() === new Date().toDateString()
                return (
                  <div key={date.toISOString()} className="min-h-[120px]">
                    <div className={`text-center mb-2 py-1 rounded-lg ${isToday ? 'bg-red-600 text-white' : ''}`}>
                      <p className={`text-[10px] font-semibold ${isToday ? 'text-red-100' : 'text-zinc-400'}`}>{DAYS[date.getDay()]}</p>
                      <p className={`text-sm font-bold ${isToday ? 'text-white' : 'text-zinc-800'}`}>{date.getDate()}</p>
                    </div>
                    <div className="space-y-1">
                      {appts.map(a => (
                        <button
                          key={a.id}
                          onClick={() => setSelected(a)}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-medium leading-tight ${STATUS_COLORS[a.status]}`}
                        >
                          <p className="font-semibold truncate">{a.customer_name}</p>
                          <p className="opacity-70">{formatTime(a.scheduled_at)}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pending appointments list */}
          {appointments.filter(a => a.status === 'pending').length > 0 && (
            <div className="mt-6">
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

      {tab === 'hours' && (
        <div className="glass rounded-2xl p-5 max-w-md">
          <h3 className="text-sm font-semibold text-zinc-800 mb-4">Business Hours</h3>
          <div className="space-y-3">
            {localHours.map((bh, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-24 shrink-0">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!bh.is_open}
                      onChange={e => setLocalHours(prev => prev.map((h, j) => j === i ? { ...h, is_open: e.target.checked } : h))}
                      className="rounded border-zinc-300 text-red-600"
                    />
                    <span className={`text-sm font-medium ${bh.is_open ? 'text-zinc-800' : 'text-zinc-400'}`}>{FULL_DAYS[i]}</span>
                  </label>
                </div>
                {bh.is_open ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input type="time" value={bh.start_time || '08:00'}
                      onChange={e => setLocalHours(prev => prev.map((h, j) => j === i ? { ...h, start_time: e.target.value } : h))}
                      className="flex-1 px-2 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-red-300" />
                    <span className="text-zinc-400 text-xs">to</span>
                    <input type="time" value={bh.end_time || '18:00'}
                      onChange={e => setLocalHours(prev => prev.map((h, j) => j === i ? { ...h, end_time: e.target.value } : h))}
                      className="flex-1 px-2 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-red-300" />
                  </div>
                ) : (
                  <span className="text-xs text-zinc-400 italic">Closed</span>
                )}
              </div>
            ))}
          </div>
          <button onClick={handleSaveHours} disabled={savingHours}
            className="mt-5 w-full py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold disabled:opacity-40">
            {savingHours ? 'Saving...' : 'Save Hours'}
          </button>
        </div>
      )}

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
