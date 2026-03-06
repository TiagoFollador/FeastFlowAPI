import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { BudgetService } from './budget.service';
import { ApproveBudgetDto, CreateBudgetDto } from './dto/budget.dto';

@Controller('budgets')
export class BudgetController {
  constructor(private readonly service: BudgetService) {}

  /** Simulate and create an In-House staffing budget. */
  @Post('simulate/in-house')
  simulateInHouse(@Body() dto: CreateBudgetDto) {
    return this.service.simulateInHouseBudget(dto);
  }

  /** Add a partner service to a budget (Cost-Plus Margin model). */
  @Post(':budgetId/partners/:partnerServiceId')
  addPartner(
    @Param('budgetId', ParseUUIDPipe) budgetId: string,
    @Param('partnerServiceId', ParseUUIDPipe) partnerServiceId: string,
  ) {
    return this.service.addPartnerToBudget(budgetId, partnerServiceId);
  }

  /** Apply Out-House logistics spoilage surcharge (11%). */
  @Post(':budgetId/out-house-logistics')
  applyOutHouseLogistics(@Param('budgetId', ParseUUIDPipe) budgetId: string) {
    return this.service.applyOutHouseLogistics(budgetId);
  }

  /** Approve a budget using Optimistic Concurrency Control. */
  @Post(':budgetId/approve')
  approve(
    @Param('budgetId', ParseUUIDPipe) budgetId: string,
    @Body() dto: ApproveBudgetDto,
  ) {
    return this.service.approveBudget(budgetId, dto);
  }
}
