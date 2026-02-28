import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exceção para conflitos de concorrência otimista
 * 
 * Lançada quando uma operação falha devido a modificação concorrente
 * (ex: tentativa de reservar um espaço já reservado por outro usuário)
 * 
 * HTTP Status: 409 Conflict
 */
export class OptimisticLockError extends HttpException {
  constructor(
    message: string = 'Conflito de concorrência detectado. O recurso foi modificado por outra operação.',
    details?: any,
  ) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message,
        error: 'OptimisticLockError',
        details,
      },
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * Exceção para erros de isolamento de tenant
 * 
 * Lançada quando há tentativa de acesso a dados de outro tenant
 * ou quando o contexto de tenant não está definido
 * 
 * HTTP Status: 403 Forbidden
 */
export class TenantIsolationError extends HttpException {
  constructor(message: string = 'Acesso negado. Violação de isolamento de tenant.') {
    super(
      {
        statusCode: HttpStatus.FORBIDDEN,
        message,
        error: 'TenantIsolationError',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

/**
 * Exceção para erros financeiros/tributários
 * 
 * Lançada quando há erro em cálculos financeiros ou aplicação de impostos
 * 
 * HTTP Status: 422 Unprocessable Entity
 */
export class FinancialCalculationError extends HttpException {
  constructor(message: string, details?: any) {
    super(
      {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message,
        error: 'FinancialCalculationError',
        details,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

/**
 * Exceção para reservas inválidas
 * 
 * Lançada quando não é possível criar uma reserva devido a conflitos
 * 
 * HTTP Status: 409 Conflict
 */
export class ReservationConflictError extends HttpException {
  constructor(message: string = 'Conflito de reserva. O espaço já está reservado para esta data.') {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message,
        error: 'ReservationConflictError',
      },
      HttpStatus.CONFLICT,
    );
  }
}
