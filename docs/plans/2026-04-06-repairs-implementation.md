# Repairs Section Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a full Repairs module to Pro Hub with API-powered diagnostics, maintenance schedules, recall alerts, AI repair guides with photo/video analysis, and live PartsTech parts ordering.

**Architecture:** Supabase Edge Functions proxy all external API calls (CarMD, VehicleDatabases, PartsTech, Claude). Frontend is a new `/repairs` page with tabbed interface. A central `vehicles` table becomes the single VIN registry. All API responses are cached in Supabase tables with configurable expiry. Mock data is returned when API keys are not configured.

**Tech Stack:** React 19 + Vite + TypeScript, Supabase (PostgreSQL + Edge Functions + Storage), TailwindCSS 4, React Router DOM 7, lucide-react icons

**Design doc:** `docs/plans/2026-04-06-repairs-section-design.md`

---

## Task 1: Database Migration — Core Tables

**Files:**
- Create: `supabase/migrations/20260406200000_repairs_module.sql`

**Step 1: Write the migration SQL**

```sql
-- Repairs Module: vehicles registry, repair/maintenance/recall lookups, AI guides, parts orders

-- Central vehicle registry (single source of truth for all VINs)
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vin TEXT NOT NULL,
  year INT,
  make TEXT,
  model TEXT,
  engine TEXT,
  engine_type TEXT,
  mileage INT,
  color TEXT,
  plate TEXT,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(vin, business_id)
);

-- Cached repair/diagnostic results from CarMD and VehicleDatabases
CREATE TABLE repair_lookups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  dtc_code TEXT,
  description TEXT NOT NULL,
  urgency INT,
  urgency_desc TEXT,
  difficulty INT,
  labor_hours FLOAT,
  part_cost FLOAT,
  labor_cost FLOAT,
  misc_cost FLOAT,
  total_cost FLOAT,
  parts_json JSONB DEFAULT '[]',
  source TEXT NOT NULL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cached maintenance schedule data
CREATE TABLE maintenance_lookups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  due_mileage INT,
  is_oem BOOLEAN DEFAULT TRUE,
  cycle_mileage INT,
  part_cost FLOAT,
  labor_cost FLOAT,
  total_cost FLOAT,
  parts_json JSONB,
  source TEXT NOT NULL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cached recall and TSB data
CREATE TABLE recall_lookups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('recall', 'tsb')),
  description TEXT NOT NULL,
  corrective_action TEXT,
  nhtsa_id TEXT,
  source TEXT NOT NULL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI-generated step-by-step repair guides
CREATE TABLE repair_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_lookup_id UUID REFERENCES repair_lookups(id) ON DELETE SET NULL,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  content JSONB NOT NULL DEFAULT '{"steps":[]}',
  ai_model TEXT,
  user_prompt TEXT,
  media_urls JSONB DEFAULT '[]',
  created_by UUID REFERENCES profiles(id),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PartsTech order tracking
CREATE TABLE parts_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  repair_lookup_id UUID REFERENCES repair_lookups(id) ON DELETE SET NULL,
  supplier TEXT NOT NULL,
  parts_json JSONB NOT NULL DEFAULT '[]',
  total_cost FLOAT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'delivered')),
  partstech_order_id TEXT,
  created_by UUID REFERENCES profiles(id),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_vehicles_vin_business ON vehicles(vin, business_id);
CREATE INDEX idx_vehicles_business ON vehicles(business_id);
CREATE INDEX idx_repair_lookups_vehicle ON repair_lookups(vehicle_id);
CREATE INDEX idx_repair_lookups_dtc ON repair_lookups(dtc_code);
CREATE INDEX idx_maintenance_lookups_vehicle ON maintenance_lookups(vehicle_id);
CREATE INDEX idx_recall_lookups_vehicle ON recall_lookups(vehicle_id);
CREATE INDEX idx_repair_guides_vehicle ON repair_guides(vehicle_id);
CREATE INDEX idx_parts_orders_vehicle ON parts_orders(vehicle_id);

-- RLS policies (same pattern as existing tables)
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_lookups ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_lookups ENABLE ROW LEVEL SECURITY;
ALTER TABLE recall_lookups ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_orders ENABLE ROW LEVEL SECURITY;

-- Vehicles policies
CREATE POLICY "Users can view vehicles in their business" ON vehicles
  FOR SELECT USING (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert vehicles in their business" ON vehicles
  FOR INSERT WITH CHECK (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update vehicles in their business" ON vehicles
  FOR UPDATE USING (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));

-- Repair lookups policies
CREATE POLICY "Users can view repair lookups in their business" ON repair_lookups
  FOR SELECT USING (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert repair lookups in their business" ON repair_lookups
  FOR INSERT WITH CHECK (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));

-- Maintenance lookups policies
CREATE POLICY "Users can view maintenance lookups in their business" ON maintenance_lookups
  FOR SELECT USING (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert maintenance lookups in their business" ON maintenance_lookups
  FOR INSERT WITH CHECK (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));

-- Recall lookups policies
CREATE POLICY "Users can view recall lookups in their business" ON recall_lookups
  FOR SELECT USING (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert recall lookups in their business" ON recall_lookups
  FOR INSERT WITH CHECK (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));

-- Repair guides policies
CREATE POLICY "Users can view repair guides in their business" ON repair_guides
  FOR SELECT USING (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert repair guides in their business" ON repair_guides
  FOR INSERT WITH CHECK (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));

-- Parts orders policies
CREATE POLICY "Users can view parts orders in their business" ON parts_orders
  FOR SELECT USING (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert parts orders in their business" ON parts_orders
  FOR INSERT WITH CHECK (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update parts orders in their business" ON parts_orders
  FOR UPDATE USING (business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid()));
```

**Step 2: Run migration in Supabase SQL editor**

Go to Supabase Dashboard → SQL Editor → paste and run. Verify all 6 tables appear in Table Editor.

**Step 3: Commit**

```bash
git add supabase/migrations/20260406200000_repairs_module.sql
git commit -m "feat(repairs): add database schema for repairs module"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `src/lib/types.ts` (append to end of file)

**Step 1: Add repair-related types**

Append the following types to the end of `src/lib/types.ts`:

```typescript
// ── Repairs Module ──────────────────────────────────────────

export interface Vehicle {
  id: string
  vin: string
  year: number | null
  make: string | null
  model: string | null
  engine: string | null
  engine_type: string | null
  mileage: number | null
  color: string | null
  plate: string | null
  business_id: string
  created_by: string | null
  created_at: string
  updated_at: string
}

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
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(repairs): add TypeScript types for repairs module"
```

---

## Task 3: Store Hooks & Service Functions

**Files:**
- Modify: `src/lib/store.ts` (append to end of file)

**Step 1: Add vehicle and repair hooks/functions**

Append the following to the end of `src/lib/store.ts`. Match the existing patterns exactly (useState + useCallback + useEffect, async service functions that throw on error):

```typescript
// ── Repairs Module ──────────────────────────────────────────

export function useVehicle(vin: string | undefined) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (!isConfigured() || !vin) { setLoading(false); return }
    supabase
      .from('vehicles')
      .select('*')
      .eq('vin', vin)
      .maybeSingle()
      .then(({ data }) => {
        setVehicle(data)
        setLoading(false)
      })
  }, [vin])

  useEffect(() => { refresh() }, [refresh])

  return { vehicle, loading, refresh }
}

export async function upsertVehicle(vehicle: Omit<Vehicle, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('vehicles')
    .upsert(vehicle, { onConflict: 'vin,business_id' })
    .select()
    .single()
  if (error) throw error
  return data as Vehicle
}

export function useRepairLookups(vehicleId: string | undefined) {
  const [repairs, setRepairs] = useState<RepairLookup[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (!isConfigured() || !vehicleId) { setLoading(false); return }
    supabase
      .from('repair_lookups')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRepairs((data || []) as RepairLookup[])
        setLoading(false)
      })
  }, [vehicleId])

  useEffect(() => { refresh() }, [refresh])

  return { repairs, loading, refresh }
}

export function useMaintenanceLookups(vehicleId: string | undefined) {
  const [maintenance, setMaintenance] = useState<MaintenanceLookup[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (!isConfigured() || !vehicleId) { setLoading(false); return }
    supabase
      .from('maintenance_lookups')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('due_mileage', { ascending: true })
      .then(({ data }) => {
        setMaintenance((data || []) as MaintenanceLookup[])
        setLoading(false)
      })
  }, [vehicleId])

  useEffect(() => { refresh() }, [refresh])

  return { maintenance, loading, refresh }
}

export function useRecallLookups(vehicleId: string | undefined) {
  const [recalls, setRecalls] = useState<RecallLookup[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (!isConfigured() || !vehicleId) { setLoading(false); return }
    supabase
      .from('recall_lookups')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRecalls((data || []) as RecallLookup[])
        setLoading(false)
      })
  }, [vehicleId])

  useEffect(() => { refresh() }, [refresh])

  return { recalls, loading, refresh }
}

export function useRepairGuides(vehicleId: string | undefined) {
  const [guides, setGuides] = useState<RepairGuide[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (!isConfigured() || !vehicleId) { setLoading(false); return }
    supabase
      .from('repair_guides')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setGuides((data || []) as RepairGuide[])
        setLoading(false)
      })
  }, [vehicleId])

  useEffect(() => { refresh() }, [refresh])

  return { guides, loading, refresh }
}

export function usePartsOrders(vehicleId: string | undefined) {
  const [orders, setOrders] = useState<PartsOrder[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (!isConfigured() || !vehicleId) { setLoading(false); return }
    supabase
      .from('parts_orders')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data || []) as PartsOrder[])
        setLoading(false)
      })
  }, [vehicleId])

  useEffect(() => { refresh() }, [refresh])

  return { orders, loading, refresh }
}

// ── Repairs Edge Function Callers ──────────────────────────

export async function callRepairsCarMD(params: {
  action: string
  vin: string
  mileage?: number
  dtc?: string
}) {
  const { data, error } = await supabase.functions.invoke('repairs-carmd', { body: params })
  if (error) throw error
  return data
}

export async function callRepairsVehicleDB(params: {
  action: string
  vin: string
  repair_name?: string
}) {
  const { data, error } = await supabase.functions.invoke('repairs-vehicledb', { body: params })
  if (error) throw error
  return data
}

export async function callRepairsPartsTech(params: {
  action: string
  vin?: string
  part_number?: string
  part_name?: string
  supplier_ids?: string[]
}) {
  const { data, error } = await supabase.functions.invoke('repairs-partstech', { body: params })
  if (error) throw error
  return data
}

export async function callRepairsAIGuide(params: {
  vehicle_id: string
  repair_lookup_id?: string
  dtc_code?: string
  description: string
  media_urls?: string[]
}) {
  const { data, error } = await supabase.functions.invoke('repairs-ai-guide', { body: params })
  if (error) throw error
  return data
}

export async function createPartsOrder(order: Omit<PartsOrder, 'id' | 'created_at'>) {
  const { data, error } = await supabase.from('parts_orders').insert(order).select().single()
  if (error) throw error
  return data as PartsOrder
}

export async function updatePartsOrder(id: string, updates: Partial<PartsOrder>) {
  const { error } = await supabase.from('parts_orders').update(updates).eq('id', id)
  if (error) throw error
}
```

Note: Import the new types at the top of `store.ts`. Add `Vehicle, RepairLookup, MaintenanceLookup, RecallLookup, RepairGuide, PartsOrder` to the existing import from `@/lib/types`.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/store.ts
git commit -m "feat(repairs): add store hooks and edge function callers"
```

---

## Task 4: Supabase Edge Functions (4 functions)

**Files:**
- Create: `supabase/functions/repairs-carmd/index.ts`
- Create: `supabase/functions/repairs-vehicledb/index.ts`
- Create: `supabase/functions/repairs-partstech/index.ts`
- Create: `supabase/functions/repairs-ai-guide/index.ts`

Each edge function follows this pattern:
1. Parse the request body
2. Check if the API key env var is set
3. If not set → return mock data
4. If set → call the real API, cache result, return

**Step 1: Create `repairs-carmd` edge function**

File: `supabase/functions/repairs-carmd/index.ts`

This function proxies all CarMD endpoints. It reads `CARMD_PARTNER_TOKEN` and `CARMD_AUTH_KEY` from env. If not set, returns structured mock data. On each call it checks the `repair_lookups`, `maintenance_lookups`, or `recall_lookups` table for cached data within the TTL before calling the external API.

Key behaviors:
- `action: "maintenance"` → checks `maintenance_lookups` cache (30 day TTL), calls `GET /v3.0/maint`, caches response
- `action: "repair"` → checks `repair_lookups` cache (7 day TTL), calls `GET /v3.0/repair`, caches response
- `action: "diag"` → checks `repair_lookups` cache (30 day TTL), calls `GET /v3.0/diag`, caches response
- `action: "recall"` → checks `recall_lookups` cache (24 hour TTL), calls `GET /v3.0/recall`, caches response
- `action: "tsb"` → checks `recall_lookups` cache (7 day TTL), calls `GET /v3.0/tsb`, caches response
- `action: "upcoming"` → calls `GET /v3.0/upcoming`, caches as repair_lookups
- `action: "warranty"` → calls `GET /v3.0/warranty`, returns directly (no cache table needed)

Mock data should be realistic sample responses matching the CarMD response format from the spec.

**Step 2: Create `repairs-vehicledb` edge function**

File: `supabase/functions/repairs-vehicledb/index.ts`

Proxies VehicleDatabases.com. Reads `VEHICLEDB_API_KEY` from env. Actions: `repair_pricing`, `oem_parts`, `maintenance`, `warranty`. Returns pricing ranges (low/high) and OEM part numbers. Mock data when key not set.

**Step 3: Create `repairs-partstech` edge function**

File: `supabase/functions/repairs-partstech/index.ts`

Proxies PartsTech API. Reads `PARTSTECH_USERNAME` and `PARTSTECH_API_KEY` from env. Actions: `search` (returns supplier pricing/inventory), `suppliers` (list nearby suppliers), `order` (place order). Mock data returns realistic supplier cards with pricing when key not set.

**Step 4: Create `repairs-ai-guide` edge function**

File: `supabase/functions/repairs-ai-guide/index.ts`

Calls Claude API to generate step-by-step repair guides. Reads `ANTHROPIC_API_KEY` from env. Accepts vehicle info, repair description, DTC code, and media_urls (photos/videos). Constructs a detailed prompt with all context. Returns structured JSON: `{ steps: [{ number, title, description, warnings?, media_refs? }] }`. Saves guide to `repair_guides` table. Mock data returns a sample 5-step guide when key not set.

**Step 5: Verify functions compile**

Run: `cd supabase/functions && deno check repairs-carmd/index.ts` (repeat for each)
If deno not available locally, verify syntax only and test after deploy.

**Step 6: Commit**

```bash
git add supabase/functions/
git commit -m "feat(repairs): add 4 Supabase Edge Functions for API proxying"
```

---

## Task 5: Repairs Page — VIN Input & Vehicle Profile Card

**Files:**
- Create: `src/pages/Repairs.tsx`
- Create: `src/components/repairs/VehicleProfileCard.tsx`

**Step 1: Create the main Repairs page**

File: `src/pages/Repairs.tsx`

Page structure (match existing page patterns — see `Expenses.tsx` for reference):
- Page header: Wrench icon + "Repairs" title + subtitle
- VIN input field (reuse existing VIN decode logic from `src/lib/utils.ts` — `decodeVin()`)
- Year/Make/Model manual entry as fallback
- Mileage input field
- On VIN decode → upsert `vehicles` table → show Vehicle Profile Card
- Below the card: tabbed interface (Overview, Maintenance, Diagnostics, Recalls & TSBs, Parts)
- Support `/repairs/:vin` route param to pre-load a vehicle

State management:
- `vin` input state
- `mileage` input state
- `vehicle` from `useVehicle` hook
- `activeTab` state: `'overview' | 'maintenance' | 'diagnostics' | 'recalls' | 'parts'`
- `decoding` loading state for VIN decode

**Step 2: Create VehicleProfileCard component**

File: `src/components/repairs/VehicleProfileCard.tsx`

Props: `{ vehicle: Vehicle, onMileageUpdate: (mileage: number) => void }`

Displays:
- Year Make Model in large text
- VIN in monospace
- Engine info
- Mileage (editable inline)
- Color / plate if available
- Warranty status badge (green "Covered" / yellow "Partial" / red "Expired") — placeholder until warranty API is wired
- Recall count badge (red if > 0)
- Quick action buttons row: Maintenance | Diagnostics | Parts | Recalls (each sets the active tab)

Style: Match existing glass card pattern from the app (rounded-2xl, glass class, same padding/spacing as other cards).

**Step 3: Verify TypeScript compiles and page renders**

Run: `npx tsc --noEmit`
Run: `npx vite build`
Expected: Both pass

**Step 4: Commit**

```bash
git add src/pages/Repairs.tsx src/components/repairs/
git commit -m "feat(repairs): add Repairs page with VIN input and Vehicle Profile Card"
```

---

## Task 6: Route & Nav Integration

**Files:**
- Modify: `src/App.tsx` (add route)
- Modify: `src/components/Layout.tsx` (add nav item)

**Step 1: Add route to App.tsx**

Add inside the `<Route element={<Layout />}>` block, after the Queue route:

```typescript
<Route path="/repairs" element={<Repairs />} />
<Route path="/repairs/:vin" element={<Repairs />} />
```

Add import at top: `import Repairs from '@/pages/Repairs'`

**Step 2: Add nav item to Layout.tsx**

In the `navItems` array, add after the Queue entry `{ to: '/queue', ... }`:

```typescript
{ to: '/repairs', icon: Wrench, label: 'Repairs' },
```

Import `Wrench` from `lucide-react` if not already imported (it is already imported in the file for Services — check and reuse. If there's a conflict, use `CarFront` or `Cog` instead).

**Step 3: Verify app builds and nav renders**

Run: `npx vite build`
Expected: Pass

**Step 4: Commit**

```bash
git add src/App.tsx src/components/Layout.tsx
git commit -m "feat(repairs): add route and sidebar nav item"
```

---

## Task 7: Maintenance Tab Component

**Files:**
- Create: `src/components/repairs/MaintenanceTimeline.tsx`

**Step 1: Build the MaintenanceTimeline component**

Props: `{ vehicleId: string, mileage: number | null, onOrderParts: (item: MaintenanceLookup) => void }`

Uses `useMaintenanceLookups(vehicleId)` hook.

Displays:
- Vertical timeline layout (left border line with dots)
- Each item: description, due mileage, estimated cost (parts + labor + total)
- Items where `due_mileage < mileage` highlighted in red with "OVERDUE" badge
- Items where `due_mileage` is within 3000 miles of current mileage in yellow "UPCOMING"
- Each item expandable (click to expand) — shows parts list from `parts_json`
- "Order Parts" button per item (calls `onOrderParts`)
- OEM badge on items where `is_oem` is true
- Loading skeleton while data fetches
- Empty state: "Enter mileage to see maintenance schedule" or "No maintenance data available"

**Step 2: Wire into Repairs page**

In `Repairs.tsx`, render `<MaintenanceTimeline>` when `activeTab === 'maintenance'`.

**Step 3: Commit**

```bash
git add src/components/repairs/MaintenanceTimeline.tsx src/pages/Repairs.tsx
git commit -m "feat(repairs): add Maintenance Timeline tab"
```

---

## Task 8: Diagnostics Tab Component

**Files:**
- Create: `src/components/repairs/DiagnosticsTool.tsx`
- Create: `src/components/repairs/RepairCostCompare.tsx`

**Step 1: Build DiagnosticsTool component**

Props: `{ vehicle: Vehicle, onOrderParts: (part: RepairPart) => void }`

Features:
- DTC code input field with format validation (regex: `/^[PBCU][0-9A-F]{4}$/i`)
- "Diagnose" button — calls `callRepairsCarMD({ action: 'diag', vin, mileage, dtc })` and `callRepairsCarMD({ action: 'repair', vin, mileage, dtc })` in parallel
- Results card:
  - Code meaning and description
  - Urgency meter: colored badge (1-4 scale) using `URGENCY_LABELS` and `URGENCY_COLORS`
  - Difficulty rating: 1-5 stars visual
  - RepairCostCompare component (DIY vs Shop)
  - Parts list with quantities, prices, and "Find Parts" button per part
- "Generate AI Guide" button — opens RepairGuidePanel (Task 10)
- Loading state during API call
- Error state if DTC format invalid

**Step 2: Build RepairCostCompare component**

Props: `{ partCost: number, laborCost: number, miscCost: number, totalCost: number, difficulty: number }`

Side-by-side display:
- Left card: "DIY" — shows parts cost only, difficulty indicator, "Save $X" amount
- Right card: "Professional" — shows parts + labor + misc = total
- Visual emphasis on the savings difference

**Step 3: Wire into Repairs page**

Render `<DiagnosticsTool>` when `activeTab === 'diagnostics'`.

**Step 4: Commit**

```bash
git add src/components/repairs/DiagnosticsTool.tsx src/components/repairs/RepairCostCompare.tsx src/pages/Repairs.tsx
git commit -m "feat(repairs): add Diagnostics Tool with DTC lookup and cost comparison"
```

---

## Task 9: Recalls & TSBs Tab Component

**Files:**
- Create: `src/components/repairs/RecallsPanel.tsx`

**Step 1: Build RecallsPanel component**

Props: `{ vehicleId: string }`

Uses `useRecallLookups(vehicleId)` hook.

Displays:
- Two sections: "Active Recalls" and "Technical Service Bulletins"
- Recall items: red left border, description, corrective action, NHTSA ID link
- TSB items: yellow left border, description, manufacturer source
- Count badges in section headers
- Empty states per section
- "Refresh" button to force re-fetch from API

**Step 2: Wire into Repairs page**

Render when `activeTab === 'recalls'`.

**Step 3: Commit**

```bash
git add src/components/repairs/RecallsPanel.tsx src/pages/Repairs.tsx
git commit -m "feat(repairs): add Recalls & TSBs tab"
```

---

## Task 10: AI Repair Guide Panel

**Files:**
- Create: `src/components/repairs/RepairGuidePanel.tsx`

**Step 1: Build RepairGuidePanel component**

Props: `{ vehicle: Vehicle, repairLookup?: RepairLookup, onClose: () => void }`

Features:
- "Generate AI Guide" button
- Photo upload: accept jpg/png, upload to Supabase Storage `repairs-media/` bucket, collect URLs
- Video upload: accept mp4 (max 30s / 20MB), upload to storage, collect URL
- Upload preview thumbnails
- Optional text prompt: "Describe what you're seeing" textarea
- On generate: calls `callRepairsAIGuide()` with vehicle info, repair data, media URLs
- Displays returned steps in numbered cards:
  - Step number + title (bold)
  - Description text
  - Warnings in orange/red callout boxes
  - Media references linked to uploaded photos
- Loading state with "AI is analyzing..." message
- Save indicator: "Guide saved" after API returns (guide is auto-saved by edge function)
- Previously generated guides: list from `useRepairGuides(vehicleId)`, click to view

**Step 2: Wire into Diagnostics tab**

Add "Generate AI Guide" button on DiagnosticsTool results that opens this panel as a slide-over or modal.

**Step 3: Commit**

```bash
git add src/components/repairs/RepairGuidePanel.tsx src/components/repairs/DiagnosticsTool.tsx
git commit -m "feat(repairs): add AI Repair Guide panel with photo/video upload"
```

---

## Task 11: Parts Search & Ordering Tab

**Files:**
- Create: `src/components/repairs/PartsSearch.tsx`
- Create: `src/components/repairs/SupplierCard.tsx`

**Step 1: Build PartsSearch component**

Props: `{ vehicle: Vehicle, initialSearch?: string }`

Features:
- Search input: part name or OEM part number
- VIN auto-populated from vehicle context for fitment accuracy
- "Search" button → calls `callRepairsPartsTech({ action: 'search', vin, part_name or part_number })`
- Results: grid of SupplierCard components
- Filter by: in-stock only, price range, distance
- Sort by: price (low-high), distance, availability

**Step 2: Build SupplierCard component**

Props: `{ supplier: { name, price, stock_status, distance, delivery_estimate, logo_url? }, onOrder: () => void }`

Displays:
- Supplier name + logo
- Price (large, bold)
- Stock status badge: green "In Stock" / yellow "Limited" / red "Out of Stock"
- Distance from shop
- Delivery estimate
- "Order" button (green, prominent)

On "Order" click:
- Calls `callRepairsPartsTech({ action: 'order', ... })`
- Creates `parts_orders` record via `createPartsOrder()`
- Shows success toast

**Step 3: Wire into Repairs page**

Render when `activeTab === 'parts'`. Also callable from Maintenance and Diagnostics tabs via the "Order Parts" / "Find Parts" buttons.

**Step 4: Commit**

```bash
git add src/components/repairs/PartsSearch.tsx src/components/repairs/SupplierCard.tsx src/pages/Repairs.tsx
git commit -m "feat(repairs): add PartsTech parts search and ordering"
```

---

## Task 12: Overview Tab & Data Loading

**Files:**
- Create: `src/components/repairs/RepairsOverview.tsx`

**Step 1: Build RepairsOverview component**

Props: `{ vehicle: Vehicle }`

This is the landing tab after VIN decode. Shows a summary dashboard:
- Vehicle Profile Card (already built in Task 5)
- Quick stats row: total recalls (red if > 0), overdue maintenance items, repair guides saved
- "Upcoming Repairs" section: calls `callRepairsCarMD({ action: 'upcoming', vin, mileage })` — shows predicted failures in next 12 months with cost estimates
- Warranty summary card: coverage status for bumper-to-bumper, powertrain, corrosion
- Recent repair guides list (last 3)
- Recent parts orders list (last 3)

**Step 2: Wire as default tab**

In `Repairs.tsx`, render `<RepairsOverview>` when `activeTab === 'overview'` (default tab).

**Step 3: Commit**

```bash
git add src/components/repairs/RepairsOverview.tsx src/pages/Repairs.tsx
git commit -m "feat(repairs): add Overview tab with vehicle summary dashboard"
```

---

## Task 13: Data Loading & Edge Function Trigger on VIN Decode

**Files:**
- Modify: `src/pages/Repairs.tsx`

**Step 1: Add auto-fetch on VIN decode**

When a VIN is successfully decoded and the vehicle is upserted:
1. Trigger parallel API calls via edge functions:
   - `callRepairsCarMD({ action: 'maintenance', vin, mileage })`
   - `callRepairsCarMD({ action: 'recall', vin })`
   - `callRepairsCarMD({ action: 'tsb', vin })`
   - `callRepairsCarMD({ action: 'upcoming', vin, mileage })`
   - `callRepairsVehicleDB({ action: 'warranty', vin })`
2. Use `Promise.allSettled()` so individual API failures don't block others
3. Show loading indicators per tab while data fetches
4. Show error/stale indicators if an API call fails
5. Refresh all hooks after data is cached by edge functions

**Step 2: Add mileage change handler**

When mileage is updated on the Vehicle Profile Card:
- Update the `vehicles` table
- Re-trigger maintenance and upcoming repairs lookups (they depend on mileage)

**Step 3: Verify full flow works**

Run: `npx vite build`
Expected: Pass

**Step 4: Commit**

```bash
git add src/pages/Repairs.tsx
git commit -m "feat(repairs): add parallel data loading on VIN decode"
```

---

## Task 14: Supabase Storage Bucket for Repair Media

**Files:**
- Create: `supabase/migrations/20260406200001_repairs_storage.sql`

**Step 1: Create storage bucket**

```sql
-- Create storage bucket for repair media (photos/videos for AI guides)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'repairs-media',
  'repairs-media',
  true,
  20971520, -- 20MB max (for short videos)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
);

-- RLS: authenticated users can upload
CREATE POLICY "Authenticated users can upload repair media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'repairs-media');

-- RLS: anyone can view (for AI guide display)
CREATE POLICY "Anyone can view repair media"
ON storage.objects FOR SELECT
USING (bucket_id = 'repairs-media');
```

**Step 2: Run in Supabase SQL editor**

**Step 3: Commit**

```bash
git add supabase/migrations/20260406200001_repairs_storage.sql
git commit -m "feat(repairs): add Supabase storage bucket for repair media"
```

---

## Task 15: Final Integration, Polish & Build Verification

**Files:**
- All repair component files (review/polish pass)
- Modify: `src/pages/Repairs.tsx` (final wiring)

**Step 1: Verify all tabs are wired**

Ensure Repairs.tsx renders the correct component per tab:
- `overview` → `<RepairsOverview>`
- `maintenance` → `<MaintenanceTimeline>`
- `diagnostics` → `<DiagnosticsTool>`
- `recalls` → `<RecallsPanel>`
- `parts` → `<PartsSearch>`

**Step 2: Add tab badges**

Each tab header should show a count badge when data exists:
- Maintenance: count of overdue items (red)
- Recalls: count of active recalls (red)
- Parts: count of pending orders (yellow)

**Step 3: Verify full build**

Run: `npx tsc --noEmit && npx vite build`
Expected: Both pass with no errors

**Step 4: Test in browser**

- Navigate to `/repairs`
- Enter a VIN (e.g. `1GNALDEK9FZ108495`)
- Verify decode works and Vehicle Profile Card appears
- Click through all 5 tabs
- Enter a DTC code in Diagnostics
- Verify mock data appears (since no API keys yet)
- Test photo upload in AI Guide panel
- Test parts search

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(repairs): complete Repairs module with all tabs and integrations"
```

**Step 6: Deploy**

```bash
git push origin master
```
Then deploy via Netlify (same process as before).
