# FeastFlow API

Plataforma SaaS B2B para Gestão de Salões de Festas e Espaços de Eventos

## 🏗️ Arquitetura

Esta API implementa os mais rigorosos padrões de segurança e engenharia de dados para aplicações multi-tenant:

### Características Principais

- **🔒 Row Level Security (RLS)**: Isolamento matemático de dados entre tenants no PostgreSQL
- **🏢 Multi-Tenancy**: Múltiplos salões compartilham a mesma infraestrutura com segurança garantida
- **💰 Precisão Decimal**: Uso de `Decimal.js` e `NUMERIC(19,4)` para eliminar erros de arredondamento financeiro
- **🔄 Concorrência Otimista (OCC)**: Prevenção de double booking sem bloquear conexões
- **📋 Snapshot Pattern**: Auditoria imutável de contratos via JSONB
- **🏛️ Tributação Regional**: Cálculo automático de ISS (2% ou 5%) conforme legislação de São José dos Pinhais/Curitiba

### Stack Tecnológica

- **Backend**: NestJS (Node.js + TypeScript)
- **ORM**: Prisma
- **Banco de Dados**: PostgreSQL 14+
- **Validação**: class-validator, class-transformer
- **Matemática Financeira**: Decimal.js

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 18+ e npm
- PostgreSQL 14+
- Git

### 1. Clone e Instale Dependências

```bash
# Entre no diretório do projeto
cd FeastFlowAPI

# Instale as dependências
npm install
```

### 2. Configure o Banco de Dados

```bash
# Crie o banco de dados PostgreSQL
createdb feastflow_db

# Crie um usuário SEM privilégios de superuser ou BYPASSRLS
psql -c "CREATE USER feastflow_user WITH PASSWORD 'senha_segura';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE feastflow_db TO feastflow_user;"
```

**⚠️ CRÍTICO**: O usuário do banco **NÃO PODE** ter `BYPASSRLS` ou ser `superuser`, caso contrário o RLS será ignorado!

Verifique:
```sql
SELECT rolname, rolsuper, rolbypassrls 
FROM pg_roles 
WHERE rolname = 'feastflow_user';
```

### 3. Configure Variáveis de Ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
DATABASE_URL="postgresql://feastflow_user:senha_segura@localhost:5432/feastflow_db?schema=public"
JWT_SECRET="sua_chave_secreta_jwt_aqui_min_256_bits"
JWT_EXPIRATION="7d"
NODE_ENV="development"
PORT=3000
```

### 4. Execute Migrações e Seed

```bash
# Gera o Prisma Client
npm run prisma:generate

# Executa migrações do banco
npm run prisma:migrate

# Habilita Row Level Security (RLS)
psql $DATABASE_URL -f prisma/enable-rls.sql

# Popula banco com dados de exemplo
npm run prisma:seed
```

### 5. Inicie o Servidor

```bash
# Modo desenvolvimento (com hot reload)
npm run start:dev

# Modo produção
npm run build
npm run start:prod
```

A API estará disponível em: `http://localhost:3000`

## 📚 Documentação da API

### Autenticação

Todas as rotas (exceto `/auth/login`) requerem um token JWT no header:

```
Authorization: Bearer <token>
```

O token deve conter o payload:
```json
{
  "tenantId": 1,
  "userId": 1,
  "email": "admin@salaoimperial.com.br"
}
```

### Endpoints Principais

#### Orçamentos

**Criar Orçamento**
```http
POST /api/v1/budgets
Content-Type: application/json

{
  "customerId": 1,
  "eventCatalogId": 1,
  "eventDate": "2026-12-31",
  "guestCount": 200,
  "description": "Casamento Maria e João",
  "items": [
    {
      "description": "Locação do Salão Principal",
      "quantity": "1",
      "unitPrice": "5000.00"
    },
    {
      "description": "Buffet Completo",
      "quantity": "200",
      "unitPrice": "85.50"
    }
  ],
  "discountRate": "0.10"
}
```

**Listar Orçamentos**
```http
GET /api/v1/budgets
GET /api/v1/budgets?status=APPROVED
GET /api/v1/budgets?customerId=1&startDate=2026-01-01&endDate=2026-12-31
```

**Buscar Orçamento**
```http
GET /api/v1/budgets/:id
```

**Aprovar e Reservar**
```http
POST /api/v1/budgets/:id/approve
Content-Type: application/json

{
  "spaceId": 1,
  "notes": "Confirmado pagamento do sinal"
}
```

**Cancelar Reserva (com OCC)**
```http
POST /api/v1/budgets/reservations/:id/cancel?version=0
```

### Estrutura de Resposta

```json
{
  "id": 1,
  "budgetCode": "ORC-2026-000001",
  "status": "APPROVED",
  "eventDate": "2026-12-31",
  "guestCount": 200,
  "subtotal": "22100.0000",
  "discountRate": "0.1000",
  "taxRate": "0.0500",
  "taxAmount": "994.5000",
  "totalAmount": "20884.5000",
  "snapshot": {
    "budgetCode": "ORC-2026-000001",
    "financial": {
      "totalAmount": "20884.5000",
      "currency": "BRL"
    }
  },
  "customer": {
    "id": 1,
    "name": "Maria Silva",
    "email": "maria.silva@email.com"
  },
  "eventCatalog": {
    "id": 1,
    "name": "Casamento",
    "qualifiesForReducedTax": false
  }
}
```

## 🧪 Testes

```bash
# Testes unitários
npm run test

# Testes com coverage
npm run test:cov

# Testes e2e
npm run test:e2e
```

## 🔐 Segurança

### Row Level Security (RLS)

O RLS garante isolamento absoluto de dados:

```sql
-- Exemplo de política aplicada em todas as tabelas
CREATE POLICY tenant_isolation_policy ON "Budget"
  USING ("tenantId" = current_setting('app.current_tenant_id')::integer);
```

A variável `app.current_tenant_id` é injetada automaticamente via Prisma Extension a cada query.

### AsyncLocalStorage

O contexto do tenant é propagado através do AsyncLocalStorage:

```typescript
// No middleware
contextManager.run({ tenantId: 1, userId: 1 }, () => {
  // Todas as queries neste contexto terão tenantId = 1
  budgetService.create(dto);
});
```

### Concorrência Otimista

Reservas usam campo `version` para detectar modificações concorrentes:

```typescript
// Tenta atualizar APENAS se version não mudou
const result = await prisma.reservation.updateMany({
  where: { id, version: expectedVersion },
  data: { 
    status: 'CONFIRMED',
    version: { increment: 1 }
  }
});

if (result.count === 0) {
  throw new OptimisticLockError();
}
```

## 💰 Cálculos Tributários

### Alíquotas de ISS

Conforme legislação de São José dos Pinhais e Curitiba:

- **5%**: Alíquota padrão (casamentos, aniversários, formaturas)
- **2%**: Alíquota reduzida para:
  - Congressos técnicos
  - Feiras comerciais
  - Shows musicais/culturais
  - Produções artísticas

O cálculo é automático baseado no campo `qualifiesForReducedTax` do `EventCatalog`.

## 📊 Modelo de Dados

### Diagrama ER Simplificado

```
Tenant (Salão de Festas)
  ├── User (Usuários/Administradores)
  ├── Space (Espaços Físicos)
  ├── EventCatalog (Tipos de Eventos)
  ├── Customer (Clientes Finais)
  └── Budget (Orçamentos)
      ├── BudgetItem (Itens do Orçamento)
      └── Reservation (Reservas com OCC)
```

### Campos DECIMAL

Todos os valores monetários usam `DECIMAL(19,4)`:
- 19 dígitos totais
- 4 casas decimais (sub-centavos para cálculos intermediários)
- Arredondamento final para 2 casas (centavos) na resposta

## 🛠️ Desenvolvimento

### Comandos Úteis

```bash
# Formatar código
npm run format

# Lint
npm run lint

# Abrir Prisma Studio (GUI para banco)
npm run prisma:studio

# Criar nova migração
npx prisma migrate dev --name nome_da_migracao

# Resetar banco (cuidado!)
npx prisma migrate reset
```

### Estrutura de Pastas

```
src/
├── common/
│   ├── decorators/        # Decoradores customizados (@ToDecimal)
│   ├── exceptions/        # Exceções de negócio
│   ├── filters/           # Filtros globais
│   ├── middleware/        # Middlewares (TenantContext)
│   ├── prisma.extension.ts
│   ├── prisma.service.ts
│   └── tenant-context.manager.ts
├── modules/
│   └── budgets/
│       ├── dto/
│       ├── budget.controller.ts
│       ├── budget.service.ts
│       └── budget.module.ts
├── app.module.ts
└── main.ts
```

## 📝 Licença

Proprietary - Todos os direitos reservados

## 👥 Contribuindo

Este é um projeto privado. Entre em contato com a equipe para contribuir.

## 📞 Suporte

Para suporte, entre em contato:
- Email: suporte@feastflow.com.br
- Documentação completa: [Ver arquivo `prompt` para especificação arquitetural detalhada]

---

**Desenvolvido com ❤️ pela equipe FeastFlow**  
*Região: São José dos Pinhais / Curitiba - PR*