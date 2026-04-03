import { useState } from 'react'
import { useMyIntakes, useMyInvoices } from '@/lib/store'
import { FileText, Car, Loader2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { InvoiceStatus } from '@/lib/types'

const tabs = ['Service History', 'Invoices'] as const
type Tab = (typeof tabs)[number]

const invoiceStatusConfig: Record<InvoiceStatus, { label: string; bg: string; text: string }> = {
  draft: { label: 'Draft', bg: 'bg-zinc-100', text: 'text-zinc-600' },
  sent: { label: 'Sent', bg: 'bg-blue-50', text: 'text-blue-700' },
  paid: { label: 'Paid', bg: 'bg-green-50', text: 'text-green-700' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-50', text: 'text-red-700' },
}

export default function PortalHistory() {
  const [activeTab, setActiveTab] = useState<Tab>('Service History')
  const { intakes, loading: intakesLoading } = useMyIntakes()
  const { invoices, loading: invoicesLoading } = useMyInvoices()

  const loading = intakesLoading || invoicesLoading

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-red-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">History</h1>
        <p className="mt-1 text-sm text-zinc-500">Your past services and invoices</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl bg-zinc-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Service History */}
      {activeTab === 'Service History' && (
        <div className="space-y-4">
          {intakes.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-100 bg-white py-16 shadow-sm">
              <Car className="h-12 w-12 text-zinc-300" />
              <p className="mt-4 text-base font-medium text-zinc-700">No service history</p>
              <p className="mt-1 text-sm text-zinc-400">Your completed services will appear here</p>
            </div>
          ) : (
            intakes.map((intake) => (
              <div
                key={intake.id}
                className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-xs text-zinc-400">{formatDate(intake.created_at)}</p>

                    {/* Vehicle */}
                    {(intake.year || intake.make || intake.model) && (
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-zinc-400" />
                        <p className="text-sm font-medium text-zinc-800">
                          {[intake.year, intake.make, intake.model, intake.color]
                            .filter(Boolean)
                            .join(' ')}
                        </p>
                      </div>
                    )}

                    {/* Services */}
                    {intake.intake_services && intake.intake_services.length > 0 && (
                      <div className="space-y-1">
                        {intake.intake_services.map((is) => (
                          <div
                            key={is.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-zinc-600">
                              {is.service?.name || 'Service'}
                              {is.quantity > 1 && ` x${is.quantity}`}
                            </span>
                            <span className="text-zinc-500">{formatCurrency(is.total)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="text-right">
                    <p className="text-lg font-semibold text-zinc-900">
                      {formatCurrency(intake.subtotal)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Invoices */}
      {activeTab === 'Invoices' && (
        <div className="space-y-4">
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-100 bg-white py-16 shadow-sm">
              <FileText className="h-12 w-12 text-zinc-300" />
              <p className="mt-4 text-base font-medium text-zinc-700">No invoices</p>
              <p className="mt-1 text-sm text-zinc-400">Your invoices will appear here</p>
            </div>
          ) : (
            invoices.map((inv) => {
              const status = invoiceStatusConfig[inv.status] || invoiceStatusConfig.draft
              return (
                <div
                  key={inv.id}
                  className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-medium text-zinc-800">
                          {inv.invoice_number || 'Invoice'}
                        </p>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bg} ${status.text}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">{formatDate(inv.created_at)}</p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <p className="text-lg font-semibold text-zinc-900">
                        {formatCurrency(inv.total)}
                      </p>
                      <a
                        href={`/invoices/${inv.id}`}
                        className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        View Invoice
                      </a>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
