import { useState, useMemo } from 'react'
import { useIntakes } from '@/lib/store'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { VehicleIntake } from '@/lib/types'
import {
  DollarSign, TrendingUp, Car, Wallet,
  Banknote, Smartphone, CreditCard,
  Loader2, Activity, Calendar
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'ytd' | 'all' | 'custom'

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'ytd', label: 'YTD' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
]

function getDateRange(preset: DatePreset, customFrom: string, customTo: string) {
  const now = new Date()
  const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const eod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
  switch (preset) {
    case 'today': return { from: sod(now), to: eod(now) }
    case 'yesterday': { const y = new Date(now); y.setDate(y.getDate() - 1); return { from: sod(y), to: eod(y) } }
    case 'week': { const w = new Date(now); w.setDate(w.getDate() - w.getDay()); return { from: sod(w), to: eod(now) } }
    case 'month': return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: eod(now) }
    case 'ytd': return { from: new Date(now.getFullYear(), 0, 1), to: eod(now) }
    case 'custom': return {
      from: customFrom ? sod(new Date(customFrom + 'T00:00:00')) : new Date(0),
      to: customTo ? eod(new Date(customTo + 'T00:00:00')) : eod(now),
    }
    default: return { from: new Date(0), to: eod(now) }
  }
}

function computeStats(intakes: VehicleIntake[]) {
  const totalRevenue = intakes.reduce((s, i) => s + i.subtotal, 0)
  const count = intakes.length
  const avgOrder = count > 0 ? totalRevenue / count : 0

  const cash = intakes.filter(i => i.payment_method === 'cash').reduce((s, i) => s + i.subtotal, 0)
  const zelle = intakes.filter(i => i.payment_method === 'zelle').reduce((s, i) => s + i.subtotal, 0)
  const venmo = intakes.filter(i => i.payment_method === 'venmo').reduce((s, i) => s + i.subtotal, 0)
  const athMovil = intakes.filter(i => i.payment_method === 'ath_movil').reduce((s, i) => s + i.subtotal, 0)
  const creditCard = intakes.filter(i => i.payment_method === 'credit_card').reduce((s, i) => s + i.subtotal, 0)

  const dailyMap: Record<string, number> = {}
  for (const intake of intakes) {
    const d = intake.created_at.slice(0, 10)
    dailyMap[d] = (dailyMap[d] || 0) + intake.subtotal
  }
  const dailyRevenue = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => ({ date, total }))

  const paymentBreakdown = [
    { name: 'Cash', value: cash, color: '#10b981' },
    { name: 'Zelle', value: zelle, color: '#8b5cf6' },
    { name: 'Venmo', value: venmo, color: '#3b82f6' },
    { name: 'ATH Movil', value: athMovil, color: '#f59e0b' },
    { name: 'Credit Card', value: creditCard, color: '#71717a' },
  ].filter(p => p.value > 0)

  const serviceSales: Record<string, { name: string; count: number; revenue: number }> = {}
  for (const intake of intakes) {
    for (const item of intake.intake_services || []) {
      const name = item.service?.name || 'Unknown'
      if (!serviceSales[name]) serviceSales[name] = { name, count: 0, revenue: 0 }
      serviceSales[name].count += item.quantity
      serviceSales[name].revenue += item.total
    }
  }
  const topServices = Object.values(serviceSales)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  return { totalRevenue, count, avgOrder, cash, zelle, venmo, athMovil, creditCard, dailyRevenue, paymentBreakdown, topServices }
}

export default function Dashboard() {
  const { intakes, loading } = useIntakes()
  const [preset, setPreset] = useState<DatePreset>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const filtered = useMemo(() => {
    const { from, to } = getDateRange(preset, customFrom, customTo)
    return intakes.filter(i => {
      const d = new Date(i.created_at)
      return d >= from && d <= to
    })
  }, [intakes, preset, customFrom, customTo])

  const stats = useMemo(() => computeStats(filtered), [filtered])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    )
  }

  const kpiCards = [
    { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: DollarSign, gradient: 'from-blue-500 to-sky-400' },
    { label: 'Vehicles Serviced', value: stats.count.toString(), icon: Car, gradient: 'from-emerald-400 to-green-500' },
    { label: 'Avg per Vehicle', value: formatCurrency(stats.avgOrder), icon: TrendingUp, gradient: 'from-violet-500 to-purple-600' },
    { label: 'Services Today', value: intakes.filter(i => new Date(i.created_at).toDateString() === new Date().toDateString()).length.toString(), icon: Activity, gradient: 'from-amber-400 to-orange-500' },
  ]

  const paymentCards = [
    { label: 'Cash', value: formatCurrency(stats.cash), icon: Banknote, gradient: 'from-emerald-400 to-green-500' },
    { label: 'Zelle', value: formatCurrency(stats.zelle), icon: Wallet, gradient: 'from-violet-500 to-purple-600' },
    { label: 'Venmo', value: formatCurrency(stats.venmo), icon: Smartphone, gradient: 'from-blue-400 to-blue-600' },
    { label: 'ATH Movil', value: formatCurrency(stats.athMovil), icon: Smartphone, gradient: 'from-amber-400 to-orange-500' },
    { label: 'Credit Card', value: formatCurrency(stats.creditCard), icon: CreditCard, gradient: 'from-zinc-400 to-zinc-500' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Activity size={18} className="text-blue-500" />
            Dashboard
          </h2>
          <p className="text-[13px] text-zinc-400 mt-0.5">Services overview and analytics</p>
        </div>
      </div>

      {/* Date Range */}
      <div className="glass rounded-2xl p-3 mb-6 flex flex-wrap items-center gap-2">
        <Calendar size={14} className="text-zinc-400 ml-1" />
        {PRESETS.map(p => (
          <button key={p.value} onClick={() => setPreset(p.value)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              preset === p.value
                ? 'bg-gradient-to-r from-blue-500 to-sky-400 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
            }`}>
            {p.label}
          </button>
        ))}
        {preset === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 w-full mt-1 pl-6">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider shrink-0">From</label>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-700 focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10" />
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wider shrink-0">To</label>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-700 focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10" />
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {kpiCards.map(kpi => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="glass rounded-2xl p-4 hover:shadow-lg hover:shadow-zinc-200/50 hover:-translate-y-0.5 transition-all">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center shadow-sm`}>
                  <Icon size={14} className="text-white" />
                </div>
              </div>
              <p className="text-lg font-bold text-zinc-900">{kpi.value}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5 font-medium uppercase tracking-wider">{kpi.label}</p>
            </div>
          )
        })}
      </div>

      {/* Payment Cards */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-6">
        {paymentCards.map(kpi => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="glass rounded-2xl p-3 hover:shadow-lg hover:shadow-zinc-200/50 hover:-translate-y-0.5 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${kpi.gradient} flex items-center justify-center shadow-sm`}>
                  <Icon size={12} className="text-white" />
                </div>
              </div>
              <p className="text-sm font-bold text-zinc-900">{kpi.value}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5 font-medium uppercase tracking-wider">{kpi.label}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <h3 className="text-[13px] font-semibold text-zinc-800 mb-4">Daily Revenue</h3>
          {stats.dailyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.dailyRevenue} barCategoryGap="30%">
                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#a1a1aa' }}
                  tickFormatter={d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickFormatter={v => `$${v}`} />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(value as number), 'Revenue']}
                  labelFormatter={d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7', fontSize: 12, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)' }}
                />
                <Bar dataKey="total" fill="url(#blueGradient)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-sm text-zinc-400">No data for this period</div>
          )}
        </div>

        {/* Payment Breakdown */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-[13px] font-semibold text-zinc-800 mb-4">Payment Breakdown</h3>
          {stats.paymentBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={stats.paymentBreakdown} cx="50%" cy="45%"
                  innerRadius={50} outerRadius={80} dataKey="value"
                  strokeWidth={2} stroke="rgba(255,255,255,0.8)">
                  {stats.paymentBreakdown.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value as number)}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7', fontSize: 12, background: 'rgba(255,255,255,0.9)' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-sm text-zinc-400">No data for this period</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-[13px] font-semibold text-zinc-800 mb-4">Top Services</h3>
          {stats.topServices.length > 0 ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 pb-2 border-b border-zinc-100">
                <span className="w-5" />
                <div className="flex-1 min-w-0" />
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider w-20 text-right">Revenue</span>
              </div>
              {stats.topServices.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-zinc-300 w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-700 truncate">{s.name}</p>
                    <p className="text-[10px] text-zinc-400">{s.count}x performed</p>
                  </div>
                  <span className="text-xs font-bold text-blue-600 w-20 text-right">{formatCurrency(s.revenue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400 text-center py-8">No data for this period</p>
          )}
        </div>

        {/* Recent Intakes */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-[13px] font-semibold text-zinc-800 mb-4">Recent Intakes</h3>
          {filtered.length > 0 ? (
            <div className="space-y-1">
              {filtered.slice(0, 10).map(intake => (
                <div key={intake.id} className="flex items-center gap-3 py-2.5 border-b border-zinc-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-700">
                      {(intake.customer as any)?.name || 'Unknown'}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {intake.make && intake.model ? `${intake.year || ''} ${intake.make} ${intake.model}`.trim() : 'No vehicle info'}
                      {' · '}{formatDateTime(intake.created_at)}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-zinc-900">
                    {formatCurrency(intake.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400 text-center py-8">No intakes for this period</p>
          )}
        </div>
      </div>
    </div>
  )
}
