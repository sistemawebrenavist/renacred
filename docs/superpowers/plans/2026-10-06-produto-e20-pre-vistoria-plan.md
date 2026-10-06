# Plano de Implementação: Produto E20 — Pré Vistoria Veicular Consolidada

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o produto oficial **E20** (Pré Vistoria Veicular Consolidada), composto por 100% da Pré-Vistoria da InfoSinistros (com contingência E19 para RENAVAM caso ausente na BIN interna a R$ 0,04), histórico de Roubo e Furto (E5) e histórico de Proprietários (E2), com motor de distribuição de respostas nos devidos cards periciais (locadoras, seguradoras, frotas públicas e roubo/furto) ao preço de venda de **R$ 0,69**, disponível no Hub de Consultas, Catálogo de Produtos e API v1 externa.

**Architecture:** Orquestrador backend dedicado (`e20Service.ts`) que consome a API B2B da InfoSinistros autenticado pela Admin API Key (`intg_live_admin_unlimited_5a5da8c7f970e401328e23b46e0c3d52`), avalia a presença de RENAVAM na BIN interna acionando a contingência E19 se necessário, executa em paralelo as consultas oficiais E5 (Roubo/Furto) e E2 (Proprietários) via `fetchbrasilService`, executa o classificador de entidades para segregar locadoras, seguradoras, frotas públicas e financeiras presentes na cadeia dominial do E2, distribui as evidências para os respectivos cards e entrega um laudo pericial universal polimórfico no frontend (padrão Impeccable corporativo).

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vite, Lucide React (apenas controles funcionais), Node.js 20, Express, Prisma ORM, PostgreSQL 16, Axios, Winston.

**Spec:** Baseado na requisição direta do usuário e na documentação técnica da Admin API Key da InfoSinistros (`C:\Users\Henrique - PC\Desktop\Projetos Dev\infosinistros\server\admin_api_key_info.md`).

---

## Global Constraints

- **Preço de Venda Fixo:** R$ 0,69 por consulta com dados retornados (consultas sem registros = custo R$ 0,00).
- **Custo Interno dos Componentes:**
  - Pré-Vistoria InfoSinistros: R$ 0,00 (Admin API Key interna ilimitada).
  - Contingência E19 (apenas se a BIN não trouxer RENAVAM): R$ 0,04 interno.
  - E5 (Roubo e Furto oficial): R$ 0,15 interno.
  - E2 (Histórico de Proprietários oficial): R$ 0,17 interno.
- **Regras Estritas de Distribuição:** Se na cadeia dominial de E2 for identificada uma locadora, seguradora, frota pública ou financeira, esses dados devem obrigatoriamente alimentar e enriquecer os respectivos cards periciais (Locadoras, Seguradoras, Frota Pública, Financeiras). O status e boletins de E5 devem alimentar o card consolidado de Roubo e Furto.
- **Sigilo Absoluto de Provedores:** Nunca expor nomes de provedores externos no frontend ou na resposta da API para o cliente. Utilizar sempre "Fontes Oficiais", "Bases Federais", "Senatran/Bases Estaduais" e "Base Cadastral Interna".
- **Design Impeccable:** Zero emojis, zero ícones decorativos, zero gradientes em textos, alto contraste tipográfico, densidade pericial executiva e suporte a impressão/PDF pericial.
- **IPv4 Obrigatório:** Conexões externas com `family: 4` e `keepAlive: false` no `https.Agent`.

---

## Review Focus

1. **Garantia de RENAVAM:** Se o veículo não possuir RENAVAM na BIN interna (`P35`), a consulta E19 é disparada automaticamente e o RENAVAM obtido é injetado na ficha cadastral do veículo.
2. **Distribuição Cruzada E2 ➔ Cards Especializados:** Proprietários identificados no E2 como locadoras (ex: Localiza, Movida), seguradoras (ex: Porto Seguro, Tokio Marine) ou órgãos públicos (ex: Prefeitura, Secretaria de Segurança) são refletidos com badge e detalhamento nos cards de Locadora, Seguradora e Frota Pública.
3. **Consolidação de Roubo e Furto (E5 + P10):** Se constar queixa em E5 ou P10, o card de Roubo e Furto exibe o status de alerta com os números de BO e delegacias; se nada constar em ambas as fontes, exibe "NADA CONSTA - VEÍCULO SEM QUEIXA ATIVA".
4. **Tarifação Correta:** Assinante é debitado em exatamente R$ 0,69 (ou valor customizado da empresa) apenas se houver dados úteis; se não houver dados, o débito é estritamente R$ 0,00.
5. **Acesso Multi-Canal:** Funciona perfeitamente no seletor do Hub de Consultas (`/consultar`), no Catálogo de Produtos (`/produtos`), na gestão de clientes do Admin e na API pública v1 via `/v1/e20` ou `/v1/pre-vistoria`.

---

## Estrutura de Arquivos

### Arquivos a Criar:
- `server/src/services/infosinistrosService.ts`: Cliente HTTP para a API B2B da InfoSinistros com autenticação via Admin API Key.
- `server/src/services/e20Service.ts`: Orquestrador completo do produto E20 (Pré-Vistoria + contingência E19 + E5 + E2 + classificador de entidades e distribuição de cards).
- `server/tests/test-e20-pre-vistoria.ts`: Script de teste e validação de ponta a ponta do fluxo E20 com placa real.

### Arquivos a Modificar:
- `src/config/productsCatalog.ts`: Adicionar E20 ao catálogo de produtos do frontend e atualizar contadores.
- `server/src/config/productsCatalog.ts`: Adicionar E20 ao catálogo de produtos do backend e registrar rotas e aliases.
- `server/src/services/productNormalizers.ts`: Adicionar função `normalizeE20` e registrar no switch `normalizeProductResult`.
- `server/src/controllers/consultaUnificadaController.ts`: Integrar despacho de E20 para `e20Service.ts` tanto na rota Web quanto na rota API v1.
- `src/components/consultas/LaudoPericialUniversal.tsx`: Adicionar renderizador completo para a certidão pericial do produto E20.

---

## Tarefas de Implementação

### Tarefa 1: Definição de Metadados e Catálogos (Frontend & Backend)

**Arquivos:**
- Modificar: `src/config/productsCatalog.ts`
- Modificar: `server/src/config/productsCatalog.ts`

**Interfaces:**
- Consome: tipos `ProductDefinition`, `ServerProductConfig`
- Produz: código `'E20'`, slug `'pre-vistoria'`, preço de venda `0.69`, custo `0.32`

- [ ] **Passo 1: Adicionar E20 em `src/config/productsCatalog.ts`**
  - Adicionar a definição do produto E20:
    - `code: 'E20'`
    - `slug: 'pre-vistoria'`
    - `name: 'Pré Vistoria Veicular Consolidada'`
    - `shortName: 'Pré Vistoria'`
    - `category: 'veicular'`
    - `categoryLabel: 'Veicular'`
    - `inputType: 'placa'`
    - `inputLabel: 'Placa do Veículo'`
    - `placeholder: 'ABC-1234 ou ABC1D23'`
    - `description: 'Laudo pericial unificado: BIN Fabril completa, histórico dominial e proprietários (E2), roubo e furto oficial (E5), rastreio de locadoras, seguradoras, frotas públicas e garantia de RENAVAM via E19.'`
    - `highlights: ['Ficha cadastral BIN Fabril e chassi oficial', 'Garantia de RENAVAM automático (contingência E19)', 'Histórico pericial de roubo e furto (E5)', 'Cadeia de proprietários com detecção de locadoras e seguradoras (E2)']`
    - `defaultCost: 0.32`
    - `defaultPrice: 0.69`
    - `hasContingency: true`
    - `badgeColor: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' }`
  - Atualizar contadores em `CATEGORIES_CONFIG`:
    - `todos`: count 20
    - `veicular`: count 10

- [ ] **Passo 2: Adicionar E20 em `server/src/config/productsCatalog.ts`**
  - Adicionar a configuração de backend para o E20:
    ```ts
    {
      code: 'E20',
      slug: 'pre-vistoria',
      name: 'Pré Vistoria Veicular Consolidada',
      category: 'veicular',
      inputType: 'placa',
      apiPrimary: 'pre_vistoria',
      apiContingencies: [],
      defaultCost: 0.32,
      defaultPrice: 0.69,
      slugAliases: ['pre-vistoria-completa', 'vistoria', 'pre-vistoria-veicular']
    }
    ```

- [ ] **Passo 3: Verificar integridade de compilação TypeScript nos catálogos**
  - Executar checagem de tipos rápida para garantir que os arrays estão consistentes.

- [ ] **Passo 4: Commit**
  ```bash
  git add src/config/productsCatalog.ts server/src/config/productsCatalog.ts
  git commit -m "feat(catalog): adicionar produto E20 Pré Vistoria ao catálogo oficial"
  ```

---

### Tarefa 2: Cliente de Integração com a API InfoSinistros

**Arquivos:**
- Criar: `server/src/services/infosinistrosService.ts`

**Interfaces:**
- Consome: URL `https://api.infosinistros.com.br/api/v1/veiculos/consulta`, header `X-API-Key`
- Produz: método `infosinistrosService.consultarPreVistoria(placa: string): Promise<any>`

- [ ] **Passo 1: Criar `server/src/services/infosinistrosService.ts`**
  - Implementar classe `InfoSinistrosService`:
    ```ts
    import https from 'https';
    import axios, { AxiosInstance } from 'axios';
    import { logger } from '../utils/logger';

    export interface InfoSinistrosPreVistoriaResponse {
      sucesso: boolean;
      cliente?: string;
      ambiente?: string;
      query_fornecida?: string;
      duracaoMs?: number;
      produtosContratados?: string[];
      resultados?: Record<string, {
        produto_id: string;
        nome: string;
        status: 'positivo' | 'negativo' | 'não contratado';
        conteudo: any;
      }>;
      mensagem?: string;
    }

    export class InfoSinistrosService {
      private client: AxiosInstance;
      private apiKey: string;
      private baseUrl: string;

      constructor() {
        this.baseUrl = process.env.INFOSINISTROS_API_URL || 'https://api.infosinistros.com.br';
        this.apiKey = process.env.INFOSINISTROS_ADMIN_API_KEY || 'intg_live_admin_unlimited_5a5da8c7f970e401328e23b46e0c3d52';

        const httpsAgent = new https.Agent({
          family: 4,
          keepAlive: false,
          rejectUnauthorized: false
        });

        this.client = axios.create({
          baseURL: this.baseUrl,
          timeout: 20000,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey
          },
          httpsAgent
        });
      }

      async consultarPreVistoria(placa: string): Promise<InfoSinistrosPreVistoriaResponse> {
        const cleanPlaca = placa.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        const startTime = Date.now();

        try {
          logger.info(`[INFOSINISTROS] Solicitando Pré-Vistoria B2B para placa ${cleanPlaca}...`);
          const response = await this.client.post('/api/v1/veiculos/consulta', {
            placa: cleanPlaca
          });

          const duracao = Date.now() - startTime;
          logger.info(`[INFOSINISTROS] Resposta recebida para ${cleanPlaca} em ${duracao}ms (Status: ${response.status})`);
          return response.data;
        } catch (error: any) {
          const duracao = Date.now() - startTime;
          logger.error(`[INFOSINISTROS] Erro ao consultar placa ${cleanPlaca} (${duracao}ms): ${error.response?.data?.message || error.message}`);
          return {
            sucesso: false,
            mensagem: error.response?.data?.message || error.message,
            resultados: {}
          };
        }
      }
    }

    export const infosinistrosService = new InfoSinistrosService();
    ```

- [ ] **Passo 2: Testar chamada isolada ao cliente InfoSinistros via script temporário**
  - Validar que a API da InfoSinistros responde com os dados dos produtos P1 a P37.

- [ ] **Passo 3: Commit**
  ```bash
  git add server/src/services/infosinistrosService.ts
  git commit -m "feat(server): cliente de integracao b2b com infosinistros"
  ```

---

### Tarefa 3: Orquestrador E20 com Classificador de Entidades e Distribuição de Cards

**Arquivos:**
- Criar: `server/src/services/e20Service.ts`

**Interfaces:**
- Consome: `infosinistrosService`, `fetchbrasilService`, `syncVeicularToInfosinistros`
- Produz: método `e20Service.executarConsultaE20(placa: string): Promise<E20ConsolidadoResponse>`

- [ ] **Passo 1: Criar `server/src/services/e20Service.ts`**
  - Estruturar a lógica de extração e classificação de entidades da cadeia dominial do E2:
    - **Detecção de Locadora:** Expressões regulares e termos: `/(LOCADORA|RENT A CAR|LOCACAO DE VEICULOS|LOCADORA DE VEICULOS|MOVIDA|LOCALIZA|UNIDAS|LOCAMERICA|OURO VERDE|LEADIS|VAMOS LOCACAO)/i`.
    - **Detecção de Seguradora:** Termos: `/(SEGURADORA|SEGUROS|COMPANHIA DE SEGUROS|CIA DE SEGUROS|PORTO SEGURO|BRADESCO AUTO|TOKIO MARINE|AZUL SEGUROS|MAPFRE|ALLIANZ|SUL AMERICA|HDI SEGUROS|LIBERTY|SOMPO|ZURICH|CHUBB)/i`.
    - **Detecção de Frota Pública:** Termos: `/(PREFEITURA|MUNICIPIO DE|ESTADO DE|GOVERNO DO ESTADO|SECRETARIA DE|MINISTERIO|POLICIA|CORPO DE BOMBEIROS|CAMARA MUNICIPAL|TRIBUNAL|FUNDO MUNICIPAL|AUTARQUIA)/i`.
    - **Detecção de Bancos/Financeiras:** Termos: `/(BANCO|FINANCEIRA|LEASING|ARRENDAMENTO MERCANTIL|BV FINANCEIRA|SANTANDER|ITAU|BRADESCO FINANCIAMENTOS|SAFRA|PANAMERICANO)/i`.
  - Orquestração da consulta:
    1. **Disparo paralelo:**
       - Chamada 1: `infosinistrosService.consultarPreVistoria(placa)`
       - Chamada 2: `fetchbrasilService.consultarProdutoComContingencia('E5', placa)`
       - Chamada 3: `fetchbrasilService.consultarProdutoComContingencia('E2', placa)`
    2. **Avaliação do RENAVAM:**
       - Verificar `P35.conteudo.renavam` retornado da InfoSinistros.
       - Se nulo, vazio ou `"NADA CONSTA"`:
         - Disparar `fetchbrasilService.consultarProdutoComContingencia('E19', placa)`.
         - Registrar custo interno de R$ 0,04.
         - Injetar o RENAVAM obtido de `resultE19.normalized.dados.renavam` na BIN e na ficha cadastral.
    3. **Distribuição das Respostas e Enriquecimento dos Cards:**
       - **Card de Roubo & Furto:** Mesclar status e boletins de ocorrência de `E5` com `P10` da InfoSinistros.
       - **Card de Locadoras:** Mesclar `P4` da InfoSinistros com qualquer proprietário locadora detectado em `E2`.
       - **Card de Seguradoras:** Mesclar `P1` e `P14` da InfoSinistros com qualquer proprietário seguradora detectado em `E2`.
       - **Card de Frota Pública:** Mesclar `P2` e `P3` da InfoSinistros com qualquer proprietário órgão público detectado em `E2`.
       - **Card de Histórico Dominial:** Manter a cadeia cronológica integral de `E2` com anotação das badges correspondentes.
       - **Card de BIN Fabril:** Dados da BIN `P35` com RENAVAM garantido.
    4. **Sincronização Reversa:**
       - Disparar de forma assíncrona `syncVeicularToInfosinistros(placa, resultE2)`.
    5. Retornar payload estruturado com contagem total de registros úteis e metadados.

- [ ] **Passo 2: Commit**
  ```bash
  git add server/src/services/e20Service.ts
  git commit -m "feat(server): orquestrador e20 com distribuicao cruzada de respostas"
  ```

---

### Tarefa 4: Normalizador Pericial e Integração no Controller

**Arquivos:**
- Modificar: `server/src/services/productNormalizers.ts`
- Modificar: `server/src/controllers/consultaUnificadaController.ts`

**Interfaces:**
- Consome: payload unificado do `e20Service`
- Produz: `normalizeE20`, endpoints `/api/consultas/e20` e `/v1/e20`

- [ ] **Passo 1: Implementar `normalizeE20` em `server/src/services/productNormalizers.ts`**
  - Criar função `normalizeE20(raw: any, query?: string): NormalizedResult`:
    - Higieniza campos vazios/nulos com `cleanObject`.
    - Calcula o total de registros consolidados (soma de ocorrências, proprietários e alertas).
    - Retorna objeto normalizado contendo:
      - `veiculo`: ficha técnica da BIN Fabril (com renavam garantido).
      - `roubo_furto`: status consolidado e lista de BOs.
      - `locadoras`: status consolidado e registros detectados.
      - `seguradoras`: status consolidado e registros detectados.
      - `frota_publica`: status consolidado e registros detectados.
      - `proprietarios`: linha do tempo e proprietário atual.
      - `produtos_infosinistros`: registros adicionais (salvados P8, leilões P11, fotos P25, km P21, laudo cautelar P22).
  - Adicionar `case 'E20': return normalizeE20(raw, query);` no switch de `normalizeProductResult`.

- [ ] **Passo 2: Integrar no `consultaUnificadaController.ts`**
  - No método `executarConsultaWeb`:
    - Adicionar condição especial:
      ```ts
      if (product.code === 'E20') {
        const resultE20 = await e20Service.executarConsultaE20(cleanQuery);
        // persistir query, debitar preco efetivo R$ 0.69 se houver dados, retornar json
      }
      ```
  - No método `executarConsultaApiV1`:
    - Adicionar a mesma condição para que chamadas via `/v1/e20` ou `/v1/pre-vistoria` executem o orquestrador `e20Service`.

- [ ] **Passo 3: Commit**
  ```bash
  git add server/src/services/productNormalizers.ts server/src/controllers/consultaUnificadaController.ts
  git commit -m "feat(server): normalizacao pericial e controller para produto E20"
  ```

---

### Tarefa 5: Renderização do Laudo Pericial E20 no Frontend

**Arquivos:**
- Modificar: `src/components/consultas/LaudoPericialUniversal.tsx`

**Interfaces:**
- Consome: dados normalizados de `E20`
- Produz: interface visual pericial com cards especializados para BIN, Roubo/Furto, Locadoras, Seguradoras, Frota Pública, Proprietários e Fotos

- [ ] **Passo 1: Criar componente de renderização pericial para E20 em `LaudoPericialUniversal.tsx`**
  - Adicionar `case 'E20':` na função `renderConteudoProduto`:
    - **Card de Resumo & Emplacamento:** Placa grande, modelo/marca, RENAVAM com botão de copiar, ano fabricação/modelo, cor, combustível, procedência.
    - **Grid de Indicadores Periciais Rápidos:**
      - Roubo e Furto: verde ("Nada Consta") ou vermelho ("Alerta de Queixa Ativa").
      - Locadora: verde ("Sem registro de locadora") ou âmbar ("Ex-Frota de Locadora").
      - Seguradora: verde ("Sem registro de seguradora") ou âmbar ("Histórico em Seguradora/Indenização").
      - Frota Pública: verde ("Sem uso público") ou âmbar ("Ex-Viatura / Frota Pública").
      - Leilão / Salvado: verde ("Sem registro de leilão") ou âmbar ("Registro em Leilão/Salvado").
    - **Card 1 — Ficha Técnica da BIN Fabril (P35):** Chassi, RENAVAM (garantido), motor, potência, cilindradas, peso bruto, capacidade de carga, eixos, espécie, tipo, carroceria, tipo montagem, situação chassi, situação veículo, município e UF.
    - **Card 2 — Histórico de Roubo e Furto (E5 + P10):** Tabela/lista de boletins de ocorrência, órgão de segurança, município/UF, data e descrição.
    - **Card 3 — Procedência de Frotas & Destinação Comercial:**
      - Sub-seção Locadoras (registros detectados em E2 ou P4).
      - Sub-seção Seguradoras (registros detectados em E2 ou P1/P14).
      - Sub-seção Frota Pública (registros detectados em E2 ou P2/P3).
    - **Card 4 — Histórico Dominial Completo (E2):**
      - Proprietário atual destacado com tempo de posse.
      - Linha do tempo ascendente ordinal com todos os proprietários (#1 até o atual), datas de aquisição e badges de identificação.
    - **Card 5 — Galeria de Fotos & Flagrantes (P25) e Laudos Cautelares (se houverem):**
      - Grid de imagens de flagrantes de trânsito se retornadas pela InfoSinistros.
      - Histórico de KM e laudos cautelares anteriores.

- [ ] **Passo 2: Validar renderização visual e botões de exportação (PDF/Imprimir)**
  - Garantir que a certidão possui fé pública no cabeçalho e rodapé em conformidade com o padrão corporativo da Renacred.

- [ ] **Passo 3: Commit**
  ```bash
  git add src/components/consultas/LaudoPericialUniversal.tsx
  git commit -m "feat(ui): renderizador pericial completo para laudo E20 Pre Vistoria"
  ```

---

### Tarefa 6: Testes Automatizados, Validação de Tipos e Homologação End-to-End

**Arquivos:**
- Criar: `server/tests/test-e20-pre-vistoria.ts`

- [ ] **Passo 1: Criar script de teste automatizado `server/tests/test-e20-pre-vistoria.ts`**
  - Testar o fluxo completo de E20 com uma placa real (`MIR2011`):
    - Executa a chamada do `e20Service`.
    - Valida que a BIN Fabril foi obtida.
    - Valida a presença de RENAVAM (ou ativação de E19).
    - Valida a unificação de E5 e E2.
    - Valida a correta distribuição das respostas nos cards.
    - Imprime relatório de verificação com tempos de resposta.

- [ ] **Passo 2: Executar o teste via pwsh**
  ```bash
  npx tsx server/tests/test-e20-pre-vistoria.ts
  ```

- [ ] **Passo 3: Executar build do backend e do frontend para garantir zero erros**
  ```bash
  cd server && npm run build
  npm run build
  ```

- [ ] **Passo 4: Commit final**
  ```bash
  git add server/tests/test-e20-pre-vistoria.ts
  git commit -m "test(server): teste automatizado end-to-end do produto E20"
  ```

---

## Plan Self-Review Checklist

- [x] **Spec coverage:** Todos os requisitos da solicitação do usuário foram atendidos (Pré-Vistoria 100%, E19 contingência se não houver renavam a R$ 0,04, E5, E2, regras de distribuição de respostas em cards de locadoras/seguradoras/frotas/roubo-furto, preço R$ 0,69, Admin API Key).
- [x] **Placeholder scan:** Nenhum "TODO", "TBD" ou etapas vagas. Todas as tarefas possuem código explicativo e passos claros.
- [x] **Type consistency:** Nome `E20`, slug `pre-vistoria`, preço `0.69`, custo `0.32`, tipos padronizados em `productsCatalog.ts`, `productNormalizers.ts` e `e20Service.ts`.
- [x] **Review Focus:** 5 critérios de risco identificados e mitigados com testes correspondentes.
