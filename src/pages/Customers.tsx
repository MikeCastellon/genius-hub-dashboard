import { useState, useMemo } from 'react'
import { useCustomers, useCustomerDetail, addCustomerNote, updateCustomerTags, inviteCustomer, useAuth, upsertCustomer } from '@/lib/store'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { Search, Plus, Users, Phone, Mail, Tag, Calendar, Loader2, X, MessageSquare, Send, FileText, Car, Receipt } from 'lucide-react'

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

const TAG_BG_CYCLE = [
  'bg-red-100 text-red-700',
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-teal-100 text-teal-700',
]

function tagBgColor(index: number): string {
  return TAG_BG_CYCLE[index % TAG_BG_CYCLE.length]
}

function timeAgo(date: string): string {
  const now = new Date()
  const d = new Date(date)
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
}

type HistoryTab = 'intakes' | 'bookings' | 'invoices'

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

      {/* Right panel — customer detail */}
      <div className="flex-1 bg-zinc-50/50">
        {selectedCustomerId ? (
          <CustomerDetailPanel customerId={selectedCustomerId} profileId={profile?.id || null} businessId={profile?.business_id || null} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Users size={48} className="text-zinc-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-zinc-500">Select a customer</p>
              <p className="text-[12px] text-zinc-400 mt-1">Choose a customer from the list to see details.</p>
            </div>
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

function CustomerDetailPanel({ customerId, profileId, businessId }: { customerId: string; profileId: string | null; businessId: string | null }) {
  const detail = useCustomerDetail(customerId)
  const { customer, notes, intakes, appointments, invoices, loading, refresh } = detail

  const [noteText, setNoteText] = useState('')
  const [sendingNote, setSendingNote] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [showTagInput, setShowTagInput] = useState(false)
  const [savingTags, setSavingTags] = useState(false)
  const [activeTab, setActiveTab] = useState<HistoryTab>('intakes')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-zinc-400" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-zinc-400">Customer not found.</p>
      </div>
    )
  }

  const handleAddNote = async () => {
    if (!noteText.trim() || !profileId) return
    setSendingNote(true)
    try {
      await addCustomerNote(customerId, profileId, noteText.trim())
      setNoteText('')
      refresh()
    } catch (err) {
      console.error('Failed to add note:', err)
    } finally {
      setSendingNote(false)
    }
  }

  const handleAddTag = async () => {
    const tag = newTag.trim().toLowerCase()
    if (!tag || customer.tags.includes(tag)) { setNewTag(''); setShowTagInput(false); return }
    setSavingTags(true)
    try {
      await updateCustomerTags(customerId, [...customer.tags, tag])
      setNewTag('')
      setShowTagInput(false)
      refresh()
    } catch (err) {
      console.error('Failed to add tag:', err)
    } finally {
      setSavingTags(false)
    }
  }

  const handleRemoveTag = async (tag: string) => {
    setSavingTags(true)
    try {
      await updateCustomerTags(customerId, customer.tags.filter(t => t !== tag))
      refresh()
    } catch (err) {
      console.error('Failed to remove tag:', err)
    } finally {
      setSavingTags(false)
    }
  }

  const handleInvite = async () => {
    if (!customer.email || !businessId) return
    setInviting(true)
    setInviteMsg(null)
    try {
      const result = await inviteCustomer(customer.email, businessId, customer.id)
      if (result.alreadyExists) {
        setInviteMsg('Account already exists — linked to this customer.')
      } else {
        setInviteMsg('Invite sent!')
      }
      refresh()
    } catch (err: any) {
      setInviteMsg(err.message || 'Failed to send invite.')
    } finally {
      setInviting(false)
    }
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      confirmed: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-zinc-100 text-zinc-500',
      draft: 'bg-zinc-100 text-zinc-600',
      sent: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700',
    }
    return styles[status] || 'bg-zinc-100 text-zinc-600'
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-6">

        {/* Profile Header */}
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0 ${nameToColor(customer.name)}`}>
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-zinc-900">{customer.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-[13px] text-zinc-500">
                <Phone size={12} />
                {customer.phone}
              </span>
              {customer.email && (
                <span className="flex items-center gap-1 text-[13px] text-zinc-400 truncate">
                  <Mail size={12} />
                  {customer.email}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              {customer.profile_id ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700">
                  Account Active
                </span>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-600">
                    No Account
                  </span>
                  {customer.email && businessId && (
                    <button
                      onClick={handleInvite}
                      disabled={inviting}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {inviting ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                      Send Invite
                    </button>
                  )}
                </>
              )}
              {inviteMsg && (
                <span className={`text-[11px] font-medium ${inviteMsg === 'Invite sent!' ? 'text-green-600' : 'text-red-600'}`}>
                  {inviteMsg}
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-zinc-900">{formatCurrency(customer.total_spend)}</p>
            <p className="text-[11px] text-zinc-400">Total Spend</p>
          </div>
        </div>

        {/* Contact Actions Row */}
        <div className="flex gap-3">
          <a
            href={`tel:${customer.phone}`}
            className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-green-50 hover:border-green-200 transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Phone size={14} className="text-green-600" />
            </div>
            <span className="text-[11px] font-semibold text-zinc-600">Call</span>
          </a>
          {customer.email ? (
            <a
              href={`mailto:${customer.email}`}
              className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-blue-50 hover:border-blue-200 transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Mail size={14} className="text-blue-600" />
              </div>
              <span className="text-[11px] font-semibold text-zinc-600">Email</span>
            </a>
          ) : (
            <div className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl bg-white border border-zinc-100 opacity-40 cursor-not-allowed">
              <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
                <Mail size={14} className="text-zinc-400" />
              </div>
              <span className="text-[11px] font-semibold text-zinc-400">Email</span>
            </div>
          )}
          <a
            href={`sms:${customer.phone}`}
            className="flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-purple-50 hover:border-purple-200 transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <MessageSquare size={14} className="text-purple-600" />
            </div>
            <span className="text-[11px] font-semibold text-zinc-600">Text</span>
          </a>
        </div>

        {/* Tags Section */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[13px] font-bold text-zinc-700 flex items-center gap-1.5">
              <Tag size={13} className="text-zinc-400" />
              Tags
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {customer.tags.map((tag, i) => (
              <span key={tag} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold ${tagBgColor(i)}`}>
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  disabled={savingTags}
                  className="ml-0.5 hover:opacity-70 transition-opacity"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            {showTagInput ? (
              <div className="inline-flex items-center gap-1">
                <input
                  type="text"
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddTag(); if (e.key === 'Escape') { setShowTagInput(false); setNewTag('') } }}
                  placeholder="Tag name"
                  autoFocus
                  className="w-20 px-2 py-1 rounded-lg border border-zinc-200 text-[11px] text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300"
                />
                <button
                  onClick={handleAddTag}
                  disabled={savingTags}
                  className="p-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  {savingTags ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowTagInput(true)}
                className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-[11px] font-semibold text-zinc-400 bg-zinc-50 hover:bg-zinc-100 border border-dashed border-zinc-200 transition-colors"
              >
                <Plus size={10} />
                Add
              </button>
            )}
          </div>
        </div>

        {/* Notes / Activity Timeline */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-4">
          <h3 className="text-[13px] font-bold text-zinc-700 flex items-center gap-1.5 mb-3">
            <FileText size={13} className="text-zinc-400" />
            Notes
          </h3>

          {/* Add note input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddNote() }}
              placeholder="Add a note..."
              className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-[13px] text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-all"
            />
            <button
              onClick={handleAddNote}
              disabled={sendingNote || !noteText.trim() || !profileId}
              className="px-3 py-2 rounded-xl text-[12px] font-semibold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:opacity-50 transition-all shadow-sm flex items-center gap-1.5"
            >
              {sendingNote ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            </button>
          </div>

          {/* Timeline */}
          {notes.length === 0 ? (
            <p className="text-[12px] text-zinc-400 text-center py-4">No notes yet.</p>
          ) : (
            <div className="space-y-0 relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-zinc-200" />
              {notes.map(note => (
                <div key={note.id} className="relative pl-6 pb-4">
                  <div className="absolute left-[3px] top-1.5 w-[9px] h-[9px] rounded-full bg-red-400 border-2 border-white" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-zinc-700">
                        {note.author?.display_name || 'Staff'}
                      </span>
                      <span className="text-[11px] text-zinc-400">{timeAgo(note.created_at)}</span>
                    </div>
                    <p className="text-[13px] text-zinc-600 mt-0.5">{note.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History Tabs */}
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <div className="flex border-b border-zinc-100">
            {([
              { key: 'intakes' as HistoryTab, label: 'Intakes', icon: Car },
              { key: 'bookings' as HistoryTab, label: 'Bookings', icon: Calendar },
              { key: 'invoices' as HistoryTab, label: 'Invoices', icon: Receipt },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[12px] font-semibold transition-colors ${
                  activeTab === tab.key
                    ? 'text-red-600 border-b-2 border-red-600 bg-red-50/30'
                    : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <tab.icon size={13} />
                {tab.label}
                <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                  activeTab === tab.key ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-500'
                }`}>
                  {tab.key === 'intakes' ? intakes.length : tab.key === 'bookings' ? appointments.length : invoices.length}
                </span>
              </button>
            ))}
          </div>

          <div className="p-4 max-h-80 overflow-y-auto">
            {/* Intakes Tab */}
            {activeTab === 'intakes' && (
              intakes.length === 0 ? (
                <p className="text-[12px] text-zinc-400 text-center py-6">No intakes yet.</p>
              ) : (
                <div className="space-y-2">
                  {intakes.map(intake => (
                    <div key={intake.id} className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 hover:border-zinc-200 transition-colors">
                      <div>
                        <p className="text-[13px] font-semibold text-zinc-800">
                          {[intake.year, intake.make, intake.model].filter(Boolean).join(' ') || 'Vehicle'}
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {formatDate(intake.created_at)}
                          {intake.intake_services && intake.intake_services.length > 0 && (
                            <> &middot; {intake.intake_services.map(s => s.service?.name || 'Service').join(', ')}</>
                          )}
                        </p>
                      </div>
                      <span className="text-[13px] font-semibold text-zinc-700">{formatCurrency(intake.subtotal)}</span>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Bookings Tab */}
            {activeTab === 'bookings' && (
              appointments.length === 0 ? (
                <p className="text-[12px] text-zinc-400 text-center py-6">No bookings yet.</p>
              ) : (
                <div className="space-y-2">
                  {appointments.map(appt => (
                    <div key={appt.id} className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 hover:border-zinc-200 transition-colors">
                      <div>
                        <p className="text-[13px] font-semibold text-zinc-800">
                          {formatDateTime(appt.scheduled_at)}
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {appt.duration_minutes}min
                          {appt.notes && <> &middot; {appt.notes}</>}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge(appt.status)}`}>
                        {appt.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Invoices Tab */}
            {activeTab === 'invoices' && (
              invoices.length === 0 ? (
                <p className="text-[12px] text-zinc-400 text-center py-6">No invoices yet.</p>
              ) : (
                <div className="space-y-2">
                  {invoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl border border-zinc-100 hover:border-zinc-200 transition-colors">
                      <div>
                        <p className="text-[13px] font-semibold text-zinc-800">
                          {inv.invoice_number || 'Invoice'}
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {formatDate(inv.created_at)}
                          {inv.due_date && <> &middot; Due {formatDate(inv.due_date)}</>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge(inv.status)}`}>
                          {inv.status}
                        </span>
                        <span className="text-[13px] font-semibold text-zinc-700">{formatCurrency(inv.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

      </div>
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
