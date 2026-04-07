import { useState, useEffect } from 'react'
import { X, Hash, Loader2, Users } from 'lucide-react'
import { createChannel, findOrCreateDM } from '@/lib/chatStore'
import { supabase } from '@/lib/supabase'

interface Props {
  businessId: string
  userId: string
  mode: 'channel' | 'dm'
  onClose: () => void
  onCreated: (channelId: string) => void
}

const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-white border border-zinc-200 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition-all'

export default function CreateChannelModal({ businessId, userId, mode, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [teamMembers, setTeamMembers] = useState<{ id: string; display_name: string; email: string | null }[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, display_name, email')
      .eq('business_id', businessId)
      .eq('approved', true)
      .neq('id', userId)
      .order('display_name')
      .then(({ data }) => setTeamMembers(data || []))
  }, [businessId, userId])

  const handleSubmit = async () => {
    setSaving(true)
    try {
      if (mode === 'dm') {
        if (selectedMembers.length === 1) {
          const dm = await findOrCreateDM(businessId, userId, selectedMembers[0])
          onCreated(dm.id)
        } else if (selectedMembers.length > 1) {
          const names = teamMembers
            .filter(m => selectedMembers.includes(m.id))
            .map(m => m.display_name)
          const channel = await createChannel(businessId, userId, {
            name: names.join(', '),
            type: 'group_dm',
            memberIds: selectedMembers,
          })
          onCreated(channel.id)
        }
      } else {
        if (!name.trim()) return
        const channel = await createChannel(businessId, userId, {
          name: name.trim().toLowerCase().replace(/\s+/g, '-'),
          description: description.trim() || undefined,
          type: 'channel',
          memberIds: selectedMembers,
        })
        onCreated(channel.id)
      }
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal card */}
      <div className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200/60">
          <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            {mode === 'channel'
              ? <><Hash size={16} className="text-red-600" /> New Channel</>
              : <><Users size={16} className="text-red-600" /> New Message</>
            }
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 transition-colors">
            <X size={16} className="text-zinc-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {mode === 'channel' && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Channel Name</label>
                <div className="relative">
                  <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="general"
                    className={`${inputClass} pl-8`}
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Description (optional)</label>
                <input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="What's this channel about?"
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* Team members */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
              {mode === 'dm' ? 'Send message to' : 'Add members (optional)'}
            </label>
            <div className="max-h-52 overflow-y-auto space-y-1 border border-zinc-200 rounded-xl p-2 bg-zinc-50/50">
              {teamMembers.map(m => (
                <button
                  key={m.id}
                  onClick={() => toggleMember(m.id)}
                  className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                    selectedMembers.includes(m.id)
                      ? 'bg-red-50 text-red-700 border border-red-200/60'
                      : 'hover:bg-white text-zinc-700 border border-transparent'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {m.display_name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{m.display_name}</span>
                    {m.email && <p className="text-[10px] text-zinc-400 truncate">{m.email}</p>}
                  </div>
                  {selectedMembers.includes(m.id) && (
                    <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  )}
                </button>
              ))}
              {teamMembers.length === 0 && (
                <p className="text-xs text-zinc-400 text-center py-6">No team members found</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-zinc-200/60">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || (mode === 'channel' && !name.trim()) || (mode === 'dm' && selectedMembers.length === 0)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm shadow-red-700/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : mode === 'channel' ? 'Create Channel' : 'Start Conversation'}
          </button>
        </div>
      </div>
    </div>
  )
}
