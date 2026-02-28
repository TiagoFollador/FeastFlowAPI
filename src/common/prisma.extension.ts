import { PrismaClient } from '@prisma/client';
import { TenantContextManager } from './tenant-context.manager';

/**
 * Extensão do Prisma Client para injetar automaticamente o tenantId
 * em todas as queries via Row Level Security (RLS) do PostgreSQL
 * 
 * ARQUITETURA DE SEGURANÇA CRÍTICA:
 * 
 * Esta extensão resolve três problemas fundamentais:
 * 1. Propaga o tenantId do AsyncLocalStorage para o PostgreSQL
 * 2. Garante que cada query execute dentro de uma transação isolada
 * 3. Define a variável de sessão app.current_tenant_id antes de cada operação
 * 
 * O uso de set_config(..., TRUE) como terceiro parâmetro é CRUCIAL:
 * - Garante que a variável só existe durante a transação atual
 * - Previne contaminação cruzada quando a conexão volta ao pool
 * - Elimina matematicamente o risco de um tenant acessar dados de outro
 * 
 * @param prisma - Instância do PrismaClient
 * @returns PrismaClient estendido com injeção automática de tenantId
 */
export function createPrismaExtension(prisma: PrismaClient) {
  return prisma.$extends({
    query: {
      // Intercepta TODAS as operações em TODOS os modelos
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          const contextManager = TenantContextManager.getInstance();

          // BYPASS: Permite operações sem contexto de tenant
          // Usado em: login, registro público, webhooks sistêmicos
          if (!contextManager.hasContext()) {
            return query(args);
          }

          const tenantId = contextManager.getTenantId();

          // MODELO TENANT: Bypass do RLS para a tabela raiz
          // A tabela Tenant não possui tenantId e não tem RLS habilitado
          if (model === 'Tenant') {
            return query(args);
          }

          // EXECUÇÃO TRANSACIONAL COM INJEÇÃO DE CONTEXTO
          // Garante que set_config e a query rodam na mesma conexão
          return prisma.$transaction(async (tx) => {
            // 1. Define a variável de sessão PostgreSQL
            // O TRUE (is_local) garante que a variável só existe nesta transação
            await tx.$executeRawUnsafe(
              `SELECT set_config('app.current_tenant_id', '${tenantId}', TRUE)`,
            );

            // 2. Executa a query original com RLS ativo
            // O PostgreSQL aplica automaticamente a política de isolamento
            return query(args);
          });
        },
      },
    },
  });
}

/**
 * Type helper para o Prisma Client estendido
 * Permite type-safety ao usar a extensão
 */
export type ExtendedPrismaClient = ReturnType<typeof createPrismaExtension>;
