import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './supabase'
import type { Channel, ChannelMember, Message } from './types'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ── Channels ──────────────────────────────────────────────

export function useChannels(businessId: string | undefined) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!businessId) return
    const { data } = await supabase
      .from('channels')
      .select('*')
      .eq('business_id', businessId)
      .order('type')
      .order('name')
    setChannels(data || [])
    setLoading(false)
  }, [businessId])

  useEffect(() => { refresh() }, [refresh])

  return { channels, loading, refresh, setChannels }
}

export async function createChannel(
  businessId: string,
  userId: string,
  data: { name: string; description?: string; type: Channel['type']; memberIds?: string[] }
) {
  const { data: channel, error } = await supabase
    .from('channels')
    .insert({
      business_id: businessId,
      name: data.name,
      description: data.description || null,
      type: data.type,
      created_by: userId,
    })
    .select()
    .single()
  if (error) throw error

  // Add creator as owner
  const members: { channel_id: string; user_id: string; role: string }[] = [
    { channel_id: channel.id, user_id: userId, role: 'owner' },
  ]
  // Add other members
  if (data.memberIds) {
    for (const mid of data.memberIds) {
      if (mid !== userId) {
        members.push({ channel_id: channel.id, user_id: mid, role: 'member' })
      }
    }
  }
  await supabase.from('channel_members').insert(members)
  return channel as Channel
}

export async function updateChannel(channelId: string, updates: { name?: string; description?: string }) {
  const { error } = await supabase
    .from('channels')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', channelId)
  if (error) throw error
}

export async function deleteChannel(channelId: string) {
  const { error } = await supabase.from('channels').delete().eq('id', channelId)
  if (error) throw error
}

// ── Channel Members ────────────────────────────────────────

export function useChannelMembers(channelId: string | undefined) {
  const [members, setMembers] = useState<ChannelMember[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!channelId) return
    const { data } = await supabase
      .from('channel_members')
      .select('*, profile:profiles(id, display_name, email)')
      .eq('channel_id', channelId)
    setMembers(data || [])
    setLoading(false)
  }, [channelId])

  useEffect(() => { refresh() }, [refresh])
  return { members, loading, refresh }
}

export async function addChannelMember(channelId: string, userId: string) {
  const { error } = await supabase
    .from('channel_members')
    .insert({ channel_id: channelId, user_id: userId })
  if (error) throw error
}

export async function removeChannelMember(channelId: string, userId: string) {
  const { error } = await supabase
    .from('channel_members')
    .delete()
    .eq('channel_id', channelId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function markChannelRead(channelId: string, userId: string) {
  const { error } = await supabase
    .from('channel_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('channel_id', channelId)
    .eq('user_id', userId)
  if (error) throw error
}

// ── My Channels (channels user is a member of) ────────────

export function useMyChannels(userId: string | undefined, businessId: string | undefined) {
  const [channels, setChannels] = useState<(Channel & { unread_count: number; last_message: Message | null })[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!userId || !businessId) return

    // Get channels I'm a member of, with my last_read_at
    const { data: memberships } = await supabase
      .from('channel_members')
      .select('channel_id, last_read_at')
      .eq('user_id', userId)

    if (!memberships || memberships.length === 0) {
      setChannels([])
      setLoading(false)
      return
    }

    const channelIds = memberships.map(m => m.channel_id)
    const readMap = Object.fromEntries(memberships.map(m => [m.channel_id, m.last_read_at]))

    // Get channel details
    const { data: channelData } = await supabase
      .from('channels')
      .select('*')
      .in('id', channelIds)
      .eq('business_id', businessId)
      .order('updated_at', { ascending: false })

    if (!channelData) {
      setChannels([])
      setLoading(false)
      return
    }

    // Get last message per channel + unread counts
    const result = await Promise.all(channelData.map(async (ch) => {
      const lastReadAt = readMap[ch.id]

      const [{ data: lastMsg }, { count }] = await Promise.all([
        supabase
          .from('messages')
          .select('*, sender:profiles(id, display_name, email)')
          .eq('channel_id', ch.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single(),
        supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('channel_id', ch.id)
          .is('deleted_at', null)
          .gt('created_at', lastReadAt),
      ])

      return {
        ...ch,
        last_message: lastMsg || null,
        unread_count: count || 0,
      }
    }))

    // Sort: channels with latest messages first
    result.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.created_at
      const bTime = b.last_message?.created_at || b.created_at
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })

    setChannels(result)
    setLoading(false)
  }, [userId, businessId])

  useEffect(() => { refresh() }, [refresh])
  return { channels, loading, refresh, setChannels }
}

// ── Messages ──────────────────────────────────────────────

export function useMessages(channelId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const subscriptionRef = useRef<RealtimeChannel | null>(null)

  const loadMessages = useCallback(async () => {
    if (!channelId) return
    setLoading(true)
    const { data } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles(id, display_name, email),
        reactions:message_reactions(*),
        attachments:message_attachments(*)
      `)
      .eq('channel_id', channelId)
      .is('deleted_at', null)
      .is('parent_id', null)
      .order('created_at', { ascending: true })
      .limit(100)
    setMessages(data || [])
    setLoading(false)
  }, [channelId])

  // Realtime subscription
  useEffect(() => {
    if (!channelId) return

    loadMessages()

    // Subscribe to new messages in this channel
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          // Fetch full message with joins
          const { data: msg } = await supabase
            .from('messages')
            .select('*, sender:profiles(id, display_name, email), reactions:message_reactions(*), attachments:message_attachments(*)')
            .eq('id', payload.new.id)
            .single()
          if (msg && !msg.parent_id) {
            setMessages(prev => {
              // Deduplicate — might already be added optimistically
              if (prev.some(m => m.id === msg.id)) return prev
              return [...prev, msg]
            })
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          if (payload.new.deleted_at) {
            setMessages(prev => prev.filter(m => m.id !== payload.new.id))
          } else {
            const { data: msg } = await supabase
              .from('messages')
              .select('*, sender:profiles(id, display_name, email), reactions:message_reactions(*), attachments:message_attachments(*)')
              .eq('id', payload.new.id)
              .single()
            if (msg) {
              setMessages(prev => prev.map(m => m.id === msg.id ? msg : m))
            }
          }
        }
      )
      .subscribe()

    subscriptionRef.current = channel

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
      }
    }
  }, [channelId, loadMessages])

  return { messages, loading, refresh: loadMessages, setMessages }
}

// Realtime subscription for reactions
export function useReactionSubscription(channelId: string | undefined, refreshMessages: () => void) {
  useEffect(() => {
    if (!channelId) return

    const channel = supabase
      .channel(`reactions:${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        () => { refreshMessages() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [channelId, refreshMessages])
}

export async function sendMessage(
  channelId: string,
  senderId: string,
  content: string,
  opts?: { parentId?: string; messageType?: Message['message_type']; metadata?: Record<string, any> }
) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      channel_id: channelId,
      sender_id: senderId,
      content,
      message_type: opts?.messageType || 'text',
      parent_id: opts?.parentId || null,
      metadata: opts?.metadata || {},
    })
    .select('*, sender:profiles(id, display_name, email)')
    .single()
  if (error) throw error

  // Update channel updated_at
  await supabase.from('channels').update({ updated_at: new Date().toISOString() }).eq('id', channelId)

  return data as Message
}

export async function editMessage(messageId: string, content: string) {
  const { error } = await supabase
    .from('messages')
    .update({ content, edited_at: new Date().toISOString() })
    .eq('id', messageId)
  if (error) throw error
}

export async function deleteMessage(messageId: string) {
  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId)
  if (error) throw error
}

// ── Reactions ─────────────────────────────────────────────

export async function addReaction(messageId: string, userId: string, emoji: string) {
  const { error } = await supabase
    .from('message_reactions')
    .insert({ message_id: messageId, user_id: userId, emoji })
  if (error && !error.message.includes('duplicate')) throw error
}

export async function removeReaction(messageId: string, userId: string, emoji: string) {
  const { error } = await supabase
    .from('message_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
  if (error) throw error
}

// ── Attachments ───────────────────────────────────────────

export async function uploadChatFile(file: File, channelId: string): Promise<{ url: string; name: string; size: number; type: string }> {
  const path = `${channelId}/${Date.now()}-${file.name}`
  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .upload(path, file, { upsert: true })
  if (error) throw error
  const { data: urlData } = supabase.storage.from('chat-attachments').getPublicUrl(data.path)
  return { url: urlData.publicUrl, name: file.name, size: file.size, type: file.type || 'application/octet-stream' }
}

export async function addAttachment(messageId: string, attachment: { file_url: string; file_name: string; file_size: number; file_type: string }) {
  const { error } = await supabase
    .from('message_attachments')
    .insert({ message_id: messageId, ...attachment })
  if (error) throw error
}

// ── Search ────────────────────────────────────────────────

export async function searchMessages(query: string, channelIds: string[]) {
  if (!query.trim() || channelIds.length === 0) return []
  const { data } = await supabase
    .from('messages')
    .select('*, sender:profiles(id, display_name, email), channel:channels(id, name)')
    .in('channel_id', channelIds)
    .is('deleted_at', null)
    .textSearch('search_vector', query.trim().split(/\s+/).join(' & '))
    .order('created_at', { ascending: false })
    .limit(50)
  return data || []
}

// ── Presence & Typing ─────────────────────────────────────

export function usePresence(businessId: string | undefined, userId: string | undefined, displayName: string) {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!businessId || !userId) return

    const channel = supabase.channel(`presence:${businessId}`, {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const ids = new Set(Object.keys(state))
        setOnlineUsers(ids)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, display_name: displayName, online_at: new Date().toISOString() })
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [businessId, userId, displayName])

  return onlineUsers
}

export function useTypingIndicator(channelId: string | undefined, userId: string | undefined, displayName: string) {
  const [typingUsers, setTypingUsers] = useState<{ id: string; name: string }[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const timeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    if (!channelId || !userId) return

    const channel = supabase.channel(`typing:${channelId}`)

    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { user_id, display_name } = payload.payload
        if (user_id === userId) return

        // Add to typing list
        setTypingUsers(prev => {
          if (prev.find(u => u.id === user_id)) return prev
          return [...prev, { id: user_id, name: display_name }]
        })

        // Clear after 3 seconds
        if (timeoutRef.current[user_id]) clearTimeout(timeoutRef.current[user_id])
        timeoutRef.current[user_id] = setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.id !== user_id))
          delete timeoutRef.current[user_id]
        }, 3000)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      Object.values(timeoutRef.current).forEach(clearTimeout)
    }
  }, [channelId, userId])

  const broadcastTyping = useCallback(() => {
    if (!channelRef.current) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: userId, display_name: displayName },
    })
  }, [userId, displayName])

  return { typingUsers, broadcastTyping }
}

// ── DM Helpers ────────────────────────────────────────────

export async function findOrCreateDM(businessId: string, userId: string, otherUserId: string): Promise<Channel> {
  // Check if a DM already exists between these two users
  const { data: myChannels } = await supabase
    .from('channel_members')
    .select('channel_id')
    .eq('user_id', userId)

  if (myChannels && myChannels.length > 0) {
    const myChannelIds = myChannels.map(c => c.channel_id)

    const { data: existing } = await supabase
      .from('channels')
      .select('*, members:channel_members(user_id)')
      .in('id', myChannelIds)
      .eq('type', 'direct')
      .eq('business_id', businessId)

    if (existing) {
      const dm = existing.find(ch =>
        ch.members?.length === 2 &&
        ch.members.some((m: any) => m.user_id === otherUserId)
      )
      if (dm) return dm
    }
  }

  // Create new DM
  // Get other user's name for the channel name
  const { data: otherProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', otherUserId)
    .single()

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single()

  const name = `${myProfile?.display_name || 'User'}, ${otherProfile?.display_name || 'User'}`

  return createChannel(businessId, userId, {
    name,
    type: 'direct',
    memberIds: [otherUserId],
  })
}

// ── Notifications ─────────────────────────────────────────

export function useChatNotifications(
  userId: string | undefined,
  activeChannelId: string | null,
  channelIds: string[]
) {
  useEffect(() => {
    if (!userId || channelIds.length === 0) return

    // Request browser notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // Subscribe to all messages across my channels
    const channel = supabase
      .channel('chat-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const msg = payload.new as any
          // Skip own messages and messages in the currently active channel
          if (msg.sender_id === userId) return
          if (msg.channel_id === activeChannelId) return
          // Only notify for channels I'm a member of
          if (!channelIds.includes(msg.channel_id)) return

          // Fetch sender name
          const { data: sender } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', msg.sender_id)
            .single()

          const senderName = sender?.display_name || 'Someone'
          const preview = msg.content?.length > 60 ? msg.content.slice(0, 60) + '...' : msg.content || 'Sent an attachment'

          // Browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`${senderName}`, {
              body: preview,
              icon: '/favicon.ico',
              tag: `chat-${msg.channel_id}`,
            })
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, activeChannelId, channelIds.join(',')])
}

// ── Total Unread Count (for nav badge) ───────────────────

export function useTotalUnread(userId: string | undefined, businessId: string | undefined) {
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!userId || !businessId) return

    const { data: memberships } = await supabase
      .from('channel_members')
      .select('channel_id, last_read_at')
      .eq('user_id', userId)

    if (!memberships || memberships.length === 0) { setCount(0); return }

    let total = 0
    await Promise.all(memberships.map(async (m) => {
      const { count: c } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', m.channel_id)
        .is('deleted_at', null)
        .gt('created_at', m.last_read_at)
      total += c || 0
    }))
    setCount(total)
  }, [userId, businessId])

  useEffect(() => { refresh() }, [refresh])

  // Re-check every 30 seconds
  useEffect(() => {
    if (!userId || !businessId) return
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [userId, businessId, refresh])

  // Also listen for new messages to update immediately
  useEffect(() => {
    if (!userId || !businessId) return

    const channel = supabase
      .channel('unread-badge')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as any
          if (msg.sender_id !== userId) {
            refresh()
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, businessId, refresh])

  return count
}
