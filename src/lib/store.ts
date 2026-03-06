import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import {
  Profile, Business, Service, Customer, VehicleIntake,
  CartItem, PaymentMethod, UserRole
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
  const { error } = await supabase.from('businesses').insert({ name: name.trim() })
  if (error) throw error
}

export async function deleteBusiness(id: string) {
  const { error } = await supabase.from('businesses').delete().eq('id', id)
  if (error) throw error
}
