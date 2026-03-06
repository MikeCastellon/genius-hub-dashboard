export type UserRole = 'super_admin' | 'admin' | 'user'

export interface Profile {
  id: string
  display_name: string
  email: string | null
  role: UserRole
  business_id: string | null
  approved: boolean
  created_at: string
}

export interface Business {
  id: string
  name: string
  created_at: string
}

export interface Service {
  id: string
  name: string
  price: number
  category: string
  duration_minutes: number | null
  active: boolean
  business_id: string | null
  created_at: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  email: string | null
  created_at: string
}

export interface VehicleIntake {
  id: string
  customer_id: string
  vin: string | null
  year: number | null
  make: string | null
  model: string | null
  color: string | null
  license_plate: string | null
  payment_method: PaymentMethod
  subtotal: number
  notes: string | null
  technician_id: string | null
  business_id: string | null
  created_at: string
  customer?: Customer
  intake_services?: IntakeService[]
  technician?: { display_name: string }
}

export interface IntakeService {
  id: string
  intake_id: string
  service_id: string
  quantity: number
  unit_price: number
  total: number
  service?: Service
}

export interface CartItem {
  service: Service
  quantity: number
  unitPrice: number
}

export type PaymentMethod = 'cash' | 'zelle' | 'venmo' | 'ath_movil' | 'credit_card'
