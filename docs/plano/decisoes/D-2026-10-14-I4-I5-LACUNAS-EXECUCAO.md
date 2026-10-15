---
id: "D-2026-10-14-I4-I5-LACUNAS-EXECUCAO"
tipo: "decisao"
dominio: "plataforma"
titulo: "Lacunas de execução do BE-INCR-ONBOARDING-ACTIVATION (I4/I5): PR-2 pausado, UNKNOWN_EVENT_KEY na skip-list, tipos gerados na tela"
estado: "decided"
autorizacao: "dono, chat, 2026-10-14, por questionário (AskUserQuestion), dentro do 'Executa o I4 e o I5 (BE-INCR-ONBOARDING-ACTIVATION) — sessao-feature'"
atualizado: "2026-10-14"
---
# D-2026-10-14-I4-I5-LACUNAS-EXECUCAO — lacunas de spec achadas na execução do I4/I5

**Estado:** `decided` (3/3; a 2ª **contra** a recomendação).
**Autorização:** dono, chat, 14/10/2026: *"Executa o I4 e o I5 (BE-INCR-ONBOARDING-ACTIVATION) — sessao-feature, um
PR por vez na ordem do BRIEF"*. As três lacunas abaixo foram levadas por questionário antes de codar.

Documento: [`BE-INCR-ONBOARDING-ACTIVATION-brief.md`](../../accounting/BE-INCR-ONBOARDING-ACTIVATION-brief.md). Nós: [[I4]], [[I5]].

### L-1 — PR-2 (I4): o onboarding sempre sairia `Draft`
- **Fato (V, por leitura em `main` `03c51e7c`):** desde o BE-INCR-KIT-SETOR PR-2 (emenda E-5), o
  `activateDefault` devolve `Draft` com `KIT_FISCAL_PROFILE_REQUIRED` quando o kit traz contas-padrão do perfil
  fiscal e a unidade não tem `FiscalProfile` (`KitInstallService.preconditions`). Os kits vigentes dos dois setores
  (`beautySalon`/`aestheticClinic` v5) trazem `roleDefaults.fiscalProfile`. O onboarding não cria o `FiscalProfile`
  da unidade (`SystemProvisioningService`, lacuna L-PR3-1; o F-X6-6 a proíbe inventar `icmsContribuinte` e
  `pisCofinsRegime`). Os itens 10 (`Active`) e 13 (a venda lança sem reiniciar) do BRIEF não fecham.
- **Opções:** pausar o PR-2 e emendar o BRIEF (**recomendada**) · entregar o PR-2 com o `Draft` · o onboarding pula
  o E-5 (mexe no KIT-SETOR).
- **Resposta:** ✅ **pausar o PR-2, EMENDA.** O PR-2 não é codado; volta à `sessao-planejamento` para decidir de onde
  vem o `FiscalProfile` da unidade no onboarding. O PR-4 (F-I4-5 b) espera o PR-2. PR-1 e PR-3 (I5) seguem.

### L-2 — PR-1 (I5): evento que nenhum kit declara
- **Fato:** depois do BRIEF, o BE-INCR-KIT-SETOR PR-6 (item 47) separou o evento que nenhum kit declara: o `sync()`
  lança `UnknownEventKeyError` (`UNKNOWN_EVENT_KEY`), não `NO_MAPPER_FOR_UNIT`. O F-I5-3 (a) diz "todo miss de mapper".
- **Opções:** fica fora da skip-list, erro alto (**recomendada**) · entra na skip-list.
- **Resposta:** ✅ **entra na skip-list, contra a recomendação.** Consequência: `UNKNOWN_EVENT_KEY` vira valor novo do
  enum `ReconcilePendingReasonCode` (10 valores) — muda o snapshot de shape, o `.gen.ts`, o enum do `docs.paths.ts`
  e o `openapi.json`. As pontes registram `warn`, o job conta `blocked` e grava a pendência com o código próprio.
  O erro continua distinto de `NO_MAPPER_FOR_UNIT` (o `sync()` não muda). Risco aceito, o mesmo do F-I5-3: um bug de
  fiação de quem emite o evento é notado na aba Pendências, não por alerta de log.

### L-3 — PR-3 (I5 tela): tipos das respostas
- **Fato:** desde o #485 existem `ReconcilePendingListViewDtoInput` e `RescanReconcilePendingResultDtoInput` no
  `.gen.ts`; o BRIEF (29/09) mandava tipar as respostas à mão (D11).
- **Resposta:** ✅ **`import type` do `.gen`** (recomendada) para query, body e respostas.
