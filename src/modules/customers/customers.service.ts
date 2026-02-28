import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto) {
    return this.prisma.client.customer.create({ data: dto });
  }

  async findAll() {
    return this.prisma.client.customer.findMany({ where: { isActive: true } });
  }

  async findOne(id: number) {
    const customer = await this.prisma.client.customer.findFirst({ where: { id } });
    if (!customer) throw new NotFoundException(`Cliente com ID ${id} não encontrado`);
    return customer;
  }

  async update(id: number, dto: UpdateCustomerDto) {
    await this.findOne(id);
    await this.prisma.client.customer.updateMany({ where: { id }, data: dto });
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.client.customer.updateMany({ where: { id }, data: { isActive: false } });
  }
}
