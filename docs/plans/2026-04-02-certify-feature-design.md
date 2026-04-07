# Certify Feature — Design Document

**Date:** 2026-04-02
**Status:** Approved
**Feature:** Digital certificates of installation with warranty tracking and public QR verification

## Context

Pro Hub is a SaaS detailing business management app. The Certify feature adds digital proof-of-installation certificates for ceramic coatings. When a shop installs a coating, they create a certificate linking the VIN, coating product, photos, and warranty — generating a QR code that anyone (buyer, dealer, marketplace) can scan to verify the install.

This replaces "trust me bro" with verifiable proof.

## Data Model

### certificates table

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
  using (business_id in (select business_id from public.profiles where id = auth.uid()));

create policy "Users create certificates for own business"
  on public.certificates for insert
  with check (business_id in (select business_id from public.profiles where id = auth.uid()));

create policy "Users update own business certificates"
  on public.certificates for update
  using (business_id in (select business_id from public.profiles where id = auth.uid()));

create policy "Public can view public certificates"
  on public.certificates for select
  using (is_public = true);
```

### certificate_photos table

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
  using (certificate_id in (select id from public.certificates where business_id in (select business_id from public.profiles where id = auth.uid())));

create policy "Users create photos for own certificates"
  on public.certificate_photos for insert
  with check (certificate_id in (select id from public.certificates where business_id in (select business_id from public.profiles where id = auth.uid())));

create policy "Public can view public certificate photos"
  on public.certificate_photos for select
  using (certificate_id in (select id from public.certificates where is_public = true));
```

### Supabase Storage

Bucket: `certificate-photos`
- Public read for photos linked to public certificates
- Authenticated write (upload requires auth)
- Path pattern: `{business_id}/{certificate_id}/{photo_type}_{timestamp}.jpg`

## TypeScript Types

```typescript
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
  technician?: Profile
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

## Pages & Components

### Certify list page — `/certify`

Nav placement: between Invoices and Schedule.

- Header with count + "New Certificate" button
- Search bar (VIN, customer name, cert number)
- Status filter pills (All, Active, Expired, Voided)
- Card/row per cert: cert number, customer, vehicle, warranty expiry, status badge
- Follows Invoices page layout pattern

### Certificate builder modal — `CertificateBuilder.tsx`

Modal form following InvoiceBuilder pattern:
1. Select existing intake (dropdown/search by customer or VIN)
2. Coating details (brand, product, odometer)
3. Warranty (years: 1/2/3/5/10, auto-calculates expiry from today)
4. Photo upload (before/after/product — tap or drag)
5. Review & Create

Generates unique cert number (CERT-0001 pattern) + QR code on save.

### Certificate detail page — `/certify/:id`

- Full certificate display with QR code (rendered via qrcode.react)
- Vehicle info from linked intake (VIN, year/make/model, customer)
- Coating details, install date, technician
- Before/after photos gallery
- Warranty status bar with countdown
- Public visibility toggle
- Actions: Copy share link, Void certificate

### Public verification page — `/verify/:certId` (no auth)

- Clean branded page (ACG logo, "Verified by Pro Hub")
- Vehicle info, install date, coating product, installer shop name
- Warranty status (active/expired with dates)
- Before/after photos
- Respects is_public toggle — if off, shows "This certificate is private"

### History page integration

- "Certify" button on each intake row for quick-create (opens CertificateBuilder pre-populated with that intake)

## QR Code & Sharing

- Library: `qrcode.react` (client-side rendering, no server)
- QR encodes: `https://genius-hub-dashboard.netlify.app/verify/{certificate_id}`
- Displayed on CertificateDetail page
- Shop copies link or shows QR for owner to scan
- No Apple Wallet for v1

## Store Hooks (store.ts)

```typescript
useCertificates()           // List all for business
getCertificate(id)          // Detail with relations
getPublicCertificate(id)    // For /verify page (no auth)
createCertificate(cert)     // Insert + generate cert number
updateCertificate(id, data) // Status, visibility, notes
uploadCertificatePhoto(certificateId, file, photoType) // Supabase Storage
```

## What's NOT in v1

- Warranty claims workflow (just display warranty info)
- Apple Wallet / Google Wallet pass generation
- PDF export/download of certificate
- Carfax integration
- Email/SMS delivery to owner (shop manually shares link)

## Dependencies

- `qrcode.react` — QR code rendering
- Supabase Storage — photo uploads (new capability for the app)
