import { useAuth, useDirectory } from '@/lib/store'
import { Users, Loader2, Mail, Shield } from 'lucide-react'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  user: 'Detailer',
}

const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700',
  admin: 'bg-blue-100 text-blue-700',
  user: 'bg-zinc-100 text-zinc-600',
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function Directory() {
  const { profile } = useAuth()
  const { employees, loading } = useDirectory(profile?.business_id ?? undefined)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="sticky top-0 z-20 bg-[#f5f5f5]/95 backdrop-blur-md px-4 md:px-6 pt-4 md:pt-6 pb-3">
        <div className="mb-5">
          <h2 className="text-lg md:text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Users size={18} className="text-red-600" /> Employee Directory
          </h2>
          <p className="text-[12px] md:text-[13px] text-zinc-400 mt-0.5">
            {employees.length} team member{employees.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="px-4 md:px-6 pb-4">
      {employees.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <Users size={28} className="mx-auto text-zinc-300 mb-3" />
          <p className="text-sm text-zinc-400 font-medium">No team members found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {employees.map(emp => {
            const badge = ROLE_BADGE[emp.role] || ROLE_BADGE.user
            return (
              <div key={emp.id} className="glass rounded-2xl p-4 hover:shadow-lg hover:shadow-zinc-200/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  {emp.avatar_url ? (
                    <img src={emp.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-red-700 to-red-600 flex items-center justify-center text-white text-sm font-bold">
                      {getInitials(emp.display_name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-900 truncate">{emp.display_name}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${badge}`}>
                      <Shield size={9} />
                      {ROLE_LABELS[emp.role] || emp.role}
                    </span>
                  </div>
                </div>

                {(emp.email) && (
                  <div className="space-y-1.5 pt-3 border-t border-zinc-100">
                    {emp.email && (
                      <a href={`mailto:${emp.email}`} className="flex items-center gap-2 text-xs text-zinc-500 hover:text-red-600 transition-colors">
                        <Mail size={12} />
                        <span className="truncate">{emp.email}</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}
