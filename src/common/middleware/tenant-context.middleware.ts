import { Injectable, NestMiddleware, UnauthorizedException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContextManager } from '@/common/tenant-context.manager';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);
  private readonly contextManager = TenantContextManager.getInstance();

  use(req: Request, res: Response, next: NextFunction) {
    // Public paths that don't require authentication
    const publicPaths = ['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/tenants', '/health'];
    if (publicPaths.some((path) => req.path === path || req.path.startsWith(path + '/'))) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticação não fornecido');
    }

    const token = authHeader.substring(7);

    try {
      const payload = this.verifyToken(token, req);

      if (!payload.tenantId) {
        throw new UnauthorizedException('Token inválido: tenantId não encontrado');
      }

      this.contextManager.run(
        {
          tenantId: payload.tenantId,
          userId: payload.userId || payload.sub,
          email: payload.email,
        },
        () => {
          next();
        },
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Erro ao processar token:', error);
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  private verifyToken(token: string, req: Request): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Formato de token inválido');
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

      // Check expiration
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        throw new UnauthorizedException('Token expirado');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Erro ao decodificar token');
    }
  }
}
