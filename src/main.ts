import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

/**
 * Bootstrap da aplicação FeastFlow B2B SaaS
 * 
 * Plataforma de gestão de orçamentos e reservas para salões de festas
 * Arquitetura Multi-Tenant com Row Level Security (RLS)
 * Região: São José dos Pinhais / Curitiba - PR
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // CORS para frontend (ajustar origins em produção)
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
    credentials: true,
  });

  // Prefixo global da API
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log('========================================');
  logger.log('🚀 FeastFlow API iniciada com sucesso!');
  logger.log(`📡 Servidor rodando em: http://localhost:${port}`);
  logger.log(`🔒 Row Level Security (RLS): ATIVO`);
  logger.log(`🏢 Multi-Tenancy: HABILITADO`);
  logger.log(`💰 Precisão Decimal: Decimal.js`);
  logger.log(`🔄 Concorrência: Otimista (OCC)`);
  logger.log(`📋 Auditoria: Snapshot JSONB`);
  logger.log(`🏛️  Tributação: ISS 2%/5% (SJP/Curitiba)`);
  logger.log('========================================');
}

bootstrap();
