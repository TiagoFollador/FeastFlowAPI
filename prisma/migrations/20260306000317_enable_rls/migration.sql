-- =============================================================================
-- Migration: Enable Row-Level Security (RLS) for all tenant-scoped tables
--
-- The isolation policy compares each row's tenant_id against the session
-- variable 'app.current_tenant_id', which is injected at query-time by the
-- Prisma Client Extension in PrismaService.
--
-- The second argument `true` in current_setting() returns NULL instead of
-- raising an error when the variable has not been set, so superuser / admin
-- connections bypass the policy naturally.
-- =============================================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_locations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners            ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_services    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE staffing_rules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_snapshots    ENABLE ROW LEVEL SECURITY;

-- Force RLS even for the table owner so the application DB user cannot
-- accidentally bypass the policies.
ALTER TABLE users               FORCE ROW LEVEL SECURITY;
ALTER TABLE event_locations     FORCE ROW LEVEL SECURITY;
ALTER TABLE partners            FORCE ROW LEVEL SECURITY;
ALTER TABLE partner_services    FORCE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules       FORCE ROW LEVEL SECURITY;
ALTER TABLE staffing_rules      FORCE ROW LEVEL SECURITY;
ALTER TABLE budgets             FORCE ROW LEVEL SECURITY;
ALTER TABLE budget_items        FORCE ROW LEVEL SECURITY;
ALTER TABLE budget_snapshots    FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Isolation policies: allow access only when tenant_id matches the session var
-- ---------------------------------------------------------------------------

CREATE POLICY tenant_isolation ON users
  USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation ON event_locations
  USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation ON partners
  USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation ON partner_services
  USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation ON pricing_rules
  USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation ON staffing_rules
  USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation ON budgets
  USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation ON budget_items
  USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));

CREATE POLICY tenant_isolation ON budget_snapshots
  USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));