import { Module } from '@nestjs/common';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { PrismaService } from '@/common/prisma.service';
import { TenantContextManager } from '@/common/tenant-context.manager';

@Module({
  controllers: [BudgetController],
  providers: [
    BudgetService,
    PrismaService,
    {
      provide: TenantContextManager,
      useValue: TenantContextManager.getInstance(),
    },
  ],
  exports: [BudgetService],
})
export class BudgetModule {}
