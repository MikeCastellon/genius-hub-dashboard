import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/store'
import {
  Car, History, Users, FileText, Wrench, Award, Clock,
  FileCheck, Receipt, Cog, ChevronRight,
} from 'lucide-react'

const sections = [
  {
    title: 'Operations',
    items: [
      { to: '/intake', icon: Car, label: 'Intake', desc: 'New vehicle intake' },
      { to: '/history', icon: History, label: 'History', desc: 'Past intakes' },
      { to: '/repairs', icon: Cog, label: 'Repairs', desc: 'Repair lookups' },
      { to: '/services', icon: Wrench, label: 'Services', desc: 'Manage services' },
    ],
  },
  {
    title: 'People',
    items: [
      { to: '/customers', icon: Users, label: 'Customers', desc: 'Customer database' },
      { to: '/hours', icon: Clock, label: 'Hours', desc: 'Time tracking' },
    ],
  },
  {
    title: 'Documents',
    items: [
      { to: '/invoices', icon: FileText, label: 'Invoices', desc: 'Billing & invoices' },
      { to: '/certify', icon: Award, label: 'Certify', desc: 'Certificates' },
      { to: '/forms', icon: FileCheck, label: 'Forms', desc: 'Custom forms' },
    ],
  },
]

const adminSection = {
  title: 'Finance',
  items: [
    { to: '/expenses', icon: Receipt, label: 'Expenses', desc: 'Track expenses' },
  ],
}

export default function Assets() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  const allSections = isAdmin ? [...sections, adminSection] : sections

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
      <h1 className="text-xl font-bold text-zinc-900 mb-5">Assets</h1>

      <div className="space-y-5">
        {allSections.map(section => (
          <div key={section.title}>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-1">
              {section.title}
            </p>
            <div className="glass rounded-2xl divide-y divide-zinc-100 overflow-hidden">
              {section.items.map(({ to, icon: Icon, label, desc }) => (
                <button
                  key={to}
                  onClick={() => navigate(to)}
                  className="flex items-center gap-3 w-full px-4 py-3.5 text-left hover:bg-zinc-50/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-zinc-900">{label}</p>
                    <p className="text-[11px] text-zinc-400">{desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-zinc-300 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
