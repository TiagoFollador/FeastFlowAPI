import { Injectable, NestMiddleware, UnauthorizedException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContextManager } from '@/common/tenant-context.manager';

/**
 * Middleware que extrai tenantId do JWT e injeta no AsyncLocalStorage
 * 
 * ARQUITETURA DE SEGURANÇA:
 * 
 * 1. Extrai token JWT do header Authorization
 * 2. Decodifica e valida o token (simplificado aqui - implementar JWT guard completo)
 * 3. Extrai tenantId e userId do payload
 * 4. Abre contexto do AsyncLocalStorage
 * 5. Propaga automaticamente para toda a cadeia de chamadas assíncronas
 * 
 * O contexto é isolado por requisição HTTP e destruído automaticamente ao final.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);
  private readonly contextManager = TenantContextManager.getInstance();

  use(req: Request, res: Response, next: NextFunction) {
    // Rotas públicas que não requerem autenticação
    const publicPaths = ['/auth/login', '/auth/register', '/health'];
    if (publicPaths.some((path) => req.path.startsWith(path))) {
      return next();
    }

    // Extrai token do header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticação não fornecido');
    }

    const token = authHeader.substring(7);

    try {
      // SIMPLIFICAÇÃO: Em produção, use @nestjs/jwt para validar assinatura
      // Aqui apenas decodificamos o payload (assumindo JWT válido)
      const payload = this.decodeToken(token);

      if (!payload.tenantId) {
        throw new UnauthorizedException('Token inválido: tenantId não encontrado');
      }

      // Abre contexto isolado do AsyncLocalStorage
      this.contextManager.run(
        {
          tenantId: payload.tenantId,
          userId: payload.userId,
          email: payload.email,
        },
        () => {
          next();
        },
      );
    } catch (error) {
      this.logger.error('Erro ao processar token:', error);
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  /**
   * Decodifica JWT (SIMPLIFICADO - usar @nestjs/jwt em produção)
   * 
   * TODO: Implementar validação completa com:
   * - Verificação de assinatura (JWT_SECRET)
   * - Verificação de expiração
   * - Blacklist de tokens revogados
   */
  private decodeToken(token: string): any {
    try {
      // Decodifica apenas o payload (parte do meio do JWT)
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Formato de token inválido');
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Erro ao decodificar token');
    }
  }
}
