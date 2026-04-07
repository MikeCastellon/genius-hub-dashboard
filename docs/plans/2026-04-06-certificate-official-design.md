# Certificate Official Upgrade — Design

**Goal:** Make both the internal CertificateDetail page and the public VerifyCertificate page look official and professional, with issuing company info and print support.

## Changes

### 1. Header (top of certificate)
- Business logo (centered, larger)
- Business name in bold, formal typography
- Thin divider line below

### 2. Footer (bottom of certificate)
- Business name, address, phone, website
- Technician name with "Installed by" label
- Certificate number repeated for reference

### 3. Data fetch update
- Expand the `business` select in both `getCertificate()` and `getPublicCertificate()` from `(name, slug, logo_url)` to `(name, slug, logo_url, phone, address, website)`

### 4. Print support
- "Print Certificate" button on both pages
- `@media print` CSS that:
  - Hides sidebar, nav, header, buttons, and non-certificate UI
  - Sets white background, no shadows
  - Ensures the certificate fills the page nicely

## Files to modify
- `src/lib/store.ts` — expand business select in both fetch functions
- `src/pages/CertificateDetail.tsx` — add header/footer sections + print button
- `src/pages/VerifyCertificate.tsx` — add header/footer sections + print button
- `src/index.css` — add `@media print` styles

## What stays the same
- All existing certificate content (vehicle, customer, coating, warranty, photos, etc.)
- QR code, share link, public toggle on internal page
- Status badges, warranty countdown
