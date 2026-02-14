-- ============================================================
-- SpaceOps — Migration 00005: Audit Logs
-- Description: Centralized audit trail for ISO compliance.
--              Tracks all INSERT/UPDATE/DELETE on key tables.
-- ============================================================

-- 1. ENUM
CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- 2. TABLE
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID,
  table_name  TEXT NOT NULL,
  record_id   TEXT NOT NULL,
  action      audit_action NOT NULL,
  user_id     UUID,
  old_values  JSONB,
  new_values  JSONB,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. INDEXES
CREATE INDEX idx_audit_logs_org_created ON audit_logs(org_id, created_at DESC);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- 4. RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_admin_read" ON audit_logs
  FOR SELECT USING (
    org_id = public.user_org_id()
    AND public.user_role() = 'admin'
  );

-- No INSERT/UPDATE/DELETE policies — only triggers write to this table

-- 5. CONTEXT HELPER
-- Sets session variables for audit context (used by admin/service-role client).
-- Browser client calls automatically provide auth.uid() via the trigger.
CREATE OR REPLACE FUNCTION set_audit_context(
  p_user_id UUID,
  p_org_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', COALESCE(p_user_id::text, ''), true);
  IF p_org_id IS NOT NULL THEN
    PERFORM set_config('app.current_org_id', p_org_id::text, true);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. AUDIT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id  UUID;
  v_org_id   UUID;
  v_record_id TEXT;
  v_old      JSONB;
  v_new      JSONB;
  v_user_text TEXT;
  v_org_text  TEXT;
BEGIN
  -- Resolve user: prefer session var (admin client), fall back to auth.uid() (browser client)
  v_user_text := nullif(current_setting('app.current_user_id', true), '');
  IF v_user_text IS NOT NULL THEN
    v_user_id := v_user_text::UUID;
  ELSE
    BEGIN
      v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;
  END IF;

  -- Resolve org_id: try NEW/OLD row first, then session var
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id::TEXT;
    v_old := row_to_json(OLD)::jsonb;
    v_new := NULL;
    -- Try to get org_id from OLD row
    BEGIN
      v_org_id := (row_to_json(OLD)::jsonb ->> 'org_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_org_id := NULL;
    END;
  ELSIF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id::TEXT;
    v_old := NULL;
    v_new := row_to_json(NEW)::jsonb;
    BEGIN
      v_org_id := (row_to_json(NEW)::jsonb ->> 'org_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_org_id := NULL;
    END;
  ELSE -- UPDATE
    v_record_id := NEW.id::TEXT;
    v_old := row_to_json(OLD)::jsonb;
    v_new := row_to_json(NEW)::jsonb;
    BEGIN
      v_org_id := (row_to_json(NEW)::jsonb ->> 'org_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
      v_org_id := NULL;
    END;
  END IF;

  -- Fall back to session var for org_id (tables without org_id column)
  IF v_org_id IS NULL THEN
    v_org_text := nullif(current_setting('app.current_org_id', true), '');
    IF v_org_text IS NOT NULL THEN
      v_org_id := v_org_text::UUID;
    END IF;
  END IF;

  -- For organizations table, the record IS the org
  IF TG_TABLE_NAME = 'organizations' THEN
    IF TG_OP = 'DELETE' THEN
      v_org_id := OLD.id;
    ELSE
      v_org_id := NEW.id;
    END IF;
  END IF;

  INSERT INTO audit_logs (org_id, table_name, record_id, action, user_id, old_values, new_values)
  VALUES (
    v_org_id,
    TG_TABLE_NAME,
    v_record_id,
    TG_OP::audit_action,
    v_user_id,
    v_old,
    v_new
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. ATTACH TRIGGERS
-- Using AFTER triggers so they don't interfere with the operation itself

CREATE TRIGGER trg_audit_organizations
  AFTER INSERT OR UPDATE OR DELETE ON organizations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_audit_buildings
  AFTER INSERT OR UPDATE OR DELETE ON buildings
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_audit_spaces
  AFTER INSERT OR UPDATE OR DELETE ON spaces
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_audit_inspections
  AFTER INSERT OR UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_audit_inspection_responses
  AFTER INSERT OR UPDATE ON inspection_responses
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_audit_deficiencies
  AFTER INSERT OR UPDATE ON deficiencies
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_audit_tasks
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_audit_checklist_templates
  AFTER INSERT OR UPDATE ON checklist_templates
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_audit_checklist_items
  AFTER INSERT OR UPDATE OR DELETE ON checklist_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER trg_audit_users
  AFTER INSERT OR UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();
