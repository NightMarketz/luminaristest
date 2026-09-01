# Cédula de decisão — 2026-08-31 (Onda 1 SDD)

> **O que este doc é:** a lista consolidada de decisões abertas do dono, produzida pela Onda 1 do
> pipeline SDD (dois agentes Sonnet: `sessao-planejamento` → BRIEF FE-AGING; análise read-only →
> dossiê do resíduo de watermark). Os claims de sustentação foram **verificados pelo orquestrador
> contra o código** (arquivo:linha citados abaixo), não aceitos do relatório de agente.
>
> **O que não é:** ratificação. Nenhum item abaixo se auto-decide (ORCH-006). Marcar uma opção aqui
> só vale com sinal explícito do dono.
>
> Artefatos-fonte: `BRIEF-FE-AGING.md` · `F-W2F-4-DOSSIE.md` (ambos neste worktree, não commitados).
> O `PROXIMOS-PASSOS-2026-08-31.md` vive **não commitado no worktree de outra sessão**
> (`accounting-master-map-runbook-d22b39`); a linha F-W2F-3 do §4 dele está **superada** pelo dossiê
> — dobrar lá quando aquele diff landar, não editar de fora.

---

## A. Correção editorial ANTES de decidir — colisão de rótulo F-W2F-3

Dois resíduos distintos usam o mesmo nome:

| Rótulo hoje | O que é | Onde |
|---|---|---|
| **F-W2F-3 original** | Escrita **externa** ao processo setando `updatedAt` mais antigo que a marca — risco estrutural sem constraint, aceito por disciplina | `BRIEFS-WAVE2-BACKEND.md:432-442` |
| **"F-W2F-3" relabelado** | Item **fault-isolated que falha** é pulado e a marca avança por cima — nunca re-varrido (o `KNOWN RESIDUAL` do próprio job) | `PRE-DADOS-REAIS-2026-08-30.md:173-177`, relabelando `accountingSyncReconcile.job.ts:38-48` |

**Proposta (editorial, precisa de ack porque os docs estão commitados em #243/#244):** o segundo vira
**F-W2F-4**. É ele que o dossiê analisa e que a seção B abaixo decide. O original segue aberto com o
nome que sempre teve.

---

## B. F-W2F-4 (ex-"F-W2F-3" do PRE-DADOS) — forma do conserto do skip-and-advance

**Premissa CONFIRMADA** (verificação do orquestrador): `withReconcileWatermark` persiste a marca
incondicionalmente após `runPasses` resolver, sem inspecionar `summary.failed`
(`accountingSyncReconcile.job.ts:180`); o docstring (linhas 168-171) é explícito que a guarda cobre só
falha da **rodada inteira**, não o item isolado. Sem retry, fila ou reset expostos. Detalhe e evidência
completa: `F-W2F-4-DOSSIE.md`.

| Opção | Uma linha | Risco principal | O teste-guarda assertaria |
|---|---|---|---|
| **1** | Marca = min(início da janela, falha não resolvida mais antiga) | Marca presa para sempre num item nunca corrigido → full-scan disfarçado | Após rodada com 1 falha, marca ≤ `updatedAt` do item falho |
| **2** | Fila de retry com contador, desacoplada da marca | Mais cara: tabela nova + política de backoff | Item falho aparece na fila; 2ª rodada o reprocessa |
| **3** | Dead-letter explícita com alerta (reusa `sendAlertWebhook`) | Sem retry automático — depende de humano ver o alerta | Falha gera registro dead-letter + webhook disparado |
| **4** | Rescan completo periódico intercalado (a cada K execuções) | Recuperação atrasa até K ticks; observabilidade fraca | Na rodada K, item falho antigo volta ao `total` do summary |

**Decisão do dono:** ✅ **RATIFICADA a OPÇÃO 1** em 2026-09-01 — mensagem do dono: *"Ratifico o
F-W2F-4 na opção 1, dispara instrumentação e correção"*. A marca vira
`min(início da janela − OVERLAP_MS, falha não resolvida mais antiga)`; o risco nomeado da opção
(marca presa num item nunca corrigido → full-scan disfarçado) está **aceito** pela ratificação.
O uso do nome "F-W2F-4" na mensagem também confirma a renumeração da seção A.
Trilha disparada: `sessao-instrumentacao` → `sessao-correcao`.

---

## C. F-AGING-1..5 — forks do BRIEF-FE-AGING — ✅ RATIFICADOS

> **2026-08-31, mensagem do dono:** *"Ratifico os 5 F-AGING conforme recomendado, dispara a onda 2"*
> — os 5 forks decididos na opção recomendada (1→b, 2→a, 3→a, 4→a, 5→b); `sessao-feature`
> disparada. Seções B (F-W2F-4) e D (F-Q1) **seguem abertas** — a ratificação não as cobre.
>
> **2026-09-01 — CICLO FECHADO:** implementação executada, review independente PASS (zero
> findings), CI verde, **mergeado em `main` como `cc18a988` (PR #248)** com o BRIEF incluído.
> Residual humano: sign-off de browser da aba Aging (gate humano, sem sessão de agente).

Contrato do backend verificado pelo orquestrador: `GET /api/accounting/reports/aging` com
`unitId`+`kind` obrigatórios, `asOf` opcional validado por calendário (`aging.dto.ts:29-38`), envelope
com `tieOut`/`tieOutSkippedReason` (`accountingController.ts:394-422`). Zero mudança de backend
necessária. Golden refs e checklist de comportamentos: `BRIEF-FE-AGING.md`.

| Fork | Decisão | Recomendação do BRIEF (não ratificada) |
|---|---|---|
| **F-AGING-1** | Posição da aba em `AccountingView.tsx` | Entre "Contas a Receber" e "Contrapartes" |
| **F-AGING-2** | Toggle Pagar/Receber num painel vs. duas abas | Toggle único, clonando `DimensionReports` |
| **F-AGING-3** | Drill por documento: sempre expandido vs. accordion | Sempre expandido (YAGNI) |
| **F-AGING-4** | Filtro/busca por contraparte | Nenhum nesta fatia — o DTO não aceita `counterpartyId` |
| **F-AGING-5** | Link cruzado contraparte→subledger via `SubledgerFilterBar` (existe, com teste, desde #191) | Incluir — reuse barato; **mas diverge do precedente** dos relatórios irmãos sem link cruzado |

**Ratificados os 5** → destrava `sessao-feature` (executa o BRIEF) → `luminaris-reviewer` em worktree
separado → `sessao-integracao`. Fora de escopo registrado no BRIEF (exigiria nova autorização):
export/impressão; `counterpartyId`/paginação no backend.

---

## B². F-W2F-5 (CANDIDATO NOVO — reportado pelo revisor independente em 2026-09-01, não decidido)

O congelamento do F-W2F-4 protege só `summary.failed`. Itens classificados como **`blocked`** via
`ACCOUNTING_PERIOD_NOT_OPEN` — que ao contrário de `MAX_CENTS_EXCEEDED` **não é veneno permanente**
(a intenção documentada é "espera o período reabrir") — têm o MESMO mecanismo de queda: se o
período ficar fechado por mais tempo que a janela da marca, o item sai do scan em silêncio.
Pré-existente, não introduzido pelo diff do F-W2F-4, e fora da opção 1 ratificada (que fala de
falha). Evidência: condição do fix é `summary.failed > 0`, nunca olha `summary.blocked`
(`accountingSyncReconcile.job.ts`, `withReconcileWatermark`); classificação de blocked no
docstring de `ReconcileSummary` (~linhas 106-113). **Decisão do dono:** abrir ciclo
instrumentação→correção espelhando o F-W2F-4 (congelar também com `blocked > 0` por
`PERIOD_NOT_OPEN`), ou aceitar o resíduo documentado.

## D. F-Q1 — inalterado

Promover ADR-P2 a `Accepted` agora ou esperar. Recomendação registrada: **esperar** (pré-condição
"vertical 1 validado" é falsa hoje; o `Draft` é o que segura a execução). Reabrir se os gates humanos
passarem de meses.

## E. O que nenhuma decisão acima muda

A trilha crítica segue humana e sem sessão de agente: **B-4 → X2 → H1 (PVA) → H2 → M2**, runbooks em
branco prontos. A pergunta do **regime tributário do primeiro cliente** segue governando o alvo do
produto e não é fork ratificável.
