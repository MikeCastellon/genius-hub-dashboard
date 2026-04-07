export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatDate(iso: string): string {
  // For date-only strings (YYYY-MM-DD), parse parts directly to avoid timezone shift.
  // new Date("2026-04-06") treats it as UTC midnight, which shows as the previous day
  // in timezones behind UTC.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso)
  const d = dateOnly
    ? new Date(iso + 'T00:00:00') // Appending time makes it parse as local time
    : new Date(iso)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// VIN utilities (ported from Auto Sync)
export function sanitizeVin(raw = ''): string {
  let v = String(raw)
  v = v.replace(/^"+|"+$/g, '')
  v = v.trim().toUpperCase()
  v = v.replace(/[^A-Z0-9]/g, '')
  if (v.length > 17) v = v.slice(0, 17)
  return v
}

export function isLikelyVin(raw = ''): boolean {
  const v = (raw || '').toUpperCase().trim()
  if (v.length !== 17) return false
  if (/[IOQ]/.test(v)) return false
  if (!/^[A-Z0-9]+$/.test(v)) return false
  return true
}

export function pickBestVinFromText(text = ''): { vin: string; checksumOk: boolean } | null {
  if (!text) return null
  const s = String(text).toUpperCase()
  const candidates = new Set<string>()

  const prefixRe = /VIN[:#\s\-]*([A-HJ-NPR-Z0-9]{17})/g
  let m: RegExpExecArray | null
  while ((m = prefixRe.exec(s))) candidates.add(m[1])

  const anyRe = /([A-HJ-NPR-Z0-9]{17})/g
  while ((m = anyRe.exec(s))) candidates.add(m[1])

  for (const raw of candidates) {
    const v = sanitizeVin(raw)
    if (isLikelyVin(v)) return { vin: v, checksumOk: true }
  }
  return null
}

export async function decodeVin(vin: string): Promise<{ year: string; make: string; model: string } | null> {
  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`
    )
    const data = await res.json()
    const results: { Variable: string; Value: string }[] = data.Results || []

    const get = (key: string) => results.find(r => r.Variable === key)?.Value || ''

    const year = get('Model Year')
    const make = get('Make')
    const model = get('Model')

    if (!year && !make && !model) return null
    return { year, make, model }
  } catch {
    return null
  }
}
