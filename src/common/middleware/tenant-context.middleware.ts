import { Injectable, NestMiddleware, UnauthorizedException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TenantContextManager } from '@/common/tenant-context.manager';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);
  private readonly contextManager = TenantContextManager.getInstance();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

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
      const secret = this.configService.get<string>('JWT_SECRET', 'default-secret-change-in-production');
      const payload = this.jwtService.verify(token, { secret });

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
}
