import { useState } from 'react'
import { Message } from '@/lib/types'
import { addReaction, removeReaction, editMessage, deleteMessage } from '@/lib/chatStore'
import { Smile, Pencil, Trash2, Reply, Check, X, Paperclip } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '👀', '✅']

interface Props {
  message: Message
  currentUserId: string
  isAdmin: boolean
  onReply?: (msg: Message) => void
}

export default function MessageBubble({ message, currentUserId, isAdmin, onReply }: Props) {
  const [showActions, setShowActions] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)

  const isMine = message.sender_id === currentUserId
  const sender = message.sender

  // Group reactions by emoji
  const reactionGroups = (message.reactions || []).reduce<Record<string, { count: number; userIds: string[] }>>((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, userIds: [] }
    acc[r.emoji].count++
    acc[r.emoji].userIds.push(r.user_id)
    return acc
  }, {})

  const handleReaction = async (emoji: string) => {
    const existing = reactionGroups[emoji]
    if (existing?.userIds.includes(currentUserId)) {
      await removeReaction(message.id, currentUserId, emoji)
    } else {
      await addReaction(message.id, currentUserId, emoji)
    }
    setShowEmojis(false)
  }

  const handleEdit = async () => {
    if (!editContent.trim()) return
    await editMessage(message.id, editContent.trim())
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!confirm('Delete this message?')) return
    await deleteMessage(message.id)
  }

  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center py-2">
        <span className="text-[11px] text-zinc-400 italic">{message.content}</span>
      </div>
    )
  }

  return (
    <div
      className="group flex gap-3 px-4 py-1.5 hover:bg-zinc-50/50 transition-colors relative"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojis(false) }}
    >
      {/* Avatar */}
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
        {sender?.display_name?.[0]?.toUpperCase() || '?'}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-zinc-900">{sender?.display_name || 'Unknown'}</span>
          <span className="text-[10px] text-zinc-400">{formatDateTime(message.created_at)}</span>
          {message.edited_at && <span className="text-[10px] text-zinc-400">(edited)</span>}
        </div>

        {editing ? (
          <div className="mt-1 flex gap-2">
            <input
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleEdit(); if (e.key === 'Escape') setEditing(false) }}
              className="flex-1 text-sm px-2 py-1 border border-zinc-200 rounded-lg focus:outline-none focus:border-red-300"
              autoFocus
            />
            <button onClick={handleEdit} className="text-emerald-600 hover:text-emerald-700"><Check size={14} /></button>
            <button onClick={() => setEditing(false)} className="text-zinc-400 hover:text-zinc-600"><X size={14} /></button>
          </div>
        ) : (
          <p className="text-sm text-zinc-700 whitespace-pre-wrap break-words">{message.content}</p>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.attachments.map(att => (
              <div key={att.id}>
                {att.file_type?.startsWith('image/') ? (
                  <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                    <img src={att.file_url} alt={att.file_name} className="max-w-xs max-h-48 rounded-lg border border-zinc-200" />
                  </a>
                ) : (
                  <a
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 rounded-lg text-xs text-zinc-600 hover:bg-zinc-200"
                  >
                    <Paperclip size={12} />
                    {att.file_name}
                    {att.file_size && <span className="text-zinc-400">({(att.file_size / 1024).toFixed(0)}KB)</span>}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reactions */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Object.entries(reactionGroups).map(([emoji, { count, userIds }]) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                  userIds.includes(currentUserId)
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {emoji} {count}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover actions */}
      {showActions && !editing && (
        <div className="absolute top-0 right-3 -translate-y-1/2 flex items-center gap-0.5 bg-white border border-zinc-200 rounded-xl shadow-sm px-1.5 py-1 z-10">
          <button onClick={() => setShowEmojis(!showEmojis)} className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors" title="React">
            <Smile size={14} className="text-zinc-400" />
          </button>
          {onReply && (
            <button onClick={() => onReply(message)} className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors" title="Reply">
              <Reply size={14} className="text-zinc-400" />
            </button>
          )}
          {isMine && (
            <button onClick={() => { setEditing(true); setEditContent(message.content) }} className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors" title="Edit">
              <Pencil size={14} className="text-zinc-400" />
            </button>
          )}
          {(isMine || isAdmin) && (
            <button onClick={handleDelete} className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors" title="Delete">
              <Trash2 size={14} className="text-red-400" />
            </button>
          )}
        </div>
      )}

      {/* Emoji picker popover */}
      {showEmojis && (
        <div className="absolute top-6 right-3 bg-white border border-zinc-200 rounded-2xl shadow-lg p-2 flex gap-1 z-20">
          {QUICK_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-zinc-100 text-lg transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
