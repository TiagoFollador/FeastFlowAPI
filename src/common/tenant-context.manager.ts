import { AsyncLocalStorage } from 'async_hooks';

/**
 * Interface para o contexto armazenado no AsyncLocalStorage
 * Contém informações da requisição HTTP atual
 */
export interface TenantContext {
  tenantId: number;
  userId?: number;
  email?: string;
}

/**
 * Singleton para gerenciamento de contexto multi-tenant usando AsyncLocalStorage
 * 
 * O AsyncLocalStorage resolve o problema de propagação de contexto em Node.js assíncrono
 * sem precisar passar parâmetros explicitamente por toda a aplicação.
 * 
 * Garante que múltiplas requisições HTTP não compartilhem o mesmo tenantId,
 * prevenindo vazamento de dados entre inquilinos.
 */
export class TenantContextManager {
  private static instance: TenantContextManager;
  private readonly als: AsyncLocalStorage<TenantContext>;

  private constructor() {
    this.als = new AsyncLocalStorage<TenantContext>();
  }

  /**
   * Retorna a instância singleton do gerenciador de contexto
   */
  public static getInstance(): TenantContextManager {
    if (!TenantContextManager.instance) {
      TenantContextManager.instance = new TenantContextManager();
    }
    return TenantContextManager.instance;
  }

  /**
   * Executa uma função dentro de um contexto isolado de tenant
   * Todas as operações assíncronas dentro do callback terão acesso ao contexto
   * 
   * @param context - Contexto do tenant a ser propagado
   * @param callback - Função a ser executada no contexto isolado
   */
  public run<T>(context: TenantContext, callback: () => T): T {
    return this.als.run(context, callback);
  }

  /**
   * Retorna o contexto do tenant atual
   * Retorna undefined se não houver contexto (ex: rotas públicas de login)
   */
  public getContext(): TenantContext | undefined {
    return this.als.getStore();
  }

  /**
   * Retorna o ID do tenant atual
   * Lança exceção se não houver contexto definido
   */
  public getTenantId(): number {
    const context = this.getContext();
    if (!context) {
      throw new Error(
        'Tenant context not found. Ensure the request is wrapped in TenantContextManager.run()',
      );
    }
    return context.tenantId;
  }

  /**
   * Verifica se há um contexto de tenant ativo
   */
  public hasContext(): boolean {
    return this.getContext() !== undefined;
  }
}
