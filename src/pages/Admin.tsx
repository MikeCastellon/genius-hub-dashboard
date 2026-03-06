import { useState } from 'react'
import {
  useAdminUsers, approveUser, revokeUser, setUserRole, setUserBusiness,
  useBusinesses
} from '@/lib/store'
import { UserRole } from '@/lib/types'
import {
  ShieldCheck, Clock, CheckCircle2, XCircle, Loader2,
  Users, Shield, Building2
} from 'lucide-react'
import { useAuth } from '@/lib/store'

export default function Admin() {
  const { profile: myProfile } = useAuth()
  const { users, loading, refresh } = useAdminUsers()
  const { businesses } = useBusinesses()
  const [processingId, setProcessingId] = useState<string | null>(null)

  const isSuperAdmin = myProfile?.role === 'super_admin'

  // Filter users based on role:
  // super_admin sees all; admin sees only users in their business
  const visibleUsers = isSuperAdmin
    ? users
    : users.filter(u => u.business_id === myProfile?.business_id)

  const pending = visibleUsers.filter(u => !u.approved)
  const approved = visibleUsers.filter(u => u.approved)

  const handleApprove = async (id: string) => {
    setProcessingId(id)
    try {
      await approveUser(id)
      await refresh()
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleRevoke = async (id: string) => {
    setProcessingId(id)
    try {
      await revokeUser(id)
      await refresh()
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleRoleChange = async (id: string, role: UserRole) => {
    setProcessingId(id)
    try {
      await setUserRole(id, role)
      await refresh()
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleBusinessChange = async (id: string, businessId: string) => {
    setProcessingId(id)
    try {
      await setUserBusiness(id, businessId || null)
      await refresh()
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setProcessingId(null)
    }
  }

  const roleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'bg-violet-100 text-violet-600'
      case 'admin': return 'bg-blue-100 text-blue-600'
      default: return 'bg-zinc-100 text-zinc-500'
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg md:text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
          <ShieldCheck size={18} className="text-blue-500" />
          Admin Panel
        </h2>
        <p className="text-[13px] text-zinc-400 mt-0.5">Manage users and permissions</p>
      </div>

      <div className="space-y-8">

        {/* Pending Approvals */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-zinc-700">Pending Approval</h3>
            {pending.length > 0 && (
              <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-bold">{pending.length}</span>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-blue-400" /></div>
          ) : pending.length === 0 ? (
            <div className="glass rounded-2xl px-4 py-8 text-center">
              <p className="text-sm text-zinc-400">No pending users</p>
            </div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden divide-y divide-zinc-100">
              {pending.map(u => (
                <div key={u.id} className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-amber-600">{u.display_name[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-800">{u.display_name}</p>
                      <p className="text-[11px] text-zinc-400">{u.email || '—'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleApprove(u.id)}
                    disabled={processingId === u.id}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-sky-400 text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                  >
                    {processingId === u.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    Approve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approved Users */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-700">Approved Users</h3>
            <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-bold">{approved.length}</span>
          </div>

          <div className="glass rounded-2xl overflow-hidden divide-y divide-zinc-100">
            {approved.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-zinc-400">No approved users</p>
              </div>
            ) : (
              approved.map(u => (
                <div key={u.id} className="flex items-start justify-between px-4 py-3.5 gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-50 to-sky-50 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-blue-500">{u.display_name[0].toUpperCase()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-zinc-800">{u.display_name}</p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${roleBadge(u.role)}`}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate">{u.email || '—'}</p>
                      {isSuperAdmin && businesses.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Building2 size={10} className="text-zinc-400" />
                          <select
                            value={u.business_id || ''}
                            onChange={e => handleBusinessChange(u.id, e.target.value)}
                            disabled={processingId === u.id}
                            className="text-[10px] text-zinc-600 border border-zinc-200 rounded-lg px-1.5 py-0.5 bg-white focus:outline-none focus:border-blue-300"
                          >
                            <option value="">No business</option>
                            {businesses.map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isSuperAdmin && (
                      <select
                        value={u.role}
                        onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                        disabled={processingId === u.id || u.id === myProfile?.id}
                        className="text-[11px] px-2 py-1.5 rounded-xl border border-zinc-200 text-zinc-600 focus:outline-none focus:border-blue-300 disabled:opacity-50"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    )}
                    {!isSuperAdmin && (
                      <button
                        onClick={() => handleRoleChange(u.id, u.role === 'admin' ? 'user' : 'admin')}
                        disabled={processingId === u.id || u.id === myProfile?.id}
                        title={u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-400 hover:border-blue-200 hover:text-blue-500 transition-all disabled:opacity-50"
                      >
                        {processingId === u.id ? <Loader2 size={11} className="animate-spin" /> : <Shield size={11} />}
                        {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                      </button>
                    )}
                    {u.id !== myProfile?.id && (
                      <button
                        onClick={() => handleRevoke(u.id)}
                        disabled={processingId === u.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 text-zinc-400 text-xs font-medium hover:border-red-200 hover:text-red-400 transition-all disabled:opacity-50"
                      >
                        {processingId === u.id ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
