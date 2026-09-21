# MEMÓRIA OFICIAL DO PROJETO RENACRED

**Última Atualização:** 21/09/2026  
**Status do Projeto:** Em Produção (VPS + Vercel + Cloudflare)  
**Repositório Oficial:** `https://github.com/sistemawebrenavist/renacred.git` (Branch `main`)

---

## 1. Visão Geral do Produto & Arquitetura

O **RENACRED** (Rede Nacional de Proteção ao Crédito) é uma plataforma corporativa e bureau de informações voltada à consulta de **Histórico Imobiliário, Cartórios de Registro de Imóveis e Declarações de Operações Imobiliárias (DOI)** da Receita Federal do Brasil.

* **Frontend:** React 18, TypeScript, Tailwind CSS, Vite, Lucide React, Sonner (Toasts). Hospedado na **Vercel** (`renacred.com.br`).
* **Backend:** Node.js 20, Express, TypeScript, Prisma ORM, Winston Logger, JWT, Bcrypt. Containerizado com Docker na **VPS** (`api.renacred.com.br`).
* **Banco de Dados:** PostgreSQL 16.14 isolado (`renacred_production`).
* **DNS & SSL:** Gerenciado pelo **Cloudflare** com delegação autoritativa no **Registro.br**.
* **Provedor de Dados Oficiais:** **FetchBrasil** API em tempo real (`api=historico_imobiliario`).
* **Gateway de Pagamento:** **InfinityPay** (cobranças via Pix dinâmico para recarga de créditos).

---

## 2. Infraestrutura de Produção na VPS

| Item | Configuração de Produção |
| :--- | :--- |
| **IP do Servidor** | `209.50.245.165` (Ubuntu 24.04 LTS, 64 GB RAM, 66 GB SSD livre) |
| **SSH Host Alias** | `renacred-vps` (porta 22, chave RSA configurada) |
| **Diretório da Aplicação** | `/opt/renacred` |
| **Banco de Dados** | PostgreSQL 16.14 rodando no host (`127.0.0.1:5432`) |
| **Nome da Database** | `renacred_production` (isolado do `infosinistros_production`) |
| **Usuário do Banco** | `infosinistros_user` / Senha: `Infosinistros2025Secure` |
| **Container Docker** | `renacred-api` (Porta interna `3002`, `network_mode: host`, `restart: unless-stopped`) |
| **Reverse Proxy** | OpenResty (Nginx) no container `ic-openresty-H2ty` (Portas 80 e 443) |
| **Config do Nginx** | `/etc/icontainer/apps/openresty/openresty/conf/conf.d/api.renacred.com.br.conf` |

---

## 3. Credenciais do Usuário Super Administrador

Provisionado no banco de dados via script de seed com permissão master global:
* **E-mail:** `wmbrito2@gmail.com`
* **Senha Inicial:** `kikobelinhawell0110BElinhakikowell0110` (armazenada com hash Bcrypt)
* **ID do Usuário:** `ae672903-42b8-43f2-b008-8ac9f24a6a97`
* **Empresa Vinculada:** `Renacred Tecnologia & Informações Cartorárias` (ID: `3c966115-32bb-488b-a2db-c95b7366d47c`)
* **Permissões:** `isSuperAdmin: true`, `role: SUPER_ADMIN` (isenção de cobranças, acesso irrestrito a todos os clientes, logs de API e métricas financeiras).

---

## 4. Domínios, DNS & Vercel

### A. Registro.br & Cloudflare
* **Nameservers no Registro.br:**
  * `anahi.ns.cloudflare.com`
  * `jeremy.ns.cloudflare.com`
* **Registros DNS no Cloudflare:**
  * `renacred.com.br` $\to$ `76.76.21.21` (Vercel)
  * `www.renacred.com.br` $\to$ CNAME Vercel
  * `api.renacred.com.br` $\to$ `209.50.245.165` (VPS)

### B. Variáveis de Ambiente na Vercel (Frontend)
No projeto `renacred` da organização `infosinistros`:
* **Variável:** `VITE_API_URL`
* **Valor:** `https://api.renacred.com.br`
* **Tipo na Vercel:** *Configuração* (obrigatório para variáveis públicas com prefixo `VITE_`)
* **Ambientes:** Produção, Pré-visualização e Desenvolvimento

*Nota de Segurança:* O token da FetchBrasil **nunca** deve ir para a Vercel. Fica guardado exclusivamente no backend na VPS (`/opt/renacred/server/.env`).

---

## 5. Padrões de UI, Estilo & Diretrizes Anti-IA (Impeccable)

A skill de design Impeccable foi aplicada para manter uma identidade visual séria de Autoridade Registral e Cartorária:
1. **Página Inicial (`src/pages/Home.tsx`):**
   * Fundo branco puro, tipografia refinada, sem badges artificiais de IA, cards com orbes fluorescentes ou gradientes vazados.
   * Logotipo transparente em tamanho ampliado (`h-16 sm:h-20`).
   * Botões de ação em Azul Real Notarial (`#1D4ED8`) com ícone funcional `ArrowRight`.
2. **Página de Login (`src/pages/Login.tsx`):**
   * Logotipo centralizado e transparente (`h-16 sm:h-20`).
   * Fundo branco, formulário limpo, resolução de autofill do navegador (fundo branco com texto escuro).
   * Ícones estritamente funcionais (`Eye` e `EyeOff` para revelação de senha).
   * Link discreto de retorno à home posicionado abaixo do formulário.
3. **Eliminação de Diálogos Nativos do Navegador:**
   * Removidos 100% de `window.confirm`, `alert` e `prompt`.
   * Criado o componente [`ConfirmModal.tsx`](file:///c:/Users/Henrique%20-%20PC/Desktop/Projetos%20Dev/Renacred/src/components/ui/ConfirmModal.tsx) com backdrop blur escuro, acessibilidade via tecla `Escape` e estado de processamento assíncrono.

---

## 6. Funcionalidades & CRUDs Implementados

### A. Gestão de Assinantes (`GerenciarClientes.tsx`)
* **Create:** Modal de cadastro completo de novo assinante:
  - Dados da Empresa: CNPJ/CPF, Razão Social, Nome Fantasia, E-mail, Telefone.
  - Parâmetros Comerciais: Pré-pago (com saldo inicial bonificado) ou Pós-pago (com limite de crédito), dia de vencimento (1 a 31) e tarifa personalizada.
  - Administrador Inicial: Criação do usuário gestor da empresa com senha criptografada.
* **Read:** Tabela dinâmica com busca em tempo real por razão social, CNPJ ou e-mail.
* **Update:** Edição de parâmetros comerciais e ajuste manual de saldo com justificativa para auditoria.
* **Delete:** Exclusão segura com `ConfirmModal` (protegendo a empresa Super Admin contra exclusão acidental).

### B. Chaves de API para Integração (`GerenciarApi.tsx`)
* **Create:** Geração de novas chaves de API com IP Whitelist opcional e rate limiting configurável (padrão: 60 req/min).
* **Read:** Listagem de chaves ativas, contagem de chamadas e cópia rápida para clipboard.
* **Delete / Revoke:** Revogação imediata via `ConfirmModal`.

### C. Portal do Desenvolvedor & Documentação (`PortalDevDocs.tsx`)
* Especificação da API REST v1: `POST /v1/imobiliario/historico` e `GET /v1/imobiliario/historico`.
* Exemplos de código prontos para copiar em **cURL, Node.js, Python, PHP e C#**.
* Playground interativo para testar chamadas no painel.

### D. Módulo Financeiro (`ExtratoFinanceiro.tsx`)
* Geração de Pix dinâmico via InfinityPay para recargas de saldo (valor mínimo R$ 20,00).
* Extrato contábil detalhado das consultas debitadas e recargas efetuadas.
* Visualização e fechamento de faturas mensais para assinantes na modalidade pós-paga.

### E. API B2B Externa (`/v1/imobiliario/historico`)
* Autenticação via cabeçalho HTTP `x-api-key`.
* Parâmetros aceitos: `query` ou `documento` (CPF ou CNPJ).
* Validador oficial de dígitos verificadores de CPF e CNPJ (`cpfCnpjValidator.ts`).
* Validação de faturamento B2B em tempo real:
  - Pré-pago: Valida se a empresa possui saldo $\ge$ tarifa da consulta e efetua o débito.
  - Pós-pago: Valida se o consumo acumulado no ciclo não ultrapassou o `creditLimit` e acumula na fatura.
* Conexão direta com a FetchBrasil sem cache (`https://api.fetchbrasil.pro/?token=FB-78C1-9751-7F03-D237&api=historico_imobiliario&query=<doc>`).
* Retorno de dados estruturado com `periodo`, `total_declaracoes`, `declaracoes` (com alienantes, adquirentes e dados do cartório) e metadados `api_central`.
* **Zero resíduos** ou termos de veículos da InfoSinistros no código-fonte.

---

## 7. Comandos de Manutenção na VPS

Para futuras manutenções na VPS (`ssh renacred-vps`):

```bash
# Ver status do container da API
docker ps -f name=renacred-api

# Ver logs em tempo real
docker logs -f renacred-api

# Reiniciar o container
docker restart renacred-api

# Atualizar o código na VPS após novo git push
cd /opt/renacred
git pull origin main
cd /opt/renacred/server
docker compose up -d --build

# Recarregar Nginx OpenResty
docker exec ic-openresty-H2ty nginx -s reload

# Conectar ao banco de dados PostgreSQL
sudo -u postgres psql -d renacred_production
```
