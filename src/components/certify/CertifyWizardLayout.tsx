import { Check } from 'lucide-react'

const STEPS = ['Vehicle', 'Service Details', 'Warranty Terms', 'Photos', 'Review']

interface Props {
  currentStep: number
  onStepClick: (step: number) => void
  children: React.ReactNode
  canAdvance: boolean
  onNext: () => void
  onBack: () => void
  onSubmit: () => void
  submitting?: boolean
}

export default function CertifyWizardLayout({
  currentStep, onStepClick, children,
  canAdvance, onNext, onBack, onSubmit, submitting
}: Props) {
  const isLast = currentStep === STEPS.length - 1

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-2">
        {STEPS.map((label, i) => {
          const done = i < currentStep
          const active = i === currentStep
          return (
            <button
              key={label}
              onClick={() => i < currentStep && onStepClick(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                done
                  ? 'bg-emerald-100 text-emerald-700 cursor-pointer hover:bg-emerald-200'
                  : active
                  ? 'bg-red-600 text-white'
                  : 'bg-zinc-100 text-zinc-400 cursor-default'
              }`}
              disabled={i > currentStep}
            >
              {done ? <Check size={12} /> : <span className="w-4 text-center">{i + 1}</span>}
              <span className="hidden sm:inline">{label}</span>
            </button>
          )
        })}
      </div>

      {/* Step content */}
      <div className="glass rounded-2xl p-5 md:p-6 mb-4">
        {children}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          disabled={currentStep === 0}
          className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-all disabled:opacity-30 disabled:cursor-default"
        >
          Back
        </button>

        {isLast ? (
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm shadow-red-700/20 hover:shadow-md transition-all disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Certificate'
            )}
          </button>
        ) : (
          <button
            onClick={onNext}
            disabled={!canAdvance}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm shadow-red-700/20 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-default"
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
