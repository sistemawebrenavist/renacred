# Plano de Implementação — Produto E17: Busca por Nome Completo (Localizador de CPF)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar o novo produto oficial **E17 - Busca por Nome Completo** na Renacred, permitindo localizar CPFs, filiação, datas de nascimento e homônimos a partir do nome civil completo via provedor FetchBrasil (`api=nome_basico`), com custo de R$ 0,03 e venda a R$ 1,32, laudo pericial executivo e regra de custo zero se 0 registros.

**Architecture:** O backend se comunicará com o endpoint `nome_basico` da FetchBrasil através do serviço centralizado `fetchbrasil.service.ts` com fallback e keep-alive. O controlador unificado `consultaUnificadaController.ts` receberá requisições web (`/api/consultas/e17`) e de API externa (`/v1/e17` e `/v1/nome-completo`), validará saldo, debitará R$ 1,32 apenas se houver resultados e gravará os dados em `prisma.query` e `prisma.apiLog`. O frontend exibirá o produto no catálogo (17 produtos), com campo de entrada dedicado a nomes no Hub e renderizará um laudo executivo com lista de homônimos e botão para saltar diretamente para a consulta de CPF (E13/E15/E1).

**Tech Stack:** Node.js, Express, TypeScript, Prisma ORM, React 18, Tailwind CSS, Lucide Icons, FetchBrasil API.

---

## Global Constraints

- **Preço de Custo:** Rigorosamente **R$ 0,03**
- **Preço de Venda Padrão:** Rigorosamente **R$ 1,32** (com suporte a customização por empresa)
- **Garantia Renacred (Custo Zero):** Se `RESULTADOS` vier vazio ou nenhum registro for localizado, o débito é estritamente **R$ 0,00**
- **Formato do Input:** Nome completo (texto livre, validação de pelo menos 2 palavras e 5 caracteres)
- **Design de Impressão:** Conforme `pdf-report-designer` e regras de `@media print`, o laudo gerado para E17 deve imprimir em largura total sem sidebar e sem cabeçalhos de sistema.

---

## Review Focus

1. **Homônimos Múltiplos:** A API pode retornar 1, 2 ou dezenas de homônimos para nomes comuns. O laudo deve paginar ou agrupar os resultados de forma limpa e permitir ordenar/filtrar.
2. **Campos Opcionais (`NOME_MAE` nulo):** No retorno analisado da FetchBrasil, alguns registros possuem `NOME_MAE: null`. A UI e o normalizador devem exibir `Não informado` ou `-` sem quebrar.
3. **Cálculo de Idade:** O campo `NASC` vem no formato `AAAA-MM-DD 00:00:00.000`. O sistema deve extrair `DD/MM/AAAA` e calcular a idade em anos automaticamente.
4. **Navegação com 1 Clique (Ação Rápida):** Ao encontrar o CPF desejado no resultado do E17, o usuário deve ter um botão rápido para abrir o Hub com aquele CPF já pré-preenchido em E13 (CPF Básico), E15 (CPF Completo) ou E1 (Imobiliário).
5. **Permissões de Chaves de API de Clientes:** Empresas com acesso a `ALL` devem receber acesso imediato ao E17; empresas com produtos restritos devem poder ter o E17 liberado no painel administrativo.

---

## Tarefas de Implementação

### Tarefa 1: Integração com Provedor no Backend (FetchBrasil)
**Arquivos:**
- Modificar: `server/src/services/fetchbrasil.service.ts`
- Modificar: `server/src/services/productNormalizers.ts`

- [ ] **Passo 1.1:** Adicionar método `consultarNomeBasico(nome: string)` em `fetchbrasilService` chamando `?token=...&api=nome_basico&query=${encodeURIComponent(nome)}`.
- [ ] **Passo 1.2:** Tratar resposta: mapear `RESULTADOS` (array com `NOME`, `CPF`, `SEXO`, `NOME_MAE`, `NASC`).
- [ ] **Passo 1.3:** Criar normalizador `normalizeE17NomeBasico(raw: any, query: string)` em `productNormalizers.ts`:
  - Contagem total de registros localizados
  - Formatação de CPF (`000.000.000-00`)
  - Formatação de Data de Nascimento (`DD/MM/AAAA`)
  - Cálculo de idade
  - Padronização de Sexo (`M` -> Masculino, `F` -> Feminino).
- [ ] **Passo 1.4:** Testar localmente com chamada direta ao serviço.

---

### Tarefa 2: Roteamento & Controlador Unificado
**Arquivos:**
- Modificar: `server/src/controllers/consultaUnificadaController.ts`
- Modificar: `server/src/routes/consultasRoutes.ts`
- Modificar: `server/src/routes/apiRoutes.ts`

- [ ] **Passo 2.1:** Registrar mapeamento de produto em `consultaUnificadaController.ts`:
  - Código: `E17`
  - Slug: `nome-completo` / `busca-nome`
  - Custo base: 0.03
  - Preço padrão: 1.32
  - Categoria: `cadastral`
- [ ] **Passo 2.2:** Adicionar validação de entrada para tipo `nome` (mínimo de 2 palavras, impedindo buscas vazias de 1 única letra).
- [ ] **Passo 2.3:** Aplicar regra de cobrança: se `total_registros === 0`, custo 0,00.
- [ ] **Passo 2.4:** Expor rotas:
  - Web: `POST /api/consultas/e17`
  - API Pública de Clientes: `GET /v1/e17?token=...&query=...` e `GET /v1/nome-completo?token=...&query=...`
- [ ] **Passo 2.5:** Executar `npm run build` na pasta `server` e verificar ausência de erros de tipagem.

---

### Tarefa 3: Catálogo Frontend & Tipagem
**Arquivos:**
- Modificar: `src/config/productsCatalog.ts`
- Modificar: `src/utils/masks.ts`

- [ ] **Passo 3.1:** Em `src/config/productsCatalog.ts`:
  - Atualizar `ProductInputType` para incluir `'nome'`.
  - Incrementar contadores em `CATEGORIES_CONFIG` (Total: 17 produtos, Cadastral: 6 produtos).
  - Adicionar a definição completa do **E17**:
    ```ts
    {
      code: 'E17',
      slug: 'busca-nome',
      name: 'Busca por Nome Completo (Localizador de CPF)',
      shortName: 'Busca por Nome',
      category: 'cadastral',
      categoryLabel: 'Cadastral',
      inputType: 'nome',
      inputLabel: 'Nome Completo do Titular',
      placeholder: 'Ex: WELLINGTON MARIANO DE BRITO',
      description: 'Localização de CPFs, data de nascimento, filiação e homônimos vinculados a um nome civil.',
      highlights: [
        'Localização do número de CPF correspondente',
        'Identificação de homônimos em território nacional',
        'Data de nascimento e filiação (Nome da Mãe)',
        'Garantia Renacred: Custo Zero se nada for localizado'
      ],
      defaultCost: 0.03,
      defaultPrice: 1.32,
      hasContingency: false,
      badgeColor: {
        bg: 'bg-indigo-50',
        text: 'text-indigo-800',
        border: 'border-indigo-200'
      }
    }
    ```
- [ ] **Passo 3.2:** Em `src/utils/masks.ts`, criar helper de limpeza/formatação de nome em caixa alta (`maskNome`).

---

### Tarefa 4: Hub de Consulta & Laudo Pericial Universal E17
**Arquivos:**
- Modificar: `src/pages/assinante/HubConsulta.tsx`
- Modificar: `src/components/consultas/LaudoPericialUniversal.tsx`

- [ ] **Passo 4.1:** Em `HubConsulta.tsx`:
  - Suportar `inputType === 'nome'` no input principal e validação de 2 palavras.
- [ ] **Passo 4.2:** Em `LaudoPericialUniversal.tsx`:
  - Adicionar `case 'E17'` no `renderConteudoProduto`.
  - Construir card de resumo com quantidade de homônimos encontrados.
  - Renderizar tabela/grid de pessoas encontradas:
    - Nome completo
    - CPF mascarado com botão de cópia
    - Data de nascimento e idade formatada
    - Sexo
    - Nome da Mãe
    - Botão de ação: "Consultar este CPF no E13 / E15" (com link direto para o Hub).
- [ ] **Passo 4.3:** Assegurar que o laudo do E17 imprima perfeitamente em largura total sem sidebar, respeitando `@media print`.

---

### Tarefa 5: Painel Administrativo, Auditoria e Permissões
**Arquivos:**
- Modificar: `src/pages/admin/GerenciarClientes.tsx`
- Modificar: `src/pages/admin/LogsApi.tsx`

- [ ] **Passo 5.1:** Em `GerenciarClientes.tsx`, assegurar que o E17 apareça na lista de produtos permitidos e tabela de preços personalizados por cliente.
- [ ] **Passo 5.2:** Em `LogsApi.tsx`, incluir o parser para rotas `/v1/e17` e `/v1/nome-completo` para rotular automaticamente como `E17 - Busca por Nome Completo`.

---

### Tarefa 6: Build, Validação e Deploy na VPS
- [ ] **Passo 6.1:** Executar `npm run build` no frontend e `npm run build` no backend (garantir 0 erros de compilação).
- [ ] **Passo 6.2:** Realizar commit convencional: `feat(produtos): adicionar produto E17 busca por nome completo com localizador de cpf`.
- [ ] **Passo 6.3:** Enviar alterações ao GitHub (`git push origin main`).
- [ ] **Passo 6.4:** Executar deploy remoto na VPS via SSH (`/opt/renacred/deploy.sh`) e validar status online da API (`healthcheck 200 OK`).
