import { Injectable, NotFoundException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto, ApproveBudgetDto } from './dto/budget.dto';
import { OptimisticLockError } from './exceptions/optimistic-lock.error';
import { BudgetStatus, EventNature, LocationType } from '@prisma/client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** No-show / contingency factor applied on top of raw staffing cost. */
const NO_SHOW_CONTINGENCY = new Decimal('0.15');

/** ISS tax rate in municipalities with the municipal billing rule (Curitiba / SJP). */
const ISS_MUNICIPAL_RATE = new Decimal('0.02');

/** ISS tax rate for all other scenarios. */
const ISS_DEFAULT_RATE = new Decimal('0.05');

/** Spoilage / breakage multiplier for Out-House logistics. */
const OUT_HOUSE_SPOILAGE = new Decimal('0.11');

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // 1. simulateInHouseBudget
  // ---------------------------------------------------------------------------

  /**
   * Calculates the staffing cost for an In-House event.
   *
   * Formula:
   *   1. For each StaffingRule:  ceil(headcount / guest_ratio) * base_hourly_rate
   *   2. Sum all roles → raw_staff_cost
   *   3. raw_staff_cost * (1 + 0.15)  → with no-show contingency
   *   4. Apply ISS: 2% for Curitiba/SJP municipal events, 5% otherwise
   *   5. final_price = staffing_with_contingency * (1 + iss_rate)
   *
   * @param dto  - budget DTO including guest_count and event_nature
   * @returns    Newly created Budget record
   */
  async simulateInHouseBudget(dto: CreateBudgetDto) {
    // Fetch all staffing rules scoped to the current tenant (RLS does this).
    const staffingRules = await this.prisma.client.staffingRule.findMany();

    // Compute raw staffing cost using Decimal.js throughout.
    let rawStaffCost = new Decimal(0);
    for (const rule of staffingRules) {
      const headCount = new Decimal(dto.guest_count);
      const guestRatio = new Decimal(rule.guest_ratio);
      const hourlyRate = new Decimal(rule.base_hourly_rate.toString());

      // ceil(headcount / guest_ratio) workers * hourly rate
      const staffNeeded = headCount.div(guestRatio).ceil();
      rawStaffCost = rawStaffCost.plus(staffNeeded.mul(hourlyRate));
    }

    // Apply 15% no-show contingency.
    const staffWithContingency = rawStaffCost.mul(
      new Decimal(1).plus(NO_SHOW_CONTINGENCY),
    );

    // Determine ISS rate.
    // Municipal (2%) for Curitiba / São José dos Pinhais private/congress events;
    // default (5%) for trade fairs (Feira) or other municipalities.
    const issRate = dto.event_nature !== EventNature.FEIRA
      ? ISS_MUNICIPAL_RATE
      : ISS_DEFAULT_RATE;

    const finalPrice = staffWithContingency.mul(new Decimal(1).plus(issRate));

    return this.prisma.client.budget.create({
      data: {
        user_id: dto.user_id,
        location_id: dto.location_id,
        event_nature: dto.event_nature,
        guest_count: dto.guest_count,
        total_cost: rawStaffCost.toDecimalPlaces(4),
        final_price: finalPrice.toDecimalPlaces(4),
        status: BudgetStatus.DRAFT,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 2. addPartnerToBudget
  // ---------------------------------------------------------------------------

  /**
   * Adds a PartnerService to an existing Budget using the Cost-Plus Margin model.
   *
   * Formula:
   *   final_row_price = base_cost / (1 - markup_margin)
   *
   * Example: base_cost = 100, markup_margin = 0.20 → final_row_price = 125.00
   *
   * @param budgetId        - target budget UUID
   * @param partnerServiceId - the service to add
   * @returns created BudgetItem record
   */
  async addPartnerToBudget(budgetId: string, partnerServiceId: string) {
    const partnerService = await this.prisma.client.partnerService.findUniqueOrThrow({
      where: { id: partnerServiceId },
    });

    const baseCost = new Decimal(partnerService.base_cost.toString());
    const markupMargin = new Decimal(partnerService.markup_margin.toString());

    // Cost-Plus Margin: price = base_cost / (1 - margin)
    const finalRowPrice = baseCost.div(new Decimal(1).minus(markupMargin));

    return this.prisma.client.budgetItem.create({
      data: {
        budget_id: budgetId,
        item_type: 'PARTNER',
        reference_id: partnerServiceId,
        quantity: 1,
        unit_cost: baseCost.toDecimalPlaces(4),
        applied_markup: markupMargin.toDecimalPlaces(4),
        final_row_price: finalRowPrice.toDecimalPlaces(4),
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 3. applyOutHouseLogistics
  // ---------------------------------------------------------------------------

  /**
   * Adds an Out-House logistics surcharge (spoilage/breakage) of 11% on top of
   * total merchandise value to a budget with an Out-House event location.
   *
   * Throws NotFoundException if the budget location is not OUT_HOUSE.
   *
   * @param budgetId - target budget UUID
   * @returns created BudgetItem surcharge record
   */
  async applyOutHouseLogistics(budgetId: string) {
    const budget = await this.prisma.client.budget.findUniqueOrThrow({
      where: { id: budgetId },
      include: { location: true, items: true },
    });

    if (budget.location.type !== LocationType.OUT_HOUSE) {
      throw new NotFoundException(
        `Budget ${budgetId} location is not OUT_HOUSE; logistics surcharge does not apply.`,
      );
    }

    // Base is only CATERING / PARTNER items (merchandise), not STAFF cost.
    const merchandiseTotal = budget.items
      .filter((i) => i.item_type === 'CATERING' || i.item_type === 'PARTNER')
      .reduce(
        (acc, item) => acc.plus(new Decimal(item.final_row_price.toString())),
        new Decimal(0),
      );

    const surcharge = merchandiseTotal.mul(OUT_HOUSE_SPOILAGE);

    return this.prisma.client.budgetItem.create({
      data: {
        budget_id: budgetId,
        item_type: 'CATERING',
        reference_id: budgetId, // self-reference to identify the surcharge
        quantity: 1,
        unit_cost: merchandiseTotal.toDecimalPlaces(4),
        applied_markup: OUT_HOUSE_SPOILAGE.toDecimalPlaces(4),
        final_row_price: surcharge.toDecimalPlaces(4),
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 4. approveBudget (Optimistic Concurrency Control)
  // ---------------------------------------------------------------------------

  /**
   * Approves a budget using Optimistic Concurrency Control (OCC).
   *
   * The `version_token` supplied by the client must match the current value in
   * the DB. If another request already approved/modified the budget and bumped
   * the version, Prisma's `updateMany` returns count=0 and we throw HTTP 409.
   *
   * On success:
   *   - version_token is incremented atomically.
   *   - status is set to APPROVED.
   *   - An immutable BudgetSnapshot is saved with the full contract as JSON.
   *
   * @param budgetId     - target budget UUID
   * @param dto          - contains the expected version_token
   * @returns created BudgetSnapshot record
   */
  async approveBudget(budgetId: string, dto: ApproveBudgetDto) {
    // Atomic OCC update: only succeeds if both id AND version_token match.
    const { count } = await this.prisma.client.budget.updateMany({
      where: {
        id: budgetId,
        version_token: dto.version_token,
      },
      data: {
        status: BudgetStatus.APPROVED,
        version_token: { increment: 1 },
      },
    });

    if (count === 0) {
      // Either budget doesn't exist or was concurrently modified.
      throw new OptimisticLockError(budgetId);
    }

    // Re-fetch the approved budget with all relations for the immutable snapshot.
    const approvedBudget = await this.prisma.client.budget.findUniqueOrThrow({
      where: { id: budgetId },
      include: {
        user: { select: { id: true, email: true, role: true } },
        location: true,
        items: true,
      },
    });

    // Persist an immutable audit snapshot in JSONB.
    return this.prisma.client.budgetSnapshot.create({
      data: {
        budget_id: budgetId,
        payload: approvedBudget as any,
      },
    });
  }
}
