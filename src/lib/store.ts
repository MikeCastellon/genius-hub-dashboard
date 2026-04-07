import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import {
  Profile, Business, Service, Customer, CustomerNote, VehicleIntake,
  CartItem, PaymentMethod, UserRole,
  Invoice, InvoiceItem, Appointment, BusinessHours, Shift, TimeEntry,
  Certificate, CertificatePhoto, Vehicle, WarrantyClaim,
  BusinessType, DETAIL_TABLE_MAP,
  Job, JobPhoto,
  BusinessSettings, IntakeConfig, DEFAULT_INTAKE_CONFIG,
  FormTemplate, FormSubmission, Expense,
  RepairLookup, MaintenanceLookup, RecallLookup, RepairGuide,
} from './types'

const isConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL
  return url && url !== 'your-supabase-url-here'
}

// ============ Auth ============

export function useAuth() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // If Supabase not configured, skip auth and show login
    if (!isConfigured()) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    // onAuthStateChange is synchronous in the Supabase SDK
    const result = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    }) as any

    const subscription = result?.data?.subscription
    return () => subscription?.unsubscribe?.()
  }, [])

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*, business:businesses(*)')
      .eq('id', userId)
      .maybeSingle()
    setProfile(data)
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }

  return { user, profile, loading, signIn, signUp, signOut, resetPassword }
}

// ============ Services ============

export function useServices() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConfigured()) { setLoading(false); return }
    supabase
      .from('services')
      .select('*')
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        setServices(data || [])
        setLoading(false)
      })
  }, [])

  return { services, loading }
}

export function useAllServices() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (!isConfigured()) { setLoading(false); return }
    supabase
      .from('services')
      .select('*')
      .order('name')
      .then(({ data }) => {
        setServices(data || [])
        setLoading(false)
      })
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { services, loading, refresh }
}

export async function createService(service: Omit<Service, 'id' | 'created_at'>) {
  const { error } = await supabase.from('services').insert(service)
  if (error) throw error
}

export async function updateService(id: string, updates: Partial<Service>) {
  const { error } = await supabase.from('services').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteService(id: string) {
  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) throw error
}

// ============ Customers ============

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])

  const refresh = useCallback(async () => {
    if (!isConfigured()) return
    const { data } = await supabase.from('customers').select('*').order('name')
    setCustomers(data || [])
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { customers, refresh }
}

export async function upsertCustomer(
  cust: { name: string; phone: string; email: string | null; address?: string | null; company?: string | null; vehicle_year?: string | null; vehicle_make?: string | null; vehicle_model?: string | null; vehicle_color?: string | null },
  businessId?: string
): Promise<Customer> {
  if (!isConfigured()) {
    return { ...cust, id: `local-${Date.now()}`, address: cust.address || null, company: cust.company || null, vehicle_year: cust.vehicle_year || null, vehicle_make: cust.vehicle_make || null, vehicle_model: cust.vehicle_model || null, vehicle_color: cust.vehicle_color || null, business_id: businessId || null, profile_id: null, avatar_url: null, total_spend: 0, last_visit: null, tags: [], created_at: new Date().toISOString() }
  }

  const query = supabase.from('customers').select('*').eq('phone', cust.phone)
  if (businessId) query.eq('business_id', businessId)
  const { data: existing } = await query.maybeSingle()

  if (existing) {
    const updates: Record<string, any> = { name: cust.name, email: cust.email || existing.email }
    if (cust.address !== undefined) updates.address = cust.address
    if (cust.company !== undefined) updates.company = cust.company
    if (cust.vehicle_year !== undefined) updates.vehicle_year = cust.vehicle_year
    if (cust.vehicle_make !== undefined) updates.vehicle_make = cust.vehicle_make
    if (cust.vehicle_model !== undefined) updates.vehicle_model = cust.vehicle_model
    if (cust.vehicle_color !== undefined) updates.vehicle_color = cust.vehicle_color
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('customers')
    .insert({ ...cust, business_id: businessId || null })
    .select()
    .single()
  if (error) throw error
  return data
}

// ============ Vehicle Intakes ============

export async function createIntake(
  customer: { name: string; phone: string; email: string | null; company?: string | null },
  vehicle: { vin?: string; year?: number; make?: string; model?: string; color?: string; license_plate?: string },
  cart: CartItem[],
  paymentMethod: PaymentMethod,
  notes: string,
  userId?: string,
  businessId?: string | null
): Promise<VehicleIntake> {
  if (!isConfigured()) {
    alert('Supabase not configured. Demo mode.')
    return {
      id: `local-${Date.now()}`,
      customer_id: '',
      vin: vehicle.vin || null,
      year: vehicle.year || null,
      make: vehicle.make || null,
      model: vehicle.model || null,
      color: vehicle.color || null,
      license_plate: vehicle.license_plate || null,
      payment_method: paymentMethod,
      subtotal: cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
      notes,
      technician_id: null,
      business_id: null,
      created_at: new Date().toISOString(),
    }
  }

  const savedCustomer = await upsertCustomer(customer, businessId || undefined)
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  const { data: intake, error: intakeError } = await supabase
    .from('vehicle_intakes')
    .insert({
      customer_id: savedCustomer.id,
      vin: vehicle.vin || null,
      year: vehicle.year || null,
      make: vehicle.make || null,
      model: vehicle.model || null,
      color: vehicle.color || null,
      license_plate: vehicle.license_plate || null,
      payment_method: paymentMethod,
      subtotal,
      notes: notes || null,
      technician_id: userId || null,
      business_id: businessId || null,
    })
    .select()
    .single()

  if (intakeError) throw intakeError

  const items = cart.map(item => ({
    intake_id: intake.id,
    service_id: item.service.id,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total: item.unitPrice * item.quantity,
  }))

  const { error: itemsError } = await supabase.from('intake_services').insert(items)
  if (itemsError) throw itemsError

  // Auto-create a queued job for this intake
  if (isConfigured() && intake && businessId) {
    await createJob({
      business_id: businessId,
      intake_id: intake.id,
      customer_id: savedCustomer.id,
    })
  }

  return intake
}

export function useIntakes() {
  const [intakes, setIntakes] = useState<VehicleIntake[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isConfigured()) { setLoading(false); return }
    const { data, error } = await supabase
      .from('vehicle_intakes')
      .select('*, customer:customers(*), intake_services(*, service:services(*)), technician:profiles(display_name)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('useIntakes error:', error)
      const fallback = await supabase
        .from('vehicle_intakes')
        .select('*, customer:customers(*), intake_services(*, service:services(*))')
        .order('created_at', { ascending: false })
      setIntakes(fallback.data || [])
    } else {
      setIntakes(data || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { intakes, loading, refresh }
}

// ============ Admin: Users ============

export function useAdminUsers() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('approved')
      .order('display_name')
    setUsers(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { users, loading, refresh }
}

export async function approveUser(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ approved: true })
    .eq('id', userId)
  if (error) throw error
}

export async function revokeUser(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ approved: false })
    .eq('id', userId)
  if (error) throw error
}

export async function setUserRole(userId: string, role: UserRole) {
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
  if (error) throw error
}

export async function setUserBusiness(userId: string, businessId: string | null) {
  const { error } = await supabase
    .from('profiles')
    .update({ business_id: businessId })
    .eq('id', userId)
  if (error) throw error
}

// ============ Businesses (Super Admin) ============

export function useBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('businesses')
      .select('*')
      .order('name')
    setBusinesses(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return { businesses, loading, refresh }
}

export async function createBusiness(name: string) {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const { error } = await supabase.from('businesses').insert({ name: name.trim(), slug })
  if (error) throw error
}

export async function updateBusiness(id: string, updates: Partial<Pick<Business, 'name' | 'slug' | 'logo_url' | 'primary_color' | 'website' | 'phone' | 'address' | 'signature_url'>>) {
  const { error } = await supabase.from('businesses').update(updates).eq('id', id)
  if (error) throw error
}

export async function uploadBusinessLogo(businessId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'png'
  const path = `${businessId}/logo_${Date.now()}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('business-logos')
    .upload(path, file, { contentType: file.type, upsert: true })
  if (uploadError) throw uploadError
  const { data } = supabase.storage.from('business-logos').getPublicUrl(path)
  return data.publicUrl
}

export async function deleteBusiness(id: string) {
  const { error } = await supabase.from('businesses').delete().eq('id', id)
  if (error) throw error
}

// ============ Invoices ============

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isConfigured()) { setLoading(false); return }
    const { data } = await supabase
      .from('invoices')
      .select('*, customer:customers(*), items:invoice_items(*)')
      .order('created_at', { ascending: false })
    setInvoices(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { invoices, loading, refresh }
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const { data } = await supabase
    .from('invoices')
    .select('*, customer:customers(*), items:invoice_items(*)')
    .eq('id', id)
    .maybeSingle()
  return data
}

export async function createInvoice(invoice: Partial<Invoice>, items: Omit<InvoiceItem, 'id' | 'invoice_id'>[]): Promise<Invoice> {
  // get next invoice number for this business
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', invoice.business_id!)
  const num = String((count || 0) + 1).padStart(4, '0')
  const { data, error } = await supabase
    .from('invoices')
    .insert({ ...invoice, invoice_number: `INV-${num}` })
    .select()
    .single()
  if (error) throw error
  if (items.length) {
    const rows = items.map(i => ({ ...i, invoice_id: data.id }))
    const { error: ie } = await supabase.from('invoice_items').insert(rows)
    if (ie) throw ie
  }
  return data
}

export async function updateInvoice(id: string, updates: Partial<Invoice>) {
  const { error } = await supabase
    .from('invoices')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function updateInvoiceItems(invoiceId: string, items: Omit<InvoiceItem, 'id' | 'invoice_id'>[]) {
  await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)
  if (items.length) {
    const rows = items.map(i => ({ ...i, invoice_id: invoiceId }))
    const { error } = await supabase.from('invoice_items').insert(rows)
    if (error) throw error
  }
}

// ============ Appointments ============

export function useAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isConfigured()) { setLoading(false); return }
    const { data } = await supabase
      .from('appointments')
      .select('*, technician:profiles(display_name)')
      .order('scheduled_at', { ascending: true })
    setAppointments(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { appointments, loading, refresh }
}

export async function createAppointment(appt: Omit<Appointment, 'id' | 'created_at' | 'technician'>): Promise<Appointment> {
  const { data, error } = await supabase.from('appointments').insert(appt).select().single()
  if (error) throw error
  return data
}

export async function updateAppointment(id: string, updates: Partial<Appointment>) {
  const { error } = await supabase.from('appointments').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteAppointment(id: string) {
  const { error } = await supabase.from('appointments').delete().eq('id', id)
  if (error) throw error
}

// Public: fetch business data for booking page (no auth required)
export async function getPublicBookingData(slug: string) {
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, logo_url, primary_color, website, phone, address')
    .eq('slug', slug)
    .maybeSingle()
  if (!business) return null
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', business.id)
    .eq('active', true)
    .order('name')
  const { data: hours } = await supabase
    .from('business_hours')
    .select('*')
    .eq('business_id', business.id)
    .order('day_of_week')
  const { data: booked } = await supabase
    .from('appointments')
    .select('scheduled_at, duration_minutes')
    .eq('business_id', business.id)
    .in('status', ['pending', 'confirmed', 'in_progress'])
    .gte('scheduled_at', new Date().toISOString())
  return { business, services: services || [], hours: hours || [], booked: booked || [] }
}

// ============ Business Hours ============

export function useBusinessHours() {
  const [hours, setHours] = useState<BusinessHours[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isConfigured()) { setLoading(false); return }
    const { data } = await supabase
      .from('business_hours')
      .select('*')
      .order('day_of_week')
    setHours(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { hours, loading, refresh }
}

export async function upsertBusinessHours(bh: Omit<BusinessHours, 'id'>[]) {
  const { error } = await supabase.from('business_hours').upsert(bh, { onConflict: 'business_id,day_of_week' })
  if (error) throw error
}

// ============ Shifts ============

export function useShifts() {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isConfigured()) { setLoading(false); return }
    const { data } = await supabase
      .from('shifts')
      .select('*, employee:profiles(display_name)')
      .order('scheduled_start', { ascending: true })
    setShifts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { shifts, loading, refresh }
}

export async function createShift(shift: Omit<Shift, 'id' | 'created_at' | 'employee'>) {
  const { error } = await supabase.from('shifts').insert(shift)
  if (error) throw error
}

export async function deleteShift(id: string) {
  const { error } = await supabase.from('shifts').delete().eq('id', id)
  if (error) throw error
}

// ============ Time Entries (Clock In/Out) ============

export function useTimeEntries() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isConfigured()) { setLoading(false); return }
    const { data } = await supabase
      .from('time_entries')
      .select('*, employee:profiles(display_name)')
      .order('clock_in', { ascending: false })
      .limit(200)
    setEntries(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { entries, loading, refresh }
}

export async function clockIn(employeeId: string, businessId: string): Promise<TimeEntry> {
  const { data, error } = await supabase
    .from('time_entries')
    .insert({ employee_id: employeeId, business_id: businessId, clock_in: new Date().toISOString() })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function clockOut(entryId: string) {
  const clockOutTime = new Date().toISOString()
  const { data: entry } = await supabase
    .from('time_entries')
    .select('clock_in')
    .eq('id', entryId)
    .single()
  const hoursWorked = entry
    ? Math.round(((Date.now() - new Date(entry.clock_in).getTime()) / 3600000) * 100) / 100
    : null
  const { error } = await supabase
    .from('time_entries')
    .update({ clock_out: clockOutTime, hours_worked: hoursWorked })
    .eq('id', entryId)
  if (error) throw error
}

export async function getOpenTimeEntry(employeeId: string): Promise<TimeEntry | null> {
  const { data } = await supabase
    .from('time_entries')
    .select('*')
    .eq('employee_id', employeeId)
    .is('clock_out', null)
    .order('clock_in', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

// ============ Certificates (Certify) ============

export function useCertificates() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isConfigured()) { setLoading(false); return }
    const { data } = await supabase
      .from('certificates')
      .select('*, intake:vehicle_intakes(*, customer:customers(*)), technician:profiles(display_name), photos:certificate_photos(*), vehicle:vehicles(*), customer:customers(*), business:businesses(name, slug, logo_url, phone, address, website, signature_url)')
      .order('created_at', { ascending: false })
    setCertificates(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { certificates, loading, refresh }
}

export async function getCertificate(id: string): Promise<Certificate | null> {
  const { data } = await supabase
    .from('certificates')
    .select('*, intake:vehicle_intakes(*, customer:customers(*)), technician:profiles(display_name), photos:certificate_photos(*), vehicle:vehicles(*), customer:customers(*), business:businesses(name, slug, logo_url, phone, address, website, signature_url)')
    .eq('id', id)
    .maybeSingle()
  if (!data) return null

  // Load business-type-specific details if present
  if (data.business_type && data.id) {
    const tableName = DETAIL_TABLE_MAP[data.business_type as BusinessType]
    if (tableName) {
      const { data: details } = await supabase
        .from(tableName)
        .select('*')
        .eq('certificate_id', data.id)
        .maybeSingle()
      if (details) data.details = details
    }
  }

  // Load warranty claims
  const { data: claims } = await supabase
    .from('warranty_claims')
    .select('*')
    .eq('certificate_id', id)
    .order('claim_date', { ascending: false })
  if (claims) data.claims = claims

  return data
}

export async function getPublicCertificate(id: string): Promise<Certificate | null> {
  const { data } = await supabase
    .from('certificates')
    .select('*, intake:vehicle_intakes(id, vin, year, make, model, color, created_at, customer:customers(name)), technician:profiles(display_name), photos:certificate_photos(*), vehicle:vehicles(*), customer:customers(name), business:businesses(name, slug, logo_url, phone, address, website, signature_url)')
    .eq('id', id)
    .eq('is_public', true)
    .maybeSingle()
  if (!data) return null

  // Load public-facing details
  if (data.business_type && data.id) {
    const tableName = DETAIL_TABLE_MAP[data.business_type as BusinessType]
    if (tableName) {
      const { data: details } = await supabase
        .from(tableName)
        .select('*')
        .eq('certificate_id', data.id)
        .maybeSingle()
      if (details) data.details = details
    }
  }

  return data
}

export async function createCertificate(
  cert: Omit<Certificate, 'id' | 'certificate_number' | 'created_at' | 'updated_at' | 'intake' | 'customer' | 'technician' | 'photos'>
): Promise<Certificate> {
  // Generate next cert number
  const { count } = await supabase
    .from('certificates')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', cert.business_id)
  const num = String((count || 0) + 1).padStart(4, '0')

  const { data, error } = await supabase
    .from('certificates')
    .insert({ ...cert, certificate_number: `CERT-${num}` })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCertificate(id: string, updates: Partial<Certificate>) {
  const { error } = await supabase
    .from('certificates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function saveCustomerSignature(certId: string, signatureDataUrl: string): Promise<string> {
  // Convert data URL to blob
  const res = await fetch(signatureDataUrl)
  const blob = await res.blob()
  const path = `signatures/customer-${certId}-${Date.now()}.png`
  const { data, error: uploadErr } = await supabase.storage
    .from('certificate-photos')
    .upload(path, blob, { contentType: 'image/png', upsert: true })
  if (uploadErr) throw uploadErr
  const { data: urlData } = supabase.storage.from('certificate-photos').getPublicUrl(data.path)
  const url = urlData.publicUrl
  const { error } = await supabase
    .from('certificates')
    .update({ customer_signature_url: url })
    .eq('id', certId)
  if (error) throw error
  return url
}

export async function uploadCertificatePhoto(
  certificateId: string,
  businessId: string,
  file: File,
  photoType: CertificatePhoto['photo_type']
): Promise<CertificatePhoto> {
  const timestamp = Date.now()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${businessId}/${certificateId}/${photoType}_${timestamp}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('certificate-photos')
    .upload(path, file, { contentType: file.type })
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('certificate_photos')
    .insert({ certificate_id: certificateId, storage_path: path, photo_type: photoType })
    .select()
    .single()
  if (error) throw error
  return data
}

export function getCertificatePhotoUrl(storagePath: string): string {
  const { data } = supabase.storage.from('certificate-photos').getPublicUrl(storagePath)
  return data.publicUrl
}

// ============ Vehicles (Global) ============

export async function searchVehicles(query: string): Promise<Vehicle[]> {
  if (!query || query.length < 2) return []
  const { data } = await supabase
    .from('vehicles')
    .select('*')
    .ilike('vin', `%${query}%`)
    .order('updated_at', { ascending: false })
    .limit(10)
  return data || []
}

export async function upsertVehicle(vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .upsert(
      { ...vehicle, updated_at: new Date().toISOString() },
      { onConflict: 'vin' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function decodeVin(vin: string): Promise<{ year: number | null; make: string | null; model: string | null; trim: string | null } | null> {
  try {
    const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`)
    const json = await res.json()
    const results = json.Results || []
    const get = (id: number) => {
      const r = results.find((r: any) => r.VariableId === id)
      return r?.Value && r.Value !== 'Not Applicable' ? r.Value : null
    }
    return {
      year: get(29) ? parseInt(get(29)) : null,
      make: get(26),
      model: get(28),
      trim: get(38),
    }
  } catch {
    return null
  }
}

// ============ Warranty Certificates (New Flow) ============

export async function createWarrantyCertificate(params: {
  businessId: string
  businessType: BusinessType
  vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>
  customerId: string
  serviceDate: string
  warrantyDurationMonths: number
  warrantyMileageCap?: number | null
  odometerAtService?: number | null
  technicianId?: string | null
  technicianName?: string | null
  isPublic?: boolean
  notes?: string | null
  voidConditions: string[]
  details: Record<string, any>
  photos: { file: File; type: CertificatePhoto['photo_type'] }[]
}): Promise<Certificate> {
  // 1. Upsert vehicle
  const vehicle = await upsertVehicle(params.vehicle)

  // 2. Generate cert number via RPC
  const { data: certNumber, error: rpcError } = await supabase
    .rpc('generate_cert_number', { p_business_id: params.businessId })
  if (rpcError) throw rpcError

  // 3. Compute warranty expiry
  const serviceDate = new Date(params.serviceDate)
  const expiryDate = new Date(serviceDate)
  expiryDate.setMonth(expiryDate.getMonth() + params.warrantyDurationMonths)
  const expiryStr = expiryDate.toISOString().split('T')[0]

  // 4. Insert certificate
  const { data: cert, error: certError } = await supabase
    .from('certificates')
    .insert({
      business_id: params.businessId,
      certificate_number: certNumber,
      business_type: params.businessType,
      vehicle_id: vehicle.id,
      customer_id: params.customerId,
      service_date: params.serviceDate,
      warranty_duration_months: params.warrantyDurationMonths,
      warranty_years: Math.ceil(params.warrantyDurationMonths / 12),
      warranty_expiry: expiryStr,
      warranty_mileage_cap: params.warrantyMileageCap || null,
      odometer_at_service: params.odometerAtService || null,
      technician_id: params.technicianId || null,
      technician_name: params.technicianName || null,
      status: 'pending',
      is_public: false,
      notes: params.notes || null,
      void_conditions: params.voidConditions,
      void_reason: null,
      // Legacy fields null for new flow
      intake_id: null,
      coating_brand: null,
      coating_product: null,
      odometer: null,
    })
    .select()
    .single()
  if (certError) throw certError

  // 5. Insert detail row into the appropriate table
  const tableName = DETAIL_TABLE_MAP[params.businessType]
  const { error: detailError } = await supabase
    .from(tableName)
    .insert({ certificate_id: cert.id, ...params.details })
  if (detailError) throw detailError

  // 6. Upload photos
  for (const photo of params.photos) {
    await uploadCertificatePhoto(cert.id, params.businessId, photo.file, photo.type)
  }

  return cert
}

// ============ VIN History (Public) ============

export async function getVinHistory(vin: string): Promise<Certificate[]> {
  const { data } = await supabase
    .from('certificates')
    .select('*, vehicle:vehicles!inner(*), business:businesses(name, slug, logo_url, phone, address, website, signature_url), customer:customers(name)')
    .eq('vehicles.vin', vin.toUpperCase())
    .eq('is_public', true)
    .order('service_date', { ascending: false })
  return data || []
}

// ============ Warranty Claims ============

export function useWarrantyClaims(certificateId: string) {
  const [claims, setClaims] = useState<WarrantyClaim[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isConfigured() || !certificateId) { setLoading(false); return }
    const { data } = await supabase
      .from('warranty_claims')
      .select('*')
      .eq('certificate_id', certificateId)
      .order('claim_date', { ascending: false })
    setClaims(data || [])
    setLoading(false)
  }, [certificateId])

  useEffect(() => { refresh() }, [refresh])
  return { claims, loading, refresh }
}

export async function createWarrantyClaim(claim: Omit<WarrantyClaim, 'id' | 'created_at' | 'updated_at'>): Promise<WarrantyClaim> {
  const { data, error } = await supabase
    .from('warranty_claims')
    .insert(claim)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateWarrantyClaim(id: string, updates: Partial<WarrantyClaim>) {
  const { error } = await supabase
    .from('warranty_claims')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// ============ Business Settings (Intake Config) ============

export function useBusinessSettings() {
  const [settings, setSettings] = useState<BusinessSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isConfigured()) { setLoading(false); return }
    const { data } = await supabase
      .from('business_settings')
      .select('*')
      .limit(1)
      .maybeSingle()
    setSettings(data)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { settings, loading, refresh }
}

export function useIntakeConfig() {
  const { settings, loading, refresh } = useBusinessSettings()
  const config: IntakeConfig = settings?.intake_config || DEFAULT_INTAKE_CONFIG
  return { config, loading, refresh }
}

export async function upsertBusinessSettings(businessId: string, intakeConfig: IntakeConfig) {
  const { data: existing } = await supabase
    .from('business_settings')
    .select('id')
    .eq('business_id', businessId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('business_settings')
      .update({ intake_config: intakeConfig, updated_at: new Date().toISOString() })
      .eq('business_id', businessId)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('business_settings')
      .insert({ business_id: businessId, intake_config: intakeConfig })
    if (error) throw error
  }
}

// ============ Customer CRM ============

export function useCustomerDetail(customerId: string | null) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [notes, setNotes] = useState<CustomerNote[]>([])
  const [intakes, setIntakes] = useState<VehicleIntake[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!customerId || !isConfigured()) { setLoading(false); return }

    let custRes = await supabase.from('customers').select('*').eq('id', customerId).single()
    let cust = custRes.data

    // Auto-link: if customer has email but no profile_id, check if a profile exists
    if (cust && cust.email && !cust.profile_id) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', cust.email)
        .maybeSingle()
      if (existingProfile) {
        await supabase.from('customers').update({ profile_id: existingProfile.id }).eq('id', cust.id)
        cust = { ...cust, profile_id: existingProfile.id }
      }
    }

    const [notesRes, intakesRes, invoicesRes] = await Promise.all([
      supabase.from('customer_notes').select('*, author:profiles(display_name)').eq('customer_id', customerId).order('created_at', { ascending: false }),
      supabase.from('vehicle_intakes').select('*, customer:customers(*), intake_services(*, service:services(*))').eq('customer_id', customerId).order('created_at', { ascending: false }),
      supabase.from('invoices').select('*, items:invoice_items(*)').eq('customer_id', customerId).order('created_at', { ascending: false }),
    ])

    // Appointments need phone/email lookup
    let apptsData: Appointment[] = []
    if (cust) {
      const filters = [cust.phone ? `customer_phone.eq.${cust.phone}` : null, cust.email ? `customer_email.eq.${cust.email}` : null].filter(Boolean).join(',')
      if (filters) {
        const { data } = await supabase.from('appointments').select('*').or(filters).order('scheduled_at', { ascending: false })
        apptsData = data || []
      }
    }

    setCustomer(cust)
    setNotes(notesRes.data || [])
    setIntakes(intakesRes.data || [])
    setAppointments(apptsData)
    setInvoices(invoicesRes.data || [])
    setLoading(false)
  }, [customerId])

  useEffect(() => { refresh() }, [refresh])
  return { customer, notes, intakes, appointments, invoices, loading, refresh }
}

export async function addCustomerNote(customerId: string, authorId: string, body: string) {
  const { data, error } = await supabase
    .from('customer_notes')
    .insert({ customer_id: customerId, author_id: authorId, body })
    .select('*, author:profiles(display_name)')
    .single()
  if (error) throw error
  return data
}

export async function updateCustomerFields(customerId: string, fields: Record<string, any>) {
  const { error } = await supabase
    .from('customers')
    .update(fields)
    .eq('id', customerId)
  if (error) throw error
}

export async function updateCustomerTags(customerId: string, tags: string[]) {
  const { error } = await supabase
    .from('customers')
    .update({ tags })
    .eq('id', customerId)
  if (error) throw error
}

export async function inviteCustomer(email: string, businessId: string, customerId?: string) {
  // First check if a profile with this email already exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingProfile) {
    // Account already exists — just link the customer record to this profile
    if (customerId) {
      await supabase
        .from('customers')
        .update({ profile_id: existingProfile.id })
        .eq('id', customerId)
    }
    return { user: existingProfile, alreadyExists: true }
  }

  // No account — create one with random password + send reset email
  const tempPassword = crypto.randomUUID() + '!Aa1'
  const { data, error } = await supabase.auth.signUp({
    email,
    password: tempPassword,
    options: {
      data: { role: 'customer', business_id: businessId },
    },
  })
  if (error) throw error

  // Link the new profile to the customer record
  if (customerId && data.user) {
    await supabase
      .from('customers')
      .update({ profile_id: data.user.id })
      .eq('id', customerId)
  }

  // Send password reset email so customer can set their own password
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (resetError) throw resetError

  return { ...data, alreadyExists: false }
}

// ============ Customer Portal ============

export function useMyCustomerRecord() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConfigured()) { setLoading(false); return }
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('profile_id', user.id)
        .maybeSingle()
      setCustomer(data)
      setLoading(false)
    })
  }, [])

  return { customer, loading }
}

export function useMyAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isConfigured()) { setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: customer } = await supabase
      .from('customers')
      .select('phone, email')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (!customer) { setLoading(false); return }

    const filters = [customer.phone ? `customer_phone.eq.${customer.phone}` : null, customer.email ? `customer_email.eq.${customer.email}` : null].filter(Boolean).join(',')
    if (!filters) { setLoading(false); return }

    const { data } = await supabase
      .from('appointments')
      .select('*')
      .or(filters)
      .order('scheduled_at', { ascending: true })

    setAppointments(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { appointments, loading, refresh }
}

export function useMyIntakes() {
  const [intakes, setIntakes] = useState<VehicleIntake[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isConfigured()) { setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (!customer) { setLoading(false); return }

    const { data } = await supabase
      .from('vehicle_intakes')
      .select('*, intake_services(*, service:services(*))')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })

    setIntakes(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { intakes, loading, refresh }
}

export function useMyInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isConfigured()) { setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (!customer) { setLoading(false); return }

    const { data } = await supabase
      .from('invoices')
      .select('*, items:invoice_items(*)')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })

    setInvoices(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { invoices, loading, refresh }
}

// ============ Jobs ============

export function useJobs(businessId: string | null | undefined, opts?: { technicianId?: string | null; role?: string | null }) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const techId = opts?.technicianId
  const role = opts?.role

  const refresh = useCallback(async () => {
    if (!isConfigured() || !businessId) { setLoading(false); return }
    let query = supabase
      .from('jobs')
      .select('*, customer:customers(*), intake:vehicle_intakes(*, intake_services(*, service:services(name))), appointment:appointments(*), technician:profiles!jobs_technician_id_fkey(display_name)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })

    // Techs (role=user) only see their own jobs + unassigned queued jobs
    if (role === 'user' && techId) {
      query = query.or(`technician_id.eq.${techId},technician_id.is.null`)
    }

    const { data } = await query
    setJobs(data || [])
    setLoading(false)
  }, [businessId, techId, role])

  useEffect(() => { refresh() }, [refresh])
  return { jobs, loading, refresh }
}

export function useActiveJob(technicianId: string | null | undefined) {
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isConfigured() || !technicianId) { setLoading(false); return }
    const { data } = await supabase
      .from('jobs')
      .select('*, customer:customers(*), intake:vehicle_intakes(*), appointment:appointments(*)')
      .eq('technician_id', technicianId)
      .eq('status', 'in_progress')
      .maybeSingle()
    setJob(data)
    setLoading(false)
  }, [technicianId])

  useEffect(() => { refresh() }, [refresh])
  return { job, loading, refresh }
}

export async function createJob(params: {
  business_id: string
  intake_id?: string | null
  appointment_id?: string | null
  customer_id: string
  technician_id?: string | null
}): Promise<Job> {
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      business_id: params.business_id,
      intake_id: params.intake_id || null,
      appointment_id: params.appointment_id || null,
      customer_id: params.customer_id,
      technician_id: params.technician_id || null,
      status: 'queued',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function startJob(jobId: string, technicianId: string) {
  const { error } = await supabase
    .from('jobs')
    .update({
      status: 'in_progress',
      started_at: new Date().toISOString(),
      technician_id: technicianId,
    })
    .eq('id', jobId)
  if (error) throw error
}

export async function finishJob(jobId: string, notes?: string) {
  const { data: job, error: fetchError } = await supabase
    .from('jobs')
    .select('started_at')
    .eq('id', jobId)
    .single()
  if (fetchError) throw fetchError

  const now = new Date()
  const startedAt = job.started_at ? new Date(job.started_at) : now
  const durationMinutes = Math.round((now.getTime() - startedAt.getTime()) / 60000)

  const { error } = await supabase
    .from('jobs')
    .update({
      status: 'completed',
      finished_at: now.toISOString(),
      duration_minutes: durationMinutes,
      notes: notes || null,
    })
    .eq('id', jobId)
  if (error) throw error
}

export async function cancelJob(jobId: string) {
  const { error } = await supabase
    .from('jobs')
    .update({
      status: 'queued',
      started_at: null,
      finished_at: null,
      duration_minutes: null,
      technician_id: null,
    })
    .eq('id', jobId)
  if (error) throw error
}

export async function uploadJobPhoto(
  jobId: string,
  businessId: string,
  file: File,
  photoType: JobPhoto['photo_type']
): Promise<JobPhoto> {
  const timestamp = Date.now()
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${businessId}/${jobId}/${photoType}_${timestamp}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('job-photos')
    .upload(path, file, { contentType: file.type })
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('job_photos')
    .insert({ job_id: jobId, business_id: businessId, storage_path: path, photo_type: photoType })
    .select()
    .single()
  if (error) throw error
  return data
}

export function getJobPhotoUrl(storagePath: string): string {
  const { data } = supabase.storage.from('job-photos').getPublicUrl(storagePath)
  return data.publicUrl
}

export function useJobPhotos(jobId: string | null | undefined) {
  const [photos, setPhotos] = useState<JobPhoto[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isConfigured() || !jobId) { setLoading(false); return }
    const { data } = await supabase
      .from('job_photos')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
    setPhotos(data || [])
    setLoading(false)
  }, [jobId])

  useEffect(() => { refresh() }, [refresh])
  return { photos, loading, refresh }
}

export function useCustomerPhotos(customerId: string | null | undefined) {
  const [photos, setPhotos] = useState<JobPhoto[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConfigured() || !customerId) { setLoading(false); return }

    ;(async () => {
      const { data: customerJobs } = await supabase
        .from('jobs')
        .select('*')
        .eq('customer_id', customerId)
      const jobList = customerJobs || []
      setJobs(jobList)

      if (jobList.length === 0) {
        setPhotos([])
        setLoading(false)
        return
      }

      const jobIds = jobList.map(j => j.id)
      const { data: jobPhotos } = await supabase
        .from('job_photos')
        .select('*')
        .in('job_id', jobIds)
        .order('created_at', { ascending: false })
      setPhotos(jobPhotos || [])
      setLoading(false)
    })()
  }, [customerId])

  return { photos, jobs, loading }
}

// ============ Form Templates ============

export function useFormTemplates() {
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isConfigured()) { setLoading(false); return }
    const { data } = await supabase
      .from('form_templates')
      .select('*')
      .order('name')
    setTemplates(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { templates, loading, refresh }
}

export async function createFormTemplate(template: Omit<FormTemplate, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase.from('form_templates').insert(template).select().single()
  if (error) throw error
  if (!data) throw new Error('Form template was not created — check business assignment')
  return data
}

export async function updateFormTemplate(id: string, updates: Partial<FormTemplate>) {
  const { error } = await supabase
    .from('form_templates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteFormTemplate(id: string) {
  const { error } = await supabase.from('form_templates').delete().eq('id', id)
  if (error) throw error
}

// ============ Form Submissions ============

export function useFormSubmissions(templateId?: string) {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isConfigured()) { setLoading(false); return }
    let query = supabase
      .from('form_submissions')
      .select('*, form_template:form_templates(*), customer:customers(*)')
      .order('created_at', { ascending: false })
    if (templateId) query = query.eq('form_template_id', templateId)
    const { data, error } = await query
    if (error) console.error('useFormSubmissions error:', error)
    setSubmissions(data || [])
    setLoading(false)
  }, [templateId])

  useEffect(() => { refresh() }, [refresh])
  return { submissions, loading, refresh }
}

export async function createFormSubmission(submission: Omit<FormSubmission, 'id' | 'created_at' | 'form_template' | 'customer'>) {
  const { data, error } = await supabase.from('form_submissions').insert(submission).select().single()
  if (error) throw error
  if (!data) throw new Error('Form submission was not created — check business assignment')
  return data
}

export async function uploadFormFile(file: File, businessId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'png'
  const path = `${businessId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('form-uploads').upload(path, file, { contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from('form-uploads').getPublicUrl(path)
  return data.publicUrl
}

// ============ Public Forms ============

export async function getPublicFormTemplate(templateId: string): Promise<{ template: FormTemplate; business: any } | null> {
  const { data: template } = await supabase
    .from('form_templates')
    .select('*')
    .eq('id', templateId)
    .eq('status', 'active')
    .maybeSingle()
  if (!template) return null
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, slug, logo_url, primary_color')
    .eq('id', template.business_id)
    .maybeSingle()
  return { template, business }
}

export async function submitPublicForm(submission: {
  form_template_id: string
  business_id: string
  responses: Record<string, any>
  customer_id?: string | null
}) {
  const { data, error } = await supabase
    .from('form_submissions')
    .insert({
      ...submission,
      customer_id: submission.customer_id || null,
      intake_id: null,
      submitted_by: null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// ============ Expenses ============

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isConfigured()) { setLoading(false); return }
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })
    if (error) console.error('useExpenses error:', error)
    setExpenses(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { expenses, loading, refresh }
}

export async function createExpense(expense: Omit<Expense, 'id' | 'created_at' | 'creator'>) {
  const { data, error } = await supabase.from('expenses').insert(expense).select().single()
  if (error) throw error
  if (!data) throw new Error('Expense was not created — check business assignment')
  return data
}

export async function updateExpense(id: string, updates: Partial<Expense>) {
  const { error } = await supabase.from('expenses').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}

export async function uploadExpenseReceipt(file: File, businessId: string): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${businessId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('expense-receipts').upload(path, file, { contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from('expense-receipts').getPublicUrl(path)
  return data.publicUrl
}

// ── Repairs Module ──────────────────────────────────────────

export function useVehicle(vin: string | undefined) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (!isConfigured() || !vin) { setLoading(false); return }
    supabase
      .from('vehicles')
      .select('*')
      .eq('vin', vin)
      .maybeSingle()
      .then(({ data }) => {
        setVehicle(data)
        setLoading(false)
      })
  }, [vin])

  useEffect(() => { refresh() }, [refresh])

  return { vehicle, loading, refresh }
}

export function useRepairLookups(vehicleId: string | undefined) {
  const [repairs, setRepairs] = useState<RepairLookup[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (!isConfigured() || !vehicleId) { setLoading(false); return }
    supabase
      .from('repair_lookups')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRepairs((data || []) as RepairLookup[])
        setLoading(false)
      })
  }, [vehicleId])

  useEffect(() => { refresh() }, [refresh])

  return { repairs, loading, refresh }
}

export function useMaintenanceLookups(vehicleId: string | undefined) {
  const [maintenance, setMaintenance] = useState<MaintenanceLookup[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (!isConfigured() || !vehicleId) { setLoading(false); return }
    supabase
      .from('maintenance_lookups')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('due_mileage', { ascending: true })
      .then(({ data }) => {
        setMaintenance((data || []) as MaintenanceLookup[])
        setLoading(false)
      })
  }, [vehicleId])

  useEffect(() => { refresh() }, [refresh])

  return { maintenance, loading, refresh }
}

export function useRecallLookups(vehicleId: string | undefined) {
  const [recalls, setRecalls] = useState<RecallLookup[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (!isConfigured() || !vehicleId) { setLoading(false); return }
    supabase
      .from('recall_lookups')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRecalls((data || []) as RecallLookup[])
        setLoading(false)
      })
  }, [vehicleId])

  useEffect(() => { refresh() }, [refresh])

  return { recalls, loading, refresh }
}

export function useRepairGuides(vehicleId: string | undefined) {
  const [guides, setGuides] = useState<RepairGuide[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (!isConfigured() || !vehicleId) { setLoading(false); return }
    supabase
      .from('repair_guides')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setGuides((data || []) as RepairGuide[])
        setLoading(false)
      })
  }, [vehicleId])

  useEffect(() => { refresh() }, [refresh])

  return { guides, loading, refresh }
}

export async function upsertRecallLookups(
  vehicleId: string,
  businessId: string,
  recalls: Array<{ nhtsa_id?: string; description: string; consequence?: string; corrective_action?: string; report_date?: string }>,
) {
  if (!recalls.length) return
  // Avoid duplicates by nhtsa_id
  const { data: existing } = await supabase
    .from('recall_lookups')
    .select('nhtsa_id')
    .eq('vehicle_id', vehicleId)
  const existingIds = new Set((existing || []).map((r: any) => r.nhtsa_id))

  const newRecalls = recalls
    .filter(r => r.nhtsa_id && !existingIds.has(r.nhtsa_id))
    .map(r => ({
      vehicle_id: vehicleId,
      type: 'recall' as const,
      description: r.description,
      consequence: r.consequence || null,
      corrective_action: r.corrective_action || null,
      nhtsa_id: r.nhtsa_id || null,
      source: 'vehicledatabases',
      business_id: businessId,
    }))

  if (newRecalls.length) {
    await supabase.from('recall_lookups').insert(newRecalls)
  }
}

// ── Repairs Edge Function Callers ──────────────────────────

export async function callRepairsVehicleDB(params: {
  action: string
  vin?: string
  year?: string
  make?: string
  model?: string
}) {
  const { data, error } = await supabase.functions.invoke('repairs-vehicledb', { body: params })
  if (error) throw error
  return data
}

export async function callRepairsAIGuide(params: {
  vehicle_id: string
  repair_lookup_id?: string
  dtc_code?: string
  description: string
  media_urls?: string[]
}) {
  const { data, error } = await supabase.functions.invoke('repairs-ai-guide', { body: params })
  if (error) throw error
  return data
}

// ── Avatar Upload ────────────────────────────────────────

export async function uploadAvatar(
  file: File,
  targetType: 'profile' | 'customer',
  targetId: string
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${targetType}/${targetId}/avatar_${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { contentType: file.type, upsert: true })
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(path)

  // Update the record with the new avatar URL
  if (targetType === 'profile') {
    const { error } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', targetId)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('customers')
      .update({ avatar_url: publicUrl })
      .eq('id', targetId)
    if (error) throw error
  }

  return publicUrl
}
