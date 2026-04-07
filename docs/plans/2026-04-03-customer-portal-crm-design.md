# Customer Portal & CRM Design

**Date:** 2026-04-03
**Status:** Approved

## Overview

Add a customer-facing portal where customers can view bookings, history, invoices, and rebook — plus a business-side CRM page for managing customers with notes, tags, and contact actions.

## 1. Data Model

### New role
- `customer` added to `UserRole`: `'super_admin' | 'admin' | 'user' | 'customer'`

### Modified tables

| Table | Change |
|-------|--------|
| `profiles` | Add `preferred_contact TEXT DEFAULT 'phone'` (values: phone, email, sms) |
| `customers` | Add `business_id UUID REFERENCES businesses(id)` |
| `customers` | Add `profile_id UUID REFERENCES profiles(id)` (nullable — linked when account exists) |
| `customers` | Add `total_spend NUMERIC DEFAULT 0` |
| `customers` | Add `last_visit TIMESTAMPTZ` |
| `customers` | Add `tags TEXT[] DEFAULT '{}'` |

### New tables

| Table | Columns |
|-------|---------|
| `customer_notes` | `id UUID PK`, `customer_id UUID FK`, `author_id UUID FK profiles`, `body TEXT NOT NULL`, `created_at TIMESTAMPTZ DEFAULT NOW()` |

### Triggers
- On `vehicle_intakes` insert: update matching customer's `total_spend` and `last_visit`
- Updated `handle_new_user()`: if `raw_user_meta_data.role = 'customer'`, create profile with `role: 'customer'`, `approved: true`, and link to customer record

## 2. Customer Portal (Frontend)

Separate layout — clean top nav (logo, nav links, profile dropdown), no sidebar.

| Page | Route | Description |
|------|-------|-------------|
| My Bookings | `/portal` | Upcoming appointments with status, cancel option, "Book Again" button |
| History | `/portal/history` | Past intakes — date, vehicle, services, total. View/download invoice PDF |
| Book | `/portal/book` | Redirects to `/book/:slug` pre-filled with customer info |
| Profile | `/portal/profile` | Edit name, phone, email, preferred contact method, change password |

### Access control
- `customer` role users routed to `/portal` instead of main app
- Cannot access any staff routes (`/dashboard`, `/admin`, etc.)
- Staff cannot access `/portal`

## 3. Business-Side CRM Page

New nav item: "Customers" in sidebar (between History and Services).

### 2-panel layout

**Left panel — Customer list:**
- Searchable by name, phone, email
- Filterable by tag
- Sortable by name, last visit, total spend
- "Add Customer" button (create manually or send invite link)
- Each row: avatar initial, name, phone, tags as colored chips, last visit, total spend

**Right panel — Customer detail:**
- Profile header: name, contact info, preferred contact, account status (has account / no account / invited)
- Contact actions: Call (`tel:`), Email (`mailto:`), Text (`sms:` native) — based on preferred contact
- Activity timeline: timestamped notes from staff, auto-entries for intakes/bookings
- Add note input at top of timeline
- Tags: add/remove colored tags
- History tabs: Intakes | Bookings | Invoices

## 4. Account Creation Flows

### Flow A — Customer self-registers (from booking page)
1. Booking page gets "Create Account" button
2. Customer fills: name, phone, email, password, preferred contact
3. Supabase creates auth user -> trigger creates profile with `role: 'customer'`
4. Links to existing customer record (by phone/email) or creates new one
5. Supabase invite email includes app store download links

### Flow B — Business sends invite
1. Staff clicks "Send Invite" on CRM page for customer without account
2. `supabase.auth.admin.inviteUserByEmail()` called
3. Customer gets email: "Set up your account" link + app store links + business branding
4. Customer sets password -> profile created with `role: 'customer'`
5. `customers.profile_id` linked to new auth profile

### Flow C — Post-intake invite
1. After intake submission, if customer has no account + has email: prompt "Send account invite?"
2. Staff confirms -> same invite flow as Flow B
3. No email on file -> skip prompt

## 5. Routing & Access Control

```
if (!user) -> Login
if (user && profile.role === 'customer') -> Portal layout
if (user && !profile.approved) -> PendingApproval
if (user && approved) -> Staff layout
```

- Customer accounts are auto-approved (no admin gate)
- Customer -> `/dashboard` redirects to `/portal`
- Staff -> `/portal` redirects to `/`

## 6. RLS Policies

- `customer_notes`: staff CRUD for their business's customers; customers read own notes
- `customers`: business_id scoping — staff see own business; customers see own record
- Portal: customers read own appointments, intakes, invoices

## Technical Decisions

- Same Supabase Auth (email + password) for customers and staff
- SMS uses native `sms:` links, not web-based
- Contact preferences: phone, email, sms
- Full invoice PDF access for customers
- Timeline notes (timestamped, attributed) not single text field
- PaymentMethod type is `string` (supports custom methods)
