import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createPrismaExtension, ExtendedPrismaClient } from './prisma.extension';

/**
 * Serviço de Banco de Dados com Row Level Security (RLS)
 * 
 * Gerencia a conexão com PostgreSQL e aplica automaticamente
 * a extensão de multi-tenancy em todas as operações.
 * 
 * IMPORTANTE: Use sempre este serviço ao invés do PrismaClient diretamente
 * para garantir que o RLS seja aplicado corretamente.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private extendedClient: ExtendedPrismaClient;

  constructor() {
    super({
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
      errorFormat: 'pretty',
    });

    // Aplica a extensão de RLS
    this.extendedClient = createPrismaExtension(this);
  }

  /**
   * Conecta ao banco de dados quando o módulo é inicializado
   */
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✓ Conectado ao PostgreSQL com sucesso');
      this.logger.log('✓ Row Level Security (RLS) ativado via Prisma Extension');
    } catch (error) {
      this.logger.error('✗ Erro ao conectar ao PostgreSQL:', error);
      throw error;
    }
  }

  /**
   * Desconecta do banco quando a aplicação é encerrada
   */
  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Desconectado do PostgreSQL');
  }

  /**
   * Retorna o cliente estendido com RLS
   * Use este getter em todos os serviços
   */
  get client(): ExtendedPrismaClient {
    return this.extendedClient;
  }
}
