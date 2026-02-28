import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { CreateEventCatalogDto, UpdateEventCatalogDto } from './dto/event-catalog.dto';

@Injectable()
export class EventCatalogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEventCatalogDto) {
    return this.prisma.client.eventCatalog.create({ data: dto });
  }

  async findAll() {
    return this.prisma.client.eventCatalog.findMany({ where: { isActive: true } });
  }

  async findOne(id: number) {
    const catalog = await this.prisma.client.eventCatalog.findFirst({ where: { id } });
    if (!catalog) throw new NotFoundException(`Catálogo de eventos com ID ${id} não encontrado`);
    return catalog;
  }

  async update(id: number, dto: UpdateEventCatalogDto) {
    await this.findOne(id);
    await this.prisma.client.eventCatalog.updateMany({ where: { id }, data: dto });
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.client.eventCatalog.updateMany({ where: { id }, data: { isActive: false } });
  }
}
