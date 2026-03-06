import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * OptimisticLockError
 *
 * Thrown when an Optimistic Concurrency Control (OCC) check fails: the budget
 * was modified by another request between the moment it was read and the moment
 * it was approved. The caller should re-fetch the budget and retry.
 */
export class OptimisticLockError extends HttpException {
  constructor(budgetId: string) {
    super(
      {
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: `Budget ${budgetId} was modified concurrently. Re-fetch and retry.`,
      },
      HttpStatus.CONFLICT,
    );
  }
}
