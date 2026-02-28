import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.client.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        role: dto.role,
      },
    });
    return this.mapToResponse(user);
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.client.user.findMany({
      where: { isActive: true },
    });
    return users.map(this.mapToResponse);
  }

  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.prisma.client.user.findFirst({ where: { id } });
    if (!user) throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    return this.mapToResponse(user);
  }

  async update(id: number, dto: UpdateUserDto): Promise<UserResponseDto> {
    await this.findOne(id);
    await this.prisma.client.user.updateMany({
      where: { id },
      data: { ...dto },
    });
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.findOne(id);
    await this.prisma.client.user.updateMany({
      where: { id },
      data: { isActive: false },
    });
  }

  private mapToResponse(user: any): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      tenantId: user.tenantId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
