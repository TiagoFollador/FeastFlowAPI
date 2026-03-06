import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, IsInt, Min } from 'class-validator';
import Decimal from 'decimal.js';

export class CreateStaffingRuleDto {
  /** Job role label, e.g. "Garçom", "Busser". */
  @IsString()
  @IsNotEmpty()
  role: string;

  /** Number of guests one staff member of this role serves. */
  @IsInt()
  @Min(1)
  guest_ratio: number;

  /**
   * Financial field transformed from JSON string to Decimal instance
   * at deserialization time to avoid IEEE-754 floating-point issues.
   */
  @Transform(({ value }) => new Decimal(value))
  @IsNotEmpty()
  base_hourly_rate: Decimal;
}
