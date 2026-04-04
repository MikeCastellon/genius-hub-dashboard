export type UserRole = 'super_admin' | 'admin' | 'user' | 'customer'

export interface Profile {
  id: string
  display_name: string
  email: string | null
  role: UserRole
  business_id: string | null
  preferred_contact: 'phone' | 'email' | 'sms'
  approved: boolean
  created_at: string
}

export interface Business {
  id: string
  name: string
  slug?: string
  logo_url?: string | null
  primary_color?: string | null
  website?: string | null
  phone?: string | null
  address?: string | null
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
  address: string | null
  company: string | null
  vehicle_year: string | null
  vehicle_make: string | null
  vehicle_model: string | null
  vehicle_color: string | null
  business_id: string | null
  profile_id: string | null
  total_spend: number
  last_visit: string | null
  tags: string[]
  created_at: string
}

export interface CustomerNote {
  id: string
  customer_id: string
  author_id: string | null
  body: string
  created_at: string
  author?: { display_name: string }
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

export type PaymentMethod = string

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

// ── Business Settings (Intake Config) ─────────────────────

export type IntakeSectionKey = 'vehicle' | 'customer' | 'services' | 'payment' | 'notes' | string

export interface IntakeFieldDef {
  key: string
  label: string
  fieldType: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'tel' | 'email'
  required: boolean
  visible: boolean
  builtIn: boolean // built-in fields can be hidden but not deleted
  options?: string[]
  icon?: string    // lucide icon name (for payment methods)
  gradient?: string // tailwind gradient classes (for payment methods)
}

// Available icons for payment methods
export const PAYMENT_ICONS: Record<string, string> = {
  Banknote: 'Banknote',
  Wallet: 'Wallet',
  Smartphone: 'Smartphone',
  CreditCard: 'CreditCard',
  DollarSign: 'DollarSign',
  Receipt: 'Receipt',
  QrCode: 'QrCode',
  Landmark: 'Landmark',
  Send: 'Send',
  CircleDollarSign: 'CircleDollarSign',
}

export const PAYMENT_GRADIENTS: Record<string, string> = {
  'Green': 'from-emerald-400 to-green-500',
  'Purple': 'from-violet-500 to-purple-600',
  'Blue': 'from-blue-400 to-blue-600',
  'Orange': 'from-amber-400 to-orange-500',
  'Gray': 'from-zinc-400 to-zinc-500',
  'Red': 'from-red-400 to-red-500',
  'Pink': 'from-pink-400 to-rose-500',
  'Teal': 'from-teal-400 to-cyan-500',
  'Yellow': 'from-yellow-400 to-amber-500',
  'Indigo': 'from-indigo-400 to-blue-500',
}

export interface IntakeSectionDef {
  visible: boolean
  label: string
  type?: 'builtin' | 'custom'
  fields?: IntakeFieldDef[]
  // Legacy single-field custom sections
  fieldType?: 'text' | 'textarea' | 'number' | 'select' | 'checkbox'
  options?: string[] // for select fields
}

export interface IntakeConfig {
  sections: Record<IntakeSectionKey, IntakeSectionDef>
  sectionOrder: IntakeSectionKey[]
}

// Default fields per built-in section
export const DEFAULT_VEHICLE_FIELDS: IntakeFieldDef[] = [
  { key: 'vin', label: 'VIN', fieldType: 'text', required: false, visible: true, builtIn: true },
  { key: 'year', label: 'Year', fieldType: 'text', required: false, visible: true, builtIn: true },
  { key: 'make', label: 'Make', fieldType: 'text', required: false, visible: true, builtIn: true },
  { key: 'model', label: 'Model', fieldType: 'text', required: false, visible: true, builtIn: true },
  { key: 'color', label: 'Color', fieldType: 'text', required: false, visible: true, builtIn: true },
  { key: 'license_plate', label: 'License Plate', fieldType: 'text', required: false, visible: true, builtIn: true },
]

export const DEFAULT_CUSTOMER_FIELDS: IntakeFieldDef[] = [
  { key: 'name', label: 'Name', fieldType: 'text', required: true, visible: true, builtIn: true },
  { key: 'phone', label: 'Phone', fieldType: 'tel', required: true, visible: true, builtIn: true },
  { key: 'email', label: 'Email', fieldType: 'email', required: false, visible: true, builtIn: true },
]

export const DEFAULT_PAYMENT_FIELDS: IntakeFieldDef[] = [
  { key: 'cash', label: 'Cash', fieldType: 'text', required: false, visible: true, builtIn: true, icon: 'Banknote', gradient: 'from-emerald-400 to-green-500' },
  { key: 'zelle', label: 'Zelle', fieldType: 'text', required: false, visible: true, builtIn: true, icon: 'Wallet', gradient: 'from-violet-500 to-purple-600' },
  { key: 'venmo', label: 'Venmo', fieldType: 'text', required: false, visible: true, builtIn: true, icon: 'Smartphone', gradient: 'from-blue-400 to-blue-600' },
  { key: 'ath_movil', label: 'ATH Movil', fieldType: 'text', required: false, visible: true, builtIn: true, icon: 'Smartphone', gradient: 'from-amber-400 to-orange-500' },
  { key: 'credit_card', label: 'Credit Card', fieldType: 'text', required: false, visible: true, builtIn: true, icon: 'CreditCard', gradient: 'from-zinc-400 to-zinc-500' },
]

export const DEFAULT_INTAKE_CONFIG: IntakeConfig = {
  sections: {
    vehicle: { visible: true, label: 'Vehicle Information', type: 'builtin', fields: DEFAULT_VEHICLE_FIELDS },
    customer: { visible: true, label: 'Customer Information', type: 'builtin', fields: DEFAULT_CUSTOMER_FIELDS },
    services: { visible: true, label: 'Services', type: 'builtin' },
    payment: { visible: true, label: 'Payment Method', type: 'builtin', fields: DEFAULT_PAYMENT_FIELDS },
    notes: { visible: true, label: 'Notes', type: 'builtin' },
  },
  sectionOrder: ['vehicle', 'customer', 'services', 'payment', 'notes'],
}

// Helper: get fields for a section, with defaults for built-in sections without saved fields
export function getSectionFields(sectionKey: string, def: IntakeSectionDef): IntakeFieldDef[] {
  if (def.fields) return def.fields
  if (sectionKey === 'vehicle') return DEFAULT_VEHICLE_FIELDS
  if (sectionKey === 'customer') return DEFAULT_CUSTOMER_FIELDS
  if (sectionKey === 'payment') return DEFAULT_PAYMENT_FIELDS
  return []
}

export interface BusinessSettings {
  id: string
  business_id: string
  intake_config: IntakeConfig
  updated_at: string
}
