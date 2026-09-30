# Plano de Implementação — Três Novos Produtos Oficiais: E17, E18 e E19

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar 3 novos produtos oficiais ao ecossistema da Renacred:
1. **E17 — Busca por Nome Completo** (`nome_basico`): Localizador de CPFs, data de nascimento e filiação via nome civil.
2. **E18 — Busca por Nome de Mãe/Pai** (`reg_filiacao`): Localizador de filhos e filiações a partir do nome materno ou paterno.
3. **E19 — Busca de RENAVAM por Placa** (`placa_df`): Consulta limpa e direta que retorna **estritamente** os 5 campos solicitados: `name`, `type`, `year`, `yearManufacture`, `renavam`.

Todos os produtos com regra de Custo Zero (se 0 registros), integração web e API de clientes.

---

## Especificações Comerciais & Técnicas dos Produtos

| Código | Nome Oficial | Provedor / Endpoint | Input | Custo | Venda Padrão | Categoria |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **E17** | **Busca por Nome Completo** | `api=nome_basico&query={nome}` | Nome Completo | R$ 0,03 | R$ 1,32 | Cadastral |
| **E18** | **Busca por Nome de Mãe/Pai** | `api=reg_filiacao&query={nome}&tipo={mae\|pai}` | Nome Filiação + Tipo | R$ 0,03 | R$ 1,32 | Cadastral |
| **E19** | **Busca de RENAVAM por Placa** | `api=placa_df&query={placa}` | Placa Veicular | R$ 0,04 | R$ 1,32 | Veicular |

---

## Regras Críticas e Restrições Globais

1. **E19 (RENAINF / RENAVAM Simplificado):**
   - Deve retornar e renderizar no laudo **SOMENTE** os campos estritos:
     - `name`: Nome / Modelo do Veículo (ex: `"VW/GOLF"`)
     - `type`: Tipo do Veículo (ex: `"AUTOMOVEL"`)
     - `year`: Ano Modelo (ex: `"2000"`)
     - `yearManufacture`: Ano de Fabricação (ex: `"1999"`)
     - `renavam`: Código RENAVAM Oficial (ex: `"00726937886"`)
   - Todos os demais dados retornados pelo endpoint bruto (`restrictions`, `situation`, `debit`, `owner`, `address`) devem ser filtrados/ocultados, entregando uma consulta focada, ultra-rápida e limpa de identificação de RENAVAM.

2. **E18 (Filiação Materna/Paterna):**
   - Suporte a busca por Nome de Mãe (`tipo=mae`) e Nome de Pai (`tipo=pai`).
   - Normalização dos filhos retornados (`data` array): `cpf`, `nome`, `nascimento`, `uf`, `nome_mae`, `nome_pai`.
   - Na interface do Hub, permitir alternar entre "Mãe" e "Pai" ou informar no formulário.

3. **E17 (Busca por Nome Completo):**
   - Retorno de homônimos com CPF, sexo, mãe, data de nascimento e idade calculada.
   - Ação rápida: botão de atalho para consultar o CPF localizado em E13 ou E15.

4. **Garantia Renacred (Custo Zero):**
   - Se qualquer um dos produtos não retornar registros (`total_registros === 0`), a consulta é debitada a **R$ 0,00** para todos os clientes pré-pagos e pós-pagos.

---

## Tarefas de Implementação

### Tarefa 1: Backend — Chamadas no Provedor (FetchBrasil)
**Arquivos:**
- Modificar: `server/src/services/fetchbrasil.service.ts`

- [ ] **Passo 1.1:** Adicionar método `consultarNomeBasico(nome: string)`:
  - Chamada a `?token=...&api=nome_basico&query=${encodeURIComponent(nome)}`.
- [ ] **Passo 1.2:** Adicionar método `consultarRegFiliacao(nome: string, tipo: 'mae' | 'pai' = 'mae')`:
  - Chamada a `?token=...&api=reg_filiacao&query=${encodeURIComponent(nome)}&tipo=${tipo}`.
- [ ] **Passo 1.3:** Adicionar método `consultarPlacaDf(placa: string)`:
  - Chamada a `?token=...&api=placa_df&query=${encodeURIComponent(placa)}`.
- [ ] **Passo 1.4:** Adicionar tratamento de contingência no switch principal `consultarProdutoComContingencia`:
  - `case 'E17'`: chamar `consultarNomeBasico`.
  - `case 'E18'`: chamar `consultarRegFiliacao`.
  - `case 'E19'`: chamar `consultarPlacaDf`.

---

### Tarefa 2: Backend — Normalizadores de Dados
**Arquivos:**
- Modificar: `server/src/services/productNormalizers.ts`

- [ ] **Passo 2.1:** Implementar `normalizeE17(raw: any, query: string)`:
  - Extrair `RESULTADOS` (ou `data`).
  - Mapear lista de pessoas: `cpf` formatado, `nome`, `sexo` padronizado, `nome_mae`, `data_nascimento` formatada (`DD/MM/AAAA`) e cálculo de `idade`.
- [ ] **Passo 2.2:** Implementar `normalizeE18(raw: any, query: string)`:
  - Extrair `data` array e `meta` (`total`, `tipo`).
  - Mapear filhos: `cpf` formatado, `nome`, `nascimento`, `uf`, `nome_mae`, `nome_pai`.
- [ ] **Passo 2.3:** Implementar `normalizeE19(raw: any, query: string)`:
  - Extrair estritamente:
    ```ts
    const v = raw?.vehicle || {};
    const m = v.model || {};
    return {
      totalRegistros: v.renavam ? 1 : 0,
      dados: {
        name: m.name || null,
        type: m.type || null,
        year: m.year ? String(m.year) : null,
        yearManufacture: m.yearManufacture ? String(m.yearManufacture) : null,
        renavam: v.renavam || null,
        plate: v.plate || query
      }
    };
    ```

---

### Tarefa 3: Backend — Catálogo de Produtos e Roteamento Unificado
**Arquivos:**
- Modificar: `server/src/config/productsCatalog.ts`
- Modificar: `server/src/controllers/consultaUnificadaController.ts`
- Modificar: `server/src/routes/apiRoutes.ts`

- [ ] **Passo 3.1:** Registrar E17, E18 e E19 em `server/src/config/productsCatalog.ts`:
  - `E17`: slug `busca-nome`, defaultCost 0.03, defaultPrice 1.32, category `cadastral`, inputType `nome`.
  - `E18`: slug `busca-filiacao`, defaultCost 0.03, defaultPrice 1.32, category `cadastral`, inputType `nome`.
  - `E19`: slug `busca-renavam`, defaultCost 0.04, defaultPrice 1.32, category `veicular`, inputType `placa`.
- [ ] **Passo 3.2:** No controlador unificado `consultaUnificadaController.ts`:
  - Tratar parâmetros de consulta para E17/E18 (nomes) e E19 (placas).
  - Suportar parâmetro `tipo` (`mae` ou `pai`) para E18.
- [ ] **Passo 3.3:** Expor endpoints na API pública v1 para clientes de integração:
  - `/v1/e17` e `/v1/nome-completo`
  - `/v1/e18` e `/v1/filiacao`
  - `/v1/e19` e `/v1/renavam-placa`

---

### Tarefa 4: Frontend — Catálogo e Formulário no Hub de Consultas
**Arquivos:**
- Modificar: `src/config/productsCatalog.ts`
- Modificar: `src/pages/assinante/HubConsulta.tsx`

- [ ] **Passo 4.1:** Adicionar E17, E18 e E19 a `src/config/productsCatalog.ts`:
  - `E17` (Busca por Nome Completo)
  - `E18` (Busca por Nome de Mãe/Pai)
  - `E19` (Busca de RENAVAM por Placa)
  - Atualizar contadores das categorias (Cadastral e Veicular) e total de produtos (19 produtos oficiais).
- [ ] **Passo 4.2:** No `HubConsulta.tsx`:
  - Permitir digitação livre de nome para E17 e E18 (sem máscara rígida de CPF/Placa).
  - Para E18, exibir seletor/toggle "Mãe / Pai".
  - Para E19, aplicar máscara de placa padrão Mercosul/Cinza.

---

### Tarefa 5: Frontend — Laudo Pericial Universal (Design & Renderização)
**Arquivos:**
- Modificar: `src/components/consultas/LaudoPericialUniversal.tsx`

- [ ] **Passo 5.1:** Criar renderizador para **E17**:
  - Tabela/Cards executivos de homônimos encontrados.
  - Exibição de CPF, data de nascimento, idade calculada, nome da mãe.
  - Botão de ação direta: "Consultar CPF".
- [ ] **Passo 5.2:** Criar renderizador para **E18**:
  - Resumo de filiação pesquisada (Mãe ou Pai).
  - Lista de filhos encontrados com CPF formatado, data de nascimento, UF e pais.
- [ ] **Passo 5.3:** Criar renderizador para **E19 (RENAVAN por Placa)**:
  - Design premium e limpo focado nos dados oficiais solicitados:
    - Card com Destaque para o **RENAVAN** (fonte mono grande, botão de copiar).
    - Grid com **Nome / Modelo** (`name`), **Tipo** (`type`), **Ano Modelo** (`year`) e **Ano Fabricação** (`yearManufacture`).
    - Nenhuma poluição visual com dados irrelevantes.
- [ ] **Passo 5.4:** Garantir suporte a impressão oficial (`@media print`) para os três laudos sem sidebar.

---

### Tarefa 6: Validação, Build, Testes e Deploy
- [ ] **Passo 6.1:** Executar `npm run build` no frontend e no `server/`.
- [ ] **Passo 6.2:** Testar consultas reais para E17, E18 e E19.
- [ ] **Passo 6.3:** Commit, push para GitHub e execução de deploy na VPS (`bash /opt/renacred/deploy.sh`).
- [ ] **Passo 6.4:** Validação na interface de produção do assinante e no dashboard admin.
