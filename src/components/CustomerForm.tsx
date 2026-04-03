import { useState, useRef, useEffect } from 'react'
import { User } from 'lucide-react'
import { Customer } from '@/lib/types'

interface CustomerData {
  name: string
  phone: string
  email: string
}

interface Props {
  customers: Customer[]
  value: CustomerData
  onChange: (v: CustomerData) => void
  hiddenFields?: Set<string>
}

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10 transition-all'

export default function CustomerForm({ customers, value, onChange, hiddenFields }: Props) {
  const show = (key: string) => !hiddenFields || !hiddenFields.has(key)
  const [suggestions, setSuggestions] = useState<Customer[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handlePhoneChange = (phone: string) => {
    onChange({ ...value, phone })
    if (phone.length >= 3) {
      const filtered = customers.filter(c =>
        c.phone.includes(phone) || c.name.toLowerCase().includes(phone.toLowerCase())
      ).slice(0, 5)
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  const handleNameChange = (name: string) => {
    onChange({ ...value, name })
    if (name.length >= 2) {
      const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(name.toLowerCase())
      ).slice(0, 5)
      setSuggestions(filtered)
      setShowSuggestions(filtered.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  const selectCustomer = (c: Customer) => {
    onChange({
      name: c.name,
      phone: c.phone,
      email: c.email || '',
    })
    setShowSuggestions(false)
  }

  return (
    <div ref={wrapperRef} className="relative">
      <h3 className="text-[13px] font-semibold text-zinc-800 flex items-center gap-2 mb-4">
        <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
          <User size={13} className="text-emerald-500" />
        </div>
        Customer Information
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {show('name') && (
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Name *</label>
            <input
              type="text"
              value={value.name}
              onChange={e => handleNameChange(e.target.value)}
              onFocus={() => value.name.length >= 2 && setShowSuggestions(suggestions.length > 0)}
              placeholder="Full name"
              className={inputClass}
            />
          </div>
        )}
        {show('phone') && (
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Phone *</label>
            <input
              type="tel"
              value={value.phone}
              onChange={e => handlePhoneChange(e.target.value)}
              onFocus={() => value.phone.length >= 3 && setShowSuggestions(suggestions.length > 0)}
              placeholder="(555) 000-0000"
              className={inputClass}
            />
          </div>
        )}
        {show('email') && (
          <div className="sm:col-span-2">
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Email</label>
            <input
              type="email"
              value={value.email}
              onChange={e => onChange({ ...value, email: e.target.value })}
              placeholder="customer@email.com"
              className={inputClass}
            />
          </div>
        )}
      </div>

      {/* Autocomplete suggestions */}
      {showSuggestions && (
        <div className="absolute left-0 right-0 top-full mt-1 glass rounded-xl shadow-xl border border-zinc-100 z-50 overflow-hidden">
          {suggestions.map(c => (
            <button
              key={c.id}
              type="button"
              onMouseDown={() => selectCustomer(c)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-50/60 transition-colors border-b border-zinc-50 last:border-0"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-100 to-sky-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-red-700">{c.name[0].toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-800 truncate">{c.name}</p>
                <p className="text-[10px] text-zinc-400 truncate">{c.phone}{c.email ? ` · ${c.email}` : ''}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
