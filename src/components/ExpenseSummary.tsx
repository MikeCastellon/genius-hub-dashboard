import { useMemo } from 'react'
import { Expense, EXPENSE_CATEGORY_LABELS, ExpenseCategory } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, TrendingUp, RotateCcw } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const COLORS = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280']

interface Props {
  expenses: Expense[]
}

export default function ExpenseSummary({ expenses }: Props) {
  const stats = useMemo(() => {
    const now = new Date()
    const thisMonth = expenses.filter(e => {
      const d = new Date(e.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const totalThisMonth = thisMonth.reduce((s, e) => s + e.amount, 0)
    const totalAll = expenses.reduce((s, e) => s + e.amount, 0)

    // Monthly data for bar chart
    const monthMap: Record<string, number> = {}
    expenses.forEach(e => {
      const d = new Date(e.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthMap[key] = (monthMap[key] || 0) + e.amount
    })
    const monthlyData = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, total]) => ({ month, total }))

    const avgPerMonth = monthlyData.length > 0 ? totalAll / monthlyData.length : 0

    // Category breakdown for pie chart
    const catMap: Record<string, number> = {}
    expenses.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount
    })
    const categoryData = Object.entries(catMap)
      .map(([category, value]) => ({
        name: EXPENSE_CATEGORY_LABELS[category as ExpenseCategory] || category,
        value,
      }))
      .sort((a, b) => b.value - a.value)

    const recurringTotal = expenses.filter(e => e.is_recurring).reduce((s, e) => s + e.amount, 0)

    return { totalThisMonth, avgPerMonth, recurringTotal, monthlyData, categoryData }
  }, [expenses])

  const kpiCards = [
    { label: 'This Month', value: formatCurrency(stats.totalThisMonth), icon: DollarSign, gradient: 'from-red-700 to-red-600' },
    { label: 'Avg / Month', value: formatCurrency(stats.avgPerMonth), icon: TrendingUp, gradient: 'from-amber-400 to-orange-500' },
    { label: 'Recurring', value: formatCurrency(stats.recurringTotal), icon: RotateCcw, gradient: 'from-violet-500 to-purple-600' },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Bar Chart */}
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <h3 className="text-[13px] font-semibold text-zinc-800 mb-4">Monthly Expenses</h3>
          {stats.monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.monthlyData} barCategoryGap="30%">
                <defs>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dc2626" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: '#a1a1aa' }}
                  tickFormatter={m => {
                    const [y, mo] = m.split('-')
                    return new Date(Number(y), Number(mo) - 1).toLocaleDateString('en-US', { month: 'short' })
                  }}
                />
                <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickFormatter={v => `$${v}`} />
                <Tooltip
                  formatter={(v: any) => formatCurrency(Number(v || 0))}
                  labelFormatter={m => {
                    const [y, mo] = String(m).split('-')
                    return new Date(Number(y), Number(mo) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                  }}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7', fontSize: 12 }}
                />
                <Bar dataKey="total" fill="url(#expenseGradient)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-zinc-400 text-center py-10">No expense data yet</p>
          )}
        </div>

        {/* Category Pie Chart */}
        <div className="glass rounded-2xl p-5">
          <h3 className="text-[13px] font-semibold text-zinc-800 mb-4">By Category</h3>
          {stats.categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stats.categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {stats.categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrency(Number(v || 0))} contentStyle={{ borderRadius: 12, border: '1px solid #e4e4e7', fontSize: 12 }} />
                <Legend iconType="circle" formatter={v => <span className="text-xs text-zinc-600">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-zinc-400 text-center py-10">No data</p>
          )}
        </div>
      </div>
    </div>
  )
}
