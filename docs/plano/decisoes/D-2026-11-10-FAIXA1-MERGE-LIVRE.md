---
id: "D-2026-11-10-FAIXA1-MERGE-LIVRE"
tipo: "decisao"
dominio: "processo"
titulo: "PR vermelho da faixa 1 da auditoria de estruturas implícitas entra sem o lote do dono, com revisor PASS e CI verde"
estado: "decided"
autorizacao: "dono, chat, 2026-11-10: \"Se eu for ficar autorizando cada commit, vou ter que fazer muitas vezes, tem qeu ficar livre isso\"; questionário em seguida: \"Livre só nesta faixa 1 (Recomendado)\""
atualizado: "2026-11-10"
emenda: "dono, chat, 2026-11-10, questionário: \"Tirar o GAP-MAP dos PRs (Recomendado)\"; \"Trocar pela linha já na main (Recomendado)\""
---
# D-2026-11-10-FAIXA1-MERGE-LIVRE

**Estado:** `decided`. Exceção, com escopo fechado, à regra de merge da [D-2026-10-28-FLUXO-AUTONOMO](D-2026-10-28-FLUXO-AUTONOMO.md).

**Por quê:** a faixa 1 da auditoria de estruturas implícitas tem 46 linhas, cada uma com um PR (alguma pode ter mais de um, como o SM F-01.2, dividido em AP e AR). A maior parte toca o módulo
contábil e sai **vermelha** no `classe-risco.mjs`, o que mandaria dezenas de PRs ao lote diário, um número por vez. O dono
não quer confirmar cada um.

## Regra

A maestro trata como **VERDE** (merge squash sozinha) o PR que cumpre **todas** as condições abaixo:

1. O título começa pelo ID de um achado da lista abaixo (ex.: `fix(api): BRD F-02.1 — …`), e esse ID tem linha na seção
   "Estruturas implícitas — faixa 1 (2026-11-10)" do `docs/operating-manual/GAP-MAP.md` **da `main`**. O PR de correção não
   mexe nessa seção; quem a atualiza é a orquestração, em PR só de docs (emenda de 10/11, abaixo).
2. O diff não toca nenhum destes; se tocar, a exceção não vale e o PR vai ao lote: `server/prisma/**` (schema, migração),
   `server/public/openapi.json`, `dtoShapeSnapshot`, `my-app/types/contracts/**`, `server/src/middleware/auth.ts`,
   `server/src/routes/auth.ts`, `withAuth`, `DynamicTableService.ts`, pagamento (`CollectionCharge`, `PaymentAccount`, provider,
   webhook), transmissão ou assinatura de DF-e, Reinf, baselines de gate, `.claude/**`, `CLAUDE.md`.
3. O `revisor-independente` deu **PASS** no SHA de cabeça, em no máximo 3 rodadas (D-2026-11-06-REVISAO-CONVERGENCIA). Achado
   `P` (pré-existente) não segura o PR; achado `A` aberto segura. O PASS continua valendo quando os commits posteriores a ele são
   só (a) o que devolve o `GAP-MAP.md` à versão da base ou (b) rebase ou merge da `main` sem conflito em código; qualquer outro
   commit pede nova rodada.
4. Todos os checks verdes, `MERGEABLE`, fora de draft, base `main`.

Faltou qualquer condição: vale a regra de sempre (lote do dono).

## Achados cobertos (46 IDs)

SM F-01.2 (o INV F-11.2 não está coberto: é faixa 4) · INV F-16.3, F-26.1, F-40.1, F-40.2, F-14.2, F-41.1, F-42.1 · SOT F-01.1, F-18.1, F-02.1, F-02.2,
F-11.1, F-12.1, F-23.1, F-01.4 · EFX F-18.2, F-19.1 · BRD F-02.1, F-03.4, F-04.2, F-08.1, F-56.1, F-56.2, F-57.1, F-57.2, F-57.3,
F-58.1, F-60.2, F-62.1, F-63.1, F-65.1, F-65.3, F-66.1, F-66.2, F-66.3, F-66.4, F-69.1, F-71.1, F-72.1, F-72.2, F-72.4, F-72.6,
F-73.2, F-74.1, F-75.1.

## Fora desta exceção

Faixas 2, 3 e 4 da mesma auditoria, todo outro PR vermelho do repositório e qualquer PR de achado que não esteja na lista acima.
Triagem e estado: `docs/estruturas-implicitas/CORRECOES.md` (PR #1153).

## Fim

A exceção acaba quando nenhuma linha da seção do GAP-MAP estiver em `[ABERTO]` ou `[EM PR #n]`, ou antes, se o dono revogar no chat.

## Emenda de 10/11: GAP-MAP fora dos PRs

Cada PR mexia na própria linha do GAP-MAP, e cada merge dava conflito nos PRs seguintes (#1164, #1192, #1203). O dono decidiu
(questionário, 10/11): "Tirar o GAP-MAP dos PRs" e, para esta regra, "Trocar pela linha já na main". Os PRs abertos receberam um
commit que devolve o `GAP-MAP.md` à versão da base; a seção é atualizada no #1208 (`[EM PR #n]` → `[CORRIGIDO dd/mm, #n]`). Daí
as condições 1 e 3 e o "Fim" acima.

## Absorvida em 10/11

A [D-2026-11-10-METODO-FABLE-5-2](D-2026-11-10-METODO-FABLE-5-2.md) estendeu esta regra a todo PR vermelho de código fora da
lista dura (`LOTE_DURO` do `scripts/classe-risco.mjs`), sem a condição do ID no título. A lista de 46 IDs acima fica como
registro; a condição 3 (o PASS vale depois de rebase ou merge da `main` sem conflito em código) passou para a regra nova.
