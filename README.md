# RENACRED - Plataforma & API de Histórico Imobiliário e Cartórios

Plataforma B2B para consultas de **Histórico Imobiliário (DOI e Serventias Cartorárias)** via API REST e Painel Web, com faturamento pré-pago e pós-pago, integração com **FetchBrasil**, gateway de pagamentos **InfinityPay**, e hospedagem na mesma VPS compartilhando a instância do PostgreSQL com 100% de isolamento de dados.

---

## 📁 Arquitetura do Diretório

```
Renacred/
├── index.html                   # HTML base com tipografia Plus Jakarta Sans
├── package.json                 # Dependências e scripts do Frontend SPA
├── vite.config.ts               # Build do frontend com proxy para o backend (:3002)
├── tailwind.config.ts           # Design system com cores personalizadas Renacred
├── postcss.config.js            # Processamento de estilos Tailwind
├── tsconfig.json                # Configuração TypeScript do Frontend
├── ecosystem.config.cjs         # Configuração PM2 para execução na porta 3002 na VPS
├── nginx-renacred.conf          # Template Nginx para renacred.com.br e api.renacred.com.br
├── .env.example                 # Exemplo de variáveis de ambiente do Frontend
├── .gitignore                   # Arquivos ignorados pelo controle de versão
│
├── server/                      # BACKEND API (Node.js + Express + Prisma)
│   ├── package.json             # Dependências e scripts do backend
│   ├── tsconfig.json            # Configuração TypeScript NodeNext
│   ├── .env.example             # Variáveis de ambiente do servidor
│   ├── prisma/
│   │   └── schema.prisma        # Modelagem do banco isolado (renacred_production)
│   ├── scripts/
│   │   └── setup-db.sql         # Script SQL para criar renacred_production na VPS
│   └── src/
│       ├── index.ts             # Ponto de entrada Express (porta 3002)
│       ├── config/
│       │   └── database.ts      # Singleton do PrismaClient
│       ├── controllers/
│       │   ├── authController.ts         # Login e perfil de usuário
│       │   ├── imobiliarioController.ts  # Consulta Web e rota pública da API v1
│       │   ├── paymentController.ts       # Recargas de créditos e faturas
│       │   ├── webhookController.ts       # Webhook da InfinityPay
│       │   ├── apiKeyController.ts        # Gestão de tokens de API
│       │   └── adminController.ts         # Gestão de empresas, preços e faturas
│       ├── middlewares/
│       │   ├── authMiddleware.ts         # Verificação JWT e SuperAdmin
│       │   └── apiKeyMiddleware.ts       # Autenticação externa via x-api-key e Rate Limit
│       ├── routes/
│       │   ├── authRoutes.ts
│       │   ├── imobiliarioRoutes.ts
│       │   ├── paymentRoutes.ts
│       │   ├── webhookRoutes.ts
│       │   ├── apiKeyRoutes.ts
│       │   ├── adminRoutes.ts
│       │   └── v1Routes.ts               # POST /v1/imobiliario/historico
│       ├── services/
│       │   ├── fetchbrasil.service.ts    # Consumo da FetchBrasil (sem cache)
│       │   ├── billing.service.ts        # Motor de débitos, ciclos e pós-pago
│       │   └── infinitypay.service.ts    # Checkout Pix InfinityPay
│       └── utils/
│           ├── logger.ts                 # Winston Logger formatado
│           └── cpfCnpjValidator.ts       # Sanitização e validação de CPF e CNPJ
│
└── src/                         # FRONTEND SPA (React 18 + Vite + Tailwind)
    ├── main.tsx                 # Montagem React, Toaster e AuthProvider
    ├── App.tsx                  # Rotas públicas, protegidas e de administrador
    ├── globals.css              # Estilos globais e paleta escura moderna
    ├── contexts/
    │   └── AuthContext.tsx      # Estado global de autenticação e saldo
    ├── services/
    │   └── api.ts               # Instância Axios com injeção automática de JWT
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.tsx      # Menu lateral com links do cliente e admin
    │   │   ├── Header.tsx       # Barra de topo com indicador de saldo ou fatura
    │   │   └── AppLayout.tsx    # Layout unificado da aplicação
    │   └── imobiliario/
    │       ├── DeclaracaoCard.tsx    # Visualização de declarações DOI e partes
    │       ├── ExportPdfButton.tsx   # Geração de laudo em PDF estruturado
    │       └── ExportExcelButton.tsx # Exportação de planilha Excel XLSX
    └── pages/
        ├── Login.tsx            # Login seguro de clientes e administradores
        ├── assinante/
        │   ├── DashboardCliente.tsx    # Visão geral de saldo e busca rápida
        │   ├── ConsultarImobiliario.tsx # Consulta completa CPF/CNPJ com resultados
        │   ├── ExtratoFinanceiro.tsx   # Recarga Pix InfinityPay e faturas do ciclo
        │   ├── GerenciarApi.tsx        # Geração e revogação de tokens de API
        │   └── PortalDevDocs.tsx       # Documentação FECHADA com playground interativo
        └── admin/
            ├── DashboardAdmin.tsx      # Métricas de faturamento e volume global
            ├── GerenciarClientes.tsx   # Edição de Pré/Pós-pago, vencimento e preço
            ├── ConsultaSuperAdmin.tsx  # Consulta livre sem tarifação de créditos
            └── LogsApi.tsx             # Monitoramento de requisições em tempo real
```

---

## ⚙️ Regras de Negócio Implementadas

1. **Cobrança Pré-paga**: O cliente adquire pacotes de créditos via Pix pela InfinityPay e consome por consulta.
2. **Cobrança Pós-paga**: O cliente possui um limite de crédito e tem suas consultas acumuladas até a data de vencimento configurada (`billingDueDate`).
3. **Preço por Consulta Editável**: O administrador pode definir um preço customizado por consulta individualmente para cada empresa no painel (ex: R$ 4,50), com fallback para o preço padrão (R$ 5,00).
4. **Sem Planos Mensais**: Não existem mensalidades fixas recorrentes; o cliente paga estritamente pelo que consome.
5. **Sem Cache**: Todas as requisições consultam a API da FetchBrasil em tempo real para obter a posição cadastral mais recente do imóvel e cartório.
6. **Documentação Fechada**: Acessível apenas para usuários autenticados dentro de `/docs`, com exemplos em 5 linguagens de programação (cURL, Node.js, Python, PHP, C#).

---

## 🚀 Como Executar em Desenvolvimento

### 1. Backend:
```bash
cd server
npm install
npx prisma generate
npm run dev
```
O servidor backend iniciará em `http://localhost:3002`.

### 2. Frontend:
```bash
npm install
npm run dev
```
O frontend iniciará em `http://localhost:5173`.

---

## 🌐 Deploy na Mesma VPS (Coexistência com InfoSinistros)

1. **Criar Banco no PostgreSQL**:
   ```bash
   psql -U infosinistros_user -h localhost -d postgres -c "CREATE DATABASE renacred_production;"
   ```
2. **Executar Migrações Prisma**:
   ```bash
   cd server
   npx prisma migrate deploy
   npm run seed
   ```
3. **Iniciar Backend com PM2**:
   ```bash
   pm2 start ecosystem.config.cjs
   pm2 save
   ```
4. **Configurar Nginx**:
   - Copiar `nginx-renacred.conf` para `/etc/nginx/sites-available/renacred.conf`
   - Criar link simbólico: `ln -s /etc/nginx/sites-available/renacred.conf /etc/nginx/sites-enabled/`
   - Testar e recarregar: `nginx -t && systemctl reload nginx`
   - Emitir certificados SSL com Certbot:
     ```bash
     certbot --nginx -d renacred.com.br -d www.renacred.com.br -d api.renacred.com.br
     ```
