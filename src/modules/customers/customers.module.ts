import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { PrismaService } from '@/common/prisma.service';
import { TenantContextManager } from '@/common/tenant-context.manager';

@Module({
  controllers: [CustomersController],
  providers: [
    CustomersService,
    PrismaService,
    { provide: TenantContextManager, useValue: TenantContextManager.getInstance() },
  ],
  exports: [CustomersService],
})
export class CustomersModule {}
