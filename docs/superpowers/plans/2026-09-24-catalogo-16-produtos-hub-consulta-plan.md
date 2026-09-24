# Plano de Implementação: Catálogo de 16 Produtos Oficiais, Hub de Consultas com Seletor e API para Assinantes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o catálogo completo de 16 produtos oficiais da Renacred (E1 a E16) no frontend e backend, substituindo a listagem isolada do Sidebar por um Hub de Consultas com seletor inteligente e uma página de Catálogo de Produtos para o assinante, com suporte à contingência transparente, higienização de dados e expansão da API pública externa v1, aplicando rigorosamente as diretrizes da skill **Impeccable** (zero ícones decorativos, zero emojis, design de birô corporativo de alta densidade).

**Architecture:** Fonte única de verdade de metadados (`productsCatalog.ts`) compartilhada conceitualmente entre frontend e backend. No backend, dispatcher com execução em cascata de contingências transparentes e camada de normalização/higienização antes da persistência e retorno. No frontend, menu lateral enxuto apontando para o Hub (`/consultar`) e Catálogo (`/produtos`), com inputs adaptativos e renderização pericial polimórfica.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vite, Lucide React (apenas para controles de ação funcionais), Node.js 20, Express, Prisma ORM, PostgreSQL 16, Axios, Winston.

**Spec:** [`docs/superpowers/specs/2026-09-24-catalogo-16-produtos-hub-consulta-design.md`](file:///c:/Users/Henrique%20-%20PC/Desktop/Projetos%20Dev/Renacred/docs/superpowers/specs/2026-09-24-catalogo-16-produtos-hub-consulta-design.md)

---

## Global Constraints & Diretrizes Impeccable

- **Zero Ícones Decorativos & Zero Emojis:** Proibido o uso de emojis (🚗, 🏢, ⚖️, 📦, etc.) ou ícones soltos servindo como adorno visual em títulos, badges ou cards. Ícones são restritos a controles de ação explícita (fechar, expandir, copiar, pesquisar, status funcional de carregamento).
- **Sem Kickers ou Eyebrows:** Proibido subtítulos decorativos vazios ou rótulos flutuantes acima de títulos (o título deve sustentar seu próprio peso).
- **Sem Gradientes em Textos:** Títulos e cabeçalhos usam cores sólidas de alto contraste (`#0F172A`, `#FFFFFF`). Ênfase visual alcançada por peso (`font-bold`, `font-semibold`) e escala tipográfica.
- **Sem Efeitos de Fundo Artificiais:** Proibido o uso de `blur-3xl`, orbes coloridos difusos ou sombras coloridas de raio zero (halos). Superfícies sólidas, bordas discretas (`#E2E8F0` / `#1E293B`) e contraste mínimo de 4.5:1.
- **Sigilo Absoluto de Provedores:** Nunca exibir nomes externos no frontend ou na documentação do assinante. Usar sempre "Fontes Oficiais", "Bases Federais", "DOI", "Serventias Cartorárias" ou "Bases Estaduais/Senatran".
- **Custo Zero Sem Dados:** Consultas que retornarem `0` registros/declarações devem aplicar estritamente `custo_debitado: 0.00`.
- **Zero Redundância & Ocultação de Nulos:** Descartar códigos numéricos redundantes (ex: código de cidade descartado quando houver nome legível), e ocultar chaves com valores nulos/vazios.
- **IPv4 Obrigatório no Backend:** Todas as chamadas para o provedor externo devem utilizar `family: 4` e `keepAlive: false` no `https.Agent`.

---

## Review Focus

1. **Troca Dinâmica de Produto:** Ao alterar o produto no seletor, o formulário limpa o erro anterior, ajusta a máscara (CPF, Placa ou RG) e carrega o histórico específico daquele produto.
2. **Contingência Transparente:** Caso o provedor primário falhe, o fallback assume automaticamente e o cliente recebe exatamente o mesmo schema de dados.
3. **Cálculo de Custo e Saldo:** Contas pré-pagas são debitadas conforme o preço do produto selecionado; contas pós-pagas acumulam o valor na competência; se retornar sem dados, nenhum débito ocorre.
4. **Retrocompatibilidade de Rotas:** URLs antigas (`/consultar`, `/produtos/e1`, `/produtos/e2`) continuam funcionando perfeitamente sem quebrar links salvos.
5. **API v1 dos Assinantes:** Funciona por código (`/v1/e3`), por slug (`/v1/frota`) e por parâmetro de serviço (`/v1?api=renavam_frota`) tanto via GET quanto POST.

---

## Estrutura de Arquivos

### Arquivos a Criar:
- `src/config/productsCatalog.ts`: Metadados centralizados dos 16 produtos (códigos, categorias, descrições, preços, inputs).
- `server/src/config/productsCatalog.ts`: Configuração backend dos endpoints oficiais, provedores primários e contingências.
- `server/src/services/productNormalizers.ts`: Camada pura de normalização e higienização de dados por produto.
- `server/src/controllers/consultaUnificadaController.ts`: Controller backend para processar qualquer um dos 16 produtos na web e na API externa.
- `src/pages/assinante/CatalogoProdutos.tsx`: Vitrine executiva com filtros por categoria e busca para os 16 produtos (design Impeccable sóbrio).
- `src/pages/assinante/HubConsulta.tsx`: Página central com seletor inteligente, formulário adaptativo e visualização de laudos.
- `src/components/consultas/SeletorProdutoModal.tsx`: Modal/gaveta rápida de seleção de produto com pesquisa instantânea.
- `src/components/consultas/LaudoPericialUniversal.tsx`: Renderizador polimórfico de laudos periciais higienizados.

### Arquivos a Modificar:
- `server/src/services/fetchbrasil.service.ts`: Implementar chamada genérica com contingência transparente em cascata.
- `server/src/routes/v1Routes.ts`: Mapear rotas externas dos 16 produtos com códigos e slugs amigáveis.
- `server/src/index.ts`: Registrar novas rotas de consultas web `/api/consultas`.
- `src/components/layout/Sidebar.tsx`: Reestruturar links para `/consultar` e `/produtos`.
- `src/App.tsx`: Registrar as novas páginas e rotas de retrocompatibilidade.
- `src/pages/assinante/PortalDevDocs.tsx`: Documentar todos os 16 produtos no catálogo de APIs do cliente.

---

## Tarefas de Implementação

### Tarefa 1: Catálogo Central de Produtos (Single Source of Truth)

**Arquivos:**
- Criar: `src/config/productsCatalog.ts`
- Criar: `server/src/config/productsCatalog.ts`

- [ ] **Passo 1:** Criar `src/config/productsCatalog.ts` com a lista completa dos 16 produtos (E1 a E16), definindo categorias (`imobiliario`, `veicular`, `cadastral`, `juridico`), tipo de input (`cpf_cnpj`, `cpf`, `placa`, `rg`), preços oficiais (custo e venda R$ 1,32 / R$ 5,00), descrições institucionais sóbrias e badges de texto limpo (sem ícones/emojis decorativos).
- [ ] **Passo 2:** Criar `server/src/config/productsCatalog.ts` espelhando a lista com o mapeamento técnico de `apiPrimary` e `apiContingencies` para a FetchBrasil conforme validado nos testes da VPS.
- [ ] **Passo 3:** Executar validação de tipos TypeScript em ambos os projetos para garantir ausência de erros.
- [ ] **Passo 4:** Commit: `feat: criar definicao centralizada do catalogo de 16 produtos`

---

### Tarefa 2: Backend - Dispatcher com Cascata de Contingências e Normalizadores

**Arquivos:**
- Criar: `server/src/services/productNormalizers.ts`
- Modificar: `server/src/services/fetchbrasil.service.ts`

- [ ] **Passo 1:** Criar `server/src/services/productNormalizers.ts` com funções de higienização de dados:
  - `cleanObject(obj)`: função recursiva que remove chaves com valores `null`, `""`, `undefined` e normaliza códigos duplicados (ex: descarta `codigoMunicipio` quando houver `descricaoMunicipio`).
  - Funções de normalização específicas para cada categoria: Veicular (Frota, Roubo/Furto, Endereço, Multas, Renajud, Gravame, BIN), Cadastral (CNH, CPF I, CPF II, Parentes, RG) e Imobiliário (E1).
- [ ] **Passo 2:** Em `server/src/services/fetchbrasil.service.ts`, implementar o método `consultarProdutoComContingencia(productCode: string, query: string)`:
  - Busca as configurações do produto em `productsCatalog`.
  - Executa a tentativa no endpoint primário via `client.get('/', { params: { token, api, query } })`.
  - Em caso de falha (status != 200 ou timeout), itera automaticamente pelas contingências definidas.
  - Ao receber a resposta com sucesso, despacha o payload bruto para o normalizador correspondente.
- [ ] **Passo 3:** Adicionar cache em memória curto (10 min) e deduplicação em voo (singleflight) para as consultas de todos os produtos.
- [ ] **Passo 4:** Commit: `feat(server): dispatcher com contingencia transparente e higienizacao de dados`

---

### Tarefa 3: Backend - Controller de Consultas e Expansão da API v1 para Assinantes

**Arquivos:**
- Criar: `server/src/controllers/consultaUnificadaController.ts`
- Criar: `server/src/routes/consultasRoutes.ts`
- Modificar: `server/src/routes/v1Routes.ts`
- Modificar: `server/src/index.ts`

- [ ] **Passo 1:** Criar `server/src/controllers/consultaUnificadaController.ts`:
  - Valida se o produto existe no catálogo.
  - Valida o parâmetro de entrada (formato de CPF, CNPJ, Placa ou RG).
  - Executa a checagem de saldo / fatura via `billingService`.
  - Chama `fetchbrasilService.consultarProdutoComContingencia()`.
  - Se retornar sem dados, registra débito R$ 0,00; se retornar dados, debita a tarifa configurada.
  - Grava o registro da consulta na tabela `queries` do Prisma.
  - Gera o hash pericial de autenticação (`RNC-{PRODUTO}-{RAND}-{TIMESTAMP}`).
- [ ] **Passo 2:** Criar `server/src/routes/consultasRoutes.ts` mapeando `POST /api/consultas/:codigo` protegido por `authMiddleware`.
- [ ] **Passo 3:** Atualizar `server/src/routes/v1Routes.ts` mapeando:
  - Rota dinâmica `/v1/:productCode` (aceitando códigos `e1`..`e16` e slugs como `frota`, `roubo-furto`, `renajud`, `cnh`).
  - Rota raiz `/v1` que suporta `?api=...&query=...` para 100% de compatibilidade legada.
- [ ] **Passo 4:** Registrar `consultasRoutes` no `server/src/index.ts`.
- [ ] **Passo 5:** Compilar o backend (`npm --prefix server run build`) para verificar integridade de tipos.
- [ ] **Passo 6:** Commit: `feat(server): rotas de consulta unificada e expansao da api v1 para assinantes`

---

### Tarefa 4: Frontend - Reestruturação do Sidebar e Roteamento

**Arquivos:**
- Modificar: `src/components/layout/Sidebar.tsx`
- Modificar: `src/App.tsx`

- [ ] **Passo 1:** Atualizar `src/components/layout/Sidebar.tsx`:
  - Substituir a lista vertical de E1 e E2 por dois itens principais na seção de Produtos (sem ícones decorativos ou emojis):
    - **Consultar** (`/consultar`)
    - **Catálogo de Produtos** (`/produtos`) com tag textual discreta `16`.
  - Manter a sobriedade e o alinhamento institucional do menu lateral.
- [ ] **Passo 2:** Em `src/App.tsx`, registrar as rotas autenticadas:
  - `/consultar` -> `HubConsulta`
  - `/produtos` -> `CatalogoProdutos`
  - `/catalogo` -> redireciona para `/produtos`
  - Manter aliases de compatibilidade: `/produtos/e1` e `/produtos/e2` redirecionando para `/consultar?produto=e1` e `/consultar?produto=e2`.
- [ ] **Passo 3:** Testar a navegação no frontend.
- [ ] **Passo 4:** Commit: `feat(ui): reestruturacao do sidebar e rotas do catalogo e hub`

---

### Tarefa 5: Frontend - Página "Catálogo de Produtos" (`/produtos`) (Padrão Impeccable)

**Arquivos:**
- Criar: `src/pages/assinante/CatalogoProdutos.tsx`

- [ ] **Passo 1:** Desenvolver o cabeçalho executivo: título sólido sem gradiente, tipografia com alto contraste, resumo da modalidade/saldo em fonte mono tabular.
- [ ] **Passo 2:** Implementar filtros por categoria em botões de texto limpo (`Todos (16)`, `Veicular (8)`, `Imobiliário (1)`, `Cadastral (5)`, `Jurídico (2)`), sem emojis ou ícones ilustrativos.
- [ ] **Passo 3:** Renderizar o grid de cards corporativos:
  - Fundo sólido slate/branco elevado, contornos nítidos `#E2E8F0`.
  - Tag textual do código oficial (`E1`, `E5`, etc.) e categoria em peso `font-semibold`.
  - Título do produto e descrição pericial precisa.
  - Parâmetro exigido e tarifa formatada com `font-mono tnum` e selo de fé pública `Custo zero sem dados`.
  - Botão de ação textual: `Consultar →`.
- [ ] **Passo 4:** Commit: `feat(ui): pagina de catalogo de produtos no padrao impecavel`

---

### Tarefa 6: Frontend - Hub de Consulta com Seletor Inteligente & Inputs Adaptativos

**Arquivos:**
- Criar: `src/components/consultas/SeletorProdutoModal.tsx`
- Criar: `src/pages/assinante/HubConsulta.tsx`

- [ ] **Passo 1:** Criar `SeletorProdutoModal.tsx`:
  - Diálogo de alta usabilidade com busca textual rápida e agrupamento por categorias.
  - Seleção direta por tecla Enter ou clique.
- [ ] **Passo 2:** Em `HubConsulta.tsx`:
  - Barra de topo exibindo o produto selecionado em destaque sóbrio com botão `Alterar Consulta`.
  - Formulário adaptativo de alta densidade:
    - `cpf_cnpj`: Máscara dinâmica para 11 ou 14 dígitos.
    - `cpf`: Máscara estrita `000.000.000-00`.
    - `placa`: Entrada forçada em maiúsculas com compatibilidade Mercosul / tradicional.
    - `rg`: Campo alfanumérico limpo.
  - Botão de ação `Consultar` com estado de carregamento funcional.
- [ ] **Passo 3:** Feedback claro e legível quando a pesquisa retornar sem dados (badge neutro indicando custo R$ 0,00).
- [ ] **Passo 4:** Commit: `feat(ui): hub de consulta com seletor dinamico e campos adaptativos`

---

### Tarefa 7: Frontend - Laudo Pericial Universal & Histórico Contextual

**Arquivos:**
- Criar: `src/components/consultas/LaudoPericialUniversal.tsx`
- Modificar: `src/pages/assinante/HubConsulta.tsx`

- [ ] **Passo 1:** Criar `LaudoPericialUniversal.tsx`:
  - Layout pericial de birô corporativo com cabeçalho institucional, carimbo de data/hora e hash de autenticação digital.
  - Exibição de dados higienizados sem campos nulos e sem códigos repetitivos.
  - Ações funcionais: Exportar PDF pericial e Exportar Planilha Excel.
- [ ] **Passo 2:** Tabela de consultas recentes no rodapé com numerais tabulares e ações diretas: `Ver Laudo` (0ms) e `Reconsultar`.
- [ ] **Passo 3:** Commit: `feat(ui): laudo pericial universal higienizado e historico contextual`

---

### Tarefa 8: Frontend - Atualização da Documentação Técnica do Assinante

**Arquivos:**
- Modificar: `src/pages/assinante/PortalDevDocs.tsx`

- [ ] **Passo 1:** Atualizar a aba de produtos da documentação técnica para catalogar todos os 16 produtos.
- [ ] **Passo 2:** Fornecer exemplos de código de integração (cURL, Node.js, Python, PHP, C#) para qualquer um dos produtos selecionados.
- [ ] **Passo 3:** Atualizar o Playground interativo para permitir testar chamadas reais de qualquer produto.
- [ ] **Passo 4:** Commit: `docs: atualizar portal de integracao com os 16 produtos oficiais`

---

### Tarefa 9: Validação, Testes Locais e Compilação

**Arquivos:**
- Testes e builds locais

- [ ] **Passo 1:** Executar compilação do Frontend: `npm run build`.
- [ ] **Passo 2:** Executar compilação do Backend: `npm --prefix server run build`.
- [ ] **Passo 3:** Corrigir eventuais avisos de tipos ou dependências ausentes.
- [ ] **Passo 4:** Testar chamadas no simulador e certificar que nenhum erro de console ou rede ocorra.
- [ ] **Passo 5:** Commit: `chore: validacao e ajustes de compilacao de producao`

---

### Tarefa 10: Deploy Oficial na VPS de Produção

**Arquivos:**
- Execução remota no servidor `209.50.245.165`

- [ ] **Passo 1:** Subir alterações para o repositório oficial no GitHub (`git push origin main`).
- [ ] **Passo 2:** Disparar deploy na VPS remota:
  ```bash
  ssh -n -o StrictHostKeyChecking=no root@209.50.245.165 "chmod +x /opt/renacred/deploy.sh && /opt/renacred/deploy.sh"
  ```
- [ ] **Passo 3:** Verificar healthcheck da API: `curl -s http://127.0.0.1:3002/health`.
- [ ] **Passo 4:** Executar chamada real de teste na API pública para um dos novos produtos (ex: `/v1/e3?token=rena_live_testmaster001&query=01036115925`).
- [ ] **Passo 5:** Confirmar que o frontend em `renacred.com.br` está renderizando o novo Sidebar, Catálogo e Hub perfeitamente.
