import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '@/common/prisma.service';
import { TenantContextManager } from '@/common/tenant-context.manager';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    PrismaService,
    { provide: TenantContextManager, useValue: TenantContextManager.getInstance() },
  ],
  exports: [UsersService],
})
export class UsersModule {}
