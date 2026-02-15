-- ============================================================
-- SpaceOps — Migration 00006: Search Indexes + Inspection Schedules
-- Description: GIN indexes for full-text search across tables.
--              Inspection scheduling system for recurring inspections.
-- ============================================================

-- ============================================================
-- 1. GIN SEARCH INDEXES
-- ============================================================
-- Note: spaces already has idx_spaces_name_search from 00001

CREATE INDEX IF NOT EXISTS idx_buildings_search ON buildings USING GIN (
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(street, '') || ' ' || coalesce(city, '') || ' ' || coalesce(state, ''))
);

CREATE INDEX IF NOT EXISTS idx_tasks_search ON tasks USING GIN (
  to_tsvector('english', coalesce(description, ''))
);

CREATE INDEX IF NOT EXISTS idx_deficiencies_search ON deficiencies USING GIN (
  to_tsvector('english', coalesce(deficiency_number, '') || ' ' || coalesce(resolution_comment, ''))
);

CREATE INDEX IF NOT EXISTS idx_checklist_templates_search ON checklist_templates USING GIN (
  to_tsvector('english', coalesce(name, ''))
);

-- ============================================================
-- 2. SCHEDULE FREQUENCY ENUM
-- ============================================================
CREATE TYPE schedule_frequency AS ENUM ('daily', 'weekly', 'biweekly', 'monthly');

-- ============================================================
-- 3. EXTEND NOTIFICATION_TYPE ENUM
-- ============================================================
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'inspection_scheduled';

-- ============================================================
-- 4. INSPECTION_SCHEDULES TABLE
-- ============================================================
CREATE TABLE inspection_schedules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  building_id           UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  checklist_template_id UUID REFERENCES checklist_templates(id) ON DELETE SET NULL,
  frequency             schedule_frequency NOT NULL DEFAULT 'daily',
  day_of_week           INTEGER,          -- 0=Sunday..6=Saturday (for weekly/biweekly)
  day_of_month          INTEGER,          -- 1-28 (for monthly)
  time_of_day           TIME NOT NULL DEFAULT '09:00',
  assigned_to           UUID REFERENCES users(id) ON DELETE SET NULL,
  enabled               BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at     TIMESTAMPTZ,
  next_due_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. INDEXES
-- ============================================================
CREATE INDEX idx_inspection_schedules_org ON inspection_schedules(org_id);
CREATE INDEX idx_inspection_schedules_building ON inspection_schedules(building_id);
CREATE INDEX idx_inspection_schedules_due ON inspection_schedules(enabled, next_due_at)
  WHERE enabled = true;

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================
ALTER TABLE inspection_schedules ENABLE ROW LEVEL SECURITY;

-- All authenticated users in org can read schedules
CREATE POLICY "Users can view own org schedules"
  ON inspection_schedules FOR SELECT
  TO authenticated
  USING (org_id = public.user_org_id());

-- Admin and supervisor can create schedules
CREATE POLICY "Admin/supervisor can create schedules"
  ON inspection_schedules FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id = public.user_org_id()
    AND public.user_role() IN ('admin', 'supervisor')
  );

-- Admin and supervisor can update schedules
CREATE POLICY "Admin/supervisor can update schedules"
  ON inspection_schedules FOR UPDATE
  TO authenticated
  USING (
    org_id = public.user_org_id()
    AND public.user_role() IN ('admin', 'supervisor')
  )
  WITH CHECK (
    org_id = public.user_org_id()
    AND public.user_role() IN ('admin', 'supervisor')
  );

-- Admin and supervisor can delete schedules
CREATE POLICY "Admin/supervisor can delete schedules"
  ON inspection_schedules FOR DELETE
  TO authenticated
  USING (
    org_id = public.user_org_id()
    AND public.user_role() IN ('admin', 'supervisor')
  );

-- ============================================================
-- 7. AUDIT TRIGGER
-- ============================================================
CREATE TRIGGER audit_inspection_schedules
  AFTER INSERT OR UPDATE OR DELETE ON inspection_schedules
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();
