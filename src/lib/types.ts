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

// ── Business Types (Warranty Verticals) ──────────────────
export const BUSINESS_TYPES = [
  'CERAMIC_COATING',
  'WINDOW_TINT',
  'PPF',
  'AUDIO_ELECTRONICS',
  'MECHANICAL',
  'WHEELS_TIRES',
] as const
export type BusinessType = (typeof BUSINESS_TYPES)[number]

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  CERAMIC_COATING: 'Ceramic Coating',
  WINDOW_TINT: 'Window Tint',
  PPF: 'Paint Protection Film',
  AUDIO_ELECTRONICS: 'Audio & Electronics',
  MECHANICAL: 'Mechanical',
  WHEELS_TIRES: 'Wheels & Tires',
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
  business_types?: BusinessType[]
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

export interface Job {
  id: string
  business_id: string
  intake_id: string | null
  appointment_id: string | null
  customer_id: string | null
  technician_id: string | null
  status: 'queued' | 'in_progress' | 'completed'
  started_at: string | null
  finished_at: string | null
  duration_minutes: number | null
  notes: string | null
  created_at: string
  // Joined data
  customer?: Customer
  intake?: VehicleIntake
  appointment?: Appointment
  technician?: { display_name: string }
}

export interface JobPhoto {
  id: string
  job_id: string
  business_id: string
  photo_type: 'before' | 'after'
  storage_path: string
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

// ── Vehicles (Global, VIN-indexed) ────────────────────────

export interface Vehicle {
  id: string
  vin: string
  year: number | null
  make: string | null
  model: string | null
  trim: string | null
  engine?: string | null
  engine_type?: string | null
  mileage?: number | null
  color: string | null
  plate?: string | null
  business_id?: string
  created_by?: string | null
  created_at: string
  updated_at: string
}

// ── Certify (Certificates) ────────────────────────────────

export interface Certificate {
  id: string
  business_id: string
  certificate_number: string
  status: 'active' | 'expired' | 'voided'
  is_public: boolean
  notes: string | null
  created_at: string
  updated_at: string
  // Legacy fields (nullable for backward compat)
  intake_id: string | null
  coating_brand: string | null
  coating_product: string | null
  odometer: number | null
  warranty_years: number
  warranty_expiry: string
  technician_id: string | null
  // New warranty fields
  business_type: BusinessType | null
  vehicle_id: string | null
  customer_id: string | null
  service_date: string | null
  warranty_duration_months: number | null
  warranty_mileage_cap: number | null
  odometer_at_service: number | null
  technician_name: string | null
  void_conditions: string[] | null
  void_reason: string | null
  // Eager-loaded relations
  intake?: VehicleIntake
  customer?: Customer
  technician?: { display_name: string }
  photos?: CertificatePhoto[]
  vehicle?: Vehicle
  business?: Business
  // Loaded separately based on business_type
  details?: CeramicCoatingDetails | WindowTintDetails | PpfDetails
    | AudioElectronicsDetails | MechanicalDetails | WheelsTiresDetails
  claims?: WarrantyClaim[]
}

export interface CertificatePhoto {
  id: string
  certificate_id: string
  storage_path: string
  photo_type: 'before' | 'after' | 'product' | 'other'
  created_at: string
}

// ── Certificate Detail Tables (1:1 per business type) ────

export interface CeramicCoatingDetails {
  certificate_id: string
  coating_brand: string
  coating_product: string
  layers_applied: number | null
  surfaces_coated: string[]
  prep_method: string | null
  cure_temp_f: number | null
  cure_humidity: number | null
  cure_method: string | null
  manufacturer_cert_id: string | null
  maintenance_required: boolean
}

export interface WindowTintDetails {
  certificate_id: string
  film_brand: string
  film_product: string
  film_type: string | null
  vlt_windshield: number | null
  vlt_front: number | null
  vlt_rear: number | null
  vlt_back: number | null
  vlt_sunroof: number | null
  windows_covered: string[]
  uv_rejection_pct: number | null
  ir_rejection_pct: number | null
  state_compliant: boolean
}

export interface PpfDetails {
  certificate_id: string
  film_brand: string
  film_product: string
  coverage_areas: string[]
  finish_type: string | null
  edge_technique: string | null
  self_healing_confirmed: boolean | null
  manufacturer_cert_id: string | null
}

export interface AudioElectronicsDetails {
  certificate_id: string
  install_type: string[]
  equipment_list: { brand: string; model: string; serial_number: string; category: string }[]
  labor_scope: string | null
  oem_integration: boolean | null
  wiring_diagram_url: string | null
  parts_warranty_months: number | null
  labor_warranty_months: number | null
}

export interface MechanicalDetails {
  certificate_id: string
  service_category: string
  parts_used: { part_name: string; part_number: string; brand: string; oem_or_aftermarket: string; new_or_reman: string; cost: number }[]
  labor_description: string | null
  dtc_codes_cleared: string[]
  torque_specs_confirmed: boolean | null
  fluids_used: { fluid_type: string; brand: string; spec: string }[]
  maintenance_schedule: string | null
}

export interface WheelsTiresDetails {
  certificate_id: string
  service_type: string
  tire_specs: { brand: string; model: string; size: string; dot_number: string; speed_rating: string; load_index: string }[] | null
  wheel_specs: { brand: string; size: string; offset: string; bolt_pattern: string; finish_type: string }[] | null
  tread_depth_32nds: number | null
  lug_torque_ft_lbs: number | null
  tpms_reset: boolean | null
  road_hazard_coverage: boolean | null
  prorate_method: string | null
}

// Map business type to its detail table name
export const DETAIL_TABLE_MAP: Record<BusinessType, string> = {
  CERAMIC_COATING: 'ceramic_coating_details',
  WINDOW_TINT: 'window_tint_details',
  PPF: 'ppf_details',
  AUDIO_ELECTRONICS: 'audio_electronics_details',
  MECHANICAL: 'mechanical_details',
  WHEELS_TIRES: 'wheels_tires_details',
}

// ── Warranty Claims ───────────────────────────────────────

export type ClaimStatus = 'pending' | 'approved' | 'denied' | 'resolved'

export interface WarrantyClaim {
  id: string
  certificate_id: string
  business_id: string
  claim_date: string
  description: string
  status: ClaimStatus
  resolution: string | null
  resolved_date: string | null
  odometer_at_claim: number | null
  created_at: string
  updated_at: string
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

// ── Custom Forms ─────────────────────────────────────────

export type FormFieldType = 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'date' | 'signature' | 'photo'
export type FormStatus = 'draft' | 'active' | 'archived'

export interface FormFieldDef {
  id: string
  label: string
  type: FormFieldType
  required: boolean
  options?: string[]
  position: number
}

export interface FormTemplate {
  id: string
  business_id: string
  name: string
  description: string | null
  fields: FormFieldDef[]
  status: FormStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface FormSubmission {
  id: string
  form_template_id: string
  business_id: string
  responses: Record<string, any>
  customer_id: string | null
  intake_id: string | null
  submitted_by: string | null
  created_at: string
  form_template?: FormTemplate
  customer?: Customer
}

// ── Expenses ─────────────────────────────────────────────

export const EXPENSE_CATEGORIES = [
  'supplies', 'products', 'equipment', 'rent', 'utilities', 'marketing', 'labor', 'other',
] as const
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  supplies: 'Supplies',
  products: 'Products',
  equipment: 'Equipment',
  rent: 'Rent',
  utilities: 'Utilities',
  marketing: 'Marketing',
  labor: 'Labor',
  other: 'Other',
}

export interface Expense {
  id: string
  business_id: string
  amount: number
  description: string
  category: ExpenseCategory
  vendor: string | null
  date: string
  receipt_url: string | null
  is_recurring: boolean
  created_by: string | null
  created_at: string
  creator?: { display_name: string }
}

// ── Repairs Module ──────────────────────────────────────────

export interface RepairLookup {
  id: string
  vehicle_id: string
  dtc_code: string | null
  description: string
  urgency: number | null
  urgency_desc: string | null
  difficulty: number | null
  labor_hours: number | null
  part_cost: number | null
  labor_cost: number | null
  misc_cost: number | null
  total_cost: number | null
  parts_json: RepairPart[]
  source: 'carmd' | 'vehicledatabases'
  business_id: string
  created_at: string
}

export interface RepairPart {
  desc: string
  manufacturer?: string
  price: number
  qty: string | number
}

export interface MaintenanceLookup {
  id: string
  vehicle_id: string
  description: string
  due_mileage: number | null
  is_oem: boolean
  cycle_mileage: number | null
  part_cost: number | null
  labor_cost: number | null
  total_cost: number | null
  parts_json: RepairPart[] | null
  source: string
  business_id: string
  created_at: string
}

export interface RecallLookup {
  id: string
  vehicle_id: string
  type: 'recall' | 'tsb'
  description: string
  corrective_action: string | null
  nhtsa_id: string | null
  source: string
  business_id: string
  created_at: string
}

export interface RepairGuideStep {
  number: number
  title: string
  description: string
  warnings?: string[]
  media_refs?: string[]
}

export interface RepairGuide {
  id: string
  repair_lookup_id: string | null
  vehicle_id: string
  content: { steps: RepairGuideStep[] }
  ai_model: string | null
  user_prompt: string | null
  media_urls: string[]
  created_by: string | null
  business_id: string
  created_at: string
}

export interface PartsOrder {
  id: string
  vehicle_id: string
  repair_lookup_id: string | null
  supplier: string
  parts_json: OrderedPart[]
  total_cost: number
  status: 'pending' | 'ordered' | 'delivered'
  partstech_order_id: string | null
  created_by: string | null
  business_id: string
  created_at: string
}

export interface OrderedPart {
  name: string
  part_number: string
  qty: number
  price: number
}

export const DTC_CODE_PATTERN = /^[PBCU][0-9A-F]{4}$/i

export const URGENCY_LABELS: Record<number, string> = {
  1: 'Low — Monitor',
  2: 'Medium — Repair Soon',
  3: 'High — Repair Immediately',
  4: 'Critical — Do Not Drive',
}

export const URGENCY_COLORS: Record<number, string> = {
  1: 'bg-green-100 text-green-700',
  2: 'bg-yellow-100 text-yellow-700',
  3: 'bg-orange-100 text-orange-700',
  4: 'bg-red-100 text-red-700',
}

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Very Easy',
  2: 'Easy',
  3: 'Moderate',
  4: 'Difficult',
  5: 'Very Difficult',
}
