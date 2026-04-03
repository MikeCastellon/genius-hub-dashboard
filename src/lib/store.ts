import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import {
  Profile, Business, Service, Customer, VehicleIntake,
  CartItem, PaymentMethod, UserRole,
  Invoice, InvoiceItem, Appointment, BusinessHours, Shift, TimeEntry,
  Certificate, CertificatePhoto,
  BusinessSettings, IntakeConfig, DEFAULT_INTAKE_CONFIG
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
      .select('*')
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

export async function upsertCustomer(customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
  if (!isConfigured()) {
    return { ...customer, id: `local-${Date.now()}`, created_at: new Date().toISOString() }
  }

  const { data: existing } = await supabase
    .from('customers')
    .select('*')
    .eq('phone', customer.phone)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('customers')
      .update({ name: customer.name, email: customer.email })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('customers')
    .insert(customer)
    .select()
    .single()
  if (error) throw error
  return data
}

// ============ Vehicle Intakes ============

export async function createIntake(
  customer: Omit<Customer, 'id' | 'created_at'>,
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

  const savedCustomer = await upsertCustomer(customer)
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

export async function updateBusiness(id: string, updates: Partial<Pick<Business, 'name' | 'slug' | 'logo_url' | 'primary_color' | 'website' | 'phone' | 'address'>>) {
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
      .select('*, intake:vehicle_intakes(*, customer:customers(*)), technician:profiles(display_name), photos:certificate_photos(*)')
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
    .select('*, intake:vehicle_intakes(*, customer:customers(*)), technician:profiles(display_name), photos:certificate_photos(*)')
    .eq('id', id)
    .maybeSingle()
  return data
}

export async function getPublicCertificate(id: string): Promise<Certificate | null> {
  const { data } = await supabase
    .from('certificates')
    .select('*, intake:vehicle_intakes(id, vin, year, make, model, color, created_at, customer:customers(name)), technician:profiles(display_name), photos:certificate_photos(*)')
    .eq('id', id)
    .eq('is_public', true)
    .maybeSingle()
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
  const { settings, loading } = useBusinessSettings()
  const config: IntakeConfig = settings?.intake_config || DEFAULT_INTAKE_CONFIG
  return { config, loading }
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
