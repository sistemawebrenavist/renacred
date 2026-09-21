import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

async function seedSuperAdmin() {
  try {
    logger.info('Iniciando seed do Super Admin Renacred...');

    const superAdminEmail = 'wmbrito2@gmail.com';
    const rawPassword = 'kikobelinhawell0110BElinhakikowell0110';

    // 1. Configuração Global de Preços
    const existingPricing = await prisma.pricingConfig.findFirst();
    if (!existingPricing) {
      await prisma.pricingConfig.create({
        data: {
          defaultQueryPrice: 5.00,
          minCreditPurchase: 20.00,
        }
      });
      logger.info('Tabela PricingConfig inicializada com tarifa padrão R$ 5,00.');
    }

    // 2. Verificar ou Criar Empresa Master
    let company = await prisma.company.findFirst({
      where: {
        OR: [
          { email: superAdminEmail },
          { cnpjCpf: '00000000000191' }
        ]
      }
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          cnpjCpf: '00000000000191',
          razaoSocial: 'Renacred Tecnologia & Informações Cartorárias',
          nomeFantasia: 'Renacred Nacional',
          email: superAdminEmail,
          telefone: '11999999999',
          accountType: 'POST_PAID',
          creditsBalance: 0,
          creditLimit: 999999,
          billingDueDate: 10,
          customQueryPrice: 0,
          isActive: true,
        }
      });
      logger.info(`Empresa Master criada com sucesso! ID: ${company.id}`);
    } else {
      logger.info(`Empresa Master já existente: ${company.razaoSocial} (${company.id})`);
    }

    // 3. Verificar ou Criar Usuário Super Admin
    let user = await prisma.user.findUnique({
      where: { email: superAdminEmail }
    });

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    if (!user) {
      user = await prisma.user.create({
        data: {
          companyId: company.id,
          name: 'Wellington',
          email: superAdminEmail,
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          isSuperAdmin: true,
        }
      });
      logger.info(`Super Admin criado com sucesso! E-mail: ${user.email} (ID: ${user.id})`);
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          isSuperAdmin: true,
          role: 'SUPER_ADMIN',
          companyId: company.id,
        }
      });
      logger.info(`Super Admin atualizado com sucesso com as novas credenciais! E-mail: ${user.email}`);
    }

    console.log('\n======================================================');
    console.log('✅ BOOTSTRAP CONCLUÍDO COM SUCESSO!');
    console.log(`👤 Usuário: ${superAdminEmail}`);
    console.log('🔑 Senha: [CONFIGURADA]');
    console.log(`🏢 Empresa: ${company.razaoSocial}`);
    console.log('🛡️  Permissão: Super Administrador (isSuperAdmin: true)');
    console.log('======================================================\n');

    process.exit(0);
  } catch (error: any) {
    logger.error(`Erro ao executar seed do Super Admin: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

seedSuperAdmin();
