import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import Decimal from 'decimal.js';
import { LocationType } from '@prisma/client';

export class CreateEventLocationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(LocationType)
  type: LocationType;

  @IsInt()
  @Min(1)
  capacity: number;

  /**
   * Financial multiplier transformed immediately from JSON string to Decimal
   * instance to avoid IEEE-754 floating-point inaccuracy.
   */
  @Transform(({ value }) => new Decimal(value))
  @IsNotEmpty()
  transport_multiplier: Decimal;
}
