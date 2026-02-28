import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';

/**
 * Filtro global de exceções
 * 
 * Padroniza respostas de erro em toda a API
 * Registra erros no log para auditoria
 * 
 * Tratamento de erros:
 * - HttpException: erros HTTP do NestJS (incluindo exceções de negócio customizadas)
 * - PrismaClientKnownRequestError: erros do banco de dados com código específico
 *   - P2002: Violação de constraint unique → 409 Conflict
 *   - P2025: Registro não encontrado → 404 Not Found
 *   - P2003: Violação de chave estrangeira → 400 Bad Request
 *   - P2014: Violação de relação obrigatória → 400 Bad Request
 * - PrismaClientValidationError: dados inválidos enviados ao Prisma → 400 Bad Request
 * - Error: erros genéricos não tratados → 500 Internal Server Error
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

    // Exceções HTTP do NestJS (incluindo HttpException customizadas de negócio)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const res = exceptionResponse as any;
        message = res.message || message;
        details = res.details;
      }
    } else if (exception instanceof PrismaClientKnownRequestError) {
      // Erros do Prisma com código conhecido (constraints, registros não encontrados, etc.)
      const prismaError = this.handlePrismaKnownError(exception);
      status = prismaError.status;
      message = prismaError.message;
      details = prismaError.details;
    } else if (exception instanceof PrismaClientValidationError) {
      // Dados inválidos enviados ao Prisma (campos obrigatórios ausentes, tipos errados)
      status = HttpStatus.BAD_REQUEST;
      message = 'Dados inválidos enviados ao banco de dados';
      this.logger.warn(`Prisma validation error: ${exception.message}`);
    } else if (exception instanceof Error) {
      // Erros genéricos não tratados
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

  /**
   * Mapeia erros conhecidos do Prisma para respostas HTTP semânticas
   * 
   * Códigos de erro Prisma:
   * @see https://www.prisma.io/docs/reference/api-reference/error-reference
   */
  private handlePrismaKnownError(exception: PrismaClientKnownRequestError): {
    status: number;
    message: string;
    details?: any;
  } {
    switch (exception.code) {
      case 'P2002': {
        // Violação de constraint unique (ex: email duplicado, reserva duplicada)
        const fields = (exception.meta?.target as string[])?.join(', ');
        return {
          status: HttpStatus.CONFLICT,
          message: `Conflito: registro já existe com o(s) campo(s) único(s): ${fields || 'desconhecido'}`,
          details: { code: exception.code, fields },
        };
      }

      case 'P2025': {
        // Registro não encontrado (ex: tentativa de atualizar/deletar registro inexistente)
        const cause = exception.meta?.cause as string | undefined;
        return {
          status: HttpStatus.NOT_FOUND,
          message: cause || 'Registro não encontrado',
          details: { code: exception.code },
        };
      }

      case 'P2003': {
        // Violação de chave estrangeira (ex: customerId referenciando cliente inexistente)
        const field = exception.meta?.field_name as string | undefined;
        return {
          status: HttpStatus.BAD_REQUEST,
          message: `Referência inválida: o registro relacionado não existe${field ? ` (campo: ${field})` : ''}`,
          details: { code: exception.code, field },
        };
      }

      case 'P2014': {
        // Violação de relação obrigatória
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Violação de relação obrigatória entre registros',
          details: { code: exception.code },
        };
      }

      default: {
        // Outros erros conhecidos do Prisma não mapeados
        this.logger.error(
          `Prisma known error não mapeado: ${exception.code}`,
          exception.message,
        );
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Erro de banco de dados',
          details: { code: exception.code },
        };
      }
    }
  }
}
