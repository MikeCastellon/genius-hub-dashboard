import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicBookingData, createAppointment } from '@/lib/store'
import { Service } from '@/lib/types'
import { CheckCircle, ChevronLeft, ChevronRight, Clock, Car, User, Calendar } from 'lucide-react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
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
function formatDateShort(d: Date) {
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>()
  const [data, setData] = useState<any>(null)
  const [notFound, setNotFound] = useState(false)
  const [step, setStep] = useState(1)

  // Step 1: services
  const [selectedServices, setSelectedServices] = useState<Service[]>([])
  // Step 2: date/time
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  // Step 3: customer info
  const [form, setForm] = useState({ name: '', phone: '', email: '', year: '', make: '', model: '', color: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!slug) return
    getPublicBookingData(slug).then(d => {
      if (!d) setNotFound(true)
      else setData(d)
    })
  }, [slug])

  if (notFound) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-zinc-800">Business not found</h1>
        <p className="text-zinc-400 mt-2">Check the booking link and try again.</p>
      </div>
    </div>
  )

  if (!data) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
    </div>
  )

  if (done) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-emerald-500/25">
          <CheckCircle size={36} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900">You're booked!</h2>
        <p className="text-zinc-500 mt-2 text-sm">
          {data.business.name} will confirm your appointment shortly.
        </p>
        {selectedSlot && (
          <div className="mt-4 bg-white rounded-2xl p-4 border border-zinc-200 text-sm text-zinc-700">
            <p className="font-semibold">{new Date(selectedSlot).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <p className="text-red-600 font-medium">{formatTime(selectedSlot)}</p>
          </div>
        )}
      </div>
    </div>
  )

  const { business, services, hours, booked } = data

  // Build week days for step 2
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() + weekOffset * 7)
  weekStart.setHours(0, 0, 0, 0)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })

  const handleSubmit = async () => {
    if (!selectedSlot) return
    setSubmitting(true)
    try {
      await createAppointment({
        business_id: business.id,
        customer_name: form.name,
        customer_phone: form.phone,
        customer_email: form.email || null,
        vehicle_year: form.year || null,
        vehicle_make: form.make || null,
        vehicle_model: form.model || null,
        vehicle_color: form.color || null,
        service_ids: selectedServices.map(s => s.id),
        scheduled_at: selectedSlot,
        duration_minutes: 60,
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

  const totalPrice = selectedServices.reduce((s, sv) => s + sv.price, 0)

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-700 to-red-600 flex items-center justify-center shrink-0">
            <Car size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-zinc-900">{business.name}</h1>
            <p className="text-xs text-zinc-400">Book an appointment</p>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="bg-white border-b border-zinc-100 px-4 py-3">
        <div className="max-w-lg mx-auto flex gap-2">
          {['Services', 'Date & Time', 'Your Info'].map((label, i) => (
            <div key={i} className="flex-1 text-center">
              <div className={`text-xs font-semibold ${step === i + 1 ? 'text-red-700' : step > i + 1 ? 'text-emerald-500' : 'text-zinc-400'}`}>
                {step > i + 1 ? '✓ ' : ''}{label}
              </div>
              <div className={`h-1 rounded-full mt-1 ${step === i + 1 ? 'bg-red-600' : step > i + 1 ? 'bg-emerald-400' : 'bg-zinc-200'}`} />
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">

        {/* ── Step 1: Services ── */}
        {step === 1 && (
          <>
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100">
                <h2 className="font-semibold text-zinc-800 text-sm">Select Services</h2>
              </div>
              {services.length === 0 ? (
                <p className="px-4 py-6 text-sm text-zinc-400 text-center">No services available</p>
              ) : (
                <div className="divide-y divide-zinc-100">
                  {services.map((svc: Service) => {
                    const selected = selectedServices.some(s => s.id === svc.id)
                    return (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => setSelectedServices(prev =>
                          selected ? prev.filter(s => s.id !== svc.id) : [...prev, svc]
                        )}
                        className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${selected ? 'bg-red-50' : 'hover:bg-zinc-50'}`}
                      >
                        <div>
                          <p className={`text-sm font-medium ${selected ? 'text-red-700' : 'text-zinc-800'}`}>{svc.name}</p>
                          {svc.duration_minutes && <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1"><Clock size={11} />{svc.duration_minutes} min</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-semibold ${selected ? 'text-red-700' : 'text-zinc-700'}`}>${svc.price}</span>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? 'bg-red-600 border-red-600' : 'border-zinc-300'}`}>
                            {selected && <span className="text-white text-xs font-bold">✓</span>}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {selectedServices.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-red-700">{selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected</span>
                <span className="font-bold text-red-700">${totalPrice.toFixed(2)}</span>
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={selectedServices.length === 0}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-700 to-red-600 text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            >
              Continue <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* ── Step 2: Date & Time ── */}
        {step === 2 && (
          <>
            <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
                <button onClick={() => setWeekOffset(o => Math.max(0, o - 1))} className="p-1.5 rounded-lg hover:bg-zinc-100">
                  <ChevronLeft size={16} />
                </button>
                <h2 className="font-semibold text-zinc-800 text-sm">
                  {formatDateShort(weekDays[0])} — {formatDateShort(weekDays[6])}
                </h2>
                <button onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-zinc-100">
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="p-4 space-y-3">
                {weekDays.map((day) => {
                  const slots = generateSlots(day, hours, booked)
                  if (slots.length === 0) return null
                  return (
                    <div key={day.toISOString()}>
                      <p className="text-xs font-semibold text-zinc-500 mb-2">{DAYS[day.getDay()]} {day.getDate()}</p>
                      <div className="flex flex-wrap gap-2">
                        {slots.map(slot => (
                          <button
                            key={slot}
                            onClick={() => setSelectedSlot(slot)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              selectedSlot === slot
                                ? 'bg-red-600 text-white border-red-600'
                                : 'border-zinc-200 text-zinc-700 hover:border-red-300 hover:bg-red-50'
                            }`}
                          >
                            {formatTime(slot)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {weekDays.every(d => generateSlots(d, hours, booked).length === 0) && (
                  <p className="text-sm text-zinc-400 text-center py-4">No availability this week — try the next week.</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-2xl border border-zinc-200 text-zinc-600 font-semibold text-sm flex items-center justify-center gap-1">
                <ChevronLeft size={15} /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!selectedSlot}
                className="flex-[2] py-3 rounded-2xl bg-gradient-to-r from-red-700 to-red-600 text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Customer Info ── */}
        {step === 3 && (
          <>
            {selectedSlot && (
              <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-red-700">
                  <Calendar size={14} />
                  <span className="text-sm font-semibold">
                    {new Date(selectedSlot).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} at {formatTime(selectedSlot)}
                  </span>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
                <User size={14} className="text-red-600" /> Your Information
              </h3>
              <input className={inputClass} placeholder="Full name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <input className={inputClass} placeholder="Phone number *" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              <input className={inputClass} placeholder="Email (optional)" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-3">
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

            <div className="bg-white rounded-2xl border border-zinc-200 p-4">
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder="Any notes or special requests..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-2xl border border-zinc-200 text-zinc-600 font-semibold text-sm flex items-center justify-center gap-1">
                <ChevronLeft size={15} /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name || !form.phone || submitting}
                className="flex-[2] py-3 rounded-2xl bg-gradient-to-r from-red-700 to-red-600 text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2 text-sm"
              >
                {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Confirm Booking'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
