import { useState } from 'react'
import { useServices, useCustomers, createIntake, useAuth, useIntakeConfig, upsertBusinessSettings, inviteCustomer, startJob, useActiveJob, uploadJobPhoto } from '@/lib/store'
import { CartItem, PaymentMethod, IntakeSectionKey, IntakeConfig, getSectionFields, IntakeFieldDef, Customer } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import { CheckCircle, Loader2, FileText, Car, Pencil, Play } from 'lucide-react'
import { hapticSuccess, hapticError } from '@/lib/haptics'
import VehicleForm from '@/components/VehicleForm'
import CustomerForm from '@/components/CustomerForm'
import ServicePicker from '@/components/ServicePicker'
import IntakeSummary from '@/components/IntakeSummary'
import PaymentSelector from '@/components/PaymentSelector'
import BarkoderScanner from '@/components/BarkoderScanner'
import SectionEditModal from '@/components/SectionEditModal'
import { decodeVin, isLikelyVin } from '@/lib/utils'

interface VehicleData {
  vin: string
  year: string
  make: string
  model: string
  color: string
  license_plate: string
}

const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10 transition-all'

export default function NewIntake() {
  const { user, profile } = useAuth()
  const { services, loading: servicesLoading } = useServices()
  const { customers, refresh: refreshCustomers } = useCustomers()
  const { config, refresh: refreshConfig } = useIntakeConfig()

  const [vehicle, setVehicle] = useState<VehicleData>({ vin: '', year: '', make: '', model: '', color: '', license_plate: '' })
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', company: '' })
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
  const [notes, setNotes] = useState('')
  const [customFields, setCustomFields] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [editingSection, setEditingSection] = useState<IntakeSectionKey | null>(null)
  const [savedCustomer, setSavedCustomer] = useState<Customer | null>(null)
  const [, setSavedIntakeId] = useState<string | null>(null)
  const [inviteSent, setInviteSent] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [beforePhotos, setBeforePhotos] = useState<File[]>([])
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStarted, setJobStarted] = useState(false)
  const [jobStarting, setJobStarting] = useState(false)

  const { job: activeJob } = useActiveJob(profile?.role === 'user' ? profile?.id : null)
  const hasActiveJob = !!activeJob && !jobStarted

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  const saveConfigChange = async (newConfig: IntakeConfig) => {
    if (!profile?.business_id) return
    try {
      await upsertBusinessSettings(profile.business_id, newConfig)
      await refreshConfig()
    } catch (err: any) {
      alert('Error saving: ' + err.message)
    }
  }

  const handleSectionEdit = async (key: IntakeSectionKey, updatedDef: typeof config.sections[string]) => {
    await saveConfigChange({
      ...config,
      sections: { ...config.sections, [key]: updatedDef }
    })
    setEditingSection(null)
  }

  const handleDeleteSection = async (key: IntakeSectionKey) => {
    if (!confirm(`Remove "${config.sections[key]?.label}"?`)) return
    const sections = { ...config.sections }
    delete sections[key]
    await saveConfigChange({ sections, sectionOrder: config.sectionOrder.filter(k => k !== key) })
    setEditingSection(null)
  }

  // Build hidden fields sets for built-in sections
  const hiddenFieldsFor = (key: string) => {
    const def = config.sections[key]
    if (!def) return new Set<string>()
    const fields = getSectionFields(key, def)
    return new Set(fields.filter(f => !f.visible).map(f => f.key))
  }

  // Get custom (non-built-in) fields added to a section
  const extraFieldsFor = (key: string): IntakeFieldDef[] => {
    const def = config.sections[key]
    if (!def) return []
    const fields = getSectionFields(key, def)
    return fields.filter(f => !f.builtIn && f.visible)
  }

  // Get visible sections in order
  const visibleSections = config.sectionOrder.filter(key => config.sections[key]?.visible)

  // Split into left (main form) and right (summary) columns
  // Built-in right-column sections: summary is always right, payment & notes go right
  const rightKeys = new Set(['payment', 'notes'])
  const leftSections = visibleSections.filter(k => !rightKeys.has(k))
  const rightSections = visibleSections.filter(k => rightKeys.has(k))

  const handleVinDetected = async (vin: string) => {
    setShowScanner(false)
    setVehicle(v => ({ ...v, vin }))

    if (isLikelyVin(vin)) {
      try {
        const info = await decodeVin(vin)
        if (info) {
          setVehicle(v => ({ ...v, vin, year: info.year, make: info.make, model: info.model }))
        }
      } catch { /* ignore */ }
    }
  }

  // Determine which fields are required based on visible sections
  const needsCustomer = visibleSections.includes('customer')
  const needsPayment = visibleSections.includes('payment')
  const needsServices = visibleSections.includes('services')

  const handleSendInvite = async () => {
    if (!savedCustomer?.email || !profile?.business_id) return
    setInviteLoading(true)
    setInviteError('')
    try {
      const result = await inviteCustomer(savedCustomer.email, profile.business_id, savedCustomer.id)
      setInviteSent(true)
      if (result.alreadyExists) {
        setInviteError('')
      }
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invite')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleStartJob = async () => {
    if (!jobId || !profile?.id) return
    setJobStarting(true)
    try {
      await startJob(jobId, profile.id)
      await hapticSuccess()
      setJobStarted(true)
    } catch (err: any) {
      await hapticError()
      alert('Error starting job: ' + err.message)
    } finally {
      setJobStarting(false)
    }
  }

  const handleSubmit = async () => {
    if (needsCustomer && (!customer.name || !customer.phone)) {
      alert('Please fill in customer name and phone.')
      return
    }
    if (needsServices && cart.length === 0) {
      alert('Please add at least one service.')
      return
    }
    if (needsPayment && !paymentMethod) {
      alert('Please select a payment method.')
      return
    }

    setSubmitting(true)
    try {
      const intake = await createIntake(
        needsCustomer
          ? { name: customer.name, phone: customer.phone, email: customer.email || null, company: customer.company || null }
          : { name: 'Walk-in', phone: '', email: null },
        {
          vin: vehicle.vin || undefined,
          year: vehicle.year ? parseInt(vehicle.year) : undefined,
          make: vehicle.make || undefined,
          model: vehicle.model || undefined,
          color: vehicle.color || undefined,
          license_plate: vehicle.license_plate || undefined,
        },
        cart,
        paymentMethod || 'cash',
        [notes, ...Object.entries(customFields).filter(([,v]) => v).map(([k,v]) => `${config.sections[k]?.label || k}: ${v}`)].filter(Boolean).join('\n'),
        user?.id,
        profile?.business_id
      )

      setSavedIntakeId(intake.id)

      // Query for the auto-created job linked to this intake
      const { data: jobRow } = await supabase
        .from('jobs')
        .select('id')
        .eq('intake_id', intake.id)
        .maybeSingle()
      if (jobRow) setJobId(jobRow.id)

      // Upload before photos if any were added
      if (beforePhotos.length > 0 && jobRow && profile?.business_id) {
        for (const file of beforePhotos) {
          await uploadJobPhoto(jobRow.id, profile.business_id, file, 'before')
        }
      }

      // Fetch the saved customer record to check for invite eligibility
      if (needsCustomer && customer.phone && profile?.business_id) {
        const { data: cust } = await supabase
          .from('customers')
          .select('*')
          .eq('phone', customer.phone)
          .eq('business_id', profile.business_id)
          .maybeSingle()
        setSavedCustomer(cust)
      }

      await hapticSuccess()
      setSuccess(true)
      setInviteSent(false)
      setInviteError('')
      refreshCustomers()

      // Only auto-reset if no invite prompt and no start-job button shown
      const hasInvitePrompt = needsCustomer && customer.email
      const hasStartJobBtn = profile?.role === 'user' && jobRow
      if (!hasInvitePrompt && !hasStartJobBtn) {
        setTimeout(() => {
          setVehicle({ vin: '', year: '', make: '', model: '', color: '', license_plate: '' })
          setCustomer({ name: '', phone: '', email: '', company: '' })
          setCart([])
          setPaymentMethod(null)
          setNotes('')
          setCustomFields({})
          setBeforePhotos([])
          setSuccess(false)
          setSavedCustomer(null)
          setSavedIntakeId(null)
          setJobId(null)
          setJobStarted(false)
        }, 2200)
      }
    } catch (err: any) {
      await hapticError()
      alert('Error saving intake: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Helper to render extra custom fields added to a built-in section
  const renderExtraFields = (sectionKey: string) => {
    const extras = extraFieldsFor(sectionKey)
    if (extras.length === 0) return null
    return (
      <div className="mt-3 space-y-3">
        {extras.map(field => (
          <div key={field.key}>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">
              {field.label}{field.required ? ' *' : ''}
            </label>
            {field.fieldType === 'textarea' ? (
              <textarea
                value={customFields[field.key] || ''}
                onChange={e => setCustomFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder={`Enter ${field.label.toLowerCase()}...`}
              />
            ) : field.fieldType === 'select' && field.options ? (
              <select
                value={customFields[field.key] || ''}
                onChange={e => setCustomFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                className={inputClass}
              >
                <option value="">Select...</option>
                {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            ) : field.fieldType === 'checkbox' ? (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customFields[field.key] === 'yes'}
                  onChange={e => setCustomFields(prev => ({ ...prev, [field.key]: e.target.checked ? 'yes' : '' }))}
                  className="rounded border-zinc-300 text-red-600"
                />
                <span className="text-sm text-zinc-700">{field.label}</span>
              </label>
            ) : (
              <input
                type={field.fieldType === 'number' ? 'number' : field.fieldType === 'tel' ? 'tel' : field.fieldType === 'email' ? 'email' : 'text'}
                value={customFields[field.key] || ''}
                onChange={e => setCustomFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                className={inputClass}
                placeholder={`Enter ${field.label.toLowerCase()}...`}
              />
            )}
          </div>
        ))}
      </div>
    )
  }

  // Wrap section content with edit icon (admin only)
  const wrapSection = (key: IntakeSectionKey, content: React.ReactNode) => (
    <div key={key} className="glass rounded-2xl p-4 md:p-5 relative group/section">
      {isAdmin && (
        <button
          onClick={() => setEditingSection(key)}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-zinc-300 opacity-0 group-hover/section:opacity-100 hover:bg-zinc-100 hover:text-zinc-500 transition-all z-20"
          title="Edit section"
        >
          <Pencil size={12} />
        </button>
      )}
      {content}
    </div>
  )

  // Render a section by key
  const renderSection = (key: IntakeSectionKey) => {
    const def = config.sections[key]
    if (!def) return null

    switch (key) {
      case 'vehicle':
        return wrapSection(key,
          <>
            <VehicleForm
              value={vehicle}
              onChange={setVehicle}
              onScanClick={() => setShowScanner(true)}
              hiddenFields={hiddenFieldsFor('vehicle')}
            />
            {renderExtraFields('vehicle')}
          </>
        )
      case 'customer':
        return wrapSection(key,
          <>
            <CustomerForm
              customers={customers}
              value={customer}
              onChange={setCustomer}
              hiddenFields={hiddenFieldsFor('customer')}
            />
            {renderExtraFields('customer')}
          </>
        )
      case 'services':
        return wrapSection(key,
          servicesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-red-600" />
            </div>
          ) : (
            <ServicePicker
              services={services}
              cart={cart}
              onCartChange={setCart}
            />
          )
        )
      case 'payment':
        return wrapSection(key,
          <PaymentSelector value={paymentMethod} onChange={setPaymentMethod} fields={getSectionFields('payment', def)} />
        )
      case 'notes':
        return wrapSection(key,
          <>
            <h3 className="text-[13px] font-semibold text-zinc-800 flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
                <FileText size={13} className="text-amber-500" />
              </div>
              {def.label}
            </h3>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className={`${inputClass} resize-none`}
              rows={3}
              placeholder="Optional notes about the vehicle or services..."
            />
          </>
        )
      default:
        // Custom section — render based on fieldType
        if (def.type === 'custom') {
          return wrapSection(key,
            <>
              <h3 className="text-[13px] font-semibold text-zinc-800 mb-3">{def.label}</h3>
              {def.fieldType === 'textarea' ? (
                <textarea
                  value={customFields[key] || ''}
                  onChange={e => setCustomFields(prev => ({ ...prev, [key]: e.target.value }))}
                  className={`${inputClass} resize-none`}
                  rows={3}
                  placeholder={`Enter ${def.label.toLowerCase()}...`}
                />
              ) : def.fieldType === 'select' && def.options ? (
                <select
                  value={customFields[key] || ''}
                  onChange={e => setCustomFields(prev => ({ ...prev, [key]: e.target.value }))}
                  className={inputClass}
                >
                  <option value="">Select...</option>
                  {def.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : def.fieldType === 'checkbox' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customFields[key] === 'yes'}
                    onChange={e => setCustomFields(prev => ({ ...prev, [key]: e.target.checked ? 'yes' : '' }))}
                    className="rounded border-zinc-300 text-red-600"
                  />
                  <span className="text-sm text-zinc-700">{def.label}</span>
                </label>
              ) : (
                <input
                  type={def.fieldType === 'number' ? 'number' : 'text'}
                  value={customFields[key] || ''}
                  onChange={e => setCustomFields(prev => ({ ...prev, [key]: e.target.value }))}
                  className={inputClass}
                  placeholder={`Enter ${def.label.toLowerCase()}...`}
                />
              )}
            </>
          )
        }
        return null
    }
  }

  const resetForm = () => {
    setVehicle({ vin: '', year: '', make: '', model: '', color: '', license_plate: '' })
    setCustomer({ name: '', phone: '', email: '', company: '' })
    setCart([])
    setPaymentMethod(null)
    setNotes('')
    setCustomFields({})
    setBeforePhotos([])
    setSuccess(false)
    setSavedCustomer(null)
    setSavedIntakeId(null)
    setJobId(null)
    setJobStarted(false)
    setInviteSent(false)
    setInviteError('')
  }

  if (success) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center max-w-sm w-full">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-emerald-500/25">
            <CheckCircle size={36} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900">
            {jobStarted ? 'Job Started!' : 'Intake Saved!'}
          </h2>
          <p className="text-zinc-400 mt-2 text-sm">
            {jobStarted
              ? 'You are now working on this vehicle.'
              : savedCustomer && savedCustomer.email && !savedCustomer.profile_id
                ? 'Would you like to invite this customer?'
                : profile?.role === 'user' && jobId
                  ? 'Ready to start working on this vehicle?'
                  : 'Preparing new intake form...'}
          </p>

          {/* Start Job button — only for tech role with a queued job */}
          {profile?.role === 'user' && jobId && !jobStarted && (
            <div className="mt-4">
              <button
                onClick={handleStartJob}
                disabled={jobStarting || hasActiveJob}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-red-700/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                title={hasActiveJob ? 'Finish current job first' : undefined}
              >
                {jobStarting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Start Job
                  </>
                )}
              </button>
              {hasActiveJob && (
                <p className="text-xs text-zinc-400 mt-2">Finish current job first</p>
              )}
            </div>
          )}

          {/* Job started confirmation */}
          {jobStarted && (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 mt-4 text-sm text-emerald-700 font-medium">
              Job is now in progress!
            </div>
          )}

          {savedCustomer && savedCustomer.email && !savedCustomer.profile_id && !inviteSent && (
            <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-5 mt-4 text-left">
              <h3 className="font-semibold text-zinc-900 mb-1">Invite {savedCustomer.name}?</h3>
              <p className="text-sm text-zinc-500 mb-3">
                Send an account invite to {savedCustomer.email} so they can track bookings and view invoices.
              </p>
              <button
                onClick={handleSendInvite}
                disabled={inviteLoading}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold"
              >
                {inviteLoading ? 'Sending...' : 'Send Invite'}
              </button>
              {inviteError && <p className="text-red-500 text-xs mt-2">{inviteError}</p>}
            </div>
          )}
          {inviteSent && (
            <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 mt-4 text-sm text-emerald-700 font-medium">
              Invite sent to {savedCustomer?.email}!
            </div>
          )}

          {/* Show "Start New Intake" when there's a reason to stay on this screen */}
          {(jobId || (savedCustomer && savedCustomer.email && !savedCustomer.profile_id)) && (
            <button
              onClick={resetForm}
              className="mt-4 px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium hover:bg-zinc-50 transition-colors"
            >
              Start New Intake
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {showScanner && (
        <BarkoderScanner
          onClose={() => setShowScanner(false)}
          onDetected={handleVinDetected}
          onFail={() => setShowScanner(false)}
        />
      )}

      {editingSection && config.sections[editingSection] && (
        <SectionEditModal
          sectionKey={editingSection}
          section={config.sections[editingSection]}
          onSave={(updated) => handleSectionEdit(editingSection, updated)}
          onDelete={config.sections[editingSection].type === 'custom' ? () => handleDeleteSection(editingSection) : undefined}
          onClose={() => setEditingSection(null)}
        />
      )}

      <div className="p-4 md:p-6">
        <div className="mb-5">
          <h2 className="text-lg md:text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Car size={18} className="text-red-600" />
            New Vehicle Intake
          </h2>
          <p className="text-[12px] md:text-[13px] text-zinc-400 mt-0.5">Scan VIN or enter details manually</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left: Dynamic sections */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {leftSections.map(key => renderSection(key))}
          </div>

          {/* Right: Summary + dynamic right sections + Submit */}
          <div className="space-y-4 md:space-y-6">
            {needsServices && (
              <div className="glass rounded-2xl p-4 md:p-5">
                <IntakeSummary cart={cart} onCartChange={setCart} />
              </div>
            )}

            {rightSections.map(key => renderSection(key))}

            <button
              onClick={handleSubmit}
              disabled={submitting || (needsServices && cart.length === 0) || (needsPayment && !paymentMethod) || (needsCustomer && (!customer.name || !customer.phone))}
              className="w-full bg-gradient-to-r from-red-700 to-red-600 text-white py-3 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-red-700/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                `Save Intake · $${cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0).toFixed(2)}`
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
