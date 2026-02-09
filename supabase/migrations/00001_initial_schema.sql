-- ============================================================
-- SpaceOps — Supabase Migration
-- Version: 1.0.0
-- Date: 2026-02-07
-- Description: Full schema — 19 tables, enums, RLS, indexes,
--              functions, triggers, and canned seed data.
-- Usage: supabase db push (or place in supabase/migrations/)
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'client', 'staff');
CREATE TYPE inspection_status AS ENUM ('in_progress', 'completed', 'expired');
CREATE TYPE response_result AS ENUM ('pass', 'fail');
CREATE TYPE deficiency_status AS ENUM ('open', 'in_progress', 'closed');
CREATE TYPE task_status AS ENUM ('open', 'in_progress', 'closed');
CREATE TYPE task_priority AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE task_source AS ENUM ('auto', 'manual');
CREATE TYPE notification_type AS ENUM (
  'task_assigned', 'sla_warning', 'overdue',
  'deficiency_created', 'inspection_completed',
  'report_sent', 'invitation'
);
CREATE TYPE report_trigger_type AS ENUM ('scheduled', 'on_completion');
CREATE TYPE report_type AS ENUM ('summary', 'detailed');


-- ============================================================
-- 2. TABLES
-- ============================================================

-- 2.1 Organizations (tenant root)
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  contact_email TEXT,
  logo_url    TEXT,
  brand_color TEXT DEFAULT '#0E8585',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_org_name UNIQUE (name)
);

-- 2.2 Buildings
CREATE TABLE buildings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  street      TEXT,
  city        TEXT,
  state       TEXT,
  zip         TEXT,
  sqft        INTEGER,
  archived    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_building_name_per_org UNIQUE (org_id, name)
);

-- 2.3 Floors
CREATE TABLE floors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id   UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_floor_name_per_building UNIQUE (building_id, name)
);

-- 2.4 Floor Plans (1:1 with floors)
CREATE TABLE floor_plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id          UUID NOT NULL UNIQUE REFERENCES floors(id) ON DELETE CASCADE,
  original_pdf_url  TEXT NOT NULL,
  rendered_image_url TEXT,
  image_width       INTEGER,
  image_height      INTEGER,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- 2.5 Space Types
CREATE TABLE space_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  is_default  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2.6 Checklist Templates
CREATE TABLE checklist_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  version     INTEGER DEFAULT 1,
  is_canned   BOOLEAN DEFAULT false,
  archived    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 2.7 Checklist Items
CREATE TABLE checklist_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id     UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  description     TEXT NOT NULL,
  category        TEXT,
  photo_required  BOOLEAN DEFAULT false,
  display_order   INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 2.8 Spaces
CREATE TABLE spaces (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floor_id              UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  checklist_template_id UUID REFERENCES checklist_templates(id) ON DELETE SET NULL,
  space_type_id         UUID REFERENCES space_types(id) ON DELETE SET NULL,
  name                  TEXT NOT NULL,
  sqft                  INTEGER,
  description           TEXT,
  pin_x                 NUMERIC(5,2),  -- percentage 0.00-100.00
  pin_y                 NUMERIC(5,2),
  deleted_at            TIMESTAMPTZ,   -- soft delete (30 days)
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_space_name_per_floor UNIQUE (floor_id, name)
);

-- 2.9 QR Codes (1:1 with spaces)
CREATE TABLE qr_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id    UUID NOT NULL UNIQUE REFERENCES spaces(id) ON DELETE CASCADE,
  encoded_url TEXT NOT NULL,
  svg_url     TEXT,
  png_url     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2.10 Client Organizations (before users to avoid forward reference)
CREATE TABLE client_orgs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  contact_email TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 2.11 Users (extends auth.users)
CREATE TABLE users (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id            UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_org_id     UUID REFERENCES client_orgs(id) ON DELETE SET NULL,
  email             TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  phone             TEXT,
  role              user_role NOT NULL DEFAULT 'staff',
  active            BOOLEAN DEFAULT true,
  notification_prefs JSONB DEFAULT '{"sms": true, "in_app": true, "email": true}'::jsonb,
  last_login        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- 2.12 Building Assignments (junction: users <-> buildings)
CREATE TABLE building_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_user_building UNIQUE (user_id, building_id)
);

-- 2.13 Client Building Links (junction: client_orgs <-> buildings)
CREATE TABLE client_building_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_org_id   UUID NOT NULL REFERENCES client_orgs(id) ON DELETE CASCADE,
  building_id     UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_client_building UNIQUE (client_org_id, building_id)
);

-- 2.14 Inspections
CREATE TABLE inspections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id          UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  inspector_id      UUID NOT NULL REFERENCES users(id),
  template_version  INTEGER NOT NULL,
  status            inspection_status DEFAULT 'in_progress',
  started_at        TIMESTAMPTZ DEFAULT now(),
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- 2.15 Inspection Responses
CREATE TABLE inspection_responses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id     UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES checklist_items(id),
  result            response_result,
  comment           TEXT,
  responded_at      TIMESTAMPTZ DEFAULT now()
);

-- 2.16 Response Photos
CREATE TABLE response_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id   UUID NOT NULL REFERENCES inspection_responses(id) ON DELETE CASCADE,
  photo_url     TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  uploaded_at   TIMESTAMPTZ DEFAULT now()
);

-- 2.17 Deficiencies
CREATE TABLE deficiencies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id            UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  inspection_id       UUID NOT NULL REFERENCES inspections(id),
  response_id         UUID NOT NULL REFERENCES inspection_responses(id),
  deficiency_number   TEXT NOT NULL,  -- e.g. DEF-0042
  status              deficiency_status DEFAULT 'open',
  resolution_comment  TEXT,
  resolution_photo_url TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  resolved_at         TIMESTAMPTZ
);

-- 2.18 Tasks
CREATE TABLE tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deficiency_id       UUID REFERENCES deficiencies(id) ON DELETE SET NULL,
  space_id            UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  assigned_to         UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by          UUID NOT NULL REFERENCES users(id),
  description         TEXT NOT NULL,
  priority            task_priority DEFAULT 'medium',
  status              task_status DEFAULT 'open',
  source              task_source DEFAULT 'manual',
  due_date            TIMESTAMPTZ,
  resolution_comment  TEXT,
  resolution_photo_url TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  resolved_at         TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- 2.19 Notifications
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  message     TEXT NOT NULL,
  link        TEXT,
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2.20 Report Configs
CREATE TABLE report_configs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id       UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  trigger_type      report_trigger_type NOT NULL,
  schedule_cron     TEXT,  -- null if on_completion
  recipient_emails  JSONB NOT NULL DEFAULT '[]'::jsonb,
  report_type       report_type DEFAULT 'summary',
  enabled           BOOLEAN DEFAULT true,
  last_sent_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);


-- 2.21 Invitations
CREATE TABLE invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'staff',
  token       TEXT NOT NULL UNIQUE,
  accepted    BOOLEAN DEFAULT false,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '72 hours'),
  invited_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- 3. INDEXES
-- ============================================================

-- Lookup performance
CREATE INDEX idx_buildings_org ON buildings(org_id);
CREATE INDEX idx_floors_building ON floors(building_id);
CREATE INDEX idx_spaces_floor ON spaces(floor_id);
CREATE INDEX idx_spaces_checklist ON spaces(checklist_template_id);
CREATE INDEX idx_spaces_not_deleted ON spaces(floor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inspections_space ON inspections(space_id);
CREATE INDEX idx_inspections_inspector ON inspections(inspector_id);
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_inspections_completed ON inspections(space_id, completed_at DESC) WHERE status = 'completed';
CREATE INDEX idx_responses_inspection ON inspection_responses(inspection_id);
CREATE INDEX idx_photos_response ON response_photos(response_id);
CREATE INDEX idx_deficiencies_space ON deficiencies(space_id);
CREATE INDEX idx_deficiencies_status ON deficiencies(status);
CREATE INDEX idx_tasks_space ON tasks(space_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due ON tasks(due_date) WHERE status != 'closed';
CREATE INDEX idx_notifications_user ON notifications(user_id, read);
CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_building_assignments_user ON building_assignments(user_id);
CREATE INDEX idx_building_assignments_building ON building_assignments(building_id);
CREATE INDEX idx_client_building_links_client ON client_building_links(client_org_id);
CREATE INDEX idx_report_configs_building ON report_configs(building_id);
CREATE INDEX idx_checklist_items_template ON checklist_items(template_id);
CREATE INDEX idx_invitations_token ON invitations(token) WHERE accepted = false;
CREATE INDEX idx_invitations_org ON invitations(org_id);

-- Full-text search on space names (for manual search fallback)
CREATE INDEX idx_spaces_name_search ON spaces USING gin(to_tsvector('english', name));


-- ============================================================
-- 4. HELPER FUNCTIONS
-- ============================================================

-- Get current user's org_id
CREATE OR REPLACE FUNCTION public.user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's role
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get building IDs assigned to current user
CREATE OR REPLACE FUNCTION public.user_building_ids()
RETURNS SETOF UUID AS $$
  SELECT building_id FROM public.building_assignments WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get building IDs linked to current user's client org
CREATE OR REPLACE FUNCTION public.client_building_ids()
RETURNS SETOF UUID AS $$
  SELECT cbl.building_id
  FROM public.client_building_links cbl
  JOIN public.users u ON u.client_org_id = cbl.client_org_id
  WHERE u.id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Generate next deficiency number for a space
CREATE OR REPLACE FUNCTION generate_deficiency_number(p_space_id UUID)
RETURNS TEXT AS $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO cnt FROM deficiencies WHERE space_id = p_space_id;
  RETURN 'DEF-' || LPAD(cnt::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 5. TRIGGERS
-- ============================================================

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_buildings_updated_at
  BEFORE UPDATE ON buildings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_spaces_updated_at
  BEFORE UPDATE ON spaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_checklist_templates_updated_at
  BEFORE UPDATE ON checklist_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_building_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE deficiencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- --- Organizations ---
CREATE POLICY "org_read_own"   ON organizations FOR SELECT USING (id = public.user_org_id());
CREATE POLICY "org_admin_write" ON organizations FOR ALL USING (id = public.user_org_id() AND public.user_role() = 'admin');

-- --- Buildings ---
CREATE POLICY "buildings_org_read" ON buildings FOR SELECT USING (
  org_id = public.user_org_id()
  AND (
    public.user_role() = 'admin'
    OR id IN (SELECT public.user_building_ids())
    OR id IN (SELECT public.client_building_ids())
  )
);
CREATE POLICY "buildings_admin_write" ON buildings FOR ALL USING (
  org_id = public.user_org_id() AND public.user_role() = 'admin'
);

-- --- Floors ---
CREATE POLICY "floors_via_building" ON floors FOR SELECT USING (
  building_id IN (
    SELECT b.id FROM buildings b WHERE b.org_id = public.user_org_id()
  )
);
CREATE POLICY "floors_admin_write" ON floors FOR ALL USING (
  building_id IN (
    SELECT b.id FROM buildings b WHERE b.org_id = public.user_org_id() AND public.user_role() = 'admin'
  )
);

-- --- Floor Plans ---
CREATE POLICY "floor_plans_via_floor" ON floor_plans FOR SELECT USING (
  floor_id IN (
    SELECT f.id FROM floors f
    JOIN buildings b ON b.id = f.building_id
    WHERE b.org_id = public.user_org_id()
  )
);
CREATE POLICY "floor_plans_admin_write" ON floor_plans FOR ALL USING (
  floor_id IN (
    SELECT f.id FROM floors f
    JOIN buildings b ON b.id = f.building_id
    WHERE b.org_id = public.user_org_id() AND public.user_role() = 'admin'
  )
);

-- --- Spaces ---
CREATE POLICY "spaces_via_building" ON spaces FOR SELECT USING (
  floor_id IN (
    SELECT f.id FROM floors f
    JOIN buildings b ON b.id = f.building_id
    WHERE b.org_id = public.user_org_id()
  )
  AND deleted_at IS NULL
);
CREATE POLICY "spaces_admin_write" ON spaces FOR ALL USING (
  floor_id IN (
    SELECT f.id FROM floors f
    JOIN buildings b ON b.id = f.building_id
    WHERE b.org_id = public.user_org_id() AND public.user_role() = 'admin'
  )
);

-- --- QR Codes ---
CREATE POLICY "qr_org_read" ON qr_codes FOR SELECT USING (
  space_id IN (
    SELECT s.id FROM spaces s
    JOIN floors f ON f.id = s.floor_id
    JOIN buildings b ON b.id = f.building_id
    WHERE b.org_id = public.user_org_id()
  )
);

-- --- Users ---
CREATE POLICY "users_read_own_org" ON users FOR SELECT USING (org_id = public.user_org_id());
CREATE POLICY "users_read_self"    ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_admin_manage" ON users FOR ALL USING (
  org_id = public.user_org_id() AND public.user_role() = 'admin'
);
CREATE POLICY "users_update_self"  ON users FOR UPDATE USING (id = auth.uid());

-- --- Building Assignments ---
CREATE POLICY "ba_org_read" ON building_assignments FOR SELECT USING (
  user_id IN (SELECT id FROM users WHERE org_id = public.user_org_id())
);
CREATE POLICY "ba_admin_write" ON building_assignments FOR ALL USING (
  public.user_role() = 'admin'
  AND user_id IN (SELECT id FROM users WHERE org_id = public.user_org_id())
);

-- --- Client Orgs ---
CREATE POLICY "client_orgs_org_read" ON client_orgs FOR SELECT USING (org_id = public.user_org_id());
CREATE POLICY "client_orgs_admin_write" ON client_orgs FOR ALL USING (
  org_id = public.user_org_id() AND public.user_role() = 'admin'
);

-- --- Client Building Links ---
CREATE POLICY "cbl_org_read" ON client_building_links FOR SELECT USING (
  client_org_id IN (SELECT id FROM client_orgs WHERE org_id = public.user_org_id())
);
CREATE POLICY "cbl_admin_write" ON client_building_links FOR ALL USING (
  public.user_role() = 'admin'
  AND client_org_id IN (SELECT id FROM client_orgs WHERE org_id = public.user_org_id())
);

-- --- Checklist Templates ---
CREATE POLICY "templates_org_or_canned" ON checklist_templates FOR SELECT USING (
  org_id = public.user_org_id() OR is_canned = true
);
CREATE POLICY "templates_admin_write" ON checklist_templates FOR ALL USING (
  org_id = public.user_org_id() AND public.user_role() = 'admin'
);

-- --- Checklist Items ---
CREATE POLICY "items_via_template" ON checklist_items FOR SELECT USING (
  template_id IN (
    SELECT id FROM checklist_templates
    WHERE org_id = public.user_org_id() OR is_canned = true
  )
);
CREATE POLICY "items_admin_write" ON checklist_items FOR ALL USING (
  template_id IN (
    SELECT id FROM checklist_templates
    WHERE org_id = public.user_org_id() AND public.user_role() = 'admin'
  )
);

-- --- Inspections ---
CREATE POLICY "inspections_org_read" ON inspections FOR SELECT USING (
  space_id IN (
    SELECT s.id FROM spaces s
    JOIN floors f ON f.id = s.floor_id
    JOIN buildings b ON b.id = f.building_id
    WHERE b.org_id = public.user_org_id()
  )
);
CREATE POLICY "inspections_inspector_insert" ON inspections FOR INSERT WITH CHECK (
  inspector_id = auth.uid()
  AND public.user_role() IN ('admin', 'supervisor')
);
CREATE POLICY "inspections_inspector_update" ON inspections FOR UPDATE USING (
  inspector_id = auth.uid()
);

-- --- Inspection Responses ---
CREATE POLICY "responses_via_inspection" ON inspection_responses FOR SELECT USING (
  inspection_id IN (
    SELECT i.id FROM inspections i
    JOIN spaces s ON s.id = i.space_id
    JOIN floors f ON f.id = s.floor_id
    JOIN buildings b ON b.id = f.building_id
    WHERE b.org_id = public.user_org_id()
  )
);
CREATE POLICY "responses_inspector_write" ON inspection_responses FOR INSERT WITH CHECK (
  inspection_id IN (
    SELECT id FROM inspections WHERE inspector_id = auth.uid()
  )
);

-- --- Response Photos ---
CREATE POLICY "photos_via_response" ON response_photos FOR SELECT USING (
  response_id IN (
    SELECT ir.id FROM inspection_responses ir
    JOIN inspections i ON i.id = ir.inspection_id
    JOIN spaces s ON s.id = i.space_id
    JOIN floors f ON f.id = s.floor_id
    JOIN buildings b ON b.id = f.building_id
    WHERE b.org_id = public.user_org_id()
  )
);
CREATE POLICY "photos_inspector_write" ON response_photos FOR INSERT WITH CHECK (
  response_id IN (
    SELECT ir.id FROM inspection_responses ir
    JOIN inspections i ON i.id = ir.inspection_id
    WHERE i.inspector_id = auth.uid()
  )
);

-- --- Deficiencies ---
CREATE POLICY "deficiencies_org_read" ON deficiencies FOR SELECT USING (
  space_id IN (
    SELECT s.id FROM spaces s
    JOIN floors f ON f.id = s.floor_id
    JOIN buildings b ON b.id = f.building_id
    WHERE b.org_id = public.user_org_id()
  )
);
CREATE POLICY "deficiencies_sup_update" ON deficiencies FOR UPDATE USING (
  public.user_role() IN ('admin', 'supervisor')
  AND space_id IN (
    SELECT s.id FROM spaces s
    JOIN floors f ON f.id = s.floor_id
    JOIN buildings b ON b.id = f.building_id
    WHERE b.org_id = public.user_org_id()
  )
);

-- --- Tasks ---
CREATE POLICY "tasks_org_read" ON tasks FOR SELECT USING (
  CASE
    WHEN public.user_role() = 'staff' THEN assigned_to = auth.uid()
    ELSE space_id IN (
      SELECT s.id FROM spaces s
      JOIN floors f ON f.id = s.floor_id
      JOIN buildings b ON b.id = f.building_id
      WHERE b.org_id = public.user_org_id()
    )
  END
);
CREATE POLICY "tasks_sup_write" ON tasks FOR ALL USING (
  public.user_role() IN ('admin', 'supervisor')
  AND space_id IN (
    SELECT s.id FROM spaces s
    JOIN floors f ON f.id = s.floor_id
    JOIN buildings b ON b.id = f.building_id
    WHERE b.org_id = public.user_org_id()
  )
);
CREATE POLICY "tasks_staff_update" ON tasks FOR UPDATE USING (
  public.user_role() = 'staff' AND assigned_to = auth.uid()
);

-- --- Notifications ---
CREATE POLICY "notifications_own" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_own_update" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- --- Report Configs ---
CREATE POLICY "report_configs_org" ON report_configs FOR SELECT USING (
  building_id IN (
    SELECT id FROM buildings WHERE org_id = public.user_org_id()
  )
);
CREATE POLICY "report_configs_admin_write" ON report_configs FOR ALL USING (
  public.user_role() = 'admin'
  AND building_id IN (
    SELECT id FROM buildings WHERE org_id = public.user_org_id()
  )
);

-- --- Space Types ---
CREATE POLICY "space_types_org" ON space_types FOR SELECT USING (
  org_id = public.user_org_id() OR is_default = true
);
CREATE POLICY "space_types_admin_write" ON space_types FOR ALL USING (
  org_id = public.user_org_id() AND public.user_role() = 'admin'
);

-- --- Invitations ---
CREATE POLICY "invitations_admin_read" ON invitations FOR SELECT USING (
  org_id = public.user_org_id() AND public.user_role() = 'admin'
);
CREATE POLICY "invitations_admin_write" ON invitations FOR ALL USING (
  org_id = public.user_org_id() AND public.user_role() = 'admin'
);
-- Allow unauthenticated token lookup for signup
CREATE POLICY "invitations_token_lookup" ON invitations FOR SELECT USING (true);


-- ============================================================
-- 7. SEED DATA: Canned Checklist Templates
-- ============================================================

-- These are system-wide (org_id = NULL, is_canned = true)
-- Organizations can clone these into their own templates.

INSERT INTO checklist_templates (id, org_id, name, is_canned) VALUES
  ('00000000-0000-0000-0001-000000000001', NULL, 'General Office Cleaning', true),
  ('00000000-0000-0000-0001-000000000002', NULL, 'Restroom Cleaning', true),
  ('00000000-0000-0000-0001-000000000003', NULL, 'Kitchen / Break Room', true),
  ('00000000-0000-0000-0001-000000000004', NULL, 'Lobby & Common Areas', true),
  ('00000000-0000-0000-0001-000000000005', NULL, 'Conference Room', true);

-- General Office Cleaning
INSERT INTO checklist_items (template_id, description, category, photo_required, display_order) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Floors vacuumed/mopped, free of debris', 'Floors', false, 1),
  ('00000000-0000-0000-0001-000000000001', 'Trash emptied and liners replaced', 'Waste', false, 2),
  ('00000000-0000-0000-0001-000000000001', 'Surfaces wiped and dust-free', 'Surfaces', true, 3),
  ('00000000-0000-0000-0001-000000000001', 'Windows and glass partitions cleaned', 'Glass', false, 4),
  ('00000000-0000-0000-0001-000000000001', 'Light switches and door handles sanitized', 'Touch Points', false, 5),
  ('00000000-0000-0000-0001-000000000001', 'Chairs and furniture properly arranged', 'Furniture', false, 6),
  ('00000000-0000-0000-0001-000000000001', 'Air vents free of dust buildup', 'HVAC', true, 7),
  ('00000000-0000-0000-0001-000000000001', 'Baseboards clean, no scuff marks', 'Floors', false, 8);

-- Restroom Cleaning
INSERT INTO checklist_items (template_id, description, category, photo_required, display_order) VALUES
  ('00000000-0000-0000-0001-000000000002', 'Toilets cleaned and sanitized', 'Fixtures', true, 1),
  ('00000000-0000-0000-0001-000000000002', 'Sinks and countertops cleaned', 'Fixtures', false, 2),
  ('00000000-0000-0000-0001-000000000002', 'Mirrors cleaned, streak-free', 'Glass', false, 3),
  ('00000000-0000-0000-0001-000000000002', 'Floors mopped and dry', 'Floors', false, 4),
  ('00000000-0000-0000-0001-000000000002', 'Paper towels and toilet paper stocked', 'Supplies', true, 5),
  ('00000000-0000-0000-0001-000000000002', 'Soap dispensers filled', 'Supplies', false, 6),
  ('00000000-0000-0000-0001-000000000002', 'Trash emptied and liners replaced', 'Waste', false, 7),
  ('00000000-0000-0000-0001-000000000002', 'No unpleasant odors', 'Air Quality', false, 8),
  ('00000000-0000-0000-0001-000000000002', 'Partitions and walls free of marks', 'Surfaces', false, 9),
  ('00000000-0000-0000-0001-000000000002', 'Drains clear and functional', 'Plumbing', false, 10);

-- Kitchen / Break Room
INSERT INTO checklist_items (template_id, description, category, photo_required, display_order) VALUES
  ('00000000-0000-0000-0001-000000000003', 'Countertops wiped and sanitized', 'Surfaces', false, 1),
  ('00000000-0000-0000-0001-000000000003', 'Sink cleaned, no standing water', 'Fixtures', false, 2),
  ('00000000-0000-0000-0001-000000000003', 'Microwave interior and exterior cleaned', 'Appliances', true, 3),
  ('00000000-0000-0000-0001-000000000003', 'Refrigerator exterior wiped down', 'Appliances', false, 4),
  ('00000000-0000-0000-0001-000000000003', 'Tables and chairs wiped clean', 'Furniture', false, 5),
  ('00000000-0000-0000-0001-000000000003', 'Floors swept and mopped', 'Floors', false, 6),
  ('00000000-0000-0000-0001-000000000003', 'Trash and recycling emptied', 'Waste', false, 7),
  ('00000000-0000-0000-0001-000000000003', 'Coffee station area clean', 'Appliances', false, 8);

-- Lobby & Common Areas
INSERT INTO checklist_items (template_id, description, category, photo_required, display_order) VALUES
  ('00000000-0000-0000-0001-000000000004', 'Entry doors and glass cleaned', 'Glass', true, 1),
  ('00000000-0000-0000-0001-000000000004', 'Reception desk clean and organized', 'Surfaces', false, 2),
  ('00000000-0000-0000-0001-000000000004', 'Seating area tidy, cushions arranged', 'Furniture', false, 3),
  ('00000000-0000-0000-0001-000000000004', 'Floors polished/vacuumed', 'Floors', false, 4),
  ('00000000-0000-0000-0001-000000000004', 'Elevator doors and buttons cleaned', 'Touch Points', false, 5),
  ('00000000-0000-0000-0001-000000000004', 'Planters and decorative elements dusted', 'Decor', false, 6),
  ('00000000-0000-0000-0001-000000000004', 'Signage clean and visible', 'Signage', false, 7),
  ('00000000-0000-0000-0001-000000000004', 'Trash receptacles emptied', 'Waste', false, 8);

-- Conference Room
INSERT INTO checklist_items (template_id, description, category, photo_required, display_order) VALUES
  ('00000000-0000-0000-0001-000000000005', 'Table wiped and sanitized', 'Surfaces', false, 1),
  ('00000000-0000-0000-0001-000000000005', 'Chairs pushed in and arranged', 'Furniture', false, 2),
  ('00000000-0000-0000-0001-000000000005', 'Whiteboard cleaned', 'Equipment', true, 3),
  ('00000000-0000-0000-0001-000000000005', 'AV equipment dusted (screen, projector)', 'Equipment', false, 4),
  ('00000000-0000-0000-0001-000000000005', 'Floor vacuumed/mopped', 'Floors', false, 5),
  ('00000000-0000-0000-0001-000000000005', 'Trash emptied and liner replaced', 'Waste', false, 6),
  ('00000000-0000-0000-0001-000000000005', 'Glass walls/windows streak-free', 'Glass', false, 7),
  ('00000000-0000-0000-0001-000000000005', 'Phone and remotes wiped down', 'Touch Points', false, 8);

-- Default Space Types
INSERT INTO space_types (org_id, name, is_default) VALUES
  (NULL, 'Office', true),
  (NULL, 'Restroom', true),
  (NULL, 'Kitchen', true),
  (NULL, 'Conference Room', true),
  (NULL, 'Lobby', true),
  (NULL, 'Hallway', true),
  (NULL, 'Stairwell', true),
  (NULL, 'Elevator', true),
  (NULL, 'Storage', true),
  (NULL, 'Other', true);


-- ============================================================
-- 8. STORAGE BUCKETS (run via Supabase Dashboard or CLI)
-- ============================================================
-- Note: Storage bucket creation is typically done via the
-- Supabase dashboard or supabase CLI, not SQL migrations.
-- Included here as reference documentation.
--
-- INSERT INTO storage.buckets (id, name, public) VALUES
--   ('org-assets', 'org-assets', false),
--   ('floor-plans', 'floor-plans', false),
--   ('inspection-photos', 'inspection-photos', false),
--   ('resolution-photos', 'resolution-photos', false),
--   ('qr-codes', 'qr-codes', false),
--   ('reports', 'reports', false);


-- ============================================================
-- DONE
-- ============================================================
-- Total: 19 tables, 10 enums, 24 indexes, 6 triggers,
--        5 helper functions, 30+ RLS policies,
--        5 canned checklists (42 items), 10 default space types.
-- ============================================================
