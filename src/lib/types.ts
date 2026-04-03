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

// ── Invoicing ──────────────────────────────────────────────
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled'

export interface Invoice {
  id: string
  business_id: string | null
  customer_id: string | null
  intake_id: string | null
  invoice_number: string | null
  status: InvoiceStatus
  due_date: string | null
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  notes: string | null
  created_at: string
  updated_at: string
  customer?: Customer
  items?: InvoiceItem[]
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

// ── Scheduling ─────────────────────────────────────────────
export type AppointmentStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

export interface Appointment {
  id: string
  business_id: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  vehicle_year: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_color: string | null
  service_ids: string[] | null
  scheduled_at: string
  duration_minutes: number
  status: AppointmentStatus
  technician_id: string | null
  notes: string | null
  created_at: string
  technician?: { display_name: string }
}

export interface BusinessHours {
  id: string
  business_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_open: boolean
}

// ── Employee Hours ─────────────────────────────────────────
export interface Shift {
  id: string
  business_id: string
  employee_id: string
  scheduled_start: string
  scheduled_end: string
  notes: string | null
  created_at: string
  employee?: { display_name: string }
}

export interface TimeEntry {
  id: string
  business_id: string
  employee_id: string
  clock_in: string
  clock_out: string | null
  hours_worked: number | null
  notes: string | null
  created_at: string
  employee?: { display_name: string }
}

// ── Certify (Certificates) ────────────────────────────────

export interface Certificate {
  id: string
  business_id: string
  intake_id: string
  certificate_number: string
  coating_brand: string
  coating_product: string
  odometer: number | null
  warranty_years: number
  warranty_expiry: string
  technician_id: string | null
  status: 'active' | 'expired' | 'voided'
  is_public: boolean
  notes: string | null
  created_at: string
  updated_at: string
  // Eager-loaded relations
  intake?: VehicleIntake
  customer?: Customer
  technician?: { display_name: string }
  photos?: CertificatePhoto[]
}

export interface CertificatePhoto {
  id: string
  certificate_id: string
  storage_path: string
  photo_type: 'before' | 'after' | 'product' | 'other'
  created_at: string
}
