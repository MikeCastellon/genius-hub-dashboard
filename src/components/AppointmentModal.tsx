import { useState } from 'react'
import { Appointment, AppointmentStatus, Profile } from '@/lib/types'
import { X, Trash2 } from 'lucide-react'

const STATUS_OPTIONS: AppointmentStatus[] = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']
const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10 transition-all'

interface Props {
  appointment?: Appointment
  users: Profile[]
  businessId: string
  onClose: () => void
  onUpdate?: (updates: Partial<Appointment>) => Promise<void>
  onDelete?: () => Promise<void>
  onCreate?: (data: Omit<Appointment, 'id' | 'created_at' | 'technician'>) => Promise<void>
}

function toLocalDatetimeInput(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AppointmentModal({ appointment, users, businessId, onClose, onUpdate, onDelete, onCreate }: Props) {
  const isNew = !appointment
  const [form, setForm] = useState({
    customer_name: appointment?.customer_name || '',
    customer_phone: appointment?.customer_phone || '',
    customer_email: appointment?.customer_email || '',
    vehicle_year: appointment?.vehicle_year || '',
    vehicle_make: appointment?.vehicle_make || '',
    vehicle_model: appointment?.vehicle_model || '',
    vehicle_color: appointment?.vehicle_color || '',
    scheduled_at: appointment?.scheduled_at ? toLocalDatetimeInput(appointment.scheduled_at) : '',
    duration_minutes: appointment?.duration_minutes || 60,
    status: appointment?.status || 'confirmed' as AppointmentStatus,
    technician_id: appointment?.technician_id || '',
    notes: appointment?.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSave = async () => {
    if (!form.customer_name || !form.customer_phone || !form.scheduled_at) return
    setSaving(true)
    try {
      const data = {
        ...form,
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_minutes: Number(form.duration_minutes),
        technician_id: form.technician_id || null,
        customer_email: form.customer_email || null,
        vehicle_year: form.vehicle_year || null,
        vehicle_make: form.vehicle_make || null,
        vehicle_model: form.vehicle_model || null,
        vehicle_color: form.vehicle_color || null,
        notes: form.notes || null,
        service_ids: appointment?.service_ids || null,
        business_id: businessId,
      }
      if (isNew && onCreate) await onCreate(data as any)
      else if (onUpdate) await onUpdate(data)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setDeleting(true)
    try { await onDelete() } finally { setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
          <h2 className="font-bold text-zinc-900">{isNew ? 'New Appointment' : 'Appointment'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Customer Name *</label>
              <input className={inputClass} value={form.customer_name} onChange={set('customer_name')} placeholder="Full name" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Phone *</label>
              <input className={inputClass} type="tel" value={form.customer_phone} onChange={set('customer_phone')} placeholder="(555) 000-0000" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Email</label>
              <input className={inputClass} type="email" value={form.customer_email} onChange={set('customer_email')} placeholder="Optional" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Year</label>
              <input className={inputClass} value={form.vehicle_year} onChange={set('vehicle_year')} placeholder="2022" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Make</label>
              <input className={inputClass} value={form.vehicle_make} onChange={set('vehicle_make')} placeholder="Toyota" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Model</label>
              <input className={inputClass} value={form.vehicle_model} onChange={set('vehicle_model')} placeholder="Camry" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Date & Time *</label>
              <input className={inputClass} type="datetime-local" value={form.scheduled_at} onChange={set('scheduled_at')} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Duration (min)</label>
              <input className={inputClass} type="number" min="15" step="15" value={form.duration_minutes} onChange={set('duration_minutes')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Status</label>
              <select className={inputClass} value={form.status} onChange={set('status')}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Technician</label>
              <select className={inputClass} value={form.technician_id} onChange={set('technician_id')}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Notes</label>
            <textarea className={`${inputClass} resize-none`} rows={2} value={form.notes} onChange={set('notes')} placeholder="Any notes..." />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-zinc-100 flex gap-3">
          {!isNew && onDelete && (
            <button onClick={handleDelete} disabled={deleting} className="p-3 rounded-xl border border-red-200 text-red-500 hover:bg-red-50">
              <Trash2 size={16} />
            </button>
          )}
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !form.customer_name || !form.customer_phone || !form.scheduled_at}
            className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold disabled:opacity-40"
          >
            {saving ? 'Saving...' : isNew ? 'Create' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
