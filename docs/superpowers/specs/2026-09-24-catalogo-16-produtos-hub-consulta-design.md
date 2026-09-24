# Especificação de Design: Catálogo de 16 Produtos Oficiais, Hub de Consultas com Seletor, Contingência Transparente e API Pública

**Data:** 24/09/2026  
**Status:** Aprovado e Validado via VPS  
**Escopo:** Frontend (React 18 + Vite + Tailwind) & Backend (Node.js + Express + Prisma + FetchBrasil)  
**Autor:** Antigravity / Wellington (Renacred)

---

## 1. Visão Geral e Resultados dos Testes em Produção

O bureau **Renacred** está expandindo seu portfólio oficial de 2 produtos (E1 e E2) para **16 produtos completos (E1 a E16)**. Todas as 18 URLs (principais e contingências) foram consultadas e validadas diretamente no ambiente de produção na VPS (`209.50.245.165`) com **100% de sucesso (HTTP 200)**.

### Mapeamento Validado dos 16 Produtos:

| Código | Produto Oficial | Parâmetro | Provedor Principal | Provedor Contingência | Custo | Preço Venda | Status Teste VPS |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **E1** | Histórico Imobiliário & Cartórios | CPF / CNPJ | `historico_imobiliario` | — | R$ 0,00 | R$ 5,00 | ✅ 200 OK |
| **E2** | Histórico de Proprietários | Placa | `historico_proprietario` | — | R$ 0,00 | R$ 5,00 | ✅ 200 OK |
| **E3** | Busca de Frota Veicular | CPF / CNPJ | `renavam_frota` | — | R$ 0,10 | R$ 1,32 | ✅ 200 OK |
| **E4** | Endereço do Proprietário | Placa | `renavam_endereco_proprietario` | — | R$ 0,10 | R$ 1,32 | ✅ 200 OK |
| **E5** | Histórico de Roubo e Furto | Placa | `renavam_ocorrencia` | `ocorrencias_senatran` | R$ 0,15 | R$ 1,32 | ✅ 200 OK (Ambos) |
| **E6** | CNH com Imagem Oficial | CPF | `cnh_senatran` | — | R$ 0,30 | R$ 1,32 | ✅ 200 OK |
| **E7** | CNH sem Imagem (Dados) | CPF | `cnh_pwn` | `renach_cnh` | R$ 0,30 | R$ 1,32 | ✅ 200 OK (Ambos) |
| **E8** | RENAINF Multas Nacionais | Placa | `renainf_multas` | — | R$ 0,15 | R$ 1,32 | ✅ 200 OK |
| **E9** | RENAJUD Restrições Judiciais | Placa | `renajud_restricoes` | `renajud_processos` | R$ 0,15 | R$ 1,32 | ✅ 200 OK (Ambos) |
| **E10** | Comunicação de Venda | Placa | `renavam_comunicacao_venda` | — | R$ 0,10 | R$ 1,32 | ✅ 200 OK |
| **E11** | Vínculos & Parentes | CPF | `parentes` | — | R$ 0,03 | R$ 1,32 | ✅ 200 OK |
| **E12** | BIN Online Veicular | Placa | `placa_serpro` | `placa_senatran`, `renavam_endereco_proprietario` | R$ 0,30 | R$ 1,32 | ✅ 200 OK (Todos) |
| **E13** | Cadastro CPF Nível I (Básica) | CPF | `cpf_basica` | — | R$ 0,03 | R$ 1,32 | ✅ 200 OK |
| **E14** | SNG Gravames Financeiros | Placa | `sng_gravames` | — | R$ 0,15 | R$ 1,32 | ✅ 200 OK |
| **E15** | Cadastro CPF Nível II (Completo) | CPF | `cpf_pwn` | — | R$ 0,35 | R$ 1,32 | ✅ 200 OK |
| **E16** | Busca por RG | RG | `reg_rg` | — | R$ 0,03 | R$ 1,32 | ✅ 200 OK |

---

## 2. Padrão da API REST para os Assinantes (Integração Externa v1)

Os assinantes do Renacred contam com 3 formas simples e padronizadas de consumir a API pública (`https://api.renacred.com.br/v1`):

### 2.1 Autenticação Padronizada
* **Header HTTP Recomendado:** `x-api-key: rena_live_...` ou `Authorization: Bearer rena_live_...`
* **Query Parameter:** `?token=rena_live_...` (ideal para chamadas diretas via navegador ou ferramentas sem header).

### 2.2 Rotas Mapeadas por Produto (3 Formas de Chamada)
Cada produto pode ser chamado pelo código oficial (`e3`, `e5`), por slug amigável (`frota`, `roubo-furto`) ou pelo parâmetro de serviço compatível:

| Produto | Chamada por Código Oficial | Chamada por Slug Amigável | Parâmetro Legado Compatível |
| :--- | :--- | :--- | :--- |
| **E1** | `GET /v1/e1?query={DOC}` | `GET /v1/imobiliario/historico?query={DOC}` | `GET /v1?api=historico_imobiliario&query={DOC}` |
| **E2** | `GET /v1/e2?query={PLACA}` | `GET /v1/veicular/proprietarios?query={PLACA}` | `GET /v1?api=historico_proprietario&query={PLACA}` |
| **E3** | `GET /v1/e3?query={DOC}` | `GET /v1/frota?query={DOC}` | `GET /v1?api=renavam_frota&query={DOC}` |
| **E4** | `GET /v1/e4?query={PLACA}` | `GET /v1/endereco-veiculo?query={PLACA}` | `GET /v1?api=renavam_endereco_proprietario&query={PLACA}` |
| **E5** | `GET /v1/e5?query={PLACA}` | `GET /v1/roubo-furto?query={PLACA}` | `GET /v1?api=renavam_ocorrencia&query={PLACA}` |
| **E6** | `GET /v1/e6?query={CPF}` | `GET /v1/cnh-imagem?query={CPF}` | `GET /v1?api=cnh_senatran&query={CPF}` |
| **E7** | `GET /v1/e7?query={CPF}` | `GET /v1/cnh-dados?query={CPF}` | `GET /v1?api=cnh_pwn&query={CPF}` |
| **E8** | `GET /v1/e8?query={PLACA}` | `GET /v1/multas?query={PLACA}` | `GET /v1?api=renainf_multas&query={PLACA}` |
| **E9** | `GET /v1/e9?query={PLACA}` | `GET /v1/renajud?query={PLACA}` | `GET /v1?api=renajud_restricoes&query={PLACA}` |
| **E10** | `GET /v1/e10?query={PLACA}` | `GET /v1/comunicacao-venda?query={PLACA}` | `GET /v1?api=renavam_comunicacao_venda&query={PLACA}` |
| **E11** | `GET /v1/e11?query={CPF}` | `GET /v1/parentes?query={CPF}` | `GET /v1?api=parentes&query={CPF}` |
| **E12** | `GET /v1/e12?query={PLACA}` | `GET /v1/bin?query={PLACA}` | `GET /v1?api=placa_serpro&query={PLACA}` |
| **E13** | `GET /v1/e13?query={CPF}` | `GET /v1/cpf-basico?query={CPF}` | `GET /v1?api=cpf_basica&query={CPF}` |
| **E14** | `GET /v1/e14?query={PLACA}` | `GET /v1/gravame?query={PLACA}` | `GET /v1?api=sng_gravames&query={PLACA}` |
| **E15** | `GET /v1/e15?query={CPF}` | `GET /v1/cpf-completo?query={CPF}` | `GET /v1?api=cpf_pwn&query={CPF}` |
| **E16** | `GET /v1/e16?query={RG}` | `GET /v1/rg?query={RG}` | `GET /v1?api=reg_rg&query={RG}` |

*Todos os endpoints aceitam tanto `GET` (via query params) quanto `POST` (com JSON body `{ "query": "..." }`).*

### 2.3 Formato Padronizado da Resposta JSON para Assinantes
Todas as consultas respondem com metadados do bureau, hash de autenticação e dados normalizados:
```json
{
  "success": true,
  "produto": {
    "codigo": "E5",
    "nome": "Histórico de Roubo e Furto",
    "categoria": "Veicular"
  },
  "parametro_pesquisado": "IVO2002",
  "tempo_resposta_ms": 312,
  "total_registros": 1,
  "custo_debitado": 1.32,
  "dados": {
    "placa": "IVO2002",
    "quantidade_ocorrencias": 1,
    "ocorrencias": [
      {
        "tipo": "FURTO",
        "data": "27/06/2002",
        "municipio": "SAO PAULO - SP",
        "boletim": "0004692",
        "orgao": "0154/SP",
        "descricao": "DECLARACAO"
      }
    ]
  },
  "hash_autenticacao": "RNC-E5-9F8A1B-20260924",
  "consultado_em": "2026-09-24T16:30:00.000Z"
}
```

### 2.4 Regras de Retorno Sem Dados (Custo Zero)
Se nenhum registro for localizado:
```json
{
  "success": true,
  "produto": { "codigo": "E5", "nome": "Histórico de Roubo e Furto" },
  "parametro_pesquisado": "ABC1234",
  "total_registros": 0,
  "custo_debitado": 0.00,
  "mensagem": "Nenhuma ocorrência localizada para o documento/placa informado.",
  "dados": null
}
```

---

## 3. Contingência Transparente e Higienização de Dados

1. **Invisibilidade Total da Contingência**: O cliente recebe sempre a mesma estrutura em `dados`. Se a rota primária falhar, a contingência preenche o mesmo schema.
2. **Higienização Automática**:
   * Ocultação de chaves com `null`, `""`, `undefined`.
   * Remoção de códigos numéricos redundantes (`cod_municipio: 7535` é descartado, mantendo apenas `Curitiba - PR`).
