import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useAuth, useIntakes, useCustomers, useTasks, useFeed, useDirectory,
  createTask, updateTask, createFeedPost, uploadFeedMedia, toggleFeedLike, addFeedComment, deleteFeedPost,
} from '@/lib/store'
import { Task, FeedPost, Profile, Customer, VehicleIntake } from '@/lib/types'
import {
  Search, Plus, ClipboardList, Users, Loader2, X,
  CheckSquare, Square, ThumbsUp, MessageCircle, Trash2,
  ChevronRight, Car, ImagePlus, MoreHorizontal,
  ArrowLeft, Image, Video, FileText, Link2, MapPin, Play,
  Calendar, Clock, UserPlus, Flag, Smile, User,
} from 'lucide-react'

// ── Background presets ─────────────────────────────
const BG_COLORS = [
  null, // no background
  'bg-gradient-to-br from-red-500 to-orange-400',
  'bg-gradient-to-br from-blue-500 to-cyan-400',
  'bg-gradient-to-br from-purple-600 to-pink-500',
  'bg-gradient-to-br from-emerald-500 to-teal-400',
  'bg-gradient-to-br from-amber-500 to-yellow-400',
  'bg-gradient-to-br from-zinc-800 to-zinc-600',
  'bg-gradient-to-br from-rose-500 to-red-600',
  'bg-gradient-to-br from-indigo-600 to-blue-500',
]

const BG_COLOR_PREVIEWS = [
  'bg-white shadow-[inset_0_0_0_1.5px_#d4d4d8]',
  'bg-gradient-to-br from-red-500 to-orange-400',
  'bg-gradient-to-br from-blue-500 to-cyan-400',
  'bg-gradient-to-br from-purple-600 to-pink-500',
  'bg-gradient-to-br from-emerald-500 to-teal-400',
  'bg-gradient-to-br from-amber-500 to-yellow-400',
  'bg-gradient-to-br from-zinc-800 to-zinc-600',
  'bg-gradient-to-br from-rose-500 to-red-600',
  'bg-gradient-to-br from-indigo-600 to-blue-500',
]

const BG_IMAGES = [
  'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&q=80',
  'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80',
  'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80',
  'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800&q=80',
  'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&q=80',
  'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800&q=80',
]

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

// ── Create Detailed Task Modal ──────────────────

function CreateTaskModal({
  profileId, businessId, employees, customers, intakes, onSave, onClose,
}: {
  profileId: string
  businessId: string
  employees: Profile[]
  customers: Customer[]
  intakes: VehicleIntake[]
  onSave: () => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [assignedTo, setAssignedTo] = useState<string | null>(null)
  const [priority, setPriority] = useState<Task['priority']>('normal')
  const [linkedCustomerId, setLinkedCustomerId] = useState<string | null>(null)
  const [linkedIntakeId, setLinkedIntakeId] = useState<string | null>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const assignee = employees.find(e => e.id === assignedTo)
  const linkedCustomer = customers.find(c => c.id === linkedCustomerId)
  const linkedIntake = intakes.find(i => i.id === linkedIntakeId)

  const filteredCustomers = customerSearch.trim().length >= 2
    ? customers.filter(c =>
        c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.includes(customerSearch)
      ).slice(0, 5)
    : []

  const filteredVehicles = vehicleSearch.trim().length >= 2
    ? intakes.filter(i =>
        i.vin?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
        i.make?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
        i.model?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
        i.license_plate?.toLowerCase().includes(vehicleSearch.toLowerCase())
      ).slice(0, 5)
    : []

  const handlePublish = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      const due = dueDate
        ? dueTime ? `${dueDate}T${dueTime}` : `${dueDate}T23:59`
        : null
      await createTask({
        business_id: businessId,
        created_by: profileId,
        title: title.trim(),
        description: description.trim() || null,
        assigned_to: assignedTo,
        priority,
        due_date: due,
        linked_customer_id: linkedCustomerId,
        linked_intake_id: linkedIntakeId,
      })
      onSave()
      onClose()
    } catch { /* ignore */ }
    setSaving(false)
  }

  const PRIORITIES: { value: Task['priority']; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: 'text-zinc-400 bg-zinc-50' },
    { value: 'normal', label: 'Normal', color: 'text-blue-600 bg-blue-50' },
    { value: 'high', label: 'High', color: 'text-amber-600 bg-amber-50' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600 bg-red-50' },
  ]

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 shrink-0">
        <button onClick={onClose} className="p-1">
          <ArrowLeft size={22} className="text-zinc-700" />
        </button>
        <h3 className="text-[15px] font-bold text-zinc-900">Create new task</h3>
        <button
          onClick={handlePublish}
          disabled={saving || !title.trim()}
          className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-30 transition-opacity"
        >
          {saving ? 'Saving...' : 'Publish'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
        {/* Title */}
        <div className="px-4 pt-4 pb-2 border-b border-zinc-100">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Task title"
            className="w-full text-base font-semibold text-zinc-900 placeholder:text-zinc-300 focus:outline-none"
            autoFocus
          />
        </div>

        {/* Description */}
        <div className="px-4 pt-3 pb-3 border-b border-zinc-100">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Task description"
            rows={4}
            className="w-full text-sm text-zinc-700 bg-zinc-50 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-red-100 placeholder:text-zinc-400"
          />
        </div>

        {/* Fields */}
        <div className="divide-y divide-zinc-100">
          {/* Due Date */}
          <div className="flex items-center justify-between px-4 py-3.5">
            <div className="flex items-center gap-2.5 text-sm text-zinc-700">
              <Calendar size={16} className="text-zinc-400" />
              <span className="font-medium">Due date</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="text-sm text-blue-600 font-medium bg-transparent focus:outline-none cursor-pointer"
              />
              {dueDate && (
                <button onClick={() => { setDueDate(''); setDueTime('') }} className="p-0.5">
                  <X size={14} className="text-zinc-400" />
                </button>
              )}
            </div>
          </div>

          {/* Due Time (only if date set) */}
          {dueDate && (
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-2.5 text-sm text-zinc-700">
                <Clock size={16} className="text-zinc-400" />
                <span className="font-medium">Due time</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={dueTime}
                  onChange={e => setDueTime(e.target.value)}
                  className="text-sm text-blue-600 font-medium bg-transparent focus:outline-none cursor-pointer"
                />
                {dueTime && (
                  <button onClick={() => setDueTime('')} className="p-0.5">
                    <X size={14} className="text-zinc-400" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Assigned To */}
          <div className="px-4 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-sm text-zinc-700">
                <UserPlus size={16} className="text-zinc-400" />
                <span className="font-medium">Assigned to</span>
              </div>
              {assignee ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-200 bg-zinc-50">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-700 to-red-600 flex items-center justify-center text-white text-[8px] font-bold overflow-hidden">
                      {assignee.avatar_url ? (
                        <img src={assignee.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        getInitials(assignee.display_name)
                      )}
                    </div>
                    <span className="text-xs font-medium text-zinc-700">{assignee.display_name}</span>
                  </div>
                  <button onClick={() => setAssignedTo(null)} className="p-0.5">
                    <X size={14} className="text-zinc-400" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-zinc-400">Unassigned</span>
              )}
            </div>
            {!assignee && employees.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {employees.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => setAssignedTo(emp.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-zinc-200 hover:border-red-300 hover:bg-red-50/50 transition-colors"
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-700 to-red-600 flex items-center justify-center text-white text-[8px] font-bold overflow-hidden">
                      {emp.avatar_url ? (
                        <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        getInitials(emp.display_name)
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-zinc-600">{emp.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority */}
          <div className="px-4 py-3.5">
            <div className="flex items-center gap-2.5 text-sm text-zinc-700 mb-3">
              <Flag size={16} className="text-zinc-400" />
              <span className="font-medium">Priority</span>
            </div>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-bold transition-all ${
                    priority === p.value
                      ? `${p.color} ring-2 ring-offset-1 ring-current`
                      : 'bg-zinc-50 text-zinc-400'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Link to Customer */}
          <div className="px-4 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-sm text-zinc-700">
                <User size={16} className="text-zinc-400" />
                <span className="font-medium">Link customer</span>
              </div>
              {linkedCustomer ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-200 bg-zinc-50">
                    <span className="text-xs font-medium text-zinc-700">{linkedCustomer.name}</span>
                  </div>
                  <button onClick={() => setLinkedCustomerId(null)} className="p-0.5">
                    <X size={14} className="text-zinc-400" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-zinc-400">None</span>
              )}
            </div>
            {!linkedCustomer && (
              <div className="mt-2 no-focus-ring">
                <input
                  value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:border-red-300 placeholder:text-zinc-400"
                />
                {filteredCustomers.length > 0 && (
                  <div className="mt-1 border border-zinc-200 rounded-xl overflow-hidden">
                    {filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        onClick={() => { setLinkedCustomerId(c.id); setCustomerSearch('') }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                      >
                        <User size={13} className="text-zinc-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-zinc-800 truncate">{c.name}</p>
                          <p className="text-[10px] text-zinc-400">{c.phone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Link to Vehicle / Job */}
          <div className="px-4 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-sm text-zinc-700">
                <Car size={16} className="text-zinc-400" />
                <span className="font-medium">Link vehicle / job</span>
              </div>
              {linkedIntake ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-200 bg-zinc-50">
                    <span className="text-xs font-medium text-zinc-700">
                      {[linkedIntake.year, linkedIntake.make, linkedIntake.model].filter(Boolean).join(' ') || linkedIntake.vin || 'Vehicle'}
                    </span>
                  </div>
                  <button onClick={() => setLinkedIntakeId(null)} className="p-0.5">
                    <X size={14} className="text-zinc-400" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-zinc-400">None</span>
              )}
            </div>
            {!linkedIntake && (
              <div className="mt-2 no-focus-ring">
                <input
                  value={vehicleSearch}
                  onChange={e => setVehicleSearch(e.target.value)}
                  placeholder="Search by VIN, make, model, or plate..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:border-red-300 placeholder:text-zinc-400"
                />
                {filteredVehicles.length > 0 && (
                  <div className="mt-1 border border-zinc-200 rounded-xl overflow-hidden">
                    {filteredVehicles.map(i => {
                      const vehicle = [i.year, i.make, i.model].filter(Boolean).join(' ')
                      return (
                        <button
                          key={i.id}
                          onClick={() => { setLinkedIntakeId(i.id); setVehicleSearch('') }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-zinc-50 transition-colors border-b border-zinc-100 last:border-0"
                        >
                          <Car size={13} className="text-zinc-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-zinc-800 truncate">{vehicle || i.vin || 'Unknown'}</p>
                            <p className="text-[10px] text-zinc-400">{i.license_plate ? `Plate: ${i.license_plate}` : i.vin || ''}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Quick Tasks Modal ───────────────────────────

function QuickTasksPanel({
  tasks, profileId, businessId, employees, customers, intakes, onRefresh, onClose,
}: {
  tasks: Task[]
  profileId: string
  businessId: string
  employees: Profile[]
  customers: Customer[]
  intakes: VehicleIntake[]
  onRefresh: () => void
  onClose: () => void
}) {
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const [showDetailedForm, setShowDetailedForm] = useState(false)
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
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-zinc-100">
            <h3 className="text-base font-bold text-zinc-900">Quick Tasks</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
              <X size={16} className="text-zinc-500" />
            </button>
          </div>

          {/* Add Task — quick or detailed */}
          <div className="p-4 border-b border-zinc-100">
            <div className="flex gap-2">
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Add a quick task..."
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
            <button
              onClick={() => setShowDetailedForm(true)}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-zinc-300 text-xs font-semibold text-zinc-500 hover:border-red-300 hover:text-red-600 hover:bg-red-50/50 transition-all"
            >
              <ClipboardList size={13} />
              Create detailed task
            </button>
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
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-zinc-800 block truncate">{task.title}</span>
                  {(task.due_date || task.description || task.linked_customer || task.linked_intake) && (
                    <span className="text-[10px] text-zinc-400 block truncate">
                      {task.due_date && `Due ${new Date(task.due_date).toLocaleDateString()}`}
                      {task.due_date && (task.description || task.linked_customer || task.linked_intake) && ' · '}
                      {task.linked_customer && `👤 ${task.linked_customer.name}`}
                      {task.linked_customer && task.linked_intake && ' · '}
                      {task.linked_intake && `🚗 ${[task.linked_intake.year, task.linked_intake.make, task.linked_intake.model].filter(Boolean).join(' ')}`}
                      {(task.linked_customer || task.linked_intake) && task.description && ' · '}
                      {task.description}
                    </span>
                  )}
                </div>
                {task.priority === 'urgent' && (
                  <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded shrink-0">URGENT</span>
                )}
                {task.priority === 'high' && (
                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded shrink-0">HIGH</span>
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

      {/* Detailed Task Creation Modal */}
      {showDetailedForm && (
        <CreateTaskModal
          profileId={profileId}
          businessId={businessId}
          employees={employees}
          customers={customers}
          intakes={intakes}
          onSave={onRefresh}
          onClose={() => setShowDetailedForm(false)}
        />
      )}
    </>
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
                <span className="w-[13px]" /> Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Background post (no image, text on colored/image bg) */}
      {!post.image_url && post.background && (
        <div
          className={`w-full aspect-[4/3] flex items-center justify-center p-8 relative ${
            post.background.startsWith('http') ? '' : post.background
          }`}
          style={post.background.startsWith('http') ? {
            backgroundImage: `url(${post.background})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : undefined}
          onDoubleClick={handleDoubleTapLike}
        >
          {post.background.startsWith('http') && (
            <div className="absolute inset-0 bg-black/30" />
          )}
          <p className="text-white text-xl md:text-2xl font-bold text-center leading-relaxed drop-shadow-lg relative z-10">
            {post.content?.replace(/\*+/g, '')}
          </p>
        </div>
      )}

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

      {/* Caption — skip if already shown on background */}
      {!(post.background && !post.image_url) && post.content && (
        <div className="px-4 pt-3 pb-1">
          <p className="text-[14px] text-zinc-900 leading-relaxed">
            <span className="font-bold">{post.author?.display_name}</span>
            {' '}
            <span className="text-zinc-700">{post.content?.replace(/\*+/g, '')}</span>
          </p>
        </div>
      )}

      {/* Action Row — Connecteam style */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 flex-1 justify-center py-2.5 rounded-full border transition-colors ${
            isLiked
              ? 'border-red-200 bg-red-50 text-red-600'
              : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          <ThumbsUp size={16} fill={isLiked ? 'currentColor' : 'none'} />
          <span className="text-[13px] font-semibold">Like</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-2 flex-1 justify-center py-2.5 rounded-full border transition-colors ${
            showComments
              ? 'border-blue-200 bg-blue-50 text-blue-600'
              : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          <MessageCircle size={16} />
          <span className="text-[13px] font-semibold">Comment</span>
        </button>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between px-4 pb-2 border-b border-zinc-100">
        <p className="text-[12px] text-zinc-400">
          {post.likes_count > 0
            ? `${post.likes_count} reaction${post.likes_count !== 1 ? 's' : ''}`
            : 'Be the first to react'}
        </p>
        <p className="text-[12px] text-zinc-400">
          {post.comments_count} Comment{post.comments_count !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Timestamp */}
      <p className="px-4 pt-1.5 pb-3 text-[10px] text-zinc-400 uppercase tracking-wider">
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
  const { employees } = useDirectory(profile?.business_id ?? undefined)

  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [showTasks, setShowTasks] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [newPostText, setNewPostText] = useState('')
  const [newPostTitle, setNewPostTitle] = useState('')
  const [posting, setPosting] = useState(false)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [postBackground, setPostBackground] = useState<string | null>(null)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [gifSearch, setGifSearch] = useState('')
  const [gifResults, setGifResults] = useState<{ url: string; preview: string }[]>([])
  const [gifLoading, setGifLoading] = useState(false)

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

  const selectGif = (url: string) => {
    setMediaFile(null)
    setMediaPreview(url)
    setShowGifPicker(false)
    setGifSearch('')
    setGifResults([])
  }

  const fetchGifs = async (q: string) => {
    const apiKey = import.meta.env.VITE_GIPHY_API_KEY
    if (!apiKey) return
    setGifLoading(true)
    try {
      const endpoint = q.trim()
        ? `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(q)}&api_key=${apiKey}&limit=20&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=20&rating=g`
      const res = await fetch(endpoint)
      const data = await res.json()
      setGifResults((data.data || []).map((g: any) => ({
        url: g.images?.original?.url || '',
        preview: g.images?.fixed_width_small?.url || g.images?.fixed_width?.url || '',
      })).filter((g: any) => g.url))
    } catch { setGifResults([]) }
    setGifLoading(false)
  }

  // Load trending when GIF picker opens, debounce search
  useEffect(() => {
    if (!showGifPicker) return
    const timer = setTimeout(() => fetchGifs(gifSearch), gifSearch ? 400 : 0)
    return () => clearTimeout(timer)
  }, [gifSearch, showGifPicker])

  const handlePost = async () => {
    if ((!newPostText.trim() && !mediaFile && !mediaPreview) || !profile) return
    setPosting(true)
    try {
      let image_url: string | null = null
      let media_type: 'image' | 'video' | null = null

      if (mediaFile) {
        const result = await uploadFeedMedia(profile.business_id!, mediaFile)
        image_url = result.url
        media_type = result.type
      } else if (mediaPreview && !mediaFile) {
        // GIF URL selected directly
        image_url = mediaPreview
        media_type = 'image'
      }

      const fullContent = newPostTitle.trim()
        ? `**${newPostTitle.trim()}**\n${newPostText.trim()}`
        : newPostText.trim() || ''

      await createFeedPost({
        business_id: profile.business_id!,
        author_id: profile.id,
        content: fullContent,
        image_url,
        media_type,
        background: postBackground,
      })
      setNewPostText('')
      setNewPostTitle('')
      setPostBackground(null)
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
        <button
          onClick={() => navigate('/profile')}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-red-700 to-red-600 flex items-center justify-center text-white text-sm font-bold shadow-sm hover:shadow-md transition-shadow"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            getInitials(displayName)
          )}
        </button>
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

        {/* Compose Trigger */}
        <button
          onClick={() => setShowComposer(true)}
          className="w-full bg-white border border-zinc-200 rounded-2xl mb-4 flex items-center gap-3 p-4 hover:shadow-sm transition-all"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-red-700 to-red-600 flex items-center justify-center text-white text-[10px] font-bold">
                {getInitials(displayName)}
              </div>
            )}
          </div>
          <span className="text-[13px] text-zinc-400 flex-1 text-left">Share something with your team...</span>
          <ImagePlus size={18} className="text-zinc-300" />
        </button>

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
          employees={employees}
          customers={customers}
          intakes={intakes}
          onRefresh={refreshTasks}
          onClose={() => setShowTasks(false)}
        />
      )}

      {/* New Update Composer — Full Screen Modal */}
      {showComposer && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 shrink-0">
            <button
              onClick={() => {
                setShowComposer(false)
                setNewPostTitle('')
                setNewPostText('')
                setPostBackground(null)
                setShowGifPicker(false)
                clearMedia()
              }}
              className="p-1"
            >
              <ArrowLeft size={22} className="text-zinc-700" />
            </button>
            <h3 className="text-[15px] font-bold text-zinc-900">New Update</h3>
            <button
              onClick={async () => {
                await handlePost()
                setShowComposer(false)
              }}
              disabled={posting || (!newPostText.trim() && !mediaFile && !mediaPreview)}
              className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-30 transition-opacity"
            >
              {posting ? 'Posting...' : 'Publish'}
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto pb-safe" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
            {/* Author Info */}
            <div className="flex items-center gap-3 px-4 pt-3 pb-2">
              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-red-700 to-red-600 flex items-center justify-center text-white text-xs font-bold">
                    {getInitials(displayName)}
                  </div>
                )}
              </div>
              <p className="text-sm font-bold text-zinc-900">{displayName}</p>
            </div>

            {/* Title & Content */}
            <div className="px-4 pb-2 border-b border-zinc-100 no-focus-ring">
              <input
                value={newPostTitle}
                onChange={e => setNewPostTitle(e.target.value)}
                placeholder="Title (optional)"
                className="w-full text-base font-bold text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-0 border-none outline-none mb-1"
              />
              <div className="relative h-[180px]">
                {postBackground && !mediaPreview ? (
                  <div
                    className={`absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-5 overflow-hidden ${
                      postBackground.startsWith('http') ? '' : postBackground
                    }`}
                    style={postBackground.startsWith('http') ? {
                      backgroundImage: `url(${postBackground})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    } : undefined}
                  >
                    {postBackground.startsWith('http') && (
                      <div className="absolute inset-0 bg-black/30 rounded-2xl" />
                    )}
                    <button
                      onClick={() => setPostBackground(null)}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center z-10"
                    >
                      <X size={12} className="text-white" />
                    </button>
                    <textarea
                      value={newPostText}
                      onChange={e => setNewPostText(e.target.value)}
                      placeholder="What would you like to share?"
                      rows={3}
                      className="w-full h-full text-lg font-bold text-white text-center bg-transparent resize-none focus:outline-none focus:ring-0 border-none outline-none placeholder:text-white/60 relative z-10 drop-shadow-lg"
                      autoFocus
                    />
                  </div>
                ) : (
                  <textarea
                    value={newPostText}
                    onChange={e => setNewPostText(e.target.value)}
                    placeholder="What would you like to share?"
                    className="w-full h-full text-[14px] text-zinc-700 bg-transparent resize-none focus:outline-none focus:ring-0 border-none outline-none placeholder:text-zinc-400"
                    autoFocus
                  />
                )}
              </div>
            </div>

            {/* Media Preview */}
            {mediaPreview && (
              <div className="relative mx-4 mt-2">
                {mediaFile?.type.startsWith('video/') ? (
                  <video src={mediaPreview} className="w-full max-h-48 object-cover rounded-xl" controls />
                ) : (
                  <img src={mediaPreview} alt="" className="w-full max-h-48 object-cover rounded-xl" />
                )}
                <button
                  onClick={clearMedia}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X size={12} className="text-white" />
                </button>
              </div>
            )}

            {/* GIF Picker */}
            {showGifPicker && (
              <div className="mx-4 mt-2 border border-zinc-200 rounded-2xl overflow-hidden no-focus-ring">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-100">
                  <Search size={14} className="text-zinc-400" />
                  <input
                    value={gifSearch}
                    onChange={e => setGifSearch(e.target.value)}
                    placeholder="Search GIFs..."
                    className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-zinc-400"
                    autoFocus
                  />
                  <button onClick={() => { setShowGifPicker(false); setGifSearch(''); setGifResults([]) }} className="p-1">
                    <X size={14} className="text-zinc-400" />
                  </button>
                </div>
                <div className="max-h-52 overflow-y-auto p-2">
                  {gifLoading && (
                    <div className="flex justify-center py-4">
                      <Loader2 size={20} className="animate-spin text-zinc-400" />
                    </div>
                  )}
                  {!gifLoading && gifResults.length === 0 && (
                    <p className="text-xs text-zinc-400 text-center py-4">
                      {gifSearch ? 'No GIFs found' : 'Loading...'}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-1.5">
                    {gifResults.map((gif, i) => (
                      <button
                        key={i}
                        onClick={() => selectGif(gif.url)}
                        className="rounded-lg overflow-hidden hover:ring-2 hover:ring-red-500 transition-all"
                      >
                        <img src={gif.preview} alt="" className="w-full h-24 object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[9px] text-zinc-300 text-center py-1 border-t border-zinc-100">Powered by GIPHY</p>
              </div>
            )}

            {/* Background Color Swatches — always visible */}
            <div className="px-4 mt-6">
              <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-2">Background</p>
              <div className="flex gap-3 items-center flex-wrap">
                {BG_COLOR_PREVIEWS.map((preview, i) => (
                  <button
                    key={i}
                    onClick={() => setPostBackground(BG_COLORS[i])}
                    className={`w-9 h-9 rounded-full shrink-0 transition-all ${preview} ${
                      postBackground === BG_COLORS[i] ? 'ring-2 ring-red-500 ring-offset-2 scale-110' : 'hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Preset Background Images — always visible */}
            <div className="px-4 mt-4">
              <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-2">Preset Backgrounds</p>
              <div className="grid grid-cols-4 gap-2 pb-1">
                {BG_IMAGES.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setPostBackground(url)}
                    className={`w-full aspect-[3/2] rounded-xl overflow-hidden transition-all ${
                      postBackground === url ? 'ring-2 ring-red-500 ring-offset-2' : 'hover:opacity-80'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>

            {/* Attachment Options — always visible */}
            <div className="px-4 mt-5 pb-4">
              <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mb-1.5">Add to your post</p>
              <div className="grid grid-cols-4 gap-2">
                <label className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 cursor-pointer transition-colors">
                  <Image size={18} className="text-emerald-600" />
                  <span className="text-[9px] font-semibold text-zinc-600">Images</span>
                  <input type="file" accept="image/*" onChange={handleMediaSelect} className="hidden" />
                </label>
                <label className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 cursor-pointer transition-colors">
                  <Video size={18} className="text-blue-600" />
                  <span className="text-[9px] font-semibold text-zinc-600">Video</span>
                  <input type="file" accept="video/*" onChange={handleMediaSelect} className="hidden" />
                </label>
                <button
                  onClick={() => setShowGifPicker(!showGifPicker)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl transition-colors ${showGifPicker ? 'bg-purple-50 ring-1 ring-purple-300' : 'bg-zinc-50 hover:bg-zinc-100'}`}
                >
                  <Smile size={18} className="text-purple-500" />
                  <span className="text-[9px] font-semibold text-zinc-600">GIF</span>
                </button>
                <label className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 cursor-pointer transition-colors">
                  <FileText size={18} className="text-orange-500" />
                  <span className="text-[9px] font-semibold text-zinc-600">Files</span>
                  <input type="file" onChange={handleMediaSelect} className="hidden" />
                </label>
                <button className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors">
                  <Link2 size={18} className="text-purple-500" />
                  <span className="text-[9px] font-semibold text-zinc-600">Link</span>
                </button>
                <button className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors">
                  <Play size={18} className="text-red-500" />
                  <span className="text-[9px] font-semibold text-zinc-600">Youtube</span>
                </button>
                <button className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 transition-colors">
                  <MapPin size={18} className="text-rose-500" />
                  <span className="text-[9px] font-semibold text-zinc-600">Location</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
