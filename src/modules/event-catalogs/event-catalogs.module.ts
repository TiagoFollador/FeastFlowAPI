import { Module } from '@nestjs/common';
import { EventCatalogsController } from './event-catalogs.controller';
import { EventCatalogsService } from './event-catalogs.service';
import { PrismaService } from '@/common/prisma.service';
import { TenantContextManager } from '@/common/tenant-context.manager';

@Module({
  controllers: [EventCatalogsController],
  providers: [
    EventCatalogsService,
    PrismaService,
    { provide: TenantContextManager, useValue: TenantContextManager.getInstance() },
  ],
  exports: [EventCatalogsService],
})
export class EventCatalogsModule {}
