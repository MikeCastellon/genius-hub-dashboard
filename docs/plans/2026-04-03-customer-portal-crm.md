# Customer Portal & CRM Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a customer-facing portal (bookings, history, invoices, profile) and a business-side CRM page with notes, tags, and contact actions.

**Architecture:** Extend Supabase Auth with a `customer` role, add a separate portal layout for customers, build a 2-panel CRM page for staff. Customer accounts are auto-approved and scoped to a business via `customers.business_id`.

**Tech Stack:** React 19, Supabase (Auth + DB + RLS), React Router 7, Tailwind CSS v4, Lucide icons

---

### Task 1: Database Migration — Extend Tables

**Files:**
- Create: `supabase/migrations/20260403000000_customer_portal.sql`
- Modify: `supabase/migration.sql` (append)

**Step 1: Write the migration SQL**

```sql
-- ============================================================
-- Customer Portal & CRM Migration
-- ============================================================

-- 1. Add preferred_contact to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_contact TEXT DEFAULT 'phone'
    CHECK (preferred_contact IN ('phone', 'email', 'sms'));

-- 2. Update role check to include 'customer'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'user', 'customer'));

-- 3. Extend customers table
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_spend NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_visit TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 4. Remove unique constraint on phone (customers can exist per business)
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_phone_key;
-- Add unique per business instead
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone_business
  ON customers(phone, business_id) WHERE business_id IS NOT NULL;

-- 5. Create customer_notes table
CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_profile ON customers(profile_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON customer_notes(customer_id);

-- 7. Enable RLS on customer_notes
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;

-- Staff can manage notes for their business's customers
CREATE POLICY "staff_manage_notes" ON customer_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_notes.customer_id
        AND c.business_id = get_my_business_id()
    )
  );

-- Customers can read their own notes
CREATE POLICY "customer_read_own_notes" ON customer_notes
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE profile_id = auth.uid()
    )
  );

-- 8. Update customers RLS: scope to business
DROP POLICY IF EXISTS "Authenticated users can view customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON customers;

-- Staff see their business's customers
CREATE POLICY "staff_view_customers" ON customers
  FOR SELECT USING (
    business_id = get_my_business_id()
    OR get_my_role() = 'super_admin'
  );

-- Staff can insert customers for their business
CREATE POLICY "staff_insert_customers" ON customers
  FOR INSERT WITH CHECK (
    business_id = get_my_business_id()
    OR get_my_role() = 'super_admin'
  );

-- Staff can update their business's customers
CREATE POLICY "staff_update_customers" ON customers
  FOR UPDATE USING (
    business_id = get_my_business_id()
    OR get_my_role() = 'super_admin'
  );

-- Customers can view their own record
CREATE POLICY "customer_view_own" ON customers
  FOR SELECT USING (profile_id = auth.uid());

-- Customers can update their own record
CREATE POLICY "customer_update_own" ON customers
  FOR UPDATE USING (profile_id = auth.uid());

-- 9. Customers can view their own appointments
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'customer_view_own_appointments' AND tablename = 'appointments') THEN
  CREATE POLICY "customer_view_own_appointments" ON appointments
    FOR SELECT USING (
      customer_email IN (
        SELECT p.email FROM profiles p WHERE p.id = auth.uid() AND p.role = 'customer'
      )
      OR customer_phone IN (
        SELECT c.phone FROM customers c WHERE c.profile_id = auth.uid()
      )
    );
END IF;
END $$;

-- 10. Customers can view their own intakes
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'customer_view_own_intakes' AND tablename = 'vehicle_intakes') THEN
  CREATE POLICY "customer_view_own_intakes" ON vehicle_intakes
    FOR SELECT USING (
      customer_id IN (
        SELECT id FROM customers WHERE profile_id = auth.uid()
      )
    );
END IF;
END $$;

-- 11. Customers can view their own invoices
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'customer_view_own_invoices' AND tablename = 'invoices') THEN
  CREATE POLICY "customer_view_own_invoices" ON invoices
    FOR SELECT USING (
      customer_id IN (
        SELECT id FROM customers WHERE profile_id = auth.uid()
      )
    );
END IF;
END $$;

-- 12. Update handle_new_user trigger to support customer role
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  meta_role TEXT;
  meta_business_id UUID;
  customer_rec RECORD;
BEGIN
  meta_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  meta_business_id := (NEW.raw_user_meta_data->>'business_id')::UUID;

  -- Validate role
  IF meta_role NOT IN ('super_admin', 'admin', 'user', 'customer') THEN
    meta_role := 'user';
  END IF;

  INSERT INTO profiles (id, display_name, email, role, business_id, approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    meta_role,
    meta_business_id,
    CASE WHEN meta_role = 'customer' THEN true ELSE false END
  );

  -- If customer role, link to existing customer record by email or phone
  IF meta_role = 'customer' AND meta_business_id IS NOT NULL THEN
    UPDATE customers
    SET profile_id = NEW.id
    WHERE email = NEW.email
      AND business_id = meta_business_id
      AND profile_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Trigger: update customer spend/last_visit on intake insert
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customers
  SET
    total_spend = COALESCE(total_spend, 0) + COALESCE(NEW.subtotal, 0),
    last_visit = GREATEST(COALESCE(last_visit, '1970-01-01'::timestamptz), NEW.created_at)
  WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_intake_created ON vehicle_intakes;
CREATE TRIGGER on_intake_created
  AFTER INSERT ON vehicle_intakes
  FOR EACH ROW EXECUTE FUNCTION update_customer_stats();

-- 14. Remove payment_method check constraint (now supports custom methods)
ALTER TABLE vehicle_intakes DROP CONSTRAINT IF EXISTS vehicle_intakes_payment_method_check;
```

**Step 2: Apply migration via Supabase MCP**

Run the migration against the project `rbtilezwxucnqefukbzi`.

**Step 3: Commit**

```bash
git add supabase/migrations/20260403000000_customer_portal.sql
git commit -m "feat: database migration for customer portal and CRM"
```

---

### Task 2: Update Types & Store — Customer Role + New Hooks

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/store.ts`

**Step 1: Update UserRole type**

In `src/lib/types.ts`, change:
```typescript
export type UserRole = 'super_admin' | 'admin' | 'user' | 'customer'
```

**Step 2: Update Customer interface**

```typescript
export interface Customer {
  id: string
  name: string
  phone: string
  email: string | null
  business_id: string | null
  profile_id: string | null
  total_spend: number
  last_visit: string | null
  tags: string[]
  created_at: string
}
```

**Step 3: Add CustomerNote interface**

```typescript
export interface CustomerNote {
  id: string
  customer_id: string
  author_id: string | null
  body: string
  created_at: string
  author?: { display_name: string }
}
```

**Step 4: Add preferred_contact to Profile**

```typescript
export interface Profile {
  id: string
  display_name: string
  email: string | null
  role: UserRole
  business_id: string | null
  approved: boolean
  preferred_contact: 'phone' | 'email' | 'sms'
  created_at: string
}
```

**Step 5: Add new store hooks and functions**

In `src/lib/store.ts`, add:

```typescript
// ============ Customer CRM ============

export function useCustomerDetail(customerId: string | null) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [notes, setNotes] = useState<CustomerNote[]>([])
  const [intakes, setIntakes] = useState<VehicleIntake[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!customerId || !isConfigured()) { setLoading(false); return }

    const [custRes, notesRes, intakesRes, apptsRes, invoicesRes] = await Promise.all([
      supabase.from('customers').select('*').eq('id', customerId).single(),
      supabase.from('customer_notes').select('*, author:profiles(display_name)').eq('customer_id', customerId).order('created_at', { ascending: false }),
      supabase.from('vehicle_intakes').select('*, customer:customers(*), intake_services(*, service:services(*))').eq('customer_id', customerId).order('created_at', { ascending: false }),
      supabase.from('appointments').select('*').or(`customer_phone.eq.${custRes.data?.phone},customer_email.eq.${custRes.data?.email}`).order('scheduled_at', { ascending: false }),
      supabase.from('invoices').select('*, items:invoice_items(*)').eq('customer_id', customerId).order('created_at', { ascending: false }),
    ])

    setCustomer(custRes.data)
    setNotes(notesRes.data || [])
    setIntakes(intakesRes.data || [])
    setAppointments(apptsRes.data || [])
    setInvoices(invoicesRes.data || [])
    setLoading(false)
  }, [customerId])

  useEffect(() => { refresh() }, [refresh])
  return { customer, notes, intakes, appointments, invoices, loading, refresh }
}

export async function addCustomerNote(customerId: string, authorId: string, body: string) {
  const { data, error } = await supabase
    .from('customer_notes')
    .insert({ customer_id: customerId, author_id: authorId, body })
    .select('*, author:profiles(display_name)')
    .single()
  if (error) throw error
  return data
}

export async function updateCustomerTags(customerId: string, tags: string[]) {
  const { error } = await supabase
    .from('customers')
    .update({ tags })
    .eq('id', customerId)
  if (error) throw error
}

export async function inviteCustomer(email: string, businessId: string, businessName: string) {
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { role: 'customer', business_id: businessId },
    redirectTo: `${window.location.origin}/portal`,
  })
  if (error) throw error
  return data
}

// ============ Customer Portal ============

export function useMyCustomerRecord() {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConfigured()) { setLoading(false); return }
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('profile_id', user.id)
        .maybeSingle()
      setCustomer(data)
      setLoading(false)
    })
  }, [])

  return { customer, loading }
}

export function useMyAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isConfigured()) { setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: customer } = await supabase
      .from('customers')
      .select('phone, email')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (!customer) { setLoading(false); return }

    const { data } = await supabase
      .from('appointments')
      .select('*')
      .or(`customer_phone.eq.${customer.phone},customer_email.eq.${customer.email}`)
      .order('scheduled_at', { ascending: true })

    setAppointments(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { appointments, loading, refresh }
}

export function useMyIntakes() {
  const [intakes, setIntakes] = useState<VehicleIntake[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isConfigured()) { setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (!customer) { setLoading(false); return }

    const { data } = await supabase
      .from('vehicle_intakes')
      .select('*, intake_services(*, service:services(*))')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })

    setIntakes(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { intakes, loading, refresh }
}

export function useMyInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isConfigured()) { setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle()

    if (!customer) { setLoading(false); return }

    const { data } = await supabase
      .from('invoices')
      .select('*, items:invoice_items(*)')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })

    setInvoices(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])
  return { invoices, loading, refresh }
}
```

**Step 6: Update upsertCustomer to include business_id**

Change existing `upsertCustomer` to accept and pass `businessId`:

```typescript
export async function upsertCustomer(
  cust: { name: string; phone: string; email: string },
  businessId?: string
): Promise<Customer> {
  // Look up by phone + business_id
  const query = supabase.from('customers').select('*').eq('phone', cust.phone)
  if (businessId) query.eq('business_id', businessId)
  const { data: existing } = await query.maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('customers')
      .update({ name: cust.name, email: cust.email || existing.email })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('customers')
    .insert({ ...cust, business_id: businessId || null })
    .select()
    .single()
  if (error) throw error
  return data
}
```

**Step 7: Update createIntake to pass businessId to upsertCustomer**

In existing `createIntake`, update the `upsertCustomer` call to include `businessId`.

**Step 8: Commit**

```bash
git add src/lib/types.ts src/lib/store.ts
git commit -m "feat: customer role, CRM hooks, portal hooks, extended customer model"
```

---

### Task 3: Customer Portal Layout

**Files:**
- Create: `src/components/PortalLayout.tsx`

**Step 1: Build the portal layout**

Simple top nav with logo, nav links, profile dropdown. Uses same Outfit font and design tokens as staff app.

Nav items: My Bookings, History, Book Again, Profile

Structure:
- Top bar: logo/business name left, nav links center, user dropdown right
- Main content area below
- Mobile: hamburger menu or bottom nav
- Uses `<Outlet />` from react-router for child routes

**Step 2: Commit**

```bash
git add src/components/PortalLayout.tsx
git commit -m "feat: customer portal layout with top navigation"
```

---

### Task 4: Portal Pages

**Files:**
- Create: `src/pages/portal/PortalBookings.tsx`
- Create: `src/pages/portal/PortalHistory.tsx`
- Create: `src/pages/portal/PortalProfile.tsx`

**Step 1: PortalBookings (default portal page)**

- Shows upcoming appointments from `useMyAppointments()`
- Each card: date, time, services, status, cancel button (updates status to 'cancelled')
- "Book Again" button links to `/book/:slug`
- Empty state: "No upcoming bookings"

**Step 2: PortalHistory**

- Shows past intakes from `useMyIntakes()` and invoices from `useMyInvoices()`
- Two tabs: "Service History" and "Invoices"
- Service History: cards with date, vehicle, services list, total
- Invoices: cards with invoice number, date, total, status, "View Invoice" link to `/invoices/:id`

**Step 3: PortalProfile**

- Form: name, phone, email, preferred contact method (radio: Phone, Email, SMS)
- Save button updates profile and customer record
- Change password section: calls `supabase.auth.updateUser({ password })`
- App download links (placeholder URLs for now)

**Step 4: Commit**

```bash
git add src/pages/portal/
git commit -m "feat: portal pages — bookings, history, profile"
```

---

### Task 5: Routing — Customer vs Staff Split

**Files:**
- Modify: `src/App.tsx`

**Step 1: Add customer portal routes**

After the public routes block, add a customer role check before the staff layout:

```typescript
// Customer portal
if (user && profile?.role === 'customer') {
  return (
    <Routes>
      {/* Public routes still accessible */}
      <Route path="/book/:slug" element={<BookingPage />} />
      <Route path="/verify/:certId" element={<VerifyCertificate />} />

      {/* Portal routes */}
      <Route element={<PortalLayout />}>
        <Route path="/portal" element={<PortalBookings />} />
        <Route path="/portal/history" element={<PortalHistory />} />
        <Route path="/portal/profile" element={<PortalProfile />} />
      </Route>

      {/* Redirect everything else to portal */}
      <Route path="*" element={<Navigate to="/portal" replace />} />
    </Routes>
  )
}
```

**Step 2: Import new components**

Add imports for PortalLayout, PortalBookings, PortalHistory, PortalProfile.

**Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: customer portal routing with role-based layout split"
```

---

### Task 6: Customer Self-Registration on Booking Page

**Files:**
- Modify: `src/pages/BookingPage.tsx`

**Step 1: Add "Create Account" option on the booking success screen**

After successful booking submission, show a card:
- "Want to track your bookings? Create a free account"
- Form fields: password (email already collected in booking)
- On submit: `supabase.auth.signUp({ email, password, options: { data: { role: 'customer', business_id, display_name: customerName } } })`
- Success: "Account created! Check your email." with app store download links

**Step 2: Add "Already have an account? Sign in" link**

At the top of the booking page, if not logged in, show subtle link to login page.

**Step 3: Pre-fill booking form for logged-in customers**

If user is logged in with customer role, auto-fill name, phone, email from their profile.

**Step 4: Commit**

```bash
git add src/pages/BookingPage.tsx
git commit -m "feat: customer self-registration from booking page"
```

---

### Task 7: Business-Side CRM Page — Customer List

**Files:**
- Create: `src/pages/Customers.tsx`
- Modify: `src/components/Layout.tsx` (add nav item)

**Step 1: Build customer list panel**

Left side of 2-panel layout:
- Search input (filters by name, phone, email)
- Filter by tag dropdown
- Sort dropdown (name, last visit, total spend)
- "Add Customer" button
- Scrollable list of customer cards:
  - Avatar initial (colored circle)
  - Name, phone
  - Tags as small colored chips
  - Last visit date
  - Total spend

**Step 2: Add to sidebar nav**

In `Layout.tsx`, add nav item after History:
```typescript
{ to: '/customers', icon: Users, label: 'Customers' }
```

**Step 3: Add route in App.tsx**

Add `/customers` route in protected routes, import Customers page.

**Step 4: Commit**

```bash
git add src/pages/Customers.tsx src/components/Layout.tsx src/App.tsx
git commit -m "feat: CRM customer list page with search, filter, sort"
```

---

### Task 8: CRM Customer Detail Panel

**Files:**
- Modify: `src/pages/Customers.tsx`

**Step 1: Build the right-side detail panel**

When a customer is selected from the list:
- Profile header: name, email, phone, preferred contact, account status badge
- Contact action buttons: Call (tel:), Email (mailto:), Text (sms:)
- Tags section: display existing tags as chips, "+" button to add new tag, click to remove
- "Send Invite" button (if no account linked)

**Step 2: Activity timeline**

- Add note input at top (text + submit button)
- Calls `addCustomerNote()` on submit, refreshes
- Timeline items: notes from staff (with author name + timestamp), plus auto-generated entries from intakes

**Step 3: History tabs**

Three tabs below timeline:
- **Intakes**: list from `useCustomerDetail().intakes`
- **Bookings**: list from `useCustomerDetail().appointments`
- **Invoices**: list from `useCustomerDetail().invoices` with view/download link

**Step 4: Commit**

```bash
git add src/pages/Customers.tsx
git commit -m "feat: CRM customer detail panel with timeline, tags, history tabs"
```

---

### Task 9: Post-Intake Invite Prompt

**Files:**
- Modify: `src/pages/NewIntake.tsx`

**Step 1: After successful intake submission**

In the success state, if the customer has an email but no linked profile_id:
- Show card: "Send [customer name] an account invite?"
- "Send Invite" button calls `inviteCustomer(email, businessId, businessName)`
- Success/error toast

**Step 2: Check customer has account**

After `upsertCustomer`, check if returned customer has `profile_id`. If null and email exists, show invite prompt.

**Step 3: Commit**

```bash
git add src/pages/NewIntake.tsx
git commit -m "feat: post-intake customer invite prompt"
```

---

### Task 10: Update Login Page — Customer Role Support

**Files:**
- Modify: `src/pages/Login.tsx`

**Step 1: No changes needed to login form itself**

The login form works for all roles. The routing in App.tsx handles redirecting customers to `/portal`.

**Step 2: Update success message for customer signups**

If signup metadata includes `role: 'customer'`, show: "Account created! You can now sign in." (no "await admin approval" message since customers are auto-approved).

Note: This only applies to self-registration from booking page (Task 6), not the login page itself. Login page signup remains staff-focused with approval flow.

**Step 3: Commit (if changes needed)**

```bash
git add src/pages/Login.tsx
git commit -m "feat: update login messaging for customer role"
```

---

### Task 11: Final Integration & Testing

**Files:**
- All modified files

**Step 1: Test customer self-registration flow**
1. Go to `/book/:slug`
2. Complete a booking
3. Create account from success screen
4. Verify redirected to `/portal`
5. Verify bookings show up

**Step 2: Test business invite flow**
1. Go to CRM page as admin
2. Select customer without account
3. Click "Send Invite"
4. Verify email sent

**Step 3: Test CRM functionality**
1. Search/filter customers
2. Add notes, verify timeline
3. Add/remove tags
4. View intake, booking, invoice history

**Step 4: Test portal pages**
1. Login as customer
2. Verify My Bookings shows appointments
3. Verify History shows past intakes and invoices
4. Verify Profile edit works
5. Verify staff routes are blocked

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: customer portal and CRM — complete integration"
```
