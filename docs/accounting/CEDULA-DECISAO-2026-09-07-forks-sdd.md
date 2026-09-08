# Cédula de decisão — 2026-09-07 — ratificação por delegação dos forks do plano SDD

> **O que este doc é:** o registro citável (ORCH-006) da ratificação do dono sobre os forks abertos pelos
> BRIEFs e ADRs produzidos pelo plano `PLANO-SDD-SEQUENCIAL-2026-09-07.md` e mergeados em `main` em
> 2026-09-07. **O que não é:** decisão nova do agente — nenhuma opção foi escolhida por agente; a
> delegação é o sinal (precedente: `ADR-INCR-AP-AR-AGING.md`, "ratificados POR DELEGAÇÃO 2026-07-15").

## Sinal do dono (literal, sessão de 2026-09-07)

> "Ratifico as recomendações de todos os forks, segue"

Dado em resposta ao relatório de execução do plano que listava, rodada a rodada, os forks abaixo com a
recomendação de cada um. **Registro honesto:** não houve escolha explícita fork-a-fork; para cada fork vale
o caminho marcado como **Recomendação** no documento que o define, na versão mergeada em `main` citada.

## Forks cobertos

| Rodada | Documento (versão em `main`) | Forks → caminho ratificado | Consequência |
|---|---|---|---|
| 3 | `BE-INCR-RECONCILE-PENDING-brief.md` (#275 `1bbeb953`) | Fork 1 já fechado pela cédula 03/09 (B); **1-R, 2, 3, 4, 5 → recomendação de cada um** (2 = callback `onPending`; 3 = rota HTTP completa, tela fora; 4 condicional ao 3; 5 = contador `pendingWriteFailed` + marca não avança) | abre `sessao-feature` `BE-INCR-RECONCILE-PENDING` |
| 4a | `FE-INCR-AUDIT-PROVENANCE-brief.md` (#277 `aafe8a5e`) | **F-FEAP-1..7 → (a)** em todos | abre `sessao-feature` no lote FE (Fase A, slice 1) |
| 4b | `FE-INCR-COMPLIANCE-2-brief.md` (#279 `5daa8763`) | **F-COMP2-1..7 → recomendação** (1 b, 2 b, 3 a, 4 a, 5 b, 6 a, 7 b) | abre `sessao-feature` no lote FE (Fase A, slice 2); `accounting.json` = Fase B serial, folhas 847, medir a cada aplicação |
| 5 | `FE-INCR-CASH-FORECAST-brief.md` (#278 `77c77553`) | **F-CF1 a, F-CF2 a, F-CF3 a, F-CF4 a, F-CF5 a, F-CF7 a, F-CF9 a** | abre `sessao-feature` (BE report read-only + FE) **depois** do lote FE mergear (same-domain: `accounting.service.ts`/`accounting.json`) |
| 8 | `ADR-INCR-PARTIAL-SETTLEMENT.md` (#276 `b7a62a73`) | **F-PS1 c, F-PS2 a, F-PS3 a, F-PS4 a, F-PS5 a, F-PS6 b, F-PS7 a** | ADR → **Accepted por delegação**; abre `sessao-planejamento` do BRIEF |
| 9 | `ADR-CONTADOR-DELIVERY.md` (#274 `239945d1`) | **F-CD1..F-CD8 → recomendação** (todas (a); F-CD4 com FK `Restrict`, F-CD6 reusa `job.sha256`) | ADR → **Accepted por delegação, condicionado**: a implementação segue esperando o item 0 do pedido ao contador (F-Z0); o BRIEF pode ser escrito |
| 1–2 | `BE-INCR-CNPJ-ALFA-brief.md`, `FE-INCR-NFE-brief.md`, `BE-INCR-NFE-PREVIEW-brief.md` | conduzidos pela sessão paralela ("Próximos passos módulo financeiro"); o mesmo sinal vale para eles — registro lá | — |

## O que este sinal NÃO cobre

1. **Forks de BRIEFs ainda não escritos** (baixa parcial, contador-delivery, emissão via parceiro…): nascem
   pendentes e voltam ao dono — a delegação é sobre os forks *listados no relatório*, não sobre o futuro.
2. **P2 (rodada 7, PR #282):** as duas lacunas de spec (T0 da métrica F-P2-4b vive em
   `DynamicTableService.installPresetAsSystem`, dentro do perímetro zero-diff; fechamento + ECD ficam no
   RUNBOOK-H3) não tinham recomendação formulada — seguem **abertas para o dono**.
3. **R4 (onde vive a credencial de emissão)** — decisão da cédula 03/09 D2(iii), sem recomendação escrita; rodada 6 segue fechada.
4. Gates humanos e dado externo (B-4, X2, H1, H2, H3, contador, XML real).
