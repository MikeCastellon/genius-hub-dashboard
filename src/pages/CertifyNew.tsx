import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useCustomers, useBusinesses, createWarrantyCertificate } from '@/lib/store'
import type { BusinessType } from '@/lib/types'
import { BUSINESS_TYPES } from '@/lib/types'
import CertifyWizardLayout from '@/components/certify/CertifyWizardLayout'
import StepVehicle from '@/components/certify/StepVehicle'
import StepServiceDetails from '@/components/certify/StepServiceDetails'
import StepWarrantyTerms from '@/components/certify/StepWarrantyTerms'
import StepPhotos, { type PhotoEntry } from '@/components/certify/StepPhotos'
import StepReview from '@/components/certify/StepReview'
import { ArrowLeft } from 'lucide-react'

interface VehicleData {
  vin: string
  year: number | null
  make: string | null
  model: string | null
  trim: string | null
  color: string | null
}

export default function CertifyNew() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { businesses } = useBusinesses()
  const { customers } = useCustomers()
  const business = businesses.find(b => b.id === profile?.business_id) || null

  // Wizard step
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Vehicle & Customer
  const [vehicle, setVehicle] = useState<VehicleData>({
    vin: '', year: null, make: null, model: null, trim: null, color: null
  })
  const [customerId, setCustomerId] = useState<string | null>(null)

  // Step 2: Service details
  const availableTypes: BusinessType[] = (business?.business_types?.length
    ? business.business_types
    : [...BUSINESS_TYPES]) as BusinessType[]
  const [businessType, setBusinessType] = useState<BusinessType | null>(null)
  const [details, setDetails] = useState<Record<string, any>>({})

  // Step 3: Warranty terms
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0])
  const [durationMonths, setDurationMonths] = useState<number | null>(null)
  const [mileageCap, setMileageCap] = useState<number | null>(null)
  const [odometerAtService, setOdometerAtService] = useState<number | null>(null)
  const [voidConditions, setVoidConditions] = useState<string[]>([])

  // Step 4: Photos
  const [photos, setPhotos] = useState<PhotoEntry[]>([])

  // Step 5: Notes
  const [notes, setNotes] = useState('')

  // Validation per step
  const canAdvance = (() => {
    switch (step) {
      case 0: return vehicle.vin.length >= 5 && !!customerId
      case 1: return !!businessType
      case 2: return !!serviceDate && !!durationMonths
      case 3: return true // photos optional
      case 4: return true // review
      default: return false
    }
  })()

  const selectedCustomer = customers.find(c => c.id === customerId) || null

  const handleSubmit = async () => {
    if (!profile?.business_id || !businessType || !customerId || !durationMonths) return
    setSubmitting(true)
    setError(null)
    try {
      const cert = await createWarrantyCertificate({
        businessId: profile.business_id,
        businessType,
        vehicle,
        customerId,
        serviceDate,
        warrantyDurationMonths: durationMonths,
        warrantyMileageCap: mileageCap,
        odometerAtService,
        technicianId: profile.id,
        technicianName: profile.display_name,
        isPublic: true,
        notes: notes || null,
        voidConditions: voidConditions.filter(c => c.trim()),
        details,
        photos: photos.map(p => ({ file: p.file, type: p.type })),
      })
      navigate(`/certify/${cert.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create certificate')
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => navigate('/certify')}
          className="p-2 rounded-xl hover:bg-zinc-100 transition-colors"
        >
          <ArrowLeft size={18} className="text-zinc-500" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-zinc-900">New Certificate</h2>
          <p className="text-[12px] text-zinc-400">Create a warranty certificate</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <CertifyWizardLayout
        currentStep={step}
        onStepClick={setStep}
        canAdvance={canAdvance}
        onNext={() => setStep(s => s + 1)}
        onBack={() => step === 0 ? navigate('/certify') : setStep(s => s - 1)}
        onSubmit={handleSubmit}
        submitting={submitting}
      >
        {step === 0 && (
          <StepVehicle
            vehicle={vehicle}
            setVehicle={setVehicle}
            customerId={customerId}
            setCustomerId={setCustomerId}
          />
        )}

        {step === 1 && (
          <StepServiceDetails
            availableTypes={availableTypes}
            businessType={businessType}
            setBusinessType={setBusinessType}
            details={details}
            setDetails={setDetails}
          />
        )}

        {step === 2 && businessType && (
          <StepWarrantyTerms
            businessType={businessType}
            serviceDate={serviceDate}
            setServiceDate={setServiceDate}
            durationMonths={durationMonths}
            setDurationMonths={setDurationMonths}
            mileageCap={mileageCap}
            setMileageCap={setMileageCap}
            odometerAtService={odometerAtService}
            setOdometerAtService={setOdometerAtService}
            voidConditions={voidConditions}
            setVoidConditions={setVoidConditions}
          />
        )}

        {step === 3 && (
          <StepPhotos photos={photos} setPhotos={setPhotos} />
        )}

        {step === 4 && (
          <div className="space-y-4">
            <StepReview
              vehicle={vehicle}
              customer={selectedCustomer}
              businessType={businessType}
              details={details}
              serviceDate={serviceDate}
              durationMonths={durationMonths}
              mileageCap={mileageCap}
              odometerAtService={odometerAtService}
              voidConditions={voidConditions}
              photos={photos}
              notes={notes}
            />
            {/* Notes input on review step */}
            <div>
              <label className="block text-[11px] text-zinc-500 mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="Additional notes..."
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all resize-none"
              />
            </div>
          </div>
        )}
      </CertifyWizardLayout>
    </div>
  )
}
