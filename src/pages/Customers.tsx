import { useState, useMemo } from 'react'
import { useCustomers, useAuth, upsertCustomer } from '@/lib/store'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Search, Plus, Users, Phone, Mail, Tag, Calendar, Loader2, X } from 'lucide-react'

const AVATAR_COLORS = [
  'bg-red-100 text-red-700',
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
]

function nameToColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

const TAG_COLORS: Record<string, string> = {
  vip: 'bg-amber-100 text-amber-700',
  regular: 'bg-blue-100 text-blue-700',
  new: 'bg-green-100 text-green-700',
  fleet: 'bg-purple-100 text-purple-700',
}

function tagColor(tag: string): string {
  return TAG_COLORS[tag.toLowerCase()] || 'bg-zinc-100 text-zinc-600'
}

type SortOption = 'name' | 'last_visit' | 'total_spend'

export default function Customers() {
  const { customers, refresh } = useCustomers()
  const { profile } = useAuth()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    let list = customers
    if (q) {
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email && c.email.toLowerCase().includes(q))
      )
    }
    const sorted = [...list]
    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'last_visit':
        sorted.sort((a, b) => {
          if (!a.last_visit) return 1
          if (!b.last_visit) return -1
          return new Date(b.last_visit).getTime() - new Date(a.last_visit).getTime()
        })
        break
      case 'total_spend':
        sorted.sort((a, b) => b.total_spend - a.total_spend)
        break
    }
    return sorted
  }, [customers, search, sortBy])

  const selectedCustomer = useMemo(
    () => customers.find(c => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  )

  return (
    <div className="flex h-full">
      {/* Left panel — customer list */}
      <div className="w-[380px] shrink-0 border-r border-zinc-200/60 flex flex-col bg-white/40">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <Users size={20} className="text-red-600" />
              <h1 className="text-lg font-bold text-zinc-900">Customers</h1>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 transition-all shadow-sm"
            >
              <Plus size={14} />
              Add Customer
            </button>
          </div>
          <p className="text-[12px] text-zinc-400 font-medium">{customers.length} customer{customers.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, phone, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 bg-white text-[13px] text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
            />
          </div>
        </div>

        {/* Sort */}
        <div className="px-4 pb-3 flex gap-1.5">
          {([
            { key: 'name' as SortOption, label: 'Name' },
            { key: 'last_visit' as SortOption, label: 'Last Visit' },
            { key: 'total_spend' as SortOption, label: 'Spend' },
          ]).map(opt => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                sortBy === opt.key
                  ? 'bg-red-50 text-red-700 border border-red-100'
                  : 'bg-zinc-50 text-zinc-500 border border-transparent hover:bg-zinc-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Customer list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
          {customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users size={40} className="text-zinc-300 mb-3" />
              <p className="text-sm font-semibold text-zinc-500">No customers yet</p>
              <p className="text-[12px] text-zinc-400 mt-1">Customers will appear here after their first intake.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search size={32} className="text-zinc-300 mb-3" />
              <p className="text-sm font-semibold text-zinc-500">No results</p>
              <p className="text-[12px] text-zinc-400 mt-1">Try a different search term.</p>
            </div>
          ) : (
            filtered.map(c => {
              const isSelected = c.id === selectedCustomerId
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all ${
                    isSelected
                      ? 'border-red-200 bg-red-50/30 shadow-sm'
                      : 'border-zinc-100 bg-white hover:border-zinc-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ${nameToColor(c.name)}`}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-semibold text-zinc-900 truncate">{c.name}</p>
                        <span className="text-[11px] font-semibold text-zinc-600 shrink-0">
                          {formatCurrency(c.total_spend)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                          <Phone size={10} />
                          {c.phone}
                        </span>
                        {c.email && (
                          <span className="flex items-center gap-1 text-[11px] text-zinc-400 truncate">
                            <Mail size={10} />
                            {c.email}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-1.5">
                        {c.tags && c.tags.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {c.tags.map(tag => (
                              <span key={tag} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-semibold ${tagColor(tag)}`}>
                                <Tag size={8} />
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : <div />}
                        {c.last_visit && (
                          <span className="flex items-center gap-1 text-[10px] text-zinc-400 shrink-0">
                            <Calendar size={9} />
                            {formatDate(c.last_visit)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Right panel — detail placeholder */}
      <div className="flex-1 flex items-center justify-center bg-zinc-50/50">
        {selectedCustomer ? (
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-3 ${nameToColor(selectedCustomer.name)}`}>
              {selectedCustomer.name.charAt(0).toUpperCase()}
            </div>
            <p className="text-lg font-bold text-zinc-900">{selectedCustomer.name}</p>
            <p className="text-[13px] text-zinc-400 mt-1">Detail panel coming soon</p>
          </div>
        ) : (
          <div className="text-center">
            <Users size={48} className="text-zinc-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-500">Select a customer</p>
            <p className="text-[12px] text-zinc-400 mt-1">Choose a customer from the list to see details.</p>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <AddCustomerModal
          businessId={profile?.business_id || undefined}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); refresh() }}
        />
      )}
    </div>
  )
}

function AddCustomerModal({ businessId, onClose, onSaved }: { businessId?: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      setError('Name and phone are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await upsertCustomer({ name: name.trim(), phone: phone.trim(), email: email.trim() || null }, businessId)
      onSaved()
    } catch (err: any) {
      setError(err.message || 'Failed to save customer.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-zinc-900">Add Customer</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[12px] font-semibold text-zinc-600 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-[13px] text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-zinc-600 mb-1">Phone *</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-[13px] text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-zinc-600 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-[13px] text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
            />
          </div>
        </div>

        {error && <p className="text-[12px] text-red-600 mt-3">{error}</p>}

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-zinc-200 text-[13px] font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-xl text-[13px] font-semibold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Saving...' : 'Save Customer'}
          </button>
        </div>
      </div>
    </div>
  )
}
