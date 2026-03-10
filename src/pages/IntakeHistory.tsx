import { useState, useMemo, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIntakes, useAuth, createInvoice } from '@/lib/store'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { PaymentMethod } from '@/lib/types'
import { Search, Loader2, History, ChevronDown, ChevronUp, Calendar, Car, FileText } from 'lucide-react'

type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'ytd' | 'all' | 'custom'

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'ytd', label: 'YTD' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
]

function getDateRange(preset: DatePreset, from: string, to: string) {
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
      from: from ? sod(new Date(from + 'T00:00:00')) : new Date(0),
      to: to ? eod(new Date(to + 'T00:00:00')) : eod(now),
    }
    default: return { from: new Date(0), to: eod(now) }
  }
}

const paymentColors: Record<string, string> = {
  cash: 'bg-emerald-50 text-emerald-600',
  zelle: 'bg-violet-50 text-violet-600',
  venmo: 'bg-blue-50 text-blue-600',
  ath_movil: 'bg-amber-50 text-amber-600',
  credit_card: 'bg-zinc-100 text-zinc-600',
}

export default function IntakeHistory() {
  const { intakes, loading } = useIntakes()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | 'all'>('all')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null)

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  const handleGenerateInvoice = async (intake: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setGeneratingInvoice(intake.id)
    try {
      const services = intake.intake_services || []
      const items = services.map((s: any) => ({
        description: s.service?.name || 'Service',
        quantity: s.quantity,
        unit_price: s.unit_price,
        total: s.total,
      }))
      const inv = await createInvoice({
        business_id: profile?.business_id,
        customer_id: intake.customer?.id || null,
        intake_id: intake.id,
        status: 'draft',
        subtotal: intake.subtotal,
        tax_rate: 0,
        tax_amount: 0,
        total: intake.subtotal,
      }, items)
      navigate(`/invoices/${inv.id}`)
    } finally {
      setGeneratingInvoice(null)
    }
  }

  const filtered = useMemo(() => {
    const { from, to } = getDateRange(datePreset, customFrom, customTo)
    return intakes.filter(intake => {
      const customerName = (intake.customer as any)?.name || ''
      const vinMakeModel = `${intake.vin || ''} ${intake.make || ''} ${intake.model || ''}`.toLowerCase()
      const d = new Date(intake.created_at)
      const matchSearch = customerName.toLowerCase().includes(search.toLowerCase())
        || vinMakeModel.includes(search.toLowerCase())
      const matchPayment = paymentFilter === 'all' || intake.payment_method === paymentFilter
      const matchDate = d >= from && d <= to
      return matchSearch && matchPayment && matchDate
    })
  }, [intakes, search, paymentFilter, datePreset, customFrom, customTo])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    )
  }

  const selectClass = 'px-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-700 focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10'

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-5">
        <h2 className="text-lg md:text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
          <History size={18} className="text-blue-500" />
          Intake History
          {isAdmin && (
            <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-semibold">Admin</span>
          )}
        </h2>
        <p className="text-[13px] text-zinc-400 mt-0.5">
          {filtered.length !== intakes.length
            ? `${filtered.length} of ${intakes.length} intakes`
            : `${intakes.length} total intakes`}
        </p>
      </div>

      {/* Date filter */}
      <div className="glass rounded-2xl p-3 mb-3 flex flex-wrap items-center gap-2">
        <Calendar size={14} className="text-zinc-400 ml-1 shrink-0" />
        {DATE_PRESETS.map(p => (
          <button key={p.value} onClick={() => setDatePreset(p.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              datePreset === p.value
                ? 'bg-gradient-to-r from-blue-500 to-sky-400 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
            }`}>
            {p.label}
          </button>
        ))}
        {datePreset === 'custom' && (
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

      {/* Filters */}
      <div className="glass rounded-2xl p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
            placeholder="Search by customer, VIN, make, model..." />
        </div>
        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value as any)} className={selectClass}>
          <option value="all">All Payments</option>
          <option value="cash">Cash</option>
          <option value="zelle">Zelle</option>
          <option value="venmo">Venmo</option>
          <option value="ath_movil">ATH Movil</option>
          <option value="credit_card">Credit Card</option>
        </select>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block glass rounded-2xl overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <th className="text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Date</th>
              <th className="text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Customer</th>
              <th className="text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Vehicle</th>
              <th className="text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Services</th>
              {isAdmin && <th className="text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Technician</th>}
              <th className="text-left text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Payment</th>
              <th className="text-right text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="text-center py-12 text-sm text-zinc-400">
                  {intakes.length === 0 ? 'No intakes yet' : 'No matching intakes found'}
                </td>
              </tr>
            ) : (
              filtered.map(intake => {
                const customer = intake.customer as any
                const services = intake.intake_services || []
                const isExpanded = expandedId === intake.id
                const vehicleLabel = [intake.year, intake.make, intake.model].filter(Boolean).join(' ') || '—'

                return (
                  <Fragment key={intake.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : intake.id)}
                      className="border-b border-zinc-50 hover:bg-blue-50/20 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-xs text-zinc-600">{formatDateTime(intake.created_at)}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-zinc-700">{customer?.name || 'Unknown'}</p>
                        <p className="text-[10px] text-zinc-400">{customer?.phone || ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-medium text-zinc-700">{vehicleLabel}</p>
                        {intake.vin && <p className="text-[10px] text-zinc-400 font-mono">{intake.vin}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">{services.length} service{services.length !== 1 ? 's' : ''}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-xs text-zinc-500">
                          {(intake as any).technician?.display_name || <span className="text-zinc-300">—</span>}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium capitalize ${paymentColors[intake.payment_method] || 'bg-zinc-100 text-zinc-500'}`}>
                          {intake.payment_method.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-zinc-900">
                        {formatCurrency(intake.subtotal)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={isAdmin ? 7 : 6} className="px-8 py-4 bg-blue-50/20 border-b border-zinc-100">
                          <div className="space-y-1.5">
                            {services.map((item: any) => (
                              <div key={item.id} className="flex justify-between text-xs">
                                <span className="text-zinc-500">
                                  {item.service?.name || 'Unknown'} x{item.quantity}
                                </span>
                                <span className="text-zinc-700 font-medium">{formatCurrency(item.total)}</span>
                              </div>
                            ))}
                            {intake.notes && (
                              <p className="text-[10px] text-zinc-400 mt-2 italic">Note: {intake.notes}</p>
                            )}
                            <button
                              onClick={(e) => handleGenerateInvoice(intake, e)}
                              disabled={generatingInvoice === intake.id}
                              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold hover:bg-blue-100 disabled:opacity-50"
                            >
                              <FileText size={12} />
                              {generatingInvoice === intake.id ? 'Generating...' : 'Generate Invoice'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-sm text-zinc-400">
            {intakes.length === 0 ? 'No intakes yet' : 'No matching intakes found'}
          </div>
        ) : (
          filtered.map(intake => {
            const customer = intake.customer as any
            const services = intake.intake_services || []
            const isExpanded = expandedId === intake.id
            const vehicleLabel = [intake.year, intake.make, intake.model].filter(Boolean).join(' ') || null

            return (
              <div key={intake.id} className="glass rounded-2xl overflow-hidden">
                <div className="p-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : intake.id)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-800 truncate">{customer?.name || 'Unknown'}</p>
                      {vehicleLabel && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Car size={10} className="text-blue-400" />
                          <p className="text-[10px] text-zinc-500 truncate">{vehicleLabel}</p>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold text-blue-600">{formatCurrency(intake.subtotal)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-zinc-400">{formatDateTime(intake.created_at)}</span>
                      {isAdmin && (intake as any).technician?.display_name && (
                        <span className="text-[10px] text-blue-400 font-medium">by {(intake as any).technician.display_name}</span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${paymentColors[intake.payment_method] || ''}`}>
                        {intake.payment_method.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-zinc-400">{services.length} services</span>
                    </div>
                    <div className="text-zinc-300 ml-2">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-zinc-100 p-3 bg-blue-50/20">
                    <div className="space-y-1.5">
                      {services.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-xs">
                          <span className="text-zinc-500 flex-1 mr-2">
                            {item.service?.name || 'Unknown'} <span className="text-zinc-400">x{item.quantity}</span>
                          </span>
                          <span className="text-zinc-700 font-medium shrink-0">{formatCurrency(item.total)}</span>
                        </div>
                      ))}
                      {intake.vin && (
                        <p className="text-[10px] text-zinc-400 font-mono mt-1">VIN: {intake.vin}</p>
                      )}
                      {intake.notes && (
                        <p className="text-[10px] text-zinc-400 mt-1 italic">Note: {intake.notes}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
