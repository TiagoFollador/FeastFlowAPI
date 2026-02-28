import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BudgetService } from './budget.service';
import {
  CreateBudgetDto,
  UpdateBudgetDto,
  ApproveBudgetDto,
  BudgetResponseDto,
} from './dto/budget.dto';

/**
 * Controller de Orçamentos
 * 
 * Expõe endpoints REST para gestão de orçamentos e reservas
 * Todos os endpoints são protegidos por autenticação (implementar guards)
 */
@Controller('budgets')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  /**
   * POST /budgets
   * Cria novo orçamento
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBudgetDto): Promise<BudgetResponseDto> {
    return this.budgetService.create(dto);
  }

  /**
   * GET /budgets
   * Lista orçamentos com filtros opcionais
   */
  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('customerId', new ParseIntPipe({ optional: true })) customerId?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<BudgetResponseDto[]> {
    return this.budgetService.findAll({
      status,
      customerId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  /**
   * GET /budgets/:id
   * Busca orçamento por ID
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<BudgetResponseDto> {
    return this.budgetService.findOne(id);
  }

  /**
   * POST /budgets/:id/approve
   * Aprova orçamento e cria reserva (com OCC)
   */
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approveAndReserve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveBudgetDto,
  ): Promise<BudgetResponseDto> {
    return this.budgetService.approveAndReserve(id, dto);
  }

  /**
   * POST /budgets/reservations/:id/cancel
   * Cancela reserva (com OCC)
   */
  @Post('reservations/:id/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelReservation(
    @Param('id', ParseIntPipe) id: number,
    @Query('version', new ParseIntPipe({ optional: true })) version?: number,
  ): Promise<void> {
    return this.budgetService.cancelReservation(id, version);
  }
}
