# Exemplos de Uso - FeastFlow API

Este documento contém exemplos práticos de uso da API para cenários reais.

## 📋 Pré-requisitos

```bash
# API rodando
npm run start:dev

# Token JWT válido (gere conforme INSTALLATION.md)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## 🎯 Cenário 1: Orçamento Simples de Casamento

### Contexto
Cliente Maria Silva quer alugar o Salão Principal para casamento em 31/12/2026 com 200 convidados.

### Passo 1: Criar o Orçamento

```bash
curl -X POST http://localhost:3000/api/v1/budgets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "customerId": 1,
    "eventCatalogId": 1,
    "eventDate": "2026-12-31",
    "guestCount": 200,
    "description": "Casamento Maria & João - Reveillon",
    "notes": "Cliente VIP - já realizou 2 eventos conosco",
    "items": [
      {
        "description": "Locação Salão Principal",
        "quantity": "1",
        "unitPrice": "5000.00"
      },
      {
        "description": "Buffet Completo",
        "quantity": "200",
        "unitPrice": "85.50"
      },
      {
        "description": "Decoração Premium",
        "quantity": "1",
        "unitPrice": "3500.00"
      },
      {
        "description": "Som e Iluminação",
        "quantity": "1",
        "unitPrice": "2000.00"
      }
    ],
    "discountRate": "0.10"
  }'
```

### Resposta Esperada

```json
{
  "id": 1,
  "budgetCode": "ORC-2026-000001",
  "status": "DRAFT",
  "eventDate": "2026-12-31",
  "guestCount": 200,
  "description": "Casamento Maria & João - Reveillon",
  "subtotal": "27600.0000",
  "discountRate": "0.1000",
  "taxRate": "0.0500",
  "taxAmount": "1242.0000",
  "totalAmount": "25998.0000",
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

### Análise Financeira

```
Subtotal:              R$ 27.600,00
Desconto (10%):        R$  2.760,00
Subtotal c/ desconto:  R$ 24.840,00
ISS (5%):              R$  1.242,00
─────────────────────────────────
TOTAL:                 R$ 25.998,00
```

### Passo 2: Aprovar e Reservar

```bash
curl -X POST http://localhost:3000/api/v1/budgets/1/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "spaceId": 1,
    "notes": "Sinal de 30% recebido via PIX"
  }'
```

## 🎯 Cenário 2: Feira Comercial (ISS Reduzido)

### Contexto
Empresa XYZ quer realizar uma feira de tecnologia com ISS reduzido (2%).

```bash
curl -X POST http://localhost:3000/api/v1/budgets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "customerId": 3,
    "eventCatalogId": 4,
    "eventDate": "2026-08-15",
    "guestCount": 500,
    "description": "Tech Expo 2026 - Feira de Tecnologia",
    "items": [
      {
        "description": "Locação Salão Principal - 3 dias",
        "quantity": "3",
        "unitPrice": "5000.00"
      },
      {
        "description": "Coffee Break - 500 pessoas/dia",
        "quantity": "1500",
        "unitPrice": "12.00"
      },
      {
        "description": "Infraestrutura Elétrica Adicional",
        "quantity": "1",
        "unitPrice": "3000.00"
      },
      {
        "description": "Internet Fibra Dedicada 1Gbps",
        "quantity": "3",
        "unitPrice": "800.00"
      }
    ],
    "discountRate": "0.15"
  }'
```

### Análise Financeira com ISS Reduzido

```
Subtotal:              R$ 38.400,00
Desconto (15%):        R$  5.760,00
Subtotal c/ desconto:  R$ 32.640,00
ISS (2%):              R$    652,80  ← REDUZIDO!
─────────────────────────────────
TOTAL:                 R$ 33.292,80

Economia no ISS:       R$    979,20  (vs 5%)
```

## 🎯 Cenário 3: Teste de Concorrência (OCC)

### Contexto
Duas pessoas tentam reservar o mesmo espaço/data simultaneamente.

### Terminal 1 - Primeira Requisição

```bash
# Aprova orçamento 1 para Salão Principal em 31/12/2026
curl -X POST http://localhost:3000/api/v1/budgets/1/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_USER_A" \
  -d '{
    "spaceId": 1,
    "notes": "Confirmado por usuário A"
  }'
```

### Terminal 2 - Segunda Requisição (simultânea)

```bash
# Tenta aprovar orçamento 2 para o MESMO espaço/data
curl -X POST http://localhost:3000/api/v1/budgets/2/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_USER_B" \
  -d '{
    "spaceId": 1,
    "notes": "Tentativa por usuário B"
  }'
```

### Resultado Esperado

**Terminal 1**: ✅ HTTP 200 OK
```json
{
  "id": 1,
  "status": "APPROVED",
  "reservations": [{
    "id": 1,
    "status": "CONFIRMED",
    "version": 0
  }]
}
```

**Terminal 2**: ❌ HTTP 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Conflito de reserva. Outra operação já reservou este espaço/data.",
  "error": "ReservationConflictError"
}
```

## 🎯 Cenário 4: Cancelamento com OCC

### Contexto
Cancelar uma reserva, garantindo que ela não foi modificada.

### Passo 1: Buscar Reserva Atual

```bash
curl http://localhost:3000/api/v1/budgets/1 \
  -H "Authorization: Bearer $TOKEN"
```

Resposta:
```json
{
  "id": 1,
  "reservations": [{
    "id": 1,
    "version": 0,
    "status": "CONFIRMED"
  }]
}
```

### Passo 2: Cancelar com Version Check

```bash
curl -X POST http://localhost:3000/api/v1/budgets/reservations/1/cancel?version=0 \
  -H "Authorization: Bearer $TOKEN"
```

✅ Sucesso: HTTP 204 No Content

### Passo 3: Tentativa de Cancelamento Duplicado

```bash
# Tenta cancelar novamente (version agora é 1)
curl -X POST http://localhost:3000/api/v1/budgets/reservations/1/cancel?version=0 \
  -H "Authorization: Bearer $TOKEN"
```

❌ Erro: HTTP 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Conflito de concorrência ao cancelar reserva.",
  "error": "OptimisticLockError",
  "details": {
    "reservationId": 1,
    "expectedVersion": 0,
    "currentVersion": 1
  }
}
```

## 🎯 Cenário 5: Consultas e Filtros

### Listar Todos os Orçamentos

```bash
curl http://localhost:3000/api/v1/budgets \
  -H "Authorization: Bearer $TOKEN"
```

### Filtrar por Status

```bash
# Apenas orçamentos aprovados
curl "http://localhost:3000/api/v1/budgets?status=APPROVED" \
  -H "Authorization: Bearer $TOKEN"
```

### Filtrar por Cliente

```bash
curl "http://localhost:3000/api/v1/budgets?customerId=1" \
  -H "Authorization: Bearer $TOKEN"
```

### Filtrar por Período

```bash
curl "http://localhost:3000/api/v1/budgets?startDate=2026-01-01&endDate=2026-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

### Filtros Combinados

```bash
curl "http://localhost:3000/api/v1/budgets?status=APPROVED&customerId=1&startDate=2026-06-01&endDate=2026-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

## 🎯 Cenário 6: Análise de Snapshot (Auditoria)

### Buscar Orçamento Aprovado

```bash
curl http://localhost:3000/api/v1/budgets/1 \
  -H "Authorization: Bearer $TOKEN"
```

### Resposta com Snapshot

```json
{
  "id": 1,
  "budgetCode": "ORC-2026-000001",
  "status": "APPROVED",
  "totalAmount": "25998.0000",
  "snapshot": {
    "budgetCode": "ORC-2026-000001",
    "approvedAt": "2026-02-27T14:30:00.000Z",
    "customer": {
      "id": 1,
      "name": "Maria Silva",
      "email": "maria.silva@email.com",
      "phone": "(41) 99999-1111"
    },
    "event": {
      "catalogId": 1,
      "catalogName": "Casamento",
      "date": "2026-12-31T00:00:00.000Z",
      "guestCount": 200
    },
    "financial": {
      "subtotal": "27600.0000",
      "discountRate": "0.1000",
      "taxRate": "0.0500",
      "taxAmount": "1242.0000",
      "totalAmount": "25998.0000",
      "currency": "BRL"
    },
    "items": [
      {
        "description": "Buffet Completo",
        "quantity": "200",
        "unitPrice": "85.50",
        "totalPrice": "17100.0000"
      }
    ],
    "metadata": {
      "tenantId": 1,
      "approvedBy": 1,
      "snapshotVersion": 1
    }
  }
}
```

### Importância do Snapshot

Mesmo que os preços mestres mudem:
- `Buffet Completo`: R$ 85,50 → R$ 120,00 (aumento de 40%)

O snapshot garante que o orçamento aprovado permanece com o preço original de R$ 85,50.

## 🎯 Cenário 7: Multi-Tenancy (Isolamento)

### Contexto
Dois salões diferentes (tenants) não devem ver dados um do outro.

### Tenant 1 (Salão Imperial)

```bash
# Token com tenantId=1
TOKEN_TENANT_1="eyJ...tenantId:1..."

curl http://localhost:3000/api/v1/budgets \
  -H "Authorization: Bearer $TOKEN_TENANT_1"
```

Retorna: Apenas orçamentos do Salão Imperial

### Tenant 2 (Espaço Elegance)

```bash
# Token com tenantId=2
TOKEN_TENANT_2="eyJ...tenantId:2..."

curl http://localhost:3000/api/v1/budgets \
  -H "Authorization: Bearer $TOKEN_TENANT_2"
```

Retorna: Apenas orçamentos do Espaço Elegance

### Teste de Isolamento

```bash
# Tenant 1 tenta acessar orçamento do Tenant 2
curl http://localhost:3000/api/v1/budgets/999 \
  -H "Authorization: Bearer $TOKEN_TENANT_1"
```

Resultado:
- Se orçamento 999 pertence ao Tenant 2: **HTTP 404 Not Found**
- Row Level Security bloqueia o acesso automaticamente

## 📊 Análise de Desempenho

### Teste de Carga (Opcional)

```bash
# Instale o Apache Bench
sudo apt-get install apache2-utils

# Teste: 1000 requisições, 10 simultâneas
ab -n 1000 -c 10 \
   -H "Authorization: Bearer $TOKEN" \
   http://localhost:3000/api/v1/budgets
```

Métricas esperadas:
- Requests per second: 200-500 req/s
- Time per request: 2-5 ms (média)
- Failed requests: 0

## 🔍 Debugging e Troubleshooting

### Verificar RLS no Banco

```sql
-- Conectar ao banco
psql $DATABASE_URL

-- Verificar políticas ativas
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';

-- Testar isolamento manualmente
SET app.current_tenant_id = '1';
SELECT * FROM "Budget";  -- Deve retornar apenas do tenant 1

SET app.current_tenant_id = '2';
SELECT * FROM "Budget";  -- Deve retornar apenas do tenant 2
```

### Logs de Debugging

```bash
# Ver logs em tempo real
npm run start:dev

# Logs incluem:
# - Queries SQL executadas
# - Valores de tenantId propagados
# - Erros de concorrência
# - Cálculos financeiros
```

## 📝 Boas Práticas

### ✅ DO (Faça)

1. **Sempre use Decimal para valores monetários**
   ```typescript
   const price = new Decimal('1500.50');
   ```

2. **Passe version ao cancelar reservas**
   ```bash
   POST /budgets/reservations/1/cancel?version=0
   ```

3. **Valide tokens JWT no frontend**
   ```javascript
   if (tokenExpired) {
     await refreshToken();
   }
   ```

4. **Trate erros 409 com retry**
   ```javascript
   try {
     await approveReservation();
   } catch (err) {
     if (err.status === 409) {
       // Recarregar dados e tentar novamente
       await reload();
       await approveReservation();
     }
   }
   ```

### ❌ DON'T (Não Faça)

1. **Nunca use números nativos para dinheiro**
   ```typescript
   // ❌ ERRADO
   const price = 1500.50;
   
   // ✅ CORRETO
   const price = new Decimal('1500.50');
   ```

2. **Não ignore erros 409**
   ```typescript
   // ❌ ERRADO - ignora conflito
   try {
     await approve();
   } catch {}
   
   // ✅ CORRETO - trata conflito
   catch (err) {
     if (err.status === 409) {
       alert('Reserva já confirmada por outro usuário');
     }
   }
   ```

3. **Não confie apenas na aplicação para isolamento**
   ```typescript
   // ❌ ERRADO - depende só do código
   where: { tenantId: currentTenant }
   
   // ✅ CORRETO - RLS garante isolamento
   // (tenantId injetado automaticamente)
   ```

---

**Exemplos práticos para todos os cenários de uso da API!**
