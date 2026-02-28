#!/bin/bash

# ============================================================================
# Script de Setup Automatizado - FeastFlow API
# ============================================================================
# Este script configura automaticamente toda a infraestrutura necessária
# ============================================================================

set -e  # Para na primeira falha

echo "=========================================="
echo "🚀 FeastFlow API - Setup Automatizado"
echo "=========================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para prints coloridos
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo "ℹ $1"
}

# ============================================================================
# 1. Verificar Pré-requisitos
# ============================================================================
echo "📋 Verificando pré-requisitos..."
echo ""

# Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js instalado: $NODE_VERSION"
else
    print_error "Node.js não encontrado! Instale Node.js 18+ primeiro."
    exit 1
fi

# npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm instalado: $NPM_VERSION"
else
    print_error "npm não encontrado!"
    exit 1
fi

# PostgreSQL
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version | awk '{print $3}')
    print_success "PostgreSQL instalado: $PSQL_VERSION"
else
    print_error "PostgreSQL não encontrado! Instale PostgreSQL 14+ primeiro."
    exit 1
fi

echo ""

# ============================================================================
# 2. Instalar Dependências
# ============================================================================
echo "📦 Instalando dependências do projeto..."
echo ""

if [ ! -d "node_modules" ]; then
    npm install
    print_success "Dependências instaladas"
else
    print_warning "node_modules já existe, pulando instalação"
fi

echo ""

# ============================================================================
# 3. Configurar Variáveis de Ambiente
# ============================================================================
echo "⚙️  Configurando variáveis de ambiente..."
echo ""

if [ ! -f ".env" ]; then
    cp .env.example .env
    print_success "Arquivo .env criado a partir de .env.example"
    print_warning "IMPORTANTE: Edite o arquivo .env com suas configurações!"
    print_info "Especialmente: DATABASE_URL e JWT_SECRET"
else
    print_warning ".env já existe, não sobrescrevendo"
fi

echo ""

# ============================================================================
# 4. Configurar PostgreSQL
# ============================================================================
echo "🗄️  Configurando PostgreSQL..."
echo ""

read -p "Deseja criar o banco de dados automaticamente? (s/n): " CREATE_DB

if [ "$CREATE_DB" = "s" ] || [ "$CREATE_DB" = "S" ]; then
    print_info "Criando banco de dados..."
    
    # Solicitar credenciais
    read -p "Nome do banco de dados [feastflow_db]: " DB_NAME
    DB_NAME=${DB_NAME:-feastflow_db}
    
    read -p "Nome do usuário [feastflow_user]: " DB_USER
    DB_USER=${DB_USER:-feastflow_user}
    
    read -sp "Senha do usuário: " DB_PASSWORD
    echo ""
    
    # Criar banco
    psql -U postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || print_warning "Banco já existe"
    
    # Criar usuário
    psql -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || print_warning "Usuário já existe"
    
    # Conceder permissões
    psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
    psql -U postgres -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
    
    print_success "Banco de dados configurado"
    
    # Atualizar .env
    DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME?schema=public"
    sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=\"$DATABASE_URL\"|" .env
    print_success "DATABASE_URL atualizada no .env"
else
    print_warning "Pulando criação do banco. Configure manualmente!"
fi

echo ""

# ============================================================================
# 5. Verificar Segurança do Usuário do Banco
# ============================================================================
echo "🔐 Verificando segurança do usuário do banco..."
echo ""

DB_USER_CHECK=$(grep "DATABASE_URL" .env | cut -d'/' -f3 | cut -d':' -f1)

if [ ! -z "$DB_USER_CHECK" ]; then
    SECURITY_CHECK=$(psql -U postgres -tAc "SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname='$DB_USER_CHECK';")
    
    if [ "$SECURITY_CHECK" = "f" ]; then
        print_success "Usuário do banco está SEGURO (sem BYPASSRLS)"
    else
        print_error "PERIGO! Usuário tem privilégios excessivos!"
        print_warning "Execute: ALTER ROLE $DB_USER_CHECK NOSUPERUSER NOBYPASSRLS;"
    fi
else
    print_warning "Não foi possível verificar segurança (banco não configurado)"
fi

echo ""

# ============================================================================
# 6. Gerar Prisma Client
# ============================================================================
echo "🔨 Gerando Prisma Client..."
echo ""

npm run prisma:generate
print_success "Prisma Client gerado"

echo ""

# ============================================================================
# 7. Executar Migrações
# ============================================================================
echo "📊 Executando migrações do banco..."
echo ""

read -p "Deseja executar as migrações agora? (s/n): " RUN_MIGRATIONS

if [ "$RUN_MIGRATIONS" = "s" ] || [ "$RUN_MIGRATIONS" = "S" ]; then
    npm run prisma:migrate
    print_success "Migrações executadas"
else
    print_warning "Migrações não executadas. Execute: npm run prisma:migrate"
fi

echo ""

# ============================================================================
# 8. Habilitar Row Level Security
# ============================================================================
echo "🔒 Habilitando Row Level Security (RLS)..."
echo ""

read -p "Deseja habilitar RLS agora? (s/n): " ENABLE_RLS

if [ "$ENABLE_RLS" = "s" ] || [ "$ENABLE_RLS" = "S" ]; then
    DATABASE_URL=$(grep "DATABASE_URL" .env | cut -d'=' -f2 | tr -d '"')
    psql "$DATABASE_URL" -f prisma/enable-rls.sql
    print_success "RLS habilitado em todas as tabelas"
else
    print_warning "RLS não habilitado. Execute: psql \$DATABASE_URL -f prisma/enable-rls.sql"
fi

echo ""

# ============================================================================
# 9. Popular com Dados de Exemplo
# ============================================================================
echo "🌱 Populando banco com dados de exemplo..."
echo ""

read -p "Deseja popular o banco com dados de teste? (s/n): " RUN_SEED

if [ "$RUN_SEED" = "s" ] || [ "$RUN_SEED" = "S" ]; then
    npm run prisma:seed
    print_success "Banco populado com dados de exemplo"
    
    echo ""
    print_info "Credenciais de teste criadas:"
    echo "   Email: admin@salaoimperial.com.br"
    echo "   Senha: senha123"
    echo "   Tenant ID: 1"
else
    print_warning "Seed não executado. Execute: npm run prisma:seed"
fi

echo ""

# ============================================================================
# 10. Gerar JWT Secret
# ============================================================================
echo "🔑 Verificando JWT_SECRET..."
echo ""

JWT_SECRET=$(grep "JWT_SECRET" .env | cut -d'=' -f2 | tr -d '"')

if [ "$JWT_SECRET" = "sua_chave_secreta_jwt_aqui_min_256_bits" ]; then
    print_warning "JWT_SECRET usando valor padrão (INSEGURO!)"
    
    read -p "Deseja gerar uma chave segura automaticamente? (s/n): " GEN_JWT
    
    if [ "$GEN_JWT" = "s" ] || [ "$GEN_JWT" = "S" ]; then
        NEW_JWT_SECRET=$(openssl rand -base64 32)
        sed -i.bak "s|JWT_SECRET=.*|JWT_SECRET=\"$NEW_JWT_SECRET\"|" .env
        print_success "Nova JWT_SECRET gerada e salva no .env"
    else
        print_warning "Lembre-se de alterar JWT_SECRET manualmente!"
    fi
else
    print_success "JWT_SECRET já configurada"
fi

echo ""

# ============================================================================
# FINALIZAÇÃO
# ============================================================================
echo "=========================================="
echo "✅ Setup Concluído!"
echo "=========================================="
echo ""

print_success "A infraestrutura da FeastFlow API foi configurada com sucesso!"
echo ""

echo "📋 Próximos passos:"
echo ""
echo "1. Revise o arquivo .env e ajuste as configurações"
echo "2. Inicie o servidor: npm run start:dev"
echo "3. Acesse a API: http://localhost:3000"
echo "4. Leia a documentação:"
echo "   - README.md (visão geral)"
echo "   - INSTALLATION.md (detalhes de instalação)"
echo "   - ARCHITECTURE.md (arquitetura técnica)"
echo "   - EXAMPLES.md (exemplos de uso)"
echo ""

print_info "Para iniciar o servidor agora, execute:"
echo "   npm run start:dev"
echo ""

print_warning "IMPORTANTE: Revise as configurações de segurança antes de ir para produção!"
echo ""

echo "=========================================="
echo "🎉 Boa sorte com o FeastFlow!"
echo "=========================================="
