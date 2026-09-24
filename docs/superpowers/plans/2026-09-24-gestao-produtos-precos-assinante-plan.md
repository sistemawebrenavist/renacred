# Plano de Implementação: Correções de UI/Normalização e Gestão de Produtos/Preços por Assinante

> **Objetivo:** 
> 1. Corrigir os 4 pontos críticos identificados no uso real:
>    - Ação "Visualizar" com ícone de olho no histórico de consultas reabrindo o laudo corretamente.
>    - Correção da exibição do custo/tarifa (inclusive para Super Admin isento e registros na tabela).
>    - Máscara e validação estrita de placas (antiga/cinza e Mercosul) idêntica ao InfoSinistros (bloqueando digitações como `ATTLLLL`).
>    - Correção do normalizador E4 e renderização do endereço completo do veículo/proprietário (`LCM4244`).
> 2. Implementar a gestão comercial por assinante (B2B multi-produto):
>    - Matriz dos 16 produtos no painel de administração (Wellington) com permissões (`allowedProducts`) e preços customizados (`customPrices`) por CNPJ.
>    - Hub de consulta filtrado por produtos contratados e Catálogo com fluxo de upsell para não contratados.
>    - Bloqueio `403` na API v1 para produtos não autorizados.

---

## 1. Diagnóstico Detalhado dos Problemas Reportados

### Ponto A: "Ver Laudo" não abria nada e nome deve ser "Visualizar" com ícone de olho
- **Causa Raiz:** Em `server/src/routes/consultasRoutes.ts`, o endpoint `/api/consultas/historico` selecionava `resultData` do banco, mas na linha 77 (`queries.map(...)`) omitia `resultData` no JSON retornado. No frontend `HubConsulta.tsx`, `handleViewHistoricalLaudo` recebia `item.resultData === undefined`, impossibilitando a exibição do laudo. Além disso, a tabela lia `q.totalDeclaracoes` em vez de `q.totalRegistros`.
- **Solução:**
  1. No backend (`consultasRoutes.ts`), retornar `resultData: q.resultData` e `requestData: q.requestData` no objeto mapeado.
  2. No frontend (`HubConsulta.tsx`), caso `resultData` venha vazio por qualquer razão, chamar `/api/consultas/detalhes/:id` como fallback instantâneo.
  3. Renomear o botão para **"Visualizar"** com o ícone `Eye` (`<Eye className="w-3.5 h-3.5 mr-1" />`).
  4. Corrigir a coluna de registros para `q.totalRegistros ?? q.totalDeclaracoes`.

### Ponto B: Custo aparecendo como R$ 0,00 ou inconsistente
- **Causa Raiz:** No backend (`consultaUnificadaController.ts`), a linha `const finalCost = (!isSuperAdmin && hasData) ? eligibility.price : 0;` zera o custo porque o Wellington está logado como `SUPER_ADMIN`. Quando o laudo exibia `Tarifa: R$ 0,00`, parecia um erro, quando na verdade era uma isenção da conta admin.
- **Solução:**
  1. No laudo e no retorno da consulta, diferenciar claramente a **Tarifa Oficial do Produto** (`tarifa_tabela: R$ 1,32`) do **Valor Efetivamente Debitado** (`custo_debitado: R$ 0,00 - Isento SuperAdmin`).
  2. Para clientes assinantes normais, garantir que se `total_registros > 0`, a tarifa contratada seja debitada e exibida.

### Ponto C: Validação e máscara de Placa (Cinza e Mercosul) igual ao InfoSinistros
- **Causa Raiz:** Em `HubConsulta.tsx`, o formatador de placa apenas pegava os primeiros 7 caracteres alfanuméricos (`val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)`), permitindo que o usuário digitasse `ATTLLLL`.
- **Solução:**
  1. Portar a função `maskPlaca` do InfoSinistros (`src/utils/masks.ts`):
     - Posições 1-3: estritamente letras `[A-Z]`.
     - Posição 4: estritamente número `[0-9]`.
     - Posição 5: letra ou número (Mercosul ou tradicional).
     - Posições 6-7: estritamente números `[0-9]`.
     - Formato visual automático: `AAA-0000` ou `AAA-0A00`.
  2. Validação regex no frontend e backend: `/^[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}$/`. Se não bater o padrão, impede o envio e alerta o usuário antes da consulta.

### Ponto D: E4 não trouxe o endereço no laudo (`LCM4244`)
- **Causa Raiz:** Em `server/src/services/productNormalizers.ts` (`normalizeE4`), o código buscava endereço dentro de `raw.proprietario.logradouro`, mas o provedor envia o nó `endereco` na raiz (`raw.endereco: { logradouro, numero, complemento, bairro, cod_municipio_descricao, uf, cep }`). Como não encontrava em `proprietario`, o `cleanObject` limpava os campos e a tela exibia `-, S/N`.
- **Solução:**
  1. Em `server/src/services/productNormalizers.ts` (`normalizeE4`):
     - Mapear `const end = raw?.endereco || raw?.proprietario?.endereco || raw?.proprietario || {};`.
     - Extrair `logradouro`, `numero`, `complemento`, `bairro`, `municipio: end.cod_municipio_descricao || end.municipio`, `uf: end.uf`, `cep: end.cep`.
     - Adicionar o nó `endereco` estruturado nos dados normalizados.
  2. Em `src/components/consultas/LaudoPericialUniversal.tsx`:
     - Renderizar `dados.endereco || dados.proprietario?.endereco || dados.proprietario` na seção de endereço do laudo E4, formatando com vírgula, número, bairro, cidade e CEP.

---

## 2. Estrutura de Arquivos e Modificações

| Arquivo | Ação | Responsabilidade |
| :--- | :--- | :--- |
| `server/src/services/productNormalizers.ts` | Modificar | Corrigir extração de `raw.endereco` para o produto E4 |
| `server/src/routes/consultasRoutes.ts` | Modificar | Retornar `resultData`, `requestData` e `totalRegistros` no histórico |
| `src/components/consultas/LaudoPericialUniversal.tsx` | Modificar | Exibir endereço E4 completo e diferenciar tarifa de tabela vs valor debitado |
| `src/pages/assinante/HubConsulta.tsx` | Modificar | Aplicar `maskPlaca` do InfoSinistros, botão "Visualizar" com `Eye`, e reabertura do laudo |
| `server/prisma/schema.prisma` | Modificar | Adicionar `allowedProducts: String[]` e `customPrices: Json?` ao modelo `Company` |
| `server/src/controllers/adminController.ts` | Modificar | Persistir `allowedProducts` e `customPrices` em `updateCompanySettings` e `createCompany` |
| `server/src/controllers/consultaUnificadaController.ts` | Modificar | Validar permissão de produto (`403`) e aplicar preços customizados por CNPJ |
| `src/pages/admin/GerenciarClientes.tsx` | Modificar | Atualizar modal com matriz dos 16 produtos (toggles e preços unitários individuais) |
| `src/components/consultas/SeletorProdutoModal.tsx` | Modificar | Filtrar seletor por produtos contratados pela empresa |
| `src/pages/assinante/CatalogoProdutos.tsx` | Modificar | Destacar produtos contratados vs disponíveis para upgrade com fluxo de upsell |

---

## 3. Tarefas de Implementação

### Fase 1: Correções Imediatas de UI, Normalização e Validação
- [ ] **Tarefa 1.1:** Corrigir `normalizeE4` em `server/src/services/productNormalizers.ts` para ler `raw.endereco` e estruturar endereço completo.
- [ ] **Tarefa 1.2:** Corrigir `server/src/routes/consultasRoutes.ts` para retornar `resultData`, `requestData` e `totalRegistros` em `/api/consultas/historico`.
- [ ] **Tarefa 1.3:** Criar utilitário `maskPlaca` em `src/utils/masks.ts` e aplicar validação de placa cinza e Mercosul em `HubConsulta.tsx`.
- [ ] **Tarefa 1.4:** Atualizar `HubConsulta.tsx`:
  - Botão "Visualizar" com ícone `Eye` de `lucide-react`.
  - Reabertura correta do laudo em tela com dados recuperados.
  - Correção da coluna Registros na tabela de histórico.
- [ ] **Tarefa 1.5:** Atualizar `LaudoPericialUniversal.tsx`:
  - Exibição do endereço completo no laudo E4 (`Logradouro, Nº, Complemento, Bairro, Cidade/UF, CEP`).
  - Distinção entre Tarifa de Tabela do Produto e Débito Real (com badge "Isento SuperAdmin" para Wellington).

### Fase 2: Gestão Comercial de Produtos e Preços por Assinante
- [ ] **Tarefa 2.1:** Migração Prisma (`schema.prisma`): adicionar `allowedProducts` e `customPrices` em `Company`.
- [ ] **Tarefa 2.2:** Backend Admin: atualizar `updateCompanySettings` e `listCompanies` em `adminController.ts`.
- [ ] **Tarefa 2.3:** Backend Despachante: implementar bloqueio `403` para produtos não contratados e tarifação customizada em `consultaUnificadaController.ts`.
- [ ] **Tarefa 2.4:** Frontend Admin (`GerenciarClientes.tsx`): reformular modal de configuração com matriz dos 16 produtos, switches de liberação e inputs de valor unitário customizado.
- [ ] **Tarefa 2.5:** Frontend Assinante: filtrar `SeletorProdutoModal.tsx` e `HubConsulta.tsx` para produtos contratados e fluxo de upsell no `CatalogoProdutos.tsx`.

### Fase 3: Build, Deploy na VPS e Testes E2E
- [ ] **Tarefa 3.1:** Compilar frontend (`vite build`) e backend (`tsc`).
- [ ] **Tarefa 3.2:** Deploy na VPS (`/opt/renacred/deploy.sh`) com `npx prisma db push`.
- [ ] **Tarefa 3.3:** Testes ao vivo:
  - Testar placa `LCM4244` no E4 e verificar se o endereço da Igreja Universal é exibido 100% preenchido.
  - Testar digitação de placa inválida (`ATTLLLL`) e verificar o bloqueio da máscara.
  - Testar clique em "Visualizar" no histórico e validar abertura do laudo.
  - Testar produto liberado vs bloqueado por assinante no admin.
