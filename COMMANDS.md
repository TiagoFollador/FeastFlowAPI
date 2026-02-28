# Comandos Úteis - FeastFlow API

Referência rápida de comandos para desenvolvimento e manutenção.

## 🚀 Desenvolvimento

```bash
# Iniciar servidor em modo desenvolvimento (hot reload)
npm run start:dev

# Iniciar em modo debug
npm run start:debug

# Build para produção
npm run build

# Iniciar em produção
npm run start:prod
```

## 🗄️ Banco de Dados (Prisma)

```bash
# Gerar Prisma Client (após alterar schema)
npm run prisma:generate

# Criar nova migração
npx prisma migrate dev --name nome_da_migracao

# Aplicar migrações em produção
npx prisma migrate deploy

# Resetar banco (CUIDADO: apaga todos os dados)
npx prisma migrate reset

# Abrir Prisma Studio (GUI para o banco)
npm run prisma:studio

# Popular banco com dados de exemplo
npm run prisma:seed

# Validar schema
npx prisma validate

# Formatar schema
npx prisma format
```

## 🔒 Row Level Security

```bash
# Habilitar RLS (após migrações)
psql $DATABASE_URL -f prisma/enable-rls.sql

# Verificar políticas ativas
psql $DATABASE_URL -c "SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public';"

# Verificar segurança do usuário
psql -U postgres -c "SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'feastflow_user';"

# Remover privilégios perigosos
psql -U postgres -c "ALTER ROLE feastflow_user NOSUPERUSER NOBYPASSRLS;"
```

## 🧪 Testes

```bash
# Executar todos os testes
npm run test

# Testes em modo watch
npm run test:watch

# Testes com coverage
npm run test:cov

# Testes e2e
npm run test:e2e

# Testes com debug
npm run test:debug
```

## 🎨 Formatação e Lint

```bash
# Formatar código
npm run format

# Executar linter
npm run lint

# Fixar problemas de lint automaticamente
npm run lint -- --fix
```

## 🔍 Debug e Inspeção

```bash
# Ver estrutura do banco
psql $DATABASE_URL -c "\dt"

# Ver colunas de uma tabela
psql $DATABASE_URL -c "\d \"Budget\""

# Testar RLS manualmente
psql $DATABASE_URL
# Dentro do psql:
SET app.current_tenant_id = '1';
SELECT * FROM "Budget";

# Ver logs do PostgreSQL (Linux)
sudo tail -f /var/log/postgresql/postgresql-*.log

# Ver logs do PostgreSQL (Mac)
tail -f /usr/local/var/log/postgres.log

# Monitorar conexões ativas
psql $DATABASE_URL -c "SELECT pid, usename, application_name, client_addr, state FROM pg_stat_activity WHERE datname = 'feastflow_db';"
```

## 📊 Performance

```bash
# Analisar query lenta
psql $DATABASE_URL
# Dentro do psql:
EXPLAIN ANALYZE SELECT * FROM "Budget" WHERE "status" = 'APPROVED';

# Ver índices de uma tabela
psql $DATABASE_URL -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'Budget';"

# Ver tamanho das tabelas
psql $DATABASE_URL -c "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC;"

# Limpar cache do Prisma
rm -rf node_modules/.prisma
npm run prisma:generate
```

## 🐳 Docker (Opcional)

```bash
# Criar imagem
docker build -t feastflow-api .

# Rodar container
docker run -p 3000:3000 --env-file .env feastflow-api

# Docker Compose (se configurado)
docker-compose up -d
docker-compose logs -f
docker-compose down
```

## 🔐 Segurança

```bash
# Gerar JWT secret seguro
openssl rand -base64 32

# Gerar hash de senha (bcrypt)
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('senha123', 10, (err, hash) => console.log(hash));"

# Verificar variáveis de ambiente
cat .env | grep -v "^#" | grep -v "^$"

# Auditoria de dependências
npm audit

# Corrigir vulnerabilidades
npm audit fix
```

## 📦 Deploy

```bash
# Build otimizado
npm run build

# Verificar tamanho do build
du -sh dist/

# Comprimir para deploy
tar -czf feastflow-api.tar.gz dist/ node_modules/ package.json .env.example

# Instalar apenas dependências de produção
npm ci --only=production
```

## 🔄 Git

```bash
# Status
git status

# Adicionar arquivos
git add .

# Commit
git commit -m "feat: implementa módulo de orçamentos"

# Push
git push origin main

# Ver histórico
git log --oneline --graph --decorate

# Criar branch
git checkout -b feature/nova-funcionalidade
```

## 📝 Logs

```bash
# Ver logs em tempo real (desenvolvimento)
# Os logs já aparecem automaticamente com npm run start:dev

# Ver logs do PM2 (produção)
pm2 logs feastflow-api

# Ver últimas 100 linhas
pm2 logs feastflow-api --lines 100

# Limpar logs
pm2 flush
```

## 🛠️ Manutenção

```bash
# Atualizar dependências (verificar primeiro)
npm outdated
npm update

# Atualizar Prisma
npm install @prisma/client@latest prisma@latest

# Atualizar NestJS
npm install @nestjs/core@latest @nestjs/common@latest

# Limpar cache do npm
npm cache clean --force

# Limpar tudo e reinstalar
rm -rf node_modules package-lock.json
npm install

# Verificar integridade do banco
psql $DATABASE_URL -c "VACUUM ANALYZE;"
```

## 🔧 Troubleshooting

```bash
# Erro: "Relation does not exist"
npm run prisma:generate
npm run prisma:migrate

# Erro: "Permission denied"
psql -U postgres -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO feastflow_user;"

# Erro: "Port 3000 already in use"
lsof -ti:3000 | xargs kill -9

# Erro: "Cannot find module"
rm -rf node_modules
npm install

# RLS não funciona
psql $DATABASE_URL -c "SELECT rolname, rolbypassrls FROM pg_roles WHERE rolname = 'seu_usuario';"
# Se rolbypassrls = true:
psql -U postgres -c "ALTER ROLE seu_usuario NOBYPASSRLS;"

# Erro de Decimal
# Sempre use new Decimal('1500.50') com string, não number
```

## 📱 Testar API

```bash
# Health check
curl http://localhost:3000/api/v1/health

# Com token
TOKEN="seu_token_aqui"
curl http://localhost:3000/api/v1/budgets \
  -H "Authorization: Bearer $TOKEN"

# POST com body
curl -X POST http://localhost:3000/api/v1/budgets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"customerId": 1, ...}'

# Com jq para formatar JSON
curl http://localhost:3000/api/v1/budgets | jq

# Salvar resposta em arquivo
curl http://localhost:3000/api/v1/budgets > response.json
```

## 🎯 Atalhos Personalizados

Adicione ao seu `.bashrc` ou `.zshrc`:

```bash
# Atalhos FeastFlow
alias ff-start="npm run start:dev"
alias ff-studio="npm run prisma:studio"
alias ff-migrate="npm run prisma:migrate"
alias ff-seed="npm run prisma:seed"
alias ff-rls="psql \$DATABASE_URL -f prisma/enable-rls.sql"
alias ff-test="npm run test:watch"
alias ff-logs="tail -f logs/app.log"
```

## 📚 Documentação

```bash
# Abrir README
cat README.md | less

# Abrir documentação de arquitetura
cat ARCHITECTURE.md | less

# Abrir exemplos
cat EXAMPLES.md | less

# Buscar na documentação
grep -r "Row Level Security" *.md
```

## 💡 Dicas

```bash
# Usar variáveis do .env no terminal
export $(cat .env | xargs)
echo $DATABASE_URL

# Gerar token JWT manualmente
node -e "const jwt = require('jsonwebtoken'); console.log(jwt.sign({tenantId:1,userId:1}, process.env.JWT_SECRET));"

# Verificar conexões do banco
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Backup do banco
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restaurar backup
psql $DATABASE_URL < backup_20260227.sql
```

---

**Mantenha este arquivo à mão para referência rápida!** 🚀
