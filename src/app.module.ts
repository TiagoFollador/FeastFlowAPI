import { Module, MiddlewareConsumer, NestModule, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE, APP_FILTER } from '@nestjs/core';
import { BudgetModule } from './modules/budgets/budget.module';
import { PrismaService } from './common/prisma.service';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * Módulo raiz da aplicação FeastFlow
 * 
 * Configurações globais:
 * - Middleware de contexto multi-tenant
 * - Validação automática de DTOs
 * - Tratamento global de exceções
 * - RLS ativo em todas as operações de banco
 */
@Module({
  imports: [
    // Configuração de variáveis de ambiente
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Módulos de negócio
    BudgetModule,
  ],
  providers: [
    PrismaService,
    
    // Validação automática de todos os DTOs
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true, // Remove propriedades não declaradas no DTO
        forbidNonWhitelisted: true, // Lança erro se propriedades extras forem enviadas
        transform: true, // Transforma payloads para instâncias de DTO
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    },

    // Filtro global de exceções
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  /**
   * Configura middlewares globais
   * TenantContextMiddleware injeta tenantId em todas as requisições autenticadas
   */
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
