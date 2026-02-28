import { IsString, IsInt, IsOptional, IsBoolean, IsPositive } from 'class-validator';
import Decimal from 'decimal.js';
import { ToDecimal } from '@/common/decorators/to-decimal.decorator';

export class CreateSpaceDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @IsPositive()
  capacity: number;

  @ToDecimal()
  @IsPositive({ message: 'basePrice must be greater than zero' })
  basePrice: Decimal;
}

export class UpdateSpaceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  capacity?: number;

  @IsOptional()
  @ToDecimal()
  basePrice?: Decimal;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
