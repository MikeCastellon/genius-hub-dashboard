import { useState } from 'react'
import {
  useFormTemplates, useFormSubmissions, useCustomers, useAuth,
  createFormTemplate, updateFormTemplate, deleteFormTemplate, createFormSubmission
} from '@/lib/store'
import { FormTemplate, FormStatus, FormSubmission } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { FileCheck, Plus, Loader2, Search, Trash2, Pencil, ClipboardList, Eye, Send, Link, Check } from 'lucide-react'
import FormBuilder from '@/components/FormBuilder'
import FormFiller from '@/components/FormFiller'
import FormResponseDetail from '@/components/FormResponseDetail'

const STATUS_COLORS: Record<FormStatus, string> = {
  draft: 'bg-zinc-100 text-zinc-600',
  active: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-amber-100 text-amber-700',
}

export default function Forms() {
  const { profile } = useAuth()
  const { templates, loading: tLoading, refresh: refreshTemplates } = useFormTemplates()
  const { customers } = useCustomers()
  const [tab, setTab] = useState<'templates' | 'responses'>('templates')
  const [showBuilder, setShowBuilder] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | undefined>()
  const [fillingTemplate, setFillingTemplate] = useState<FormTemplate | null>(null)
  const [viewingSubmission, setViewingSubmission] = useState<FormSubmission | null>(null)
  const [search, setSearch] = useState('')
  const [templateFilter, setTemplateFilter] = useState<string>('all')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [sendMenuId, setSendMenuId] = useState<string | null>(null)

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  const getFormLink = (templateId: string) => `${window.location.origin}/form/${templateId}`

  const copyFormLink = async (templateId: string) => {
    await navigator.clipboard.writeText(getFormLink(templateId))
    setCopiedId(templateId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const sendFormViaSms = (templateId: string, formName: string) => {
    const link = getFormLink(templateId)
    const body = encodeURIComponent(`Please fill out this form: ${formName}\n${link}`)
    window.open(`sms:?body=${body}`, '_self')
    setSendMenuId(null)
  }

  const sendFormViaEmail = (templateId: string, formName: string) => {
    const link = getFormLink(templateId)
    const subject = encodeURIComponent(`Please fill out: ${formName}`)
    const body = encodeURIComponent(`Hi,\n\nPlease fill out the following form:\n\n${formName}\n${link}\n\nThank you!`)
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self')
    setSendMenuId(null)
  }

  // For responses tab
  const { submissions, loading: sLoading, refresh: refreshSubmissions } = useFormSubmissions(
    templateFilter !== 'all' ? templateFilter : undefined
  )

  const filteredTemplates = templates.filter(t => {
    if (!isAdmin && t.status !== 'active') return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const filteredSubmissions = submissions.filter(s => {
    if (search && !s.form_template?.name?.toLowerCase().includes(search.toLowerCase()) &&
        !s.customer?.name?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleSaveTemplate = async (data: { name: string; description: string | null; fields: any[]; status: FormStatus }) => {
    if (!profile?.business_id) { alert('No business assigned to your profile.'); return }
    try {
      if (editingTemplate) {
        await updateFormTemplate(editingTemplate.id, data)
      } else {
        await createFormTemplate({
          ...data,
          business_id: profile.business_id,
          created_by: profile.id,
        })
      }
      setShowBuilder(false)
      setEditingTemplate(undefined)
      refreshTemplates()
    } catch (err: any) {
      alert(err.message || 'Failed to save form template')
    }
  }

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    setDeleting(id)
    try {
      await deleteFormTemplate(id)
      refreshTemplates()
    } finally {
      setDeleting(null)
    }
  }

  const handleSubmitForm = async (responses: Record<string, any>, customerId: string | null) => {
    if (!fillingTemplate || !profile?.business_id) return
    try {
      await createFormSubmission({
        form_template_id: fillingTemplate.id,
        business_id: profile.business_id,
        responses,
        customer_id: customerId,
        intake_id: null,
        submitted_by: profile.id,
      })
      setFillingTemplate(null)
      refreshSubmissions()
    } catch (err: any) {
      alert(err.message || 'Failed to submit form')
    }
  }

  if (tLoading) {
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
            <FileCheck size={18} className="text-red-600" /> Forms
          </h2>
          <p className="text-[12px] text-zinc-400 mt-0.5">{templates.length} templates</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditingTemplate(undefined); setShowBuilder(true) }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm shadow-red-700/20 hover:shadow-md transition-all"
          >
            <Plus size={15} /> New Form
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-zinc-100 rounded-xl p-1 w-fit">
        {(['templates', 'responses'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            {t === 'templates' ? 'Templates' : 'Responses'}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:border-red-300"
            placeholder={tab === 'templates' ? 'Search templates...' : 'Search responses...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {tab === 'responses' && (
          <select
            className="px-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-700 focus:outline-none focus:border-red-300"
            value={templateFilter}
            onChange={e => setTemplateFilter(e.target.value)}
          >
            <option value="all">All Forms</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
      </div>

      {/* Content */}
      {tab === 'templates' ? (
        filteredTemplates.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <FileCheck size={32} className="mx-auto text-zinc-300 mb-3" />
            <p className="text-sm text-zinc-400">No form templates found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTemplates.map(template => (
              <div key={template.id} className="glass rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-zinc-900 text-sm truncate">{template.name}</p>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${STATUS_COLORS[template.status]}`}>
                        {template.status}
                      </span>
                    </div>
                    {template.description && (
                      <p className="text-xs text-zinc-400 mb-1 truncate">{template.description}</p>
                    )}
                    <p className="text-[11px] text-zinc-400">{template.fields.length} fields</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {template.status === 'active' && (
                      <>
                        {/* Send dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setSendMenuId(sendMenuId === template.id ? null : template.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1"
                          >
                            <Send size={12} /> Send
                          </button>
                          {sendMenuId === template.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setSendMenuId(null)} />
                              <div className="absolute right-0 top-full mt-1 z-50 w-40 bg-white rounded-xl shadow-xl border border-zinc-200 overflow-hidden">
                                <button
                                  onClick={() => sendFormViaSms(template.id, template.name)}
                                  className="w-full px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 transition-colors"
                                >
                                  <Send size={13} className="text-emerald-500" />
                                  SMS / Text
                                </button>
                                <button
                                  onClick={() => sendFormViaEmail(template.id, template.name)}
                                  className="w-full px-3 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 flex items-center gap-2 border-t border-zinc-100 transition-colors"
                                >
                                  <Send size={13} className="text-blue-500 -rotate-12" />
                                  Email
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                        <button
                          onClick={() => copyFormLink(template.id)}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                          title="Copy form link"
                        >
                          {copiedId === template.id
                            ? <Check size={13} className="text-emerald-500" />
                            : <Link size={13} className="text-zinc-400" />
                          }
                        </button>
                        <button
                          onClick={() => setFillingTemplate(template)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors flex items-center gap-1"
                        >
                          <ClipboardList size={12} /> Fill Out
                        </button>
                      </>
                    )}
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => { setEditingTemplate(template); setShowBuilder(true) }}
                          className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                        >
                          <Pencil size={13} className="text-zinc-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id, template.name)}
                          disabled={deleting === template.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          {deleting === template.id
                            ? <Loader2 size={13} className="animate-spin text-red-400" />
                            : <Trash2 size={13} className="text-zinc-400 hover:text-red-500" />
                          }
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        sLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-red-600" />
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <ClipboardList size={32} className="mx-auto text-zinc-300 mb-3" />
            <p className="text-sm text-zinc-400">No responses yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSubmissions.map(sub => (
              <button
                key={sub.id}
                onClick={() => setViewingSubmission(sub)}
                className="w-full glass rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-900 text-sm truncate">
                      {sub.form_template?.name || 'Unknown Form'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {sub.customer && (
                        <span className="text-xs text-zinc-500">{sub.customer.name}</span>
                      )}
                      <span className="text-[11px] text-zinc-400">{formatDateTime(sub.created_at)}</span>
                    </div>
                  </div>
                  <Eye size={14} className="text-zinc-400 shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        )
      )}

      {/* Modals */}
      {showBuilder && (
        <FormBuilder
          template={editingTemplate}
          onClose={() => { setShowBuilder(false); setEditingTemplate(undefined) }}
          onSave={handleSaveTemplate}
        />
      )}

      {fillingTemplate && (
        <FormFiller
          template={fillingTemplate}
          customers={customers}
          businessId={profile?.business_id || ''}
          onClose={() => setFillingTemplate(null)}
          onSubmit={handleSubmitForm}
        />
      )}

      {viewingSubmission && (
        <FormResponseDetail
          submission={viewingSubmission}
          onClose={() => setViewingSubmission(null)}
        />
      )}
    </div>
  )
}
