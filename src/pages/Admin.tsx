import { useState, useEffect } from 'react'
import {
  useAdminUsers, approveUser, revokeUser, setUserRole, setUserBusiness,
  useBusinesses, useBusinessSettings, upsertBusinessSettings, updateBusiness,
  useBusinessHours, upsertBusinessHours
} from '@/lib/store'
import { UserRole, IntakeConfig, IntakeSectionKey, IntakeSectionDef, DEFAULT_INTAKE_CONFIG, BusinessHours } from '@/lib/types'
import {
  ShieldCheck, Clock, CheckCircle2, XCircle, Loader2,
  Users, Shield, Building2, Settings, Eye, EyeOff, GripVertical,
  ArrowUp, ArrowDown, Plus, Trash2, RotateCcw, Globe, Phone, MapPin, Image
} from 'lucide-react'
import { useAuth } from '@/lib/store'

export default function Admin() {
  const { profile: myProfile } = useAuth()
  const { users, loading, refresh } = useAdminUsers()
  const { businesses } = useBusinesses()
  const { settings, refresh: refreshSettings } = useBusinessSettings()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [tab, setTab] = useState<'users' | 'business' | 'intake'>('users')

  const isSuperAdmin = myProfile?.role === 'super_admin'
  const isAdmin = myProfile?.role === 'admin' || isSuperAdmin

  const visibleUsers = isSuperAdmin
    ? users
    : users.filter(u => u.business_id === myProfile?.business_id)

  const pending = visibleUsers.filter(u => !u.approved)
  const approved = visibleUsers.filter(u => u.approved)

  const handleApprove = async (id: string) => {
    setProcessingId(id)
    try { await approveUser(id); await refresh() } catch (e: any) { alert('Error: ' + e.message) } finally { setProcessingId(null) }
  }

  const handleRevoke = async (id: string) => {
    setProcessingId(id)
    try { await revokeUser(id); await refresh() } catch (e: any) { alert('Error: ' + e.message) } finally { setProcessingId(null) }
  }

  const handleRoleChange = async (id: string, role: UserRole) => {
    setProcessingId(id)
    try { await setUserRole(id, role); await refresh() } catch (e: any) { alert('Error: ' + e.message) } finally { setProcessingId(null) }
  }

  const handleBusinessChange = async (id: string, businessId: string) => {
    setProcessingId(id)
    try { await setUserBusiness(id, businessId || null); await refresh() } catch (e: any) { alert('Error: ' + e.message) } finally { setProcessingId(null) }
  }

  const roleBadge = (role: UserRole) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-700'
      case 'admin': return 'bg-red-100 text-red-700'
      default: return 'bg-zinc-100 text-zinc-500'
    }
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h2 className="text-lg md:text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
          <ShieldCheck size={18} className="text-red-600" />
          Admin Panel
        </h2>
        <p className="text-[13px] text-zinc-400 mt-0.5">Manage users, permissions, and intake settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 mb-6 w-fit">
        <button onClick={() => setTab('users')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${tab === 'users' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>
          <Users size={14} /> Users
        </button>
        <button onClick={() => setTab('business')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${tab === 'business' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>
          <Building2 size={14} /> Business
        </button>
        <button onClick={() => setTab('intake')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${tab === 'intake' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>
          <Settings size={14} /> Intake Form
        </button>
      </div>

      {tab === 'users' && (
        <div className="space-y-8">
          {/* Pending Approvals */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-zinc-700">Pending Approval</h3>
              {pending.length > 0 && (
                <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-bold">{pending.length}</span>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-red-500" /></div>
            ) : pending.length === 0 ? (
              <div className="glass rounded-2xl px-4 py-8 text-center">
                <p className="text-sm text-zinc-400">No pending users</p>
              </div>
            ) : (
              <div className="glass rounded-2xl overflow-hidden divide-y divide-zinc-100">
                {pending.map(u => (
                  <div key={u.id} className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-amber-600">{u.display_name[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-800">{u.display_name}</p>
                        <p className="text-[11px] text-zinc-400">{u.email || '—'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleApprove(u.id)}
                      disabled={processingId === u.id}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                    >
                      {processingId === u.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Approved Users */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users size={14} className="text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-700">Approved Users</h3>
              <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-bold">{approved.length}</span>
            </div>

            <div className="glass rounded-2xl overflow-hidden divide-y divide-zinc-100">
              {approved.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-zinc-400">No approved users</p>
                </div>
              ) : (
                approved.map(u => (
                  <div key={u.id} className="flex items-start justify-between px-4 py-3.5 gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-50 to-red-50 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-red-600">{u.display_name[0].toUpperCase()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-semibold text-zinc-800">{u.display_name}</p>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${roleBadge(u.role)}`}>
                            {u.role.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate">{u.email || '—'}</p>
                        {isSuperAdmin && businesses.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Building2 size={10} className="text-zinc-400" />
                            <select
                              value={u.business_id || ''}
                              onChange={e => handleBusinessChange(u.id, e.target.value)}
                              disabled={processingId === u.id}
                              className="text-[10px] text-zinc-600 border border-zinc-200 rounded-lg px-1.5 py-0.5 bg-white focus:outline-none focus:border-red-300"
                            >
                              <option value="">No business</option>
                              {businesses.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSuperAdmin && (
                        <select
                          value={u.role}
                          onChange={e => handleRoleChange(u.id, e.target.value as UserRole)}
                          disabled={processingId === u.id || u.id === myProfile?.id}
                          className="text-[11px] px-2 py-1.5 rounded-xl border border-zinc-200 text-zinc-600 focus:outline-none focus:border-red-300 disabled:opacity-50"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      )}
                      {!isSuperAdmin && (
                        <button
                          onClick={() => handleRoleChange(u.id, u.role === 'admin' ? 'user' : 'admin')}
                          disabled={processingId === u.id || u.id === myProfile?.id}
                          title={u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-400 hover:border-red-200 hover:text-red-600 transition-all disabled:opacity-50"
                        >
                          {processingId === u.id ? <Loader2 size={11} className="animate-spin" /> : <Shield size={11} />}
                          {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                        </button>
                      )}
                      {u.id !== myProfile?.id && (
                        <button
                          onClick={() => handleRevoke(u.id)}
                          disabled={processingId === u.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 text-zinc-400 text-xs font-medium hover:border-red-200 hover:text-red-400 transition-all disabled:opacity-50"
                        >
                          {processingId === u.id ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'business' && isAdmin && (
        <BusinessInfoPanel
          businessId={myProfile?.business_id || ''}
          businesses={businesses}
          refreshBusinesses={async () => { /* useBusinesses auto-refreshes */ }}
        />
      )}

      {tab === 'intake' && isAdmin && (
        <IntakeSettingsPanel
          businessId={myProfile?.business_id || ''}
          currentConfig={settings?.intake_config || DEFAULT_INTAKE_CONFIG}
          onSaved={refreshSettings}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
// Intake Settings Sub-Component
// ═══════════════════════════════════════════

function IntakeSettingsPanel({ businessId, currentConfig, onSaved }: {
  businessId: string
  currentConfig: IntakeConfig
  onSaved: () => void
}) {
  const [config, setConfig] = useState<IntakeConfig>(JSON.parse(JSON.stringify(currentConfig)))
  const [saving, setSaving] = useState(false)
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newFieldType, setNewFieldType] = useState<'text' | 'textarea' | 'number' | 'select' | 'checkbox'>('text')
  const [newOptions, setNewOptions] = useState('')

  const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10 transition-all'

  const toggleVisibility = (key: IntakeSectionKey) => {
    setConfig(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [key]: { ...prev.sections[key], visible: !prev.sections[key].visible }
      }
    }))
  }

  const moveSection = (key: IntakeSectionKey, direction: 'up' | 'down') => {
    setConfig(prev => {
      const order = [...prev.sectionOrder]
      const idx = order.indexOf(key)
      if (direction === 'up' && idx > 0) {
        [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]]
      } else if (direction === 'down' && idx < order.length - 1) {
        [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]]
      }
      return { ...prev, sectionOrder: order }
    })
  }

  const removeCustomSection = (key: IntakeSectionKey) => {
    if (!confirm(`Remove "${config.sections[key]?.label}"?`)) return
    setConfig(prev => {
      const sections = { ...prev.sections }
      delete sections[key]
      return {
        ...prev,
        sections,
        sectionOrder: prev.sectionOrder.filter(k => k !== key)
      }
    })
  }

  const addCustomSection = () => {
    if (!newLabel.trim()) return
    const key = `custom_${Date.now()}` as IntakeSectionKey
    const def: IntakeSectionDef = {
      visible: true,
      label: newLabel.trim(),
      type: 'custom',
      fieldType: newFieldType,
      ...(newFieldType === 'select' ? { options: newOptions.split(',').map(s => s.trim()).filter(Boolean) } : {}),
    }
    setConfig(prev => ({
      sections: { ...prev.sections, [key]: def },
      sectionOrder: [...prev.sectionOrder, key],
    }))
    setNewLabel('')
    setNewFieldType('text')
    setNewOptions('')
    setShowAddCustom(false)
  }

  const handleSave = async () => {
    if (!businessId) return
    setSaving(true)
    try {
      await upsertBusinessSettings(businessId, config)
      onSaved()
    } catch (err: any) {
      alert('Error saving settings: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (!confirm('Reset intake form to default? This will remove any custom sections.')) return
    setConfig(JSON.parse(JSON.stringify(DEFAULT_INTAKE_CONFIG)))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-800">Intake Form Sections</h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">Toggle visibility, reorder, or add custom fields</p>
        </div>
        <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-500 hover:text-red-600 hover:border-red-200 transition-colors">
          <RotateCcw size={12} /> Reset to Default
        </button>
      </div>

      {/* Section list */}
      <div className="glass rounded-2xl overflow-hidden divide-y divide-zinc-100">
        {config.sectionOrder.map((key, idx) => {
          const def = config.sections[key]
          if (!def) return null
          const isCustom = def.type === 'custom'
          const isBuiltin = !isCustom

          return (
            <div key={key} className={`flex items-center gap-3 px-4 py-3 ${!def.visible ? 'opacity-50' : ''}`}>
              <GripVertical size={14} className="text-zinc-300 shrink-0" />

              {/* Move buttons */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => moveSection(key, 'up')} disabled={idx === 0}
                  className="p-0.5 rounded text-zinc-400 hover:text-zinc-700 disabled:opacity-20">
                  <ArrowUp size={12} />
                </button>
                <button onClick={() => moveSection(key, 'down')} disabled={idx === config.sectionOrder.length - 1}
                  className="p-0.5 rounded text-zinc-400 hover:text-zinc-700 disabled:opacity-20">
                  <ArrowDown size={12} />
                </button>
              </div>

              {/* Label + type info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-800">{def.label}</p>
                <div className="flex items-center gap-2">
                  {isBuiltin && (
                    <span className="text-[9px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-full font-semibold uppercase">Built-in</span>
                  )}
                  {isCustom && (
                    <>
                      <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-semibold uppercase">Custom</span>
                      <span className="text-[10px] text-zinc-400 capitalize">{def.fieldType}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Visibility toggle */}
              <button onClick={() => toggleVisibility(key)}
                className={`p-2 rounded-xl transition-colors ${def.visible ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'}`}
                title={def.visible ? 'Hide section' : 'Show section'}>
                {def.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>

              {/* Delete (custom only) */}
              {isCustom && (
                <button onClick={() => removeCustomSection(key)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Add custom section */}
      {!showAddCustom ? (
        <button onClick={() => setShowAddCustom(true)}
          className="flex items-center gap-1.5 text-sm text-red-600 font-semibold hover:text-red-700">
          <Plus size={14} /> Add Custom Section
        </button>
      ) : (
        <div className="glass rounded-2xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-zinc-800">New Custom Section</h4>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">Label</label>
            <input className={inputClass} placeholder="e.g. Condition Report, Special Requests..." value={newLabel} onChange={e => setNewLabel(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">Field Type</label>
            <select className={inputClass} value={newFieldType} onChange={e => setNewFieldType(e.target.value as any)}>
              <option value="text">Text Input</option>
              <option value="textarea">Text Area (multi-line)</option>
              <option value="number">Number</option>
              <option value="select">Dropdown Select</option>
              <option value="checkbox">Checkbox</option>
            </select>
          </div>
          {newFieldType === 'select' && (
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">Options (comma-separated)</label>
              <input className={inputClass} placeholder="Option 1, Option 2, Option 3" value={newOptions} onChange={e => setNewOptions(e.target.value)} />
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setShowAddCustom(false)} className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600">Cancel</button>
            <button onClick={addCustomSection} disabled={!newLabel.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold disabled:opacity-40">
              Add Section
            </button>
          </div>
        </div>
      )}

      {/* Save button */}
      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
        {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Intake Settings'}
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════
// Business Info Sub-Component
// ═══════════════════════════════════════════

const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function BusinessInfoPanel({ businessId, businesses }: {
  businessId: string
  businesses: { id: string; name: string; slug?: string; logo_url?: string | null; website?: string | null; phone?: string | null; address?: string | null }[]
  refreshBusinesses: () => Promise<void>
}) {
  const biz = businesses.find(b => b.id === businessId)
  const { hours, refresh: refreshHours } = useBusinessHours()

  const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10 transition-all'

  const [name, setName] = useState(biz?.name || '')
  const [logoUrl, setLogoUrl] = useState(biz?.logo_url || '')
  const [website, setWebsite] = useState(biz?.website || '')
  const [phone, setPhone] = useState(biz?.phone || '')
  const [address, setAddress] = useState(biz?.address || '')
  const [saving, setSaving] = useState(false)

  // Business hours state
  const [localHours, setLocalHours] = useState<Partial<BusinessHours>[]>([])
  const [hoursInit, setHoursInit] = useState(false)
  const [savingHours, setSavingHours] = useState(false)

  // Sync biz fields when data loads
  useEffect(() => {
    if (biz) {
      setName(biz.name || '')
      setLogoUrl(biz.logo_url || '')
      setWebsite(biz.website || '')
      setPhone(biz.phone || '')
      setAddress(biz.address || '')
    }
  }, [biz?.id])

  // Init local hours
  if (!hoursInit && hours.length > 0) {
    setLocalHours(Array.from({ length: 7 }, (_, i) => {
      const bh = hours.find(h => h.day_of_week === i)
      return bh || { day_of_week: i, start_time: '08:00', end_time: '18:00', is_open: false }
    }))
    setHoursInit(true)
  }
  if (!hoursInit && hours.length === 0 && localHours.length === 0) {
    setLocalHours(Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i, start_time: '08:00', end_time: '18:00', is_open: i >= 1 && i <= 5
    })))
  }

  const handleSaveInfo = async () => {
    if (!businessId) return
    setSaving(true)
    try {
      await updateBusiness(businessId, {
        name: name.trim(),
        logo_url: logoUrl.trim() || null,
        website: website.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
      })
    } catch (err: any) {
      alert('Error saving: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveHours = async () => {
    if (!businessId) return
    setSavingHours(true)
    try {
      await upsertBusinessHours(localHours.map(h => ({ ...h, business_id: businessId } as Omit<BusinessHours, 'id'>)))
      refreshHours()
    } catch (err: any) {
      alert('Error saving hours: ' + err.message)
    } finally {
      setSavingHours(false)
    }
  }

  if (!biz) {
    return (
      <div className="glass rounded-2xl px-4 py-8 text-center">
        <p className="text-sm text-zinc-400">No business found for your account.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Business Details */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
          <Building2 size={14} className="text-red-600" />
          Business Details
        </h3>

        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">Business Name</label>
          <input className={inputClass} value={name} onChange={e => setName(e.target.value)} placeholder="Your business name" />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block flex items-center gap-1">
            <Image size={11} /> Logo URL
          </label>
          <input className={inputClass} value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.svg" />
          {logoUrl && (
            <div className="mt-2 p-3 bg-zinc-50 rounded-xl flex items-center gap-3">
              <img src={logoUrl} alt="Logo preview" className="h-10 w-auto object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
              <span className="text-xs text-zinc-400">Preview</span>
            </div>
          )}
        </div>

        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block flex items-center gap-1">
            <Globe size={11} /> Website
          </label>
          <input className={inputClass} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://www.yourbusiness.com" />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block flex items-center gap-1">
            <Phone size={11} /> Phone
          </label>
          <input className={inputClass} value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block flex items-center gap-1">
            <MapPin size={11} /> Address
          </label>
          <input className={inputClass} value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, City, State 00000" />
        </div>

        <button onClick={handleSaveInfo} disabled={saving || !name.trim()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
          {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Business Info'}
        </button>
      </div>

      {/* Business Hours */}
      <div className="glass rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-2 mb-4">
          <Clock size={14} className="text-red-600" />
          Business Hours
        </h3>
        <div className="space-y-3">
          {localHours.map((bh, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-28 shrink-0">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!bh.is_open}
                    onChange={e => setLocalHours(prev => prev.map((h, j) => j === i ? { ...h, is_open: e.target.checked } : h))}
                    className="rounded border-zinc-300 text-red-600"
                  />
                  <span className={`text-sm font-medium ${bh.is_open ? 'text-zinc-800' : 'text-zinc-400'}`}>{FULL_DAYS[i]}</span>
                </label>
              </div>
              {bh.is_open ? (
                <div className="flex items-center gap-2 flex-1">
                  <input type="time" value={bh.start_time || '08:00'}
                    onChange={e => setLocalHours(prev => prev.map((h, j) => j === i ? { ...h, start_time: e.target.value } : h))}
                    className="flex-1 px-2 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-red-300" />
                  <span className="text-zinc-400 text-xs">to</span>
                  <input type="time" value={bh.end_time || '18:00'}
                    onChange={e => setLocalHours(prev => prev.map((h, j) => j === i ? { ...h, end_time: e.target.value } : h))}
                    className="flex-1 px-2 py-1.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:border-red-300" />
                </div>
              ) : (
                <span className="text-xs text-zinc-400 italic">Closed</span>
              )}
            </div>
          ))}
        </div>
        <button onClick={handleSaveHours} disabled={savingHours}
          className="mt-5 w-full py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2">
          {savingHours ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Hours'}
        </button>
      </div>
    </div>
  )
}
