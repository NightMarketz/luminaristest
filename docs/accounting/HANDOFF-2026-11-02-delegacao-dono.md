# Passagem de sessão — delegação do dono: H1, H2, cédulas e #907 (02/11/2026)

> Leia isto primeiro na sessão que vai disparar as correções. As decisões estão em
> [`D-2026-11-02-DELEGACAO-DONO`](../plano/decisoes/D-2026-11-02-DELEGACAO-DONO.md); este documento diz **o que falta
> fazer, em que ordem, com que autorização e com que prompt**.
> Graus: **[V]** verificado nesta sessão (comando ou leitura do arquivo) · **[I]** inferido · **[A]** assumido.
> Medido em 02–03/11/2026 contra `origin/main` `f5dc79b7`.

## 1. Em duas linhas

As cédulas pendentes foram decididas, o #1005 está em `main` e o H1 não tem passo executável até haver ECD assinada
**[V]**. Faltam 5 correções de código (C1–C5) e o lote de merge (M1). O risco principal é o #907: ele muda a regra de
lançamento em período reaberto e mexe em todos os chamadores de `reverseEntry`, então só entra com revisor independente
**[V]**.

## 2. Autorização que vale para tudo abaixo

Dono, chat, 2026-11-02: *"gates humanos H1 e H2, as cédulas de decisão pendentes e o #907. Faz e me substitui nas
decisões"*. Dono, chat, 2026-11-03: *"Já documenta as correções necessárias pra disparar tudo numa próxima sessão"*.
Cada correção abaixo cita a seção da nota de decisão que a criou. Pela régua de 28/10, contabilidade e fiscal são classe
**vermelha**: revisor independente antes do merge, e o merge sai pela maestro.

## 3. Estado em 03/11

| Item | Estado | Grau |
|---|---|---|
| #1005 FIX-DRE-DEDUCAO-SINAL | MERGED (`f5dc79b7`) | [V] |
| #1011 nota de decisão + folds + este handoff | aberto, vermelho (cédula e gate H1), só docs | [V] |
| #1003 kit D1/D1f | `[x]` desfeitos no `b5fed32b`; aberto, vermelho | [V] |
| #907 ITG 2000 itens 32/36 | 1ª correção em `02420458`, gates verdes; 2ª correção (razão extemporânea na tela e nos automáticos) em andamento num agente desta sessão | [V] 1ª · [A] 2ª |
| #982 evidência do H2 | passos 1–15 com desfecho; P0 + passos 16–23 + runbooks irmãos em execução num agente desta sessão | [V] 1–15 · [A] resto |
| H1 | tentativa 4: passos 1–5 PASSOU e assinados (29/10); passo 6 pausado até ECD assinada do 1º cliente | [V] |

Se esta sessão terminar antes dos dois agentes, confira com `gh pr view 907` e `gh pr view 982` o que chegou à branch
antes de disparar C1 ou C6.

## 4. Correções a disparar

Ordem e paralelismo: **C2, C3 e C5 tocam arquivos separados e podem rodar em paralelo**, uma sessão cada. **C4 só
depois do #907 em `main`** (mesmo `PostingService`). C1 fecha o #907 e vem primeiro.

### C1 — fechar o #907 (revisor → merge)

- **Origem:** nota §3. **Sessão:** `revisor-independente` (worktree), depois a maestro com o número.
- **Pronto quando:** o revisor APROVA a cabeça final da branch `claude/itg2000-32-36-instrumentacao` e o PR está MERGED.
- **O que o revisor confere, antes de abrir o diff:** (1) estorno sem motivo dá 400 no DTO e no serviço; (2) o histórico
  do estorno tem motivo, data dd/mm/aaaa e `exercício/nº` do Diário; (3) lançamento manual com data em período fechado e
  reaberto sem `extemporaneousReason` dá 400, e com ela o histórico consigna data e razão; (4) gravador automático no
  mesmo caso passa com a razão automática; (5) período nunca fechado não muda; (6) os dois caminhos de reabertura são
  cobertos; (7) todos os chamadores de `reverseEntry` passam motivo (`tsc` limpo); (8) o modal de lançamento tem o campo
  novo e o de estorno o motivo obrigatório; (9) a sabotagem traz os vermelhos de volta.

### C2 — gate de cobertura referencial só na ECF (H1)

- **Origem:** nota §4. **Sessões:** `sessao-instrumentacao` → `sessao-correcao`, mesmo PR (OPS-006 leve).
- **Onde:** `server/src/features/accounting/services/SpedGenerationService.ts:150-156` **[V]** (o `ValidationError` com
  `unmappedAccounts` na ECD). A trava `COD_PLAN_REF` logo abaixo (l. 157) fica como está.
- **Comportamento:** na ECD, conta analítica sem código referencial deixa de dar 400. Ela sai sem I051, e a resposta da
  geração traz um aviso com `unmappedAccounts`. Na ECF, o gate continua igual. O FE mostra o aviso sem bloquear o
  download.
- **Base legal:** Manual da ECD, item 1.17 (mapeamento facultativo), [D09] do dossiê
  [`gates-humanos-lei`](../../pesquisas-legais/gates-humanos-lei/relatorio.md).
- **Teste-guarda:** ECD com 1 conta sem mapeamento → hoje 400, depois 200 sem I051 para ela e com o aviso; ECF com a
  mesma conta → continua 400 (controle).

### C3 — alerta da NFC-e off-line uma vez por nota e por dia

- **Origem:** nota §8. **Sessões:** `sessao-instrumentacao` → `sessao-correcao`.
- **Onde:** `server/src/jobs/DfePollScheduler.ts:72-86` **[V]**: a cada tick, nota off-line perto do prazo, vencida ou
  órfã dispara `this.alert`. Medido pela maestro: cerca de 720 avisos por dia por nota vencida **[I]**.
- **Comportamento:** no máximo 1 aviso por nota, por evento (perto do prazo, vencida, órfã) e por dia corrido. A memória
  do projeto pede janela ancorada no evento e trabalho em rodízio (`fila-de-job-com-teto-starvation`).
- **Teste-guarda:** dois ticks seguidos com a mesma nota vencida → 1 alerta (hoje 2). Controle: nota nova no 2º tick
  → alerta próprio.

### C4 — lacunas restantes do ITG 2000 (depois do #907 em `main`)

- **Origem:** nota §3 (fim). Ficam no `GAP-MAP.md` ao lado das linhas 32/36 depois do #907.
- **Sessões:** uma `sessao-instrumentacao` com 3 guardas → `sessao-correcao`.
  1. `EntryApprovalService.approveEntry` (`server/src/features/accounting/services/EntryApprovalService.ts:214` **[V]**):
     rascunho aprovado com data em período reaberto deve seguir a regra do item 36. O DTO do rascunho ganha o campo.
  2. `reverseEntry` com data de estorno em período reaberto: mesma regra.
  3. O `reverse` da reconciliação (`server/src/jobs/accountingSyncReconcile.job.ts`) manda `reversalPostingDate` com
     hora. Deve mandar data pura (memória `motor-grava-date-como-iso-utc-scopeday-recua-um-dia`).
- **Só pesquisa, sem código:** o tamanho máximo do campo HIST do I250 no leiaute da ECD, contra o histórico mais
  longo que o #907 gera. Pelo método legal: acervo primeiro, depois o Manual da ECD no sped.rfb.gov.br.

### C5 — executar o FE-INCR-ECF-Y600 (H2 passo 14)

- **Origem:** nota §6. Sem ele, o passo 14 do H2 continua FALHOU: a ECF pela tela dá 400 porque os painéis não mandam
  os sócios (Y600).
- **Autorização:** `executa` do BRIEF inteiro, por esta delegação (nota §6). O BRIEF e os forks já existem:
  [`FE-INCR-ECF-Y600-brief.md`](FE-INCR-ECF-Y600-brief.md), forks em `D-2026-10-29-FE-ECF-Y600-FORKS`.
- **Sessão:** `sessao-feature`, PR-0 → PR-1 → PR-2 do BRIEF (PR-0 e PR-2 condicionais aos forks já ratificados).
- **Depois:** refazer o passo 14 do RUNBOOK-H2 pela tela, como AI tester, no #982.

### C6 — achados do H2

O agente do H2 registra bug como linha de achado no runbook (no #982), sem corrigir. Quando ele voltar, cada achado
vira uma linha aqui, com arquivo e o par instrumentação → correção. **A anexar.**

## 5. Lote de merge (M1) — aprovado por delegação, com condição

| PR | Condição para a maestro mergear |
|---|---|
| #1011 | CI verde (só docs) |
| #1003 | CI verde na cabeça `b5fed32b` ou depois |
| #907 | C1: revisor APROVA a cabeça final |
| #982 | depois que o agente do H2 terminar e o CI ficar verde; o H2 segue `human-open` se houver FALHOU/BLOQUEADO |

Dependabot (#944, #946, #948, #949, #951, #952): **não** mergear (nota §8).

## 6. Próximo comando exato

Numa sessão nova, nesta ordem:

1. `gh pr view 907 --json headRefOid,statusCheckRollup` e `gh pr view 982 --json headRefOid,isDraft` para ver o que os
   agentes deixaram.
2. Revisor do #907 (C1): despachar `revisor-independente` em worktree com a lista do C1 como âncora.
3. Em paralelo, uma sessão para cada: C2, C3 e C5. Prompt de cada uma: *"Leia
   `docs/accounting/HANDOFF-2026-11-02-delegacao-dono.md` §C<n> e execute pela sessão indicada. Autorização: delegação do
   dono de 02/11 (§2 do handoff)."*
4. Depois do #907 em `main`: C4.
5. Lote M1 pela maestro.

## 7. Arquivos

- [`docs/plano/decisoes/D-2026-11-02-DELEGACAO-DONO.md`](../plano/decisoes/D-2026-11-02-DELEGACAO-DONO.md)
- [`docs/plano/gates/H1.md`](../plano/gates/H1.md) (fold 02/11) · [`docs/plano/gates/H2.md`](../plano/gates/H2.md)
- [`docs/accounting/RUNBOOK-H2-BROWSER-SIGNOFF.md`](RUNBOOK-H2-BROWSER-SIGNOFF.md) (na branch do #982)
- [`docs/plano/nos/FIX-DRE-DEDUCAO-SINAL.md`](../plano/nos/FIX-DRE-DEDUCAO-SINAL.md): o passo 3 (seed no `dev.db` real) é o P0 do H2
- [`docs/plano/nos/FE-INCR-ECF-Y600.md`](../plano/nos/FE-INCR-ECF-Y600.md)
