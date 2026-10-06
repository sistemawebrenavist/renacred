# Troca do Token FetchBrasil e Testes Completos de Todos os Produtos (E1 a E20) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Atualizar o token de autenticação da FetchBrasil para `FB-2414-FE5E-D56B-F396` em todo o ecossistema Renacred e validar a integridade funcional, normalização pericial e contingências de todos os 20 produtos do catálogo (E1 a E20).

**Architecture:** O token da FetchBrasil é injetado via variável de ambiente `FETCHBRASIL_API_TOKEN` com fallback padrão em `fetchbrasil.service.ts`. Uma suíte automatizada de testes E2E executará chamadas com o novo token em todos os produtos (E1 a E20), auditando o endpoint primário, as contingências automáticas, o tempo de resposta, o status HTTP e a normalização canônica dos dados.

**Tech Stack:** Node.js, TypeScript, Express, Axios, FetchBrasil REST API, InfoSinistros B2B API, tsx, Vitest/Custom Test Runner.

**Spec:** Instrução direta do usuário: Atualizar token para `FB-2414-FE5E-D56B-F396`, testar todos os produtos com o novo token e estruturar plano de validação.

## Global Constraints

- O token oficial da FetchBrasil deve ser rigorosamente `FB-2414-FE5E-D56B-F396`.
- Todos os produtos de E1 a E20 devem ser auditados individualmente.
- Consultas com zero registros devem manter a política comercial de custo zero (R$ 0,00).
- Todos os testes devem rodar via TypeScript estrito sem erros de compilação (`tsc` e `vite build`).

## Review Focus

1. **Validade do Token no WAF da FetchBrasil:** Garantir que o token `FB-2414-FE5E-D56B-F396` não retorne HTTP 401/403 ("Token não autorizado") em nenhuma das APIs da central.
2. **Produtos Veiculares (E2, E4, E5, E8, E9, E10, E12, E14, E19, E20):** Validar que consultas com placas reais retornam os campos obrigatórios (chassi, renavam, ocorrências, gravames).
3. **Produtos Cadastrais e CNH (E6, E7, E11, E13, E15, E16, E17, E18):** Validar parâmetros de CPF, RG e Nome.
4. **Produto E1 (DOI / Histórico Imobiliário):** Validar retorno de declarações ou estrutura vazia tratada.
5. **Produto E20 (Pré Vistoria Consolidada):** Validar que a orquestração mista (InfoSinistros + E5 + E2 + contingência E19) funciona harmoniosamente com o novo token.

---

### Task 1: Atualização Central do Token FetchBrasil no Servidor e Documentação

**Files:**
- Modify: `server/src/services/fetchbrasil.service.ts:110-120`
- Modify: `server/.env.example:10-18`
- Modify: `server/.env` (criar/atualizar se existir)
- Modify: `RENACRED.md`

**Interfaces:**
- Consumes: Token `FB-2414-FE5E-D56B-F396`
- Produces: `fetchbrasilService.token` atualizado para todas as requisições HTTP

- [ ] **Step 1: Atualizar o fallback de token em `server/src/services/fetchbrasil.service.ts`**
Substituir `FB-78C1-9751-7F03-D237` por `FB-2414-FE5E-D56B-F396`.

- [ ] **Step 2: Atualizar `server/.env.example` e `.env`**
Configurar `FETCHBRASIL_API_TOKEN="FB-2414-FE5E-D56B-F396"`.

- [ ] **Step 3: Atualizar documentação de referência em `RENACRED.md`**
Substituir as URLs de exemplo com o novo token.

- [ ] **Step 4: Executar verificação rápida de compilação**
Run: `npx tsc --noEmit` no diretório `server/`.
Expected: 0 erros.

- [ ] **Step 5: Commit Task 1**
```bash
git add server/src/services/fetchbrasil.service.ts server/.env.example RENACRED.md
git commit -m "feat(fetchbrasil): atualiza token de api para FB-2414-FE5E-D56B-F396"
```

---

### Task 2: Criação da Suíte de Testes Automatizada de Todos os Produtos (E1 a E20)

**Files:**
- Create: `server/tests/test-all-products-fetchbrasil.ts`

**Interfaces:**
- Consumes: `fetchbrasilService.consultarProdutoComContingencia`, `e20Service.executarConsultaE20`, `SERVER_PRODUCTS`
- Produces: Relatório detalhado com status de cada um dos 20 produtos (E1 a E20)

- [ ] **Step 1: Escrever script de teste `server/tests/test-all-products-fetchbrasil.ts`**
Criar script com bateria de testes cobrindo cada produto com seu respectivo identificador de teste ideal:
  - E1 (Imobiliário): CPF `00000000000` ou `81261691920`
  - E2 (Proprietários): Placa `MIR2011`
  - E3 (Frota): CPF `00000000000`
  - E4 (Endereço Proprietário): Placa `TAT2E88` / `MIR2011`
  - E5 (Roubo/Furto): Placa `MIR2011`
  - E6 (CNH Foto): CPF `96238550953`
  - E7 (CNH Dados): CPF `96238550953`
  - E8 (Multas): Placa `TJM9D75` / `MIR2011`
  - E9 (Renajud): Placa `RUS6C19` / `MIR2011`
  - E10 (Comunicação Venda): Placa `LCM4244` / `MIR2011`
  - E11 (Parentes): CPF `81261691920`
  - E12 (BIN Online): Placa `AIC9942` / `MIR2011`
  - E13 (CPF Básico): CPF `81261691920`
  - E14 (Gravame): Placa `PYT2849` / `MIR2011`
  - E15 (CPF Completo): CPF `81261691920`
  - E16 (RG): RG `59681940`
  - E17 (Busca Nome): Nome `HENRIQUE SILVA`
  - E18 (Filiação): Nome `MARIA SILVA`
  - E19 (Busca RENAVAM): Placa `MIR2011`
  - E20 (Pré Vistoria Consolidada): Placa `MIR2011`

- [ ] **Step 2: Adicionar validação de payload e normalização**
Para cada chamada, verificar se a resposta possui dados ou retorno limpo sem crash, capturando o endpoint utilizado (primário vs contingência) e tempo de latência.

- [ ] **Step 3: Commit Task 2**
```bash
git add server/tests/test-all-products-fetchbrasil.ts
git commit -m "test(fetchbrasil): script de auditoria e testes completos para produtos E1 a E20"
```

---

### Task 3: Execução e Diagnóstico da Bateria de Testes com o Novo Token

**Files:**
- Test Execution: `server/tests/test-all-products-fetchbrasil.ts`

- [ ] **Step 1: Executar a suíte de testes com `npx tsx`**
Run: `npx tsx tests/test-all-products-fetchbrasil.ts` no diretório `server/`.
Expected: Execução de todos os produtos E1 a E20 com saída no terminal.

- [ ] **Step 2: Analisar a taxa de sucesso por produto**
Classificar o resultado de cada produto:
  - Sucesso com dados
  - Sucesso com zero registros (normalizado)
  - Erro de validação de parâmetro
  - Erro de endpoint/permissão da FetchBrasil

- [ ] **Step 3: Aplicar correções de parâmetros ou endpoints se algum produto falhar**
Se algum endpoint retornar mudança de comportamento no novo token, ajustar mapeamento no catálogo ou contingências transparentes.

- [ ] **Step 4: Commit Task 3 (se houver ajustes)**
```bash
git commit -m "fix(services): ajustes de resiliência e contingência identificados nos testes"
```

---

### Task 4: Validação Final dos Builds e Relatório Executivo

**Files:**
- Test: `server/tests/test-all-products-fetchbrasil.ts`
- Build: `server` e root

- [ ] **Step 1: Rodar build do backend**
Run: `npm run build` no diretório `server/`.
Expected: Saída limpa, zero erros de compilação.

- [ ] **Step 2: Rodar build do frontend**
Run: `npm run build` na raiz do projeto.
Expected: Build Vite completado com sucesso.

- [ ] **Step 3: Gerar tabela resumo de auditoria para o usuário**
Apresentar os tempos de resposta, taxa de sucesso e comportamento dos 20 produtos com o novo token.
