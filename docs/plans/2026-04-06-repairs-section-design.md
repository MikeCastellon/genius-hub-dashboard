# Repairs Section — Feature Design

**Date:** 2026-04-06
**Status:** Approved
**Author:** Mike + Claude

## Overview

The Repairs Section is a new module within Pro Hub that combines API-powered repair guides, vehicle diagnostics, maintenance schedules, recall alerts, and live parts ordering into a single workflow. Users enter a VIN, see what their vehicle needs, get step-by-step repair instructions (with optional AI-generated guides featuring photo/video analysis), and order parts from local suppliers — all without leaving the platform.

This module targets mechanic shops and full-service auto care businesses using the Pro Hub platform, replicating and extending the functionality of industry tools like AllData.

## Tech Stack (Adapted to Existing Project)

- **Frontend:** React 19 + Vite + TypeScript + TailwindCSS 4 (existing stack)
- **Database:** Supabase PostgreSQL with RLS (existing pattern)
- **API Proxy:** Supabase Edge Functions (Deno runtime)
- **Storage:** Supabase Storage for repair media (photos/video)
- **AI:** Claude API via Edge Function for repair guide generation
- **Routing:** React Router DOM 7 (existing)

## Database Schema

### `vehicles` — Central VIN registry

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| vin | text | unique per business_id |
| year | int | |
| make | text | |
| model | text | |
| engine | text | nullable |
| engine_type | text | nullable |
| mileage | int | nullable, user-entered |
| color | text | nullable |
| plate | text | nullable |
| business_id | uuid FK | → businesses |
| created_by | uuid FK | → profiles |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Upserted from Intake, Repairs, Certify — single source of truth for any VIN.

### `repair_lookups` — Cached repair/diagnostic API results

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| vehicle_id | uuid FK | → vehicles |
| dtc_code | text | nullable |
| description | text | |
| urgency | int | 1-4 scale |
| urgency_desc | text | nullable |
| difficulty | int | 1-5 scale |
| labor_hours | float | nullable |
| part_cost | float | nullable |
| labor_cost | float | nullable |
| misc_cost | float | nullable |
| total_cost | float | nullable |
| parts_json | jsonb | array of parts with desc, price, qty |
| source | text | 'carmd' or 'vehicledatabases' |
| business_id | uuid FK | |
| created_at | timestamptz | |

### `maintenance_lookups` — Cached maintenance schedule data

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| vehicle_id | uuid FK | → vehicles |
| description | text | |
| due_mileage | int | nullable |
| is_oem | boolean | default true |
| cycle_mileage | int | nullable |
| part_cost | float | nullable |
| labor_cost | float | nullable |
| total_cost | float | nullable |
| parts_json | jsonb | nullable |
| source | text | |
| business_id | uuid FK | |
| created_at | timestamptz | |

### `recall_lookups` — Cached recall and TSB data

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| vehicle_id | uuid FK | → vehicles |
| type | text | 'recall' or 'tsb' |
| description | text | |
| corrective_action | text | nullable |
| nhtsa_id | text | nullable |
| source | text | |
| business_id | uuid FK | |
| created_at | timestamptz | |

### `repair_guides` — AI-generated step-by-step guides

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| repair_lookup_id | uuid FK | → repair_lookups, nullable |
| vehicle_id | uuid FK | → vehicles |
| content | jsonb | { steps: [{ number, title, description, warnings?, media_refs? }] } |
| ai_model | text | e.g. 'claude-sonnet-4-6' |
| user_prompt | text | nullable |
| media_urls | jsonb | array of uploaded photo/video URLs |
| created_by | uuid FK | → profiles |
| business_id | uuid FK | |
| created_at | timestamptz | |

### `parts_orders` — PartsTech order tracking

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| vehicle_id | uuid FK | → vehicles |
| repair_lookup_id | uuid FK | nullable |
| supplier | text | |
| parts_json | jsonb | items with name, number, qty, price |
| total_cost | float | |
| status | text | 'pending', 'ordered', 'delivered' |
| partstech_order_id | text | nullable |
| created_by | uuid FK | → profiles |
| business_id | uuid FK | |
| created_at | timestamptz | |

All tables have RLS policies scoped by business_id matching the authenticated user's profile.

## Supabase Edge Functions

### `repairs-carmd`
- Proxies all CarMD endpoints (decode, maintenance, repair, diag, upcoming, recall, tsb, warranty, port)
- Accepts: `{ action, vin, mileage?, dtc? }`
- Auth: `CARMD_PARTNER_TOKEN` + `CARMD_AUTH_KEY` from env
- Checks cache before calling API (respects cache durations)
- Falls back to cached data if credits exhausted

### `repairs-vehicledb`
- Proxies VehicleDatabases.com (repair pricing, OEM parts, maintenance, warranty)
- Accepts: `{ action, vin, repair_name? }`
- Auth: `VEHICLEDB_API_KEY` from env
- Supplements CarMD data with pricing ranges

### `repairs-partstech`
- Proxies PartsTech API (search, suppliers, order)
- Accepts: `{ action, vin?, part_number?, part_name?, supplier_ids? }`
- Auth: `PARTSTECH_USERNAME` + `PARTSTECH_API_KEY` from env
- Returns live pricing/inventory (never cached)
- Creates `parts_orders` records on order placement

### `repairs-ai-guide`
- Generates AI repair guides via Claude API
- Accepts: `{ vehicle_id, repair_lookup_id?, dtc_code?, description, media_urls? }`
- Auth: `ANTHROPIC_API_KEY` from env
- Sends repair context + uploaded photos/videos to Claude for visual analysis
- Returns structured steps JSON, saves to `repair_guides` table

All functions return structured mock data when API keys are not configured, so the UI is fully testable without real credentials.

## Frontend Architecture

### Routes
- `/repairs` — Main repairs hub with VIN input
- `/repairs/:vin` — Deep-link to specific vehicle

### Tab Layout (within Repairs page)
1. **Overview** — Vehicle Profile Card, warranty status, recall badge, quick stats
2. **Maintenance** — Timeline of scheduled items, overdue in red, cost estimates, order parts per item
3. **Diagnostics** — DTC code input with validation, code meaning, urgency, repair info, cost breakdown, AI guide button
4. **Recalls & TSBs** — Active recalls with severity, TSBs, NHTSA complaints
5. **Parts** — PartsTech search, live supplier pricing, order placement

### Components
- `VehicleProfileCard` — VIN info, mileage input, warranty indicator, recall badge, engine specs
- `MaintenanceTimeline` — Vertical timeline, overdue items red, expandable with parts + order button
- `DiagnosticsTool` — DTC input, urgency meter (1-4), difficulty stars (1-5), cost breakdown
- `RepairCostCompare` — DIY vs Shop side-by-side comparison
- `RepairGuidePanel` — AI guide generator with photo/video upload, step-by-step display
- `PartsSearch` — PartsTech search, supplier cards with price/stock/distance, order button
- `RecallAlert` — Red banner when active recalls exist

### Media Upload (for AI Guides)
- Supabase Storage bucket: `repairs-media/`
- Accepts: jpg, png (photos), mp4 (video, max 30s)
- URLs passed to `repairs-ai-guide` edge function
- Claude receives images inline for visual analysis

### Navigation
- Sidebar: Repairs added after Queue (icon: Wrench from lucide-react)
- Mobile: Added to bottom nav
- Conditional render hook in place for future onboarding-based module visibility

## Data Flow

### VIN Lookup Flow
1. User enters VIN + mileage
2. NHTSA decode (existing util) → upsert `vehicles` table
3. Parallel calls to `repairs-carmd` (maintenance, recalls, TSBs, warranty, upcoming) and `repairs-vehicledb` (pricing)
4. Edge functions check cache first, call API only if stale/missing
5. Results rendered into tabbed UI

### DTC Diagnostic Flow
1. User enters DTC code
2. Parallel calls: carmd/diag + carmd/repair + vehicledb/pricing
3. Merged results: code meaning + repair steps + cost range
4. Optional: user clicks "Generate AI Guide" → uploads photos/video → `repairs-ai-guide` returns step-by-step instructions

### Parts Ordering Flow
1. User views repair with parts list → clicks "Find Parts"
2. `repairs-partstech/search` returns live pricing from local suppliers
3. User selects supplier → clicks "Order"
4. `repairs-partstech/order` places order → tracked in `parts_orders`

## Cache Durations

| Data | Duration | Reasoning |
|------|----------|-----------|
| VIN Decode | Permanent | Vehicle specs never change |
| Maintenance Schedule | 30 days | OEMs rarely update |
| Repair Estimates | 7 days | Pricing fluctuates moderately |
| Recalls | 24 hours | New recalls can drop anytime |
| TSBs | 7 days | Updated periodically |
| DTC Diagnostics | 30 days | Same code = same repair |
| AI Guides | Permanent | User-generated, always saved |
| Parts Pricing | Never cached | Must be live from PartsTech |

## API Keys Required

| Service | Env Variables | Sign-up |
|---------|--------------|---------|
| CarMD | `CARMD_PARTNER_TOKEN`, `CARMD_AUTH_KEY` | carmd.com |
| VehicleDatabases | `VEHICLEDB_API_KEY` | vehicledatabases.com |
| PartsTech | `PARTSTECH_USERNAME`, `PARTSTECH_API_KEY` | partstech.com |
| Claude (AI guides) | `ANTHROPIC_API_KEY` | console.anthropic.com |

Set on Supabase Edge Function environment, never in client code.

## Deferred (Not in This Build)
- Onboarding flow / module visibility per business type
- Community-submitted repair guides
- YouTube tutorial embedding
- Conversational AI repair assistant
- Push notifications for maintenance reminders
- Mileage tracking over time
