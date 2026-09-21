# Design System: Renacred (Rede Nacional de Proteção ao Crédito)

<!-- impeccable:design-schema 1 -->

## Visual World & Identity

A identidade visual do **Renacred** é construída a partir de sua marca oficial:
- **"RENA"**: Cinza titânio sóbrio (`#5A626A` / `#64748B`).
- **"CRED"**: Azul marinho institucional brasileiro (`#1D4ED8` / `#1E40AF`).
- **Emblema Nacional**: Mapa do Brasil em verde bandeira (`#059669`), ouro (`#D97706`) e azul celestial (`#1E3A8A`).
- **Slogan**: "Rede Nacional de Proteção ao Crédito".

O design afasta-se deliberadamente da "cara de IA" (*AI slop*):
- **PROIBIDO**: Texto com gradiente roxo/verde (`bg-clip-text text-transparent`).
- **PROIBIDO**: Orbes coloridos com desfoque exagerado (`blur-3xl`).
- **PROIBIDO**: Cards genéricos idênticos empilhados com bordas duplas flutuantes.
- **PROIBIDO**: Kicker/eyebrow decorativo vazio acima de títulos.
- **OBRIGATÓRIO**: Superfícies corporativas sólidas de alta densidade, tipografia nítida com numerais tabulares para valores e documentos, contrastes superiores a 4.5:1 e acabamento de birô de crédito de primeira linha.

---

## Paleta de Cores & Tokens

| Nome | Hex | Utilização |
| :--- | :--- | :--- |
| `renacred-navy-dark` | `#080E1A` | Fundo principal da aplicação |
| `renacred-navy-surface` | `#0B1325` | Superfície da Sidebar e cards estruturais |
| `renacred-navy-elevated` | `#0F172A` | Cards de dados, tabelas e modais |
| `renacred-border` | `#1E293B` | Bordas nítidas de separação e contornos |
| `renacred-border-focus` | `#334155` | Bordas ativas e estados de hover |
| `renacred-blue-primary` | `#1D4ED8` | Azul institucional da marca ("CRED") |
| `renacred-blue-hover` | `#2563EB` | Ações principais e botões de destaque |
| `renacred-gray-titanium` | `#64748B` | Cinza corporativo da marca ("RENA") |
| `brasil-green` | `#059669` | Indicador de saldo positivo e certidões ativas |
| `brasil-gold` | `#D97706` | Avisos, pendências e destaques administrativos |
| `text-primary` | `#F8FAFC` | Títulos e dados em alto contraste |
| `text-secondary` | `#94A3B8` | Rótulos, descrições e metadados |

---

## Tipografia & Numerais Tabulares

- **Família Tipográfica**: `Plus Jakarta Sans` com fallback para `Inter, sans-serif`.
- **Dados & Documentos**: `font-mono` com espaçamento proporcional e `tnum` (tabular numbers) para valores financeiros (R$), datas (DD/MM/AAAA) e documentos (CPF/CNPJ).
- **Sem Gradientes em Textos**: Títulos usam branco sólido (`#FFFFFF` ou `#F8FAFC`) e peso `font-bold` ou `font-extrabold`.

---

## Componentes Oficiais

1. **Logo Corporativo**: Componente `<RenacredLogo />` renderizando a logo oficial (`/logo-renacred.png`) com preservação de proporção e fundo adaptado.
2. **Card de Declaração Imobiliária (DOI)**: Exibição estruturada das partes (Alienantes em destaque âmbar/ouro, Adquirentes em destaque azul/verde, Matrícula, Cartório e Data da Lavratura).
3. **Badge Financeiro de Saldo & Ciclo**: Indicador claro no topo da aplicação informando o saldo disponível (pré-pago) ou o dia de vencimento e limite (pós-pago).
