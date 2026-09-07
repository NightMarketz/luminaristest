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
| **1** | **X6b** `BE-INCR-CNPJ-ALFA` — `lib/cnpj.ts` alfanumérico + 4 regex `\d{14}` em `SpedEcdDto`/`SpedEcfDto` | P | S → R → I → V → M → F | nenhum (dívida da cédula E2) | *"planeja o CNPJ-ALFA"* → *"implementa o BE-INCR-CNPJ-ALFA"* | pré-requisito de X10 e do 1º fornecedor alfanumérico |
| **2a** | **[EMENDA 2026-09-07, F-FENFE-1 → b]** `BE-INCR-NFE-PREVIEW` — `POST /api/nfe/preview` (dry-run do `lib/nfe.ts`, resumo da nota: cabeçalho, emitente, itens com `indTot`), DTO, `docs.paths.ts`, snapshot, path-count | P/M | S → R → I → V → M → F | nenhum (R1 ratificado 07/09) | *"planeja o NFE-PREVIEW"* → *"implementa"* | contrato que a rodada 2b consome |
| **2b** | **F1b/F1c** `FE-INCR-NFE` — **aba "NF-e" no painel contábil** (F-FENFE-2 → a) com seções Compra (preview + mapeamento com memória local, F-FENFE-4 → c) e Venda (seletor de vendas finalizadas, nunca `saleId` em texto livre), `nfe.service.ts` + `multipart.ts` | M | S (re-emenda curta após 2a) → I → V → M → F | rodada 2a | *"implementa o FE-INCR-NFE"* | Núcleo 3 → 8/9; libera **H2 parte NF-e** (dono) → 9/9 |
| **3** | **C7** `BE-INCR-RECONCILE-PENDING` — tabela de pendências do reconcile + re-varredura + tela | M (migração) | S → R → I → V → M → F | nenhum (F-W2F-3/5 → b) | *"planeja o RECONCILE-PENDING"* → *"implementa"* | contábil 14/19 |
| **4 ∥** | **C4/C5** `FE-INCR-AUDIT-PROVENANCE` (verify-chain + source-documents) **+ X3** `FE-INCR-COMPLIANCE-2` (botão ECF Real + import do catálogo) — dois BRIEFs, um lote FE | M | S×2 → R → I×2 (parallel-batch, write-sets disjuntos) → V → M → F | nenhum | *"planeja o lote FE de telas faltantes"* → *"implementa o lote"* | contábil 16/19; fiscal 6/13; 5 rotas sem tela → 1 (binding, diferida) |
| **5** | **F4** `FE-INCR-CASH-FORECAST` — caixa projetado read-only sobre vencimentos AP/AR (sem migração) | P/M | S → R → I → V → M → F | nenhum | *"planeja o CASH-FORECAST"* → *"implementa"* | financeiro 14/17 |
| **6** | **X10** `ADR-INCR-DFE-EMISSAO-PARCEIRO` — **só o ADR + BRIEF** agora (modelo do DF-e de saída NFS-e/NF-e com `cClassTrib` + IBS/CBS, porta `EmissorPort`, retorno como `SourceDocument`); a implementação espera D5 | G (ADR) | ADR → parecer `luminaris-accounting-architect` → R (parceiro, NFS-e primeiro, credencial=R4) → S | R4 (0.3); X6b (rod. 1) | *"escreve o ADR da emissão via parceiro"* | destrava rod. 12 assim que D5 chegar |
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
