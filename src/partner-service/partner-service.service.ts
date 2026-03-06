import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnerServiceDto } from './dto/create-partner-service.dto';

/**
 * PartnerServiceService
 *
 * Note: tenant_id is intentionally absent from all Prisma calls.
 * The PrismaService extension injects it via `set_config` and PostgreSQL's
 * Row-Level Security policy enforces isolation transparently.
 */
@Injectable()
export class PartnerServiceService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePartnerServiceDto) {
    return this.prisma.client.partnerService.create({
      data: {
        partner_id: dto.partner_id,
        name: dto.name,
        base_cost: dto.base_cost.toDecimalPlaces(4),
        markup_margin: dto.markup_margin.toDecimalPlaces(4),
      },
    });
  }

  findAll() {
    return this.prisma.client.partnerService.findMany();
  }

  findOne(id: string) {
    return this.prisma.client.partnerService.findUniqueOrThrow({
      where: { id },
    });
  }

  remove(id: string) {
    return this.prisma.client.partnerService.delete({ where: { id } });
  }
}
