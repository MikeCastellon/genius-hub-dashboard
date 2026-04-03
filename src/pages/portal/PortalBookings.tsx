import { useState } from 'react'
import { useMyAppointments } from '@/lib/store'
import { Calendar, Clock, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { AppointmentStatus } from '@/lib/types'

const statusConfig: Record<AppointmentStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pending', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  confirmed: { label: 'Confirmed', bg: 'bg-green-50', text: 'text-green-700' },
  in_progress: { label: 'In Progress', bg: 'bg-blue-50', text: 'text-blue-700' },
  completed: { label: 'Completed', bg: 'bg-zinc-100', text: 'text-zinc-600' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-50', text: 'text-red-700' },
}

function formatFullDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function PortalBookings() {
  const { appointments, loading, refresh } = useMyAppointments()
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const now = new Date()
  const upcoming = appointments
    .filter((a) => a.status !== 'cancelled' && new Date(a.scheduled_at) >= now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return
    setCancellingId(id)
    try {
      await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id)
      await refresh()
    } catch (err) {
      console.error('Failed to cancel appointment:', err)
    } finally {
      setCancellingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">My Bookings</h1>
        <p className="mt-1 text-sm text-zinc-500">Your upcoming appointments</p>
      </div>

      {/* Empty state */}
      {upcoming.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-100 bg-white py-16 shadow-sm">
          <Calendar className="h-12 w-12 text-zinc-300" />
          <p className="mt-4 text-base font-medium text-zinc-700">No upcoming bookings</p>
          <p className="mt-1 text-sm text-zinc-400">Book an appointment to get started</p>
        </div>
      )}

      {/* Appointment cards */}
      <div className="space-y-4">
        {upcoming.map((appt) => {
          const status = statusConfig[appt.status] || statusConfig.pending
          const canCancel = appt.status === 'pending' || appt.status === 'confirmed'

          return (
            <div
              key={appt.id}
              className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-3">
                  {/* Date & time */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-zinc-400" />
                      {formatFullDate(appt.scheduled_at)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-zinc-400" />
                      {formatTime(appt.scheduled_at)}
                    </span>
                  </div>

                  {/* Vehicle info */}
                  {(appt.vehicle_year || appt.vehicle_make || appt.vehicle_model) && (
                    <p className="text-sm text-zinc-700">
                      {[appt.vehicle_year, appt.vehicle_make, appt.vehicle_model, appt.vehicle_color]
                        .filter(Boolean)
                        .join(' ')}
                    </p>
                  )}

                  {/* Services */}
                  {appt.service_ids && appt.service_ids.length > 0 && (
                    <p className="text-xs text-zinc-400">
                      {appt.service_ids.length} service{appt.service_ids.length !== 1 ? 's' : ''} booked
                    </p>
                  )}

                  {/* Notes */}
                  {appt.notes && (
                    <p className="text-xs text-zinc-400 italic">{appt.notes}</p>
                  )}
                </div>

                {/* Status & cancel */}
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}
                  >
                    {status.label}
                  </span>

                  {canCancel && (
                    <button
                      onClick={() => handleCancel(appt.id)}
                      disabled={cancellingId === appt.id}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      {cancellingId === appt.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
