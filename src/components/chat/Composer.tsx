import { useState, useRef, useCallback } from 'react'
import { Send, Paperclip, Smile, X, Loader2 } from 'lucide-react'
import { sendMessage, uploadChatFile, addAttachment } from '@/lib/chatStore'
import type { Message } from '@/lib/types'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '👀', '✅', '🎉', '💯', '👏', '🤔', '😎', '🙏']

interface Props {
  channelId: string
  senderId: string
  onTyping?: () => void
  onMessageSent?: (msg: Message) => void
  replyTo?: { id: string; senderName: string; content: string } | null
  onClearReply?: () => void
  members?: { id: string; display_name: string }[]
}

export default function Composer({ channelId, senderId, onTyping, onMessageSent, replyTo, onClearReply, members }: Props) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIdx, setMentionIdx] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const filteredMembers = mentionQuery !== null && members
    ? members.filter(m => m.display_name.toLowerCase().includes(mentionQuery.toLowerCase()) && m.id !== senderId)
    : []

  const handleSend = useCallback(async () => {
    if (!content.trim() || sending) return
    setSending(true)
    try {
      // Extract mentions
      const mentionRegex = /@(\w+)/g
      const mentions: string[] = []
      let match: RegExpExecArray | null
      while ((match = mentionRegex.exec(content)) !== null) {
        const mentioned = members?.find(m => m.display_name.toLowerCase() === match![1].toLowerCase())
        if (mentioned) mentions.push(mentioned.id)
      }

      const msg = await sendMessage(channelId, senderId, content.trim(), {
        parentId: replyTo?.id,
        metadata: mentions.length > 0 ? { mentions } : {},
      })
      setContent('')
      onClearReply?.()
      onMessageSent?.(msg)
    } catch (err) {
      console.error('Send failed:', err)
    } finally {
      setSending(false)
    }
  }, [content, channelId, senderId, replyTo, members, sending, onClearReply])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => Math.min(i + 1, filteredMembers.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx(i => Math.max(i - 1, 0)); return }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(filteredMembers[mentionIdx])
        return
      }
      if (e.key === 'Escape') { setMentionQuery(null); return }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setContent(val)
    onTyping?.()

    // Check for @ mention
    const cursorPos = e.target.selectionStart
    const textBeforeCursor = val.substring(0, cursorPos)
    const atMatch = textBeforeCursor.match(/@(\w*)$/)
    if (atMatch) {
      setMentionQuery(atMatch[1])
      setMentionIdx(0)
    } else {
      setMentionQuery(null)
    }
  }

  const insertMention = (member: { id: string; display_name: string }) => {
    const textarea = inputRef.current
    if (!textarea) return
    const cursorPos = textarea.selectionStart
    const textBeforeCursor = content.substring(0, cursorPos)
    const atIdx = textBeforeCursor.lastIndexOf('@')
    const before = content.substring(0, atIdx)
    const after = content.substring(cursorPos)
    setContent(`${before}@${member.display_name} ${after}`)
    setMentionQuery(null)
    textarea.focus()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const uploaded = await uploadChatFile(file, channelId)
      const isImage = file.type.startsWith('image/')
      const msg = await sendMessage(channelId, senderId, isImage ? '' : file.name, {
        messageType: isImage ? 'image' : 'file',
      })
      await addAttachment(msg.id, {
        file_url: uploaded.url,
        file_name: uploaded.name,
        file_size: uploaded.size,
        file_type: uploaded.type,
      })
    } catch (err) {
      console.error('Upload failed:', err)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="border-t border-zinc-200 bg-white">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 pt-2 text-xs text-zinc-500">
          <div className="w-0.5 h-4 bg-red-400 rounded-full" />
          <span>Replying to <strong>{replyTo.senderName}</strong></span>
          <span className="truncate max-w-[200px]">{replyTo.content}</span>
          <button onClick={onClearReply} className="ml-auto"><X size={12} /></button>
        </div>
      )}

      {/* Mention autocomplete */}
      {mentionQuery !== null && filteredMembers.length > 0 && (
        <div className="mx-4 mb-1 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden">
          {filteredMembers.slice(0, 5).map((m, i) => (
            <button
              key={m.id}
              onClick={() => insertMention(m)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                i === mentionIdx ? 'bg-red-50 text-red-700' : 'hover:bg-zinc-50 text-zinc-700'
              }`}
            >
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-red-500 to-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                {m.display_name[0]?.toUpperCase()}
              </div>
              {m.display_name}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 p-3">
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="p-2 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-40"
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
        </button>

        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="w-full resize-none px-3 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10 max-h-32"
            style={{ minHeight: '38px' }}
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <Smile size={18} />
          </button>
          {showEmoji && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowEmoji(false)} />
              <div className="absolute bottom-full right-0 mb-2 bg-white border border-zinc-200 rounded-2xl shadow-lg p-2.5 grid grid-cols-4 gap-1.5 z-20 w-44">
                {QUICK_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => { setContent(prev => prev + emoji); setShowEmoji(false); inputRef.current?.focus() }}
                    className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-zinc-100 text-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={!content.trim() || sending}
          className="p-2 rounded-lg bg-gradient-to-r from-red-700 to-red-600 text-white hover:from-red-800 hover:to-red-700 disabled:opacity-40 transition-colors"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
