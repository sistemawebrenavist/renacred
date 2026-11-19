# Plano de Implementação Cirúrgico: Produto E23 — CNH Customizada (Código REN_JUS_2026)

> **Diretriz de Engenharia Estrita:** **ZERO REFATORAÇÃO** em código existente que já está funcionando.  
> **Escopo:** Exclusivamente a adição e integração do produto **E23 (REN_JUS_2026)**, sem modificar ou alterar o comportamento dos produtos E1 a E22.  
> **Valores Fixos Diretos:** Preço de Custo **R$ 0,20** | Preço de Venda **R$ 1,32** (sem criar camadas extras ou overengineering de configuração).  
> **Glossário & Mapeamento:** Mapeamento integral de todos os arquivos do sistema e glossário técnico dos códigos RENACH.

---

## 1. Mapeamento Completo de Arquivos do Sistema

Para garantir que o produto E23 seja integrado sem deixar pontas soltas e sem refatorar o que já funciona, o mapeamento cobre exatamente os arquivos necessários:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              MAPA DE ARQUIVOS DO PRODUTO E23                                    │
├───────────────────────────────────┬───────────────────────────────────┬─────────────────────────┤
│ ARQUIVO                           │ TIPO DE AÇÃO                      │ RESPONSABILIDADE        │
├───────────────────────────────────┼───────────────────────────────────┼─────────────────────────┤
│ server/src/config/productsCatalog │ Adição cirúrgica em array         │ Registro backend E23    │
│ src/config/productsCatalog.ts     │ Adição cirúrgica + contadores     │ Catálogo frontend E23   │
│ src/utils/cnhRenachGlossario.ts   │ Criação de arquivo novo           │ Glossário Códigos RENACH│
│ server/src/services/productNorm.  │ Adição de normalizeE23 + switch   │ Sanitização Whitelabel  │
│ server/src/controllers/consultaU. │ Adição de if (code === 'E23')     │ Exposição de payload 1:1│
│ src/components/consultas/LaudoP.  │ Adição de case 'E23' no switch    │ Interface UI/UX Pro Max │
│ src/pages/admin/LogsApi.tsx       │ Adição de matcher if/else         │ Reconhecimento em logs  │
│ src/pages/assinante/PortalDevDocs │ Atualização de texto de cabeçalho │ Título matriz E1 a E23  │
│ server/tests/test-all-products    │ Adição de query E23               │ Teste ponta a ponta     │
│ RENACRED.md                       │ Adição do bloco E23               │ Documentação de Produto │
│ README.md                         │ Atualização de referências        │ Documentação Geral      │
│ .agents/MEMORY.md                 │ Registro em memória do projeto    │ Contexto Histórico      │
└───────────────────────────────────┴───────────────────────────────────┴─────────────────────────┘
```

---

## 2. Glossário Técnico Oficial de Códigos RENACH / DETRAN

Para que nenhum dado seja exibido como número crú ou sigla sem significado, criaremos o arquivo de glossário `src/utils/cnhRenachGlossario.ts` mapeando todas as tabelas oficiais do Sistema Nacional de Trânsito:

### A. Tabela de Situação da CNH (`situacao_codigo`)
- `1`: EMITIDA
- `2`: CANCELADA
- `3`: SUSPENSA
- `4`: **CONFIRMADA** (Situação Regular)
- `5`: CASSADA
- `6`: **ALTERADA** (Histórico de Alteração Cadastral)
- `7`: BLOQUEADA JUDICIALMENTE

### B. Tabela de Motivos de Requerimento (`motivo_requerimento`)
- `1`: PRIMEIRA HABILITAÇÃO
- `2`: ADIÇÃO DE CATEGORIA
- `3`: MUDANÇA DE CATEGORIA
- `4`: SEGUNDA VIA DE CNH
- `5`: **RENOVAÇÃO DE EXAMES**
- `6`: REABILITAÇÃO DE CONDUTOR
- `7`: TRANSFERÊNCIA DE DOMICÍLIO

### C. Tabela de Tipos de Eventos e Atualizações
- **Tipos de Evento (`tipo_evento`):**
  - `E`: **EXAME** (Médico, Psicológico ou Pericial)
  - `C`: **CURSO** (Formação, Renovação ou Especialização)
- **Tipos de Atualização (`tipo_atualizacao`):**
  - `I`: **INCLUSÃO** (Adição inicial ao prontuário)
  - `S`: **SUBSTITUIÇÃO** (Renovação periódica ou reavaliação)
  - `E`: **EXCLUSÃO**

### D. Tabela de Exames Médicos (`cod_exame` / `codigo`)
- `01`: AVALIAÇÃO PSICOLÓGICA (PSICOTÉCNICO)
- `02`: EXAME TEÓRICO-TÉCNICO
- `03`: **APTIDÃO FÍSICA E MENTAL** (Exame Clínico e Oftalmológico)
- `S03`: **SUBSTITUIÇÃO - APTIDÃO FÍSICA E MENTAL**
- `04`: EXAME DE DIREÇÃO VEICULAR
- `05`: EXAME TOXICOLÓGICO DE LARGA JANELA DE DETECÇÃO

### E. Tabela de Resultados de Exames (`resultado`)
- `1`: **APTO** (Aprovado sem restrições impeditivas)
- `2`: **INAPTO TEMPORÁRIO**
- `3`: **INAPTO DEFINITIVO**
- `4`: **APTO COM RESTRIÇÕES** (Uso de lentes corretivas, veículo adaptado, etc.)

### F. Tabela de Cursos Especializados e de Renovação (`cod_curso` / `codigo`)
- `30`: **ATUALIZAÇÃO PARA RENOVAÇÃO DA CNH**
- `I30`: **INCLUSÃO - ATUALIZAÇÃO PARA RENOVAÇÃO DA CNH**
- `31`: CURSO DE RECICLAGEM PARA CONDUTORES INFRATORES
- `32`: TRANSPORTE COLETIVO DE PASSAGEIROS
- `33`: TRANSPORTE DE ESCOLARES
- `34`: PRODUTOS PERIGOSOS (MOPP)
- `35`: VEÍCULOS DE EMERGÊNCIA
- `36`: CARGA INDIVISÍVEL

### G. Tabela de Modalidades de Curso (`modalidade`)
- `1`: **PRESENCIAL (Integral)**
- `2`: PRESENCIAL (Modular)
- `3`: ENSINO A DISTÂNCIA (EAD Homologado SENATRAN)

---

## 3. Diretriz "Zero Refatoração": Como Implementar Sem Tocar no Resto

1. **Catálogo Backend (`server/src/config/productsCatalog.ts`):**
   - Não refatorar a interface `ServerProductConfig` nem as funções de busca.
   - Apenas adicionar o objeto de E23 ao final do array `SERVER_PRODUCTS`:
     ```typescript
     {
       code: 'E23',
       slug: 'cnh-customizada-renach',
       name: 'CNH Customizada (Código REN_JUS_2026)',
       category: 'cadastral',
       inputType: 'cpf',
       apiPrimary: 'renach_prontuario',
       apiContingencies: [],
       defaultCost: 0.20,
       defaultPrice: 1.32,
       slugAliases: ['ren_jus_2026', 'ren-jus-2026', 'cnh-renach', 'cnh-ren-jus', 'renach-2026', 'cnh-renach-2026', 'renach_prontuario']
     }
     ```
2. **Catálogo Frontend (`src/config/productsCatalog.ts`):**
   - Não alterar estrutura nem tipos. Apenas inserir a definição completa de E23 ao final de `PRODUCTS_CATALOG` e incrementar contadores em `CATEGORIES_CONFIG` (total: 23, cadastral: 10).
3. **Normalizador (`server/src/services/productNormalizers.ts`):**
   - Não modificar nenhum dos normalizadores de E1 a E22.
   - Adicionar a nova função isolada `normalizeE23(raw, query)` e incluir uma linha no switch: `case 'E23': return normalizeE23(raw, query);`.
4. **Controlador (`server/src/controllers/consultaUnificadaController.ts`):**
   - Adicionar apenas o bloco `if (product.code === 'E23')` para anexar `condutor`, `cnh`, `exames` e dados estruturados no retorno de forma idêntica ao que já é feito para E21 e E22.
5. **Laudo Universal (`src/components/consultas/LaudoPericialUniversal.tsx`):**
   - Inserir `case 'E23':` no switch de renderização com a UI pericial completa (9 cards estruturados).
   - Não alterar nenhum layout dos produtos existentes.

---

## 4. Roteiro Cirúrgico de Execução Passo a Passo

### Passo 1: Glossário Oficial
- Criar `src/utils/cnhRenachGlossario.ts` com funções utilitárias:
  - `traduzirSituacaoCnh(cod)`
  - `traduzirMotivoRequerimento(cod)`
  - `traduzirExame(cod)`
  - `traduzirResultadoExame(cod)`
  - `traduzirCurso(cod)`
  - `traduzirModalidade(cod)`

### Passo 2: Catálogos (Backend e Frontend)
- Atualizar `server/src/config/productsCatalog.ts` com custo `0.20` e venda `1.32`.
- Atualizar `src/config/productsCatalog.ts` com metadados, destaques e contadores `23` / `10`.

### Passo 3: Normalizador Backend & Blindagem Whitelabel
- Implementar `normalizeE23` em `server/src/services/productNormalizers.ts`:
  - `sanitizeProviderRawPreserve(raw)`
  - Expurgo obrigatório do nó `api_central`.
  - Normalização segura de datas (YYYYMMDD / ISO) e montagem de `condutor`, `cnh`, `exames`, `cursos`, `eventos`, `contato`, `endereco`.
  - Registro em `normalizeProductResult`.

### Passo 4: Controlador Unificado
- No `server/src/controllers/consultaUnificadaController.ts`, injetar os nós de E23 nas rotas Web e API v1.

### Passo 5: Laudo Pericial Universal (UI/UX Pro Max)
- Adicionar o bloco `case 'E23'` em `src/components/consultas/LaudoPericialUniversal.tsx`:
  1. Card de Identificação Civil (Nome, CPF formatado, RG SESP/PR, Filiação Materna/Paterna, Nascimento e Sexo).
  2. Card de Prontuário de Habilitação & CNH (Nº Registro, Nº CNH, Formulário RENACH, PGU, Situação Confirmada, Validade Regular).
  3. Painel de Categorias Habilitadas & Histórico Temporal (A: 2009, B: 1978, C/D/E).
  4. Card de Contatos & Endereço Residencial (Celular, E-mail, Logradouro, CEP, Município).
  5. Tabela Pericial de Exames Médicos (Aptidão Física/Mental, resultado APTO, datas, médico, clínica credenciada).
  6. Painel de Cursos de Formação & Atualização (Atualização CNH, modalidade presencial integral, entidade).
  7. Linha do Tempo de Eventos Oficiais do Prontuário.
  8. Auditoria de Impedimentos e Bloqueios (Nada Consta).
  9. Visualizador Técnico Sanitarizado com Accordion e botão Copiar JSON (sem provedor).
  10. Compatibilidade 100% de Impressão e PDF (`print:break-inside-avoid`).

### Passo 6: Atualização dos Arquivos de Documentação do Projeto
- `RENACRED.md`: Inserir a documentação oficial de E23 junto aos demais produtos.
- `README.md`: Atualizar contagens e rotas.
- `.agents/MEMORY.md`: Registrar a chegada de E23 ao catálogo em produção.
- `src/pages/admin/LogsApi.tsx`: Adicionar detecção de rotas de E23.
- `src/pages/assinante/PortalDevDocs.tsx`: Atualizar título para `(E1 a E23)`.

### Passo 7: Validação e Testes Ponta a Ponta
- Executar `server/tests/test-all-products-fetchbrasil.ts` com o CPF `96238550953`.
- Validar ausência de vazamento de provedor (`api_central`).
- Executar verificação de build TypeScript sem erros.
