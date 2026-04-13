/**
 * Shared Barkoder SDK configuration for web (WASM) and native (Capacitor) platforms.
 * VIN-focused barcode scanning with Code 39, Code 128, Data Matrix, PDF417, QR.
 */

export function getBarkoderLicenseKey(): string {
  return import.meta.env.VITE_BARKODER_KEY || ''
}

/** Decoder enum values from barkoder-wasm (also used for barkoder-capacitor mapping) */
export const VIN_DECODERS = {
  Code39: 6,
  Code128: 4,
  Datamatrix: 17,
  PDF417: 15,
  QR: 2,
} as const

/** Deduplication delay in ms to prevent duplicate VIN captures */
export const DUPLICATES_DELAY_MS = 1500
