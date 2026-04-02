import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useInvoices, createInvoice, useAuth } from '@/lib/store'
import { Invoice, InvoiceStatus } from '@/lib/types'
import { FileText, Plus, Loader2, Search } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import InvoiceBuilder from '@/components/InvoiceBuilder'

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-600',
  sent: 'bg-red-100 text-red-700',
  paid: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
}

export default function Invoices() {
  const { profile } = useAuth()
  const { invoices, loading, refresh } = useInvoices()
  const navigate = useNavigate()
  const [showBuilder, setShowBuilder] = useState(false)
  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  const filtered = invoices.filter(inv => {
    const matchStatus = filter === 'all' || inv.status === filter
    const matchSearch = !search ||
      inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer?.name?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const handleCreate = async (data: any) => {
    await createInvoice(
      {
        business_id: profile?.business_id,
        customer_id: data.customer_id || null,
        status: 'draft',
        due_date: data.due_date || null,
        subtotal: data.subtotal,
        tax_rate: data.tax_rate,
        tax_amount: data.tax_amount,
        total: data.total,
        notes: data.notes || null,
      },
      data.items
    )
    setShowBuilder(false)
    refresh()
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <FileText size={18} className="text-red-600" /> Invoices
          </h2>
          <p className="text-[12px] text-zinc-400 mt-0.5">{invoices.length} total</p>
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm shadow-red-700/20 hover:shadow-md transition-all"
        >
          <Plus size={15} /> New Invoice
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:border-red-300"
            placeholder="Search invoices..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {(['all', 'draft', 'sent', 'paid', 'cancelled'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${filter === s ? 'bg-gradient-to-r from-red-700 to-red-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-red-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No invoices yet</p>
          <p className="text-sm mt-1">Create your first invoice above</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv: Invoice) => (
            <button
              key={inv.id}
              onClick={() => navigate(`/invoices/${inv.id}`)}
              className="w-full glass rounded-2xl p-4 flex items-center justify-between text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-red-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900 text-sm">{inv.invoice_number || 'Draft'}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[inv.status]}`}>
                      {inv.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 truncate">{inv.customer?.name || 'No customer'} · {formatDate(inv.created_at)}</p>
                </div>
              </div>
              <span className="font-bold text-zinc-900 shrink-0 ml-3">{formatCurrency(inv.total)}</span>
            </button>
          ))}
        </div>
      )}

      {showBuilder && (
        <InvoiceBuilder
          onClose={() => setShowBuilder(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  )
}
