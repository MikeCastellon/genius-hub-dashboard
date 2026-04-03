# Certify Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Certify" feature to Pro Hub that generates digital certificates for ceramic coating installations with warranty tracking, photo uploads, and public QR-code verification.

**Architecture:** New `certificates` and `certificate_photos` Supabase tables linked to existing `vehicle_intakes`. Photos stored in Supabase Storage. QR codes rendered client-side via `qrcode.react`. Public verification page at `/verify/:certId` requires no auth.

**Tech Stack:** React 19, TypeScript, Supabase (DB + Storage), qrcode.react, Tailwind CSS

**Design Doc:** `docs/plans/2026-04-02-certify-feature-design.md`

---

### Task 1: Create Database Tables and Storage Bucket

**Files:**
- Supabase dashboard (SQL editor)

**Step 1: Create certificates table**

Run in Supabase SQL editor:

```sql
create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) not null,
  intake_id uuid references public.vehicle_intakes(id) not null,
  certificate_number text unique not null,
  coating_brand text not null,
  coating_product text not null,
  odometer integer,
  warranty_years integer not null default 2,
  warranty_expiry date not null,
  technician_id uuid references public.profiles(id),
  status text not null default 'active' check (status in ('active', 'expired', 'voided')),
  is_public boolean not null default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.certificates enable row level security;

create policy "Users see own business certificates"
  on public.certificates for select
  using (
    business_id in (select business_id from public.profiles where id = auth.uid())
    or is_public = true
  );

create policy "Users create certificates for own business"
  on public.certificates for insert
  with check (business_id in (select business_id from public.profiles where id = auth.uid()));

create policy "Users update own business certificates"
  on public.certificates for update
  using (business_id in (select business_id from public.profiles where id = auth.uid()));
```

**Step 2: Create certificate_photos table**

```sql
create table public.certificate_photos (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid references public.certificates(id) on delete cascade not null,
  storage_path text not null,
  photo_type text not null check (photo_type in ('before', 'after', 'product', 'other')),
  created_at timestamptz default now()
);

alter table public.certificate_photos enable row level security;

create policy "Users see own business certificate photos"
  on public.certificate_photos for select
  using (
    certificate_id in (
      select id from public.certificates
      where business_id in (select business_id from public.profiles where id = auth.uid())
      or is_public = true
    )
  );

create policy "Users create photos for own certificates"
  on public.certificate_photos for insert
  with check (
    certificate_id in (
      select id from public.certificates
      where business_id in (select business_id from public.profiles where id = auth.uid())
    )
  );
```

**Step 3: Create Supabase Storage bucket**

In Supabase dashboard > Storage > Create bucket:
- Name: `certificate-photos`
- Public: Yes (public read)
- File size limit: 10MB
- Allowed MIME types: `image/jpeg, image/png, image/webp`

Add storage policy for authenticated uploads:

```sql
create policy "Authenticated users can upload certificate photos"
  on storage.objects for insert
  with check (bucket_id = 'certificate-photos' and auth.role() = 'authenticated');

create policy "Anyone can view certificate photos"
  on storage.objects for select
  using (bucket_id = 'certificate-photos');
```

**Step 4: Verify tables exist**

Run: `select count(*) from certificates;` — should return 0.
Run: `select count(*) from certificate_photos;` — should return 0.

---

### Task 2: Add TypeScript Types

**Files:**
- Modify: `src/lib/types.ts`

**Step 1: Add Certificate and CertificatePhoto types**

Add at the end of `src/lib/types.ts`, before the closing of the file:

```typescript
// ── Certify ───────────────────────────────────────────────
export type CertificateStatus = 'active' | 'expired' | 'voided'

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
  status: CertificateStatus
  is_public: boolean
  notes: string | null
  created_at: string
  updated_at: string
  // Eager-loaded relations
  intake?: VehicleIntake & { customer?: Customer }
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
```

**Step 2: Build**

```bash
npm run build
```

Expected: Clean build, no errors.

**Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(certify): add Certificate and CertificatePhoto types"
```

---

### Task 3: Add Store Hooks

**Files:**
- Modify: `src/lib/store.ts`

**Step 1: Add imports**

At the top of `store.ts`, add `Certificate, CertificatePhoto` to the import from `./types`.

**Step 2: Add certificate CRUD functions**

Add at the end of `store.ts` (before any closing):

```typescript
// ============ Certificates ============

export function useCertificates() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isConfigured()) { setLoading(false); return }
    const { data } = await supabase
      .from('certificates')
      .select('*, intake:vehicle_intakes(*, customer:customers(*)), technician:profiles!technician_id(display_name), photos:certificate_photos(*)')
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
    .select('*, intake:vehicle_intakes(*, customer:customers(*)), technician:profiles!technician_id(display_name), photos:certificate_photos(*)')
    .eq('id', id)
    .maybeSingle()
  return data
}

export async function getPublicCertificate(id: string): Promise<Certificate | null> {
  const { data } = await supabase
    .from('certificates')
    .select('*, intake:vehicle_intakes(*, customer:customers(*)), technician:profiles!technician_id(display_name), photos:certificate_photos(*)')
    .eq('id', id)
    .eq('is_public', true)
    .maybeSingle()
  return data
}

export async function createCertificate(cert: Partial<Certificate>): Promise<Certificate> {
  const { count } = await supabase
    .from('certificates')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', cert.business_id!)
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
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${businessId}/${certificateId}/${photoType}_${Date.now()}.${ext}`

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
```

**Step 3: Build**

```bash
npm run build
```

Expected: Clean build.

**Step 4: Commit**

```bash
git add src/lib/store.ts
git commit -m "feat(certify): add certificate CRUD hooks and photo upload"
```

---

### Task 4: Install qrcode.react

**Files:**
- Modify: `package.json`

**Step 1: Install**

```bash
npm install qrcode.react
```

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(certify): add qrcode.react dependency"
```

---

### Task 5: Create Certify List Page

**Files:**
- Create: `src/pages/Certify.tsx`

**Step 1: Create the page**

Create `src/pages/Certify.tsx` following the Invoices page pattern (`src/pages/Invoices.tsx`):

```typescript
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCertificates, useAuth } from '@/lib/store'
import { Certificate, CertificateStatus } from '@/lib/types'
import { Shield, Plus, Search, Loader2 } from 'lucide-react'

export default function Certify() {
  const { profile } = useAuth()
  const { certificates, loading, refresh } = useCertificates()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<CertificateStatus | 'all'>('all')
  const [showBuilder, setShowBuilder] = useState(false)

  const filtered = certificates.filter(c => {
    const matchSearch =
      c.certificate_number.toLowerCase().includes(search.toLowerCase()) ||
      c.coating_brand.toLowerCase().includes(search.toLowerCase()) ||
      c.intake?.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.intake?.vin?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || c.status === filter
    return matchSearch && matchFilter
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={32} className="animate-spin text-red-600" />
      </div>
    )
  }

  const statusBadge = (status: CertificateStatus) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700'
      case 'expired': return 'bg-amber-50 text-amber-700'
      case 'voided': return 'bg-red-50 text-red-600'
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <Shield size={18} className="text-red-600" /> Certify
          </h2>
          <p className="text-[12px] text-zinc-400 mt-0.5">{certificates.length} total</p>
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold shadow-sm shadow-red-700/20 hover:shadow-md transition-all"
        >
          <Plus size={15} /> New Certificate
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10"
            placeholder="Search by VIN, customer, cert #..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {(['all', 'active', 'expired', 'voided'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${filter === s ? 'bg-gradient-to-r from-red-700 to-red-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="glass rounded-2xl px-4 py-12 text-center">
          <Shield size={32} className="text-zinc-200 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">{certificates.length === 0 ? 'No certificates yet' : 'No matching certificates'}</p>
          {certificates.length === 0 && <p className="text-xs text-zinc-300 mt-1">Create your first certificate above</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(cert => (
            <button
              key={cert.id}
              onClick={() => navigate(`/certify/${cert.id}`)}
              className="w-full glass rounded-2xl px-4 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors text-left"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-zinc-900">{cert.certificate_number}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusBadge(cert.status)}`}>
                    {cert.status}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {cert.intake?.customer?.name || 'No customer'} · {cert.intake?.year} {cert.intake?.make} {cert.intake?.model}
                </p>
                <p className="text-[11px] text-zinc-300 mt-0.5">
                  {cert.coating_brand} {cert.coating_product} · Warranty until {new Date(cert.warranty_expiry).toLocaleDateString()}
                </p>
              </div>
              <p className="text-xs font-semibold text-zinc-400">{new Date(cert.created_at).toLocaleDateString()}</p>
            </button>
          ))}
        </div>
      )}

      {/* Builder modal will go here in Task 6 */}
      {/* {showBuilder && <CertificateBuilder onClose={() => { setShowBuilder(false); refresh() }} />} */}
    </div>
  )
}
```

**Step 2: Build**

```bash
npm run build
```

Expected: Clean build (the commented-out CertificateBuilder is fine).

**Step 3: Commit**

```bash
git add src/pages/Certify.tsx
git commit -m "feat(certify): add certificate list page with search and filters"
```

---

### Task 6: Create Certificate Builder Modal

**Files:**
- Create: `src/components/CertificateBuilder.tsx`

**Step 1: Create the modal component**

Create `src/components/CertificateBuilder.tsx` following the InvoiceBuilder pattern:

```typescript
import { useState, useEffect } from 'react'
import { useAuth, useIntakes, createCertificate, uploadCertificatePhoto } from '@/lib/store'
import { VehicleIntake } from '@/lib/types'
import { X, Loader2, Upload, Shield, Search } from 'lucide-react'

interface Props {
  onClose: () => void
  preselectedIntakeId?: string
}

export default function CertificateBuilder({ onClose, preselectedIntakeId }: Props) {
  const { profile } = useAuth()
  const { intakes, loading: intakesLoading } = useIntakes()
  const [selectedIntake, setSelectedIntake] = useState<VehicleIntake | null>(null)
  const [intakeSearch, setIntakeSearch] = useState('')
  const [coatingBrand, setCoatingBrand] = useState('')
  const [coatingProduct, setCoatingProduct] = useState('')
  const [odometer, setOdometer] = useState('')
  const [warrantyYears, setWarrantyYears] = useState('2')
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<{ file: File; type: 'before' | 'after' | 'product' | 'other' }[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (preselectedIntakeId && intakes.length) {
      const found = intakes.find(i => i.id === preselectedIntakeId)
      if (found) setSelectedIntake(found)
    }
  }, [preselectedIntakeId, intakes])

  const filteredIntakes = intakes.filter(i => {
    const text = `${(i.customer as any)?.name || ''} ${i.vin || ''} ${i.make || ''} ${i.model || ''}`.toLowerCase()
    return text.includes(intakeSearch.toLowerCase())
  })

  const handleSave = async () => {
    if (!selectedIntake || !coatingBrand || !coatingProduct) return
    setSaving(true)
    try {
      const expiryDate = new Date()
      expiryDate.setFullYear(expiryDate.getFullYear() + parseInt(warrantyYears))

      const cert = await createCertificate({
        business_id: profile?.business_id || undefined,
        intake_id: selectedIntake.id,
        coating_brand: coatingBrand,
        coating_product: coatingProduct,
        odometer: odometer ? parseInt(odometer) : null,
        warranty_years: parseInt(warrantyYears),
        warranty_expiry: expiryDate.toISOString().split('T')[0],
        technician_id: profile?.id || null,
        status: 'active',
        is_public: true,
        notes: notes || null,
      })

      // Upload photos
      for (const photo of photos) {
        await uploadCertificatePhoto(cert.id, profile?.business_id || '', photo.file, photo.type)
      }

      onClose()
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
    setSaving(false)
  }

  const addPhoto = (type: 'before' | 'after' | 'product' | 'other') => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) setPhotos(prev => [...prev, { file, type }])
    }
    input.click()
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-600/10"

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-900">New Certificate</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Create a coating installation certificate</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Select Intake */}
          {!selectedIntake ? (
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Select Vehicle Intake *</label>
              <div className="relative mb-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-300" />
                <input className={`${inputClass} pl-8`} placeholder="Search by customer, VIN..." value={intakeSearch} onChange={e => setIntakeSearch(e.target.value)} />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {intakesLoading ? (
                  <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-red-600" /></div>
                ) : filteredIntakes.length === 0 ? (
                  <p className="text-xs text-zinc-300 text-center py-4">No intakes found</p>
                ) : filteredIntakes.slice(0, 10).map(intake => (
                  <button key={intake.id} onClick={() => setSelectedIntake(intake)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 text-sm">
                    <span className="font-semibold text-zinc-800">{(intake.customer as any)?.name || 'Unknown'}</span>
                    <span className="text-zinc-400 ml-2">{intake.year} {intake.make} {intake.model}</span>
                    {intake.vin && <span className="text-zinc-300 ml-2 text-xs">{intake.vin}</span>}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-800">{(selectedIntake.customer as any)?.name}</p>
                  <p className="text-xs text-zinc-400">{selectedIntake.year} {selectedIntake.make} {selectedIntake.model} {selectedIntake.vin && `· ${selectedIntake.vin}`}</p>
                </div>
                <button onClick={() => setSelectedIntake(null)} className="text-xs text-red-600 font-semibold">Change</button>
              </div>
            </div>
          )}

          {/* Coating Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">Coating Brand *</label>
              <input className={inputClass} placeholder="e.g. Ceramic Pro" value={coatingBrand} onChange={e => setCoatingBrand(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">Product *</label>
              <input className={inputClass} placeholder="e.g. 9H" value={coatingProduct} onChange={e => setCoatingProduct(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">Odometer</label>
              <input type="number" className={inputClass} placeholder="Miles at install" value={odometer} onChange={e => setOdometer(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">Warranty (years) *</label>
              <select className={inputClass} value={warrantyYears} onChange={e => setWarrantyYears(e.target.value)}>
                {[1, 2, 3, 5, 7, 10].map(y => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}
              </select>
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Photos</label>
            <div className="grid grid-cols-2 gap-2">
              {(['before', 'after', 'product'] as const).map(type => {
                const existing = photos.filter(p => p.type === type)
                return (
                  <button key={type} onClick={() => addPhoto(type)}
                    className="border-2 border-dashed border-zinc-200 rounded-xl p-3 text-center hover:border-red-300 transition-colors">
                    {existing.length > 0 ? (
                      <div>
                        <p className="text-xs font-semibold text-emerald-600">{existing.length} photo{existing.length > 1 ? 's' : ''}</p>
                        <p className="text-[10px] text-zinc-400 capitalize mt-0.5">{type}</p>
                      </div>
                    ) : (
                      <div>
                        <Upload size={16} className="mx-auto text-zinc-300 mb-1" />
                        <p className="text-[10px] text-zinc-400 capitalize">{type}</p>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 block">Notes</label>
            <textarea className={inputClass} rows={2} placeholder="Additional notes..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-600">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedIntake || !coatingBrand || !coatingProduct}
            className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-red-700 to-red-600 text-white text-sm font-semibold disabled:opacity-40"
          >
            {saving ? 'Creating...' : 'Create Certificate'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Uncomment the builder in Certify.tsx**

In `src/pages/Certify.tsx`, add the import at top:

```typescript
import CertificateBuilder from '@/components/CertificateBuilder'
```

And replace the commented-out line with:

```typescript
{showBuilder && <CertificateBuilder onClose={() => { setShowBuilder(false); refresh() }} />}
```

**Step 3: Build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add src/components/CertificateBuilder.tsx src/pages/Certify.tsx
git commit -m "feat(certify): add certificate builder modal with photo upload"
```

---

### Task 7: Create Certificate Detail Page

**Files:**
- Create: `src/pages/CertificateDetail.tsx`

**Step 1: Create the detail page**

Create `src/pages/CertificateDetail.tsx`:

```typescript
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCertificate, updateCertificate, getCertificatePhotoUrl } from '@/lib/store'
import { Certificate } from '@/lib/types'
import { Shield, ArrowLeft, Copy, Check, Loader2, Eye, EyeOff, Ban } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

export default function CertificateDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cert, setCert] = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (id) getCertificate(id).then(c => { setCert(c); setLoading(false) })
  }, [id])

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 size={32} className="animate-spin text-red-600" /></div>
  if (!cert) return <div className="p-6 text-center text-zinc-400">Certificate not found</div>

  const verifyUrl = `${window.location.origin}/verify/${cert.id}`

  const copyLink = () => {
    navigator.clipboard.writeText(verifyUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const togglePublic = async () => {
    await updateCertificate(cert.id, { is_public: !cert.is_public })
    setCert({ ...cert, is_public: !cert.is_public })
  }

  const voidCert = async () => {
    if (!confirm('Void this certificate? This cannot be undone.')) return
    await updateCertificate(cert.id, { status: 'voided' })
    setCert({ ...cert, status: 'voided' })
  }

  const statusColor = cert.status === 'active' ? 'bg-emerald-50 text-emerald-700' : cert.status === 'expired' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'
  const warrantyActive = new Date(cert.warranty_expiry) > new Date()

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <button onClick={() => navigate('/certify')} className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-600 mb-4">
        <ArrowLeft size={14} /> Back to Certificates
      </button>

      {/* Header */}
      <div className="glass rounded-2xl p-5 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={18} className="text-red-600" />
              <h2 className="text-lg font-bold text-zinc-900">{cert.certificate_number}</h2>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${statusColor}`}>{cert.status}</span>
            </div>
            <p className="text-sm text-zinc-500">{cert.intake?.customer?.name}</p>
            <p className="text-xs text-zinc-400">{cert.intake?.year} {cert.intake?.make} {cert.intake?.model} {cert.intake?.vin && `· VIN: ${cert.intake.vin}`}</p>
          </div>
          <QRCodeSVG value={verifyUrl} size={80} />
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="glass rounded-2xl p-4">
          <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">Coating</p>
          <p className="text-sm font-semibold text-zinc-900 mt-1">{cert.coating_brand}</p>
          <p className="text-xs text-zinc-500">{cert.coating_product}</p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">Warranty</p>
          <p className="text-sm font-semibold text-zinc-900 mt-1">{cert.warranty_years} year{cert.warranty_years > 1 ? 's' : ''}</p>
          <p className={`text-xs ${warrantyActive ? 'text-emerald-600' : 'text-red-500'}`}>
            {warrantyActive ? 'Active' : 'Expired'} · {new Date(cert.warranty_expiry).toLocaleDateString()}
          </p>
        </div>
        {cert.odometer && (
          <div className="glass rounded-2xl p-4">
            <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">Odometer</p>
            <p className="text-sm font-semibold text-zinc-900 mt-1">{cert.odometer.toLocaleString()} mi</p>
          </div>
        )}
        <div className="glass rounded-2xl p-4">
          <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium">Installed</p>
          <p className="text-sm font-semibold text-zinc-900 mt-1">{new Date(cert.created_at).toLocaleDateString()}</p>
          {cert.technician && <p className="text-xs text-zinc-500">by {cert.technician.display_name}</p>}
        </div>
      </div>

      {/* Photos */}
      {cert.photos && cert.photos.length > 0 && (
        <div className="glass rounded-2xl p-4 mb-4">
          <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-medium mb-3">Photos</p>
          <div className="grid grid-cols-3 gap-2">
            {cert.photos.map(photo => (
              <div key={photo.id} className="relative">
                <img src={getCertificatePhotoUrl(photo.storage_path)} alt={photo.photo_type} className="w-full h-24 object-cover rounded-xl" />
                <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded-full capitalize">{photo.photo_type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <button onClick={copyLink} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
          {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy Share Link'}
        </button>
        <button onClick={togglePublic} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-200 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
          {cert.is_public ? <EyeOff size={14} /> : <Eye size={14} />}
          {cert.is_public ? 'Make Private' : 'Make Public'}
        </button>
        {cert.status === 'active' && (
          <button onClick={voidCert} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50">
            <Ban size={14} /> Void Certificate
          </button>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/pages/CertificateDetail.tsx
git commit -m "feat(certify): add certificate detail page with QR code and actions"
```

---

### Task 8: Create Public Verification Page

**Files:**
- Create: `src/pages/VerifyCertificate.tsx`

**Step 1: Create the public verification page**

Create `src/pages/VerifyCertificate.tsx`:

```typescript
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicCertificate, getCertificatePhotoUrl } from '@/lib/store'
import { Certificate } from '@/lib/types'
import { Shield, ShieldCheck, ShieldX, Loader2 } from 'lucide-react'

export default function VerifyCertificate() {
  const { certId } = useParams()
  const [cert, setCert] = useState<Certificate | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (certId) {
      getPublicCertificate(certId).then(c => {
        if (c) setCert(c)
        else setNotFound(true)
        setLoading(false)
      })
    }
  }, [certId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 size={32} className="animate-spin text-red-600" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-6">
        <ShieldX size={48} className="text-zinc-300 mb-4" />
        <h1 className="text-lg font-bold text-zinc-700">Certificate Not Found</h1>
        <p className="text-sm text-zinc-400 mt-1 text-center">This certificate is private or does not exist.</p>
        <div className="mt-6 flex items-center gap-2">
          <img src="https://www.autocaregenius.com/cdn/shop/files/v11_1.svg?v=1760731533&width=160" alt="Auto Care Genius" className="h-6 w-auto opacity-40" />
          <p className="text-[10px] text-zinc-300">Verified by Pro Hub</p>
        </div>
      </div>
    )
  }

  const warrantyActive = cert && new Date(cert.warranty_expiry) > new Date()

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
      <div className="max-w-md mx-auto">
        {/* Branding header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="https://www.autocaregenius.com/cdn/shop/files/v11_1.svg?v=1760731533&width=160" alt="Auto Care Genius" className="h-8 w-auto" />
          </div>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium">Verified by Pro Hub</p>
        </div>

        {/* Verification badge */}
        <div className={`rounded-2xl p-5 text-center mb-4 ${cert?.status === 'active' && warrantyActive ? 'bg-emerald-50' : cert?.status === 'voided' ? 'bg-red-50' : 'bg-amber-50'}`}>
          {cert?.status === 'active' && warrantyActive ? (
            <>
              <ShieldCheck size={40} className="text-emerald-600 mx-auto mb-2" />
              <h1 className="text-lg font-bold text-emerald-800">Verified Installation</h1>
              <p className="text-sm text-emerald-600 mt-1">Warranty Active</p>
            </>
          ) : cert?.status === 'voided' ? (
            <>
              <ShieldX size={40} className="text-red-500 mx-auto mb-2" />
              <h1 className="text-lg font-bold text-red-800">Certificate Voided</h1>
            </>
          ) : (
            <>
              <Shield size={40} className="text-amber-600 mx-auto mb-2" />
              <h1 className="text-lg font-bold text-amber-800">Warranty Expired</h1>
            </>
          )}
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 divide-y divide-zinc-100">
          <div className="px-4 py-3">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Certificate</p>
            <p className="text-sm font-bold text-zinc-900">{cert?.certificate_number}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Vehicle</p>
            <p className="text-sm font-semibold text-zinc-900">{cert?.intake?.year} {cert?.intake?.make} {cert?.intake?.model}</p>
            {cert?.intake?.vin && <p className="text-xs text-zinc-500">VIN: {cert.intake.vin}</p>}
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Coating</p>
            <p className="text-sm font-semibold text-zinc-900">{cert?.coating_brand} {cert?.coating_product}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Install Date</p>
            <p className="text-sm font-semibold text-zinc-900">{cert && new Date(cert.created_at).toLocaleDateString()}</p>
            {cert?.technician && <p className="text-xs text-zinc-500">by {cert.technician.display_name}</p>}
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Warranty</p>
            <p className="text-sm font-semibold text-zinc-900">{cert?.warranty_years} year{(cert?.warranty_years || 0) > 1 ? 's' : ''}</p>
            <p className={`text-xs ${warrantyActive ? 'text-emerald-600' : 'text-red-500'}`}>
              {warrantyActive ? 'Valid' : 'Expired'} through {cert && new Date(cert.warranty_expiry).toLocaleDateString()}
            </p>
          </div>
          {cert?.odometer && (
            <div className="px-4 py-3">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Odometer at Install</p>
              <p className="text-sm font-semibold text-zinc-900">{cert.odometer.toLocaleString()} miles</p>
            </div>
          )}
        </div>

        {/* Photos */}
        {cert?.photos && cert.photos.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-medium mb-2 px-1">Installation Photos</p>
            <div className="grid grid-cols-2 gap-2">
              {cert.photos.map(photo => (
                <div key={photo.id} className="relative">
                  <img src={getCertificatePhotoUrl(photo.storage_path)} alt={photo.photo_type}
                    className="w-full h-32 object-cover rounded-xl" />
                  <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded-full capitalize">{photo.photo_type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/pages/VerifyCertificate.tsx
git commit -m "feat(certify): add public verification page with warranty status"
```

---

### Task 9: Add Routes and Navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Layout.tsx`

**Step 1: Add routes to App.tsx**

In `src/App.tsx`, add imports:

```typescript
import Certify from '@/pages/Certify'
import CertificateDetail from '@/pages/CertificateDetail'
import VerifyCertificate from '@/pages/VerifyCertificate'
```

Add the public verify route alongside the existing `/book/:slug` public route check:

```typescript
if (window.location.pathname.startsWith('/verify/')) {
  return (
    <Routes>
      <Route path="/verify/:certId" element={<VerifyCertificate />} />
    </Routes>
  )
}
```

Add authenticated routes inside the Layout Route:

```typescript
<Route path="/certify" element={<Certify />} />
<Route path="/certify/:id" element={<CertificateDetail />} />
```

And add the verify route in the main Routes block too:

```typescript
<Route path="/verify/:certId" element={<VerifyCertificate />} />
```

**Step 2: Add nav item to Layout.tsx**

In `src/components/Layout.tsx`, add `Shield` to the lucide-react import.

In the `navItems` array, add after the Invoices entry:

```typescript
{ to: '/certify', icon: Shield, label: 'Certify' },
```

So the array becomes:
```typescript
const navItems = [
  { to: '/', icon: Car, label: 'Intake' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/certify', icon: Shield, label: 'Certify' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/hours', icon: Clock, label: 'Hours' },
  { to: '/services', icon: Wrench, label: 'Services' },
]
```

**Step 3: Build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add src/App.tsx src/components/Layout.tsx
git commit -m "feat(certify): add routes and navigation for Certify feature"
```

---

### Task 10: Add "Certify" Button to Intake History

**Files:**
- Modify: `src/pages/IntakeHistory.tsx`

**Step 1: Add Certify action to intake rows**

Read `src/pages/IntakeHistory.tsx` to understand the current table row structure.

Add a "Certify" button/link to each intake row that navigates to the Certify page with the intake pre-selected. Import `Shield` from lucide-react and `useNavigate` from react-router-dom.

Add a button in each row's action area:

```typescript
<button
  onClick={(e) => { e.stopPropagation(); navigate('/certify?intake=' + intake.id) }}
  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
  title="Create Certificate"
>
  <Shield size={12} /> Certify
</button>
```

Then in `src/pages/Certify.tsx`, read the query param on mount:

```typescript
import { useSearchParams } from 'react-router-dom'

// Inside component:
const [searchParams] = useSearchParams()
const preselectedIntake = searchParams.get('intake')

// Pass to builder:
{showBuilder && <CertificateBuilder onClose={() => { setShowBuilder(false); refresh() }} preselectedIntakeId={preselectedIntake || undefined} />}

// Auto-open builder if intake param present:
useEffect(() => {
  if (preselectedIntake) setShowBuilder(true)
}, [preselectedIntake])
```

**Step 2: Build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/pages/IntakeHistory.tsx src/pages/Certify.tsx
git commit -m "feat(certify): add Certify button to intake history rows"
```

---

## Execution Order Summary

| Task | Description | Dependencies |
|------|-------------|-------------|
| 1 | Create DB tables + Storage bucket | None (Supabase dashboard) |
| 2 | TypeScript types | None |
| 3 | Store hooks (CRUD + photo upload) | Task 2 |
| 4 | Install qrcode.react | None |
| 5 | Certify list page | Tasks 2, 3 |
| 6 | Certificate builder modal | Tasks 2, 3, 5 |
| 7 | Certificate detail page | Tasks 2, 3, 4 |
| 8 | Public verification page | Tasks 2, 3 |
| 9 | Routes + navigation | Tasks 5, 6, 7, 8 |
| 10 | History page integration | Tasks 5, 6, 9 |

Tasks 1, 2, and 4 can run in parallel. Tasks 5-8 can largely run in parallel after 2+3 are done. Task 9 wires everything together. Task 10 is the final polish.
