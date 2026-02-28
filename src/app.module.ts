import { Module, MiddlewareConsumer, NestModule, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE, APP_FILTER } from '@nestjs/core';
import { BudgetModule } from './modules/budgets/budget.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { SpacesModule } from './modules/spaces/spaces.module';
import { EventCatalogsModule } from './modules/event-catalogs/event-catalogs.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { PrismaService } from './common/prisma.service';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    TenantsModule,
    UsersModule,
    SpacesModule,
    EventCatalogsModule,
    CustomersModule,
    BudgetModule,
    ReservationsModule,
  ],
  providers: [
    PrismaService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
