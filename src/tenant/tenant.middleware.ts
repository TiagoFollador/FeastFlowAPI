import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ClsService } from 'nestjs-cls';

/**
 * TenantMiddleware
 *
 * Extracts the current tenant's UUID from the `x-tenant-id` request header
 * and stores it in the AsyncLocalStorage (nestjs-cls) context under the key
 * `tenantId`. The PrismaService reads this value on every DB operation to
 * set `app.current_tenant_id` for PostgreSQL's Row-Level Security.
 *
 * In production this would decode a JWT claim instead of a plain header.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string | undefined;

    if (!tenantId) {
      throw new UnauthorizedException('Missing x-tenant-id header');
    }

    // Basic UUID format guard to prevent injection through the session variable.
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      throw new UnauthorizedException('Invalid tenant identifier format');
    }

    this.cls.set('tenantId', tenantId);
    next();
  }
}
