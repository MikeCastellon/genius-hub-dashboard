import { useAuth } from '@/lib/store'
import { Clock, LogOut, Car } from 'lucide-react'

export default function PendingApproval() {
  const { signOut, user } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dots">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-amber-500/25">
          <Clock size={28} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-2">Pending Approval</h2>
        <p className="text-sm text-zinc-500 mb-1">
          Your account is awaiting admin approval.
        </p>
        <p className="text-xs text-zinc-400 mb-6">{user?.email}</p>
        <div className="glass rounded-2xl p-4 mb-6 flex items-start gap-3 text-left">
          <Car size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-zinc-500">
            An administrator will review your account and approve your access shortly.
            You'll be able to sign in once approved.
          </p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl border border-zinc-200 text-zinc-500 text-sm font-medium hover:border-zinc-300 hover:text-zinc-700 transition-all"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  )
}
