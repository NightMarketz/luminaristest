# Cédula de decisão — 2026-09-18 — forks C8 novos do execution-plan (F-FA14 · F-FA15)

> **O que este doc é:** o registro citável (ORCH-006) das **2 ratificações** do dono tomadas em
> questionário (`AskUserQuestion`, sessão de 2026-09-18) sobre os 2 forks NOVOS que
> `BE-INCR-FIXED-ASSETS-execution-plan.md` §1 abriu na granularização do C8 (nascidos da leitura do
> código pós-C6b, não do BRIEF original — F-FA1..13 já ratificados nas cédulas de 14/09 e 16/09).
> Ambas as respostas **DIVERGEM** da recomendação não-vinculante do documento — registrado por
> extenso abaixo, não só a decisão.
>
> **O que não é:** re-abertura do BRIEF ou dos forks F-FA1..13 (intocados). Autorização de
> implementação do PR-1 do C8 veio na MESMA sessão, logo depois desta ratificação ("Executa C8"),
> e o PR-1 já foi implementado e mergeado sobre esta decisão (não sobre a recomendação do plano).

## Sinal do dono (literal)

> "Executa C8" — dado na mesma sessão, imediatamente após as duas respostas abaixo, sobre
> `execution-plan-granular` com F-FA10/12/13 já ratificados (cédula 16/09) e F-FA1..9 ratificados
> por delegação (cédula 14/09, parecer do ADR).

## Decisões

### C8 (execution-plan) — 2 forks novos (2/2)

| Ref | Pergunta | Caminhos apresentados | Decisão do dono | Rec. do plano | Consequência |
|---|---|---|---|---|---|
| **F-FA14** | Uma migração única no PR-1 (3 tabelas + 9 colunas: 4 de `accounting_scope_settings` + 5 de `accounting_data_exchange_jobs`), ou uma por PR? | (a) única no PR-1 · **(b)** por PR — PR-1 tabelas+seed **e** as 4 colunas de `accounting_scope_settings` (PR-2/PR-3 não abrem migração própria sob esta opção); as 5 colunas de `accounting_data_exchange_jobs` só no PR-4 | **(b)** | (a) | **PR-1 fica menor** — só o que PR-1/2/3 de fato usam; PR-4 ganha sua própria migração aditiva para `supersedesJobId`/`ecfRectification*`/`verificationTermStorageKey`. `FixedAsset.sourceItemRef` (achado do Passo 28, precisado só no PR-5) **também** vira migração aditiva do PR-5, não entra no PR-1. Custo aceito: 2 migrações em vez de 1 no C8 inteiro |
| **F-FA15** | Quem cria `GET /api/accounting/data-exchange/jobs` (lista) — rota que hoje não existe e que tanto o C8 (PR-4, item 30) quanto o `FE-INCR-REVIEW` precisam | (a) quem mergear primeiro cria, shape pré-escrito no plano · **(b)** incremento próprio (`BE-INCR-DATA-EXCHANGE-JOBS-LIST`), planejado e executado ANTES dos dois · (c) C8 sempre cria | **(b)** | (a) | Não afeta o PR-1 (nasce só quando o PR-4 for aberto). O incremento próprio precisa da sua PRÓPRIA sessão de planejamento (BRIEF) antes de qualquer "executa" — o shape já escrito no plano (`{ unitId, direction?, kind?, status?, year?, page, limit } → { items, total, page, limit }`, policy `canRead`) é insumo dessa sessão, não substitui o BRIEF |

## Consequência mecânica sobre o PR-1 já implementado

A migração `20260918100000_add_fixed_assets` (server/prisma/migrations/) segue **F-FA14 → (b)**
literalmente: `CREATE TABLE` das 3 tabelas novas (`fixed_asset_classes`, `depreciation_rates`,
`fixed_assets`) + `ALTER`/rebuild das 4 colunas de `accounting_scope_settings`
(`depreciationExpenseAccountId`, `disposalGainAccountId`, `disposalLossAccountId`,
`depreciationParteBAccountId`). **Não** inclui nenhuma coluna de `accounting_data_exchange_jobs`
nem `fixed_assets.sourceItemRef` — ambas ficam para as migrações próprias do PR-4/PR-5,
respectivamente, quando esses PRs abrirem.

## Pendente

**F-FA15 → (b) não está executado.** `BE-INCR-DATA-EXCHANGE-JOBS-LIST` precisa da sua própria
`sessao-planejamento` (BRIEF) antes de qualquer implementação — isto NÃO acontece sozinho quando o
C8 chegar no PR-4; alguém precisa pedir explicitamente. Registrado aqui para não se perder entre
sessões (o mesmo padrão de "achado fora de escopo" do BRIEF do C8, §7).
