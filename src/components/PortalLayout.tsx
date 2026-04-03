import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Calendar, History, User, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '@/lib/store'

const navItems = [
  { to: '/portal', icon: Calendar, label: 'My Bookings' },
  { to: '/portal/history', icon: History, label: 'History' },
  { to: '/portal/profile', icon: User, label: 'Profile' },
]

export default function PortalLayout() {
  const { signOut, user, profile } = useAuth()
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Customer'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Top navigation bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-zinc-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Left: Logo / business name */}
          <div className="flex items-center gap-2">
            <img
              src="https://www.autocaregenius.com/cdn/shop/files/v11_1.svg?v=1760731533&width=160"
              alt="Logo"
              className="h-6 w-auto"
            />
            <span className="text-sm font-bold text-zinc-900 hidden sm:inline">
              {profile?.business_id ? 'Pro Hub' : 'Pro Hub'}
            </span>
          </div>

          {/* Center: Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/portal'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    isActive
                      ? 'text-red-600 font-semibold border-red-600'
                      : 'text-zinc-500 hover:text-zinc-700 border-transparent'
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right: User + sign out (desktop) */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-sm text-zinc-600 font-medium">{displayName}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>

          {/* Mobile: hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 -mr-2 text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-100 bg-white px-4 py-3 space-y-1">
            <div className="px-3 py-2 text-sm font-medium text-zinc-700">{displayName}</div>
            <button
              onClick={() => {
                handleSignOut()
                setMobileMenuOpen(false)
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </div>
        )}
      </header>

      {/* Main content area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>

      {/* Mobile bottom navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-200/60 px-2 py-1"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-center justify-around">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/portal'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-[10px] font-semibold min-w-[52px] ${
                  isActive ? 'text-red-700' : 'text-zinc-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isActive
                        ? 'bg-gradient-to-br from-red-700 to-red-600 shadow-sm shadow-red-700/25'
                        : ''
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-white' : 'text-zinc-400'} />
                  </div>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
