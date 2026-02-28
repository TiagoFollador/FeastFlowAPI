import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { PrismaService } from '@/common/prisma.service';
import { TenantContextManager } from '@/common/tenant-context.manager';

@Module({
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    PrismaService,
    { provide: TenantContextManager, useValue: TenantContextManager.getInstance() },
  ],
  exports: [ReservationsService],
})
export class ReservationsModule {}
