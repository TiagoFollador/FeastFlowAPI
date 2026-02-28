import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateEventCatalogDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  qualifiesForReducedTax?: boolean;
}

export class UpdateEventCatalogDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  qualifiesForReducedTax?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
