import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters?: { spaceId?: number; eventDate?: Date; status?: string }) {
    return this.prisma.client.reservation.findMany({
      where: {
        ...(filters?.spaceId && { spaceId: filters.spaceId }),
        ...(filters?.eventDate && { eventDate: filters.eventDate }),
        ...(filters?.status && { status: filters.status as any }),
      },
      include: {
        space: true,
        budget: { select: { id: true, budgetCode: true, guestCount: true } },
      },
      orderBy: { eventDate: 'asc' },
    });
  }

  async findOne(id: number) {
    const reservation = await this.prisma.client.reservation.findFirst({
      where: { id },
      include: {
        space: true,
        budget: { select: { id: true, budgetCode: true, guestCount: true } },
      },
    });
    if (!reservation) throw new NotFoundException(`Reserva com ID ${id} não encontrada`);
    return reservation;
  }
}
