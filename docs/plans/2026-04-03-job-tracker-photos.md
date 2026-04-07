# Job Tracker & Photo Upload — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a job queue system with timers, before/after photo uploads, a floating tech UI, and customer photo gallery.

**Architecture:** New `jobs` and `job_photos` tables + `job-photos` storage bucket. Jobs are created automatically when intakes are submitted or on-demand from appointments. Techs start/finish jobs with a floating timer pill. Photos upload to Supabase storage with metadata in `job_photos`.

**Tech Stack:** React 19 + TypeScript + Tailwind CSS v4.2.1, Supabase (DB + Auth + Storage + RLS), Lucide icons.

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260403100000_jobs_and_photos.sql`

**Step 1: Write the migration**

```sql
-- Jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id),
  intake_id uuid REFERENCES vehicle_intakes(id),
  appointment_id uuid REFERENCES appointments(id),
  customer_id uuid NOT NULL REFERENCES customers(id),
  technician_id uuid REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'completed')),
  started_at timestamptz,
  finished_at timestamptz,
  duration_minutes integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Job photos table
CREATE TABLE IF NOT EXISTS job_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES businesses(id),
  photo_type text NOT NULL CHECK (photo_type IN ('before', 'after')),
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_jobs_business_status ON jobs(business_id, status);
CREATE INDEX idx_jobs_technician ON jobs(technician_id);
CREATE INDEX idx_jobs_customer ON jobs(customer_id);
CREATE INDEX idx_job_photos_job ON job_photos(job_id);

-- RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view jobs"
  ON jobs FOR SELECT
  USING (business_id = get_my_business_id());

CREATE POLICY "Business members can insert jobs"
  ON jobs FOR INSERT
  WITH CHECK (business_id = get_my_business_id());

CREATE POLICY "Business members can update jobs"
  ON jobs FOR UPDATE
  USING (business_id = get_my_business_id());

CREATE POLICY "Business members can view job photos"
  ON job_photos FOR SELECT
  USING (business_id = get_my_business_id());

CREATE POLICY "Business members can insert job photos"
  ON job_photos FOR INSERT
  WITH CHECK (business_id = get_my_business_id());

CREATE POLICY "Business members can delete job photos"
  ON job_photos FOR DELETE
  USING (business_id = get_my_business_id());

-- Storage bucket (create via Supabase dashboard or SQL)
INSERT INTO storage.buckets (id, name, public) VALUES ('job-photos', 'job-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Business members can upload job photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'job-photos');

CREATE POLICY "Anyone can view job photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'job-photos');

CREATE POLICY "Business members can delete job photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'job-photos');
```

**Step 2: Apply migration**

Run via Supabase MCP `apply_migration` tool.

**Step 3: Commit**

```bash
git add supabase/migrations/20260403100000_jobs_and_photos.sql
git commit -m "feat: add jobs and job_photos tables with RLS"
```

---

### Task 2: TypeScript Types & Store Functions

**Files:**
- Modify: `src/lib/types.ts` — add Job, JobPhoto interfaces
- Modify: `src/lib/store.ts` — add all job CRUD, photo upload, hooks

**Step 1: Add types to `src/lib/types.ts`**

After the existing `CustomerNote` interface, add:

```typescript
export interface Job {
  id: string
  business_id: string
  intake_id: string | null
  appointment_id: string | null
  customer_id: string | null
  technician_id: string | null
  status: 'queued' | 'in_progress' | 'completed'
  started_at: string | null
  finished_at: string | null
  duration_minutes: number | null
  notes: string | null
  created_at: string
  // Joined data
  customer?: Customer
  intake?: VehicleIntake
  appointment?: Appointment
}

export interface JobPhoto {
  id: string
  job_id: string
  business_id: string
  photo_type: 'before' | 'after'
  storage_path: string
  created_at: string
}
```

**Step 2: Add store functions to `src/lib/store.ts`**

Add these functions:

```typescript
// --- JOBS ---

export function useJobs(businessId: string | null) {
  // Fetch all jobs for business, joined with customer + intake + appointment
  // Return { jobs, loading, refresh }
  // Query: supabase.from('jobs').select('*, customer:customers(*), intake:vehicle_intakes(*), appointment:appointments(*)').eq('business_id', businessId).order('created_at', { ascending: false })
}

export function useActiveJob(technicianId: string | null) {
  // Fetch single in_progress job for this tech
  // Return { job, loading, refresh }
  // Query: .eq('technician_id', technicianId).eq('status', 'in_progress').maybeSingle()
}

export async function createJob(params: {
  business_id: string
  intake_id?: string
  appointment_id?: string
  customer_id: string
  technician_id?: string
}): Promise<Job> {
  // Insert job with status 'queued'
}

export async function startJob(jobId: string, technicianId: string): Promise<void> {
  // Update: status='in_progress', started_at=now(), technician_id
}

export async function finishJob(jobId: string, notes?: string): Promise<void> {
  // Calculate duration from started_at to now
  // Update: status='completed', finished_at=now(), duration_minutes, notes
}

// --- JOB PHOTOS ---

export async function uploadJobPhoto(
  jobId: string,
  businessId: string,
  file: File,
  photoType: 'before' | 'after'
): Promise<JobPhoto> {
  // Same pattern as uploadCertificatePhoto but bucket='job-photos'
  // Path: {businessId}/{jobId}/{photoType}_{timestamp}.{ext}
  // Upload to storage, then insert into job_photos table
}

export function getJobPhotoUrl(storagePath: string): string {
  // Same as getCertificatePhotoUrl but from 'job-photos' bucket
}

export function useJobPhotos(jobId: string | null) {
  // Fetch all photos for a job
  // Return { photos, loading, refresh }
}

export function useCustomerPhotos(customerId: string | null) {
  // Fetch all photos across all jobs for a customer (for gallery)
  // Join through jobs table: jobs.customer_id = customerId -> job_photos
  // Return { photos, jobs, loading }
}
```

**Step 3: Auto-create job on intake submission**

In the existing `createIntake` function (store.ts), after the intake is saved, add:

```typescript
// Auto-create a queued job from the intake
if (isConfigured() && savedIntake && businessId) {
  await createJob({
    business_id: businessId,
    intake_id: savedIntake.id,
    customer_id: savedCustomer.id,
  })
}
```

**Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/store.ts
git commit -m "feat: add job & photo store functions, auto-create job on intake"
```

---

### Task 3: Queue Page

**Files:**
- Create: `src/pages/Queue.tsx`
- Modify: `src/App.tsx` — add `/queue` route
- Modify: `src/components/Layout.tsx` — add Queue nav item

**Step 1: Create the Queue page**

`src/pages/Queue.tsx`:
- Page header: "Job Queue" with count, same style as Customers page header
- Filter tabs: All | Queued | In Progress | Completed (same pill style as Invoices page tabs)
- Job card list, each card shows:
  - Customer avatar + name
  - Vehicle info (year/make/model/color) — from joined intake or appointment
  - Source badge: "Walk-in" (red-50) if intake_id, "Appointment" (blue-50) if appointment_id
  - Services list (from intake.intake_services if available)
  - Status badge (queued=amber, in_progress=green pulsing, completed=zinc)
  - Elapsed time if in_progress (live updating)
  - "Start Job" button on queued items (red gradient, same as other CTAs)
- Import `useJobs`, `startJob`, `useActiveJob` from store
- "Start Job" checks if tech already has an active job — if so, show toast/alert
- On start: if job has no before photos, show BeforePhotosModal first, then start

**Step 2: Add route to `src/App.tsx`**

Add inside the protected staff routes block, alongside other routes:
```tsx
<Route path="/queue" element={<Queue />} />
```

Import: `import Queue from '@/pages/Queue'`

**Step 3: Add nav item to `src/components/Layout.tsx`**

Add to the nav items array (after Intake, before Dashboard):
```typescript
{ to: '/queue', icon: ClipboardList, label: 'Queue' }
```

Import `ClipboardList` from lucide-react.

**Step 4: Commit**

```bash
git add src/pages/Queue.tsx src/App.tsx src/components/Layout.tsx
git commit -m "feat: add job queue page with filters and start job"
```

---

### Task 4: Photo Upload Component

**Files:**
- Create: `src/components/PhotoUploader.tsx`

**Step 1: Build reusable photo upload component**

Props:
```typescript
interface Props {
  photos: File[]
  onChange: (files: File[]) => void
  existingPhotos?: { url: string; id: string }[]
  onDeleteExisting?: (id: string) => void
  label?: string
  maxPhotos?: number
}
```

Features:
- Grid of photo thumbnails (rounded-xl, same card styling)
- "+" button to add more (file input with `accept="image/*" multiple`)
- X button on each to remove
- Preview via `URL.createObjectURL`
- Drag-and-drop friendly area with dashed border when empty
- Same styling as CertificateBuilder photo sections

**Step 2: Commit**

```bash
git add src/components/PhotoUploader.tsx
git commit -m "feat: add reusable PhotoUploader component"
```

---

### Task 5: Start Job Flow with Before Photos

**Files:**
- Create: `src/components/StartJobModal.tsx`
- Modify: `src/pages/Queue.tsx` — wire up modal

**Step 1: Build StartJobModal**

Modal (standard `bg-black/50`, `sm:max-w-2xl` pattern):
- Header: "Start Job — {customer name}"
- Vehicle info display
- PhotoUploader for before photos (label: "Before Photos")
- "Skip" link (text button) + "Start Job" button (red gradient)
- On confirm: upload before photos via `uploadJobPhoto`, then call `startJob`
- If job already has before photos (from intake), show them as existing and allow adding more

**Step 2: Wire into Queue page**

When "Start Job" is tapped on a queued item:
- If tech has active job → alert "Finish your current job first"
- Otherwise → open StartJobModal with that job

**Step 3: Commit**

```bash
git add src/components/StartJobModal.tsx src/pages/Queue.tsx
git commit -m "feat: add start job modal with before photo upload"
```

---

### Task 6: Floating Timer Pill (Tech Role)

**Files:**
- Create: `src/components/FloatingJobPill.tsx`
- Modify: `src/App.tsx` — render pill in the layout

**Step 1: Build FloatingJobPill**

Component logic:
- Uses `useActiveJob(profile.id)` to check for in-progress job
- Uses `useAuth()` to check `profile?.role === 'user'` (tech only)
- If no active job: render red circular FAB (bottom-right, `fixed bottom-6 right-6 z-40`)
  - Icon: `ClipboardList` from lucide
  - On tap: open mini queue drawer (slide-up panel with queued jobs)
  - Mini drawer: list of queued jobs with "Start Job" button each
- If active job: render green pill
  - Pulsing green dot + live elapsed timer + truncated customer name
  - Timer updates every second via `setInterval`
  - Calculate elapsed: `Date.now() - new Date(job.started_at).getTime()`
  - Format as `H:MM:SS`
  - On tap: open FinishJobModal

**Step 2: Render in App.tsx**

Inside the authenticated staff layout (after `<Layout>`), add:
```tsx
<FloatingJobPill />
```

Only renders if `profile?.role === 'user'`.

**Step 3: Commit**

```bash
git add src/components/FloatingJobPill.tsx src/App.tsx
git commit -m "feat: add floating job timer pill for techs"
```

---

### Task 7: Finish Job Modal

**Files:**
- Create: `src/components/FinishJobModal.tsx`

**Step 1: Build FinishJobModal**

Modal (standard pattern):
- Header: "Complete Job"
- Summary section:
  - Customer name + vehicle
  - Total time elapsed (big, bold)
  - Started at timestamp
- Before photos section (read-only thumbnails from `useJobPhotos`)
- After photos section (PhotoUploader for new uploads)
- Notes textarea
- "Complete Job" button (red gradient)
- On confirm:
  1. Upload after photos via `uploadJobPhoto`
  2. Call `finishJob(jobId, notes)`
  3. Close modal, refresh active job state

**Step 2: Commit**

```bash
git add src/components/FinishJobModal.tsx
git commit -m "feat: add finish job modal with after photos and summary"
```

---

### Task 8: Start Job from Intake Success Screen

**Files:**
- Modify: `src/pages/NewIntake.tsx` — add "Start Job" button on success

**Step 1: Add Start Job to success screen**

After intake submission succeeds and the success state is shown:
- Fetch the auto-created job for this intake (query by intake_id)
- Show "Start Job" button alongside the existing invite prompt
- On tap: if role is 'user', call `startJob` directly (before photos can be added from intake form later — see Task 10)
- If role is 'admin', just show the button but note it queues for a tech

**Step 2: Commit**

```bash
git add src/pages/NewIntake.tsx
git commit -m "feat: add start job button to intake success screen"
```

---

### Task 9: Start Job from Schedule Page

**Files:**
- Modify: `src/pages/Schedule.tsx` — add "Start Job" on day-of appointments

**Step 1: Add Start Job to appointment cards**

For appointments scheduled today (or past due):
- Add "Start Job" button on the appointment card/modal
- On tap: create a new job with `appointment_id` set + customer_id from appointment
- Then open StartJobModal (before photos prompt)
- If job already exists for this appointment, show "Job Started" or "View Job" instead

**Step 2: Commit**

```bash
git add src/pages/Schedule.tsx
git commit -m "feat: add start job from schedule page appointments"
```

---

### Task 10: Intake Form Photo Section

**Files:**
- Modify: `src/pages/NewIntake.tsx` — add optional photos section
- Modify: `src/lib/types.ts` — if needed for intake photo state

**Step 1: Add photos section to intake form**

Below the Notes section in NewIntake:
- New collapsible section "Photos" with PhotoUploader
- Label: "Before Photos (optional)"
- Store files in component state as `File[]`
- On intake submit: after job is auto-created, upload photos as `before` type via `uploadJobPhoto`

**Step 2: Commit**

```bash
git add src/pages/NewIntake.tsx
git commit -m "feat: add before photo upload to intake form"
```

---

### Task 11: Customer Gallery Tab

**Files:**
- Modify: `src/pages/Customers.tsx` — add Gallery tab to detail panel

**Step 1: Add Gallery tab**

Add 4th tab to the history tabs: `Gallery` with Camera icon.

Gallery content:
- Uses `useCustomerPhotos(customerId)` to fetch all photos across jobs
- Group by job (date header: "Apr 3, 2026 · 2015 Lexus GS")
- Two columns: Before (left) | After (right)
- Thumbnail grid with click-to-expand (lightbox or modal with full image)
- Empty state: "No photos yet."

**Step 2: Show photos inline on Intakes tab**

On each intake entry in the Intakes tab, if there's a linked job with photos:
- Show small thumbnail row below the intake info
- Before thumbnails with "B" badge, after with "A" badge

**Step 3: Commit**

```bash
git add src/pages/Customers.tsx
git commit -m "feat: add customer gallery tab and inline job photos"
```

---

### Task 12: Job History in Customer Detail

**Files:**
- Modify: `src/pages/Customers.tsx` — enhance intakes tab with job data

**Step 1: Show job duration on intake entries**

For each intake in the Intakes tab:
- Query linked job (by intake_id)
- Show duration badge: "⏱ 2h 15m" next to the date
- Show status: completed badge if done

**Step 2: Commit**

```bash
git add src/pages/Customers.tsx
git commit -m "feat: show job duration in customer intake history"
```

---

### Execution Order & Dependencies

```
Task 1 (DB) → Task 2 (Types/Store) → Task 3 (Queue Page) → Task 4 (PhotoUploader)
                                                                      ↓
Task 5 (Start Job Modal) ← Task 4                    Task 6 (Floating Pill)
         ↓                                                     ↓
Task 7 (Finish Job Modal) ← Task 4                   Task 8 (Intake Start)
                                                      Task 9 (Schedule Start)
Task 10 (Intake Photos) ← Task 4
Task 11 (Gallery) ← Task 2
Task 12 (Job History) ← Task 2

Parallel groups after Task 4:
  - Group A: Tasks 5, 6, 7 (job flow UI)
  - Group B: Tasks 8, 9 (start job integration points)
  - Group C: Tasks 10, 11, 12 (photos & gallery)
```
