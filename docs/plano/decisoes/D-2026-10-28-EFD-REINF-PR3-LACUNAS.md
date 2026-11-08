---
id: "D-2026-10-28-EFD-REINF-PR3-LACUNAS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Execução do EFD-REINF PR-3 autorizada; 4 lacunas de spec respondidas por questionário (forma do EXPORT_REINF, prazo trimestral, 400 × aviso, natureza não conferida)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-27: \"Executa o EFD-REINF PR-2 e PR-3 (BRIEF #848) — sessao-feature, um PR por fatia, empilhados, sem merge.\" Respostas por AskUserQuestion em 2026-10-28"
atualizado: "2026-10-28"
---
# D-2026-10-28-EFD-REINF-PR3-LACUNAS

**Estado:** `decided`.

**Autorização:** dono, chat, 2026-10-27: *"Executa o EFD-REINF PR-2 e PR-3 (BRIEF #848) — sessao-feature, um PR por fatia,
empilhados, sem merge."* Esta cédula é do PR-3 (itens 20–24 do
[`BE-INCR-EFD-REINF-brief.md`](../../accounting/BE-INCR-EFD-REINF-brief.md)), empilhado no PR-2 (#929). Nó: [[EFD-REINF]].

Antes do código, a leitura do BRIEF contra o código do PR-1/PR-2 e contra a IN RFB 2.043 (Sijut, visão vigente, lida em 28/10)
mostrou 4 lacunas. Foram perguntadas por questionário (AskUserQuestion), com a recomendada como 1ª opção. O dono escolheu a
recomendada nas 4.

## Respostas do dono

| Lacuna | Resposta literal | Efeito |
|---|---|---|
| A. Item 22: o export do C6b grava 1 arquivo CSV/XLSX por job, não há lib de zip, e o PRE-ADR D8 diz que o XML não é persistido; o item pede "XML do lote + relatório" no pacote com o `sha256` do `ReinfBatch` | "2 jobs no POST (Recomendado)" | `POST /reinf/batches` grava, junto do lote, 2 jobs de export: `EXPORT_REINF` (o XML do lote; `sha256` do job = `sha256` do `ReinfBatch`) e `EXPORT_REINF_RELATORIO` (o CSV). Os dois entram como extras do pacote (molde `EXPORT_SPED_ECD`: serviço dedicado cria o job). O XML passa a existir em disco como o `.txt` da ECD; o D8 segue valendo para `ReinfBatch` e auditoria |
| B. Item 21: o § 3º do art. 6º da IN 2.043 ("lucros e dividendos, quando isentos de retenção") × dividendo ≤ R$ 50 mil/mês sem retenção em 2026, com a P-REINF-6 aberta | "Só isenção 12 (Recomendado)" | Prazo trimestral só para o R-4010 cujas linhas são todas dividendo `TRANSICAO` (art. 6º-A § 3º, `tpIsencao` 12). Dividendo ≤ 50 mil sem retenção fica no prazo mensal até a P-REINF-6 responder. Prazo por evento no relatório; o prazo do lote = o mais cedo |
| C. Item 23 lista `PERFIL_SEM_NATUREZA` e `CONTATO_SEM_CPF`, mas o PR-1 recusa esses casos com 400 (`NATUREZA_RENDIMENTO_SEM_MAPA`, `REINF_SEM_CONTATO`) | "Mantém os 400 (Recomendado)" | Os 400 ficam. Os dois códigos entram no i18n como texto do erro 400 correspondente (`reinf.erros.NATUREZA_RENDIMENTO_SEM_MAPA` = `PERFIL_SEM_NATUREZA` do BRIEF; `reinf.erros.REINF_SEM_CONTATO` = `CONTATO_SEM_CPF`); não viram aviso do relatório |
| D. Item 23, `NATUREZA_NAO_CONFERIDA`: o `WithholdingProfile` não tem campo de conferência e a regra 3 da sessão proíbe mudar o nó vizinho | "Aviso fixo (Recomendado)" | Enquanto a P-REINF-2 estiver aberta, todo lote com R-4020 traz `NATUREZA_NAO_CONFERIDA` com as naturezas usadas. Sem campo novo |

## Decorrências registradas sem pergunta (fonte citada)

- **Vigência das linhas `REINF` da matriz:** `vigenteDesde = 2025-01-01`, data do § 1º I do art. 3º da IN 2.043 (red. IN 2.181/2024:
  a DIRF é substituída pela série R-4000 "em relação aos fatos ocorridos a partir de 1º de janeiro de 2025"), lido no Sijut em 28/10.
- **Texto do § 3º do art. 6º** (incluído pela IN 2.163/2023), lido no Sijut em 28/10: prorroga "para até o dia 15 (quinze) do segundo
  mês subsequente ao trimestre correspondente, observado o disposto no § 2º" — o adiamento ao dia útil seguinte vale também aqui.
- **`DEFASADO_RETIFICAR` e `REABRIR_ANTES`** viram avisos quando o relatório traz marcação `RETIFICAR`/`REABRIR_ANTES` (item 13, PR-1).
- **Avisos com código:** o relatório passa a trazer `avisos[]` como `{ codigo, quantidade, detalhe }`, para o i18n pt/en traduzir pelo
  código (molde `kit.warnings`); o texto pt do servidor vai em `detalhe`.
