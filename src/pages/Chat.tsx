import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/store'
import {
  useMyChannels, useMessages, useChannelMembers, usePresence, useTypingIndicator,
  useReactionSubscription, useChatNotifications, markChannelRead, searchMessages
} from '@/lib/chatStore'
import type { Message } from '@/lib/types'
import MessageBubble from '@/components/chat/MessageBubble'
import Composer from '@/components/chat/Composer'
import ChannelList from '@/components/chat/ChannelList'
import CreateChannelModal from '@/components/chat/CreateChannelModal'
import { Hash, MessageCircle, Search, Users, Loader2, X, ArrowLeft } from 'lucide-react'

export default function Chat() {
  const { profile } = useAuth()
  const businessId = profile?.business_id
  const userId = profile?.id
  const displayName = profile?.display_name || 'User'
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [createMode, setCreateMode] = useState<'channel' | 'dm' | null>(null)
  const [replyTo, setReplyTo] = useState<{ id: string; senderName: string; content: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [showMobileList, setShowMobileList] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { channels, refresh: refreshChannels } = useMyChannels(userId || undefined, businessId || undefined)
  const { messages, loading: messagesLoading, refresh: refreshMessages } = useMessages(activeChannelId || undefined)
  const { members } = useChannelMembers(activeChannelId || undefined)
  const onlineUsers = usePresence(businessId || undefined, userId || undefined, displayName)
  const { typingUsers, broadcastTyping } = useTypingIndicator(activeChannelId || undefined, userId || undefined, displayName)

  useReactionSubscription(activeChannelId || undefined, refreshMessages)

  // Browser notifications for messages in other channels
  const channelIds = channels.map(c => c.id)
  useChatNotifications(userId || undefined, activeChannelId, channelIds)

  const activeChannel = channels.find(c => c.id === activeChannelId)

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Mark channel as read when opening
  useEffect(() => {
    if (activeChannelId && userId) {
      markChannelRead(activeChannelId, userId)
      // Refresh channel list to update unread counts
      const timer = setTimeout(() => refreshChannels(), 500)
      return () => clearTimeout(timer)
    }
  }, [activeChannelId, userId, messages.length])

  const handleSelectChannel = useCallback((id: string) => {
    setActiveChannelId(id)
    setShowMobileList(false)
    setReplyTo(null)
    setSearchResults(null)
    setSearchQuery('')
  }, [])

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) { setSearchResults(null); return }
    setSearching(true)
    const channelIds = channels.map(c => c.id)
    const results = await searchMessages(searchQuery, channelIds)
    setSearchResults(results)
    setSearching(false)
  }, [searchQuery, channels])

  const handleReply = useCallback((msg: Message) => {
    setReplyTo({ id: msg.id, senderName: msg.sender?.display_name || 'Unknown', content: msg.content })
  }, [])

  // Optimistic: add message to local state immediately after send
  const handleMessageSent = useCallback((_msg: Message) => {
    // Refresh to show the sent message immediately
    refreshMessages()
    refreshChannels()
  }, [refreshMessages, refreshChannels])

  const memberProfiles = members.map(m => ({
    id: m.user_id,
    display_name: (m as any).profile?.display_name || 'User',
  }))

  // Date grouping
  const groupedMessages = messages.reduce<{ date: string; msgs: Message[] }[]>((groups, msg) => {
    const dateStr = new Date(msg.created_at).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
    const last = groups[groups.length - 1]
    if (last && last.date === dateStr) {
      last.msgs.push(msg)
    } else {
      groups.push({ date: dateStr, msgs: [msg] })
    }
    return groups
  }, [])

  if (!businessId || !userId) return null

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-4 md:px-6 pt-4 md:pt-6 pb-4 border-b border-zinc-100 bg-white/60 shrink-0">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <MessageCircle size={18} className="text-red-600" />
            Chat
          </h2>
          <p className="text-[12px] md:text-[13px] text-zinc-400 mt-0.5">Team messaging & channels</p>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Channel list */}
        <div className={`w-full md:w-[280px] shrink-0 md:border-r border-zinc-200/60 flex flex-col bg-white/40 ${showMobileList ? 'flex' : 'hidden md:flex'}`}>
          <ChannelList
            channels={channels}
            activeChannelId={activeChannelId}
            onSelectChannel={handleSelectChannel}
            onCreateChannel={() => setCreateMode('channel')}
            onCreateDM={() => setCreateMode('dm')}
            currentUserId={userId}
            onlineUsers={onlineUsers}
          />
        </div>

        {/* Right: Messages */}
        <div className={`flex-1 flex flex-col min-w-0 ${!showMobileList ? 'flex' : 'hidden md:flex'}`}>
          {activeChannel ? (
            <>
              {/* Channel header */}
              <div className="px-4 py-3 border-b border-zinc-200/60 flex items-center justify-between bg-white/60">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowMobileList(true)}
                    className="md:hidden text-zinc-500 hover:text-zinc-800"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    activeChannel.type === 'channel' ? 'bg-red-100 text-red-600' : 'bg-zinc-100 text-zinc-500'
                  }`}>
                    {activeChannel.type === 'channel' ? <Hash size={15} /> : <MessageCircle size={15} />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">
                      {activeChannel.type === 'channel' ? `#${activeChannel.name}` : activeChannel.name}
                    </h3>
                    {activeChannel.description && (
                      <p className="text-[11px] text-zinc-400">{activeChannel.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Search */}
                  <div className="relative">
                    <div className="flex items-center gap-1 border border-zinc-200 rounded-lg px-2 py-1">
                      <Search size={13} className="text-zinc-400" />
                      <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="Search..."
                        className="text-xs bg-transparent focus:outline-none w-20 md:w-28"
                      />
                      {searchQuery && (
                        <button onClick={() => { setSearchQuery(''); setSearchResults(null) }}>
                          <X size={12} className="text-zinc-400" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <Users size={13} />
                    {members.length}
                  </div>
                </div>
              </div>

              {/* Search results */}
              {searchResults !== null ? (
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-zinc-500">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</p>
                    <button onClick={() => setSearchResults(null)} className="text-xs text-red-600 hover:text-red-700">Close search</button>
                  </div>
                  {searchResults.map((msg: any) => (
                    <div key={msg.id} className="mb-3 p-3 bg-zinc-50 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-zinc-700">{msg.sender?.display_name}</span>
                        <span className="text-[10px] text-zinc-400">in #{msg.channel?.name}</span>
                      </div>
                      <p className="text-sm text-zinc-600">{msg.content}</p>
                    </div>
                  ))}
                  {searching && <Loader2 size={16} className="animate-spin text-red-600 mx-auto" />}
                </div>
              ) : (
                <>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto">
                    {messagesLoading ? (
                      <div className="flex justify-center items-center h-full">
                        <Loader2 size={20} className="animate-spin text-red-600" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center px-8">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3">
                          <MessageCircle size={20} className="text-zinc-400" />
                        </div>
                        <p className="text-sm font-semibold text-zinc-700">No messages yet</p>
                        <p className="text-xs text-zinc-400 mt-1">Be the first to send a message!</p>
                      </div>
                    ) : (
                      <div className="py-4">
                        {groupedMessages.map(group => (
                          <div key={group.date}>
                            <div className="flex items-center gap-3 px-4 py-2">
                              <div className="flex-1 h-px bg-zinc-200" />
                              <span className="text-[10px] font-semibold text-zinc-400 uppercase">{group.date}</span>
                              <div className="flex-1 h-px bg-zinc-200" />
                            </div>
                            {group.msgs.map(msg => (
                              <MessageBubble
                                key={msg.id}
                                message={msg}
                                currentUserId={userId}
                                isAdmin={isAdmin}
                                onReply={handleReply}
                              />
                            ))}
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Typing indicator */}
                  {typingUsers.length > 0 && (
                    <div className="px-4 py-1 text-xs text-zinc-400 italic">
                      {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
                    </div>
                  )}

                  {/* Composer */}
                  <Composer
                    channelId={activeChannelId!}
                    senderId={userId}
                    onTyping={broadcastTyping}
                    onMessageSent={handleMessageSent}
                    replyTo={replyTo}
                    onClearReply={() => setReplyTo(null)}
                    members={memberProfiles}
                  />
                </>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mb-4">
                <MessageCircle size={28} className="text-zinc-400" />
              </div>
              <h2 className="text-lg font-bold text-zinc-900 mb-1">Welcome to Chat</h2>
              <p className="text-sm text-zinc-500 max-w-sm">
                Select a channel or start a conversation to begin messaging your team.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {createMode && (
        <CreateChannelModal
          businessId={businessId}
          userId={userId}
          mode={createMode}
          onClose={() => setCreateMode(null)}
          onCreated={(id) => {
            setCreateMode(null)
            refreshChannels()
            handleSelectChannel(id)
          }}
        />
      )}
    </div>
  )
}
