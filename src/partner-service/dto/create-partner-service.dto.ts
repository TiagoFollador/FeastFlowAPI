import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsUUID, IsPositive } from 'class-validator';
import Decimal from 'decimal.js';

export class CreatePartnerServiceDto {
  @IsUUID()
  @IsNotEmpty()
  partner_id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * Financial field: JSON string is transformed immediately into a Decimal
   * instance by class-transformer BEFORE the value reaches the service layer.
   * This prevents IEEE-754 floating-point inaccuracy on monetary values.
   */
  @Transform(({ value }) => new Decimal(value))
  @IsNotEmpty()
  base_cost: Decimal;

  @Transform(({ value }) => new Decimal(value))
  @IsNotEmpty()
  markup_margin: Decimal;
}
