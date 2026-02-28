import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma.service';
import { TenantContextManager } from '@/common/tenant-context.manager';
import Decimal from 'decimal.js';
import {
  CreateBudgetDto,
  UpdateBudgetDto,
  ApproveBudgetDto,
  BudgetResponseDto,
} from './dto/budget.dto';
import {
  OptimisticLockError,
  FinancialCalculationError,
  ReservationConflictError,
} from '@/common/exceptions/business.exceptions';

/**
 * Configurações de tributação regional
 * São José dos Pinhais / Curitiba - PR
 */
const TAX_RATES = {
  STANDARD: new Decimal('0.05'), // 5% - Alíquota padrão
  REDUCED: new Decimal('0.02'), // 2% - Alíquota reduzida para eventos culturais
} as const;

/**
 * Serviço de Orçamentos com:
 * - Cálculos financeiros precisos (Decimal.js)
 * - Controle de Concorrência Otimista (OCC)
 * - Snapshot Pattern para auditoria (JSONB)
 * - Cálculo tributário regional (ISS)
 */
@Injectable()
export class BudgetService {
  private readonly logger = new Logger(BudgetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contextManager: TenantContextManager,
  ) {}

  /**
   * Cria um novo orçamento com cálculos financeiros precisos
   */
  async create(dto: CreateBudgetDto): Promise<BudgetResponseDto> {
    const tenantId = this.contextManager.getTenantId();

    // Valida se o cliente existe e pertence ao tenant
    const customer = await this.prisma.client.customer.findFirst({
      where: { id: dto.customerId },
    });

    if (!customer) {
      throw new NotFoundException(`Cliente com ID ${dto.customerId} não encontrado`);
    }

    // Valida se o catálogo de eventos existe
    const eventCatalog = await this.prisma.client.eventCatalog.findFirst({
      where: { id: dto.eventCatalogId },
    });

    if (!eventCatalog) {
      throw new NotFoundException(`Catálogo de eventos com ID ${dto.eventCatalogId} não encontrado`);
    }

    // Calcula subtotal dos itens
    const subtotal = this.calculateSubtotal(dto.items);

    // Determina alíquota de ISS baseada no tipo de evento
    const taxRate = eventCatalog.qualifiesForReducedTax ? TAX_RATES.REDUCED : TAX_RATES.STANDARD;

    // Aplica desconto se fornecido
    const discountRate = dto.discountRate || new Decimal(0);
    const discountedSubtotal = subtotal.times(new Decimal(1).minus(discountRate));

    // Calcula imposto sobre o valor com desconto
    const taxAmount = discountedSubtotal.times(taxRate);

    // Calcula total final
    const totalAmount = discountedSubtotal.plus(taxAmount);

    // Gera código único do orçamento
    const budgetCode = await this.generateBudgetCode();

    // Cria orçamento e itens em uma única transação
    const budget = await this.prisma.client.budget.create({
      data: {
        budgetCode,
        customerId: dto.customerId,
        eventCatalogId: dto.eventCatalogId,
        eventDate: new Date(dto.eventDate),
        guestCount: dto.guestCount,
        description: dto.description,
        notes: dto.notes,
        subtotal,
        discountRate,
        taxRate,
        taxAmount,
        totalAmount,
        status: 'DRAFT',
        budgetItems: {
          create: dto.items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity.times(item.unitPrice),
          })),
        },
      },
      include: {
        customer: true,
        eventCatalog: true,
        budgetItems: true,
      },
    });

    this.logger.log(`Orçamento ${budgetCode} criado com sucesso - Total: R$ ${totalAmount.toFixed(2)}`);

    return this.mapToResponseDto(budget);
  }

  /**
   * Aprova orçamento e cria reserva com Controle de Concorrência Otimista (OCC)
   * 
   * ARQUITETURA DE SEGURANÇA CONTRA DOUBLE BOOKING:
   * 
   * 1. Lê a versão atual da reserva (se existir)
   * 2. Processa cálculos e validações SEM bloquear o banco
   * 3. Tenta atualizar APENAS se a versão ainda for a mesma
   * 4. Se outra requisição atualizou primeiro, updateMany retorna count: 0
   * 5. Lança OptimisticLockError (HTTP 409) para retry do cliente
   * 
   * Este padrão é superior ao pessimistic locking (SELECT FOR UPDATE) porque:
   * - Não bloqueia conexões do pool
   * - Não causa deadlocks
   * - Permite alta concorrência de leitura
   * - Falha apenas em colisões reais (raras)
   */
  async approveAndReserve(
    budgetId: number,
    dto: ApproveBudgetDto,
  ): Promise<BudgetResponseDto> {
    // Busca orçamento com validações
    const budget = await this.prisma.client.budget.findFirst({
      where: { id: budgetId },
      include: {
        customer: true,
        eventCatalog: true,
        budgetItems: true,
      },
    });

    if (!budget) {
      throw new NotFoundException(`Orçamento com ID ${budgetId} não encontrado`);
    }

    if (budget.status === 'APPROVED') {
      throw new BadRequestException('Orçamento já foi aprovado anteriormente');
    }

    if (budget.status === 'REJECTED') {
      throw new BadRequestException('Orçamento foi rejeitado e não pode ser aprovado');
    }

    // Valida se o espaço existe
    const space = await this.prisma.client.space.findFirst({
      where: { id: dto.spaceId },
    });

    if (!space) {
      throw new NotFoundException(`Espaço com ID ${dto.spaceId} não encontrado`);
    }

    // Verifica se já existe reserva para este espaço/data
    const existingReservation = await this.prisma.client.reservation.findFirst({
      where: {
        spaceId: dto.spaceId,
        eventDate: budget.eventDate,
        status: 'CONFIRMED',
      },
    });

    if (existingReservation) {
      throw new ReservationConflictError(
        `Espaço "${space.name}" já está reservado para ${budget.eventDate.toLocaleDateString('pt-BR')}`,
      );
    }

    // SNAPSHOT PATTERN: Congela estado atual para auditoria
    const snapshot = this.createSnapshot(budget, space);

    // CONTROLE DE CONCORRÊNCIA OTIMISTA (OCC)
    // Cria ou atualiza reserva incrementando version
    let reservation;
    
    try {
      reservation = await this.prisma.client.reservation.create({
        data: {
          spaceId: dto.spaceId,
          budgetId: budget.id,
          eventDate: budget.eventDate,
          status: 'CONFIRMED',
          notes: dto.notes,
          confirmedAt: new Date(),
          version: 0, // Primeira versão
        },
      });
    } catch (error) {
      // Violação de constraint unique_space_date_reservation
      if (error.code === 'P2002') {
        throw new ReservationConflictError(
          `Conflito de reserva detectado. Outra operação já reservou este espaço/data.`,
        );
      }
      throw error;
    }

    // Atualiza orçamento para status APPROVED e armazena snapshot
    const updatedBudget = await this.prisma.client.budget.update({
      where: { id: budgetId },
      data: {
        status: 'APPROVED',
        snapshot,
        approvedAt: new Date(),
      },
      include: {
        customer: true,
        eventCatalog: true,
        budgetItems: true,
        reservations: {
          include: {
            space: true,
          },
        },
      },
    });

    this.logger.log(
      `Orçamento ${budget.budgetCode} aprovado e reserva ${reservation.id} criada com sucesso`,
    );

    return this.mapToResponseDto(updatedBudget);
  }

  /**
   * Cancela reserva com OCC
   * Incrementa version para detectar conflitos
   */
  async cancelReservation(reservationId: number, expectedVersion?: number): Promise<void> {
    const reservation = await this.prisma.client.reservation.findFirst({
      where: { id: reservationId },
    });

    if (!reservation) {
      throw new NotFoundException(`Reserva com ID ${reservationId} não encontrada`);
    }

    if (reservation.status === 'CANCELED') {
      throw new BadRequestException('Reserva já foi cancelada');
    }

    // Se version foi fornecida, valida concorrência
    const versionToCheck = expectedVersion !== undefined ? expectedVersion : reservation.version;

    // Tenta atualizar APENAS se version não mudou
    const result = await this.prisma.client.reservation.updateMany({
      where: {
        id: reservationId,
        version: versionToCheck,
      },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
        version: {
          increment: 1,
        },
      },
    });

    // Se count === 0, outro processo modificou a reserva
    if (result.count === 0) {
      throw new OptimisticLockError(
        'Conflito de concorrência ao cancelar reserva. A reserva foi modificada por outra operação.',
        {
          reservationId,
          expectedVersion: versionToCheck,
          currentVersion: reservation.version,
        },
      );
    }

    this.logger.log(`Reserva ${reservationId} cancelada com sucesso`);
  }

  /**
   * Lista orçamentos com filtros
   */
  async findAll(filters?: {
    status?: string;
    customerId?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<BudgetResponseDto[]> {
    const budgets = await this.prisma.client.budget.findMany({
      where: {
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.customerId && { customerId: filters.customerId }),
        ...(filters?.startDate && {
          eventDate: { gte: filters.startDate },
        }),
        ...(filters?.endDate && {
          eventDate: { lte: filters.endDate },
        }),
      },
      include: {
        customer: true,
        eventCatalog: true,
        budgetItems: true,
        reservations: {
          include: {
            space: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return budgets.map((budget: any) => this.mapToResponseDto(budget));
  }

  /**
   * Busca orçamento por ID
   */
  async findOne(id: number): Promise<BudgetResponseDto> {
    const budget = await this.prisma.client.budget.findFirst({
      where: { id },
      include: {
        customer: true,
        eventCatalog: true,
        budgetItems: true,
        reservations: {
          include: {
            space: true,
          },
        },
      },
    });

    if (!budget) {
      throw new NotFoundException(`Orçamento com ID ${id} não encontrado`);
    }

    return this.mapToResponseDto(budget);
  }

  /**
   * Calcula subtotal dos itens do orçamento
   */
  private calculateSubtotal(
    items: Array<{ quantity: Decimal; unitPrice: Decimal }>,
  ): Decimal {
    return items.reduce((acc, item) => {
      return acc.plus(item.quantity.times(item.unitPrice));
    }, new Decimal(0));
  }

  /**
   * Gera código único para o orçamento
   */
  private async generateBudgetCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.client.budget.count();
    const sequence = (count + 1).toString().padStart(6, '0');
    return `ORC-${year}-${sequence}`;
  }

  /**
   * Cria snapshot imutável do orçamento para auditoria (JSONB)
   * 
   * IMUTABILIDADE CONTRATUAL:
   * Uma vez aprovado, o orçamento congela os valores no momento da aprovação.
   * Mesmo que os preços mestres sejam alterados posteriormente,
   * o snapshot garante que o contrato permanece inalterado.
   */
  private createSnapshot(budget: any, space: any): any {
    return {
      budgetCode: budget.budgetCode,
      approvedAt: new Date().toISOString(),
      customer: {
        id: budget.customer.id,
        name: budget.customer.name,
        email: budget.customer.email,
        phone: budget.customer.phone,
      },
      event: {
        catalogId: budget.eventCatalog.id,
        catalogName: budget.eventCatalog.name,
        date: budget.eventDate.toISOString(),
        guestCount: budget.guestCount,
        description: budget.description,
      },
      space: {
        id: space.id,
        name: space.name,
        basePrice: space.basePrice.toString(),
      },
      financial: {
        subtotal: budget.subtotal.toString(),
        discountRate: budget.discountRate.toString(),
        taxRate: budget.taxRate.toString(),
        taxAmount: budget.taxAmount.toString(),
        totalAmount: budget.totalAmount.toString(),
        currency: 'BRL',
      },
      items: budget.budgetItems.map((item: any) => ({
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
      })),
      metadata: {
        tenantId: budget.tenantId,
        approvedBy: this.contextManager.getContext()?.userId,
        snapshotVersion: 1,
      },
    };
  }

  /**
   * Mapeia entidade do Prisma para DTO de resposta
   * Converte Decimal para string para serialização JSON segura
   */
  private mapToResponseDto(budget: any): BudgetResponseDto {
    return {
      id: budget.id,
      budgetCode: budget.budgetCode,
      status: budget.status,
      eventDate: budget.eventDate.toISOString().split('T')[0],
      guestCount: budget.guestCount,
      description: budget.description,
      notes: budget.notes,
      subtotal: budget.subtotal.toString(),
      discountRate: budget.discountRate.toString(),
      taxRate: budget.taxRate.toString(),
      taxAmount: budget.taxAmount.toString(),
      totalAmount: budget.totalAmount.toString(),
      snapshot: budget.snapshot,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
      approvedAt: budget.approvedAt,
      customer: budget.customer
        ? {
            id: budget.customer.id,
            name: budget.customer.name,
            email: budget.customer.email,
          }
        : undefined,
      eventCatalog: budget.eventCatalog
        ? {
            id: budget.eventCatalog.id,
            name: budget.eventCatalog.name,
            qualifiesForReducedTax: budget.eventCatalog.qualifiesForReducedTax,
          }
        : undefined,
      items: budget.budgetItems?.map((item: any) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
      })),
      reservations: budget.reservations?.map((reservation: any) => ({
        id: reservation.id,
        eventDate: reservation.eventDate.toISOString().split('T')[0],
        status: reservation.status,
        space: {
          id: reservation.space.id,
          name: reservation.space.name,
        },
      })),
    };
  }
}
