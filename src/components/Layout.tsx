import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Car, History, Wrench, LogOut, ShieldCheck, Building2, FileText, Calendar, Clock } from 'lucide-react'
import { useAuth } from '@/lib/store'
import { unregisterPushNotifications } from '@/lib/pushNotifications'

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

  const handleSignOut = async () => {
    if (user) await unregisterPushNotifications(user.id);
    await signOut();
  }

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
    ? { label: 'Super Admin', color: 'bg-red-100 text-red-700' }
    : profile?.role === 'admin'
      ? { label: 'Admin', color: 'bg-amber-100 text-amber-700' }
      : null

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[220px] shrink-0 flex-col border-r border-zinc-200/60 bg-white/60 backdrop-blur-xl">
        <div className="px-5 pt-6 pb-5">
          <div className="flex flex-col items-center text-center gap-1.5">
            <p className="text-sm font-bold text-zinc-900">Pro Hub</p>
            <p className="text-[9px] text-zinc-400 font-medium tracking-widest uppercase">Sales & Service by</p>
            <img src="https://www.autocaregenius.com/cdn/shop/files/v11_1.svg?v=1760731533&width=160" alt="Auto Care Genius" className="h-8 w-auto" />
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {allNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium ${
                  isActive
                    ? 'bg-gradient-to-r from-red-50 to-red-50 text-red-700 border border-red-100'
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
          <button onClick={handleSignOut}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 w-full">
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-dots pb-20 md:pb-0" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-zinc-200/60 px-2 py-1 safe-bottom"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="flex items-center overflow-x-auto no-scrollbar gap-1">
          {allNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-[10px] font-semibold min-w-[52px] ${
                  isActive ? 'text-red-700' : 'text-zinc-400'
                }`
              }>
              {({ isActive }) => (
                <>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isActive ? 'bg-gradient-to-br from-red-700 to-red-600 shadow-sm shadow-red-700/25' : ''
                  }`}>
                    <Icon size={16} className={isActive ? 'text-white' : 'text-zinc-400'} />
                  </div>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button onClick={handleSignOut}
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
