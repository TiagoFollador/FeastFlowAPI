-- ============================================================================
-- SCRIPT DE CONFIGURAÇÃO: ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Plataforma: FeastFlow B2B SaaS
-- Objetivo: Garantir isolamento matemático de dados entre tenants
-- Região: São José dos Pinhais / Curitiba - PR
--
-- ATENÇÃO CRÍTICA:
-- Este script deve ser executado APÓS as migrações do Prisma.
-- O usuário do banco de dados NÃO PODE ter privilégio BYPASSRLS ou ser superuser.
-- ============================================================================

-- Mensagem de início
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Habilitando Row Level Security (RLS)';
  RAISE NOTICE 'FeastFlow Multi-Tenant Platform';
  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- TABELA: User
-- ============================================================================
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "User";
CREATE POLICY tenant_isolation_policy ON "User"
  AS PERMISSIVE
  FOR ALL
  TO PUBLIC
  USING ("tenantId" = current_setting('app.current_tenant_id')::integer);

DO $$
BEGIN
  RAISE NOTICE '✓ RLS habilitado para tabela: User';
END $$;

-- ============================================================================
-- TABELA: Space
-- ============================================================================
ALTER TABLE "Space" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Space" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "Space";
CREATE POLICY tenant_isolation_policy ON "Space"
  AS PERMISSIVE
  FOR ALL
  TO PUBLIC
  USING ("tenantId" = current_setting('app.current_tenant_id')::integer);

DO $$
BEGIN
  RAISE NOTICE '✓ RLS habilitado para tabela: Space';
END $$;

-- ============================================================================
-- TABELA: EventCatalog
-- ============================================================================
ALTER TABLE "EventCatalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventCatalog" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "EventCatalog";
CREATE POLICY tenant_isolation_policy ON "EventCatalog"
  AS PERMISSIVE
  FOR ALL
  TO PUBLIC
  USING ("tenantId" = current_setting('app.current_tenant_id')::integer);

DO $$
BEGIN
  RAISE NOTICE '✓ RLS habilitado para tabela: EventCatalog';
END $$;

-- ============================================================================
-- TABELA: Customer
-- ============================================================================
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "Customer";
CREATE POLICY tenant_isolation_policy ON "Customer"
  AS PERMISSIVE
  FOR ALL
  TO PUBLIC
  USING ("tenantId" = current_setting('app.current_tenant_id')::integer);

DO $$
BEGIN
  RAISE NOTICE '✓ RLS habilitado para tabela: Customer';
END $$;

-- ============================================================================
-- TABELA: Budget
-- ============================================================================
ALTER TABLE "Budget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Budget" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "Budget";
CREATE POLICY tenant_isolation_policy ON "Budget"
  AS PERMISSIVE
  FOR ALL
  TO PUBLIC
  USING ("tenantId" = current_setting('app.current_tenant_id')::integer);

DO $$
BEGIN
  RAISE NOTICE '✓ RLS habilitado para tabela: Budget';
END $$;

-- ============================================================================
-- TABELA: BudgetItem
-- ============================================================================
ALTER TABLE "BudgetItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BudgetItem" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "BudgetItem";
CREATE POLICY tenant_isolation_policy ON "BudgetItem"
  AS PERMISSIVE
  FOR ALL
  TO PUBLIC
  USING ("tenantId" = current_setting('app.current_tenant_id')::integer);

DO $$
BEGIN
  RAISE NOTICE '✓ RLS habilitado para tabela: BudgetItem';
END $$;

-- ============================================================================
-- TABELA: Reservation
-- ============================================================================
ALTER TABLE "Reservation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reservation" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_policy ON "Reservation";
CREATE POLICY tenant_isolation_policy ON "Reservation"
  AS PERMISSIVE
  FOR ALL
  TO PUBLIC
  USING ("tenantId" = current_setting('app.current_tenant_id')::integer);

DO $$
BEGIN
  RAISE NOTICE '✓ RLS habilitado para tabela: Reservation';
END $$;

-- ============================================================================
-- NOTA IMPORTANTE: TENANT (Tabela Raiz)
-- ============================================================================
-- A tabela Tenant NÃO possui RLS pois é a raiz da hierarquia.
-- O acesso aos tenants é controlado pela camada de aplicação durante login.

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================
DO $$
DECLARE
  rls_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rls_count
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
    AND c.relrowsecurity = true;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS configurado com sucesso!';
  RAISE NOTICE 'Total de tabelas protegidas: %', rls_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'LEMBRETE CRÍTICO:';
  RAISE NOTICE '- O usuário do DATABASE_URL NÃO pode ser superuser';
  RAISE NOTICE '- O usuário NÃO pode ter o atributo BYPASSRLS';
  RAISE NOTICE '- Caso contrário, o RLS será ignorado!';
  RAISE NOTICE '';
  RAISE NOTICE 'Para verificar:';
  RAISE NOTICE 'SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = ''seu_usuario'';';
  RAISE NOTICE '========================================';
END $$;
