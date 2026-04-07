# Job Tracker & Photo Upload System — Design Document

**Date:** 2026-04-03
**Status:** Approved

## Overview

Add a job lifecycle system to Pro Hub that tracks active detailing work with timers, before/after photo uploads, and a queue-based workflow. Jobs can originate from walk-in intakes OR scheduled appointments.

## Data Model

### `jobs` table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| business_id | uuid FK | Tenant scope |
| intake_id | uuid FK nullable | From vehicle_intakes |
| appointment_id | uuid FK nullable | From appointments |
| customer_id | uuid FK | Customer record |
| technician_id | uuid FK | Tech running the job |
| status | text | `queued` → `in_progress` → `completed` |
| started_at | timestamptz nullable | Timer start |
| finished_at | timestamptz nullable | Timer stop |
| duration_minutes | integer nullable | Computed on finish |
| notes | text nullable | Finish summary notes |
| created_at | timestamptz | When queued |

### `job_photos` table
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| job_id | uuid FK | Parent job |
| business_id | uuid | For storage path |
| photo_type | text | `before` or `after` |
| storage_path | text | Supabase storage path |
| created_at | timestamptz | |

### Storage bucket: `job-photos`
Path pattern: `{businessId}/{jobId}/{photoType}_{timestamp}.{ext}`

### Queue sources
- Intake submitted → auto-create job with `status: 'queued'`, `intake_id` set
- Scheduled appointment (day-of or on-demand) → create job with `appointment_id` set

## Queue Page (`/queue`)

- Sidebar nav item, visible to all staff
- Filter tabs: All | Queued | In Progress | Completed
- Job cards show: customer name, vehicle, source badge (Walk-in/Appointment), services, status, elapsed time if active
- "Start Job" button on queued items

## Start Job Flow

1. Tech taps "Start Job"
2. If no before photos attached → prompt for before photo upload (can skip)
3. Timer starts, status → `in_progress`
4. Floating timer pill appears

## Floating UI (Tech Role Only — `user` role)

### No active job:
- Red circular FAB, bottom-right
- Tap → mini drawer with queued jobs list
- "Start Job" from drawer follows same flow

### Active job:
- Pill shape: green pulsing dot + elapsed time + customer name
- Tap → opens Finish Job summary modal
- One job at a time only

## Finish Job Flow

1. Tech taps floating timer pill
2. Summary modal: timer stops, shows total time, before photos review, after photos upload, notes field
3. "Complete Job" → status `completed`, `finished_at` + `duration_minutes` recorded

## "Start Job" Button Locations

- Queue page (primary)
- Intake success screen (after submitting intake)
- Schedule/appointments page (day-of appointments)
- Floating queue drawer (tech role)

## Photos

### Before photos
- Prompted at job start (unless uploaded during intake)
- Multi-image upload to `job-photos` bucket
- Optional intake form photo section auto-attaches as `before` type

### After photos
- Prompted on Finish Job summary screen
- Same upload pattern

### Customer Gallery
- New "Gallery" tab on customer detail panel
- Aggregates all photos across all jobs for that customer
- Grouped by date/job, before on left, after on right
- Lightbox on tap

### History display
- Job entries in customer history show before/after thumbnails inline
