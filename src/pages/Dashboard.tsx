import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useAuth, useIntakes, useCustomers, useTasks, useFeed,
  createTask, updateTask, createFeedPost, uploadFeedMedia, toggleFeedLike, addFeedComment, deleteFeedPost,
} from '@/lib/store'
import { Task, FeedPost } from '@/lib/types'
import {
  Search, Plus, ClipboardList, Users, Loader2, X,
  CheckSquare, Square, Heart, MessageCircle, Send, Trash2,
  ChevronRight, Car, ImagePlus, MoreHorizontal, Bookmark,
} from 'lucide-react'

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

// ── Search ──────────────────────────────────────

interface SearchResult {
  type: 'customer' | 'vehicle'
  title: string
  subtitle: string
  route: string
}

// ── Quick Tasks Modal ───────────────────────────

function QuickTasksPanel({
  tasks, profileId, businessId, onRefresh, onClose,
}: {
  tasks: Task[]
  profileId: string
  businessId: string
  onRefresh: () => void
  onClose: () => void
}) {
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const pending = tasks.filter(t => t.status !== 'completed')
  const completed = tasks.filter(t => t.status === 'completed').slice(0, 5)

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    setAdding(true)
    try {
      await createTask({ business_id: businessId, created_by: profileId, title: newTitle.trim() })
      setNewTitle('')
      onRefresh()
    } catch { /* ignore */ }
    setAdding(false)
  }

  const handleToggle = async (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    await updateTask(task.id, {
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    })
    onRefresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-zinc-100">
          <h3 className="text-base font-bold text-zinc-900">Quick Tasks</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
            <X size={16} className="text-zinc-500" />
          </button>
        </div>

        {/* Add Task */}
        <div className="p-4 border-b border-zinc-100">
          <div className="flex gap-2">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Add a task..."
              className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newTitle.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {pending.length === 0 && completed.length === 0 && (
            <p className="text-sm text-zinc-400 text-center py-6">No tasks yet</p>
          )}
          {pending.map(task => (
            <button
              key={task.id}
              onClick={() => handleToggle(task)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 transition-colors text-left"
            >
              <Square size={16} className="text-zinc-300 shrink-0" />
              <span className="text-sm text-zinc-800 flex-1">{task.title}</span>
              {task.priority === 'urgent' && (
                <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">URGENT</span>
              )}
              {task.priority === 'high' && (
                <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">HIGH</span>
              )}
            </button>
          ))}
          {completed.length > 0 && (
            <>
              <p className="text-[10px] text-zinc-300 uppercase tracking-wider font-semibold pt-3 pb-1">Completed</p>
              {completed.map(task => (
                <button
                  key={task.id}
                  onClick={() => handleToggle(task)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 transition-colors text-left"
                >
                  <CheckSquare size={16} className="text-emerald-500 shrink-0" />
                  <span className="text-sm text-zinc-400 line-through flex-1">{task.title}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Feed Post Card (IG Style) ───────────────────

function FeedPostCard({
  post, userId, onRefresh,
}: {
  post: FeedPost
  userId: string
  onRefresh: () => void
}) {
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const isLiked = post.feed_likes?.some(l => l.user_id === userId) ?? false
  const isAuthor = post.author_id === userId

  const handleLike = async () => {
    await toggleFeedLike(post.id, userId)
    onRefresh()
  }

  const handleDoubleTapLike = async () => {
    if (!isLiked) {
      await toggleFeedLike(post.id, userId)
      onRefresh()
    }
  }

  const handleComment = async () => {
    if (!commentText.trim()) return
    setSubmitting(true)
    await addFeedComment({ post_id: post.id, author_id: userId, content: commentText.trim() })
    setCommentText('')
    setSubmitting(false)
    onRefresh()
  }

  const handleDelete = async () => {
    setShowMenu(false)
    if (!confirm('Delete this post?')) return
    await deleteFeedPost(post.id)
    onRefresh()
  }

  const isVideo = post.media_type === 'video' || post.image_url?.match(/\.(mp4|mov|webm)$/i)

  return (
    <div className="bg-white border-b border-zinc-200">
      {/* Header — IG style */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-full ring-2 ring-red-500 ring-offset-1 overflow-hidden">
          {post.author?.avatar_url ? (
            <img src={post.author.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-700 to-red-600 flex items-center justify-center text-white text-[10px] font-bold">
              {getInitials(post.author?.display_name || '?')}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-zinc-900">{post.author?.display_name || 'Unknown'}</p>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-1">
            <MoreHorizontal size={18} className="text-zinc-600" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-20 overflow-hidden">
              {isAuthor && (
                <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-50 w-full">
                  <Trash2 size={13} /> Delete
                </button>
              )}
              <button onClick={() => setShowMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 w-full">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Media — full width like IG */}
      {post.image_url && (
        <div className="w-full aspect-square bg-zinc-100 relative" onDoubleClick={handleDoubleTapLike}>
          {isVideo ? (
            <video
              src={post.image_url}
              className="w-full h-full object-cover"
              controls
              playsInline
              muted
            />
          ) : (
            <img src={post.image_url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
      )}

      {/* Action Row — IG style */}
      <div className="flex items-center px-4 pt-3 pb-1">
        <div className="flex items-center gap-4 flex-1">
          <button onClick={handleLike} className="transition-transform active:scale-125">
            <Heart
              size={24}
              className={isLiked ? 'text-red-500 fill-red-500' : 'text-zinc-800'}
              fill={isLiked ? 'currentColor' : 'none'}
            />
          </button>
          <button onClick={() => setShowComments(!showComments)}>
            <MessageCircle size={24} className="text-zinc-800" />
          </button>
          <button><Send size={22} className="text-zinc-800 -rotate-12" /></button>
        </div>
        <button><Bookmark size={24} className="text-zinc-800" /></button>
      </div>

      {/* Likes Count */}
      {post.likes_count > 0 && (
        <p className="px-4 pt-1 text-[13px] font-bold text-zinc-900">
          {post.likes_count} like{post.likes_count !== 1 ? 's' : ''}
        </p>
      )}

      {/* Caption */}
      <div className="px-4 pt-1 pb-1">
        <p className="text-[13px] text-zinc-900 leading-snug">
          <span className="font-bold">{post.author?.display_name}</span>
          {' '}
          <span className="text-zinc-700">{post.content}</span>
        </p>
      </div>

      {/* View Comments Link */}
      {post.comments_count > 0 && !showComments && (
        <button
          onClick={() => setShowComments(true)}
          className="px-4 py-1 text-[13px] text-zinc-400"
        >
          View {post.comments_count === 1 ? '1 comment' : `all ${post.comments_count} comments`}
        </button>
      )}

      {/* Timestamp */}
      <p className="px-4 pt-0.5 pb-3 text-[10px] text-zinc-400 uppercase tracking-wider">
        {timeAgo(post.created_at)}
      </p>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-zinc-100">
          {post.feed_comments && post.feed_comments.length > 0 && (
            <div className="px-4 pt-3 space-y-3">
              {post.feed_comments.map(c => (
                <div key={c.id} className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-0.5">
                    {c.author?.avatar_url ? (
                      <img src={c.author.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-zinc-200 flex items-center justify-center text-zinc-500 text-[9px] font-bold">
                        {getInitials(c.author?.display_name || '?')}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] leading-snug">
                      <span className="font-bold text-zinc-900">{c.author?.display_name}</span>
                      {' '}
                      <span className="text-zinc-700">{c.content}</span>
                    </p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{timeAgo(c.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Comment — IG style */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-zinc-100">
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleComment()}
              placeholder="Add a comment..."
              className="flex-1 text-[13px] text-zinc-700 bg-transparent focus:outline-none placeholder:text-zinc-400"
            />
            {commentText.trim() && (
              <button
                onClick={handleComment}
                disabled={submitting}
                className="text-[13px] font-bold text-red-600 disabled:opacity-50"
              >
                Post
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Dashboard ──────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const { intakes } = useIntakes()
  const { customers } = useCustomers()
  const { tasks, loading: tasksLoading, refresh: refreshTasks } = useTasks(profile?.business_id ?? undefined)
  const { posts, loading: feedLoading, refresh: refreshFeed } = useFeed(profile?.business_id ?? undefined)

  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [showTasks, setShowTasks] = useState(false)
  const [newPostText, setNewPostText] = useState('')
  const [posting, setPosting] = useState(false)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User'
  const firstName = displayName.split(' ')[0]

  const pendingTaskCount = useMemo(() => tasks.filter(t => t.status !== 'completed').length, [tasks])

  // Smart search
  const searchResults = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    const results: SearchResult[] = []

    for (const c of customers) {
      if (c.name?.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q)) {
        results.push({ type: 'customer', title: c.name, subtitle: c.phone || c.email || '', route: '/customers' })
      }
      if (results.length >= 6) break
    }

    for (const i of intakes.slice(0, 200)) {
      if (i.vin?.toLowerCase().includes(q) || i.make?.toLowerCase().includes(q) || i.model?.toLowerCase().includes(q) || i.license_plate?.toLowerCase().includes(q)) {
        const vehicle = [i.year, i.make, i.model].filter(Boolean).join(' ')
        results.push({ type: 'vehicle', title: vehicle || i.vin || 'Vehicle', subtitle: (i.customer as any)?.name || '', route: '/history' })
      }
      if (results.length >= 8) break
    }

    return results.slice(0, 8)
  }, [query, customers, intakes])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setQuery(''); setSearchFocused(false) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMediaFile(file)
    setMediaPreview(URL.createObjectURL(file))
  }

  const clearMedia = () => {
    setMediaFile(null)
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaPreview(null)
  }

  const handlePost = async () => {
    if ((!newPostText.trim() && !mediaFile) || !profile) return
    setPosting(true)
    try {
      let image_url: string | null = null
      let media_type: 'image' | 'video' | null = null

      if (mediaFile) {
        const result = await uploadFeedMedia(profile.business_id!, mediaFile)
        image_url = result.url
        media_type = result.type
      }

      await createFeedPost({
        business_id: profile.business_id!,
        author_id: profile.id,
        content: newPostText.trim() || '',
        image_url,
        media_type,
      })
      setNewPostText('')
      clearMedia()
      refreshFeed()
    } catch { /* ignore */ }
    setPosting(false)
  }

  if (tasksLoading || feedLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-red-600" />
      </div>
    )
  }

  // Quick action tiles
  const tiles = [
    {
      icon: ClipboardList,
      label: 'Quick Tasks',
      subtitle: pendingTaskCount > 0 ? `${pendingTaskCount} pending` : 'No tasks',
      gradient: 'from-amber-500 to-orange-500',
      action: () => setShowTasks(true),
    },
    {
      icon: Plus,
      label: 'New Intake',
      subtitle: 'Walk-in or new vehicle',
      gradient: 'from-red-700 to-red-600',
      action: () => navigate('/intake'),
    },
    {
      icon: Car,
      label: "Today's Jobs",
      subtitle: 'View job queue',
      gradient: 'from-zinc-700 to-zinc-600',
      action: () => navigate('/queue'),
    },
    {
      icon: Users,
      label: 'Directory',
      subtitle: 'Team members',
      gradient: 'from-blue-600 to-blue-500',
      action: () => navigate('/directory'),
    },
  ]

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
            {profile?.business_id ? 'Detailers Hub' : 'Welcome'}
          </p>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900 tracking-tight">
            {getGreeting()}, {firstName}
          </h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-700 to-red-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            getInitials(displayName)
          )}
        </div>
      </div>

      {/* Smart Search */}
      <div className="relative mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            placeholder="Search name, phone, plate, or VIN..."
            className="w-full pl-11 pr-10 py-3 rounded-2xl border border-zinc-200 bg-white text-sm text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-zinc-100">
              <X size={14} className="text-zinc-400" />
            </button>
          )}
        </div>

        {searchFocused && searchResults.length > 0 && (
          <div className="absolute z-50 top-full mt-1 w-full bg-white border border-zinc-200 rounded-2xl shadow-xl overflow-hidden">
            {searchResults.map((r, i) => (
              <button
                key={i}
                onMouseDown={() => { navigate(r.route); setQuery('') }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${r.type === 'customer' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                  {r.type === 'customer' ? <span className="text-xs font-bold">{getInitials(r.title)}</span> : <Car size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 truncate">{r.title}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{r.subtitle}</p>
                </div>
                <ChevronRight size={14} className="text-zinc-300" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <div className="flex gap-3 justify-between">
          {tiles.map(tile => {
            const Icon = tile.icon
            return (
              <button
                key={tile.label}
                onClick={tile.action}
                className="flex-1 flex flex-col items-center gap-2 py-3 rounded-2xl glass hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tile.gradient} flex items-center justify-center shadow-sm`}>
                  <Icon size={18} className="text-white" />
                </div>
                <p className="text-[11px] font-semibold text-zinc-700 text-center leading-tight">{tile.label}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Pending Tasks Banner */}
      {pendingTaskCount > 0 && (
        <button
          onClick={() => setShowTasks(true)}
          className="w-full glass rounded-2xl p-4 mb-6 flex items-center gap-3 hover:shadow-md transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold">
            {pendingTaskCount}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-zinc-900">Need your attention</p>
            <p className="text-[11px] text-zinc-400">{pendingTaskCount} pending task{pendingTaskCount !== 1 ? 's' : ''}</p>
          </div>
          <ChevronRight size={16} className="text-zinc-400" />
        </button>
      )}

      {/* Feed */}
      <div>
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Feed</h2>

        {/* Compose — IG style */}
        <div className="bg-white border border-zinc-200 rounded-2xl mb-4 overflow-hidden">
          <div className="flex items-start gap-3 p-4">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-red-700 to-red-600 flex items-center justify-center text-white text-[10px] font-bold">
                  {getInitials(displayName)}
                </div>
              )}
            </div>
            <textarea
              value={newPostText}
              onChange={e => setNewPostText(e.target.value)}
              placeholder="What's on your mind?"
              rows={2}
              className="flex-1 text-[13px] text-zinc-700 bg-transparent resize-none focus:outline-none placeholder:text-zinc-400"
            />
          </div>

          {/* Media Preview */}
          {mediaPreview && (
            <div className="relative mx-4 mb-3">
              {mediaFile?.type.startsWith('video/') ? (
                <video src={mediaPreview} className="w-full max-h-64 object-cover rounded-xl" controls />
              ) : (
                <img src={mediaPreview} alt="" className="w-full max-h-64 object-cover rounded-xl" />
              )}
              <button
                onClick={clearMedia}
                className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center"
              >
                <X size={14} className="text-white" />
              </button>
            </div>
          )}

          {/* Compose Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-100">
            <label className="flex items-center gap-2 text-xs text-zinc-500 hover:text-red-600 cursor-pointer transition-colors">
              <ImagePlus size={18} />
              <span className="font-semibold">Photo/Video</span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaSelect}
                className="hidden"
              />
            </label>
            <button
              onClick={handlePost}
              disabled={posting || (!newPostText.trim() && !mediaFile)}
              className="px-5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-30 transition-opacity"
            >
              {posting ? 'Sharing...' : 'Share'}
            </button>
          </div>
        </div>

        {/* Posts — IG style feed */}
        {posts.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center">
            <MessageCircle size={28} className="mx-auto text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-400 font-medium">No posts yet</p>
            <p className="text-[11px] text-zinc-300 mt-1">Be the first to share something with your team</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden border border-zinc-200">
            {posts.map(post => (
              <FeedPostCard key={post.id} post={post} userId={profile?.id || ''} onRefresh={refreshFeed} />
            ))}
          </div>
        )}
      </div>

      {/* Quick Tasks Modal */}
      {showTasks && profile && (
        <QuickTasksPanel
          tasks={tasks}
          profileId={profile.id}
          businessId={profile.business_id!}
          onRefresh={refreshTasks}
          onClose={() => setShowTasks(false)}
        />
      )}
    </div>
  )
}
