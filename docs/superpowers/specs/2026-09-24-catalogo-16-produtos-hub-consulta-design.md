# Especificação de Design: Catálogo de 16 Produtos Oficiais, Hub de Consultas com Seletor e Contingência Transparente

**Data:** 24/09/2026  
**Status:** Aprovado para Planejamento de Implementação  
**Escopo:** Frontend (React 18 + Vite + Tailwind) & Backend (Node.js + Express + Prisma + FetchBrasil)  
**Autor:** Antigravity / Wellington (Renacred)

---

## 1. Visão Geral e Objetivos do Produto

O bureau **Renacred** está expandindo seu portfólio oficial de 2 produtos (E1 e E2) para **16 produtos completos (E1 a E16)**, abrangendo investigações imobiliárias, patrimoniais, veiculares, cadastrais e de restrições jurídicas.

### Objetivos Principais:
1. **Navegação Escalável no Sidebar**: Substituir a listagem individual vertical de produtos por uma estrutura unificada e profissional com dois acessos centrais: **Consultar** (Hub de busca com seletor dinâmico) e **Catálogo de Produtos** (vitrine do assinante).
2. **Hub de Consulta Inteligente (`/consultar`)**: Proporcionar uma página única e fluida onde o usuário escolhe qualquer um dos 16 produtos através de um seletor visual com busca e categorias. O formulário ajusta dinamicamente as máscaras (CPF/CNPJ, Placa com Mercosul, RG) e renderiza o laudo pericial correspondente.
3. **Catálogo de Produtos (`/produtos`)**: Uma vitrine corporativa para o assinante explorar todos os 16 produtos, visualizar dados retornados, parâmetros aceitos, precificação transparente ("Custo zero sem dados") e botão "Consultar Agora".
4. **Contingência 100% Transparente**: Provedores com múltiplos endpoints em cascata (primário e contingências 1 e 2) devem responder com layout unificado, de modo que o usuário nunca perceba se a resposta veio da rota primária ou da contingência.
5. **Higienização de Dados (Zero Redundância)**: Remoção de duplicidades (ex: código numérico do município descartado em favor do nome da cidade) e ocultação de campos nulos ou vazios para manter laudos enxutos e periciais.

---

## 2. Catálogo Oficial dos 16 Produtos (E1 a E16)

| Código | Nome Oficial | Categoria | Entrada | Provedor Principal | Contingências | Custo | Preço Venda |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **E1** | Histórico Imobiliário & Cartórios | Imobiliário | CPF / CNPJ | `historico_imobiliario` | — | R$ 0,00 | R$ 5,00 |
| **E2** | Histórico de Proprietários | Veicular | Placa | `historico_proprietario` | — | R$ 0,00 | R$ 5,00 |
| **E3** | Busca de Frota Veicular | Veicular | CPF / CNPJ | `renavam_frota` | — | R$ 0,10 | R$ 1,32 |
| **E4** | Endereço do Proprietário | Veicular | Placa | `renavam_endereco_proprietario` | — | R$ 0,10 | R$ 1,32 |
| **E5** | Histórico de Roubo e Furto | Veicular | Placa | `renavam_ocorrencia` | `ocorrencias_senatran` | R$ 0,15 | R$ 1,32 |
| **E6** | CNH com Imagem Oficial | Cadastral | CPF | `cnh_senatran` | — | R$ 0,30 | R$ 1,32 |
| **E7** | CNH sem Imagem (Dados) | Cadastral | CPF | `cnh_pwn` | `renach_cnh` | R$ 0,30 | R$ 1,32 |
| **E8** | RENAINF Multas Nacionais | Veicular | Placa | `renainf_multas` | — | R$ 0,15 | R$ 1,32 |
| **E9** | RENAJUD Restrições Judiciais | Jurídico | Placa | `renajud_restricoes` | `renajud_processos` | R$ 0,15 | R$ 1,32 |
| **E10** | Comunicação de Venda | Veicular | Placa | `renavam_comunicacao_venda` | — | R$ 0,10 | R$ 1,32 |
| **E11** | Vínculos & Parentes | Cadastral | CPF | `parentes` | — | R$ 0,03 | R$ 1,32 |
| **E12** | BIN Online Veicular | Veicular | Placa | `placa_serpro` | `renavam_endereco_proprietario`, `placa_senatran` | R$ 0,30 | R$ 1,32 |
| **E13** | Cadastro CPF Nível I (Básica) | Cadastral | CPF | `cpf_basica` | — | R$ 0,03 | R$ 1,32 |
| **E14** | SNG Gravames Financeiros | Veicular | Placa | `sng_gravames` | — | R$ 0,15 | R$ 1,32 |
| **E15** | Cadastro CPF Nível II (Completo) | Cadastral | CPF | `cpf_pwn` | — | R$ 0,35 | R$ 1,32 |
| **E16** | Busca por RG | Cadastral | RG | `reg_rg` | — | R$ 0,03 | R$ 1,32 |

---

## 3. Arquitetura Frontend

### 3.1 Fonte Única da Verdade (`src/config/productsCatalog.ts`)
Definição padronizada de metadados consumida em toda a aplicação:
```typescript
export interface ProductDefinition {
  code: string;              // 'E1' .. 'E16'
  name: string;              // Nome oficial corporativo
  shortName: string;         // Nome compacto para o seletor
  category: 'imobiliario' | 'veicular' | 'cadastral' | 'juridico';
  inputType: 'cpf_cnpj' | 'cpf' | 'placa' | 'rg';
  inputLabel: string;        // Ex: "CPF ou CNPJ", "Placa do Veículo", "Número do RG"
  placeholder: string;       // Ex: "000.000.000-00", "ABC-1234 ou ABC1D23"
  description: string;       // Descrição executiva do produto
  highlights: string[];      // Bullet points dos dados entregues no laudo
  defaultCost: number;       // Custo de tabela FetchBrasil
  defaultPrice: number;      // Preço de venda padrão
  hasContingency: boolean;   // Indica se possui rota secundária de contingência
}
```

### 3.2 Novo Sidebar (`src/components/layout/Sidebar.tsx`)
* **Menu Enxuto**:
  * Visão Geral (`/dashboard`)
  * **Seção PRODUTOS & CONSULTAS**:
    * 🔍 **Consultar** (`/consultar`) — Hub central com seletor dinâmico.
    * 📦 **Catálogo de Produtos** (`/produtos`) — Vitrine com badge `16`.
  * **Seção GESTÃO & CONTRATO** (Assinante) / **ADMINISTRAÇÃO** (SuperAdmin).
* **Retrocompatibilidade de Rotas**: `/consultar`, `/produtos/e1`, `/produtos/e2` e futuras `/produtos/:codigo` continuam válidas e direcionam ao produto correspondente no Hub.

### 3.3 Vitrine Catálogo de Produtos (`src/pages/assinante/CatalogoProdutos.tsx`)
* Header corporativo com resumo da assinatura e saldo disponível.
* Filtro em abas por categoria (`Todos`, `Veicular (8)`, `Imobiliário (1)`, `Cadastral (5)`, `Jurídico (2)`).
* Campo de busca instantânea com filtro em tempo real por nome, código ou termos-chave (ex: "roubo", "senatran", "cnh", "multas", "gravame").
* Grid responsivo de cards institucionais com acabamento corporativo (paleta navy/slate, sem gradientes de IA), contendo:
  * Badge de código e categoria.
  * Título e descrição clara do laudo.
  * Tipo de parâmetro exigido.
  * Preço por consulta com selo destacado de `Custo zero se não houver dados`.
  * Botão de ação: `Consultar Agora →` que encaminha para `/consultar?produto={code}`.

### 3.4 Hub de Consulta Unificado com Seletor (`src/pages/assinante/HubConsulta.tsx`)
* **Seletor de Produto Inteligente**:
  * Card de topo estilizado exibindo o produto atualmente selecionado.
  * Botão "Trocar Produto" que abre dropdown/modal com busca rápida e lista categorizada dos 16 produtos.
  * Sincronização automática com a URL: `/consultar?produto=e5`.
* **Formulário de Entrada Adaptativo**:
  * Aplicação automática de máscara:
    * `cpf_cnpj`: Máscara dinâmica para 11 dígitos (CPF) ou 14 dígitos (CNPJ).
    * `cpf`: Máscara estrita `000.000.000-00` com validação de algoritmo de dígitos verificadores.
    * `placa`: Força caracteres maiúsculos, máscara de placa tradicional (`ABC-1234`) ou padrão Mercosul (`ABC1D23`).
    * `rg`: Campo alfanumérico sanitizado.
  * Validações de integridade antes do envio.
* **Renderização Polimórfica do Laudo Pericial**:
  * Mapeamento de componentes de visualização especializados ou card estruturado universal:
    * E1: Laudo Imobiliário Cartório & DOI (`DeclaracaoCard`).
    * E2: Linha do tempo cronológica ascendente de proprietários (`TimelineProprietarios`).
    * E3: Grade de veículos da frota localizada com contagem de bens.
    * E4: Cartão de endereço oficial do titular do veículo.
    * E5: Card pericial de histórico de roubo/furto com status de recuperação.
    * E6/E7: Ficha cadastral do condutor (com exibição segura de imagem quando presente).
    * E8: Painel de infrações e multas RENAINF.
    * E9: Resumo de restrições judiciais e bloqueios RENAJUD.
    * E10: Histórico de comunicação de venda ativa/efetivada.
    * E11: Árvore/grade de vínculos e parentes identificados.
    * E12: Ficha completa da BIN online (marca, modelo, chassi, cor, procedência).
    * E13/E15: Ficha cadastral CPF Nível I / II (situação cadastral, data de nascimento, nome da mãe, score e renda estimada quando disponível).
    * E14: Registro de gravame ativo no SNG com instituição financeira e data.
    * E16: Registro civil oficial por RG.
* **Ações do Laudo**:
  * Botões de exportação para **PDF Pericial** (padrão `pdf-report-designer` com código hash e rodapé de fé pública) e **Excel**.
* **Histórico Recente Contextual**:
  * Tabela com as últimas consultas realizadas para o produto selecionado, com botão "Ver Laudo" (sem recobrança) e "Reconsultar".

---

## 4. Arquitetura Backend: Normalização & Contingências

### 4.1 Dispatcher de Consultas (`server/src/services/fetchbrasil.service.ts`)
Cada produto possui seu fluxo de execução parametrizado:
```typescript
interface ServiceEndpointConfig {
  primary: string;           // ex: 'renavam_ocorrencia'
  contingencies?: string[];  // ex: ['ocorrencias_senatran']
  paramName?: string;        // 'query' (padrão) ou outro se necessário
}
```

### 4.2 Execução com Cascata de Tolerância a Falhas
```typescript
async executeWithContingency(config: ServiceEndpointConfig, query: string): Promise<any> {
  // 1. Tenta endpoint primário
  try {
    const res = await this.client.get('/', { params: { token: this.token, api: config.primary, query } });
    if (res.data && !res.data.erro) return { data: res.data, provider: config.primary };
  } catch (errPrimary) {
    logger.warn(`[FETCHBRASIL] Primário ${config.primary} falhou, acionando contingências...`);
  }

  // 2. Tenta contingências em sequência
  if (config.contingencies) {
    for (const fallbackApi of config.contingencies) {
      try {
        const res = await this.client.get('/', { params: { token: this.token, api: fallbackApi, query } });
        if (res.data && !res.data.erro) return { data: res.data, provider: fallbackApi };
      } catch (errFallback) {
        logger.warn(`[FETCHBRASIL] Contingência ${fallbackApi} falhou...`);
      }
    }
  }

  throw new Error('Falha na consulta em todas as bases oficiais disponíveis.');
}
```

### 4.3 Normalização & Higienização de Dados (Sanitizer)
* **Regra de Remoção de Nulos**: Chaves cujo valor seja `null`, `""`, `undefined` ou `"N/A"` são expurgadas antes do retorno.
* **Regra de Não-Duplicidade**:
  * Campos como `codigo_municipio: "1415"` e `nome_municipio: "Joinville"` são unificados em `municipio: "Joinville - SC"`.
  * Códigos de marcas/modelos técnicos são traduzidos ou agrupados com a descrição humana.
* **Schema de Resposta Padronizado Renacred**:
  ```json
  {
    "success": true,
    "produto": "E5",
    "parametro_pesquisado": "IVO2002",
    "tempo_resposta_ms": 340,
    "total_registros": 1,
    "custo_debitado": 1.32,
    "dados": { ... },
    "hash_autenticacao": "RNC-E5-A9F8E2-20260924"
  }
  ```

### 4.4 Regra de Faturamento e Inadimplência
* Se `total_registros === 0`, o backend aplica estritamente `custo_debitado: 0.00` e não debita saldo nem acumula fatura.
* Validações de inadimplência (bloqueio 402 se houver fatura vencida) e checagem de saldo permanecem ativas via `billing.service.ts`.

---

## 5. Roteamento da API Pública de Desenvolvedores (v1)

A API de integração externa suportará chamadas flexíveis para todos os 16 produtos:
* `GET /v1/:produtoCodigo?token={TOKEN}&query={DOCUMENTO}`
  * Exemplo: `GET /v1/e5?token=...&query=IVO2002`
  * Exemplo: `GET /v1/roubo-furto?token=...&query=IVO2002`
* `POST /v1/:produtoCodigo` com payload JSON `{ "query": "..." }`.
* Mantida compatibilidade total para `/v1/imobiliario/historico` (E1) e `/v1/veicular/proprietarios` (E2).

---

## 6. Critérios de Validação e Testes

1. **Testes de Unidade dos Normalizadores**:
   * Garantir que respostas do endpoint primário e da contingência resultem no mesmo formato final.
   * Garantir que campos nulos e códigos duplicados sejam eliminados.
2. **Teste de Fluxo de UI**:
   * Abrir `/produtos`, filtrar por categoria, clicar em "Consultar Agora" e verificar abertura no `/consultar` com o produto e máscara corretos.
   * Troca de produto no seletor do Hub: verificar adaptação imediata dos inputs e do histórico recente.
3. **Build e Verificação de Tipos**:
   * Frontend: `npm run build` (zero erros TypeScript ou de empacotamento Vite).
   * Backend: `npm --prefix server run build` (zero erros de compilação).
4. **Deploy em Produção (VPS Ubuntu 24.04)**:
   * Script `/opt/renacred/deploy.sh` executado com sucesso e containers recarregados.
