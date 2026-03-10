import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Car, History, Wrench, LogOut, ShieldCheck, Building2, FileText, Calendar, Clock } from 'lucide-react'
import { useAuth } from '@/lib/store'

const navItems = [
  { to: '/', icon: Car, label: 'Intake' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/hours', icon: Clock, label: 'Hours' },
  { to: '/services', icon: Wrench, label: 'Services' },
]

export default function Layout() {
  const { signOut, user, profile } = useAuth()
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User'

  const allNavItems = [
    ...navItems,
    ...(profile?.role === 'admin' || profile?.role === 'super_admin'
      ? [{ to: '/admin', icon: ShieldCheck, label: 'Admin' }]
      : []),
    ...(profile?.role === 'super_admin'
      ? [{ to: '/super-admin', icon: Building2, label: 'Businesses' }]
      : []),
  ]

  const roleBadge = profile?.role === 'super_admin'
    ? { label: 'Super Admin', color: 'bg-violet-100 text-violet-600' }
    : profile?.role === 'admin'
      ? { label: 'Admin', color: 'bg-blue-100 text-blue-600' }
      : null

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[220px] shrink-0 flex-col border-r border-zinc-200/60 bg-white/60 backdrop-blur-xl">
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center shadow-md shadow-blue-500/25">
              <Car size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-900">Detailers Hub</p>
              <p className="text-[10px] text-zinc-400 font-medium tracking-widest uppercase">Management</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {allNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-50 to-sky-50 text-blue-600 border border-blue-100'
                    : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 border border-transparent'
                }`
              }>
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-zinc-100 space-y-1">
          <div className="px-3.5 py-1.5">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold text-zinc-700 truncate">{displayName}</p>
              {roleBadge && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide shrink-0 ${roleBadge.color}`}>
                  {roleBadge.label}
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-400 truncate">{user?.email}</p>
          </div>
          <button onClick={signOut}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 w-full">
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-dots pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-zinc-200/60 px-2 py-1 safe-bottom">
        <div className="flex items-center justify-around">
          {allNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-[10px] font-semibold min-w-[52px] ${
                  isActive ? 'text-blue-600' : 'text-zinc-400'
                }`
              }>
              {({ isActive }) => (
                <>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isActive ? 'bg-gradient-to-br from-blue-500 to-sky-400 shadow-sm shadow-blue-500/25' : ''
                  }`}>
                    <Icon size={16} className={isActive ? 'text-white' : 'text-zinc-400'} />
                  </div>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button onClick={signOut}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-[10px] font-semibold text-zinc-400 min-w-[52px]">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center">
              <LogOut size={16} />
            </div>
            <span>Exit</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
