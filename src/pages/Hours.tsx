import { useState, useEffect } from 'react'
import { useTimeEntries, useShifts, useAuth, useAdminUsers, clockIn, clockOut, getOpenTimeEntry, createShift, deleteShift } from '@/lib/store'
import { TimeEntry } from '@/lib/types'
import { Clock, Plus, Loader2, Trash2, Users, TimerReset } from 'lucide-react'
import { hapticSuccess } from '@/lib/haptics'



function formatDuration(start: string, end?: string | null) {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime()
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${m}m`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

// Weekly hours summary per employee
function weeklyHours(entries: TimeEntry[], employeeId: string): number {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)
  return entries
    .filter(e => e.employee_id === employeeId && new Date(e.clock_in) >= weekStart)
    .reduce((s, e) => s + (e.hours_worked || 0), 0)
}

export default function Hours() {
  const { user, profile } = useAuth()
  const { entries, refresh: refreshEntries } = useTimeEntries()
  const { shifts, refresh: refreshShifts } = useShifts()
  const { users } = useAdminUsers()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  const [tab, setTab] = useState<'clock' | 'shifts'>(isAdmin ? 'clock' : 'clock')
  const [openEntry, setOpenEntry] = useState<TimeEntry | null>(null)
  const [checkingOpen, setCheckingOpen] = useState(true)
  const [clocking, setClocking] = useState(false)
  const [elapsed, setElapsed] = useState('')

  // Shift form
  const [shiftForm, setShiftForm] = useState({ employee_id: '', start: '', end: '', notes: '' })
  const [savingShift, setSavingShift] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    getOpenTimeEntry(user.id).then(entry => {
      setOpenEntry(entry)
      setCheckingOpen(false)
    })
  }, [user?.id, entries])

  // Live elapsed timer
  useEffect(() => {
    if (!openEntry) { setElapsed(''); return }
    const tick = () => setElapsed(formatDuration(openEntry.clock_in))
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [openEntry])

  const handleClockIn = async () => {
    if (!user?.id || !profile?.business_id) return
    setClocking(true)
    try {
      const entry = await clockIn(user.id, profile.business_id)
      setOpenEntry(entry)
      await hapticSuccess()
      refreshEntries()
    } finally {
      setClocking(false)
    }
  }

  const handleClockOut = async () => {
    if (!openEntry) return
    setClocking(true)
    try {
      await clockOut(openEntry.id)
      setOpenEntry(null)
      await hapticSuccess()
      refreshEntries()
    } finally {
      setClocking(false)
    }
  }

  const handleCreateShift = async () => {
    if (!shiftForm.employee_id || !shiftForm.start || !shiftForm.end || !profile?.business_id) return
    setSavingShift(true)
    try {
      await createShift({
        business_id: profile.business_id,
        employee_id: shiftForm.employee_id,
        scheduled_start: new Date(shiftForm.start).toISOString(),
        scheduled_end: new Date(shiftForm.end).toISOString(),
        notes: shiftForm.notes || null,
      })
      setShiftForm({ employee_id: '', start: '', end: '', notes: '' })
      refreshShifts()
    } finally {
      setSavingShift(false)
    }
  }

  // My entries
  const myEntries = entries.filter(e => e.employee_id === user?.id)
  const myWeekHours = weeklyHours(entries, user?.id || '')

  // All employees clocked in
  const clockedIn = users.filter(u => entries.some(e => e.employee_id === u.id && !e.clock_out))

  return (
    <div>
      <div className="sticky top-0 z-20 bg-[#f5f5f5]/95 backdrop-blur-md px-4 md:px-6 pt-4 md:pt-6 pb-3">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <Clock size={18} className="text-red-600" /> Hours
            </h2>
            <p className="text-[12px] md:text-[13px] text-zinc-400 mt-0.5">Track time &amp; shifts</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 mb-5 w-fit">
          <button onClick={() => setTab('clock')} className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${tab === 'clock' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>
            <TimerReset size={13} /> Clock In/Out
          </button>
          <button onClick={() => setTab('shifts')} className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${tab === 'shifts' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>
            <Users size={13} /> Shifts
          </button>
        </div>
      </div>

      <div className="px-4 md:px-6 pb-4">
      {tab === 'clock' && (
        <div className="space-y-4">
          {/* Clock In/Out Widget */}
          <div className="glass rounded-2xl p-6 flex flex-col items-center gap-4">
            {checkingOpen ? (
              <Loader2 size={24} className="animate-spin text-red-600" />
            ) : (
              <>
                <div className={`w-24 h-24 rounded-full flex items-center justify-center ${openEntry ? 'bg-emerald-100' : 'bg-zinc-100'}`}>
                  <Clock size={36} className={openEntry ? 'text-emerald-500' : 'text-zinc-400'} />
                </div>
                {openEntry ? (
                  <>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-600">{elapsed || '—'}</p>
                      <p className="text-sm text-zinc-500 mt-1">Clocked in at {formatTime(openEntry.clock_in)}</p>
                    </div>
                    <button
                      onClick={handleClockOut}
                      disabled={clocking}
                      className="px-10 py-3.5 rounded-2xl bg-red-500 text-white font-bold text-lg shadow-lg shadow-red-500/25 disabled:opacity-50 active:scale-95 transition-transform"
                    >
                      {clocking ? <Loader2 size={20} className="animate-spin" /> : 'Clock Out'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-center">
                      <p className="font-semibold text-zinc-700">You&apos;re clocked out</p>
                      <p className="text-sm text-zinc-400 mt-0.5">This week: <span className="font-semibold text-zinc-700">{myWeekHours.toFixed(1)}h</span></p>
                    </div>
                    <button
                      onClick={handleClockIn}
                      disabled={clocking}
                      className="px-10 py-3.5 rounded-2xl bg-gradient-to-r from-red-700 to-red-600 text-white font-bold text-lg shadow-lg shadow-red-700/25 disabled:opacity-50 active:scale-95 transition-transform"
                    >
                      {clocking ? <Loader2 size={20} className="animate-spin" /> : 'Clock In'}
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Admin: who's clocked in */}
          {isAdmin && clockedIn.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-zinc-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                Currently Clocked In ({clockedIn.length})
              </h3>
              <div className="space-y-2">
                {clockedIn.map(u => {
                  const entry = entries.find(e => e.employee_id === u.id && !e.clock_out)
                  return (
                    <div key={u.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium text-zinc-800">{u.display_name}</span>
                      {entry && <span className="text-xs text-zinc-400">{formatDuration(entry.clock_in)} · since {formatTime(entry.clock_in)}</span>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Admin: weekly hours table */}
          {isAdmin && (
            <div className="glass rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-zinc-800 mb-3">This Week's Hours</h3>
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-700">{u.display_name}</span>
                    <span className="font-semibold text-zinc-900">{weeklyHours(entries, u.id).toFixed(1)}h</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My recent time entries */}
          {myEntries.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-zinc-800 mb-3">Recent Entries</h3>
              <div className="space-y-2">
                {myEntries.slice(0, 10).map(e => (
                  <div key={e.id} className="flex items-center justify-between text-sm py-1 border-b border-zinc-100 last:border-0">
                    <div>
                      <p className="font-medium text-zinc-800">{formatDateShort(e.clock_in)}</p>
                      <p className="text-xs text-zinc-400">{formatTime(e.clock_in)} {e.clock_out ? `– ${formatTime(e.clock_out)}` : '(active)'}</p>
                    </div>
                    <span className={`font-semibold ${e.clock_out ? 'text-zinc-700' : 'text-emerald-600'}`}>
                      {e.hours_worked != null ? `${e.hours_worked}h` : formatDuration(e.clock_in)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'shifts' && (
        <div className="space-y-4">
          {/* Create shift (admin only) */}
          {isAdmin && (
            <div className="glass rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-zinc-800 mb-4 flex items-center gap-2">
                <Plus size={14} className="text-red-600" /> Assign Shift
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Employee</label>
                  <select
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:border-red-300"
                    value={shiftForm.employee_id}
                    onChange={e => setShiftForm(f => ({ ...f, employee_id: e.target.value }))}
                  >
                    <option value="">Select employee...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Start</label>
                    <input type="datetime-local" className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:border-red-300"
                      value={shiftForm.start} onChange={e => setShiftForm(f => ({ ...f, start: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">End</label>
                    <input type="datetime-local" className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:border-red-300"
                      value={shiftForm.end} onChange={e => setShiftForm(f => ({ ...f, end: e.target.value }))} />
                  </div>
                </div>
                <input className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:border-red-300"
                  placeholder="Notes (optional)" value={shiftForm.notes} onChange={e => setShiftForm(f => ({ ...f, notes: e.target.value }))} />
                <button onClick={handleCreateShift} disabled={savingShift || !shiftForm.employee_id || !shiftForm.start || !shiftForm.end}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold disabled:opacity-40">
                  {savingShift ? 'Saving...' : 'Assign Shift'}
                </button>
              </div>
            </div>
          )}

          {/* Shift list */}
          <div className="glass rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-zinc-800 mb-3">Upcoming Shifts</h3>
            {shifts.filter(s => new Date(s.scheduled_end) >= new Date()).length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-4">No upcoming shifts scheduled</p>
            ) : (
              <div className="space-y-2">
                {shifts
                  .filter(s => {
                    const upcoming = new Date(s.scheduled_end) >= new Date()
                    if (!isAdmin) return upcoming && s.employee_id === user?.id
                    return upcoming
                  })
                  .map(s => (
                    <div key={s.id} className="flex items-start justify-between py-2 border-b border-zinc-100 last:border-0">
                      <div>
                        {isAdmin && <p className="text-xs font-semibold text-red-700 mb-0.5">{s.employee?.display_name || 'Unknown'}</p>}
                        <p className="text-sm font-medium text-zinc-800">{formatDateShort(s.scheduled_start)}</p>
                        <p className="text-xs text-zinc-400">{formatTime(s.scheduled_start)} – {formatTime(s.scheduled_end)}</p>
                        {s.notes && <p className="text-xs text-zinc-400 mt-0.5">{s.notes}</p>}
                      </div>
                      {isAdmin && (
                        <button onClick={() => { if (confirm('Delete shift?')) deleteShift(s.id).then(refreshShifts) }}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
