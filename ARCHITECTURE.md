# Arquitetura Técnica - FeastFlow API

## 🏛️ Visão Geral Arquitetural

A FeastFlow API é uma plataforma SaaS B2B multi-tenant que implementa as melhores práticas de segurança, precisão financeira e controle de concorrência para gestão de salões de festas.

## 🔐 Arquitetura de Segurança Multi-Tenant

### Row Level Security (RLS) - PostgreSQL

#### Problema Resolvido
Em aplicações multi-tenant com tabela compartilhada, o risco de vazamento de dados entre empresas concorrentes é crítico. A abordagem tradicional (filtrar por `tenantId` no código) é falha:

```typescript
// ❌ ABORDAGEM INSEGURA: Confia na aplicação
const budgets = await prisma.budget.findMany({
  where: { tenantId: currentTenantId } // Se esquecer isso = vazamento!
});
```

#### Solução Implementada
RLS transfere a segurança para o banco de dados:

```sql
-- Habilita RLS na tabela
ALTER TABLE "Budget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Budget" FORCE ROW LEVEL SECURITY;

-- Cria política de isolamento
CREATE POLICY tenant_isolation_policy ON "Budget"
  USING ("tenantId" = current_setting('app.current_tenant_id')::integer);
```

Agora o PostgreSQL filtra automaticamente **todas** as queries, independente do código da aplicação.

#### Fluxo de Segurança

```
┌─────────────────────────────────────────────────────────────┐
│                     Requisição HTTP                          │
│  GET /budgets (tenantId=1 no JWT)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           TenantContextMiddleware                            │
│  - Extrai tenantId do JWT                                    │
│  - Abre contexto no AsyncLocalStorage                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              BudgetService.findAll()                         │
│  - Chama prisma.budget.findMany()                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            Prisma Extension ($extends)                       │
│  - Intercepta a query                                        │
│  - Lê tenantId do AsyncLocalStorage                          │
│  - Inicia transação                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL                                │
│  BEGIN;                                                      │
│  SELECT set_config('app.current_tenant_id', '1', TRUE);     │
│  SELECT * FROM "Budget";  -- RLS filtra automaticamente!    │
│  COMMIT;                                                     │
└─────────────────────────────────────────────────────────────┘
```

### AsyncLocalStorage - Propagação de Contexto

#### Problema
Node.js é single-threaded com event loop assíncrono. Variáveis globais causariam race conditions:

```typescript
// ❌ PERIGOSO: Race condition
let currentTenantId = null;

app.use((req, res, next) => {
  currentTenantId = req.user.tenantId; // Requisições sobrescrevem umas às outras!
  next();
});
```

#### Solução
AsyncLocalStorage cria cofre de memória isolado por requisição:

```typescript
// ✅ SEGURO: Isolamento por requisição
export class TenantContextManager {
  private readonly als = new AsyncLocalStorage<TenantContext>();

  run<T>(context: TenantContext, callback: () => T): T {
    return this.als.run(context, callback);
  }

  getTenantId(): number {
    return this.als.getStore()!.tenantId;
  }
}
```

#### Diagrama de Propagação

```
HTTP Request A (tenantId=1)        HTTP Request B (tenantId=2)
        │                                  │
        ▼                                  ▼
┌──────────────────┐              ┌──────────────────┐
│ ALS Store A      │              │ ALS Store B      │
│ { tenantId: 1 }  │              │ { tenantId: 2 }  │
└──────────────────┘              └──────────────────┘
        │                                  │
        ├─▶ Controller A                  ├─▶ Controller B
        │                                  │
        ├─▶ Service A                     ├─▶ Service B
        │                                  │
        └─▶ Prisma Query A                └─▶ Prisma Query B
            (filtra tenantId=1)               (filtra tenantId=2)
```

As requisições são processadas intercaladamente, mas cada uma mantém seu contexto isolado.

## 💰 Precisão Financeira com Decimal.js

### Problema do IEEE 754 Float

```javascript
// ❌ PROBLEMA: Arredondamento binário
0.1 + 0.2 === 0.3  // false! Resultado: 0.30000000000000004

// Em um orçamento de R$ 50.000,00 parcelado em 12x com juros:
let total = 0;
for (let i = 0; i < 12; i++) {
  total += 4166.67; // Parcela
}
console.log(total); // 50000.03999999999 (erro de R$ 0,04)
```

### Solução: DECIMAL(19,4) + Decimal.js

#### No Banco de Dados (PostgreSQL)

```sql
CREATE TABLE "Budget" (
  subtotal     DECIMAL(19, 4),  -- 19 dígitos totais, 4 decimais
  taxRate      DECIMAL(5, 4),   -- 0.0200 (2%) ou 0.0500 (5%)
  taxAmount    DECIMAL(19, 4),
  totalAmount  DECIMAL(19, 4)
);
```

Capacidade: até **R$ 999.999.999.999.999,9999** (999 trilhões)

#### No Código (TypeScript)

```typescript
import Decimal from 'decimal.js';

// Configuração global
Decimal.set({ 
  precision: 20,  // 20 dígitos significativos
  rounding: Decimal.ROUND_HALF_UP  // Arredonda 0.5 para cima
});

// Cálculo exato
const subtotal = new Decimal('22100.0000');
const taxRate = new Decimal('0.0500');  // 5%
const taxAmount = subtotal.times(taxRate);  // 1105.0000

console.log(taxAmount.toString());  // "1105.0000" (exato!)
```

#### Fluxo de Conversão

```
┌─────────────────────────────────────────────────────────────┐
│                    Cliente (JSON)                            │
│  { "unitPrice": "1500.50" }                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            DTO com @ToDecimal()                              │
│  @ToDecimal()                                                │
│  unitPrice: Decimal;  // Transform(String → Decimal)        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         BudgetService (Lógica de Negócio)                    │
│  const total = quantity.times(unitPrice);                    │
│  const tax = total.times(taxRate);                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Prisma → PostgreSQL                             │
│  INSERT INTO "Budget" (totalAmount) VALUES (22100.0000);    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          Response DTO (Serialização)                         │
│  totalAmount: budget.totalAmount.toString()  // "22100.0000"│
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Controle de Concorrência Otimista (OCC)

### Problema: Double Booking

```
Usuário A                          Usuário B
   │                                  │
   ├─ Lê reserva (version=0)         │
   │                                  ├─ Lê reserva (version=0)
   │                                  │
   ├─ Valida disponibilidade         │
   │                                  ├─ Valida disponibilidade
   │                                  │
   ├─ Confirma reserva ✓             │
   │  (atualiza version=1)           │
   │                                  │
   │                                  ├─ Confirma reserva ✗
   │                                  │  (tenta atualizar version=0)
   │                                  │  ERROR: version mudou!
```

### Solução: Campo `version` com `updateMany`

```typescript
// Serviço de reserva
async confirmReservation(reservationId: number, expectedVersion: number) {
  // Tentativa de atualização condicional
  const result = await prisma.reservation.updateMany({
    where: {
      id: reservationId,
      version: expectedVersion  // ← CRUCIAL: Só atualiza se version for igual
    },
    data: {
      status: 'CONFIRMED',
      version: { increment: 1 }  // Incrementa atomicamente
    }
  });

  // Se count === 0, outra transação já atualizou
  if (result.count === 0) {
    throw new OptimisticLockError(
      'Conflito detectado. O recurso foi modificado por outra operação.'
    );
  }
}
```

### Comparação: Pessimistic vs Optimistic

| Aspecto | Pessimistic (SELECT FOR UPDATE) | Optimistic (Version) |
|---------|--------------------------------|----------------------|
| **Performance** | Baixa (bloqueia conexões) | Alta (sem bloqueios) |
| **Escalabilidade** | Limitada | Excelente |
| **Deadlocks** | Possível | Impossível |
| **Latência** | Alta em carga | Baixa |
| **Uso** | Conflitos frequentes (>10%) | Conflitos raros (<1%) |

Para salões de festas, conflitos são **raros** (duas pessoas reservando a mesma data no mesmo segundo), então OCC é ideal.

## 📋 Snapshot Pattern - Auditoria Imutável

### Problema: Mutabilidade de Dados Mestres

```
01/Jan: Cliente A aprova orçamento
  - Buffet Premium: R$ 120,00/pessoa
  - Total: R$ 24.000,00

01/Fev: Dono do salão aumenta preço do buffet
  - Buffet Premium: R$ 150,00/pessoa (novo preço)

❌ PROBLEMA: Se o orçamento referencia a tabela de preços,
o valor histórico é perdido!
```

### Solução: Congelamento em JSONB

```typescript
// No momento da aprovação
const snapshot = {
  budgetCode: "ORC-2026-000001",
  approvedAt: "2026-01-01T10:00:00Z",
  customer: {
    id: 1,
    name: "Maria Silva",
    email: "maria@email.com"
  },
  financial: {
    subtotal: "24000.0000",
    taxRate: "0.0500",  // 5% no momento da aprovação
    totalAmount: "25200.0000",
    currency: "BRL"
  },
  items: [
    {
      description: "Buffet Premium",
      quantity: "200",
      unitPrice: "120.0000",  // ← Preço congelado!
      totalPrice: "24000.0000"
    }
  ]
};

await prisma.budget.update({
  where: { id: budgetId },
  data: {
    status: 'APPROVED',
    snapshot: snapshot  // Gravado como JSONB
  }
});
```

### Vantagens do JSONB

| Característica | JSON (texto) | JSONB (binário) |
|----------------|--------------|-----------------|
| **Armazenamento** | Texto puro | Formato binário otimizado |
| **Velocidade de leitura** | Lenta (re-parse sempre) | Rápida (pré-processado) |
| **Indexação** | Limitada | GIN Index completo |
| **Chaves duplicadas** | Permitidas | Removidas automaticamente |
| **Formatação** | Preservada | Normalizada |
| **Queries complexas** | Difícil | Nativo (`->`, `->>`, `@>`) |

### Queries Analíticas com JSONB

```sql
-- Buscar todos os orçamentos que usaram "Buffet Premium"
SELECT * FROM "Budget"
WHERE snapshot @> '{"items": [{"description": "Buffet Premium"}]}';

-- Buscar orçamentos acima de R$ 20.000
SELECT * FROM "Budget"
WHERE (snapshot->'financial'->>'totalAmount')::decimal > 20000;

-- Criar índice GIN para queries rápidas
CREATE INDEX idx_budget_snapshot ON "Budget" USING GIN (snapshot);
```

## 🏛️ Cálculo Tributário Regional (ISS)

### Legislação: São José dos Pinhais / Curitiba

Baseado na Lei Municipal 40/2001 e normativas correlatas:

```typescript
const TAX_RATES = {
  STANDARD: new Decimal('0.05'),  // 5% - Alíquota padrão
  REDUCED: new Decimal('0.02'),   // 2% - Eventos culturais/corporativos
};
```

### Eventos que Qualificam para ISS Reduzido (2%)

- Congressos técnicos e científicos
- Feiras comerciais e exposições
- Shows musicais e apresentações culturais
- Produções artísticas e teatrais
- Eventos corporativos de grande porte

### Eventos com ISS Padrão (5%)

- Casamentos
- Aniversários
- Formaturas
- Confraternizações

### Implementação

```typescript
// EventCatalog define a qualificação
const eventCatalog = await prisma.eventCatalog.findFirst({
  where: { id: dto.eventCatalogId }
});

// Seleção automática da alíquota
const taxRate = eventCatalog.qualifiesForReducedTax 
  ? TAX_RATES.REDUCED   // 2%
  : TAX_RATES.STANDARD; // 5%

// Cálculo do imposto
const taxAmount = discountedSubtotal.times(taxRate);
const totalAmount = discountedSubtotal.plus(taxAmount);
```

## 🗄️ Modelo de Dados

### Hierarquia de Entidades

```
Tenant (Inquilino - Salão de Festas)
├── RLS: Não aplica (tabela raiz)
├── Chave: id (PK)
│
├─▶ User (Usuários do Salão)
│   ├── RLS: Sim
│   ├── FK: tenantId → Tenant.id
│   └── Roles: ADMIN, OPERATOR, VIEWER
│
├─▶ Space (Espaços Físicos)
│   ├── RLS: Sim
│   ├── FK: tenantId → Tenant.id
│   └── Preço: basePrice (DECIMAL 19,4)
│
├─▶ EventCatalog (Tipos de Eventos)
│   ├── RLS: Sim
│   ├── FK: tenantId → Tenant.id
│   └── Flag: qualifiesForReducedTax (boolean)
│
├─▶ Customer (Clientes Finais)
│   ├── RLS: Sim
│   └── FK: tenantId → Tenant.id
│
└─▶ Budget (Orçamento)
    ├── RLS: Sim
    ├── FK: tenantId → Tenant.id
    ├── FK: customerId → Customer.id
    ├── FK: eventCatalogId → EventCatalog.id
    ├── Financeiro: DECIMAL(19,4)
    ├── Auditoria: snapshot (JSONB)
    │
    ├─▶ BudgetItem (Itens)
    │   ├── RLS: Sim
    │   ├── FK: budgetId → Budget.id
    │   └── Valores: DECIMAL(19,4)
    │
    └─▶ Reservation (Reserva)
        ├── RLS: Sim
        ├── FK: budgetId → Budget.id
        ├── FK: spaceId → Space.id
        ├── OCC: version (integer)
        └── Constraint: UNIQUE(spaceId, eventDate, tenantId)
```

## 🚀 Fluxo Completo de Aprovação

```
┌────────────────────────────────────────────────────────────────┐
│ 1. Cliente submete pedido de orçamento                         │
│    POST /budgets                                                │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│ 2. Middleware extrai tenantId do JWT                           │
│    TenantContextMiddleware                                      │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│ 3. Validação de DTOs                                           │
│    - Transforma strings para Decimal                            │
│    - Valida campos obrigatórios                                 │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│ 4. BudgetService.create()                                      │
│    - Calcula subtotal (Decimal.js)                              │
│    - Determina alíquota ISS (2% ou 5%)                          │
│    - Aplica desconto                                            │
│    - Calcula imposto                                            │
│    - Gera código único                                          │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│ 5. Prisma Extension intercepta                                 │
│    - Lê tenantId do AsyncLocalStorage                           │
│    - Abre transação                                             │
│    - Executa set_config('app.current_tenant_id', '1', TRUE)   │
│    - Executa INSERT                                             │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│ 6. PostgreSQL RLS filtra                                       │
│    - Valida que tenantId = current_setting(...)                │
│    - Permite INSERT                                             │
│    - Commit da transação                                        │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│ 7. Orçamento criado com status DRAFT                           │
│    - Retorna BudgetResponseDto                                  │
└────────────────────────────────────────────────────────────────┘
```

---

## 📚 Referências Técnicas

- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Node.js AsyncLocalStorage](https://nodejs.org/api/async_context.html#class-asynclocalstorage)
- [Prisma Client Extensions](https://www.prisma.io/docs/concepts/components/prisma-client/client-extensions)
- [Decimal.js Documentation](https://mikemcl.github.io/decimal.js/)
- [Optimistic Concurrency Control](https://en.wikipedia.org/wiki/Optimistic_concurrency_control)
- [JSONB PostgreSQL](https://www.postgresql.org/docs/current/datatype-json.html)

---

**Arquitetura desenhada para: Segurança, Precisão e Escalabilidade**
