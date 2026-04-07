import type { BusinessType } from './types'

// ── Warranty Duration Options (months) per business type ──

export const WARRANTY_DURATION_OPTIONS: Record<BusinessType, { label: string; months: number }[]> = {
  CERAMIC_COATING: [
    { label: '1 Year', months: 12 },
    { label: '2 Years', months: 24 },
    { label: '3 Years', months: 36 },
    { label: '5 Years', months: 60 },
    { label: '10 Years', months: 120 },
  ],
  WINDOW_TINT: [
    { label: '3 Years', months: 36 },
    { label: '5 Years', months: 60 },
    { label: 'Lifetime', months: 1200 },
  ],
  PPF: [
    { label: '5 Years', months: 60 },
    { label: '7 Years', months: 84 },
    { label: '10 Years', months: 120 },
  ],
  AUDIO_ELECTRONICS: [
    { label: '1 Year', months: 12 },
    { label: '2 Years', months: 24 },
    { label: '3 Years', months: 36 },
  ],
  MECHANICAL: [
    { label: '12mo / 12k mi', months: 12 },
    { label: '24mo / 24k mi', months: 24 },
    { label: '36mo / 36k mi', months: 36 },
  ],
  WHEELS_TIRES: [
    { label: '1 Year', months: 12 },
    { label: '2 Years', months: 24 },
    { label: '3 Years', months: 36 },
  ],
}

// Mileage caps that correspond to MECHANICAL duration options
export const MECHANICAL_MILEAGE_CAPS: Record<number, number> = {
  12: 12000,
  24: 24000,
  36: 36000,
}

// ── Default Void Conditions per business type ─────────────

export const DEFAULT_VOID_CONDITIONS: Record<BusinessType, string[]> = {
  CERAMIC_COATING: [
    'Use of automated brush car wash',
    'Application of harsh chemicals, solvents, or abrasive compounds',
    'Failure to complete required annual maintenance inspection',
    'Use of non-approved wash products',
    'Physical damage from collision, vandalism, or environmental disaster',
    'Aftermarket paint or body work without reapplication of coating',
  ],
  WINDOW_TINT: [
    'Aftermarket removal or alteration of film',
    'Use of abrasive or ammonia-based cleaners on tinted surfaces',
    'Physical damage from collision or sharp objects',
    'Damage caused during other service work not performed by original installer',
  ],
  PPF: [
    'Use of abrasive compounds or polishes directly on film',
    'Damage caused by improper washing (pressure washer too close, brush wash)',
    'Paint damage underneath the film (pre-existing)',
    'Aftermarket paint work under the film without reinstallation',
    'Chemical exposure (bird droppings, tree sap left more than 48 hours)',
  ],
  AUDIO_ELECTRONICS: [
    'Unauthorized modification of installed equipment or wiring',
    'Water damage (unless equipment is rated water-resistant)',
    'Power surge or electrical damage from incorrect jump-start or battery swap',
    'Physical damage from collision or theft attempt',
    'Use of non-OEM replacement fuses or components',
  ],
  MECHANICAL: [
    'Failure to follow required maintenance schedule',
    'Use of the vehicle in racing, competition, or off-road events (unless specified)',
    'Unauthorized modification to warrantied components',
    'Neglect (running without oil, overheating without action, etc.)',
    'Pre-existing conditions not disclosed at time of service',
    'Exceeding mileage cap',
  ],
  WHEELS_TIRES: [
    'Improper tire inflation (under or over PSI spec)',
    'Vehicle overloading beyond tire load rating',
    'Use in racing or competitive driving',
    'Curb damage, puncture, or road hazard (unless road hazard add-on purchased)',
    'Failure to rotate tires per manufacturer schedule',
    'Aftermarket suspension modification affecting alignment geometry',
  ],
}

// ── Surface / Coverage Options per business type ──────────

export const CERAMIC_SURFACES = [
  'PAINT', 'WHEELS', 'GLASS', 'TRIM', 'PPF', 'INTERIOR', 'LEATHER',
] as const

export const CERAMIC_PREP_METHODS = [
  { value: 'NONE', label: 'None' },
  { value: '1_STEP', label: '1-Step Polish' },
  { value: '2_STEP', label: '2-Step Correction' },
  { value: '3_STEP', label: '3-Step Correction' },
  { value: 'WET_SAND', label: 'Wet Sand + Polish' },
] as const

export const CERAMIC_CURE_METHODS = [
  { value: 'IR_LAMP', label: 'IR Lamp' },
  { value: 'AMBIENT', label: 'Ambient' },
  { value: 'HEAT_GUN', label: 'Heat Gun' },
] as const

export const TINT_FILM_TYPES = [
  { value: 'CERAMIC', label: 'Ceramic' },
  { value: 'CARBON', label: 'Carbon' },
  { value: 'DYED', label: 'Dyed' },
  { value: 'METALLIC', label: 'Metallic' },
  { value: 'HYBRID', label: 'Hybrid' },
] as const

export const TINT_WINDOWS = [
  'WINDSHIELD', 'FRONT', 'REAR', 'BACK', 'SUNROOF',
] as const

export const PPF_COVERAGE_AREAS = [
  'HOOD', 'FENDERS', 'BUMPER', 'MIRRORS', 'ROCKER_PANELS', 'A_PILLARS', 'FULL_BODY',
] as const

export const PPF_FINISH_TYPES = [
  { value: 'GLOSS', label: 'Gloss' },
  { value: 'MATTE', label: 'Matte' },
  { value: 'SATIN', label: 'Satin' },
  { value: 'COLORED', label: 'Colored' },
  { value: 'STEALTH', label: 'Stealth' },
] as const

export const PPF_EDGE_TECHNIQUES = [
  { value: 'BULK', label: 'Bulk' },
  { value: 'PRE_CUT', label: 'Pre-Cut' },
  { value: 'WRAPPED', label: 'Wrapped' },
  { value: 'TUCKED', label: 'Tucked' },
] as const

export const AUDIO_INSTALL_TYPES = [
  'HEAD_UNIT', 'AMPLIFIER', 'SUBWOOFER', 'SPEAKERS', 'REMOTE_START',
  'ALARM', 'DASH_CAM', 'LIGHTING', 'GPS_TRACKER',
] as const

export const AUDIO_LABOR_SCOPES = [
  { value: 'BASIC', label: 'Basic Install' },
  { value: 'CUSTOM_FABRICATION', label: 'Custom Fabrication' },
  { value: 'FULL_INTEGRATION', label: 'Full Integration' },
] as const

export const MECHANICAL_CATEGORIES = [
  { value: 'ENGINE', label: 'Engine' },
  { value: 'TRANSMISSION', label: 'Transmission' },
  { value: 'BRAKES', label: 'Brakes' },
  { value: 'SUSPENSION', label: 'Suspension' },
  { value: 'EXHAUST', label: 'Exhaust' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'HVAC', label: 'HVAC' },
  { value: 'STEERING', label: 'Steering' },
  { value: 'DRIVETRAIN', label: 'Drivetrain' },
] as const

export const WHEELS_SERVICE_TYPES = [
  { value: 'NEW_TIRES', label: 'New Tires' },
  { value: 'WHEEL_REPAIR', label: 'Wheel Repair' },
  { value: 'POWDER_COAT', label: 'Powder Coat' },
  { value: 'REFINISH', label: 'Refinish' },
  { value: 'ALIGNMENT', label: 'Alignment' },
  { value: 'BALANCING', label: 'Balancing' },
] as const

export const WHEELS_PRORATE_METHODS = [
  { value: 'FULL_REPLACEMENT_THEN_PRORATE', label: 'Full Replacement then Pro-Rate' },
  { value: 'PRORATE_FROM_DAY_ONE', label: 'Pro-Rate from Day One' },
  { value: 'FULL_REPLACEMENT_ONLY', label: 'Full Replacement Only' },
] as const
