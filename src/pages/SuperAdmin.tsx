import { useState } from 'react'
import { useBusinesses, createBusiness, deleteBusiness } from '@/lib/store'
import { Building2, Plus, Trash2, Loader2, Users } from 'lucide-react'
import { useAdminUsers } from '@/lib/store'

export default function SuperAdmin() {
  const { businesses, loading, refresh } = useBusinesses()
  const { users } = useAdminUsers()
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    try {
      await createBusiness(newName.trim())
      setNewName('')
      setShowForm(false)
      refresh()
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will remove the business but not the users.`)) return
    setDeletingId(id)
    try {
      await deleteBusiness(id)
      refresh()
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const getUserCount = (businessId: string) =>
    users.filter(u => u.business_id === businessId).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Building2 size={18} className="text-red-600" />
            Business Management
          </h2>
          <p className="text-[13px] text-zinc-400 mt-0.5">
            Manage all detailing businesses on the platform
          </p>
          {errorMsg && <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2 border border-red-100 mt-2">{errorMsg}</p>}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-xs font-semibold shadow-sm shadow-red-700/20 hover:shadow-md transition-all"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Add Business</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="glass rounded-2xl p-4">
          <p className="text-2xl font-bold text-zinc-900">{businesses.length}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5 uppercase tracking-wider font-medium">Total Businesses</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-2xl font-bold text-zinc-900">{users.length}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5 uppercase tracking-wider font-medium">Total Users</p>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="glass rounded-2xl p-4 mb-6 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
            <Plus size={14} className="text-red-600" />
            New Business
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Business name..."
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-xs font-semibold disabled:opacity-40"
            >
              {adding ? <Loader2 size={14} className="animate-spin" /> : 'Create'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-500 text-xs font-semibold hover:bg-zinc-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Business List */}
      {businesses.length === 0 ? (
        <div className="glass rounded-2xl px-4 py-12 text-center">
          <Building2 size={32} className="text-zinc-200 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">No businesses yet. Add your first one above.</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden divide-y divide-zinc-100">
          {businesses.map(biz => {
            const memberCount = getUserCount(biz.id)
            return (
              <div key={biz.id} className="flex items-center justify-between px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center shrink-0">
                    <Building2 size={16} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-800">{biz.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Users size={10} className="text-zinc-400" />
                      <p className="text-[11px] text-zinc-400">
                        {memberCount} {memberCount === 1 ? 'user' : 'users'}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(biz.id, biz.name)}
                  disabled={deletingId === biz.id}
                  className="p-2 rounded-xl text-zinc-300 hover:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  {deletingId === biz.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
