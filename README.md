# SpaceOps

Quality control platform for commercial janitorial companies. Supervisors inspect building spaces via QR codes, failed items auto-create deficiencies and tasks, floor plan maps show live status pins, and clients receive auto-generated PDF reports.

## Features

- **QR-first inspections** — scan a room's QR code to start a checklist, no app store download (PWA)
- **Floor plan maps** — upload PDFs, place drag-and-drop pins, live green/amber/red/grey status
- **Automatic deficiency pipeline** — failed checklist items create deficiencies and tasks automatically
- **PDF reports** — on-demand or auto-emailed when all spaces are inspected
- **Multi-tenant with RLS** — database-level row isolation per organization
- **SMS/WhatsApp notifications** — task assignments, SLA warnings, overdue alerts via Twilio
- **Client dashboards** — read-only portfolio view with compliance scores and sharable links
- **Scheduled inspections** — configurable daily/weekly/biweekly/monthly reminders

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| Hosting | Netlify |
| SMS | Twilio |
| Email | Resend |
| PDF | @react-pdf/renderer |
| Charts | Recharts |
| Monitoring | Sentry |
| Testing | Vitest (unit) + Playwright (e2e) |

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Supabase CLI (`npx supabase init`)

### Setup

```bash
# Clone and install
git clone <repo-url>
cd spaceops
npm install

# Environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start local Supabase
npx supabase start
# Apply migrations
npx supabase db push

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing

```bash
# Unit tests
npx vitest run

# E2E tests (requires dev server running)
npx playwright test
```

## Deployment

Deployed on **Netlify** with `@netlify/plugin-nextjs`.

Required environment variables in production:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`
- Optional: `TWILIO_*`, `RESEND_*`, `SENTRY_*`

Cron jobs (configured in `netlify.toml`):
- SLA warning — every 30 minutes
- Overdue check — hourly
- Scheduled reports — every 6 hours
- Scheduled inspections — every 15 minutes
- Cleanup expired — daily at 2 AM

## Commit Convention

```
type(scope): description [STORY-ID]
```

Types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`
