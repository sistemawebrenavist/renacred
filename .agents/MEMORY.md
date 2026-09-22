# MEMÓRIA OFICIAL DO PROJETO RENACRED

**Última Atualização:** 22/09/2026  
**Status do Projeto:** Em Produção (VPS + Vercel + Cloudflare)  
**Repositório Oficial:** `https://github.com/sistemawebrenavist/renacred.git` (Branch `main`)

---

## 1. Visão Geral do Produto & Arquitetura

O **RENACRED** (Rede Nacional de Proteção ao Crédito) é uma plataforma corporativa e bureau de informações voltada à consulta de **Histórico Imobiliário, Cartórios de Registro de Imóveis e Declarações de Operações Imobiliárias (DOI)** da Receita Federal do Brasil.

* **Frontend:** React 18, TypeScript, Tailwind CSS, Vite, Lucide React, Sonner (Toasts). Hospedado na **Vercel** (`renacred.com.br`).
* **Backend:** Node.js 20, Express, TypeScript, Prisma ORM, Winston Logger, JWT, Bcrypt. Containerizado com Docker na **VPS** (`api.renacred.com.br`).
* **Banco de Dados:** PostgreSQL 16.14 isolado (`renacred_production`) no host VPS.
* **DNS & SSL:** Gerenciado pelo **Cloudflare** com delegação autoritativa no **Registro.br**.
* **Provedor de Dados Oficiais:** **FetchBrasil** API em tempo real (`api=historico_imobiliario`).
* **Gateway de Pagamento:** **InfinityPay** (cobranças via Pix dinâmico para recarga de créditos e faturas pós-pagas).

---

## 2. Infraestrutura de Produção na VPS

| Item | Configuração de Produção |
| :--- | :--- |
| **IP do Servidor** | `209.50.245.165` (Ubuntu 24.04 LTS, 64 GB RAM, 66 GB SSD livre) |
| **SSH Host Alias** | `renacred-vps` (porta 22, chave RSA configurada) |
| **Diretório da Aplicação** | `/opt/renacred` |
| **Script de Deploy** | `/opt/renacred/deploy.sh` (executável: `chmod +x deploy.sh && ./deploy.sh`) |
| **Banco de Dados** | PostgreSQL 16.14 rodando no host (`127.0.0.1:5432`) |
| **Nome da Database** | `renacred_production` (isolado de `infosinistros_production`) |
| **Usuário do Banco** | `infosinistros_user` / Senha: `Infosinistros2025Secure` |
| **Container Docker** | `renacred-api` (Porta interna `3002`, `network_mode: host`, `restart: unless-stopped`) |
| **Reverse Proxy** | OpenResty (Nginx) no container `ic-openresty-H2ty` (Portas 80 e 443) |
| **Config do Nginx** | `/etc/icontainer/apps/openresty/openresty/conf/conf.d/api.renacred.com.br.conf` |

---

## 3. Contas & Credenciais em Produção

### A. Super Administrador (Wellington)
* **E-mail:** `wmbrito2@gmail.com`
* **ID do Usuário:** `ae672903-42b8-43f2-b008-8ac9f24a6a97`
* **Empresa Vinculada:** `Renacred Tecnologia & Informações Cartorárias` (ID: `3c966115-32bb-488b-a2db-c95b7366d47c`)
* **Chave Master:** `rena_live_testmaster001`
* **Permissões:** `isSuperAdmin: true`, `role: SUPER_ADMIN` (gestão total, isenção de custos em consultas de teste, acesso irrestrito ao painel `/admin`).

### B. Assinante de Demonstração (Alfa Imóveis)
* **E-mail:** `cliente.teste@renacred.com.br` / Senha: `Senha123!`
* **Empresa:** `Imobiliária Alfa & Associados Ltda` (CNPJ: `12.345.678/0001-90`)
* **Plano:** Pré-pago (Recargas de saldo)
* **Token de API:** `rena_live_alfa_9f8e7d6c5b4a3120`

### C. Assinante Credlocaliza (Marlon)
* **E-mail:** `marlon@credlocaliza.com.br` / Senha: `marlon1234`
* **Empresa:** `Credlocaliza Serviços de Apoio Administrativo Ltda` (CNPJ: `21.461.641/0001-13`)
* **Plano:** Pós-pago (Faturamento mensal, vencimento dia 10)
* **Token de API:** `rena_live_91e35c10ee746bf9df69063944a2c82cb2f263a43edabf03`

---

## 4. Integração com o Provedor FetchBrasil

### A. Causa Raiz do Erro 403 e Solução Definitiva
* **Problema:** Ao realizar consultas de imóveis para `api.fetchbrasil.pro`, o Node.js no Linux (Docker) selecionava preferencialmente IPv6 (`2604:9a00:1:116:1c00:50ff:fe00:e3e`). Como o suporte da FetchBrasil liberou apenas o IPv4 da VPS (`209.50.245.165`) na whitelist do Cloudflare WAF, qualquer chamada em IPv6 era bloqueada com HTTP 403.
* **Solução Implementada:** No `server/src/services/fetchbrasil.service.ts`, configurou-se explicitamente `family: 4` no `https.Agent`:
  ```typescript
  this.client = axios.create({
    baseURL: this.apiURL,
    timeout: 15000,
    httpsAgent: new https.Agent({ keepAlive: true, family: 4 }),
    proxy: proxyConfig,
    ...
  });
  ```
* **Resultado:** Todas as consultas agora saem obrigatoriamente pelo IPv4 whitelisted `209.50.245.165`, alcançando **100% de sucesso (HTTP 200)** e retornando as declarações completas.

### B. Regra de Consulta Sem Dados = Custo Zero
* Quando uma pesquisa retorna `total_declaracoes === 0` (nenhuma declaração cartorária encontrada para o documento):
  * **Custo Debitado:** R$ 0,00 (`custo_debitado: 0`).
  * **Saldo Pré-pago:** Não sofre débito.
  * **Fatura Pós-paga:** Não acumula custo.
  * **Payload:** Retorna HTTP 200 estruturado com `total_declaracoes: 0` e `declaracoes: []`.

---

## 5. API Pública Externa de Desenvolvedores (Padrão FetchBrasil)

O cliente assinante pode realizar consultas via GET direto no navegador ou via backend, exatamente no mesmo padrão que utilizava na FetchBrasil:

```text
GET https://api.renacred.com.br/v1/imobiliario/historico?token={TOKEN}&query={DOCUMENTO}
```

### A. Parâmetros Flexíveis Aceitos
* **Token:**
  * Query param: `?token=...`, `?api_key=...`, `?key=...`
  * Header HTTP: `Authorization: Bearer <token>` ou `x-api-key: <token>`
* **Documento:**
  * Query param: `?query=...`, `?documento=...`, `?cpf=...`, `?cnpj=...` (com ou sem formatação)

### B. Rotas com Fallback Mapeadas
* `/v1/imobiliario/historico`
* `/v1/imobiliario`
* `/v1`
* `/api/v1/...`
* `/?token=...&query=...` (requisições na raiz do domínio da API direcionam automaticamente para a consulta)

---

## 6. Regras de Cobrança, Elegibilidade & Inadimplência

No `server/src/services/billing.service.ts`:
1. **Empresa Bloqueada:** Rejeita com HTTP 403 caso `company.isActive === false`.
2. **Inadimplência Pós-paga:** Bloqueia automaticamente com HTTP 402 (`INVOICE_OVERDUE`) caso o cliente possua qualquer fatura em aberto com status `OVERDUE` (vencida).
3. **Limite Operacional:** Bloqueia caso o consumo acumulado do ciclo exceda o `creditLimit` da empresa.
4. **Saldo Pré-pago:** Rejeita caso o saldo em conta seja inferior ao valor da consulta (`effectivePrice`).

---

## 7. Estrutura dos Portais (Separação Rígida)

### A. Portal Administrativo (`/admin/*`)
* `DashboardAdmin.tsx`: Visão analítica com contagem de consultas, faturamento acumulado e histórico de consultas apenas de clientes reais (excluindo a empresa controladora do SuperAdmin para não inflar as métricas).
* `GerenciarClientes.tsx`: CRUD completo de clientes:
  * **Alinhamento dos Ícones:** 4 botões de ação (Chaves de API, Configurar Plano, Ajustar Saldo, Excluir) dispostos em linha única horizontal sem quebra (`flex-nowrap`, `min-w-[165px]`, `whitespace-nowrap`).
  * **Acesso API na Tabela:** Exibe o token ativo com badge e botão de cópia, e **logo abaixo renderiza a URL de produção completa** (`https://api.renacred.com.br/v1/imobiliario/historico?token=...&query=DOCUMENTO`) com botão de cópia rápida.
  * **Modal Pós-Cadastro:** Ao salvar novo cliente, exibe modal de sucesso com as credenciais do admin, token gerado e botão para copiar todos os dados formatados para WhatsApp/E-mail.
* `ConfiguracoesAdmin.tsx`: Parâmetros comerciais globais da plataforma.
* `AuditoriaApi.tsx`: Logs detalhados de requisições de API com filtros de status e tempo de resposta.

### B. Portal do Assinante (`/*`)
* `Header.tsx`: Navbar responsivo exibindo o **badge de identificação do usuário logado** (ex: avatar/ícone `User`, nome `Marlon` e tag `Assinante`, com link direto para `/configuracoes`), exatamente como no painel administrativo do Wellington. Para contas pré-pagas exibe o saldo com atalho de recarga; para contas pós-pagas mantém o visual limpo e minimalista sem poluição visual.
* `Sidebar.tsx`: Navegação enxuta com 6 itens unificados (Visão Geral, Consultar Imóvel, Minha Assinatura, Chaves de Acesso, Guia de Integração e Configurações).
* `DashboardCliente.tsx`: Painel com resumo de consumo, links rápidos e consulta em tempo real.
* `ConsultarImobiliario.tsx`: Formulário completo de consulta cartorária com visualização e exportação de laudos.
* `MinhaAssinatura.tsx` (Unificada): Fusão completa de Extrato Financeiro e Assinatura em uma única tela de alta usabilidade:
  * **Métricas Principais:** Modalidade (Pré/Pós-pago), Tarifa Unitária (R$ 5,00), Saldo/Limite de Crédito e Vencimento Mensal.
  * **Painel de Consumo em Tempo Real:** Barra de progresso de uso do limite contratado e previsão de fatura para contas pós-pagas.
  * **Aba 1 (Extrato de Consumo & Saldo):** Tabela detalhada de transações (débito de consultas com data/hora e saldo após, e créditos/recargas Pix confirmadas).
  * **Aba 2 (Faturas Mensais):** Tabela de faturas por competência, status (Paga, Em Aberto, Vencida) e botão de pagamento Pix direto via InfinityPay.
  * **Aba 3 (Regras & Dados do Plano):** Resumo cadastral, regras de faturamento e botão de WhatsApp para negociação de volume/upgrade de limite.
  * **Modal de Recarga Pix Integrado:** Modal instantâneo para compra de pacotes de crédito (R$ 50, R$ 100, R$ 250 ou valor livre a partir de R$ 20).
  * *Compatibilidade:* Rotas `/extrato` e `/pagamento/sucesso` redirecionam suavemente para `/minha-assinatura`.
* `GerenciarApi.tsx`: Chaves de API, IP whitelist e testador interativo ao vivo.
* `ConfiguracoesCliente.tsx`: Dados da empresa, responsáveis e alteração de senha.
* `PortalDevDocs.tsx`: Documentação técnica completa e SDK em 5 linguagens.

---

## 8. Procedimento de Deploy e Manutenção

Para realizar novas atualizações:

1. **Compilação e Commit local:**
   ```bash
   npm run build && npm --prefix server run build
   git add . && git commit -m "feat/fix: descricao"
   git push origin main
   ```

2. **Deploy na VPS (Execução remota):**
   ```bash
   ssh -n -o StrictHostKeyChecking=no root@209.50.245.165 "chmod +x /opt/renacred/deploy.sh && /opt/renacred/deploy.sh"
   ```

3. **Verificação de Saúde (Healthcheck):**
   ```bash
   curl -s http://127.0.0.1:3002/health
   # Resposta esperada: {"status":"online","app":"Renacred API",...}
   ```
