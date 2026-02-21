-- 00007: Add missing RLS policies for INSERT and DELETE operations
-- Fixes: qr_codes INSERT (403 on space creation), deficiencies INSERT (403 on inspection submit),
-- and adds DELETE policies needed for CRUD features.

-- ============================================================
-- QR_CODES: Add INSERT, UPDATE, DELETE for admin
-- ============================================================
CREATE POLICY "qr_admin_insert" ON qr_codes FOR INSERT WITH CHECK (
  public.user_role() = 'admin'
  AND space_id IN (
    SELECT s.id FROM spaces s
    JOIN floors f ON f.id = s.floor_id
    JOIN buildings b ON b.id = f.building_id
    WHERE b.org_id = public.user_org_id()
  )
);

CREATE POLICY "qr_admin_update" ON qr_codes FOR UPDATE USING (
  public.user_role() = 'admin'
  AND space_id IN (
    SELECT s.id FROM spaces s
    JOIN floors f ON f.id = s.floor_id
    JOIN buildings b ON b.id = f.building_id
    WHERE b.org_id = public.user_org_id()
  )
);

CREATE POLICY "qr_admin_delete" ON qr_codes FOR DELETE USING (
  public.user_role() = 'admin'
  AND space_id IN (
    SELECT s.id FROM spaces s
    JOIN floors f ON f.id = s.floor_id
    JOIN buildings b ON b.id = f.building_id
    WHERE b.org_id = public.user_org_id()
  )
);

-- ============================================================
-- DEFICIENCIES: Add INSERT for admin/supervisor, DELETE for admin
-- ============================================================
CREATE POLICY "deficiencies_inspector_insert" ON deficiencies FOR INSERT WITH CHECK (
  public.user_role() IN ('admin', 'supervisor')
  AND space_id IN (
    SELECT s.id FROM spaces s
    JOIN floors f ON f.id = s.floor_id
    JOIN buildings b ON b.id = f.building_id
    WHERE b.org_id = public.user_org_id()
  )
);

CREATE POLICY "deficiencies_admin_delete" ON deficiencies FOR DELETE USING (
  public.user_role() IN ('admin', 'supervisor')
  AND space_id IN (
    SELECT s.id FROM spaces s
    JOIN floors f ON f.id = s.floor_id
    JOIN buildings b ON b.id = f.building_id
    WHERE b.org_id = public.user_org_id()
  )
);

-- ============================================================
-- TASKS: Add DELETE for admin/supervisor
-- ============================================================
CREATE POLICY "tasks_sup_delete" ON tasks FOR DELETE USING (
  public.user_role() IN ('admin', 'supervisor')
  AND space_id IN (
    SELECT s.id FROM spaces s
    JOIN floors f ON f.id = s.floor_id
    JOIN buildings b ON b.id = f.building_id
    WHERE b.org_id = public.user_org_id()
  )
);

-- ============================================================
-- INSPECTIONS: Add DELETE for admin (for building cascade delete)
-- ============================================================
CREATE POLICY "inspections_admin_delete" ON inspections FOR DELETE USING (
  public.user_role() = 'admin'
  AND space_id IN (
    SELECT s.id FROM spaces s
    JOIN floors f ON f.id = s.floor_id
    JOIN buildings b ON b.id = f.building_id
    WHERE b.org_id = public.user_org_id()
  )
);

-- ============================================================
-- INSPECTION_RESPONSES: Add DELETE for admin (for cascade delete)
-- ============================================================
CREATE POLICY "responses_admin_delete" ON inspection_responses FOR DELETE USING (
  public.user_role() = 'admin'
  AND inspection_id IN (
    SELECT i.id FROM inspections i
    WHERE i.space_id IN (
      SELECT s.id FROM spaces s
      JOIN floors f ON f.id = s.floor_id
      JOIN buildings b ON b.id = f.building_id
      WHERE b.org_id = public.user_org_id()
    )
  )
);

-- ============================================================
-- RESPONSE_PHOTOS: Add DELETE for admin (for cascade delete)
-- ============================================================
CREATE POLICY "photos_admin_delete" ON response_photos FOR DELETE USING (
  public.user_role() = 'admin'
  AND response_id IN (
    SELECT ir.id FROM inspection_responses ir
    JOIN inspections i ON i.id = ir.inspection_id
    WHERE i.space_id IN (
      SELECT s.id FROM spaces s
      JOIN floors f ON f.id = s.floor_id
      JOIN buildings b ON b.id = f.building_id
      WHERE b.org_id = public.user_org_id()
    )
  )
);

-- ============================================================
-- NOTIFICATIONS: Add DELETE for own notifications
-- ============================================================
CREATE POLICY "notifications_own_delete" ON notifications FOR DELETE USING (
  user_id = auth.uid()
);
