# Cédula de decisão — 2026-09-14 — R5..R10 · F-X6-1..6 · autorizações SEED-MY / X4-14 / #315 / C8

> **O que este doc é:** o registro citável (ORCH-006) das decisões do dono tomadas em **questionário**
> (`AskUserQuestion`, 2 rodadas × 4 perguntas, sessão de 2026-09-14) sobre os nós `decide` do
> `GRAFO-DEPENDENCIAS-2026-09-11.md` §3 e sobre quatro autorizações que estavam sem item de fila.
> **O que não é:** decisão de agente — cada opção foi escolhida pelo dono; a recomendação do agente
> estava marcada e é registrada ao lado para o caso de o dono ter decidido **contra** ela (R6).

## Sinal do dono (literal)

> "Pode tomar todas as decisões aqui" — dado sobre a tabela de 10 linhas (R8 · F-X6-1..6 · R9 · R10 ·
> R5/R6/R7 · SEED-MY · X4-14 · #315 · C8), respondida opção a opção no questionário.

## ⚠️ Reconciliação com a cédula paralela (`CEDULA-DECISAO-2026-09-14-gates-humanos.md`, PR #318)

Duas sessões questionaram o dono no mesmo dia sobre o mesmo conjunto e as respostas divergiram em
**4 pontos**. O dono desempatou **item a item** (questionário, esta sessão, 14/09). **Esta tabela prevalece
sobre as duas cédulas onde elas divergem**; onde concordam, qualquer uma é citável.

| Ref | Vence | Decisão final | O que muda na tabela abaixo / no #318 |
|---|---|---|---|
| **R6** | **#319 (esta)** | **Financeiro antes de fiscal**: F7 BRIEF e F-BAIXA antes da `sessao-feature` do X6; exceção 01/10 (X10i quando D5 existir) mantida | linha R6 do #318 ("manter F-M6") **superada** |
| **R8** | **#318** | **Instância = CNPJ raiz; unidade = filial com conta de emissão própria.** `units.cnpj` **fica**; chave do parceiro por instância, conta por unidade no `FiscalProfile` (R4 derivada, a confirmar na emenda do ADR-DFE) | linha R8 abaixo ("`units.cnpj` informativo") **superada** |
| **F-X6-3** | **#318** | **(b) subtrair PIS/COFINS já** — ativa F-X6-4 monofásico por produto agora; 4 exceções (monofásico, ICMS fora da base — Lei 14.592/23, IPI na base, fornecedor do Simples) com default conservador **sem crédito**, como dado configurável; linha nova no pedido ao contador | X6 passa a **5/6 → (a) + F-X6-3 → (b)**; o BRIEF #309 precisa de emenda (itens 10/11) antes da feature |
| **R5** | **#319 (esta)** | **Adiar até X7 destravar** — sem desenho de adaptador agora; contratar decide-se quando D1 itens 1/1b chegarem | linha R5 do #318 ("não contratar + port") **superada** |
| **#315** | **#318** | **A sessão paralela integra** (review independente + merge no PASS). Esta sessão iniciou `sessao-integracao`, encontrou o conflito com o #316 e **abandonou sem tocar a branch** (baseline inválido por EBUSY — jest concorrente) | regra de conflito da linha #315 abaixo continua válida para quem integrar |

## Decisões

| Ref | Pergunta | Decisão do dono | Recomendação | Consequência imediata |
|---|---|---|---|---|
| **R8** | `units.cnpj` por unidade (F-DFE-2 → a) × resposta 16 "1 instância = 1 CNPJ" | **1 instância = 1 CNPJ** (resposta 16 vence) | = | **Emenda ao `ADR-INCR-DFE`**: F-DFE-2 passa a "uma conta de emissão por CNPJ"; critério de seleção do parceiro (D5) muda; `units.cnpj` vira informativo/herdado da instância. `FiscalProfile` (X6) segue chaveado por escopo (`userId`+`unitId`). Nó R8 → ✅; a aresta R8 ⇢ M2 deixa de ser `(inferida)` na parte do CNPJ |
| **F-X6-1..6** | 6 forks do `BE-INCR-NFE-COST-REGIME-brief.md` (#309) | **6/6 → (a)** | = | 1 `FiscalProfile` Prisma por escopo · 2 ICMS recuperável **por item** (parser estende grupo N do MOC, fixture mista) · 3 PIS/COFINS persiste regime, **sem** subtrair · 4 monofásico = atributo do produto, diferido com 3 · 5 notas já importadas **não** reprocessam · 6 import sem perfil → **400**. Abre `sessao-feature` X6 (Fase 0 config → Fase A fórmula) — **posição na fila definida por R6** |
| **R9** | F7: reusar `reconcile_pending_items` c/ 4 emendas × tabela irmã | **Tabela irmã** | = | BRIEF F7 nasce com o desenho fechado: entidade própria (Prisma first-class, policy própria, confirmação humana explícita); `#296` intocado; `canManageReconcilePending` **não** passa a autorizar efeito financeiro. Nó R9 → ✅, F7 → `plan` com fork fechado |
| **R10** | Abrir ADR P-IA agora? | **Não abrir agora** | = | P-IA fica posição 9; ADR só quando D6 destravar F5/F6. Nenhuma frente bloqueada |
| **R5** | Contratar Integra Contador (Serpro)? | **Adiar até X7 destravar** | = | Contrata quando D1 itens 1/1b chegarem; X7 segue `blocked (ADR)` |
| **R6** | Ordem da fila | **Financeiro antes de fiscal, já** | ≠ (recomendado: manter F-M6 + exceção, X6 primeiro por ter spec pronta) | Dentro da regra 4 do algoritmo (spec pronta primeiro), o **financeiro passa à frente do fiscal**: **F7 BRIEF (R9 fechado) e F-BAIXA vêm antes da `sessao-feature` do X6**, mesmo com X6 tendo spec + forks ratificados. A exceção de 01/10 (X10i sobe assim que D5 existir) **permanece**. Contábil (C11/C12/C6b BRIEFs) segue no topo |
| **R7** | T0 da métrica P2 dentro do perímetro zero-diff | **Emendar o perímetro** | = | Exceção nominal no `ADR-P2-second-vertical.md`: `installPresetAsSystem` grava o marco (`onboardingCompletedAt`) **na mesma tx** (emenda 25/08 respeitada). Precedente `f42984ee`. Retoma o comportamento 11 do P2 |

## Autorizações citáveis (todas marcadas)

| Item | Autorizado | Sessão | Observação de estado (verificada 14/09) |
|---|---|---|---|
| **SEED-MY** | ✅ entra na fila | `job-generator` → seed fixture multi-exercício (2025 + 2026: períodos, lançamentos, AP/AR, chart com `1.1.6/3.3/4.2`) | Materializa a decisão de 12/09 (`RUNBOOK-H1-PVA.md` §"DECISÃO DO DONO"). Até existir, H1 roda como (ii) |
| **X4-14** | ✅ follow-up autorizado | `sessao-planejamento` → `sessao-feature` | Item 14 do BRIEF 3C (aviso no diagnóstico de ajuste parcial sem M312); depende dos 4 agregados `K155`/`K355` por conta/trimestre |
| **#315** | ✅ "mergeia" | `sessao-integracao` | Review PASS (2ª passada) e CI 5/5 verde no SHA `d6849094`, **mas `mergeStateStatus=DIRTY`**: `git merge-tree origin/main d6849094` conflita em `server/src/features/accounting/services/LalurService.ts` e `dtos/__tests__/__dto-shapes__.json` (colisão com #316). Regra pré-decidida do rebase: **`main` vence no shape snapshot; o PR vence no endpoint `GET /api/lalur/catalog`**; CI de novo no SHA rebaseado; só então merge |
| **C8** | ✅ ratificação por delegação **condicionada** | ADR `ADR-INCR-FIXED-ASSETS` (abertura já autorizada 03/09, F-Z0) → parecer → BRIEF | Quando ADR + parecer chegarem, fork **com recomendação escrita no parecer** fica ratificado sem voltar ao dono; fork **sem recomendação** volta. Estende a delegação da cédula 07/09 a este nó, e só a ele |

## O que este sinal NÃO cobre

1. **Execução** — nenhuma linha acima abre `sessao-feature` por si: R6 fixa a ordem, o próximo nó pelo
   algoritmo é o topo contábil (C11/C12/C6b BRIEFs), depois F7 BRIEF, depois X6 feature.
2. **Gates humanos e dado externo** — H1 2ª passada, H2, M2, D1/D5/D6/D-NFSE seguem com o dono/terceiro.
3. **Emendas de ADR decorrentes** (R8 → `ADR-INCR-DFE`; R7 → `ADR-P2`) — docs-only, cada uma com sessão
   própria; esta cédula é a autorização citável delas.

## Fold pendente

Atualizar `GRAFO-DEPENDENCIAS-2026-09-11.md` §3 (R5..R10 → ✅/decididos, X6 → `ready`, F7 → `plan`
com fork fechado) e `ACCOUNTING-MASTER-MAP.md` §5.1 (SEED-MY, X4-14 como itens) no próximo fold.
