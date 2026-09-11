# Plano SDD multiagente sequencial — até fechar os três módulos (2026-09-07)

> **O que este doc é:** a sequência executável de **ciclos SDD** (spec-driven: spec → ratificação →
> implementação → review independente → integração → fold) que consome todos os nós do
> [GRAFO-DEPENDENCIAS-2026-09-07.md](GRAFO-DEPENDENCIAS-2026-09-07.md), intercalada com os gates humanos
> e os dados externos **no ponto em que passam a ser executáveis**. Ordem respeita as arestas do grafo,
> a preferência F-M6 (contábil → financeiro → fiscal) e a "ordem por sobrevivência" da cédula de 03/09,
> com uma exceção explícita: o prazo legal de **01/10/2026** (NFS-e) puxa a emissão via parceiro para
> antes do resto do fiscal.
>
> **O que não é:** autorização. Cada sessão continua exigindo o sinal citável do dono (ORCH-006) — a
> coluna "gatilho" de cada rodada diz **a frase** que abre a sessão. Este plano tampouco ratifica fork:
> toda rodada tem um checkpoint "dono ratifica" que o agente não pula.
>
> **Definição de "terminar tudo":** os 49 nós de código dos três módulos fechados (19 + 17 + 13),
> mais os 3 degraus do `PLANO-MODULO-COMPLETO-REPLICAVEL.md` (vertical 1 provado pelos 4 oráculos +
> deploy; prensa; 2º vertical gerando a própria ECD). Sem os gates humanos o número de código chega a
> 100% e o produto continua não provado — o plano marca onde cada um entra.

---

## 0. O ciclo padrão (igual em todas as rodadas de código)

| Passo | Agente / pessoa | Sessão | Saída | Regra que vale |
|---|---|---|---|---|
| S | **Planner** | `sessao-planejamento` (ou ADR quando a frente é nova) | BRIEF com checklist numerado, contratos Zod esboçados, forks **PENDENTES** | nunca escreve código; frente nova nasce de ADR + sinal humano |
| R | **Dono** | — (fora de sessão, `AskUserQuestion` por fork) | forks ratificados fork-a-fork | agente não decide fork; ≥D3 é `deny` em sessão autônoma |
| I | **Implementer** | `sessao-feature` (`luminaris-implementer`) | branch com contratos Zod antes da lógica, testes por comportamento, `tsc`×2 limpo | cadeia Route→Controller→Service→Repo→Prisma, DTO `.strict()`, snapshot de shape, i18n pt/en, allowlist de audit |
| V | **Reviewer** | `luminaris-reviewer` em **worktree própria** | PASS / FAIL com achados | independência: PASS da sequência que implementou é rejeitado |
| C | (se FAIL) **Instrumentador → Corretor** | `sessao-instrumentacao` → `sessao-correcao` | teste-guarda vermelho → fix mínimo | volta a V |
| M | **Integrator** | `sessao-integracao` / loop auto-merge | squash-merge em `main`, CI verde | rebaseie o filho antes de mergear o pai (squash quebra pilha); um rerun por instabilidade |
| F | **Planner** | docs | fold no master map (§5.1, §7, §7.1) + memória | claim de estado só depois de `git merge-base --is-ancestor` |

Paralelismo: só entre rodadas marcadas **∥**, e só pelo `_PARALLELIZATION-CONTRACT.md` (Fase 0 schema
serial → corpos em worktrees → Fase B registro serial; reserve faixas de ID antes de despachar).

Tamanho relativo (não é tempo): **P** = 1 BRIEF curto + ≤5 arquivos · **M** = BRIEF + feature com
migração ou tela nova · **G** = ADR + BRIEF + feature multi-camada.

---

## 1. Rodada 0 — sem agente de código (hoje)

Tudo aqui é do dono ou do copiloto de gate; nada bloqueia outra coisa além do que o grafo diz.

| # | Ação | Quem | Destrava |
|---|---|---|---|
| 0.1 | **Enviar o pedido ao contador** (D1) com o item P6 do H1 anexado (D8) | dono | R2, X6, X7, C8, H1 |
| 0.2 | ~~**Ratificar R1** — os 7 forks do `FE-INCR-NFE-brief.md`~~ **✅ feito 2026-09-07** (3 contra a recomendação: F-FENFE-1 → preview no BE, F-FENFE-2 → aba própria, F-FENFE-4 → memória local); os 5 forks do CNPJ-ALFA também (F-CNPJ-4 contra: rigor no parser) | dono | rodadas 1, 2a, 2b |
| 0.3 | **Decidir R4** — onde vive a credencial de emissão (BYOK por tenant × chave do Luminaris) | dono | rodada 6 (ADR X10) |
| 0.4 | **Instalar os validadores** (P4) — `luminaris-gates\` já tem os dois `.exe` | dono | H1 |
| 0.5 | **B-4** ensaio de restauração — `luminaris-gate-copilot` faz o preflight e entrega o runbook em branco | dono | H1 |
| 0.6 | **X2** import do referencial RFB — idem copiloto | dono | Compliance com dado real |
| 0.7 | **H2, parte OFX/CNAB** (a parte NF-e espera a rodada 2) | dono | Núcleo 3 8/9 → parcial |
| 0.8 | Obter **XML real** (D2) e conferir **MIT no e-CAC** (D4) | dono | E9; ADR X7 |

Gatilho de cada preflight: *"prepara o B-4"*, *"preflight do X2"*, *"me acompanha no H2"*.

---

## 2. Sequência de rodadas de código

| Rod. | Nó(s) | Tam. | Ciclo | Pré-requisito aberto | Gatilho (frase do dono) | Fecha |
|---|---|---|---|---|---|---|
| **1 ✅** | **X6b** `BE-INCR-CNPJ-ALFA` — **FECHADA 2026-09-08**: BRIEF #272 → forks ratificados 07/09 → feature + review PASS → **PR #280 `76c8defb`** → este fold | P | S ✅ R ✅ I ✅ V ✅ M ✅ F ✅ | — | — | X10 destravado do lado do CNPJ |
| **2a ✅** | **[EMENDA 2026-09-07, F-FENFE-1 → b]** `BE-INCR-NFE-PREVIEW` — **FECHADA 2026-09-08**: BRIEF #281 → forks F-PREV-1..4 ratificados 07/09 (F-PREV-3 → b) → feature + review PASS → **PR #283 `83c70088`** — — `POST /api/nfe/preview` (dry-run do `lib/nfe.ts`, resumo da nota: cabeçalho, emitente, itens com `indTot`), DTO, `docs.paths.ts`, snapshot, path-count | P/M | S → R → I → V → M → F | nenhum (R1 ratificado 07/09) | *"planeja o NFE-PREVIEW"* → *"implementa"* | contrato que a rodada 2b consome |
| **2b ✅** | **F1b/F1c** `FE-INCR-NFE` — **FECHADA 2026-09-08** (re-emenda "Checklist VIGENTE" V1–V18, feature + review FAIL→PASS, **PR #286 `af35bfc9`**) — **aba "NF-e" no painel contábil** (F-FENFE-2 → a) com seções Compra (preview + mapeamento com memória local, F-FENFE-4 → c) e Venda (seletor de vendas finalizadas, nunca `saleId` em texto livre), `nfe.service.ts` + `multipart.ts` | M | S (re-emenda curta após 2a) → I → V → M → F | rodada 2a | *"implementa o FE-INCR-NFE"* | Núcleo 3 → 8/9; libera **H2 parte NF-e** (dono) → 9/9 |
| **3** | **C7** `BE-INCR-RECONCILE-PENDING` — tabela de pendências do reconcile + re-varredura + tela | M (migração) | S → R → I → V → M → F | nenhum (F-W2F-3/5 → b) | *"planeja o RECONCILE-PENDING"* → *"implementa"* | contábil 14/19 |
| **4 ∥** | **C4/C5** `FE-INCR-AUDIT-PROVENANCE` (verify-chain + source-documents) **+ X3** `FE-INCR-COMPLIANCE-2` (botão ECF Real + import do catálogo) — dois BRIEFs, um lote FE | M | S×2 → R → I×2 (parallel-batch, write-sets disjuntos) → V → M → F | nenhum | *"planeja o lote FE de telas faltantes"* → *"implementa o lote"* | contábil 16/19; fiscal 6/13; 5 rotas sem tela → 1 (binding, diferida) |
| **5** | **F4** `FE-INCR-CASH-FORECAST` — caixa projetado read-only sobre vencimentos AP/AR (sem migração) | P/M | S → R → I → V → M → F | nenhum | *"planeja o CASH-FORECAST"* → *"implementa"* | financeiro 14/17 |
| **6 ⏳** | **X10** `ADR-INCR-DFE-EMISSAO-PARCEIRO` — **[2026-09-08] ADR Accepted (PR #289): parecer anexado, forks F-DFE-1..11 ratificados (4 contra a recomendação: NFS-e+NF-e 55 no mesmo BRIEF; polling+webhook; tomador obrigatório; Simples desde já); BRIEF `BE-INCR-DFE` espera manual da NFS-e nacional (primária, dono baixa — 403 a automação) + resposta do contador (itens novos)** — **só o ADR + BRIEF** agora (modelo do DF-e de saída NFS-e/NF-e com `cClassTrib` + IBS/CBS, porta `EmissorPort`, retorno como `SourceDocument`); a implementação espera D5 | G (ADR) | ADR → parecer `luminaris-accounting-architect` → R (parceiro, NFS-e primeiro, credencial=R4) → S | R4 (0.3); X6b (rod. 1) | *"escreve o ADR da emissão via parceiro"* | destrava rod. 12 assim que D5 chegar |
| **7** | **C10** `P2 clínica estética` — BRIEF pronto, 8/8 forks ratificados, ADR Accepted | G | I → V → M → F (+ `RUNBOOK-H3` em branco) | nenhum de código; **H3 espera H1** | *"implementa o P2"* | Degrau 2 em código; prova só com H3 |
| **8** | **F3** `ADR-INCR-PARTIAL-SETTLEMENT` — baixa parcial AP/AR (N recibos por título, aging e CAS por saldo) | G | ADR → parecer → R → S → I → V → M → F | nenhum | *"escreve o ADR da baixa parcial"* → … | financeiro 15/17 |
| **9** | **C6** `ADR-CONTADOR-DELIVERY` — e-mail de ECD/ECF ao contador (canal, LGPD, confirmação por envio; gancho legal PNCT) | M | ADR → R → S → I → V → M → F | nenhum | *"escreve o ADR do envio ao contador"* → … | contábil 17/19 |
| — | **H1** PVA em Presumido | dono | runbook | B-4, P4, **D8** | *"preflight do H1"* | oráculo do contábil; libera H3 |
| — | **H3** sign-off do P2 | dono | runbook | rod. 7 + H1 | *"me acompanha no H3"* | Degrau 2 provado |
| **10** | **X6** triagem da resposta do contador → emenda `ADR-INCR-NFE §D3` (flag de regime; `vICMS`) + `sessao-correcao` se a fórmula mudar | P/M | liaison → ADR → (instrumentação → correção) | **D1 respondido** | *"chegou a resposta do contador"* | custo D3 sob Lucro Real |
| **11** | **X4 + C9** ECF Fase 3 — blocos L/M/N, e-Lalur/e-Lacs, `HASH_ECF_ANTERIOR`, **retificação** | G | R2 (Forks 2/3/4) → S (emenda do BRIEF existente, +C9) → I → V → M → F | **D1 item 4 + D3 ✅** | *"ratifico os forks 2/3/4"* → *"implementa a ECF Fase 3"* | fiscal 8/13; libera **H1 2ª passada** (dono) |
| **12** | **X10 implementação** — adaptador HTTP do parceiro + montagem do DF-e + tela de emissão | G | S (feito na rod. 6) → I → V → M → F | **D5** (parceiro + certificado) | *"implementa a emissão via parceiro"* | fiscal 9/13; nasce **D7** (vigilância PNCT) |
| **13** | **C8** `ADR-INCR-FIXED-ASSETS` — imobilizado + depreciação (método, vida útil fiscal × contábil, baixa) | G | ADR → parecer → R → S → I → V → M → F | **D1 (tabela de taxas)** | *"escreve o ADR do imobilizado"* → … | contábil 18/19 |
| **14** | **X7** `ADR-INCR-TAX-ASSESSMENT` — IRPJ/CSLL trimestral (F-M8) + porta `EnvioMit` | G | ADR → R → S → I → V → M → F | **D1 item 1, D4** | *"escreve o ADR de apuração"* → … | fiscal 10/13 |
| **15** | **X9** `ADR-INCR-DCTFWEB` (funde com X7 se o adaptador for um só) | M | ADR → R → S → I → V → M → F | rod. 14 | *"escreve o ADR da DCTFWeb"* | fiscal 11/13 |
| **16** | **F5** `ADR-INCR-BANK-OUTBOUND` — conta bancária como entidade + remessa CNAB 240/boleto/Pix | G | ADR → R → S → I → V → M → F | **D6** (convênio do banco) | *"escreve o ADR da remessa"* | financeiro 17/17 |
| **17** | **X8** `ADR-INCR-EFD-CONTRIBUICOES` + PIS/COFINS — deliberadamente raso (vida útil ≈ 1 ano) | M | ADR → R → S → I → V → M → F | rod. 14 | *"escreve o ADR da EFD-Contribuições"* | fiscal 13/13 |
| **18** | **E9** troca dos fixtures sintéticos pela NF-e real anonimizada + reverter o `it.todo` | P | integração (runbook `BE-INCR-NFE-fixtures-README.md`) → V → M | **D2** | *"chegou o XML real"* | dívida F-I2 fechada; prova os dois parsers |
| — | **H1 2ª passada** em Lucro Real | dono | runbook | rod. 11 | *"preflight do H1 em Lucro Real"* | regime-alvo provado |
| — | **M2** host + 1º deploy | dono | runbook | "fim do app" (decisão) | *"sobe o ambiente do M2"* | Degrau 0 fechado |

**Nós que ficam fora por decisão (⚫):** LAC-B (UI da prensa), folha, LGPD/RBAC granular, IA/analytics,
inbox/outbox. Não entram em nenhuma rodada sem gatilho nomeado.

---

## 3. Contagem e forma

- **Rodadas de código:** 18. **ADRs novos:** 7 (X10, F3, C6, C8, X7, X9, X8; F5 = 8º). **BRIEFs novos:** 9.
- **Sessões de agente** (S+I+V+M+F por rodada, ADR quando há): ≈ **80**, mais os preflights de gate.
- **Checkpoints do dono:** 1 ratificação por rodada com S (≈ 15) + R1/R2/R4 + 7 gates humanos.
- **Cadeia crítica humana:** D1 → (D8 → H1 → H3) e D1 → (R2 → rod. 11 → H1 2ª → M2). Tudo que está
  nas rodadas 1–9 roda **sem** o contador; é o trabalho de agente disponível enquanto a resposta não vem.
- **Onde o plano quebra primeiro:** se o item 0 do pedido ("o contador assina?") voltar "não", F-Z0
  reabre e as rodadas 11, 13 e 9 (trilho contábil que ela autorizou) saem do plano — decisão do dono, não
  do agente.

## 4. O que eu não sei

1. Duração de cada rodada — o plano ordena, não estima; a única medida que existe é a das LAC
   (planejadas e mergeadas no mesmo dia, #259) e da NF-e (integração → review → correção → PASS no mesmo dia).
2. Se o dono quer as rodadas 4 e 5 antes da 3 (telas antes de migração) — troquei por F-M6, é reversível.
3. Se X9 se funde em X7 — depende de D4.

## 5. Estado das rodadas — fold 2026-09-07

> Cada linha é fato verificado por `git merge-base --is-ancestor <sha> origin/main` no momento deste
> fold (comandos no corpo do PR) — nunca por leitura de doc.
>
> **[FOLD 2026-09-11]** Rodada 9 fechada (#305 `7725f0ca`). Grafo vigente = [GRAFO-DEPENDENCIAS-2026-09-11.md](GRAFO-DEPENDENCIAS-2026-09-11.md);
> o de 07/09 (§0 deste plano) está supersedido — a raiz da cadeia crítica passou a ser a emissão (01/10), não o contador.
> Rodada 10 (X6) deixa de esperar D1 (resposta 5); rodada 13 (C8) idem (resposta 6); rodada 11 (X4) espera só R2 + corpus em `main` (D3b). Passo do ciclo §0: S/R/I/V/M/F (ADR
> substitui S quando a frente é nova).

| Rodada | Nó | Passo concluído | Falta | Próximo gatilho |
|---|---|---|---|---|
| **1** | X6b `BE-INCR-CNPJ-ALFA` | **S ✅ #272 · R ✅ 07/09 (F-CNPJ-1..5, dono via AskUserQuestion; F-CNPJ-4 → b) · I ✅ · V ✅ (review indep. PASS) · M ✅ #280 `76c8defb` · F ✅ #284** — ancestrais verificados | — | fechada |
| **2a** | `BE-INCR-NFE-PREVIEW` | **S ✅ #281 · R ✅ 07/09 (F-PREV-1..4; F-PREV-3 → b) · I ✅ · V ✅ PASS · M ✅ #283 `83c70088` · F ✅ (este fold)** | — | fechada |
| **2b** | `FE-INCR-NFE` | **S ✅ #270 + re-emenda 08/09 (no #286) · R ✅ 07/09 (F-FENFE-1..7) · I ✅ · V ✅ FAIL→PASS · M ✅ #286 `af35bfc9` · F ✅ (este fold)** | **H2 parte NF-e** (dono, cédula E8) | *"me acompanha no H2"* |
| **3** | C7 `BE-INCR-RECONCILE-PENDING` | **S ✅ #275 `1bbeb953` · R ✅ 07/09 (delegação, cédula #287 — F-W2F-3/5→b, Fork 1 já fechado pela própria cédula) · I ✅ · V ✅ (review indep. PASS) · M ✅ #296 `4ea2c4c9` · F ✅ (este fold)** | — | fechada |
| **4a** | C4/C5 `FE-INCR-AUDIT-PROVENANCE` | **S ✅ #277 `aafe8a5e` · R ✅ 07/09 (delegação, cédula #287 — F-FEAP-1..7) · I ✅ · V ✅ (review indep. PASS, 1 achado cosmético não-bloqueante) · M ✅ #293 `05a1b413` · F ✅ (este fold)** | — | fechada |
| **4b** | X3 `FE-INCR-COMPLIANCE-2` | **S ✅ #279 `5daa8763` · R ✅ 07/09 (delegação, cédula #287 — F-COMP2-1..7) · I ✅ · V ✅ (review indep. PASS; Fase B paridade i18n 939=939) · M ✅ #295 `2a4608ab` · F ✅ (este fold)** | — | fechada |
| **5** | F4 `FE-INCR-CASH-FORECAST` | **S ✅ #278 `77c77553` · R ✅ 07/09 (delegação, cédula #287 — F-CF1..F-CF7) · I ✅ · V ✅ (review indep. PASS com 1 achado ALTO não-bloqueante, classe pré-existente na família de reports) · M ✅ #298 `63ceba20` · F ✅ (este fold)** | — | fechada |
| **7** | C10 `P2 clínica estética` | **I ✅ V ✅ M ✅ F ✅** — **PR #282 MERGED, squash `60cced8d`** (verificado: `git merge-base --is-ancestor 60cced8d origin/main` exit 0). Review independente PASS (4 achados baixa severidade, não-bloqueantes). Comportamentos 1–7,9,10 feitos; 8 parcial (RUNBOOK-H3); 11 pausado (fork T0 × perímetro, ver `CEDULA-DECISAO-2026-09-07-forks-sdd.md`) | nenhum passo de código; H3 espera H1 | *"me acompanha no H3"* (após H1) |
| **8** | F3 `ADR-INCR-PARTIAL-SETTLEMENT` | **ADR Accepted ✅ por delegação 07/09 (cédula #287 — F-PS1..F-PS7) + parecer ✅ #276 `b7a62a73` · S ✅ #291 `f1307009` (BRIEF, 2026-09-08) — 19 comportamentos + contratos Zod esboçados; 3 forks NOVOS abertos pela sessão de planejamento (F-PS8/9/10; F-PS10 recalculado p/ (b) rota-irmã por achado do review — consumidores reais em `accountsPayable.service.ts`/`accountsReceivable.service.ts`)** | **R do dono** nos 3 forks novos → I → V → M → F | *"ratifico os forks novos do PARTIAL-SETTLEMENT"* |
| **9** | C6 `ADR-CONTADOR-DELIVERY` | **ADR Accepted ✅ por delegação 07/09 (cédula #287 — F-CD1..F-CD8) + parecer ✅ #274 `239945d1` · S ✅ #290 `62b00302` · R ✅ 10/09 (Forks A/B; A → (b) período no job pelo sinal F3; F-Z0 fechado pelo produto — [cédula 10/09](CEDULA-DECISAO-2026-09-10-entrevista.md)) · I ✅ · V ✅ (2 reviews indep. FAIL → ciclo → delta PASS) · M ✅ #305 `7725f0ca` (squash, 2026-09-11) · F ✅ (fold 11/09)** — ancestral verificado | — | fechada |

**Rodadas 1 e 2 (a e b):** conduzidas por outra sessão em paralelo a este fold (PRs #272, #280, #281,
#270) — a tabela acima registra só o que `git merge-base --is-ancestor` provou neste worktree no momento
do fold; não afirma R/V/M/F de nenhuma delas além disso, e uma nova leitura pode encontrá-las mais
adiante. **Rodada 6** (`ADR-INCR-DFE-EMISSAO-PARCEIRO`) e as rodadas 10+ não entraram neste fold — sem
artefato para verificar ainda.

### Forks novos pendentes do dono (pós-execução) — fold 2026-09-08

Achados das sessões de correção/planejamento das rodadas 3/4/5/8/9, todos por citação de PR — nenhum
decidido por agente:

- **Rodada 3 (`BE-INCR-RECONCILE-PENDING`, #296):** 2 "blocked" sem `reasonCode` no enum ratificado
  (`FAILED|ACCOUNTING_PERIOD_NOT_OPEN|MAX_CENTS_EXCEEDED`) — ordering-gate de settlements
  (`accountingSyncReconcile.job.ts:863`) e `blocked_missing_paid_with_package_id` (~linha 1228) não
  entram na tabela de pendências. Recomendação do implementador: **(a)** enum ganha os 2 códigos novos.
- **Rodada 8 (`ADR-INCR-PARTIAL-SETTLEMENT`, #291):** 3 forks novos abertos pelo BRIEF —
  **F-PS8** manter `PAYING`/`RECEIVING` como estado transitório, recomendação **(a)**; **F-PS9**
  renomear os eventos de auditoria (`payment_registered`→`settlement_registered` etc.), recomendação
  **(a)**; **F-PS10** rota `/:id/pay`→`/:id/settlements`, recomendação **recalculada pelo review para
  (b) rota-irmã** — a checagem original ("zero consumidor de frontend") mirava um caminho inexistente
  (`my-app/src`); a árvore real tem consumidores em produção (`accountsPayable.service.ts:185,209`,
  `accountsReceivable.service.ts:172,196`, usados por `AccountsPayablePanel.tsx`/
  `AccountsReceivablePanel.tsx`) — renomear sem a rota-irmã quebraria pagamento/recebimento integral.
- **Rodada 9 (`ADR-CONTADOR-DELIVERY`, #290):** 2 forks novos abertos pelo BRIEF — **Fork Novo A**
  como o comando de entrega sabe qual `year` cobre (`AccountingDataExchangeJob` não persiste
  ano/período), recomendação **(a)** `year` explícito no DTO de entrada; **Fork Novo B** se/como o
  gate defensivo F-CD8-b lê o signatário J930 do `.txt` (não existe parser SPED de leitura no repo, só
  serializers), recomendação **(c)** não implementar F-CD8-b neste incremento.
- **Rodada 7 P2 (já foldada, #292):** fork **T0** (perímetro do comportamento 11, zero-diff) segue
  aberto — não é desta faixa, registrado aqui só para não se perder entre os 4 grupos.

### Dívidas de gate

- **Smoke S6/S7 (`npm run smoke:migration`)** — falha PRÉ-EXISTENTE em `origin/main` (S6 "postings"
  muda no rebuild, S7 índice de counterparties desaparece), reproduzida de forma isolada nas rodadas 3
  e 5 (removendo a migração/o código da rodada o mesmo erro persiste). Não é regressão desta faixa;
  segue como dívida do gate, dono ainda não identificado.
- **Flake `NfePanel.test.tsx`** ("import: payload exato…") — falhou no run de push do sha `712c7032` e
  passou no run de `pull_request` do mesmo sha e no rerun. Registrado como flake de timing a
  instrumentar; dono do teste = PR #286.
