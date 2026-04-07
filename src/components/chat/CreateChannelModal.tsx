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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative glass rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
            {mode === 'channel' ? <><Hash size={15} className="text-red-600" /> New Channel</> : <><Users size={15} className="text-red-600" /> New Message</>}
          </h3>
          <button onClick={onClose}><X size={16} className="text-zinc-400" /></button>
        </div>

        {mode === 'channel' && (
          <>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">Channel Name</label>
              <div className="flex items-center gap-1">
                <Hash size={14} className="text-zinc-400" />
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="general"
                  className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10"
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">Description (optional)</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What's this channel about?"
                className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10"
              />
            </div>
          </>
        )}

        {/* Team members */}
        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">
            {mode === 'dm' ? 'Send message to' : 'Add members (optional)'}
          </label>
          <div className="max-h-48 overflow-y-auto space-y-1 border border-zinc-200 rounded-xl p-2">
            {teamMembers.map(m => (
              <button
                key={m.id}
                onClick={() => toggleMember(m.id)}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
                  selectedMembers.includes(m.id)
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'hover:bg-zinc-50 text-zinc-700 border border-transparent'
                }`}
              >
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-red-500 to-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {m.display_name[0]?.toUpperCase()}
                </div>
                <span>{m.display_name}</span>
                {m.email && <span className="text-[10px] text-zinc-400 ml-auto">{m.email}</span>}
              </button>
            ))}
            {teamMembers.length === 0 && (
              <p className="text-xs text-zinc-400 text-center py-4">No team members found</p>
            )}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || (mode === 'channel' && !name.trim()) || (mode === 'dm' && selectedMembers.length === 0)}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {saving ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : mode === 'channel' ? 'Create Channel' : 'Start Conversation'}
        </button>
      </div>
    </div>
  )
}
