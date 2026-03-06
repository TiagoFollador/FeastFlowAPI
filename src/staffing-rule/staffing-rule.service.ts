import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffingRuleDto } from './dto/create-staffing-rule.dto';

/**
 * StaffingRuleService
 *
 * tenant_id is NOT passed to Prisma calls – the RLS extension handles isolation.
 */
@Injectable()
export class StaffingRuleService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateStaffingRuleDto) {
    return this.prisma.client.staffingRule.create({
      data: {
        role: dto.role,
        guest_ratio: dto.guest_ratio,
        base_hourly_rate: dto.base_hourly_rate.toDecimalPlaces(4),
      },
    });
  }

  findAll() {
    return this.prisma.client.staffingRule.findMany();
  }

  findOne(id: string) {
    return this.prisma.client.staffingRule.findUniqueOrThrow({ where: { id } });
  }

  remove(id: string) {
    return this.prisma.client.staffingRule.delete({ where: { id } });
  }
}
