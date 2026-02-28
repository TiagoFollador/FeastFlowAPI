import { PrismaClient } from '@prisma/client';
import Decimal from 'decimal.js';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Script de seed para popular o banco de dados com dados de exemplo
 * 
 * IMPORTANTE: Este script roda SEM o AsyncLocalStorage ativo
 * Portanto, desabilita temporariamente o RLS ou cria dados diretamente
 */
async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  // Limpa dados existentes (em ordem de dependência)
  console.log('🗑️  Limpando dados existentes...');
  await prisma.reservation.deleteMany();
  await prisma.budgetItem.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.eventCatalog.deleteMany();
  await prisma.space.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();
  console.log('✓ Dados limpos\n');

  // ========================================
  // TENANTS (Salões de Festas)
  // ========================================
  console.log('🏢 Criando tenants...');
  const tenant1 = await prisma.tenant.create({
    data: {
      name: 'Salão Imperial',
      email: 'contato@salaoimperial.com.br',
      phone: '(41) 3282-1234',
      document: '12.345.678/0001-90',
      address: 'Rua das Flores, 1000',
      city: 'São José dos Pinhais',
      state: 'PR',
      zipCode: '83005-000',
    },
  });

  const tenant2 = await prisma.tenant.create({
    data: {
      name: 'Espaço Elegance',
      email: 'contato@espacoelegance.com.br',
      phone: '(41) 3015-5678',
      document: '98.765.432/0001-10',
      address: 'Av. República Argentina, 2500',
      city: 'Curitiba',
      state: 'PR',
      zipCode: '80240-000',
    },
  });
  console.log(`✓ 2 tenants criados\n`);

  // ========================================
  // USERS (Usuários por Tenant)
  // ========================================
  console.log('👥 Criando usuários...');
  const passwordHash = await bcrypt.hash('senha123', 10);

  // NOTA: Como o RLS está ativo, precisamos executar com $executeRaw
  // ou desabilitar temporariamente o RLS para o seed
  
  await prisma.$executeRawUnsafe(`
    INSERT INTO "User" ("email", "passwordHash", "name", "role", "isActive", "tenantId", "createdAt", "updatedAt")
    VALUES 
      ('admin@salaoimperial.com.br', '${passwordHash}', 'Admin Imperial', 'ADMIN', true, ${tenant1.id}, NOW(), NOW()),
      ('operador@salaoimperial.com.br', '${passwordHash}', 'João Operador', 'OPERATOR', true, ${tenant1.id}, NOW(), NOW()),
      ('admin@espacoelegance.com.br', '${passwordHash}', 'Admin Elegance', 'ADMIN', true, ${tenant2.id}, NOW(), NOW())
  `);
  console.log('✓ 3 usuários criados\n');

  // ========================================
  // SPACES (Espaços Físicos)
  // ========================================
  console.log('🏛️  Criando espaços...');
  await prisma.$executeRawUnsafe(`
    INSERT INTO "Space" ("name", "description", "capacity", "isActive", "basePrice", "tenantId", "createdAt", "updatedAt")
    VALUES 
      ('Salão Principal', 'Salão amplo com pé direito alto, ideal para grandes eventos', 500, true, 5000.0000, ${tenant1.id}, NOW(), NOW()),
      ('Jardim Externo', 'Área externa arborizada com deck', 200, true, 3000.0000, ${tenant1.id}, NOW(), NOW()),
      ('Salão VIP', 'Salão elegante com acabamento premium', 300, true, 8000.0000, ${tenant2.id}, NOW(), NOW())
  `);
  console.log('✓ 3 espaços criados\n');

  // ========================================
  // EVENT CATALOGS (Tipos de Eventos)
  // ========================================
  console.log('🎭 Criando catálogos de eventos...');
  await prisma.$executeRawUnsafe(`
    INSERT INTO "EventCatalog" ("name", "description", "qualifiesForReducedTax", "isActive", "tenantId", "createdAt", "updatedAt")
    VALUES 
      -- Eventos com ISS 5% (padrão)
      ('Casamento', 'Cerimônia de casamento e recepção', false, true, ${tenant1.id}, NOW(), NOW()),
      ('Aniversário', 'Festa de aniversário', false, true, ${tenant1.id}, NOW(), NOW()),
      ('Formatura', 'Festa de formatura', false, true, ${tenant1.id}, NOW(), NOW()),
      
      -- Eventos com ISS 2% (reduzido)
      ('Feira Comercial', 'Feira de exposição e negócios - Qualifica para ISS reduzido', true, true, ${tenant1.id}, NOW(), NOW()),
      ('Congresso Técnico', 'Congresso científico ou técnico - Qualifica para ISS reduzido', true, true, ${tenant1.id}, NOW(), NOW()),
      ('Show Musical', 'Apresentação musical ou cultural - Qualifica para ISS reduzido', true, true, ${tenant1.id}, NOW(), NOW()),
      
      -- Tenant 2
      ('Casamento Premium', 'Casamento com serviços exclusivos', false, true, ${tenant2.id}, NOW(), NOW()),
      ('Evento Corporativo', 'Evento empresarial e networking', false, true, ${tenant2.id}, NOW(), NOW())
  `);
  console.log('✓ 8 catálogos de eventos criados\n');

  // ========================================
  // CUSTOMERS (Clientes)
  // ========================================
  console.log('👤 Criando clientes...');
  await prisma.$executeRawUnsafe(`
    INSERT INTO "Customer" ("name", "email", "phone", "document", "address", "notes", "isActive", "tenantId", "createdAt", "updatedAt")
    VALUES 
      ('Maria Silva', 'maria.silva@email.com', '(41) 99999-1111', '123.456.789-00', 'Rua A, 100', 'Cliente VIP', true, ${tenant1.id}, NOW(), NOW()),
      ('João Santos', 'joao.santos@email.com', '(41) 99999-2222', '987.654.321-00', 'Rua B, 200', null, true, ${tenant1.id}, NOW(), NOW()),
      ('Empresa XYZ Ltda', 'contato@empresa.xyz', '(41) 3000-0000', '11.222.333/0001-44', 'Av. Industrial, 5000', 'Eventos corporativos frequentes', true, ${tenant1.id}, NOW(), NOW()),
      ('Ana Costa', 'ana.costa@email.com', '(41) 99999-3333', '555.666.777-88', 'Rua C, 300', null, true, ${tenant2.id}, NOW(), NOW())
  `);
  console.log('✓ 4 clientes criados\n');

  console.log('✅ Seed concluído com sucesso!');
  console.log('\n📊 Resumo dos dados criados:');
  console.log('   - 2 Tenants (Salões)');
  console.log('   - 3 Usuários');
  console.log('   - 3 Espaços físicos');
  console.log('   - 8 Categorias de eventos (3 com ISS reduzido)');
  console.log('   - 4 Clientes');
  console.log('\n🔐 Credenciais de teste:');
  console.log('   Email: admin@salaoimperial.com.br');
  console.log('   Senha: senha123');
  console.log('   Tenant ID: 1\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
