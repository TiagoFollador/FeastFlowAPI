import {
  IsString,
  IsInt,
  IsDateString,
  IsOptional,
  IsPositive,
  Min,
  Max,
  IsEnum,
  IsBoolean,
  ValidateNested,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import Decimal from 'decimal.js';
import { ToDecimal } from '@/common/decorators/to-decimal.decorator';

/**
 * DTO para criação de item de orçamento
 */
export class CreateBudgetItemDto {
  @IsString()
  description: string;

  @ToDecimal()
  @IsPositive({ message: 'Quantidade deve ser maior que zero' })
  quantity: Decimal;

  @ToDecimal()
  @IsPositive({ message: 'Preço unitário deve ser maior que zero' })
  unitPrice: Decimal;
}

/**
 * DTO para criação de orçamento
 * 
 * VALIDAÇÃO FINANCEIRA CRÍTICA:
 * - Todos os campos monetários são transformados em Decimal.js
 * - Valida tipos, ranges e obrigatoriedade
 * - Previne injeção de valores float inseguros
 */
export class CreateBudgetDto {
  @IsInt()
  @IsPositive()
  customerId: number;

  @IsInt()
  @IsPositive()
  eventCatalogId: number;

  @IsDateString()
  eventDate: string;

  @IsInt()
  @Min(1, { message: 'Número de convidados deve ser pelo menos 1' })
  @Max(10000, { message: 'Número de convidados não pode exceder 10.000' })
  guestCount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Orçamento deve conter pelo menos um item' })
  @ValidateNested({ each: true })
  @Type(() => CreateBudgetItemDto)
  items: CreateBudgetItemDto[];

  @IsOptional()
  @ToDecimal()
  @Min(0)
  @Max(1)
  discountRate?: Decimal; // Ex: 0.10 para 10% de desconto
}

/**
 * DTO para atualização de orçamento
 */
export class UpdateBudgetDto {
  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  guestCount?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @ToDecimal()
  @Min(0)
  @Max(1)
  discountRate?: Decimal;
}

/**
 * DTO para aprovação e reserva de orçamento
 * Contém informações necessárias para efetivar a reserva com OCC
 */
export class ApproveBudgetDto {
  @IsInt()
  @IsPositive()
  spaceId: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  expectedVersion?: number; // Para controle de concorrência otimista
}

/**
 * Response DTO com valores Decimal serializados
 * Os valores Decimal devem ser convertidos para string antes do envio JSON
 */
export class BudgetResponseDto {
  id: number;
  budgetCode: string;
  status: string;
  eventDate: string;
  guestCount: number;
  description?: string;
  notes?: string;

  // Valores financeiros serializados como string para precisão
  subtotal: string;
  discountRate: string;
  taxRate: string;
  taxAmount: string;
  totalAmount: string;

  snapshot?: any;
  
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;

  customer?: {
    id: number;
    name: string;
    email: string;
  };

  eventCatalog?: {
    id: number;
    name: string;
    qualifiesForReducedTax: boolean;
  };

  items?: Array<{
    id: number;
    description: string;
    quantity: string;
    unitPrice: string;
    totalPrice: string;
  }>;

  reservations?: Array<{
    id: number;
    eventDate: string;
    status: string;
    space: {
      id: number;
      name: string;
    };
  }>;
}
