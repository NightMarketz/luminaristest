# BE-INCR-DFE-POLLING-DESISTE — BRIEF do grupo "Polling DF-e que desiste" (25/11/2026)

**Sessão:** `sessao-planejamento` do grupo (cartão da drenagem da caixa). **Estado:** BRIEF pronto, **5 forks PENDENTES** (§4) —
logo **não** vale a dispensa da emenda de 21/11 ("BRIEF de grupo sem fork executa"); o que depende deles espera a resposta do dono.
**Escopo:** backend, com o FE em PR próprio (a casa separa `BE-INCR-*` de `FE-INCR-*`). Nenhum código nesta sessão.

> ⚠️ **Achado que muda o plano (verificado em 25/11, `origin/main` = `631dd60fe`):** o **#1392** (aberto, base `main`, branch
> `onda4/4-1-dfe-polling`, head `17ad42ad1`, CI de integração ainda rodando) **já implementa** boa parte do que a cédula chama de
> PR-0 e o re-arme **manual** do PR-1: colunas `pollDeferredSince`/`pollAlertedAt` (migração `20261124150000`), o `poll` na
> `FiscalDocumentView`, `POST /documents/:id/rearmar-polling`, o alerta de 1 h do adiamento por transporte e o isolamento de fase do job.
> Há uma worktree viva dele (`.claude/worktrees/fix-1392`, branch `onda4/4-1-dfe-polling-fix`). Este BRIEF é, portanto, um **delta sobre o
> #1392**: ele o trata como fato consumado (PR-0) e planeja só o que falta. O que a `main` tem hoje (do #1349 antigo, via #1378): teto
> `POLL_MAX_ATTEMPTS = 8`, backoff 2 min→1 h, `pollGaveUpAt`/`pollAttempts`/`nextPollAt`/`pollLastError`, adiamento sem gastar tentativa
> (`DfeTransporteIndisponivelError`) — **sem** alerta nem teto de idade para o adiado.

## 1. Autorização e cobertura (sequência 1)

- **Decisão do dono (chat, 25/11/2026, questionário da drenagem):** `docs/plano/decisoes/D-2026-11-25-FORKS-DRENAGEM-DA-CAIXA.md`, linha
  "Polling DF-e que desiste" — *"Colunas próprias + re-arme. PR-0: `pollDeferredSince`/`pollAlertedAt` … e `pollGaveUpAt`/`pollAttempts`
  no DTO e na lista. PR-1: re-arme automático (backoff longo, teto de idade e alerta) + `POST /documents/:id/rearmar-polling` … e botão;
  contingência que falha sempre ganha teto e alerta."* A cédula está no **#1401, ainda não mergeada** (os links `docs/plano/decisoes/…`
  deste BRIEF só resolvem depois dele; por isso o PR deste BRIEF espera o #1401).
- **Cobertura:** a cédula cobre exatamente as lacunas do grupo (3cf5, cf36, 6e13, f5fb, 92c5). Ela **não é "executa" de PR**: diz que cada
  tema vira BRIEF e que o "executa" do BRIEF de grupo sem fork segue a emenda de 21/11 de
  `D-2026-11-11-LACUNA-VAI-AO-MAESTRO` §2 (`docs/plano/decisoes/D-2026-11-11-LACUNA-VAI-AO-MAESTRO.md`, "Emenda de 21/11 (2)", item sobre
  BRIEF de grupo). Cobre **mais** que o item em um ponto: a cédula nomeia "teto de idade" sem número — o número é fork (F-PD-2/3), não
  suposição.
- **Nó do plano:** nenhum nó é dono do grupo (o polling nasceu no item 27 de `BE-INCR-DFE-brief.md`, nó X10b `done`; o #1146 é do X10a
  `inflight`). Este BRIEF **não edita nota de nó** (não há `write_set` a gravar: ver §8).
- **Relacionadas que esperam o #1146 (só citadas, não resolvidas aqui):** **580f** (assinador fora gasta tentativa — o ramo
  `DfeTransporteIndisponivelError` do #1392/main já a trata no #1349; sobra a interação no merge combinado), **15b2**
  (`AssinaturaRemotaError ASSINADOR_INDISPONIVEL` deve adiar sem tentativa; precisa de `isAssinaturaPendente`, que só existe no #1146),
  **9d92** (alerta de nota `PENDING_SIGNATURE` com assinador online; `DfeSignerHealthService.ts:56`, #1354). 15b2 mexe no **mesmo `catch`**
  de `pollPendingOnce` que o item P3.1 abaixo — ver ordem em §3.

- **Vizinhas na caixa, fora do grupo (citadas para não colidir, não resolvidas aqui):** **ff2f** (janela de 1 h não fixada por teste — o
  #1392 diz fechá-la), **153d** (nota autorizada por outro caminho mantém `pollGaveUpAt`/`pollDeferredSince`; por isso o P2.2 só mostra o
  estado em SENT/PROCESSING), **16c9** e **54f4** (`adiarPoll` não encerra o episódio; `adiarPorTransporte` regrava o episódio a partir do
  documento lido no início do tick — mesma função que P1.5 toca), **e1f3** (corrida poll × consulta manual da contingência, teste em SQLite
  real — toca o mesmo caminho do P3.1). Quem implementar P1/P3 lê essas quatro antes de editar `adiarPorTransporte`/`registrarFalhaDePoll`.

## 2. Lacuna → item que a fecha → comando que prova

| Lacuna | Fecha | Prova (cada um falharia sem o item) |
|---|---|---|
| **6e13** episódio em texto no `pollLastError` | **#1392** (colunas + migração; `pollLastError` volta a ser só mensagem). Item P0.2 | `npx jest …pollResilience.integration.test.ts --selectProjects integration --runInBand` (caso "episódio nas colunas") + `rearmarPolling.integration.test.ts` |
| **cf36** / **3cf5** sem DTO/UI, só re-arme manual pela consulta | exposição: **#1392** (`poll` na view) + P0.3 (tipo FE) + P2.1/P2.2 (botão); re-arme **manual**: **#1392**; re-arme **automático**: P1.1–P1.4 | integração: documento `pollGaveUpAt` + relógio avançado ⇒ volta à fila e é consultado (P1.1); FE: `FiscalDocumentsSection.test.tsx` mostra o botão só com `poll.gaveUpAt` e chama a rota |
| **92c5** adiado por transporte sem alerta e sem teto de idade | alerta de 1 h: **#1392**; **teto de idade**: P1.5 (depende de F-PD-3) | integração: documento adiado há > N ⇒ `pollGaveUpAt` preenchido + alerta (P1.5) |
| **f5fb** contingência que falha sempre, sem teto/desistência/alerta | P3.1 (**só depois do #1146**; `contingenciarNaoRecebida` não existe na `main`) — depende de F-PD-4 | integração: handler de contingência lançando 3 vezes seguidas ⇒ comportamento definido por F-PD-4 (alerta/desistência) |

## 3. Ordem de merge em relação ao #1146 (PR #1146, base `integration/x10a`)

Conflito medido, não presumido: o #1146 acrescenta o modelo `DfeSignerTask` em `schema.prisma` (~linha 3810, longe do `FiscalDocument`
~2410 onde o #1392 põe as colunas) e edita `FiscalDocumentLifecycleService.ts` em `consultarEAplicar`/`ctxDe`/contingência; o #1392 e este
BRIEF editam `pollPendingOnce`/`registrarFalhaDePoll`/`rearmarPoll` e `FiscalDocumentRepository.listPending`, **que o #1146 não toca**
(sua lista de arquivos não inclui o repositório nem `DfePollScheduler.ts`). Lido nas listas de arquivos, **não** rodei merge descartável
(insumo ausente: confirmar com `git merge-tree` antes de cada merge). Ordem recomendada:

1. **#1401** (cédula) → `main`.
2. **#1392** (P0) → `main`. Não espera o #1146: os arquivos não colidem e ele já está na base `main`.
3. **P1 (BE, re-arme automático + teto + auditoria)** e **P2 (FE, botão)** → `main`, em paralelo entre si (write-sets disjuntos), depois
   do P0. Não esperam o #1146.
4. **#1146** segue o seu caminho (`integration/x10a` → `main`). **Antes** de ele chegar à `main`: a migração dele é
   `20261124130000_dfe_signer_tarefas`, que ordena **antes** de `20261124140000` e `20261124150000` já na `main` — o `migrate deploy`
   aplica a pendente fora de ordem, mas `migrate dev`/replay avisa de histórico fora de ordem. **Não verifiquei** o comportamento no
   gate de migração (insumo ausente); vai à caixa como lacuna do #1146 (renomear o diretório dele para timestamp posterior ao último
   da `main`).
5. **P3 (f5fb)** só depois do #1146 na `main` e **junto/depois da 15b2** (mesmo `catch`); a migração nova, se houver (F-PD-5), com
   timestamp > `20261124150000`.

## 4. Forks PENDENTES de ratificação (nenhum decidido aqui)

Todos são valor/política que a cédula e as lacunas deixam ao dono ("N é do dono", "alerta/desistência definidos pelo dono").

- **F-PD-1 — Intervalo do re-arme automático do documento que desistiu.** (a) **6 h**, uma consulta por ciclo (recomendada: "backoff longo"
  da cédula; 4 consultas/dia, custo baixo, a nota que a SEFAZ já processou é achada em ≤ 6 h); (b) backoff exponencial 6 h→24 h com contador
  (exige coluna nova); (c) 1 h fixo. **Recomendação (a)**, sem coluna. Status: RATIFICAÇÃO PENDENTE.
- **F-PD-2 — Teto de idade do re-arme: medida, valor e efeito.** Medida: `now − FiscalDocument.createdAt` (não há coluna "enviada em";
  a alternativa, ler a tentativa corrente, custa um join por tick). Valor: (a) **7 dias** (recomendada), (b) 3 dias, (c) 30 dias.
  Efeito ao atingir: para de re-armar, grava/mantém `pollGaveUpAt`, **um** alerta final ("abandono definitivo"), a consulta manual
  segue valendo. **Recomendação (a)**. Status: RATIFICAÇÃO PENDENTE. *Pendência externa:* se a nota SENT/PROCESSING parada por dias tem
  efeito fiscal (prazo de cancelamento/inutilização) — ver §5.
- **F-PD-3 — O documento adiado por transporte (92c5) também ganha teto de idade?** (a) **sim, o mesmo teto do F-PD-2**: ao completar a
  idade máxima adiado, vira `pollGaveUpAt` + alerta final (recomendada: um único conceito de idade, e fecha o "sem teto de idade" que o
  92c5 pede); (b) só o alerta de 1 h do #1392 (a leitura "só alerta, sem teto" de 24/11, que o corpo do #1392 cita e a cédula de 25/11
  amplia); (c) teto próprio menor (24 h). **Recomendação (a)**. Status: RATIFICAÇÃO PENDENTE.
- **F-PD-4 — Contingência que falha sempre (f5fb): qual teto e qual alerta?** (a) **reusar o contador e o teto do poll**: a falha de
  `contingenciarNaoRecebida` deixa de ser engolida (`return false`) e vira erro tipado que cai em `registrarFalhaDePoll` ⇒ backoff,
  8 tentativas, `pollGaveUpAt`, alerta, e o re-arme automático do P1 (recomendada: zero coluna, um só caminho); (b) contador próprio da
  contingência (coluna nova); (c) só alerta, sem desistência. **Recomendação (a)**. Status: RATIFICAÇÃO PENDENTE. Atenção: a NFC-e que
  deveria entrar em contingência tem prazo de transmissão (X10a PR-9); desistir do poll **esconde** a nota que ainda precisa ser
  contingenciada — por isso o alerta é parte do fork, não opcional.
- **F-PD-5 — Dedupe do alerta final e significado de `pollAlertedAt`.** O #1392 apaga `pollDeferredSince`/`pollAlertedAt` a cada falha
  da consulta e na desistência (`EPISODIO_ENCERRADO`), então depois da desistência as duas ficam livres. (a) **reusar `pollAlertedAt`
  como "o alerta de abandono definitivo (F-PD-2) já saiu"**, limpo pelo re-arme manual/sucesso (recomendada: nenhuma coluna nova; muda
  o significado de uma coluna que o #1392 criou); (b) coluna nova `pollFinalAlertedAt` (migração aditiva, timestamp > `…150000`);
  (c) dedupe só em memória, como `DfePollScheduler.alertadas` (perde o "já alertei" no restart ⇒ repete o alerta). **Recomendação
  (a)**. Status: RATIFICAÇÃO PENDENTE. (Mudar o significado de `pollAlertedAt` é do dono porque o contrato do #1392 e a view `poll.alertedAt`
  passam a cobrir dois casos.)

## 5. Pendente de validação externa

- **Efeito fiscal de uma NFS-e/NF-e/NFC-e que fica SENT/PROCESSING por dias sem consulta.** Não há artefato de origem citado aqui sobre
  prazos (cancelamento, contingência, inutilização) — nenhum item do checklist depende de regra fiscal nova: todos só mudam *quando o
  Luminaris consulta e avisa*. O valor do teto (F-PD-2) e o impacto de desistir do poll da NFC-e em contingência (F-PD-4) pedem o
  julgamento do dono/contador; **não** entra no checklist como decidido.
- Comportamento real da SEFAZ ao reconsultar uma chave "não consta" depois de dias (não medido; só código e testes com SEFAZ falsa).

## 6. Checklist numerado

**Legenda:** `[direto]` = sem fork; `[F-PD-n]` = só depois da resposta do fork. Cada item é testável sozinho. Padrão de camada:
Route → Controller → Service (Policy) → Repository → Prisma; DTO Zod `.strict()` onde houver entrada; soft-delete (`deletedAt: null`) em toda
leitura nova.

### PR-0 — o #1392 (já escrito; este BRIEF o trata como fato consumado)

- **P0.1 [direto]** Revisão e merge do #1392 na `main` (classe vermelha: schema + migração ⇒ `revisor-independente`, lote do dono). Prova:
  `node scripts/classe-risco.mjs pr 1392`; CI de integração 4/4 verde.
- **P0.2 [direto]** `pollDeferredSince`/`pollAlertedAt` em `FiscalDocument` (migração `20261124150000_add_dfe_poll_deferred_episode`,
  aditiva, sem backfill); `pollLastError` só mensagem; falha seguida e sucesso encerram o episódio. Prova: caso do episódio no
  `pollResilience.integration.test.ts`.
- **P0.3 [direto]** `FiscalDocumentView.poll` = `{ attempts, gaveUpAt, lastError, deferredSince, alertedAt }` no backend (feito no #1392) **e
  o mesmo tipo em `my-app/lib/services/dfe.service.ts` (`FiscalDocumentView`)** — o #1392 não toca `my-app`; a view é interface TS, não Zod,
  e `__dto-shapes__.json` só cobre DTOs Zod (**conferir**: se `FiscalDocumentView` não está no snapshot, o gate de snapshot não se aplica e a
  paridade BE↔FE é o teste `FiscalDocumentEmissionService.view.test.ts` + `tsc` do my-app). Prova: `cd my-app && npx tsc --noEmit`.
- **P0.4 [direto]** `POST /api/nfe/dfe/documents/:id/rearmar-polling` (Policy `canEmitFiscalDocument`, sem mudar `status`, só quem tem
  `pollGaveUpAt` e está SENT/PROCESSING é mexido) — feito no #1392. Prova: `rearmarPolling.integration.test.ts`; **path-count do
  `public/openapi.json` +1** (o #1392 atualiza `nfe.paths.ts` e o JSON).
- **P0.5 [direto]** Alerta de 1 h do adiamento por transporte, uma vez por episódio (`POLL_TRANSPORTE_ALERTA_APOS_MS`). Prova:
  `DfePollScheduler.test.ts` + caso no `pollResilience`.
- **P0.6 [direto]** Fases do tick isoladas (`fasesFalharam`): o alerta de desistência/adiamento não se perde se contingência/eventos/anexos
  lançarem. Prova: `dfePollPending.faseIsolation.test.ts`.
- **P0.7 [direto]** O **corpo do #1392 está desatualizado** ("nenhuma coluna nova, nenhuma migração"; o diff tem migração e 2 colunas):
  corrigir o corpo antes do lote — registrada na caixa, não resolvida aqui.

### PR-1 — re-arme automático, teto e auditoria (BE, depois do P0)

- **P1.1 [F-PD-1]** `listPending` passa a devolver também o documento com `pollGaveUpAt` cujo `pollGaveUpAt + REARME_INTERVALO ≤ now` e
  cuja idade `< IDADE_MAX`, mantendo `partner != 'manual'`, `deletedAt: null`, `status ∈ {SENT, PROCESSING}`. O re-arme automático é **uma
  consulta** (não zera `pollAttempts`): falhou de novo ⇒ `pollGaveUpAt = now` outra vez (próximo ciclo em `REARME_INTERVALO`); deu certo
  ⇒ `limparFalhaDePoll` (zera tudo). Prova: integração — doc com `pollGaveUpAt = now−REARME_INTERVALO−1 s` é consultado no tick; com
  `now−REARME_INTERVALO+1 s` não é.
- **P1.2 [F-PD-1]** Re-falha de documento re-armado **não** conta como "nova desistência" no `PollSummary.gaveUp` (sem realerta a cada
  ciclo): `registrarFalhaDePoll` só devolve `true` quando `doc.pollGaveUpAt` era `null` antes. Prova: 3 ciclos de re-falha ⇒ `gaveUp`
  contado 1 vez só.
- **P1.3 [F-PD-2, F-PD-5]** Teto de idade: documento com `pollGaveUpAt` e idade `≥ IDADE_MAX` sai do re-arme e gera **um** alerta final
  (`dfe_poll`/`reconcile_summary` com ids, mesmo molde do `pollGaveUp`), com o "já alertei" gravado conforme o F-PD-5. Prova: dois ticks
  seguidos além do teto ⇒ 1 alerta; re-arme manual limpa e o ciclo recomeça.
- **P1.4 [direto]** O re-arme **manual** (`rearmarPoll`) também zera a marca de alerta final (F-PD-5) e **grava auditoria**: o #1392 não
  chama `auditService.append` em `rearmarPoll` (confirmar lendo o `d670b571c`); `eventType` novo no padrão dos vizinhos (`dfe.emitted`
  em `FiscalDocumentLifecycleService.ts:726`), sugerido `dfe.poll_rearmed`, **entra na allowlist de `auditCanonical.ts` na mesma mudança**
  e o payload só leva `documentId`/`unitId`/estado anterior (sem PII — memória `accounting-audit-allowlist-guards`). Prova: teste de
  auditoria + guarda da allowlist.
- **P1.5 [F-PD-3]** Adiado por transporte além de `IDADE_ADIADO_MAX` (valor/medida do F-PD-3) ⇒ vira `pollGaveUpAt = now` (limpa o episódio)
  e **alerta**; dali em diante segue a regra do P1.1/P1.3. Prova: doc com `pollDeferredSince = now−N−1` e transporte ainda fora ⇒
  desistência + alerta; com `now−N+1` ⇒ segue adiado.
- **P1.6 [direto]** Constantes nomeadas e exportadas (`POLL_REARME_INTERVALO_MS`, `POLL_IDADE_MAX_MS`) no mesmo bloco de
  `POLL_MAX_ATTEMPTS`, com teste que as fixa (mutante em 0 e ×2 morre — mesmo critério que o #1392 usou na janela de 1 h).

### PR-2 — botão e estado na lista (FE, depois do P0; paralelo ao PR-1)

- **P2.1 [direto]** `dfeService.rearmarPolling(id, { unitId })` em `my-app/lib/services/dfe.service.ts` (`POST …/rearmar-polling`, mesmo
  `Envelope<FiscalDocumentView>` do `reenviar`). Prova: teste de serviço.
- **P2.2 [direto]** `FiscalDocumentsSection.tsx`: para SENT/PROCESSING com `poll.gaveUpAt` ⇒ aviso "a consulta automática parou" (+ idade/erro,
  `poll.lastError`) e botão "Re-armar consulta"; com `poll.deferredSince` ⇒ aviso "assinador local indisponível desde …". Componente
  existente (`btn`/`warnBox` de `dfeUi.ts`), `neutral-*`, cards `rounded-2xl`. i18n **pt e en** no namespace já carregado (paridade
  pelo gate de wiring; namespace novo exige entrar em `ns` — memória `i18n-namespace-novo-precisa-entrar-no-ns`). Prova:
  `npx vitest run my-app/features/accounting/components/dfe/__tests__/FiscalDocumentsSection.test.tsx` + `npx tsc --noEmit` + build de produção
  (tela atrás de `withAuth`).

### PR-3 — contingência que falha sempre (BE, **só depois do #1146 na `main`**, junto/depois da 15b2)

- **P3.1 [F-PD-4]** Em `contingenciarNaoRecebida`/`contingenciarSeConsultaFalhaHaMuito` (só no #1146), a falha da entrada em
  contingência deixa de devolver `false` e engolir: propaga erro tipado (ex.: `DfeContingenciaFalhouError`, código `dfe_contingencia_*`) ao
  `catch` de `pollPendingOnce`, que **não** o trata como "skippable sem tentativa" ⇒ `registrarFalhaDePoll` (backoff, teto, `gaveUp`,
  alerta, re-arme automático do P1). Prova (a do `comoProvar` da f5fb): handler de contingência lançando 3×/8× seguidas ⇒ `pollAttempts`
  cresce, `nextPollAt` espaça, no teto `pollGaveUpAt` + alerta; `nfceContingencia.integration.test.ts` e
  `FiscalDocumentContingencia.test.ts` seguem verdes.
- **P3.2 [direto]** A nota **continua** SENT/PROCESSING e a consulta manual segue valendo (nenhum `status` muda por desistência — regra
  do #1349, `REJECTED` liberaria o reenvio sem a SEFAZ ter dito que não recebeu).

## 7. Contratos (esboço, não código)

```ts
// Sem coluna nova na recomendação (F-PD-1a/2a/4a/5a). Colunas nomeadas pela cédula, todas já no #1392 ou na main:
//   FiscalDocument.pollAttempts Int @default(0)      pollGaveUpAt DateTime?   nextPollAt DateTime?
//   FiscalDocument.pollLastError String?             pollDeferredSince DateTime?   pollAlertedAt DateTime?
// Se F-PD-1b ou F-PD-5b: migração aditiva, prólogo defensivo (SQLite sem ADD COLUMN IF NOT EXISTS), timestamp > 20261124150000.

// Constantes novas (mesmo bloco de POLL_MAX_ATTEMPTS; valores = respostas dos forks)
export const POLL_REARME_INTERVALO_MS = /* F-PD-1: rec. 6 * 3_600_000 */ 0;
export const POLL_IDADE_MAX_MS        = /* F-PD-2: rec. 7 * 86_400_000, medida: now - createdAt */ 0;

// PollSummary (acrescenta ao #1392): alerta final por abandono definitivo, uma vez
interface PollSummary { /* …existente… */ abandonoDefinitivo?: number; abandonoDefinitivoIds?: string[] }

// Alerta (DfePollScheduler → sendAlertWebhook): mesmo molde do pollGaveUp
{ source: 'dfe_poll', event: 'reconcile_summary', job: 'dfe_poll_pending',
  pollAbandonoDefinitivo: number, pollAbandonoDefinitivoDocumentIds: string[] }   // ids cuid, sem PII

// Rota (já no #1392): POST /api/nfe/dfe/documents/:id/rearmar-polling   body { unitId: string } (.strict)
//   200 { success: true, data: FiscalDocumentView } · 400 params/body · 401 · 403 (canEmitFiscalDocument) · "não encontrado" = ValidationError
// View (já no #1392; FE copia o tipo, P0.3):
poll: { attempts: number; gaveUpAt: string|null; lastError: string|null; deferredSince: string|null; alertedAt: string|null }
// Candidato a acrescentar na view, se o dono quiser "próxima consulta" na tela (não decidido): nextPollAt: string|null

// Repositório (IFiscalDocumentRepository.listPending): predicado novo, sem mudar a assinatura
//   OR [ {pollGaveUpAt: null, nextPollAt: null|<=now}, {pollGaveUpAt: {lte: now - REARME}, createdAt: {gte: now - IDADE_MAX}} ]
// Auditoria: eventType 'dfe.poll_rearmed' (allowlist de auditCanonical.ts na mesma mudança), payload { documentId, unitId, gaveUpAt }
```

## 8. Write-set e choke points (PAR-001/002/005)

**Sem nó dono do grupo ⇒ nada gravado em `docs/plano/nos/*` por esta sessão** (editar a nota do X10a/X10b é fora do escopo; o fold do
nó que fechar isto grava `write_set`). Rascunho por PR, para o maestro/PAR:

| PR | Arquivos que edita/cria | Choke points |
|---|---|---|
| P0 (#1392) | `FiscalDocumentLifecycleService.ts`, `FiscalDocumentEmissionService.ts`, `IFiscalDocumentRepository.ts`, `fiscalDocumentController.ts`, `routes/dfe.ts`, `routes/docs/nfe.paths.ts`, `public/openapi.json`, `jobs/DfePollScheduler.ts`, `jobs/dfePollPending.job.ts`, `models/dfePollAdiamento.ts` + testes | `schema.prisma`, migração, `openapi.json` |
| P1 | `FiscalDocumentLifecycleService.ts`, `repositories/FiscalDocumentRepository.ts`, `jobs/DfePollScheduler.ts`, `models/auditCanonical.ts` + testes | `schema.prisma` só se F-PD-1b/5b |
| P2 | `my-app/lib/services/dfe.service.ts`, `my-app/features/accounting/components/dfe/FiscalDocumentsSection.tsx`, i18n pt/en, testes | — |
| P3 | `FiscalDocumentLifecycleService.ts` (região `consultarEAplicar`/contingência — a do #1146), `NfceContingenciaService.ts` se o erro tipado nascer lá + testes | — |

P1 e P3 editam o mesmo service (regiões diferentes) ⇒ seriais entre si; P2 é paralelo a P1.

## 9. Insumos ausentes

- Merge descartável `main + #1392 + #1146` não rodado (só as listas de arquivos foram comparadas): confirmar ausência de conflito textual
  em `FiscalDocumentLifecycleService.ts` antes do P3.
- Comportamento do `migrate deploy` com migração fora de ordem (#1146 `…130000` depois de `…150000` na `main`).
- Se `FiscalDocumentView` entra em algum snapshot de contrato (a busca por `poll`/`contingencia` em `__dto-shapes__.json` só achou
  comentários) — P0.3.
- CI de integração do #1392 não terminou (10 checks sem conclusão no momento da leitura; 6 verdes).

## 10. Achados fora de escopo (viram caixa, `--pai` = a lacuna de origem)

1. Corpo do #1392 desatualizado ("nenhuma migração") — P0.7. *(caixa)*
2. Migração do #1146 (`20261124130000`) ordena antes das duas já na `main` — ordem de histórico do Prisma. *(caixa, sobre o #1146)*
3. O `rearmarPoll` do #1392 sem evento de auditoria — está dentro do escopo (P1.4), **não** é lacuna.
