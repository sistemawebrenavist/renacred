---
name: pdf-report-designer
description: Diretrizes de design e padrões visuais para geração de relatórios executivos, certidões periciais e documentos PDF corporativos de alta fidelidade na Renacred. Use sempre que for criar ou aprimorar layouts de PDF no sistema.
---

# PDF Report Designer & Executive Document System

Esta skill estabelece os padrões estéticos, tipográficos, arquiteturais e de segurança para a geração de PDFs periciais da plataforma **Renacred**.

---

## 1. Princípios de Design Visual

Documentos periciais de bureaus de crédito e dados cartorários devem transmitir **autoridade, solidez institucional e fé pública**. Evite layouts simplórios, caixas chapadas sem respiro ou tabelas cruas.

### A. Paleta de Cores Institucional
* **Primary Navy (Fundo Principal do Topo):** `#0B1325` ou `#0F172A`
* **Royal Blue (Destaques e Cabeçalhos):** `#1D4ED8` ou `#1E3A8A`
* **Surface Background (Cards de Metadados):** `#F8FAFC`
* **Border Neutral (Divisores e Contornos):** `#E2E8F0` / `#CBD5E1`
* **Text Primary (Títulos e Dados-Chave):** `#0F172A`
* **Text Secondary (Rótulos e Detalhes):** `#64748B`
* **Success Accent (Apontamentos / Status OK):** `#047857` (Verde Esmeralda)
* **Gold / Badge Accent (Chancela de Produto):** `#D97706` (Âmbar Corporativo)

---

## 2. Anatomia do Documento Pericial Oficial

Todo laudo ou certidão gerado no sistema deve conter 4 blocos obrigatórios:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. HEADER INSTITUCIONAL                                                │
│    • Brasão / Logo Renacred com alta resolução                         │
│    • Título Institucional: RENACRED - REDE NACIONAL DE PROTEÇÃO AO CRÉDITO │
│    • Selo do Produto: [PRODUTO E1 - CERTIDÃO DE HISTÓRICO IMOBILIÁRIO] │
│    • Faixa decorativa em gradiente institucional                       │
├────────────────────────────────────────────────────────────────────────┤
│ 2. GRID DE METADADOS EXECUTIVOS (3 CARDS LADO A LADO)                  │
│    Card 1: Documento Auditado (com máscara) + Período de Cobertura     │
│    Card 2: Resultado Pericial (Total de Declarações + Status)          │
│    Card 3: Autenticação Digital (Carimbo de Data/Hora + Código Hash)   │
├────────────────────────────────────────────────────────────────────────┤
│ 3. TABELA PERICIAL ESTRUTURADA (jspdf-autotable)                       │
│    • Cabeçalho azul corporativo (#1E3A8A) com texto branco em negrito  │
│    • Zebra striping (#FFFFFF e #F8FAFC) com padding generoso           │
│    • Matrícula e Cartório em destaque visual                           │
│    • Alienantes e Adquirentes com documentos e nomes alinhados         │
├────────────────────────────────────────────────────────────────────────┤
│ 4. RODAPÉ DE FÉ PÚBLICA & PAGINAÇÃO (didDrawPage)                      │
│    • Linha divisória fina (#CBD5E1)                                    │
│    • Texto jurídico de validade da certidão eletrônica                 │
│    • Paginação dinâmica ("Página X de Y") em todas as páginas         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Implementação Técnica com jsPDF & AutoTable

1. **Formatação de Dados:**
   * Nunca exiba CPF ou CNPJ cru (`01036115925`). Formate sempre com máscara: `010.361.159-25`.
   * Formate datas sempre no padrão brasileiro (`DD/MM/AAAA`).
2. **Gerenciamento de Páginas Dinâmicas:**
   * Use o hook `didDrawPage` do AutoTable para desenhar o rodapé oficial e cabeçalhos repetidos em páginas subsequentes.
   * Calcule o total de páginas no final com `doc.internal.getNumberOfPages()`.
3. **Segurança e Rastreabilidade:**
   * Inclua um hash verificador gerado a partir do documento + timestamp para conferência de autenticidade da certidão.
