import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClsModule } from 'nestjs-cls';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TenantMiddleware } from './tenant/tenant.middleware';
import { PartnerServiceModule } from './partner-service/partner-service.module';
import { StaffingRuleModule } from './staffing-rule/staffing-rule.module';
import { EventLocationModule } from './event-location/event-location.module';
import { BudgetModule } from './budget/budget.module';

@Module({
  imports: [
    // Make environment variables available throughout the app.
    ConfigModule.forRoot({ isGlobal: true }),

    // AsyncLocalStorage – registers the CLS context for every incoming request.
    // The `middleware` option ensures the store is initialised automatically on
    // each HTTP request so nestjs-cls is ready before any guard/service runs.
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),

    PrismaModule,
    PartnerServiceModule,
    StaffingRuleModule,
    EventLocationModule,
    BudgetModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply the tenant extraction middleware to every route.
    consumer
      .apply(TenantMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
