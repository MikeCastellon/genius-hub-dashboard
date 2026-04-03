import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicBookingData, createAppointment } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import { Service } from '@/lib/types'
import { CheckCircle, ChevronLeft, ChevronRight, Clock, Car, User, Globe, Phone, MapPin, Lock } from 'lucide-react'

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const inputClass = 'w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10 transition-all'

function generateSlots(date: Date, hours: any[], booked: any[]): string[] {
  const dayOfWeek = date.getDay()
  const bh = hours.find((h: any) => h.day_of_week === dayOfWeek)
  if (!bh || !bh.is_open) return []

  const slots: string[] = []
  const [sh, sm] = bh.start_time.split(':').map(Number)
  const [eh, em] = bh.end_time.split(':').map(Number)
  const startMins = sh * 60 + sm
  const endMins = eh * 60 + em

  const bookedTimes = booked.map((b: any) => new Date(b.scheduled_at).getTime())
  const now = Date.now()

  for (let m = startMins; m < endMins - 30; m += 60) {
    const slotDate = new Date(date)
    slotDate.setHours(Math.floor(m / 60), m % 60, 0, 0)
    if (slotDate.getTime() <= now) continue
    const conflict = bookedTimes.some(bt => Math.abs(bt - slotDate.getTime()) < 60 * 60 * 1000)
    if (!conflict) {
      slots.push(slotDate.toISOString())
    }
  }
  return slots
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// Build calendar grid for a month
function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>()
  const [data, setData] = useState<any>(null)
  const [notFound, setNotFound] = useState(false)

  // Calendar state
  const today = new Date()
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  // Services
  const [selectedServices, setSelectedServices] = useState<Service[]>([])

  // Form (step after selecting time)
  const [step, setStep] = useState<'calendar' | 'details'>('calendar')
  const [form, setForm] = useState({ name: '', phone: '', email: '', year: '', make: '', model: '', color: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  // Account creation
  const [accountPassword, setAccountPassword] = useState('')
  const [accountConfirmPassword, setAccountConfirmPassword] = useState('')
  const [accountCreating, setAccountCreating] = useState(false)
  const [accountCreated, setAccountCreated] = useState(false)
  const [accountError, setAccountError] = useState('')

  useEffect(() => {
    if (!slug) return
    getPublicBookingData(slug).then(d => {
      if (!d) setNotFound(true)
      else setData(d)
    })
  }, [slug])

  const monthGrid = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // Check if a day has available slots
  const isDayAvailable = (day: number) => {
    if (!data) return false
    const d = new Date(viewYear, viewMonth, day)
    // Don't allow past dates
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    if (d < todayStart) return false
    return generateSlots(d, data.hours, data.booked).length > 0
  }

  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate || !data) return []
    return generateSlots(selectedDate, data.hours, data.booked)
  }, [selectedDate, data])

  const handleDateClick = (day: number) => {
    if (!isDayAvailable(day)) return
    setSelectedDate(new Date(viewYear, viewMonth, day))
    setSelectedSlot(null)
  }

  const handleSubmit = async () => {
    if (!selectedSlot || !data) return
    setSubmitting(true)
    try {
      await createAppointment({
        business_id: data.business.id,
        customer_name: form.name,
        customer_phone: form.phone,
        customer_email: form.email || null,
        vehicle_year: form.year || null,
        vehicle_make: form.make || null,
        vehicle_model: form.model || null,
        vehicle_color: form.color || null,
        service_ids: selectedServices.map(s => s.id),
        scheduled_at: selectedSlot,
        duration_minutes: selectedServices.reduce((sum, s) => sum + (s.duration_minutes || 60), 0) || 60,
        status: 'pending',
        technician_id: null,
        notes: form.notes || null,
      })
      setDone(true)
    } catch (e: any) {
      alert('Booking failed: ' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading / Error / Done states ──

  if (notFound) return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-zinc-800">Business not found</h1>
        <p className="text-zinc-400 mt-2">Check the booking link and try again.</p>
      </div>
    </div>
  )

  if (!data) return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
    </div>
  )

  const handleCreateAccount = async () => {
    setAccountError('')
    if (accountPassword.length < 6) {
      setAccountError('Password must be at least 6 characters')
      return
    }
    if (accountPassword !== accountConfirmPassword) {
      setAccountError('Passwords do not match')
      return
    }
    setAccountCreating(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: accountPassword,
        options: {
          data: {
            role: 'customer',
            business_id: data.business.id,
            display_name: form.name,
          },
        },
      })
      if (error) throw error
      setAccountCreated(true)
    } catch (e: any) {
      setAccountError(e.message || 'Failed to create account')
    } finally {
      setAccountCreating(false)
    }
  }

  if (done) return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        {/* Confirmation card */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <CheckCircle size={28} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900">You're booked!</h2>
          <p className="text-zinc-500 mt-2 text-sm">
            {data.business.name} will confirm your appointment shortly.
          </p>
          {selectedSlot && (
            <div className="mt-4 bg-zinc-50 rounded-xl p-3 text-sm text-zinc-700">
              <p className="font-semibold">{new Date(selectedSlot).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              <p className="text-red-600 font-medium">{formatTime(selectedSlot)}</p>
            </div>
          )}
        </div>

        {/* Account creation card */}
        {form.email && !accountCreated && (
          <div className="bg-zinc-50 rounded-2xl border border-zinc-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center shadow-sm">
                <Lock size={16} className="text-white" />
              </div>
              <h3 className="text-base font-bold text-zinc-900">Want to track your bookings?</h3>
            </div>
            <p className="text-sm text-zinc-500 mb-4 ml-12">
              Create a free account to view your appointments, history, and invoices
            </p>
            <div className="space-y-3">
              <div>
                <input
                  className={inputClass}
                  type="password"
                  placeholder="Password"
                  value={accountPassword}
                  onChange={e => setAccountPassword(e.target.value)}
                />
                {accountPassword.length > 0 && accountPassword.length < 6 && (
                  <p className="text-xs text-red-500 mt-1 ml-1">Password must be at least 6 characters</p>
                )}
              </div>
              <div>
                <input
                  className={inputClass}
                  type="password"
                  placeholder="Confirm password"
                  value={accountConfirmPassword}
                  onChange={e => setAccountConfirmPassword(e.target.value)}
                />
                {accountConfirmPassword.length > 0 && accountPassword !== accountConfirmPassword && (
                  <p className="text-xs text-red-500 mt-1 ml-1">Passwords do not match</p>
                )}
              </div>
              {accountError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{accountError}</p>
              )}
              <button
                onClick={handleCreateAccount}
                disabled={accountCreating || accountPassword.length < 6 || accountPassword !== accountConfirmPassword}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2 text-sm transition-all"
              >
                {accountCreating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Account created success */}
        {accountCreated && (
          <div className="bg-zinc-50 rounded-2xl border border-zinc-200 shadow-sm p-6 text-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={18} className="text-white" />
            </div>
            <p className="text-sm font-semibold text-zinc-900">Account created!</p>
            <p className="text-sm text-zinc-500 mt-1">You can now sign in to your portal.</p>
            <a
              href="/login"
              className="inline-block mt-3 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
            >
              Sign in &rarr;
            </a>
          </div>
        )}
      </div>
    </div>
  )

  const { business, services } = data
  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration_minutes || 60), 0)
  const totalPrice = selectedServices.reduce((s, sv) => s + sv.price, 0)
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString([], { month: 'long', year: 'numeric' })

  // Can't go before current month
  const canGoPrev = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth())

  // ── Details form (after selecting time) ──

  if (step === 'details') return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm w-full max-w-lg p-6 space-y-5">
        {/* Back + header */}
        <div>
          <button onClick={() => setStep('calendar')} className="text-sm text-zinc-400 hover:text-zinc-600 flex items-center gap-1 mb-3">
            <ChevronLeft size={14} /> Back
          </button>
          <h2 className="text-lg font-bold text-zinc-900">Enter your details</h2>
          {selectedSlot && (
            <div className="mt-2 flex items-center gap-2 text-sm text-red-600 font-medium">
              <Clock size={14} />
              {new Date(selectedSlot).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} at {formatTime(selectedSlot)}
            </div>
          )}
        </div>

        {/* Selected services summary */}
        {selectedServices.length > 0 && (
          <div className="bg-zinc-50 rounded-xl p-3 space-y-1">
            {selectedServices.map(s => (
              <div key={s.id} className="flex justify-between text-sm">
                <span className="text-zinc-700">{s.name}</span>
                <span className="text-zinc-500">${s.price}</span>
              </div>
            ))}
            <div className="border-t border-zinc-200 pt-1 flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span className="text-red-600">${totalPrice.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Your info */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
            <User size={14} className="text-red-600" /> Your Information
          </h3>
          <input className={inputClass} placeholder="Full name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input className={inputClass} placeholder="Phone number *" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <input className={inputClass} placeholder="Email (optional)" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </div>

        {/* Vehicle */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
            <Car size={14} className="text-red-600" /> Vehicle (optional)
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <input className={inputClass} placeholder="Year" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
            <input className={inputClass} placeholder="Make" value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} />
            <input className={inputClass} placeholder="Model" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
          </div>
          <input className={inputClass} placeholder="Color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
        </div>

        <textarea
          className={`${inputClass} resize-none`}
          rows={3}
          placeholder="Any notes or special requests..."
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
        />

        <button
          onClick={handleSubmit}
          disabled={!form.name || !form.phone || submitting}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
        >
          {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Confirm Booking'}
        </button>
      </div>
    </div>
  )

  // ── Main Calendly-style layout ──

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center p-4 md:p-8">
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm w-full max-w-4xl overflow-hidden">
        <div className="flex flex-col md:flex-row min-h-[520px]">

          {/* ── Left panel: Business info + services ── */}
          <div className="md:w-[320px] shrink-0 border-b md:border-b-0 md:border-r border-zinc-200 p-6 flex flex-col">
            {/* Business header */}
            <div className="mb-5">
              {business.logo_url ? (
                <img src={business.logo_url} alt={business.name} className="h-10 w-auto object-contain mb-3" />
              ) : (
                <h1 className="text-lg font-bold text-zinc-900 mb-1">{business.name}</h1>
              )}
              {business.logo_url && <p className="text-sm text-zinc-500">{business.name}</p>}
              <h2 className="text-xl font-bold text-zinc-900 mt-1">Book an Appointment</h2>
            </div>

            {/* Duration + price */}
            {selectedServices.length > 0 && (
              <div className="flex items-center gap-3 text-sm text-zinc-600 mb-4">
                <span className="flex items-center gap-1"><Clock size={14} className="text-zinc-400" /> {totalDuration} min</span>
                <span className="font-semibold text-red-600">${totalPrice.toFixed(2)}</span>
              </div>
            )}

            {/* Service selection */}
            <div className="flex-1 overflow-y-auto -mx-1 px-1">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Select Services</p>
              <div className="space-y-1.5">
                {services.map((svc: Service) => {
                  const selected = selectedServices.some(s => s.id === svc.id)
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => setSelectedServices(prev =>
                        selected ? prev.filter(s => s.id !== svc.id) : [...prev, svc]
                      )}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all text-sm ${
                        selected ? 'bg-red-50 border border-red-200' : 'hover:bg-zinc-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          selected ? 'bg-red-600 border-red-600' : 'border-zinc-300'
                        }`}>
                          {selected && <span className="text-white text-[9px] font-bold">✓</span>}
                        </div>
                        <div>
                          <p className={`font-medium ${selected ? 'text-red-700' : 'text-zinc-800'}`}>{svc.name}</p>
                          {svc.duration_minutes && <p className="text-[11px] text-zinc-400">{svc.duration_minutes} min</p>}
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${selected ? 'text-red-600' : 'text-zinc-500'}`}>${svc.price}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Business info footer */}
            <div className="mt-4 pt-4 border-t border-zinc-100 space-y-1.5 text-xs text-zinc-400">
              {business.phone && (
                <a href={`tel:${business.phone}`} className="flex items-center gap-1.5 hover:text-red-600">
                  <Phone size={11} /> {business.phone}
                </a>
              )}
              {business.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={11} /> {business.address}
                </span>
              )}
              {business.website && (
                <a href={business.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-red-600">
                  <Globe size={11} /> Website
                </a>
              )}
            </div>

            {/* Account link */}
            <div className="mt-3 pt-3 border-t border-zinc-100 text-center">
              <a href="/login" className="text-xs text-zinc-400 hover:text-red-600 transition-colors">
                <span className="font-semibold">Sign in</span> or <span className="font-semibold">create an account</span>
              </a>
            </div>
          </div>

          {/* ── Right panel: Calendar + time slots ── */}
          <div className="flex-1 p-6 flex flex-col">
            <h3 className="text-base font-bold text-zinc-900 mb-4">Select a Date & Time</h3>

            <div className="flex flex-col lg:flex-row gap-6 flex-1">
              {/* Month calendar */}
              <div className="flex-1">
                {/* Month nav */}
                <div className="flex items-center justify-between mb-4">
                  <button onClick={prevMonth} disabled={!canGoPrev}
                    className="p-1.5 rounded-lg hover:bg-zinc-100 disabled:opacity-20 disabled:cursor-not-allowed">
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm font-semibold text-zinc-800">{monthName}</span>
                  <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-zinc-100">
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 mb-2">
                  {DAY_LABELS.map(d => (
                    <div key={d} className="text-center text-[10px] font-semibold text-zinc-400 uppercase tracking-wider py-1">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {monthGrid.map((day, i) => {
                    if (day === null) return <div key={i} />
                    const available = isDayAvailable(day)
                    const isSelected = selectedDate &&
                      selectedDate.getDate() === day &&
                      selectedDate.getMonth() === viewMonth &&
                      selectedDate.getFullYear() === viewYear
                    const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear()

                    return (
                      <button
                        key={i}
                        onClick={() => handleDateClick(day)}
                        disabled={!available}
                        className={`aspect-square rounded-full flex items-center justify-center text-sm font-medium transition-all relative
                          ${isSelected
                            ? 'bg-red-600 text-white shadow-sm'
                            : available
                              ? 'text-zinc-800 hover:bg-red-50 hover:text-red-600'
                              : 'text-zinc-300 cursor-not-allowed'
                          }
                        `}
                      >
                        {day}
                        {isToday && !isSelected && (
                          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500" />
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Timezone */}
                <div className="mt-4 text-xs text-zinc-400 flex items-center gap-1.5">
                  <Globe size={12} />
                  {Intl.DateTimeFormat().resolvedOptions().timeZone} ({new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})
                </div>
              </div>

              {/* Time slots column */}
              {selectedDate && (
                <div className="lg:w-48 shrink-0">
                  <p className="text-sm font-semibold text-zinc-700 mb-3">
                    {selectedDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                  {slotsForSelectedDate.length === 0 ? (
                    <p className="text-sm text-zinc-400">No available times</p>
                  ) : (
                    <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                      {slotsForSelectedDate.map(slot => {
                        const isActive = selectedSlot === slot
                        return (
                          <div key={slot} className="flex gap-2">
                            <button
                              onClick={() => setSelectedSlot(slot)}
                              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                                isActive
                                  ? 'bg-red-600 text-white border-red-600'
                                  : 'border-red-200 text-red-600 hover:bg-red-50'
                              }`}
                            >
                              {formatTime(slot)}
                            </button>
                            {isActive && (
                              <button
                                onClick={() => setStep('details')}
                                className="px-4 py-2.5 rounded-lg bg-zinc-800 text-white text-sm font-semibold hover:bg-zinc-700 transition-colors"
                              >
                                Next
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
