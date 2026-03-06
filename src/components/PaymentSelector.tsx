import { Banknote, Wallet, Smartphone, CreditCard } from 'lucide-react'
import { PaymentMethod } from '@/lib/types'

interface Props {
  value: PaymentMethod | null
  onChange: (method: PaymentMethod) => void
}

const METHODS: { value: PaymentMethod; label: string; icon: React.ComponentType<any>; gradient: string }[] = [
  { value: 'cash', label: 'Cash', icon: Banknote, gradient: 'from-emerald-400 to-green-500' },
  { value: 'zelle', label: 'Zelle', icon: Wallet, gradient: 'from-violet-500 to-purple-600' },
  { value: 'venmo', label: 'Venmo', icon: Smartphone, gradient: 'from-blue-400 to-blue-600' },
  { value: 'ath_movil', label: 'ATH Movil', icon: Smartphone, gradient: 'from-amber-400 to-orange-500' },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard, gradient: 'from-zinc-400 to-zinc-500' },
]

export default function PaymentSelector({ value, onChange }: Props) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold text-zinc-800 mb-3">Payment Method</h3>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {METHODS.map(m => {
          const Icon = m.icon
          const isSelected = value === m.value
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => onChange(m.value)}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${
                isSelected
                  ? 'border-transparent shadow-sm'
                  : 'border-zinc-100 hover:border-zinc-200 bg-white'
              }`}
              style={isSelected ? {} : {}}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isSelected
                  ? `bg-gradient-to-br ${m.gradient} shadow-sm`
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
