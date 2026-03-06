import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventLocationDto } from './dto/create-event-location.dto';

/**
 * EventLocationService
 *
 * tenant_id is NOT passed to Prisma calls – the RLS extension handles isolation.
 */
@Injectable()
export class EventLocationService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateEventLocationDto) {
    return this.prisma.client.eventLocation.create({
      data: {
        name: dto.name,
        type: dto.type,
        capacity: dto.capacity,
        transport_multiplier: dto.transport_multiplier.toDecimalPlaces(4),
      },
    });
  }

  findAll() {
    return this.prisma.client.eventLocation.findMany();
  }

  findOne(id: string) {
    return this.prisma.client.eventLocation.findUniqueOrThrow({ where: { id } });
  }

  remove(id: string) {
    return this.prisma.client.eventLocation.delete({ where: { id } });
  }
}
