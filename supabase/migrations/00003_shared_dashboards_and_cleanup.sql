-- Shared dashboards table for public, token-based read-only links
CREATE TABLE shared_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shared_dashboards_token ON shared_dashboards(token);

-- No RLS — public route reads via admin client using token lookup
