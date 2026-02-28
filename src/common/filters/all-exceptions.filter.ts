import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtro global de exceções
 * 
 * Padroniza respostas de erro em toda a API
 * Registra erros no log para auditoria
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let details: any = undefined;

    // Exceções HTTP do NestJS
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const response = exceptionResponse as any;
        message = response.message || message;
        details = response.details;
      }
    } else if (exception instanceof Error) {
      // Erros genéricos
      message = exception.message;
      
      // Log completo do erro para debug
      this.logger.error(
        `Erro não tratado: ${exception.message}`,
        exception.stack,
      );
    }

    // Monta resposta padronizada
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(details && { details }),
    };

    // Log de erros críticos
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - Status: ${status}`,
        JSON.stringify(errorResponse),
      );
    } else if (status >= 400) {
      this.logger.warn(
        `${request.method} ${request.url} - Status: ${status} - ${message}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}
