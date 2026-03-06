import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService with Row-Level Security Extension.
 *
 * Architecture:
 * - A single base PrismaClient manages the physical connection pool via the
 *   @prisma/adapter-pg Driver Adapter (required by Prisma 7 for direct connections).
 * - Every call to `this.client` returns an extended proxy that intercepts
 *   ALL operations ($allModels / $allOperations).
 * - The extension reads the current tenantId from nestjs-cls and wraps the
 *   original Prisma operation inside a $transaction that first executes
 *   `SELECT set_config(...)`, pinning the session variable to the PG
 *   connection used by that transaction. PostgreSQL's RLS then transparently
 *   filters rows on every operation without a single explicit WHERE clause.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;
  private readonly base: PrismaClient;

  constructor(
    private readonly cls: ClsService,
    private readonly config: ConfigService,
  ) {
    this.pool = new Pool({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
    });
    const adapter = new PrismaPg(this.pool);
    this.base = new PrismaClient({ adapter });
  }

  /** Returns the Prisma client proxied with the RLS tenant extension. */
  get client() {
    const clsService = this.cls;
    const base = this.base;

    return base.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            const tenantId = clsService.get<string>('tenantId');

            // If no tenant context exists (e.g. admin bootstrap), run directly.
            if (!tenantId) {
              return query(args);
            }

            // Batch transaction: SET session config + original query run in the
            // same physical connection so that PostgreSQL RLS can read the variable.
            const [, result] = await base.$transaction([
              base.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, TRUE)`,
              query(args) as any,
            ]);

            return result;
          },
        },
      },
    });
  }

  async onModuleInit() {
    await this.base.$connect();
  }

  async onModuleDestroy() {
    await this.base.$disconnect();
    await this.pool.end();
  }
}
