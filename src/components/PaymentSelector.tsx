import { Banknote, Wallet, Smartphone, CreditCard, DollarSign, Receipt, QrCode, Landmark, Send, CircleDollarSign } from 'lucide-react'
import { PaymentMethod, IntakeFieldDef, DEFAULT_PAYMENT_FIELDS } from '@/lib/types'

interface Props {
  value: PaymentMethod | null
  onChange: (method: PaymentMethod) => void
  fields?: IntakeFieldDef[]
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Banknote, Wallet, Smartphone, CreditCard, DollarSign, Receipt, QrCode, Landmark, Send, CircleDollarSign,
}

export default function PaymentSelector({ value, onChange, fields }: Props) {
  const methods = (fields || DEFAULT_PAYMENT_FIELDS).filter(f => f.visible)

  return (
    <div>
      <h3 className="text-[13px] font-semibold text-zinc-800 mb-3">Payment Method</h3>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {methods.map(m => {
          const Icon = ICON_MAP[m.icon || 'Banknote'] || Banknote
          const gradient = m.gradient || 'from-zinc-400 to-zinc-500'
          const isSelected = value === m.key
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onChange(m.key)}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${
                isSelected
                  ? 'border-transparent shadow-sm'
                  : 'border-zinc-100 hover:border-zinc-200 bg-white'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isSelected
                  ? `bg-gradient-to-br ${gradient} shadow-sm`
                  : 'bg-zinc-50'
              }`}>
                <Icon size={14} className={isSelected ? 'text-white' : 'text-zinc-400'} />
              </div>
              <span className={`text-[10px] font-semibold leading-tight text-center ${
                isSelected ? 'text-zinc-900' : 'text-zinc-400'
              }`}>
                {m.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
