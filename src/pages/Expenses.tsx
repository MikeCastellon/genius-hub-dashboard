import { useState } from 'react'
import { useExpenses, useAuth, createExpense, updateExpense, deleteExpense, uploadExpenseReceipt } from '@/lib/store'
import { Expense, EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, ExpenseCategory } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Receipt, Plus, Loader2, Search, Trash2, Pencil, RotateCcw, ExternalLink } from 'lucide-react'
import ExpenseModal from '@/components/ExpenseModal'
import ExpenseSummary from '@/components/ExpenseSummary'

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  supplies: 'bg-blue-100 text-blue-700',
  products: 'bg-emerald-100 text-emerald-700',
  equipment: 'bg-amber-100 text-amber-700',
  rent: 'bg-violet-100 text-violet-700',
  utilities: 'bg-cyan-100 text-cyan-700',
  marketing: 'bg-pink-100 text-pink-700',
  labor: 'bg-red-100 text-red-700',
  other: 'bg-zinc-100 text-zinc-600',
}

export default function Expenses() {
  const { profile } = useAuth()
  const { expenses, loading, refresh } = useExpenses()
  const [tab, setTab] = useState<'list' | 'summary'>('list')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Expense | undefined>()
  const [filter, setFilter] = useState<ExpenseCategory | 'all'>('all')
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  const filtered = expenses.filter(e => {
    const matchCat = filter === 'all' || e.category === filter
    const matchSearch = !search ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.vendor?.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const handleSave = async (data: {
    amount: number; description: string; category: ExpenseCategory
    vendor: string | null; date: string; is_recurring: boolean; receiptFile?: File
  }) => {
    let receipt_url = editing?.receipt_url || null
    if (data.receiptFile && profile?.business_id) {
      receipt_url = await uploadExpenseReceipt(data.receiptFile, profile.business_id)
    }

    if (editing) {
      await updateExpense(editing.id, {
        amount: data.amount,
        description: data.description,
        category: data.category,
        vendor: data.vendor,
        date: data.date,
        is_recurring: data.is_recurring,
        receipt_url,
      })
    } else {
      await createExpense({
        amount: data.amount,
        description: data.description,
        category: data.category,
        vendor: data.vendor,
        date: data.date,
        is_recurring: data.is_recurring,
        receipt_url,
        business_id: profile?.business_id || '',
        created_by: profile?.id || null,
      })
    }
    setShowModal(false)
    setEditing(undefined)
    refresh()
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await deleteExpense(id)
      refresh()
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <Receipt size={18} className="text-red-600" /> Expenses
          </h2>
          <p className="text-[12px] text-zinc-400 mt-0.5">{expenses.length} total</p>
        </div>
        <button
          onClick={() => { setEditing(undefined); setShowModal(true) }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm shadow-red-700/20 hover:shadow-md transition-all"
        >
          <Plus size={15} /> Add Expense
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-zinc-100 rounded-xl p-1 w-fit">
        {(['list', 'summary'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            {t === 'list' ? 'List' : 'Summary'}
          </button>
        ))}
      </div>

      {tab === 'summary' ? (
        <ExpenseSummary expenses={expenses} />
      ) : (
        <>
          {/* Filters */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:border-red-300"
                placeholder="Search expenses..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {(['all', ...EXPENSE_CATEGORIES] as const).map(c => (
              <button
                key={c}
                onClick={() => setFilter(c as any)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  filter === c
                    ? 'bg-gradient-to-r from-red-700 to-red-600 text-white shadow-sm'
                    : 'bg-zinc-100 text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {c === 'all' ? 'All' : EXPENSE_CATEGORY_LABELS[c as ExpenseCategory]}
              </button>
            ))}
          </div>

          {/* Expense List */}
          {filtered.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center">
              <Receipt size={32} className="mx-auto text-zinc-300 mb-3" />
              <p className="text-sm text-zinc-400">No expenses found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(expense => (
                <div key={expense.id} className="glass rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-zinc-900 text-sm truncate">{expense.description}</p>
                        {expense.is_recurring && (
                          <RotateCcw size={12} className="text-violet-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${CATEGORY_COLORS[expense.category]}`}>
                          {EXPENSE_CATEGORY_LABELS[expense.category]}
                        </span>
                        {expense.vendor && (
                          <span className="text-[11px] text-zinc-400">{expense.vendor}</span>
                        )}
                        <span className="text-[11px] text-zinc-400">{formatDate(expense.date)}</span>
                        {expense.receipt_url && (
                          <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-700">
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <p className="text-base font-bold text-red-600">{formatCurrency(expense.amount)}</p>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setEditing(expense); setShowModal(true) }}
                            className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                          >
                            <Pencil size={13} className="text-zinc-400" />
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            disabled={deleting === expense.id}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            {deleting === expense.id
                              ? <Loader2 size={13} className="animate-spin text-red-400" />
                              : <Trash2 size={13} className="text-zinc-400 hover:text-red-500" />
                            }
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal */}
      {showModal && (
        <ExpenseModal
          expense={editing}
          onClose={() => { setShowModal(false); setEditing(undefined) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
