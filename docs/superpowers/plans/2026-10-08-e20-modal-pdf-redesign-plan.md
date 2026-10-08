# Redesign Executivo E20: Modal Dedicado, Remoção do Prefixo 'P', Eliminação de Fundo Amarelo e Exportação PDF Exclusiva de Resultados

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reformular o design do Produto E20 (Pré-Vistoria Veicular Consolidada) eliminando o prefixo/badge "P" dos 36 indicadores, removendo caixas/cards de fundo amarelo nos títulos e mensagens, eliminando ícones decorativos estilo IA para conferir estética pericial institucional sólida, encapsulando a visualização em um Modal executivo de alta densidade e implementando a exportação em PDF que consolida rigorosamente apenas os resultados com apontamentos reais.

**Architecture:** 
1. Extração e refatoração do componente `E20PreVistoriaLaudo` em `src/components/consultas/LaudoPericialUniversal.tsx` (ou componente modular dedicado), substituindo badges `P1..P36` por indexação pericial estrita (`#01..#36`), convertendo avisos e respostas de `bg-amber-50/border-amber-200` para tipografia corporativa neutra de bureau pericial (Slate/Neutral) e removendo ícones decorativos (Car, Layers, CheckCircle2) para erradicar a "cara de IA".
2. Criação do componente `E20Modal.tsx` (`src/components/veicular/E20Modal.tsx`), proporcionando visualização imersiva, foco de leitura, barra de ações com dados do veículo e gatilho de exportação.
3. Criação do utilitário/botão de exportação `ExportPdfE20Button.tsx` (`src/components/veicular/ExportPdfE20Button.tsx`) com `jsPDF` e `jspdf-autotable`, gerando laudo de fé pública (seguindo a skill `pdf-report-designer`) contendo cabeçalho institucional, metadados do veículo e **SOMENTE OS INDICADORES COM APONTAMENTOS/REGISTROS ENCONTRADOS** (ocorrências positivas), poupando páginas vazias e entregando síntese executiva.
4. Integração no `HubConsulta.tsx` para suporte ao Modal e visualização executiva sem fricção.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, jsPDF, jspdf-autotable, Lucide-react (apenas controles estritamente utilitários como Fechar/Copiar/Download, sem ilustrações decorativas).

**Spec:** Diretrizes do usuário: "sem o P e sem os titulos em cards de fundo amarelo e colocar dentro de um modal o E20 e o moda vai ser exportado via PDF somente os resultados. use skill ux pro e sem icones e cara de ia."

---

## Global Constraints

- **Sem prefixo 'P':** Nenhum badge ou texto deve exibir "P1", "P2", ..., "P7", "P36". Usar numeração sequencial institucional (`#01`, `#02`, ..., `#07`).
- **Sem fundo amarelo:** Eliminar classes `bg-amber-50`, `bg-amber-100`, `border-amber-200`, `border-amber-300` nos títulos, chamadas e cartões de mensagens dos indicadores. Usar tipografia sóbria `text-slate-800 font-semibold` sobre fundos limpos `bg-white` e divisores neutros `border-slate-200`.
- **Sem ícones decorativos / Sem cara de IA:** Proibido o uso de ícones ilustrativos (Car, Layers, Sparkles, CheckCircle2) em cabeçalhos de seções periciais. Manter padrão tipográfico corporativo limpo, denso e autoritativo (estilo Serasa Experian / B3 / Bureau Oficial).
- **PDF focado exclusivamente em apontamentos:** O PDF deve incluir cabeçalho, dados do veículo e **somente os indicadores com registros/apontamentos localizados** (`item.consta === true` ou `status === 'POSITIVO'`). Indicadores "Nada Consta" não devem gerar blocos detalhados vazios no documento.
- **TypeScript Estrito:** Zero erros de compilação em `npx tsc --noEmit` e `npm run build`.

---

## Review Focus

1. **Indicador sem apontamentos (Nada Consta):** No PDF, não deve renderizar páginas em branco ou tabelas sem dados; se o veículo for 100% limpo, deve emitir Certidão de Regularidade Pericial.
2. **Indicador com múltiplos apontamentos (ex: P7 Financeiras, P17 Proprietários):** No PDF e na tela, todas as linhas de registros reais devem ser impressas com dados completos (Ano, Razão Social, Documento, etc.).
3. **Abertura do Modal E20:** No `HubConsulta.tsx`, ao concluir a consulta E20 ou clicar no laudo, o Modal deve abrir fluidamente sem sobreposição de scroll ou quebra de layout.
4. **Higienização completa do 'P':** Garantir que nenhum cabeçalho (#07, #10, etc.) contenha resquícios como "P7 | " ou pílulas coloridas com a letra "P".
5. **Responsividade do Modal:** Testar fechamento via ESC, botão fechar e scrolling independente do corpo da página.

---

### Task 1: Refatoração do Laudo E20 em `LaudoPericialUniversal.tsx` (Remoção do 'P', Eliminação do Fundo Amarelo e Limpeza de Ícones)

**Files:**
- Modify: `src/components/consultas/LaudoPericialUniversal.tsx`

**Interfaces:**
- Consumes: `dados` do produto E20 (veiculo, indicadores, roubo_furto, proprietarios, outros_produtos).
- Produces: Layout pericial ultra-limpo, sem pílula "P", sem caixas amarelas e sem ícones decorativos em títulos.

- [ ] **Step 1: Remover o badge `{item.chave}` ("P1".."P36") dos cards de indicadores**
No cabeçalho de cada indicador (em torno da linha 1245-1255):
Remover o `<span>{item.chave}</span>`. Manter apenas:
```tsx
<span className="text-[11px] font-mono font-bold text-slate-400 shrink-0">
  #{numeroItem < 10 ? `0${numeroItem}` : numeroItem}
</span>
<h5 className="font-bold text-xs sm:text-sm tracking-wide uppercase truncate text-white">
  {titulo}
</h5>
```

- [ ] **Step 2: Eliminar cards e chamadas com fundo amarelo**
1. Na linha 1286-1290, substituir:
```tsx
// ANTES (fundo amarelo com borda amarela):
<p className="text-xs font-semibold text-slate-800 leading-relaxed bg-amber-50/60 border border-amber-200/60 p-2.5 rounded-md">
  {item.mensagem}
</p>

// DEPOIS (tipografia executiva sem caixa amarela):
<div className="pb-1 text-xs font-semibold text-slate-800 tracking-tight">
  {item.mensagem}
</div>
```
2. Na função `renderRespostaPositivaIndicador` (linhas 688-700), substituir o container `bg-amber-100/80 border border-amber-300/90`:
```tsx
// DEPOIS:
<div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-[11px] space-y-1">
  <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
    Resposta Registrada na Base de Pré-Vistoria:
  </div>
  <p className="text-slate-800 leading-relaxed font-medium select-text">
    {infoRaw}
  </p>
</div>
```
3. Substituir bordas `border-amber-200` e tags `bg-amber-400` por tons neutros institucionais de alta autoridade (`border-slate-200`, `bg-slate-900 text-white`, etc.).

- [ ] **Step 3: Remover ícones decorativos com cara de IA**
1. Remover `<Car />` do título "Especificações Técnicas e Cadastrais da BIN Fabril" (linha 1167). Usar texto puro em tracking sóbrio:
```tsx
<div className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100">
  Especificações Técnicas e Cadastrais da BIN Fabril
</div>
```
2. Remover `<Layers />` do título "Indicadores Periciais da Pré-Vistoria" (linha 1202). Usar texto institucional puro:
```tsx
<h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
  Indicadores Periciais da Pré-Vistoria (Base Consolidada)
</h4>
```
3. Remover `<CheckCircle2 />` nos status e cabeçalhos secundários, utilizando badges de texto neutros e elegantes.

- [ ] **Step 4: Validar compilação**
Run: `npx tsc --noEmit`
Expected: 0 erros.

---

### Task 2: Criação do Gerador de PDF de Resultados E20 (`ExportPdfE20Button.tsx`)

**Files:**
- Create: `src/components/veicular/ExportPdfE20Button.tsx`

**Interfaces:**
- Consumes: `dados` do laudo E20, `identifier` (placa), `hash` pericial.
- Produces: Exportação de documento PDF profissional contendo cabeçalho de fé pública, metadados veiculares e **rigorosamente apenas os indicadores com registros/apontamentos encontrados** (`item.consta === true`).

- [ ] **Step 1: Implementar o componente `ExportPdfE20Button.tsx`**
Criar o componente utilizando `jsPDF` e `jspdf-autotable`:
1. **Cabeçalho:**
   - Logo Renacred em alta resolução (`RENACRED_LOGO_BASE64`).
   - Título: `LAUDO PERICIAL DE PRÉ-VISTORIA VEICULAR CONSOLIDADA`
   - Subtítulo: `Auditoria Oficial de Procedência, Restrições e Indicadores de Risco • Produto E20`
   - Data/hora de emissão e hash de autenticidade (`RNC-E20-...`).
2. **Quadro de Dados do Veículo:**
   - 3 colunas compactas com Placa, RENAVAM, Chassi, Marca/Modelo, Ano Fab/Mod, Cor, Combustível, Município/UF e Situação.
3. **Resumo da Auditoria:**
   - Total de bases/produtos auditados: 36.
   - Total de apontamentos com registros encontrados: X.
4. **Filtro Estrito: Apenas Indicadores com Registros:**
   ```typescript
   const apontamentosPositivos = indicadoresGrid.filter(item => item.consta || item.status === 'POSITIVO');
   ```
5. **Tabelas de Resultados Reais:**
   - Para cada apontamento positivo:
     - Título institucional: `#[Nº] - [TITULO DO INDICADOR]` (sem a letra "P").
     - Tabela estruturada (autoTable) detalhando os registros reais (ex: Tabela de Financeiras/Bancos com Ano, Razão Social e CNPJ; Tabela de Ocorrências com Boletim e Data; Tabela de Proprietários com Ordem, Nome e Período).
6. **Caso Nenhum Apontamento Seja Encontrado:**
   - Se `apontamentosPositivos.length === 0`: Gerar Certidão Pericial de Regularidade atestando que todas as 36 bases foram consultadas e nenhuma restrição, sinistro, leilão ou impedimento foi identificado.
7. **Rodapé Oficial de Fé Pública:**
   - Hash verificador pericial, texto jurídico de validade da certidão eletrônica e numeração de páginas ("Página X de Y").

- [ ] **Step 2: Testar compilação**
Run: `npx tsc --noEmit`
Expected: 0 erros.

---

### Task 3: Criação do Modal Executivo E20 (`E20Modal.tsx`)

**Files:**
- Create: `src/components/veicular/E20Modal.tsx`

**Interfaces:**
- Consumes: `isOpen: boolean`, `onClose: () => void`, `dados: any`, `identifier: string`, `hash: string`, `consultadoEm: string`.
- Produces: Modal flutuante executivo com visualização imersiva do laudo E20 limpo, cabeçalho de controle fixo e botão integrado de exportação em PDF dos resultados.

- [ ] **Step 1: Criar o componente `E20Modal.tsx`**
Estruturar o modal com:
- Backdrop escurecido suave (`bg-slate-950/70 backdrop-blur-xs`).
- Container modal de alta densidade (`max-w-6xl w-full max-h-[92vh] flex flex-col bg-white rounded-xl shadow-2xl border border-slate-300`).
- **Header do Modal:**
  - Placa e Modelo do Veículo em destaque.
  - Total de bases auditadas e total de apontamentos encontrados.
  - Botão de exportação: `<ExportPdfE20Button />` com label explícito: `"Exportar PDF (Somente Resultados)"`.
  - Botão de fechar `[X]` acessível e teclado ESC vinculado.
- **Corpo do Modal com Scroll Interno:**
  - Renderiza o laudo E20 sanitizado (sem "P", sem caixas amarelas, sem ícones decorativos).

- [ ] **Step 2: Testar compilação**
Run: `npx tsc --noEmit`
Expected: 0 erros.

---

### Task 4: Integração do Modal E20 no `HubConsulta.tsx` e `LaudoPericialUniversal.tsx`

**Files:**
- Modify: `src/pages/assinante/HubConsulta.tsx`
- Modify: `src/components/consultas/LaudoPericialUniversal.tsx`

**Interfaces:**
- Consumes: Ação de consulta do Produto E20.
- Produces: Disparo automático ou acionável do Modal E20 com botão de PDF.

- [ ] **Step 1: Integrar gatilho do Modal em `HubConsulta.tsx`**
1. Adicionar estado `isE20ModalOpen` em `HubConsulta.tsx`.
2. Ao receber o resultado da consulta do produto E20, exibir o card executivo resumo e abrir automaticamente o Modal (`setIsE20ModalOpen(true)`).
3. No corpo da página, exibir um Card Executivo Resumo do E20 com botão destacado:
   `"Visualizar Laudo Pericial E20 em Modal"` e `"Exportar PDF (Somente Resultados)"`.
4. Incluir o componente `<E20Modal />` no rodapé da página.

- [ ] **Step 2: Atualizar botão de impressão/PDF em `LaudoPericialUniversal.tsx`**
Quando o produto ativo for E20, integrar diretamente o botão `<ExportPdfE20Button />` no cabeçalho do laudo.

- [ ] **Step 3: Testar compilação e build completo da aplicação**
Run: `npm run build`
Expected: Build do Vite gerado sem nenhum erro de TypeScript ou empacotamento.

---

### Task 5: Validação Visual e Teste End-to-End

**Files:**
- Test em runtime com placa real (ex: `MLP1937` ou `TJM9D75`).

- [ ] **Step 1: Validar no navegador com dados reais**
1. Abrir a tela de consulta do produto E20 no frontend.
2. Conferir que:
   - Nenhum badge "P1", "P7", etc. é exibido (apenas `#01`, `#07`, etc.).
   - Nenhum card ou texto possui fundo amarelo ou borda amarela.
   - Nenhum ícone decorativo com cara de IA é renderizado nos cabeçalhos.
   - O laudo abre fluidamente dentro do Modal.
   - O botão "Exportar PDF (Somente Resultados)" gera o arquivo contendo apenas os indicadores com registros/apontamentos reais.

- [ ] **Step 2: Commit final das alterações**
```bash
git add src/components/consultas/LaudoPericialUniversal.tsx src/components/veicular/E20Modal.tsx src/components/veicular/ExportPdfE20Button.tsx src/pages/assinante/HubConsulta.tsx
git commit -m "feat(ui): redesign executivo e20 sem prefixo P, sem fundo amarelo, modal dedicado e exportacao pdf somente resultados"
```
