import { BUSINESS_TYPE_LABELS, type BusinessType, type Customer } from '@/lib/types'
import { WARRANTY_DURATION_OPTIONS } from '@/lib/warranty-constants'
import type { PhotoEntry } from './StepPhotos'
import { CheckCircle2, AlertTriangle } from 'lucide-react'

interface VehicleData {
  vin: string
  year: number | null
  make: string | null
  model: string | null
  trim: string | null
  color: string | null
}

interface Props {
  vehicle: VehicleData
  customer: Customer | null
  businessType: BusinessType | null
  details: Record<string, any>
  serviceDate: string
  durationMonths: number | null
  mileageCap: number | null
  odometerAtService: number | null
  voidConditions: string[]
  photos: PhotoEntry[]
  notes: string
}

export default function StepReview({
  vehicle, customer, businessType, details,
  serviceDate, durationMonths, mileageCap, odometerAtService,
  voidConditions, photos, notes,
}: Props) {
  const durationLabel = businessType && durationMonths
    ? WARRANTY_DURATION_OPTIONS[businessType]?.find(o => o.months === durationMonths)?.label || `${durationMonths} months`
    : 'Not set'

  const expiryDate = serviceDate && durationMonths
    ? (() => {
        const d = new Date(serviceDate)
        d.setMonth(d.getMonth() + durationMonths)
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      })()
    : null

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
        <CheckCircle2 size={16} className="text-emerald-600" /> Review Certificate
      </h3>

      {/* Vehicle */}
      <Section title="Vehicle">
        <Row label="VIN" value={vehicle.vin || '—'} mono />
        <Row label="Vehicle" value={[vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(' ') || '—'} />
        <Row label="Color" value={vehicle.color || '—'} />
      </Section>

      {/* Customer */}
      <Section title="Customer">
        <Row label="Name" value={customer?.name || '—'} />
        <Row label="Phone" value={customer?.phone || '—'} />
        {customer?.email && <Row label="Email" value={customer.email} />}
      </Section>

      {/* Service */}
      <Section title="Service">
        <Row label="Type" value={businessType ? BUSINESS_TYPE_LABELS[businessType] : '—'} />
        <Row label="Date" value={serviceDate ? new Date(serviceDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'} />
        {Object.entries(details).map(([key, val]) => {
          if (val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) return null
          const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          let display: string
          if (typeof val === 'boolean') display = val ? 'Yes' : 'No'
          else if (Array.isArray(val) && typeof val[0] === 'string') display = val.map((s: string) => s.replace(/_/g, ' ')).join(', ')
          else if (Array.isArray(val)) display = `${val.length} item(s)`
          else display = String(val)
          return <Row key={key} label={label} value={display} />
        })}
      </Section>

      {/* Warranty */}
      <Section title="Warranty">
        <Row label="Duration" value={durationLabel} />
        {expiryDate && <Row label="Expires" value={expiryDate} />}
        {mileageCap && <Row label="Mileage Cap" value={`${mileageCap.toLocaleString()} miles`} />}
        {odometerAtService && <Row label="Odometer at Service" value={`${odometerAtService.toLocaleString()} mi`} />}
      </Section>

      {/* Void Conditions */}
      {voidConditions.length > 0 && (
        <Section title="Void Conditions">
          <ul className="space-y-1">
            {voidConditions.filter(c => c.trim()).map((c, i) => (
              <li key={i} className="text-xs text-zinc-600 flex items-start gap-1.5">
                <AlertTriangle size={10} className="text-amber-500 shrink-0 mt-0.5" />
                {c}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <Section title={`Photos (${photos.length})`}>
          <div className="grid grid-cols-4 gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative">
                <img src={p.preview} alt="" className="w-full aspect-square object-cover rounded-lg" />
                <span className="absolute bottom-0.5 left-0.5 px-1.5 py-0.5 bg-black/60 text-white text-[9px] rounded-md capitalize">
                  {p.type}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Notes */}
      {notes && (
        <Section title="Notes">
          <p className="text-xs text-zinc-600 whitespace-pre-wrap">{notes}</p>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-zinc-100 rounded-xl p-3">
      <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className={`text-zinc-800 font-medium ${mono ? 'font-mono tracking-wider' : ''}`}>{value}</span>
    </div>
  )
}
