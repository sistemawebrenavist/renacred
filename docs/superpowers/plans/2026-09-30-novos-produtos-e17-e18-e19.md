# Plano de Implementação Completo — Novos Produtos Oficiais: E17, E18 e E19

> **Status:** Pronto para Execução  
> **Skill Recomendada:** superpowers:subagent-driven-development ou superpowers:executing-plans  
> **Total de Produtos na Plataforma:** 16 atuais ➔ **19 Produtos Oficiais Integrados**

---

## 1. Visão Geral & Escopo de Integração

Este plano cobre a expansão do catálogo da Renacred com três novos produtos de alta demanda cadastral e veicular, integrados à infraestrutura de contingência, faturamento sob demanda, laudos periciais com fé pública, API de parceiros e painel de gestão:

1. **PRODUTO E17 — Busca por Nome Completo (Localizador de CPF)**
   - **Provedor:** FetchBrasil (`api=nome_basico&query={nome}`)
   - **Custo:** R$ 0,03 | **Preço de Venda:** R$ 1,32
   - **Objetivo:** Localizar CPFs, filiação, datas de nascimento, idade calculada e homônimos vinculados a um nome civil em âmbito nacional.

2. **PRODUTO E18 — Busca por Nome de Mãe/Pai (Filiação & Vínculos Familiares)**
   - **Provedor:** FetchBrasil (`api=reg_filiacao&query={nome}&tipo={mae|pai}`)
   - **Custo:** R$ 0,03 | **Preço de Venda:** R$ 1,32
   - **Objetivo:** Localizar filhos registrados vinculados ao nome da mãe ou do pai, retornando CPF, nascimento, UF e filiação.

3. **PRODUTO E19 — Busca de RENAVAM por Placa (Consulta Veicular Direta)**
   - **Provedor:** FetchBrasil (`api=placa_df&query={placa}`)
   - **Custo:** R$ 0,04 | **Preço de Venda:** R$ 1,32
   - **Objetivo:** Retorno rápido e limpo para identificação de RENAVAM por placa.
   - **REGRA ESTRITA DE EXIBIÇÃO:** Mostrar **SOMENTE** os 5 campos solicitados:
     - `name`: Nome / Modelo do Veículo (ex: `"VW/GOLF"`)
     - `type`: Tipo do Veículo (ex: `"AUTOMOVEL"`)
     - `year`: Ano Modelo (ex: `"2000"`)
     - `yearManufacture`: Ano Fabricação (ex: `"1999"`)
     - `renavam`: Código RENAVAM Oficial (ex: `"00726937886"`)
     *(Descartar da normalização e da UI: débitos, restrições, situação, endereços e dados brutos de proprietário).*

---

## 2. Análise Multi-Angular do Sistema

### Ângulo 1: Catálogos e Metadados (Frontend & Backend)
- **`server/src/config/productsCatalog.ts`**:
  - Adicionar as 3 novas entradas em `SERVER_PRODUCTS`.
  - Configurar slugs amigáveis (`busca-nome`, `busca-filiacao`, `busca-renavam`) e aliases (`nome`, `filiacao`, `renavam-placa`).
  - Configurar `defaultCost` (0.03, 0.03, 0.04) e `defaultPrice` (1.32).
- **`src/config/productsCatalog.ts`**:
  - Adicionar as definições completas em `PRODUCTS_CATALOG`.
  - Atualizar `ProductInputType` para suportar `'nome'` e `'placa'`.
  - Atualizar contadores em `CATEGORIES_CONFIG`:
    - `total`: 19
    - `cadastral`: 8 (E6, E7, E11, E13, E15, E16 + E17, E18)
    - `veicular`: 9 (E2, E3, E4, E5, E8, E9, E10, E12, E14 + E19)
    - `imobiliario`: 1 (E1)
    - `juridico`: 1 (E9 / Processos)
  - Configurar paleta de cores (Tailwind badges):
    - `E17`: Indigo (`bg-indigo-50 text-indigo-700 border-indigo-200`)
    - `E18`: Violet (`bg-violet-50 text-violet-700 border-violet-200`)
    - `E19`: Emerald (`bg-emerald-50 text-emerald-800 border-emerald-300`)
- **`src/components/layout/Sidebar.tsx`**:
  - Tornar o badge de "Bases Oficiais & Consultas" dinâmico usando `${PRODUCTS_CATALOG.length}` para sempre refletir o catálogo atual.

### Ângulo 2: Provedor FetchBrasil (`fetchbrasil.service.ts`)
- **E17:** Método `consultarNomeBasico(nome: string)`:
  - Query URL: `https://api.fetchbrasil.pro/?token=${TOKEN}&api=nome_basico&query=${encodeURIComponent(nome)}`.
- **E18:** Método `consultarRegFiliacao(nome: string, tipo: 'mae' | 'pai' = 'mae')`:
  - Query URL: `https://api.fetchbrasil.pro/?token=${TOKEN}&api=reg_filiacao&query=${encodeURIComponent(nome)}&tipo=${tipo}`.
- **E19:** Método `consultarPlacaDf(placa: string)`:
  - Query URL: `https://api.fetchbrasil.pro/?token=${TOKEN}&api=placa_df&query=${encodeURIComponent(placa)}`.
- Tratamento de timeout (10s), retry com backoff e chave centralizada em variável de ambiente.

### Ângulo 3: Normalizadores de Dados (`productNormalizers.ts`)
- **`normalizeE17(raw: any, query: string): NormalizedResult`**:
  - Trata `raw?.RESULTADOS` ou `raw?.data`.
  - Higieniza e padroniza cada item:
    - `nome`: string em maiúsculas.
    - `cpf`: 11 dígitos formatados (`000.000.000-00`).
    - `sexo`: `'M'` ➔ `'Masculino'`, `'F'` ➔ `'Feminino'`, outro ➔ `'Não informado'`.
    - `nome_mae`: fallback para `'Não informado'` se nulo.
    - `data_nascimento`: formatação `DD/MM/AAAA`.
    - `idade`: cálculo automático em anos completos.
- **`normalizeE18(raw: any, query: string): NormalizedResult`**:
  - Trata `raw?.data` e `raw?.meta`.
  - Mapeia array de filhos:
    - `cpf`: formatado (`000.000.000-00`).
    - `nome`: nome completo do filho/filha.
    - `nascimento`: data no padrão brasileiro.
    - `uf`: estado de nascimento/registro.
    - `nome_mae`: nome materno.
    - `nome_pai`: nome paterno (com fallback para `'Não informado'`).
  - Metadados: `tipo_pesquisado` (`'mae'` ou `'pai'`), `nome_genitor`, `total_filhos`.
- **`normalizeE19(raw: any, query: string): NormalizedResult`**:
  - Filtro estrito:
    ```ts
    const v = raw?.vehicle || {};
    const m = v?.model || {};
    const renavam = v?.renavam ? String(v.renavam).trim() : null;
    return {
      totalRegistros: renavam ? 1 : 0,
      dados: renavam ? {
        name: m.name ? String(m.name).trim() : 'NÃO INFORMADO',
        type: m.type ? String(m.type).trim() : 'NÃO INFORMADO',
        year: m.year ? String(m.year).trim() : 'NÃO INFORMADO',
        yearManufacture: m.yearManufacture ? String(m.yearManufacture) : 'NÃO INFORMADO',
        renavam: renavam,
        plate: v.plate || query.toUpperCase()
      } : null
    };
    ```

### Ângulo 4: Regras de Cobrança, Custo Zero e Auditoria (`consultaUnificadaController.ts`)
- **Garantia Custo Zero:**
  - Se `totalRegistros === 0` ou `dados === null`, tarifa debitada = `R$ 0,00`.
- **Preço Efetivo:**
  - Verifica se a empresa possui preço customizado em `company.customPrices[code]`. Se não, aplica `product.defaultPrice` (R$ 1,32).
  - SuperAdmin isento (`finalCost = 0`).
- **Verificação de Permissões:**
  - Verifica `company.allowedProducts` e `apiKey.allowedProducts` (liberado se contiver `'ALL'` ou o código específico `E17`/`E18`/`E19`).
- **Persistência em `prisma.query`:**
  - Gravação com `identifier` limpo, `requestData` contendo `product`, `productName`, `category`, `hash` e `tipo` (para E18), e `resultData` normalizado.

### Ângulo 5: API Pública de Clientes (`apiRoutes.ts`)
- Exposição das rotas externas para integração via token de API:
  - `GET /v1/e17` e `GET /v1/nome-completo` (query param `query`)
  - `GET /v1/e18` e `GET /v1/filiacao` (query params `query` e `tipo`)
  - `GET /v1/e19` e `GET /v1/renavam-placa` (query param `query`)
- Resposta no formato canônico da Renacred (`success`, `produto`, `parametro_pesquisado`, `total_registros`, `custo_debitado`, `tempo_resposta_ms`, `hash_autenticacao`, `dados`).

### Ângulo 6: Interface de Consulta — Hub (`HubConsulta.tsx` & `masks.ts`)
- **E17:**
  - Input aberto para digitação livre de nome (mínimo 2 palavras e 5 caracteres).
  - Placeholder: `"Ex: WELLINGTON MARIANO DE BRITO"`.
- **E18:**
  - Seletor de Tipo: Toggle segmentado entre **"Nome da Mãe"** (default) e **"Nome do Pai"**.
  - Input aberto para digitação do nome do genitor.
  - Placeholder: `"Ex: MARIA DE JESUS DE BRITO"`.
- **E19:**
  - Input com máscara veicular brasileira (Mercosul `ABC1D23` ou Cinza `ABC-1234`).
  - Placeholder: `"Ex: IVO2002 ou BRA2E19"`.
- Histórico recente do produto no rodapé do Hub, com botão de reconsulta imediata.

### Ângulo 7: Laudo Pericial Universal (`LaudoPericialUniversal.tsx`)
Conforme a skill `pdf-report-designer` e padrões de alta fidelidade visual da Renacred:
- **Card 1 (Alvo):** Nome, Placa ou Filiação com badge.
- **Card 2 (Varredura):** Total de registros e status de tarifa com isenção se zero.
- **Card 3 (Autenticação):** Hash criptográfico oficial e carimbo de data/hora.
- **Seção E17 (Busca por Nome):**
  - Tabela responsiva de homônimos com: Nome Completo, CPF mascarado, Sexo, Nome da Mãe, Data de Nascimento e Idade calculada.
  - Botão de ação rápida: *"Consultar CPF no E13 / E15"* com 1 clique.
- **Seção E18 (Filiação):**
  - Card indicador: Genitor Auditado (Mãe ou Pai) e total de vínculos localizados.
  - Lista de filhos vinculados com CPF, Nascimento, UF e filiação completa.
- **Seção E19 (RENAVAN por Placa — Exibição Estrita):**
  - Card de Destaque Executivo para o **RENAVAN**:
    - Tipografia mono ampla (`text-2xl sm:text-3xl font-bold font-mono text-emerald-800`).
    - Botão interativo de **"Copiar RENAVAM"** com feedback visual (`Copiar` ➔ `Copiado!`).
  - Grid 2x2 elegante com os 4 campos complementares:
    - **Nome / Modelo:** `name` (ex: `VW/GOLF`)
    - **Tipo de Veículo:** `type` (ex: `AUTOMOVEL`)
    - **Ano Modelo:** `year` (ex: `2000`)
    - **Ano Fabricação:** `yearManufacture` (ex: `1999`)
  - Sem poluição com outros dados cadastrais.
- **Impressão / PDF (`@media print`):**
  - Layout limpo, impressão em largura total sem cabeçalhos do sistema nem sidebar, rodapé institucional com código de autenticação.

### Ângulo 8: Visualizador Modal no Dashboard (`DetalhesConsultaModal.tsx` & `DashboardAdmin.tsx`)
- Suporte imediato aos produtos `E17`, `E18` e `E19` no modal universal.
- Badges com códigos oficiais e nomes dos novos produtos na tabela em tempo real do Dashboard.

### Ângulo 9: Painel de Gestão de Clientes (`GerenciarClientes.tsx`)
- Atualização do texto e contadores de "Todos os 19 Produtos (/v1/:codigo)".
- Inclusão dos checkboxes de `E17`, `E18` e `E19` no modal de permissões e tabela de preços customizados de cada cliente.

### Ângulo 10: Documentação Técnica de Integração (`GuiaIntegracao.tsx`)
- Exemplos de requisição cURL e JavaScript para `/v1/e17`, `/v1/e18` e `/v1/e19`.
- Exemplo do JSON estrito retornado pelo E19.

---

## 3. Plano de Tarefas Passo a Passo

### Tarefa 1: Backend — Chamadas no FetchBrasil Service
**Arquivos:**
- `server/src/services/fetchbrasil.service.ts`

- [ ] **Passo 1.1:** Adicionar método `consultarNomeBasico(nome: string)`:
  - Fazer GET em `?token=${TOKEN}&api=nome_basico&query=${encodeURIComponent(nome)}`.
  - Tratar status HTTP e retorno com contingência.
- [ ] **Passo 1.2:** Adicionar método `consultarRegFiliacao(nome: string, tipo: string = 'mae')`:
  - Fazer GET em `?token=${TOKEN}&api=reg_filiacao&query=${encodeURIComponent(nome)}&tipo=${tipo}`.
- [ ] **Passo 1.3:** Adicionar método `consultarPlacaDf(placa: string)`:
  - Fazer GET em `?token=${TOKEN}&api=placa_df&query=${encodeURIComponent(placa)}`.
- [ ] **Passo 1.4:** Atualizar o switch em `consultarProdutoComContingencia`:
  - Mapear `E17` ➔ `consultarNomeBasico`.
  - Mapear `E18` ➔ `consultarRegFiliacao`.
  - Mapear `E19` ➔ `consultarPlacaDf`.

---

### Tarefa 2: Backend — Normalizadores de Dados
**Arquivos:**
- `server/src/services/productNormalizers.ts`

- [ ] **Passo 2.1:** Implementar `normalizeE17(raw: any, query: string)`:
  - Extrair array `raw?.RESULTADOS || raw?.data || []`.
  - Calcular idade a partir da data de nascimento (`NASC`).
  - Formatar CPF e nomes.
- [ ] **Passo 2.2:** Implementar `normalizeE18(raw: any, query: string, extraParams?: any)`:
  - Extrair array `raw?.data || []` e `raw?.meta`.
  - Mapear filhos com CPFs formatados, nascimento, UF e genitores.
- [ ] **Passo 2.3:** Implementar `normalizeE19(raw: any, query: string)`:
  - Filtrar estritamente: `name`, `type`, `year`, `yearManufacture`, `renavam` e `plate`.
  - Descartar todos os demais campos da API bruta.
- [ ] **Passo 2.4:** Atualizar o despachante principal `normalizeProductResult` com os cases `'E17'`, `'E18'`, `'E19'`.

---

### Tarefa 3: Backend — Catálogo de Servidor & Rotas Unificadas
**Arquivos:**
- `server/src/config/productsCatalog.ts`
- `server/src/controllers/consultaUnificadaController.ts`
- `server/src/routes/consultasRoutes.ts`
- `server/src/routes/apiRoutes.ts`

- [ ] **Passo 3.1:** Em `server/src/config/productsCatalog.ts`:
  - Adicionar E17 (`busca-nome`, R$ 0,03 / R$ 1,32).
  - Adicionar E18 (`busca-filiacao`, R$ 0,03 / R$ 1,32).
  - Adicionar E19 (`busca-renavam`, R$ 0,04 / R$ 1,32).
- [ ] **Passo 3.2:** Em `consultaUnificadaController.ts`:
  - Permitir receber `tipo` no body/query para E18 (`tipo=mae` ou `tipo=pai`).
  - Suportar validação de input tipo `nome` (mínimo de 2 palavras).
  - Aplicar garantia de custo zero para consultas com 0 registros.
- [ ] **Passo 3.3:** Em `apiRoutes.ts`:
  - Expor rotas públicas `/v1/e17`, `/v1/nome-completo`, `/v1/e18`, `/v1/filiacao`, `/v1/e19`, `/v1/renavam-placa`.

---

### Tarefa 4: Frontend — Catálogo, Sidebar e Seletores
**Arquivos:**
- `src/config/productsCatalog.ts`
- `src/components/layout/Sidebar.tsx`
- `src/pages/assinante/CatalogoProdutos.tsx`
- `src/components/consultas/SeletorProdutoModal.tsx`

- [ ] **Passo 4.1:** Em `src/config/productsCatalog.ts`:
  - Atualizar tipo `ProductInputType` para incluir `'nome'`.
  - Adicionar definições completas de E17, E18 e E19.
  - Atualizar contadores em `CATEGORIES_CONFIG`.
- [ ] **Passo 4.2:** Em `Sidebar.tsx`:
  - Tornar o badge de "Bases Oficiais & Consultas" dinâmico com `${PRODUCTS_CATALOG.length}`.
- [ ] **Passo 4.3:** Em `CatalogoProdutos.tsx`:
  - Atualizar textos para refletir o total dinâmico de produtos.
- [ ] **Passo 4.4:** Em `SeletorProdutoModal.tsx`:
  - Verificar suporte para renderização dos novos produtos com filtros por categoria.

---

### Tarefa 5: Frontend — Formulário do Hub de Consulta
**Arquivos:**
- `src/pages/assinante/HubConsulta.tsx`

- [ ] **Passo 5.1:** Suporte a entrada tipo `nome`:
  - Quando E17 for selecionado: input de texto sem máscara numérica, placeholder contextual.
- [ ] **Passo 5.2:** Suporte a entrada tipo filiação (E18):
  - Exibir botão seletor de "Mãe" e "Pai" antes ou acima do campo de entrada.
  - Enviar parâmetro `tipo` na chamada à API.
- [ ] **Passo 5.3:** Suporte a entrada tipo placa (E19):
  - Máscara veicular padrão.

---

### Tarefa 6: Frontend — Laudo Pericial Universal
**Arquivos:**
- `src/components/consultas/LaudoPericialUniversal.tsx`

- [ ] **Passo 6.1:** Criar layout pericial para **E17**:
  - Tabela executiva de homônimos encontrados.
  - Exibição de CPF mascarado, sexo, mãe, data de nascimento e idade calculada.
  - Botão de atalho: *"Consultar CPF no E13 / E15"*.
- [ ] **Passo 6.2:** Criar layout pericial para **E18**:
  - Resumo da filiação pesquisada (Mãe ou Pai).
  - Grid/Lista de filhos vinculados com CPF, nascimento, UF e pais registrados.
- [ ] **Passo 6.3:** Criar layout pericial para **E19 (RENAVAN por Placa)**:
  - Card central de destaque para o **RENAVAN**:
    - Número em fonte mono grande.
    - Botão "Copiar RENAVAM" com feedback imediato.
  - Grid 2x2 com **Nome / Modelo**, **Tipo**, **Ano Modelo** e **Ano Fabricação**.
  - Garantir que nenhum outro dado cadastral seja exibido.
- [ ] **Passo 6.4:** Verificar e aplicar formatação de impressão `@media print` para os três novos laudos.

---

### Tarefa 7: Frontend — Gestão de Clientes e Tarifas
**Arquivos:**
- `src/pages/admin/GerenciarClientes.tsx`

- [ ] **Passo 7.1:** Atualizar contadores de produtos permitidos de 16 para o total dinâmico `${PRODUCTS_CATALOG.length}`.
- [ ] **Passo 7.2:** Incluir E17, E18 e E19 nas listas de seleção de produtos permitidos e preços customizados por empresa.

---

### Tarefa 8: Compilação, Testes e Deploy na VPS
- [ ] **Passo 8.1:** Executar `npm run build` no frontend (Vite) e verificar ausência de erros.
- [ ] **Passo 8.2:** Executar `npm run build` no backend (TypeScript) e verificar ausência de erros.
- [ ] **Passo 8.3:** Realizar testes de ponta a ponta com chamadas reais:
  - E17: "WELLINGTON MARIANO DE BRITO"
  - E18: "MARIA DE JESUS DE BRITO" (tipo `mae` e tipo `pai`)
  - E19: Placa "IVO2002"
- [ ] **Passo 8.4:** Commit e push para o repositório Git oficial (`main`).
- [ ] **Passo 8.5:** Executar script de deploy na VPS (`ssh root@209.50.245.165 "bash /opt/renacred/deploy.sh"`).
- [ ] **Passo 8.6:** Validar no ambiente de produção:
  - Funcionamento no Hub de Consulta.
  - Abertura de laudo no Modal de Detalhes do Dashboard.
  - Exibição correta na tabela de auditoria em tempo real.
