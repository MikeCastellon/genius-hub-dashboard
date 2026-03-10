import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getInvoice, updateInvoice, updateInvoiceItems } from '@/lib/store'
import { Invoice, InvoiceStatus } from '@/lib/types'
import { ArrowLeft, Printer, Link2, Check, Loader2, FileText } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import InvoiceBuilder from '@/components/InvoiceBuilder'

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [copied, setCopied] = useState(false)
  const [updating, setUpdating] = useState(false)

  const load = async () => {
    if (!id) return
    setLoading(true)
    const data = await getInvoice(id)
    setInvoice(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleStatusChange = async (status: InvoiceStatus) => {
    if (!invoice) return
    setUpdating(true)
    await updateInvoice(invoice.id, { status })
    await load()
    setUpdating(false)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveEdit = async (data: any) => {
    if (!invoice) return
    await updateInvoice(invoice.id, {
      customer_id: data.customer_id || null,
      due_date: data.due_date || null,
      subtotal: data.subtotal,
      tax_rate: data.tax_rate,
      tax_amount: data.tax_amount,
      total: data.total,
      notes: data.notes || null,
    })
    await updateInvoiceItems(invoice.id, data.items)
    setShowEdit(false)
    load()
  }

  if (loading) return (
    <div className="flex justify-center items-center h-full">
      <Loader2 size={24} className="animate-spin text-blue-500" />
    </div>
  )

  if (!invoice) return (
    <div className="p-6 text-center text-zinc-400">Invoice not found</div>
  )

  return (
    <>
      <div className="p-4 md:p-6 max-w-3xl mx-auto print:p-0 print:max-w-none">
        {/* Top actions — hidden in print */}
        <div className="flex items-center justify-between mb-5 print:hidden">
          <button onClick={() => navigate('/invoices')} className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800">
            <ArrowLeft size={15} /> Back
          </button>
          <div className="flex items-center gap-2">
            {invoice.status === 'draft' && (
              <button onClick={() => setShowEdit(true)} className="px-3 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                Edit
              </button>
            )}
            <button onClick={handleCopyLink} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              {copied ? <Check size={14} className="text-emerald-500" /> : <Link2 size={14} />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        {/* Invoice document */}
        <div className="glass rounded-2xl p-6 md:p-8 print:shadow-none print:border-0 print:rounded-none">
          {/* Invoice header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText size={20} className="text-blue-500" />
                <h1 className="text-2xl font-bold text-zinc-900">{invoice.invoice_number || 'Invoice'}</h1>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[invoice.status]}`}>
                {invoice.status.toUpperCase()}
              </span>
            </div>
            <div className="text-right text-sm text-zinc-500">
              <p>Issued: {formatDate(invoice.created_at)}</p>
              {invoice.due_date && <p className="mt-0.5">Due: {formatDate(invoice.due_date)}</p>}
            </div>
          </div>

          {/* Customer */}
          {invoice.customer && (
            <div className="mb-8 p-4 bg-zinc-50 rounded-xl">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Bill To</p>
              <p className="font-semibold text-zinc-900">{invoice.customer.name}</p>
              {invoice.customer.phone && <p className="text-sm text-zinc-500">{invoice.customer.phone}</p>}
              {invoice.customer.email && <p className="text-sm text-zinc-500">{invoice.customer.email}</p>}
            </div>
          )}

          {/* Line items */}
          <div className="mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Description</th>
                  <th className="text-right py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider w-16">Qty</th>
                  <th className="text-right py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider w-24">Rate</th>
                  <th className="text-right py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider w-24">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {(invoice.items || []).map(item => (
                  <tr key={item.id}>
                    <td className="py-3 text-zinc-800">{item.description}</td>
                    <td className="py-3 text-right text-zinc-600">{item.quantity}</td>
                    <td className="py-3 text-right text-zinc-600">{formatCurrency(item.unit_price)}</td>
                    <td className="py-3 text-right font-medium text-zinc-900">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t border-zinc-200 pt-4 space-y-2 ml-auto max-w-xs">
            <div className="flex justify-between text-sm text-zinc-600">
              <span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.tax_rate > 0 && (
              <div className="flex justify-between text-sm text-zinc-600">
                <span>Tax ({(invoice.tax_rate * 100).toFixed(1)}%)</span>
                <span>{formatCurrency(invoice.tax_amount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg text-zinc-900 pt-2 border-t border-zinc-200">
              <span>Total</span><span>{formatCurrency(invoice.total)}</span>
            </div>
          </div>

          {invoice.notes && (
            <div className="mt-8 pt-6 border-t border-zinc-100">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-zinc-600">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* Status actions */}
        <div className="mt-4 flex gap-2 print:hidden">
          {invoice.status === 'draft' && (
            <button onClick={() => handleStatusChange('sent')} disabled={updating}
              className="flex-1 py-3 rounded-2xl bg-blue-500 text-white text-sm font-semibold disabled:opacity-40">
              Mark as Sent
            </button>
          )}
          {invoice.status === 'sent' && (
            <button onClick={() => handleStatusChange('paid')} disabled={updating}
              className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white text-sm font-semibold disabled:opacity-40">
              Mark as Paid ✓
            </button>
          )}
          {(invoice.status === 'draft' || invoice.status === 'sent') && (
            <button onClick={() => handleStatusChange('cancelled')} disabled={updating}
              className="px-4 py-3 rounded-2xl border border-zinc-200 text-zinc-600 text-sm font-semibold">
              Cancel
            </button>
          )}
        </div>
      </div>

      {showEdit && (
        <InvoiceBuilder
          initialData={invoice}
          onClose={() => setShowEdit(false)}
          onSave={handleSaveEdit}
        />
      )}

      <style>{`@media print { .print\\:hidden { display: none !important; } }`}</style>
    </>
  )
}
