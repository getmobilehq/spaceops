# The SpaceOps Bible

> **Complete technical reference for the SpaceOps platform.**
> Last updated: 2026-02-19 | Version: 1.0 | 11 sprints complete

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Database Schema](#5-database-schema)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [All Routes & Pages](#7-all-routes--pages)
8. [API Endpoints](#8-api-endpoints)
9. [Components](#9-components)
10. [Library Utilities](#10-library-utilities)
11. [Design System](#11-design-system)
12. [Testing](#12-testing)
13. [Deployment & Infrastructure](#13-deployment--infrastructure)
14. [Cron Jobs & Background Tasks](#14-cron-jobs--background-tasks)
15. [Feature Reference](#15-feature-reference)
16. [Sprint History](#16-sprint-history)
17. [Environment Variables](#17-environment-variables)
18. [Conventions & Patterns](#18-conventions--patterns)

---

## 1. Product Overview

### What is SpaceOps?

SpaceOps is a quality control platform for commercial janitorial companies. It enables supervisors to inspect building spaces via QR code scanning, automatically tracks deficiencies and tasks, and provides clients with real-time visual dashboards proving service quality.

### Who is it for?

**Primary buyer:** Janitorial companies (not building owners). They use SpaceOps to prove service quality to their clients and manage operational quality internally.

### The Core Loop

```
Supervisor scans QR code on room door
  -> Completes inspection checklist (pass/fail per item)
  -> Failed items auto-create deficiencies + tasks
  -> Floor plan map updates with live status pins (green/amber/red/grey)
  -> Client sees dashboard + receives auto-generated PDF reports
```

### User Roles

| Role | Description | Access Level |
|------|-------------|-------------|
| **Admin** | Creates org, buildings, spaces, checklists. Manages users. | Full access |
| **Supervisor** | Performs inspections via QR scan. Manages tasks. | Assigned buildings |
| **Staff** | Receives task assignments via SMS. Updates task status. | Minimal UI, assigned tasks only |
| **Client** | Read-only access to linked buildings. | Dashboard, map, reports |

### Key Differentiators

- QR-first entry (scan -> inspect, no app store download -- PWA)
- Visual floor plan maps with live status pins
- Automatic deficiency -> task pipeline (no manual data entry)
- Completion-triggered PDF reports auto-emailed to clients
- Multi-tenant with database-level isolation (RLS)
- SMS/WhatsApp notifications via Twilio
- Scheduled inspections with configurable recurrence
- Full audit trail with ISO compliance logging

---

## 2. Architecture

### High-Level Architecture

```
                    +------------------+
                    |   Netlify CDN    |
                    |  (Next.js SSR)   |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
     +--------v--------+          +--------v--------+
     | Server Components|          |  API Routes     |
     | (RSC - data      |          | (PDF, webhooks, |
     |  fetching)       |          |  cron, export)  |
     +--------+---------+          +--------+--------+
              |                             |
              +-------------+---------------+
                            |
                   +--------v--------+
                   |    Supabase     |
                   |  (PostgreSQL +  |
                   |   Auth + RLS +  |
                   |   Realtime +    |
                   |   Storage)      |
                   +-----------------+
                            |
              +-------------+-------------+
              |             |             |
       +------v--+   +-----v----+  +-----v-----+
       | Twilio  |   | Resend   |  | Sentry    |
       | (SMS/   |   | (Email)  |  | (Errors)  |
       | WhatsApp)|   |          |  |           |
       +---------+   +----------+  +-----------+
```

### Data Flow: Inspection Submission

1. User completes checklist and taps "Submit"
2. Client validates all items have results
3. Server action (atomic transaction):
   - Update inspection status -> `completed`, set `completed_at`
   - For each `fail` response: INSERT into `deficiencies`, INSERT into `tasks` (source: `auto`)
4. Post-commit (async):
   - Broadcast Realtime event to building channel
   - Check completion trigger (all spaces inspected today?)
   - If complete: generate PDF report, email to client
   - Create notifications for relevant users

### Data Flow: Real-Time Map Updates

```
Inspection submitted
  -> Supabase Realtime broadcast on building channel
  -> RealtimeRefresh component receives event
  -> Router refresh triggers RSC re-render
  -> Space status recalculated (green/amber/red/grey)
  -> Map pins update color
  Target: <5 seconds end-to-end
```

### Data Flow: Offline Auto-Save

```
User marks checklist item
  -> localStorage write (immediate)
  -> Supabase upsert (3-second debounce)
  -> Success: clear local cache
  -> Failure: add to retry queue
  -> On network resume: flush retry queue in order
```

---

## 3. Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js (App Router) | 16.1.6 | RSC for dashboards, client islands for interactivity |
| UI Library | React | 19.2.3 | Component framework |
| Styling | Tailwind CSS | v4 | Utility-first CSS |
| Components | shadcn/ui | 3.8.4 | Accessible component primitives |
| Database | Supabase (PostgreSQL) | 2.89.0 | Auth, Realtime, Storage, RLS |
| State (client) | Zustand | 5.0.10 | Minimal client-side state |
| State (server) | @tanstack/react-query | 5.90.20 | Server state cache |
| Validation | Zod | 4.3.6 | Runtime type safety |
| SMS | Twilio | 5.12.1 | Task notifications, SLA warnings |
| Email | Resend | 6.9.1 | Report delivery, invitations |
| PDF Generation | @react-pdf/renderer | 4.3.2 | Inspection reports |
| PDF Rendering | pdfjs-dist | 5.4.624 | Floor plan PDF -> PNG |
| QR Codes | qrcode | 1.5.4 | Generate SVG/PNG QR codes |
| Charts | Recharts | 3.7.0 | Analytics visualizations |
| Maps | react-zoom-pan-pinch | 3.7.0 | Floor plan zoom/pan |
| Icons | Lucide React | 0.563.0 | UI icons |
| Monitoring | Sentry | 10.38.0 | Error tracking |
| Hosting | Netlify | - | CDN, serverless, auto-deploy |
| Unit Tests | Vitest | 4.0.18 | Fast unit tests |
| E2E Tests | Playwright | 1.58.2 | Browser testing |
| Language | TypeScript | 5.x | Type safety |

---

## 4. Project Structure

```
spaceops/
├── app/
│   ├── (auth)/                         # Auth pages (no nav shell)
│   │   ├── login/page.tsx              # Email/password login
│   │   ├── signup/[token]/page.tsx     # Token-gated invitation signup
│   │   └── reset-password/page.tsx     # Password reset
│   ├── (dashboard)/                    # Authenticated pages (nav shell)
│   │   ├── layout.tsx                  # Shell: header + bottom nav + sidebar
│   │   ├── page.tsx                    # Admin/Supervisor home dashboard
│   │   ├── client/page.tsx             # Client portfolio dashboard
│   │   ├── staff/page.tsx              # Staff home dashboard
│   │   ├── more/page.tsx               # More menu (all roles)
│   │   ├── buildings/
│   │   │   ├── page.tsx                # Building list
│   │   │   └── [id]/
│   │   │       ├── page.tsx            # Building dashboard
│   │   │       ├── spaces/page.tsx     # Space management
│   │   │       ├── inspections/page.tsx # Inspection history
│   │   │       ├── map/[floorId]/page.tsx # Floor plan map
│   │   │       ├── archive-building-button.tsx
│   │   │       └── share-dashboard-button.tsx
│   │   ├── inspect/
│   │   │   └── [spaceId]/
│   │   │       ├── page.tsx            # Space detail (QR destination)
│   │   │       └── checklist/page.tsx  # Active inspection form
│   │   ├── tasks/page.tsx              # Task list with filters
│   │   ├── deficiencies/page.tsx       # Deficiency list
│   │   ├── reports/page.tsx            # Report generator
│   │   ├── notifications/page.tsx      # Notification center
│   │   ├── profile/page.tsx            # User profile
│   │   ├── scan/page.tsx               # In-app QR scanner
│   │   ├── analytics/page.tsx          # Analytics dashboard
│   │   └── admin/
│   │       ├── users/page.tsx          # User management
│   │       ├── checklists/
│   │       │   ├── page.tsx            # Template list
│   │       │   └── [id]/page.tsx       # Template item editor
│   │       ├── settings/page.tsx       # Org settings
│   │       ├── schedules/page.tsx      # Inspection schedules
│   │       └── audit-log/page.tsx      # Audit log viewer
│   ├── share/[token]/page.tsx          # Public shared dashboard
│   ├── api/                            # API routes
│   │   ├── signup/route.ts
│   │   ├── qr-batch/route.ts
│   │   ├── reports/generate/route.ts
│   │   ├── search/route.ts
│   │   ├── notifications/send-sms/route.ts
│   │   ├── webhooks/inspection-complete/route.ts
│   │   ├── cron/
│   │   │   ├── sla-warning/route.ts
│   │   │   ├── overdue-check/route.ts
│   │   │   ├── cleanup-expired/route.ts
│   │   │   ├── send-scheduled-reports/route.ts
│   │   │   └── trigger-scheduled-inspections/route.ts
│   │   └── export/
│   │       ├── inspections/route.ts
│   │       ├── tasks/route.ts
│   │       └── deficiencies/route.ts
│   ├── auth/callback/route.ts          # OAuth callback
│   ├── layout.tsx                      # Root layout (fonts, providers, metadata)
│   ├── globals.css                     # Tailwind v4 theme + CSS variables
│   ├── robots.ts                       # SEO: robots.txt
│   ├── sitemap.ts                      # SEO: sitemap.xml
│   └── icon.tsx                        # Dynamic favicon (ImageResponse)
├── components/
│   ├── ui/                             # shadcn/ui primitives (15 components)
│   ├── layout/                         # Navigation: bottom-nav, header, sidebar-nav
│   ├── dashboard/                      # KPI cards, building cards, charts
│   ├── map/                            # Floor plan viewer, pins, editor
│   ├── analytics/                      # Chart components
│   ├── search/                         # Global search
│   ├── shared/                         # Status badge, priority badge, export button
│   └── providers.tsx                   # React Query + theme providers
├── lib/
│   ├── supabase/                       # Client, server, admin, middleware
│   ├── types/                          # database.ts (generated), helpers.ts
│   ├── utils/                          # 14 utility modules
│   ├── stores/                         # Zustand: inspection-store
│   ├── hooks/                          # use-auth
│   └── validators/                     # Zod schemas
├── supabase/
│   └── migrations/                     # 6 SQL migrations
├── tests/
│   ├── unit/                           # 11 test files
│   ├── components/                     # 1 component test
│   ├── e2e/                            # 1 Playwright spec
│   ├── setup.ts                        # Vitest setup
│   ├── mocks/                          # Supabase mock
│   └── fixtures/                       # Test data
├── public/
│   ├── manifest.json                   # PWA manifest
│   └── sw.js                           # Service worker
├── middleware.ts                        # Auth redirect middleware
├── next.config.ts                      # Security headers + Sentry
├── vitest.config.ts                    # Test configuration
├── netlify.toml                        # Deployment config
├── .github/workflows/
│   ├── ci.yml                          # Type check + unit tests
│   └── cron.yml                        # Scheduled cron triggers
└── .env.example                        # Environment template
```

---

## 5. Database Schema

### 5.1 Migrations

| # | File | Focus | Tables Added |
|---|------|-------|-------------|
| 00001 | `initial_schema.sql` | Core schema | 19 tables, 10 enums, RLS policies, seed data |
| 00002 | `inspection_responses_upsert.sql` | Auto-save support | UNIQUE constraint + UPDATE policy |
| 00003 | `shared_dashboards_and_cleanup.sql` | Public sharing | `shared_dashboards` table |
| 00004 | `enable_realtime.sql` | Live updates | Realtime publication for 3 tables |
| 00005 | `audit_logs.sql` | ISO compliance | `audit_logs` table, 10 triggers |
| 00006 | `search_and_schedules.sql` | Search + scheduling | `inspection_schedules`, GIN indexes |

### 5.2 All Tables (24)

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `organizations` | Tenant root | name, contact_email, logo_url, brand_color |
| `buildings` | Physical buildings | org_id, name, address fields, sqft, archived |
| `floors` | Building floors | building_id, name, display_order |
| `floor_plans` | Uploaded floor plan images | floor_id (UNIQUE), original_pdf_url, rendered_image_url |
| `spaces` | Rooms/areas to inspect | floor_id, name, pin_x/pin_y (%), deleted_at (soft delete) |
| `space_types` | Room categories | name, is_default, org_id (NULL = system default) |
| `qr_codes` | QR code per space | space_id (UNIQUE), encoded_url, svg_url, png_url |
| `checklist_templates` | Inspection checklists | org_id, name, version, is_canned, archived |
| `checklist_items` | Items within checklists | template_id, description, category, photo_required |
| `inspections` | Inspection records | space_id, inspector_id, template_version, status |
| `inspection_responses` | Individual item responses | inspection_id, checklist_item_id, result (pass/fail) |
| `response_photos` | Photos attached to responses | response_id, photo_url, display_order |
| `deficiencies` | Failed inspection items | space_id, deficiency_number (DEF-NNNN), status |
| `tasks` | Work items | space_id, assigned_to, priority, status, source (auto/manual) |
| `users` | User profiles (extends auth.users) | org_id, email, role, notification_prefs (JSONB) |
| `building_assignments` | User <-> Building junction | user_id, building_id |
| `client_orgs` | External client organizations | org_id, name, contact_email |
| `client_building_links` | Client <-> Building junction | client_org_id, building_id |
| `notifications` | In-app notifications | user_id, type, message, link, read |
| `invitations` | User invitation tokens | email, role, token (UNIQUE), expires_at (+72h) |
| `report_configs` | Auto-report settings | building_id, trigger_type, schedule_cron, recipient_emails |
| `shared_dashboards` | Public share tokens | building_id, token (UNIQUE), expires_at |
| `audit_logs` | Change tracking | table_name, record_id, action, old_values, new_values |
| `inspection_schedules` | Recurring inspections | building_id, frequency, day_of_week, time_of_day, assigned_to |

### 5.3 Enums (12)

```
user_role:           admin | supervisor | client | staff
inspection_status:   in_progress | completed | expired
response_result:     pass | fail
deficiency_status:   open | in_progress | closed
task_status:         open | in_progress | closed
task_priority:       critical | high | medium | low
task_source:         auto | manual
notification_type:   task_assigned | sla_warning | overdue | deficiency_created |
                     inspection_completed | report_sent | invitation | inspection_scheduled
report_trigger_type: scheduled | on_completion
report_type:         summary | detailed
audit_action:        INSERT | UPDATE | DELETE
schedule_frequency:  daily | weekly | biweekly | monthly
```

### 5.4 Entity Relationship Diagram

```
organizations (tenant root)
  |
  +-- buildings (1:many)
  |     +-- floors (1:many)
  |     |     +-- floor_plans (1:1)
  |     |     +-- spaces (1:many)
  |     |           +-- qr_codes (1:1)
  |     |           +-- inspections (1:many)
  |     |           |     +-- inspection_responses (1:many)
  |     |           |     |     +-- response_photos (1:many)
  |     |           |     +-- deficiencies (1:many)
  |     |           +-- tasks (1:many)
  |     +-- building_assignments -> users (many:many)
  |     +-- client_building_links -> client_orgs (many:many)
  |     +-- report_configs (1:many)
  |     +-- shared_dashboards (1:many)
  |     +-- inspection_schedules (1:many)
  |
  +-- users (1:many, extends auth.users)
  +-- client_orgs (1:many)
  +-- checklist_templates (1:many)
  |     +-- checklist_items (1:many)
  +-- space_types (1:many)
  +-- notifications -> users (many:1)
  +-- invitations (1:many)
  +-- audit_logs (1:many)
```

### 5.5 RLS Helper Functions

```sql
public.user_org_id()         -- Returns current user's org UUID
public.user_role()           -- Returns current user's role enum
public.user_building_ids()   -- Returns set of building UUIDs assigned to user
public.client_building_ids() -- Returns set of building UUIDs linked to user's client org
```

Every RLS policy uses these functions. Pattern: `WHERE org_id = public.user_org_id()` on tenant-level tables, building-level filtering via `user_building_ids()` or `client_building_ids()` for supervisors/clients.

### 5.6 Key RLS Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| organizations | Own org | Admin | Admin | - |
| buildings | Own org + assigned/linked | Admin | Admin | - |
| spaces | Not deleted + building accessible | Admin | Admin | - |
| inspections | Via space in org | Inspector (admin/supervisor) | Own in-progress | - |
| tasks | Staff: assigned only; Others: all in org | Supervisor/Admin | Supervisor/Admin/Staff (own) | - |
| notifications | Own (user_id = auth.uid()) | - | Own (mark read) | - |
| audit_logs | Admin only | Triggers only | - | - |
| invitations | Admin + public token lookup | Admin | Admin | - |

### 5.7 Seed Data

**5 Canned Checklist Templates** (org_id = NULL, is_canned = true):

| Template | Items | Sample Categories |
|----------|-------|------------------|
| General Office Cleaning | 8 | Floors, Waste, Surfaces, Touch Points, HVAC |
| Restroom Cleaning | 10 | Fixtures, Glass, Floors, Supplies, Plumbing |
| Kitchen / Break Room | 8 | Surfaces, Appliances, Furniture, Waste |
| Lobby & Common Areas | 8 | Glass, Surfaces, Furniture, Signage, Waste |
| Conference Room | 8 | Surfaces, Equipment, Floors, Touch Points |

**10 Default Space Types**: Office, Restroom, Kitchen, Conference Room, Lobby, Hallway, Stairwell, Elevator, Storage, Other

### 5.8 Database Triggers

**Auto-update timestamps (6):** organizations, buildings, spaces, users, tasks, checklist_templates

**Audit logging (10):** organizations, buildings, spaces, inspections, inspection_responses, deficiencies, tasks, checklist_templates, checklist_items, users, inspection_schedules

**Deficiency numbering:** `generate_deficiency_number()` auto-generates DEF-NNNN per space

### 5.9 Indexes (40+)

Key performance indexes include:
- `idx_inspections_completed` (space_id, completed_at DESC WHERE status='completed')
- `idx_tasks_due` (due_date WHERE status != 'closed')
- `idx_spaces_name_search` (GIN full-text, English)
- `idx_buildings_search` (GIN: name || street || city || state)
- `idx_tasks_search` (GIN: description)
- `idx_deficiencies_search` (GIN: deficiency_number || resolution_comment)
- `idx_inspection_schedules_due` (enabled, next_due_at WHERE enabled=true)

---

## 6. Authentication & Authorization

### Auth Flow

1. **Login**: Email/password via Supabase Auth -> JWT stored in httpOnly cookies
2. **Signup**: Token-gated invitation -> validate token -> create auth user -> create user profile
3. **Password Reset**: Email link via Supabase Auth
4. **Session Management**: `@supabase/ssr` manages cookies, middleware refreshes session

### Middleware (`middleware.ts`)

```
Every request -> updateSession()
  |
  +-- Public routes (/login, /signup, /reset-password, /share, /api/signup): ALLOW
  +-- Not authenticated + not public: REDIRECT to /login?redirect={path}
  +-- Authenticated + auth routes: REDIRECT to /
  +-- Admin routes (/admin/*): Check user role, redirect non-admins to /
```

### Role-Based Access Control

| Route Pattern | admin | supervisor | staff | client |
|---------------|-------|-----------|-------|--------|
| `/` (home) | Dashboard | Dashboard | Redirect `/staff` | Redirect `/client` |
| `/client` | Redirect `/` | Redirect `/` | Redirect `/` | Client Dashboard |
| `/staff` | Redirect `/` | Redirect `/` | Staff Dashboard | Redirect `/` |
| `/buildings/*` | All buildings | Assigned only | Assigned only | Linked only |
| `/admin/*` | Full access | Redirect `/` | Redirect `/` | Redirect `/` |
| `/tasks` | All org tasks | All org tasks | Assigned only | - |
| `/analytics` | Full analytics | Full analytics | Redirect `/` | Redirect `/` |

### Defense in Depth

1. **Middleware**: Route-level protection (redirect unauthenticated)
2. **Server Components**: Profile lookup + role check (redirect unauthorized)
3. **RLS Policies**: Database-level data isolation (even if middleware bypassed)
4. **API Routes**: Auth check + rate limiting

---

## 7. All Routes & Pages

### 7.1 Auth Pages (No Navigation Shell)

#### `/login` -- Login Page
- **Type**: Server Component (form is client component)
- **Components**: `Logo`, `LoginForm`
- **Access**: Public (redirects authenticated users to `/`)

#### `/signup/[token]` -- Signup Page
- **Type**: Server Component
- **Components**: `Logo`, `SignupForm`
- **Access**: Public, token-gated (token validated in form)

#### `/reset-password` -- Password Reset
- **Type**: Server Component
- **Components**: `Logo`, `ResetPasswordForm`
- **Access**: Public

### 7.2 Dashboard Pages (With Navigation Shell)

#### `/` -- Home Dashboard (Admin/Supervisor)
- **Data**: Buildings, KPIs (inspections today, open deficiencies, active staff), overdue tasks, completion trends (7/30/90d), repeat failures, inspector leaderboard
- **Components**: `KpiCard`, `BuildingCard`, `TrendChart`, `RepeatFailuresWidget`, `InspectorLeaderboard`, `QuickActionCard`
- **Access**: Admin/Supervisor (clients -> `/client`, staff -> `/staff`)

#### `/client` -- Client Portfolio Dashboard
- **Data**: Linked buildings via `client_building_links`, compliance scores, pass rates
- **Components**: `KpiCard`, `ClientBuildingCard`
- **Access**: Client role only

#### `/staff` -- Staff Home Dashboard
- **Data**: Assigned open tasks, today's schedules, recent notifications
- **Components**: `QuickActionCard`, `PriorityBadge`, `StatusBadge`
- **Access**: Staff role only

#### `/buildings` -- Building List
- **Data**: Active buildings (+ archived for admin), building assignments
- **Components**: `BuildingListClient`, `CreateBuildingDialog`
- **Access**: All (filtered by role/assignment)

#### `/buildings/[id]` -- Building Dashboard
- **Data**: Building details, floors, spaces, KPIs, recent inspections (5), trend data
- **Components**: `FloorManager`, `KpiCard`, `TrendChart`, `ArchiveBuildingButton`, `ShareDashboardButton`
- **Access**: All (admin-only: share/archive buttons)

#### `/buildings/[id]/spaces` -- Space Management
- **Data**: Spaces (active + soft-deleted), space types, checklist templates
- **Components**: `SpaceManager` (CRUD, QR codes, CSV import, checklist assign, batch print)
- **Access**: All

#### `/buildings/[id]/map/[floorId]` -- Floor Plan Map
- **Data**: Floor plan (signed URL), spaces with pin positions, inspections, deficiencies, tasks
- **Components**: `FloorPlanViewer`, `FloorPlanUpload`, `FloorSelector`, `StatusSummaryBar`, `SpaceListFallback`, `RealtimeRefresh`
- **Status Calculation**: `computeSpaceStatuses()` -> green/amber/red/grey per space
- **Access**: All

#### `/buildings/[id]/inspections` -- Inspection History
- **Data**: Paginated inspections for building
- **Components**: `InspectionHistory`, `ExportButton`
- **Access**: All

#### `/inspect/[spaceId]` -- Space Detail (QR Destination)
- **Data**: Space, floor, building, assigned template, last inspection, in-progress inspection, recent history
- **Actions**: "Start Inspection" / "Resume Inspection" / disabled if no template
- **Access**: All (deep link from QR code, redirects to login if not authenticated)

#### `/inspect/[spaceId]/checklist` -- Inspection Checklist
- **Data**: Template items, inspection record (auto-created or resumed), existing responses (edit mode)
- **Components**: `ChecklistForm` (pass/fail toggles, photo upload, auto-save, submit)
- **Edit Mode**: Via `?edit=inspectionId` (3-month window, admin or original inspector)
- **Access**: All (inspector must be admin/supervisor)

#### `/tasks` -- Task List
- **Data**: All tasks (RLS-filtered), enriched with space/building/user names
- **Components**: `TaskList` (4 filter dimensions: status, priority, building, assignee), `TaskDetailSheet`, `CreateTaskDialog`
- **Access**: All (staff sees assigned only, admin/supervisor sees all)

#### `/deficiencies` -- Deficiency List
- **Data**: All deficiencies, enriched with space/building context
- **Components**: `DeficiencyList`, `ExportButton`
- **Access**: All

#### `/reports` -- Report Generator
- **Data**: Buildings (filtered by role)
- **Components**: `ReportGenerator` (building dropdown, date range, generate PDF)
- **Access**: All

#### `/notifications` -- Notification Center
- **Data**: User's notifications (limit 100)
- **Components**: `NotificationList` (grouped by date, mark-as-read, type icons)
- **Access**: All (RLS: own notifications only)

#### `/profile` -- User Profile
- **Data**: User profile
- **Components**: `NotificationPrefsForm` (SMS/in-app/email toggles), `LogoutButton`
- **Access**: All

#### `/scan` -- In-App QR Scanner
- **Components**: `QrScanner` (BarcodeDetector API, camera access)
- **Access**: All

#### `/analytics` -- Analytics Dashboard
- **Data**: Compliance scores, inspector performance, deficiency trends, space type analysis
- **Components**: `AnalyticsClient` (date range picker, multiple chart types)
- **Access**: Admin/Supervisor only

#### `/more` -- More Menu
- **Data**: User info, counts (users, templates, deficiencies, notifications)
- **Components**: `MoreMenuItem` sections (Admin Console, Operations, Account)
- **Access**: All (sections shown per role)

### 7.3 Admin Pages

#### `/admin/users` -- User Management
- **Data**: Users, pending invitations, buildings, building assignments
- **Components**: `InviteUserDialog`, `UserList` (role edit, building assignment, deactivate)
- **Access**: Admin only

#### `/admin/checklists` -- Checklist Templates
- **Data**: Org templates (active + archived), canned templates, all items
- **Components**: `ChecklistManager` (tabs, clone canned, create new)
- **Access**: Admin only

#### `/admin/checklists/[id]` -- Checklist Editor
- **Data**: Template + items
- **Components**: `ChecklistItemEditor` (add/edit/delete items, category assignment, auto-version)
- **Access**: Admin only (org_id must match)

#### `/admin/settings` -- Organization Settings
- **Data**: Org, space types, client orgs, client building links, buildings, report configs
- **Components**: `OrgSettingsForm`, `SpaceTypesManager`, `ClientOrgsManager`, `ReportConfigManager`
- **Access**: Admin only

#### `/admin/schedules` -- Inspection Schedules
- **Data**: Schedules, buildings, staff/supervisor users, checklist templates
- **Components**: `ScheduleList` (CRUD, enable/disable, frequency config)
- **Access**: Admin/Supervisor

#### `/admin/audit-log` -- Audit Log
- **Data**: Audit logs (paginated, last 50), user names for enrichment
- **Components**: `AuditLogList` (searchable, paginated)
- **Access**: Admin only

### 7.4 Public Pages

#### `/share/[token]` -- Shared Dashboard
- **Data**: Building info via admin client (bypasses RLS), KPIs
- **Components**: `KpiCard`, completion bar
- **SEO**: Dynamic `generateMetadata()` with building name, `robots: noindex/nofollow`
- **Access**: Public (token required, no auth)

---

## 8. API Endpoints

### 8.1 All API Routes

| Route | Method | Auth | Rate Limit | Purpose |
|-------|--------|------|-----------|---------|
| `/api/signup` | POST | None | Per IP | User signup with invitation token |
| `/api/qr-batch` | GET | Required | Per user | Batch QR code generation (PDF) |
| `/api/reports/generate` | POST | Required | 5/60s | PDF report generation |
| `/api/search` | GET | Required | 30/60s | Global search (buildings, spaces, tasks, deficiencies, checklists) |
| `/api/notifications/send-sms` | POST | Required | 20/60s | Send SMS/WhatsApp notification |
| `/api/webhooks/inspection-complete` | POST | None | None | Inspection completion trigger (auto-reports) |
| `/api/cron/sla-warning` | GET | CRON_SECRET | None | Check tasks due within 4h |
| `/api/cron/overdue-check` | GET | CRON_SECRET | None | Check overdue tasks |
| `/api/cron/cleanup-expired` | GET | CRON_SECRET | None | Expire old inspections, purge deleted spaces |
| `/api/cron/send-scheduled-reports` | GET | CRON_SECRET | None | Send reports on schedule |
| `/api/cron/trigger-scheduled-inspections` | GET | CRON_SECRET | None | Create inspection reminders |
| `/api/export/inspections` | GET | Required | 10/60s | CSV export inspections |
| `/api/export/tasks` | GET | Required | 10/60s | CSV export tasks |
| `/api/export/deficiencies` | GET | Required | 10/60s | CSV export deficiencies |
| `/api/auth/callback` | GET | None | None | OAuth callback handler |

### 8.2 Rate Limiting

In-memory sliding window rate limiter (`lib/utils/rate-limit.ts`):

```typescript
rateLimit(identifier: string, limiterKey: string, config: { maxRequests, windowMs })
  -> { success, limit, remaining, reset }
```

Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

Returns 429 status on limit exceeded.

### 8.3 Cron Authentication

All `/api/cron/*` routes validate:
```
Authorization: Bearer <CRON_SECRET>
```

---

## 9. Components

### 9.1 Layout Components

| Component | File | Purpose |
|-----------|------|---------|
| `BottomNav` | `components/layout/bottom-nav.tsx` | Mobile bottom navigation (role-based: 5 items admin, 4 client, 3 staff) |
| `Header` | `components/layout/header.tsx` | Top header with building context, notification bell (unread count, polls 30s) |
| `SidebarNav` | `components/layout/sidebar-nav.tsx` | Desktop sidebar navigation |
| `MoreMenuItem` | `components/layout/more-menu-item.tsx` | Menu item for More page |

### 9.2 Dashboard Components

| Component | File | Purpose |
|-----------|------|---------|
| `KpiCard` | `components/dashboard/kpi-card.tsx` | KPI display (label, value, change indicator) |
| `BuildingCard` | `components/dashboard/building-card.tsx` | Building summary card for admin/supervisor |
| `ClientBuildingCard` | `components/dashboard/client-building-card.tsx` | Building card with compliance metrics |
| `CompletionBar` | `components/dashboard/completion-bar.tsx` | Progress bar (inspected/total spaces) |
| `TrendChart` | `components/dashboard/trend-chart.tsx` | Line chart for 7/30/90 day trends (Recharts) |
| `RepeatFailuresWidget` | `components/dashboard/repeat-failures-widget.tsx` | Spaces failing same item 3+ times |
| `InspectorLeaderboard` | `components/dashboard/inspector-leaderboard.tsx` | Inspector performance ranking |
| `QuickActionCard` | `components/dashboard/quick-action-card.tsx` | Action shortcut card |

### 9.3 Map Components

| Component | File | Purpose |
|-----------|------|---------|
| `FloorPlanViewer` | `components/map/floor-plan-viewer.tsx` | Main map (react-zoom-pan-pinch, status pins, edit mode) |
| `FloorPlanUpload` | `components/map/floor-plan-upload.tsx` | PDF upload + client-side pdfjs-dist rendering to PNG |
| `PinEditor` | `components/map/pin-editor.tsx` | Admin drag-drop pin placement |
| `StatusPin` | `components/map/status-pin.tsx` | Colored pin (green/amber/red/grey) with tooltip |
| `MapControls` | `components/map/map-controls.tsx` | Floating zoom controls |
| `FloorSelector` | `components/map/floor-selector.tsx` | Floor tabs navigation |
| `StatusSummaryBar` | `components/map/status-summary-bar.tsx` | Colored dot counts per status |
| `SpaceListFallback` | `components/map/space-list-fallback.tsx` | List view when no floor plan uploaded |
| `RealtimeRefresh` | `components/map/realtime-refresh.tsx` | Supabase Realtime subscription for live updates |

### 9.4 Analytics Components

| Component | File | Purpose |
|-----------|------|---------|
| `ComplianceChart` | `components/analytics/compliance-chart.tsx` | Compliance scores by building |
| `InspectorTable` | `components/analytics/inspector-table.tsx` | Inspector performance table |
| `DeficiencyTrendChart` | `components/analytics/deficiency-trend-chart.tsx` | Deficiency counts over time |
| `SpaceTypeChart` | `components/analytics/space-type-chart.tsx` | Pass rates by space type |
| `CategoryBreakdownChart` | `components/analytics/category-breakdown-chart.tsx` | Failures by category |
| `DateRangePicker` | `components/analytics/date-range-picker.tsx` | Period selector (7d/30d/90d/custom) |

### 9.5 Shared Components

| Component | File | Purpose |
|-----------|------|---------|
| `StatusBadge` | `components/shared/status-badge.tsx` | Status pill (open/in_progress/closed) |
| `PriorityBadge` | `components/shared/priority-badge.tsx` | Priority pill (critical/high/medium/low) |
| `ExportButton` | `components/shared/export-button.tsx` | CSV export trigger |
| `Logo` | `components/shared/logo.tsx` | SpaceOps logo |
| `GlobalSearch` | `components/search/global-search.tsx` | Cmd+K search across entities |

### 9.6 UI Primitives (shadcn/ui)

alert-dialog, avatar, badge, button, card, dialog, dropdown-menu, input, label, select, separator, sheet, sonner (toast), table, tabs

---

## 10. Library Utilities

### 10.1 Supabase Clients

| File | Export | Usage |
|------|--------|-------|
| `lib/supabase/server.ts` | `createServerClient()` | Server Components (async, returns typed client) |
| `lib/supabase/client.ts` | `createBrowserSupabaseClient()` | Client Components |
| `lib/supabase/admin.ts` | `createAdminClient()` | Service role (bypasses RLS) |
| `lib/supabase/middleware.ts` | `updateSession()` | Auth middleware |

### 10.2 Utility Modules

| File | Purpose |
|------|---------|
| `lib/utils/analytics-queries.ts` | Analytics data fetching (compliance, inspector perf, trends) |
| `lib/utils/audit.ts` | Audit logging helper (sets session context) |
| `lib/utils/csv.ts` | CSV import/export (parse, generate, download) |
| `lib/utils/dashboard-queries.ts` | Dashboard KPI calculations (building stats, trend data, repeat failures) |
| `lib/utils/email.ts` | Resend wrapper (lazy init, send report emails) |
| `lib/utils/format.ts` | Date/time/number formatting |
| `lib/utils/notifications.ts` | `createNotification()`, `createBulkNotifications()` (uses admin client) |
| `lib/utils/pdf.ts` | @react-pdf/renderer document definition (InspectionReport) |
| `lib/utils/pdf-renderer.ts` | pdfjs-dist wrapper (PDF -> PNG, 2x scale, CDN worker) |
| `lib/utils/photos.ts` | Client-side photo compression (Canvas API, max 1MB, max 1920px) |
| `lib/utils/qr.ts` | QR code generation (SVG + PNG, encoded URL) |
| `lib/utils/rate-limit.ts` | In-memory sliding window rate limiter |
| `lib/utils/sms.ts` | Twilio SMS + WhatsApp wrapper (lazy init) |
| `lib/utils/space-status.ts` | Space status calculation (grey/green/amber/red) |
| `lib/utils.ts` | General utilities (`cn()` classname merger) |

### 10.3 State Management

| File | Purpose |
|------|---------|
| `lib/stores/inspection-store.ts` | Zustand store for active inspection (responses, photos, auto-save, localStorage persistence) |
| `lib/hooks/use-auth.ts` | Auth context hook |

### 10.4 Validation

| File | Purpose |
|------|---------|
| `lib/validators/schemas.ts` | All Zod schemas (login, signup, building, space, checklist, task, search, export) |

### 10.5 Type Definitions

| File | Purpose |
|------|---------|
| `lib/types/database.ts` | Hand-written Supabase types (24 tables, 12 enums) |
| `lib/types/helpers.ts` | Convenience aliases (`Building`, `Task`, `Space`, etc.) |

---

## 11. Design System

### 11.1 Typography

**Primary Font**: DM Sans (Google Fonts) -- geometric, professional
**Mono Font**: JetBrains Mono -- IDs, data values

| Token | Size | Weight | Use |
|-------|------|--------|-----|
| `text-display` | 32px | 700 | Page titles |
| `text-h1` | 24px | 700 | Section headers |
| `text-h2` | 20px | 600 | Card headers |
| `text-h3` | 16px | 600 | Subsection headers |
| `text-body` | 14px | 400 | Body text |
| `text-sm` | 13px | 400 | Secondary text |
| `text-caption` | 12px | 500 | Timestamps, metadata |
| `text-label` | 11px | 600 | Labels, categories (uppercase) |
| `text-kpi` | 28px | 700 | Dashboard numbers |
| `font-mono` | 12px | 500 | IDs (DEF-0042, TASK-0118) |

### 11.2 Colors

**Primary: Deep Teal**
```
primary-50:  #F0FDFA     primary-500: #0F9690
primary-100: #CCFBF1     primary-600: #0E8585 (DEFAULT)
primary-200: #99EDEA     primary-700: #0D7377
primary-300: #5EDDD6     primary-800: #065F5C
primary-400: #2ABFB9     primary-900: #042F2E
```

**Semantic Colors** (never change):
```
pass:    #16A34A (bg: #F0FDF4, border: #BBF7D0)
fail:    #DC2626 (bg: #FEF2F2, border: #FECACA)
warning: #F59E0B (bg: #FFFBEB, border: #FDE68A)
info:    #2563EB (bg: #EFF6FF, border: #BFDBFE)
```

**Map Pin Colors**:
```
pin-green: #22C55E  (passed, no open deficiencies)
pin-amber: #F59E0B  (open deficiencies/tasks)
pin-red:   #EF4444  (critical failures or overdue tasks)
pin-grey:  #9CA3AF  (not inspected today)
```

### 11.3 Spacing & Layout

- **Grid**: 4px base (multiples: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64)
- **Border Radius**: sm=6px, md=8px (default), lg=12px, xl=16px, full=9999px
- **Shadows**: sm (subtle), md (cards), lg (modals), xl (dialogs)
- **Mobile-first**: 320px minimum, designed for iPhone SE -> standard -> desktop

### 11.4 Tailwind v4 Configuration

Uses CSS-based configuration instead of `tailwind.config.ts`:
- `@theme inline {}` blocks in `globals.css` for custom tokens
- `@plugin "tailwindcss-animate"` for animation utilities
- `@utility text-display {}` syntax for custom utility classes
- CSS variables for shadcn/ui semantic tokens

### 11.5 Component Patterns

- **Buttons**: Primary (teal-600), Secondary (slate-100), Danger (red), Ghost (transparent)
- **Badges**: Full radius, 12px, semantic colors
- **KPI Cards**: White bg, slate-200 border, lg radius, 20px padding
- **Form Inputs**: Full width, 10px 12px padding, slate-300 border, focus ring primary-500
- **Toasts**: Dark bg (success), fail color (errors), warning-bg (warnings). Sonner library.
- **Bottom Nav**: slate-950 bg. Scan FAB: 48px circle, primary-500, elevated -20px
- **No emojis**: Lucide icons only. Professional/utilitarian design.

---

## 12. Testing

### 12.1 Test Infrastructure

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Vitest config (jsdom, `@` alias, setup file) |
| `tests/setup.ts` | Global setup + mocks |
| `tests/mocks/supabase.ts` | Supabase client mock |
| `tests/fixtures/data.ts` | Test data fixtures |

### 12.2 Unit Tests (11 files)

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `analytics-queries.test.ts` | Analytics query helpers |
| `csv.test.ts` | CSV import/export |
| `export-schemas.test.ts` | Export validation schemas |
| `format.test.ts` | Date/number formatting |
| `inspection-store.test.ts` | Zustand inspection store |
| `rate-limit.test.ts` | Rate limiting logic (7 tests) |
| `schedule-types.test.ts` | Schedule type validation |
| `search-schema.test.ts` | Search parameter validation |
| `seo-config.test.ts` | SEO metadata (5 tests) |
| `space-status.test.ts` | Space status calculation |
| `validators.test.ts` | Zod schema validation |

### 12.3 Component Tests (1 file)

| Test File | Coverage |
|-----------|----------|
| `login-form.test.tsx` | Login form rendering + interaction |

### 12.4 E2E Tests (1 file)

| Test File | Coverage |
|-----------|----------|
| `auth.spec.ts` | Authentication flow (Playwright) |

### 12.5 Running Tests

```bash
npm test              # Run all unit tests (vitest)
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
npm run test:e2e      # E2E tests (Playwright, requires dev server)
```

**Current stats**: ~110 passing tests, clean production build.

---

## 13. Deployment & Infrastructure

### 13.1 Production Environment

| Service | URL/Details |
|---------|------------|
| **App** | https://spaceopsapp.netlify.app |
| **Supabase** | https://lgrgzzehbhajfhuvipbj.supabase.co |
| **Hosting** | Netlify (auto-deploy on push to main) |
| **CI** | GitHub Actions (type check + unit tests) |
| **Cron** | GitHub Actions scheduled workflows |

### 13.2 Netlify Configuration (`netlify.toml`)

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### 13.3 CI Pipeline (`.github/workflows/ci.yml`)

Runs on push to main and PRs:
1. Checkout code
2. Setup Node.js 20 + npm cache
3. `npm ci`
4. `npx tsc --noEmit` (type check)
5. `npx vitest run` (unit tests)

### 13.4 Security Headers (`next.config.ts`)

| Header | Value |
|--------|-------|
| X-Frame-Options | DENY |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | camera=(self), microphone=(), geolocation=(), payment=() |
| X-DNS-Prefetch-Control | on |
| Strict-Transport-Security | max-age=63072000 (production only) |

### 13.5 SEO

- `app/robots.ts`: Disallows /api/, /admin/, /inspect/, /_next/
- `app/sitemap.ts`: Static entries for / and /login
- `app/icon.tsx`: Dynamic favicon (teal square with "S", ImageResponse)
- Root layout metadata: title template "%s -- SpaceOps", OG tags, Twitter card
- Share pages: Dynamic `generateMetadata()` with noindex/nofollow

### 13.6 Error Monitoring

Sentry integrated across 10 files (12 error locations) with contextual tags:
- `audit`, `sms`, `sms-whatsapp`, `notifications`, `notifications-bulk`
- `webhook`, `cron`, `api`

---

## 14. Cron Jobs & Background Tasks

### 14.1 Scheduled Jobs

| Job | Schedule | Endpoint | Purpose |
|-----|----------|----------|---------|
| SLA Warning | Every 30 min | `/api/cron/sla-warning` | Notify when tasks due within 4 hours |
| Overdue Check | Every hour | `/api/cron/overdue-check` | Notify supervisor of overdue tasks |
| Cleanup Expired | Daily 2 AM | `/api/cron/cleanup-expired` | Expire in-progress inspections >4h, purge 30-day deleted spaces |
| Scheduled Reports | Every 6 hours | `/api/cron/send-scheduled-reports` | Send reports per `report_configs` |
| Scheduled Inspections | Every 15 min | `/api/cron/trigger-scheduled-inspections` | Create notifications for due inspections |

### 14.2 Trigger: GitHub Actions (`.github/workflows/cron.yml`)

Each job curls the API endpoint with `Authorization: Bearer $CRON_SECRET`.

### 14.3 Webhook: Inspection Complete

`/api/webhooks/inspection-complete` (POST):
- Triggered when inspection status = completed
- Checks if all spaces in building inspected today
- If yes: generates PDF report, emails to configured recipients
- Creates notifications for relevant users

---

## 15. Feature Reference

### 15.1 QR Code System
- Generate QR code per space (SVG + PNG, encoded URL pointing to `/inspect/{spaceId}`)
- Batch QR generation as PDF grid (labels + codes)
- In-app scanner using BarcodeDetector API
- Deep link preservation through login redirect

### 15.2 Inspection Flow
- Start: scan QR or navigate to space -> "Start Inspection"
- Checklist loaded from assigned template (version snapshotted)
- Each item: Pass/Fail toggle, comment on fail, photo upload (compressed to <1MB)
- Auto-save: localStorage (immediate) + Supabase (3s debounce)
- Submit: atomic transaction creates deficiencies + tasks for failed items
- Edit: within 3-month window, admin or original inspector

### 15.3 Floor Plan Maps
- Upload PDF floor plan, rendered to PNG via pdfjs-dist (2x scale)
- Admin drag-drop pin placement (percentage coordinates)
- Live status pins: green (passed), amber (issues), red (critical/overdue), grey (not inspected)
- Pinch-zoom + pan via react-zoom-pan-pinch
- Real-time updates via Supabase Realtime
- Fallback list view when no floor plan uploaded

### 15.4 Deficiency & Task Pipeline
- Failed checklist items auto-create deficiencies (DEF-NNNN numbering)
- Deficiencies auto-create tasks (source: `auto`)
- Manual task creation also supported (source: `manual`)
- Task workflow: open -> in_progress -> closed
- Priority levels: critical, high, medium, low
- Assignment to staff with SMS/WhatsApp notification
- Bulk actions: close multiple, reassign multiple
- SLA warnings (4h before due) + overdue notifications

### 15.5 Reporting
- On-demand PDF generation (@react-pdf/renderer)
- Completion-triggered: auto-email when all spaces inspected
- Scheduled: configurable cron (daily/weekly) per building
- PDF includes: KPIs, inspection summary, photos, deficiency list
- CSV export for inspections, tasks, deficiencies

### 15.6 Client Access
- Client organizations linked to buildings via `client_building_links`
- Portfolio dashboard with compliance scores
- Read-only access to building dashboards, maps, reports
- Shareable dashboard links (token-based, optional expiry, no auth required)

### 15.7 Notifications
- **In-app**: Bell icon with unread count (polls every 30s), grouped by date
- **SMS**: Via Twilio on task assignment
- **WhatsApp**: Separate channel via Twilio
- **Email**: Report delivery via Resend
- **User preferences**: Per-channel toggles (SMS/in-app/email)
- **Types**: task_assigned, sla_warning, overdue, deficiency_created, inspection_completed, report_sent, invitation, inspection_scheduled

### 15.8 Search
- Global search via Cmd+K or search icon
- Searches: buildings, spaces, tasks, deficiencies, checklists
- Uses PostgreSQL GIN full-text indexes (English dictionary)
- Rate limited: 30 requests/60s per user

### 15.9 Analytics
- Compliance scores by building (bar chart)
- Inspector performance (table with pass rate, count)
- Deficiency trends over time (line chart)
- Space type analysis (pass rates by type)
- Category breakdown (failures by checklist category)
- Date range picker: 7d, 30d, 90d, custom

### 15.10 Audit Trail
- All data changes logged via database triggers
- Tracks: table_name, record_id, action (INSERT/UPDATE/DELETE)
- Stores old_values + new_values as JSONB
- Admin-only read access
- Used for ISO compliance

### 15.11 Scheduled Inspections
- Recurring schedules: daily, weekly, biweekly, monthly
- Configurable: day of week, day of month, time of day
- Assign to specific staff/supervisor
- Enable/disable toggle
- Triggers notification when due
- Cron checks every 15 minutes

---

## 16. Sprint History

### Sprint 1: Foundation -- Auth + Org Setup
**Stories**: AUTH-001, AUTH-003, AUTH-004, AUTH-005, AUTH-006, ORG-001, ORG-002, ORG-003, ORG-006
- Email/password login, password reset, logout
- User invitation with token-gated signup
- Role-based route protection
- Organization CRUD, building CRUD, floor management
- User management (list, edit role, deactivate)

### Sprint 2: Spaces, QR Codes & Checklists
**Stories**: SPC-001, SPC-002, SPC-003, SPC-004, SPC-008, CHK-001, CHK-002, CHK-003
- Space CRUD (individual + CSV bulk import)
- QR code generation (SVG/PNG) + batch PDF print
- Custom space types
- Checklist template management with item editor
- Canned checklist library (5 system templates)
- Checklist assignment to spaces (individual + bulk)

### Sprint 3: Inspection Flow + Deficiency Engine
**Stories**: AUTH-002, SPC-005, SPC-006, CHK-004-008, DEF-001, DEF-002
- QR scan entry with auth gate + deep link preservation
- In-app QR scanner (BarcodeDetector API)
- Complete inspection workflow (start, fill, photo upload, submit)
- Auto-save (localStorage + Supabase sync)
- Auto-create deficiencies + tasks from failed items
- Client-side photo compression (Canvas API, max 1MB)

### Sprint 4: Floor Plans + Visual Map
**Stories**: MAP-001-007, DEF-003
- Floor plan PDF upload + PNG rendering (pdfjs-dist)
- Drag-drop pin placement (admin)
- Live status pins (green/amber/red/grey)
- Pinch-zoom, pan, tap-to-navigate
- Status summary bar, floor selector tabs
- Fallback list view, deficiency management

### Sprint 5: Dashboards + Client Access + Reports
**Stories**: DASH-001-003, DASH-005, DASH-009, DASH-006, DASH-007, ORG-005
- Supervisor home dashboard with KPIs
- Building dashboard with trends
- Client portfolio dashboard
- PDF report generation + completion-triggered delivery
- Repeat failures widget, trend charts
- Client org building linking

### Sprint 6: Task Management + Notifications
**Stories**: DEF-004-009, NOTIF-001-004
- Task CRUD (assign, priority, due date, status workflow)
- Manual task creation
- Task list with 4 filter dimensions
- Deficiency recurrence tracking
- In-app notification center
- SMS/WhatsApp notifications (Twilio)
- SLA warning + overdue check crons

### Sprint 7: Polish & Edge Cases
**Stories**: CHK-009-011, DEF-010, NOTIF-005, ORG-004, ORG-007-009, SPC-007, DASH-004
- Inspection history (paginated, per space/building)
- Edit inspections (3-month window)
- Checklist versioning (auto-increment)
- Bulk task actions (close/reassign)
- Notification preferences
- Building assignment for supervisors
- Building archive/restore
- Space soft delete/restore
- Shareable dashboard links

### Sprint 8: Search, Export & Analytics
- Global search (Cmd+K, GIN full-text indexes)
- CSV export (inspections, tasks, deficiencies)
- Analytics dashboard (compliance, inspector perf, trends)
- Date range picker

### Sprint 9: Scheduling & Audit
- Recurring inspection schedules (daily/weekly/biweekly/monthly)
- Audit logging (10 table triggers, admin viewer)
- Schedule management UI

### Sprint 10: PWA, Monitoring & Integrations
- PWA manifest + service worker
- Sentry error tracking integration
- Vercel Analytics
- Signed photo URLs (10-min expiry)
- Realtime map updates (Supabase Realtime)
- WhatsApp as separate notification channel

### Sprint 11: Production Hardening
- Security headers (X-Frame-Options, CSP, HSTS)
- Rate limiting on 6 API routes
- SEO (robots.txt, sitemap, dynamic favicon, OG meta)
- Dynamic OG meta for share pages
- Sentry integration across 12 error locations
- Accessibility improvements (ARIA labels, keyboard navigation)
- .env.example template
- README rewrite
- Test expansion (rate-limit, seo-config)
- Build verification (110 tests, clean build)

---

## 17. Environment Variables

### Required

| Variable | Description |
|----------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `NEXT_PUBLIC_APP_URL` | Application URL (e.g., https://spaceopsapp.netlify.app) |
| `CRON_SECRET` | Secret for authenticating cron job requests |

### Optional

| Variable | Description |
|----------|------------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_FROM_NUMBER` | Twilio SMS sender number |
| `TWILIO_WHATSAPP_FROM_NUMBER` | Twilio WhatsApp sender number |
| `RESEND_API_KEY` | Resend email API key |
| `RESEND_FROM_EMAIL` | Resend sender email address |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for error tracking |
| `SENTRY_ORG` | Sentry organization slug |
| `SENTRY_PROJECT` | Sentry project slug |
| `SENTRY_AUTH_TOKEN` | Sentry auth token (for source maps) |

---

## 18. Conventions & Patterns

### 18.1 File Naming
- Components: `kebab-case.tsx` (e.g., `kpi-card.tsx`)
- Pages: `page.tsx` (Next.js convention)
- Hooks: `use-kebab-case.ts`
- Utilities: `kebab-case.ts`
- Types: `database.ts`, `helpers.ts`
- Zod schemas: `schemas.ts` (centralized)

### 18.2 Component Pattern

```typescript
// Server Component (default)
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;  // Next.js 16: params are Promises
  const supabase = await createServerClient();
  const { data } = await supabase.from("table").select("*");
  return <div>...</div>;
}

// Client Component (only when needed)
"use client"
export function InteractiveForm({ data }: Props) {
  const [state, setState] = useState();
  return <form>...</form>;
}
```

### 18.3 Supabase Query Pattern

```typescript
const supabase = await createServerClient();
const { data, error } = await supabase
  .from("buildings")
  .select("*")
  .eq("org_id", profile.org_id);

// Cast to typed result (workaround for type inference issues)
const buildings = data as unknown as Building[];
```

### 18.4 Error Handling

- Every route segment has `error.tsx` and `loading.tsx`
- API routes return structured JSON errors with appropriate status codes
- Sentry captures exceptions with contextual tags
- Client components show toast notifications for errors

### 18.5 Commit Convention

```
type(scope): description [STORY-ID]
```

Types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`

### 18.6 Tailwind v4 Notes

- Uses `@theme inline {}` blocks in CSS (not `tailwind.config.ts`)
- Plugins via `@plugin "tailwindcss-animate"`
- Custom utilities via `@utility text-display {}` syntax

### 18.7 Next.js 16 Notes

- `useSearchParams()` must be wrapped in `<Suspense>` boundary
- Page params are `Promise<{ id: string }>` and must be awaited
- `middleware.ts` still works (proxy convention available but not used)

### 18.8 Zod v4 Notes

- `required_error` doesn't exist on `z.enum()` -- use `message` instead
- `z.coerce.number()` works normally

### 18.9 Key Statistics

| Category | Count |
|----------|-------|
| Total Page Routes | 28 |
| API Routes | 15 |
| Components | 45+ |
| Library Utilities | 14 |
| Database Tables | 24 |
| Database Enums | 12 |
| Migrations | 6 |
| RLS Policies | 30+ |
| Indexes | 40+ |
| Triggers | 16+ |
| Unit Test Files | 11 |
| Total Tests | ~110 |
| Sprints Completed | 11 |
| PRD Stories Delivered | 64 |

---

*This document is the complete technical reference for SpaceOps. For product requirements, refer to `SpaceOps_PRD_Requirements_v1.docx`. For architecture diagrams, refer to `SpaceOps_Technical_Architecture.html`.*
