import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Criando ou Atualizando Assinante de Teste ---');

  const cnpj = '12345678000190';
  const companyEmail = 'contato@alfaimoveis.com.br';
  const userEmail = 'cliente.teste@renacred.com.br';
  const apiKeySecret = 'rena_live_alfa_9f8e7d6c5b4a3120';

  // 1. Criar ou atualizar empresa
  let company = await prisma.company.findFirst({
    where: {
      OR: [
        { cnpjCpf: cnpj },
        { email: companyEmail }
      ]
    }
  });

  if (!company) {
    company = await prisma.company.create({
      data: {
        cnpjCpf: cnpj,
        razaoSocial: 'Imobiliária Alfa & Associados Ltda',
        nomeFantasia: 'Alfa Imóveis & Crédito',
        email: companyEmail,
        telefone: '(11) 98765-4321',
        endereco: 'Av. Paulista, 1000 - Bela Vista',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01310-100',
        accountType: 'PRE_PAID',
        creditsBalance: 150.00,
        creditLimit: 500.00,
        billingDueDate: 10,
        customQueryPrice: 5.00,
        isActive: true,
      }
    });
    console.log(`✓ Empresa criada: ${company.razaoSocial} (${company.id})`);
  } else {
    company = await prisma.company.update({
      where: { id: company.id },
      data: {
        creditsBalance: 150.00,
        isActive: true,
      }
    });
    console.log(`✓ Empresa atualizada com R$ 150 de saldo: ${company.razaoSocial} (${company.id})`);
  }

  // 2. Criar ou atualizar usuário
  const passwordHash = await bcrypt.hash('Senha123!', 10);
  let user = await prisma.user.findUnique({
    where: { email: userEmail }
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        companyId: company.id,
        name: 'Carlos Eduardo (Alfa Imóveis)',
        email: userEmail,
        password: passwordHash,
        role: 'COMPANY_ADMIN',
        isSuperAdmin: false,
        isActive: true,
      }
    });
    console.log(`✓ Usuário cliente criado: ${user.email} (Senha: Senha123!)`);
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        companyId: company.id,
        password: passwordHash,
        isSuperAdmin: false,
        isActive: true,
      }
    });
    console.log(`✓ Usuário cliente atualizado: ${user.email} (Senha: Senha123!)`);
  }

  // 3. Criar ou atualizar Chave de API
  let apiKey = await prisma.apiKey.findUnique({
    where: { key: apiKeySecret }
  });

  if (!apiKey) {
    apiKey = await prisma.apiKey.create({
      data: {
        companyId: company.id,
        name: 'Chave Produção Alfa Imóveis',
        key: apiKeySecret,
        isActive: true,
        rateLimitMin: 60,
      }
    });
    console.log(`✓ Chave de API criada: ${apiKey.key}`);
  } else {
    apiKey = await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: {
        companyId: company.id,
        isActive: true,
      }
    });
    console.log(`✓ Chave de API reativada: ${apiKey.key}`);
  }

  console.log('\n=============================================');
  console.log('   DADOS DO ASSINANTE DE TESTE RENACRED      ');
  console.log('=============================================');
  console.log(`EMPRESA:       ${company.razaoSocial}`);
  console.log(`CNPJ:          12.345.678/0001-90`);
  console.log(`SALDO PRÉ:     R$ 150,00`);
  console.log(`USUÁRIO:       ${user.email}`);
  console.log(`SENHA:         Senha123!`);
  console.log(`TOKEN / CHAVE: ${apiKey.key}`);
  console.log('=============================================\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
