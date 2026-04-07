import { useState } from 'react'
import { Channel, Message } from '@/lib/types'
import { Hash, MessageCircle, Plus, Search, X } from 'lucide-react'

interface ChannelWithMeta extends Channel {
  unread_count: number
  last_message: Message | null
}

interface Props {
  channels: ChannelWithMeta[]
  activeChannelId: string | null
  onSelectChannel: (id: string) => void
  onCreateChannel: () => void
  onCreateDM: () => void
  currentUserId?: string
  onlineUsers?: Set<string>
  compact?: boolean
}

export default function ChannelList({
  channels,
  activeChannelId,
  onSelectChannel,
  onCreateChannel,
  onCreateDM,
  compact,
}: Props) {
  const [search, setSearch] = useState('')

  const namedChannels = channels.filter(c => c.type === 'channel')
  const dms = channels.filter(c => c.type === 'direct' || c.type === 'group_dm')

  const filtered = search.trim()
    ? channels.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : null

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const getDMDisplayName = (channel: Channel) => {
    // For DMs, show the other person's name
    const names = channel.name.split(', ')
    if (names.length === 2) {
      // Find which name isn't the current user — use channel.name as-is for now
      return channel.name
    }
    return channel.name
  }

  const totalUnread = channels.reduce((sum, c) => sum + (c.unread_count || 0), 0)

  const renderChannel = (ch: ChannelWithMeta) => {
    const isActive = ch.id === activeChannelId
    const isDM = ch.type === 'direct' || ch.type === 'group_dm'
    const preview = ch.last_message
      ? ch.last_message.content.length > 40
        ? ch.last_message.content.slice(0, 40) + '...'
        : ch.last_message.content
      : null

    return (
      <button
        key={ch.id}
        onClick={() => onSelectChannel(ch.id)}
        className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 transition-colors ${
          isActive
            ? 'bg-red-50 border border-red-200/60'
            : 'hover:bg-zinc-50 border border-transparent'
        }`}
      >
        {/* Icon */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isActive ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-500'
        }`}>
          {isDM ? <MessageCircle size={14} /> : <Hash size={14} />}
        </div>

        {!compact && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className={`text-sm truncate ${ch.unread_count > 0 ? 'font-bold text-zinc-900' : 'font-medium text-zinc-700'}`}>
                {isDM ? getDMDisplayName(ch) : ch.name}
              </span>
              {ch.last_message && (
                <span className="text-[10px] text-zinc-400 shrink-0 ml-1">{formatTime(ch.last_message.created_at)}</span>
              )}
            </div>
            {preview && (
              <p className={`text-xs truncate ${ch.unread_count > 0 ? 'text-zinc-600 font-medium' : 'text-zinc-400'}`}>
                {ch.last_message?.sender?.display_name && `${ch.last_message.sender.display_name}: `}
                {preview}
              </p>
            )}
          </div>
        )}

        {/* Unread badge */}
        {ch.unread_count > 0 && (
          <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
            {ch.unread_count > 9 ? '9+' : ch.unread_count}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-200/60">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
            <MessageCircle size={15} className="text-red-600" />
            Chat
            {totalUnread > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {totalUnread}
              </span>
            )}
          </h2>
        </div>
        {!compact && (
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search channels..."
              className="w-full pl-8 pr-8 py-1.5 text-xs border border-zinc-200 rounded-lg bg-zinc-50 focus:outline-none focus:border-red-300"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400">
                <X size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {filtered ? (
          <div className="space-y-1">
            {filtered.map(renderChannel)}
            {filtered.length === 0 && <p className="text-xs text-zinc-400 text-center py-4">No channels found</p>}
          </div>
        ) : (
          <>
            {/* Channels section */}
            <div>
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Channels</span>
                <button onClick={onCreateChannel} className="text-zinc-400 hover:text-red-600 transition-colors" title="New Channel">
                  <Plus size={14} />
                </button>
              </div>
              <div className="space-y-0.5">
                {namedChannels.map(renderChannel)}
                {namedChannels.length === 0 && (
                  <p className="text-[11px] text-zinc-400 px-3 py-2">No channels yet</p>
                )}
              </div>
            </div>

            {/* DMs section */}
            <div>
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Direct Messages</span>
                <button onClick={onCreateDM} className="text-zinc-400 hover:text-red-600 transition-colors" title="New DM">
                  <Plus size={14} />
                </button>
              </div>
              <div className="space-y-0.5">
                {dms.map(renderChannel)}
                {dms.length === 0 && (
                  <p className="text-[11px] text-zinc-400 px-3 py-2">No conversations yet</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
