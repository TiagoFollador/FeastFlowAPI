import { Module } from '@nestjs/common';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';
import { PrismaService } from '@/common/prisma.service';
import { TenantContextManager } from '@/common/tenant-context.manager';

@Module({
  controllers: [SpacesController],
  providers: [
    SpacesService,
    PrismaService,
    { provide: TenantContextManager, useValue: TenantContextManager.getInstance() },
  ],
  exports: [SpacesService],
})
export class SpacesModule {}
