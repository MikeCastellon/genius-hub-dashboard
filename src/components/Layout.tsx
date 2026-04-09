import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Car, History, Wrench, LogOut, ShieldCheck, Building2, FileText, Calendar, Clock, Award, Users, ClipboardList, ChevronLeft, ChevronRight, FileCheck, Receipt, Cog, MessageCircle, UserCircle, Grid2x2, User } from 'lucide-react'
import { useAuth } from '@/lib/store'
import { useTotalUnread } from '@/lib/chatStore'
import { unregisterPushNotifications } from '@/lib/pushNotifications'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/intake', icon: Car, label: 'Intake' },
  { to: '/queue', icon: ClipboardList, label: 'Queue' },
  { to: '/repairs', icon: Cog, label: 'Repairs' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/certify', icon: Award, label: 'Certify' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/hours', icon: Clock, label: 'Hours' },
  { to: '/forms', icon: FileCheck, label: 'Forms' },
  { to: '/services', icon: Wrench, label: 'Services' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
]

export default function Layout() {
  const navigate = useNavigate()
  const { signOut, user, profile } = useAuth()
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User'
  const totalUnread = useTotalUnread(profile?.id || undefined, profile?.business_id || undefined)
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true' } catch { return false }
  })

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem('sidebar-collapsed', String(next)) } catch {}
      return next
    })
  }

  const handleSignOut = async () => {
    if (user) await unregisterPushNotifications(user.id);
    await signOut();
  }

  const allNavItems = [
    ...navItems,
    ...(profile?.role === 'admin' || profile?.role === 'super_admin'
      ? [
          { to: '/expenses', icon: Receipt, label: 'Expenses' },
          { to: '/admin', icon: ShieldCheck, label: 'Admin' },
        ]
      : []),
    ...(profile?.role === 'super_admin'
      ? [{ to: '/super-admin', icon: Building2, label: 'Businesses' }]
      : []),
  ]

  const roleBadge = profile?.role === 'super_admin'
    ? { label: 'SA', color: 'bg-red-100 text-red-700' }
    : profile?.role === 'admin'
      ? { label: 'A', color: 'bg-amber-100 text-amber-700' }
      : null

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex shrink-0 flex-col border-r border-zinc-200/60 bg-white/60 backdrop-blur-xl transition-all duration-200 ${collapsed ? 'w-[68px]' : 'w-[220px]'}`}>
        {/* Logo area */}
        <div className={`pt-4 pb-3 ${collapsed ? 'px-2' : 'px-5'}`}>
          {collapsed ? (
            <div className="flex flex-col items-center">
              <img src="https://www.autocaregenius.com/cdn/shop/files/v11_1.svg?v=1760731533&width=160" alt="ACG" className="h-6 w-auto" />
            </div>
          ) : (
            <div className="flex flex-col items-center text-center gap-1">
              <p className="text-sm font-bold text-zinc-900">Pro Hub</p>
              <p className="text-[9px] text-zinc-400 font-medium tracking-widest uppercase">Sales & Service by</p>
              <img src="https://www.autocaregenius.com/cdn/shop/files/v11_1.svg?v=1760731533&width=160" alt="Auto Care Genius" className="h-7 w-auto" />
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className={`flex-1 space-y-0.5 ${collapsed ? 'px-1.5' : 'px-3'}`}>
          {allNavItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3.5 py-2.5'} rounded-xl text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-gradient-to-r from-red-50 to-red-50 text-red-700 border border-red-100'
                    : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 border border-transparent'
                }`
              }>
              <div className="relative">
                <Icon size={16} />
                {to === '/chat' && totalUnread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">
                    {totalUnread > 99 ? '99+' : totalUnread}
                  </span>
                )}
              </div>
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className={`px-2 py-2 ${collapsed ? 'flex justify-center' : ''}`}>
          <button
            onClick={toggleCollapsed}
            className="flex items-center justify-center w-full py-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : (
              <span className="flex items-center gap-2 text-[12px] font-medium">
                <ChevronLeft size={14} />
                Collapse
              </span>
            )}
          </button>
        </div>

        {/* User footer */}
        <div className={`border-t border-zinc-100 ${collapsed ? 'p-1.5' : 'p-3'} space-y-1`}>
          <button
            onClick={() => navigate('/profile')}
            title={collapsed ? 'My Profile' : undefined}
            className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5 px-3.5'} py-2.5 rounded-xl w-full transition-colors hover:bg-zinc-50 text-left`}
          >
            {collapsed ? (
              <UserCircle size={16} className="text-zinc-400" />
            ) : (
              <>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-700 to-red-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0 overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[11px] font-semibold text-zinc-700 truncate">{displayName}</p>
                    {roleBadge && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide shrink-0 ${roleBadge.color}`}>
                        {roleBadge.label}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate">{user?.email}</p>
                </div>
              </>
            )}
          </button>
          <button onClick={handleSignOut}
            title={collapsed ? 'Sign Out' : undefined}
            className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5 px-3.5'} py-2.5 rounded-xl text-[13px] font-medium text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 w-full transition-colors`}>
            <LogOut size={15} />
            {!collapsed && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-dots pb-20 md:pb-0" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-zinc-200/60 px-2 py-1 safe-bottom"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}>
        <div className="flex items-center justify-around px-1">
          {[
            { to: '/', icon: LayoutDashboard, label: 'Home' },
            { to: '/queue', icon: ClipboardList, label: 'Queue' },
            { to: '/schedule', icon: Calendar, label: 'Schedule' },
            { to: '/assets', icon: Grid2x2, label: 'Assets' },
            { to: '/chat', icon: MessageCircle, label: 'Chat' },
            { to: '/profile', icon: User, label: 'Profile' },
            ...(profile?.role === 'admin' || profile?.role === 'super_admin'
              ? [{ to: '/admin', icon: ShieldCheck, label: 'Admin' }]
              : []),
          ].map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-1.5 text-[9px] font-semibold min-w-0 ${
                  isActive ? 'text-red-700' : 'text-zinc-400'
                }`
              }>
              {({ isActive }) => (
                <>
                  <div className={`relative w-7 h-7 rounded-lg flex items-center justify-center ${
                    isActive ? 'bg-gradient-to-br from-red-700 to-red-600 shadow-sm shadow-red-700/25' : ''
                  }`}>
                    <Icon size={15} className={isActive ? 'text-white' : 'text-zinc-400'} />
                    {to === '/chat' && totalUnread > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-600 text-white text-[8px] font-bold flex items-center justify-center border border-white">
                        {totalUnread > 99 ? '99+' : totalUnread}
                      </span>
                    )}
                  </div>
                  <span className="truncate">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
