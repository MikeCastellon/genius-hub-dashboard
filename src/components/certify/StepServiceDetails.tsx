import type { BusinessType } from '@/lib/types'
import { BUSINESS_TYPE_LABELS } from '@/lib/types'
import CeramicCoatingForm from './details/CeramicCoatingForm'
import WindowTintForm from './details/WindowTintForm'
import PpfForm from './details/PpfForm'
import AudioElectronicsForm from './details/AudioElectronicsForm'
import MechanicalForm from './details/MechanicalForm'
import WheelsTiresForm from './details/WheelsTiresForm'
import { Wrench } from 'lucide-react'

interface Props {
  availableTypes: BusinessType[]
  businessType: BusinessType | null
  setBusinessType: (t: BusinessType) => void
  details: Record<string, any>
  setDetails: (d: Record<string, any>) => void
}

const DETAIL_FORMS: Record<BusinessType, React.FC<{ details: Record<string, any>; onChange: (d: Record<string, any>) => void }>> = {
  CERAMIC_COATING: CeramicCoatingForm,
  WINDOW_TINT: WindowTintForm,
  PPF: PpfForm,
  AUDIO_ELECTRONICS: AudioElectronicsForm,
  MECHANICAL: MechanicalForm,
  WHEELS_TIRES: WheelsTiresForm,
}

export default function StepServiceDetails({ availableTypes, businessType, setBusinessType, details, setDetails }: Props) {
  const FormComponent = businessType ? DETAIL_FORMS[businessType] : null

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
        <Wrench size={16} className="text-red-600" /> Service Type
      </h3>

      {/* Business Type Selector */}
      <div className="flex flex-wrap gap-2">
        {availableTypes.map(type => (
          <button
            key={type}
            onClick={() => {
              setBusinessType(type)
              setDetails({})
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
              businessType === type
                ? 'bg-red-600 text-white shadow-sm shadow-red-700/20'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {BUSINESS_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Dynamic Form */}
      {FormComponent && (
        <div className="border-t border-zinc-100 pt-4">
          <FormComponent details={details} onChange={setDetails} />
        </div>
      )}

      {!businessType && (
        <p className="text-sm text-zinc-400 text-center py-6">
          Select a service type above to continue
        </p>
      )}
    </div>
  )
}
