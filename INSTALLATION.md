# Guia de Instalação - FeastFlow API

## 📋 Pré-requisitos Verificados

Antes de começar, certifique-se de ter instalado:

```bash
# Verificar Node.js (requer versão 18+)
node --version

# Verificar npm
npm --version

# Verificar PostgreSQL (requer versão 14+)
psql --version
```

## 🔧 Instalação Passo a Passo

### 1. Instalar Dependências

```bash
npm install
```

Isso instalará:
- NestJS e dependências do framework
- Prisma ORM e cliente
- Decimal.js para precisão financeira
- class-validator e class-transformer
- bcrypt para hash de senhas
- Outros utilitários

### 2. Configurar PostgreSQL

#### Criar Banco de Dados

```bash
# Entre no PostgreSQL como administrador
sudo -u postgres psql

# Ou no Windows/Mac:
psql -U postgres
```

Execute os seguintes comandos SQL:

```sql
-- Criar banco de dados
CREATE DATABASE feastflow_db;

-- Criar usuário (SEM privilégios de superuser)
CREATE USER feastflow_user WITH PASSWORD 'sua_senha_segura_aqui';

-- Conceder permissões
GRANT ALL PRIVILEGES ON DATABASE feastflow_db TO feastflow_user;

-- Conceder permissões no schema public
\c feastflow_db
GRANT ALL ON SCHEMA public TO feastflow_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO feastflow_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO feastflow_user;

-- ⚠️ VERIFICAÇÃO CRÍTICA: Certifique-se que o usuário NÃO tem BYPASSRLS
SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'feastflow_user';
```

Resultado esperado:
```
    rolname      | rolsuper | rolbypassrls 
-----------------+----------+--------------
 feastflow_user  | f        | f
```

Se `rolsuper` ou `rolbypassrls` estiverem como `t` (true), o RLS será ignorado!

### 3. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar com seu editor preferido
nano .env
# ou
code .env
```

Configure as variáveis:

```env
# Banco de Dados - IMPORTANTE: Use o usuário criado acima
DATABASE_URL="postgresql://feastflow_user:sua_senha_segura_aqui@localhost:5432/feastflow_db?schema=public"

# JWT (gere uma chave segura com: openssl rand -base64 32)
JWT_SECRET="cole_a_chave_gerada_aqui"
JWT_EXPIRATION="7d"

# Aplicação
NODE_ENV="development"
PORT=3000
LOG_LEVEL="debug"

# CORS (ajuste conforme seu frontend)
ALLOWED_ORIGINS="http://localhost:3001,http://localhost:3000"
```

### 4. Executar Migrações do Prisma

```bash
# Gera o Prisma Client com base no schema
npm run prisma:generate

# Cria as tabelas no banco de dados
npm run prisma:migrate

# Quando solicitado, dê um nome para a migração:
# Nome: "initial_schema"
```

### 5. Habilitar Row Level Security (RLS)

```bash
# Execute o script SQL que habilita RLS em todas as tabelas
psql postgresql://feastflow_user:sua_senha_segura_aqui@localhost:5432/feastflow_db -f prisma/enable-rls.sql
```

Você deve ver uma saída similar a:

```
========================================
Habilitando Row Level Security (RLS)
FeastFlow Multi-Tenant Platform
========================================
✓ RLS habilitado para tabela: User
✓ RLS habilitado para tabela: Space
✓ RLS habilitado para tabela: EventCatalog
✓ RLS habilitado para tabela: Customer
✓ RLS habilitado para tabela: Budget
✓ RLS habilitado para tabela: BudgetItem
✓ RLS habilitado para tabela: Reservation
========================================
RLS configurado com sucesso!
Total de tabelas protegidas: 7
========================================
```

### 6. Popular com Dados de Exemplo (Seed)

```bash
npm run prisma:seed
```

Isso criará:
- 2 Tenants (Salão Imperial e Espaço Elegance)
- 3 Usuários (admins e operadores)
- 3 Espaços físicos
- 8 Categorias de eventos (3 com ISS reduzido)
- 4 Clientes de exemplo

### 7. Iniciar o Servidor

```bash
# Modo desenvolvimento (recomendado para testes)
npm run start:dev
```

Você verá:

```
========================================
🚀 FeastFlow API iniciada com sucesso!
📡 Servidor rodando em: http://localhost:3000
🔒 Row Level Security (RLS): ATIVO
🏢 Multi-Tenancy: HABILITADO
💰 Precisão Decimal: Decimal.js
🔄 Concorrência: Otimista (OCC)
📋 Auditoria: Snapshot JSONB
🏛️  Tributação: ISS 2%/5% (SJP/Curitiba)
========================================
```

## ✅ Verificação da Instalação

### Teste 1: Health Check

```bash
curl http://localhost:3000/api/v1/health
```

### Teste 2: Verificar RLS no Banco

```sql
-- Entre no PostgreSQL
psql postgresql://feastflow_user:sua_senha@localhost:5432/feastflow_db

-- Verifique as políticas RLS
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

Deve mostrar políticas `tenant_isolation_policy` para todas as tabelas.

### Teste 3: Criar Token JWT Manualmente (para testes)

Para testar a API, você precisa de um token JWT. Use este script Node.js:

```javascript
// Salve como generate-token.js
const jwt = require('jsonwebtoken');

const payload = {
  tenantId: 1,
  userId: 1,
  email: 'admin@salaoimperial.com.br'
};

const token = jwt.sign(payload, 'sua_chave_jwt_aqui', { expiresIn: '7d' });
console.log('Token JWT:');
console.log(token);
```

Execute:
```bash
node generate-token.js
```

### Teste 4: Criar um Orçamento

```bash
# Use o token gerado acima
curl -X POST http://localhost:3000/api/v1/budgets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -d '{
    "customerId": 1,
    "eventCatalogId": 1,
    "eventDate": "2026-12-31",
    "guestCount": 100,
    "description": "Teste de Orçamento",
    "items": [
      {
        "description": "Locação do Salão",
        "quantity": "1",
        "unitPrice": "5000.00"
      }
    ]
  }'
```

## 🐛 Solução de Problemas

### Erro: "relation does not exist"

**Causa**: Migrações não foram executadas ou schema está desatualizado.

**Solução**:
```bash
npm run prisma:generate
npm run prisma:migrate
```

### Erro: "Tenant context not found"

**Causa**: Token JWT não contém `tenantId` ou middleware não está ativo.

**Solução**: Verifique o token JWT e certifique-se de que contém:
```json
{
  "tenantId": 1,
  "userId": 1
}
```

### Erro: "permission denied for table"

**Causa**: Usuário do banco não tem permissões suficientes.

**Solução**:
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO feastflow_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO feastflow_user;
```

### RLS não está filtrando dados

**Causa**: Usuário tem privilégio `BYPASSRLS` ou é superuser.

**Solução**:
```sql
ALTER ROLE feastflow_user NOSUPERUSER NOBYPASSRLS;
```

### Erro de arredondamento em valores decimais

**Causa**: Usando `number` ao invés de `Decimal`.

**Solução**: Sempre use `@ToDecimal()` nos DTOs e `Decimal.js` no código:
```typescript
import Decimal from 'decimal.js';
const valor = new Decimal('1500.50');
```

## 🚀 Próximos Passos

1. Implementar autenticação completa (módulo Auth)
2. Adicionar guards JWT adequados
3. Implementar testes unitários e e2e
4. Configurar CI/CD
5. Adicionar documentação Swagger/OpenAPI
6. Implementar rate limiting
7. Adicionar logging estruturado (Winston/Pino)
8. Configurar monitoring (Prometheus/Grafana)

## 📚 Recursos Adicionais

- [Documentação do NestJS](https://docs.nestjs.com/)
- [Documentação do Prisma](https://www.prisma.io/docs/)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Decimal.js Documentation](https://mikemcl.github.io/decimal.js/)

## 💡 Dicas de Desenvolvimento

1. **Use Prisma Studio** para visualizar dados:
   ```bash
   npm run prisma:studio
   ```

2. **Monitore logs do PostgreSQL** para debug de RLS:
   ```bash
   tail -f /var/log/postgresql/postgresql-*.log
   ```

3. **Hot reload** funciona automaticamente em modo dev:
   ```bash
   npm run start:dev
   ```

4. **Sempre teste concorrência** ao modificar reservas:
   - Abra duas abas do navegador
   - Tente aprovar o mesmo orçamento simultaneamente
   - Deve resultar em HTTP 409 Conflict

---

**Instalação concluída com sucesso!** 🎉
