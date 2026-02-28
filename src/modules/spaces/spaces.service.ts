import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { CreateSpaceDto, UpdateSpaceDto } from './dto/space.dto';

@Injectable()
export class SpacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSpaceDto) {
    return this.prisma.client.space.create({ data: { ...dto } });
  }

  async findAll() {
    return this.prisma.client.space.findMany({ where: { isActive: true } });
  }

  async findOne(id: number) {
    const space = await this.prisma.client.space.findFirst({ where: { id } });
    if (!space) throw new NotFoundException(`Espaço com ID ${id} não encontrado`);
    return space;
  }

  async update(id: number, dto: UpdateSpaceDto) {
    await this.findOne(id);
    await this.prisma.client.space.updateMany({ where: { id }, data: { ...dto } });
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.client.space.updateMany({ where: { id }, data: { isActive: false } });
  }
}
