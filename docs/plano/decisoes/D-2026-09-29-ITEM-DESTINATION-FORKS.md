---
id: "D-2026-09-29-ITEM-DESTINATION-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "ITEM-DESTINATION: forks F-ID-1..9 ratificados na recomendação; achado A-1 (CFOP do C8) fica registrado, sem XML real"
estado: "decided"
autorizacao: "dono, chat, 2026-09-29: \"Pode seguir as recomendações\" (forks do BRIEF, PR #443) + \"Não vamos ter como comprovar ainda, pq não vai ter xml real tão cedo\" (achado A-1) — sem 'executa'"
atualizado: "2026-09-29"
---
# D-2026-09-29-ITEM-DESTINATION-FORKS — destinação por item na entrada

**Estado:** `decided`
**Autorização:** dono, chat, 29/09/2026, depois de ler o BRIEF do PR #443: *"Pode seguir as recomendações"* e *"Não vamos
ter como comprovar ainda, pq não vai ter xml real tão cedo"*.
**Não é "executa"** (ORCH-006). O nó [[ITEM-DESTINATION]] fica `ready`, e o código começa só com o "executa".

## Forks ratificados

O texto completo está no BRIEF, §3: [`BE-INCR-ITEM-DESTINATION-brief.md`](../../accounting/BE-INCR-ITEM-DESTINATION-brief.md).

| Fork | Escolha | Resumo |
|---|---|---|
| F-ID-1 | (a) | Duas destinações: `REVENDA` e `INSUMO_SERVICO`. `USO_CONSUMO` fica como achado A-2 |
| F-ID-2 | (a) | O default por produto fica na tabela Prisma `ProductDestinationDefault` (unidade + `productRef`), fora do preset DT |
| F-ID-3 | (a) | O insumo vai para despesa na entrada. Não gera `StockMovement` nem sync físico. O teto está declarado: o físico da tinta de insumo não é controlado |
| F-ID-4 | (a), em 2 etapas | O item 7 roda como (c), sem crédito, até a transcrição da P-1 (IN 2.121 / SC 4.024) entrar no corpus. Depois vira a posição da RFB: CST 02 credita 1,65% + 7,6%; 04/06/outro não credita. **Continua sujeito ao contador** (P-1, pergunta do D-6 item 4) |
| F-ID-5 | (a) | Uma conta de insumo por unidade: `FiscalProfile.insumoExpenseAccountId`, com 400 nomeado se faltar |
| F-ID-6 | (a) | Sem override e sem default, o item é `REVENDA` com origem `FALLBACK` e warning |
| F-ID-7 | (a) | Notas já importadas não são reprocessadas |
| F-ID-8 | (a) | O preview aceita `itemMappings` opcional e usa o mesmo resolver do import |
| F-ID-9 | (a) | O override do import não grava default; o default só muda pelo `PUT` |

**Consequência:** não há ADR. Com F-ID-2 (a) e F-ID-3 (a), nem Product (DT) nem `InventoryItem` mudam (BRIEF,
"Consequência para o ADR").

## Achado A-1 — registrado, sem ação

O roteamento de imobilizado do [[C8]] lê o `prod/CFOP` do XML (1551/2551), que numa nota do fornecedor é o CFOP de
**saída dele**. O grau é I. Não haverá XML real tão cedo (dono), então a comprovação por XML fica fora de alcance.
Existe um oráculo mais barato, registrado sem ação: a regra de validação do MOC 7.0 Anexo I que casa o 1º dígito do
CFOP com o `tpNF`. O conteúdo da regra é **NV** nesta sessão: o arquivo está no MANIFEST, mas não no disco. Para
usá-lo seria preciso autorizar o download e a instrumentação.

## Próximo passo

"Executa ITEM-DESTINATION PR-1" (BRIEF §7) abre a `sessao-feature`.
