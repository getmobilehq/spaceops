-- Add unique constraint for upsert support on inspection_responses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_inspection_response'
  ) THEN
    ALTER TABLE inspection_responses
      ADD CONSTRAINT uq_inspection_response UNIQUE (inspection_id, checklist_item_id);
  END IF;
END$$;

-- Add UPDATE policy for inspection_responses (inspectors can update their own responses)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'responses_inspector_update' AND tablename = 'inspection_responses'
  ) THEN
    CREATE POLICY "responses_inspector_update" ON inspection_responses FOR UPDATE USING (
      inspection_id IN (
        SELECT id FROM inspections WHERE inspector_id = auth.uid() AND status = 'in_progress'
      )
    );
  END IF;
END$$;
