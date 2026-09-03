# Cédula de decisão — 2026-09-03 (Núcleo 3 — Integração → 95%)

> **O que este doc é:** o registro das **8 decisões ratificadas pelo dono em 2026-09-03** (sessão,
> `AskUserQuestion`, duas rodadas) sobre o que "95% de integração" significa e como chegar lá, mais a
> **re-medição** do Núcleo 3 com o denominador que o dono escolheu. Todo claim de sustentação foi
> **verificado contra `origin/main` (`2c2fda6a`), refs remotos e a tag `nfe-fase-b-preserved`**, não
> lido dos docs — a reverificação pedida pelo dono está na seção D.
>
> **O que não é:** execução. Nenhuma sessão de agente foi aberta por este doc; a seção E é a fila
> resultante, e cada item dela cita a decisão que o autoriza (ORCH-006).

---

## A. Pergunta de partida e a objeção que a reformulou

Pedido: *"Liste todas as tasks para chegarmos em 95% de integração."*

Objeções levantadas antes de decidir (todas verificadas, seção D):

1. O **~40%** do Núcleo 3 na régua §7 do master map está **congelado desde 2026-07-12** (`5ed3b01a`) e o
   denominador citado ("§32 do grafo aspiracional") **não existe em nenhum arquivo do repo**. Sem
   denominador, "o que falta para 95%" não era calculável.
2. A **fila vigente** (`PROXIMOS-PASSOS-2026-09-02` §1) **não sequencia a NF-e** — só manda não apagar as
   tags. Tratar a NF-e como "próximo código" reordenava a fila do dono sem autorização.
3. A coluna "Falta" do Núcleo 3 lista só **inbox/outbox/DLQ**, não-objetivo por decisão travada **T11**.
   Mantido no denominador, 95% é inalcançável por definição.

---

## B. As 8 decisões — ✅ RATIFICADAS 2026-09-03 (dono, `AskUserQuestion`)

| # | Fork | Decisão | Contra a recomendação? |
|---|---|---|---|
| **F-I1** | Denominador do "95%" | **Re-medir** com a documentação atualizada: **master map §5 + §5.1** | — (o dono escolheu a fonte na 2ª rodada) |
| **F-I2** | Gate do XML real (segurava a NF-e desde 2026-07-22) | **Mergear com fixture sintético e dívida declarada** | **SIM** — recomendação era trazer o XML. Risco nomeado e aceito: teste verde prova o entendimento do leiaute, não o leiaute (lição I052 / `sintetico-nao-cobre-formato-de-dado-real`) |
| **F-I3** | Posição da NF-e na fila do 09-02 | **Em paralelo aos gates humanos** (nenhum gate 1–4 depende dela) | não |
| **F-I4** | UI de NF-e (nunca teve BRIEF nem código) | **Backend + UI no mesmo ciclo** → abre `FE-INCR-NFE` | **SIM** — recomendação era dívida planejada |
| **F-I5** | Fonte da re-medição | **Master map §5 (domínios) + §5.1 (fila)** | — |
| **F-I6** | Início da reconstrução | **Agora**, sem esperar XML nem H1 | não |
| **F-I7** | F-D1 de 2026-08-28 ("apagar e refazer") | **REABERTO → rebasear `nfe-fase-b-preserved`.** A premissa do F-D1(a) — "o merge seguiria travado pelo XML de qualquer jeito" — caiu com o F-I2 | não (a sessão de 08-28 já recomendava (b)) |
| **F-I8** | Forma da dívida no código | **`nfe-fixture-provenance.test.ts` vira `it.todo`** + item no Bloco A "trocar fixture por XML real" + emenda no ADR-INCR-NFE | não |

**Consequências que as decisões carregam (não são forks novos):**

- F-I2 + F-I6: a NF-e deixa de ser "fila travada em dado externo" (§3 do master map) e vira **código
  executável hoje**. O XML real passa a ser **item de fila do Bloco A**, não gate.
- F-I7 anula a sequência §3.2 do `BE-INCR-NFE-destino-brief.md` (refazer da spec). A `fase-b-spec.md`
  continua valendo como **spec de aceitação** do que a branch rebaseada tem de provar.
- F-I2 não fecha o **custo D3 com `vICMS` não subtraído** (`destino-brief §7.2`): continua **dívida de
  contador**, agora dentro de `main` em vez de fora.

---

## C. Re-medição do Núcleo 3 — denominador §5 + §5.1 (F-I1/F-I5)

**Regra de contagem (aplicada primeiro a esta cédula):** entra no denominador toda linha do §5 e da
fila §5.1 cujo objeto é **atravessar a fronteira do módulo** — ingestão externa, seam entre módulos,
proveniência. Não entra: o que o master map classifica noutro núcleo (referencial RFB = Núcleo 5;
prensa de binding = plataforma P1, "não move nenhuma das % dos 5 núcleos", §7) e o que é
**não-objetivo por decisão travada** (inbox/outbox, T11) — um não-objetivo não é lacuna.

| # | Item | Fonte | Estado (verificado) |
|---|---|---|---|
| 1 | SourceDocument + JournalEntrySource (proveniência formal) | §5 | ✅ PR #43 |
| 2 | OFX (ingestão bancária) | §5 | ✅ PR #59 |
| 3 | CNAB 240 (ingestão bancária) | §5 | ✅ PR #61 |
| 4 | Seam CRM → Contas a Receber | §5 | ✅ 2026-07-20 |
| 5 | Pontes de sync venda→razão + alimentador do binding (BE-INCR-BINDING-FEEDER) | §5.1 A item 0 | ✅ PR #213 |
| 6 | Seam `attachSourceDocument` (NFE-X) | §5.1 A NFE-X | ✅ PR #228 — `PostingService.ts:733` + rota `POST /journal-entries/:entryId/source-documents` |
| 7 | **NF-e — backend** (parser + compra + venda + wiring) | §5 / §5.1 B item 11 | ⛔ **fora de `main`** — tag `nfe-fase-b-preserved` (34 arquivos, +3.143/−42) |
| 8 | **NF-e — UI de upload** (FE-INCR-NFE, criado pelo F-I4) | novo | ⛔ sem BRIEF, sem código (`my-app/src` não cita nfe) |
| 9 | Sign-off humano: upload OFX/CNAB **por clique** | §5.1 A item 4(b) | ⏳ gate humano (H2) |
| — | Inbox/outbox/DLQ | §5 / §5.1 B item 16 | ⚫ fora do denominador (T11) |

**Medida hoje: 6 de 9 = ~67%** (o ~40% da régua estava desatualizado desde julho — itens 4, 5 e 6
entraram depois dele).

**O que "95%" significa com este denominador:** 8/9 = 89%, 9/9 = 100%. Não existe combinação que dê
exatamente 95% — **na prática, 95% ≡ fechar os 3 abertos (7, 8, 9)**. Se o dono preferir incluir
inbox/outbox: 6/10 hoje, teto 9/10 = 90% enquanto T11 valer — a objeção 3 da seção A, em número.

---

## D. Reverificação — o que foi conferido contra git, não contra docs

| Claim | Como foi conferido | Resultado |
|---|---|---|
| Nenhum código NF-e em `main` | `git ls-tree -r origin/main \| grep -i nfe` | só `docs/` + ADR; nada em `server/`, `my-app/` |
| Branches `claude/nfe-*` apagadas | `git fetch --prune` + `git ls-remote --heads origin \| grep nfe` | vazio |
| Tags preservadas em `origin` | `git ls-remote --tags origin` | `nfe-fase-a-preserved`→`68df00f4`, `nfe-fase-b-preserved`→`5b6243a6` |
| `attachSourceDocument` em `main` | `git grep` em `origin/main` | `PostingService.ts:733`, controller e 2 rotas em `routes/accounting.ts:115-116` |
| `fast-xml-parser` ausente | `git show origin/main:server/package.json` | ausente — dependência nova continua |
| Trava de proveniência funciona | `gh api .../branches/main/protection` | `Server – typecheck & test` é check obrigatório |
| Tamanho da fase-b | `git diff --shortstat c1b4db84 nfe-fase-b-preserved` | 34 arquivos, +3.143 −42 (bate com o brief) |
| Distância de `main` | `git rev-list --count nfe-fase-b-preserved..origin/main` | **74** commits (eram 27 em 08-28); **14** arquivos em colisão (eram 6) |
| Literais `salon.*` na branch | `git diff … \| grep '^+' \| grep -c 'salon\.'` | **7** (bate com a remedição de 08-28) |
| Drift de BigInt | `schema.prisma` em `main`: `Payable.amountCents BigInt`; `IPayableRepository` segue `number` | drift fica em `PayableDto` (`MAX_CENTS`) e camada Prisma, não na interface do repo |
| Requisito de timestamp da migração | `ls server/prisma/migrations` em `main` | última é `20260831032258`; o "> 20260825120000" do F-D3 é trivial — a restrição útil é **> 20260831032258** |
| "95%" definido noutro doc | grep de `integra…%` em `docs/` | nenhum; o "95%" do `BE-INCR5-VALIDATION-STATUS` é cobertura de caso de uso, não integração |

---

## E. Fila resultante — cada item cita a decisão que o autoriza

| # | Item | Sessão / dono | Autorização | Depende de |
|---|---|---|---|---|
| E1 | Emenda **§10 do ADR-INCR-NFE** (F-I2, F-I7, F-I8) + este registro | docs (feito nesta sessão) | F-I2/F-I7/F-I8 | — |
| E2 | **`sessao-integracao`: rebasear `nfe-fase-b-preserved` sobre `main`** em branch nova. Regras pré-decididas de conflito: (a) 7 literais `salon.*`→`sale.*`; (b) **remover** o `attachSourceDocument` da branch (já existe em `main`, #228) e apontar `NfeSaleReconciliationService` para o de `main`; (c) renomear a migração para timestamp **> `20260831032258`**; (d) `PayableDto` sobre o de `main` (BigInt/`MAX_CENTS`); (e) `openapi.json` e `__dto-shapes__.json` **regenerados**, nunca à mão; (f) `nfe-fixture-provenance.test.ts` → `it.todo` (F-I8); **(g) [triagem 2026-09-03, T3]** o parser continua ignorando os grupos `IBSCBS`/`IS`/`vNFTot` (NT 2025.002), mas **loga aviso** quando encontrá-los e a dívida "campo `ibsCbs?` antes de 2027" entra no comentário do `ParsedNfe`; **(h) [T4→T10, reescrita na 2ª rodada]** `nfe.test.ts` ganha asserção de coerência `chNFe.slice(6,20) == emit/CNPJ` + `cDV` módulo 11 usando o validador **alfanumérico** de `lib/cnpj.ts` (valor = ASCII − 48; a chave é `[0-9]{6}[A-Z0-9]{12}[0-9]{26}` desde a NT 2026.004) — **com um caso de teste de CNPJ alfanumérico sintético**, senão o teste passa com a rotina antiga e reprova o 1º fornecedor novo; o fixture atual tem de passar (se não passar, corrigir o fixture, não a asserção); **(i) [T3]** persistir o XML íntegro como `DocumentAttachment` do lançamento postado (compra: o do `Payable`; venda: o já postado) e gravar `SourceDocument.attachmentId` — zero migração, os dois modelos já existem em `main`; **(j) [T1a]** o resultado de D3 sai com **dois campos**, `custoEstoqueCents` e `baseCreditoPisCofinsCents`; ICMS-ST entra no primeiro e não no segundo (STJ Tema 1231); preenchimento da base = custo − `vST` até o T1b (contador + advogado) decidir o ICMS próprio. **Pré-requisito do merge:** BRIEF `BE-INCR-CNPJ-ALFA` (T10) — `lib/cnpj.ts` + troca dos 4 regex `\d{14}` em `SpedEcdDto`/`SpedEcfDto` | `sessao-integracao` | F-I6 + F-I7 | E1, T10 |
| E3 | **`sessao-planejamento`: BRIEF `FE-INCR-NFE`** (upload multipart de compra/venda no painel contábil; reuso do upload OFX/CNAB existente é a 1ª pergunta do critério de reuso) | `sessao-planejamento` | F-I4 | — (paralelo a E2) |
| E4 | Review independente de E2 (agente separado, worktree própria) + `tsc`×2 + jest accounting + smoke-migration-gate sobre cópia do `dev.db` real (molde `SMOKE-MIGRATION-GATE-INCR-NFE.md`) | revisor | contrato | E2 |
| E5 | Merge do BE + fold ⏳→✅ no master map (§3, §5.1 item 11, §7 Núcleo 3 → 7/9) | integração | F-I3 | E4 |
| E6 | `sessao-feature` do `FE-INCR-NFE` (forks do BRIEF ratificados antes) | `sessao-feature` | F-I4 + ratificação dos forks do BRIEF | E3, E5 |
| E7 | Review + merge do FE + fold (§7 Núcleo 3 → 8/9) | revisor / integração | contrato | E6 |
| E8 | **Gate humano H2**: upload OFX/CNAB e NF-e **por clique** (item 4(b) do Bloco A) → 9/9 | dono | runbook H2 | E7 |
| E9 | **Bloco A, item novo:** trocar `*.SYNTHETIC.xml` por NF-e 4.00 real anonimizada (runbook `BE-INCR-NFE-fixtures-README.md`) e reverter o `it.todo` | dono (dado externo) | F-I2 (dívida) | — |
| E10 | **Contador:** custo D3 — `vICMS` subtrai ou não do custo de aquisição (`destino-brief §7.2`) | dono via `luminaris-contador-liaison` | ADR-INCR-NFE D3 | — |

**O que este doc NÃO autoriza:** apagar as tags; tocar `DynamicTableService`; abrir a ECF Fase 3
(Forks 2/3/4 seguem esperando o Manual); qualquer aparato de auditoria novo (regra permanente).

---

## F. Risco principal e vieses (T8)

- **Risco principal:** F-I2. O parser vai para `main` provado só contra XML sintético construído da
  transcrição do MOC 7.0. O primeiro XML real de um cliente pode desmentir o leiaute (namespaces,
  `infNFe` com `versao` diferente, `det` sem `nItem` sequencial). A dívida está declarada em 3 lugares
  (ADR §10, `it.todo`, Bloco A E9) — mas declarar não é provar.
- **Viés desta sessão:** a recomendação de reabrir o F-D1 (F-I7) favorece **menos código novo** (ponytail).
  O custo escondido é rebasear sobre 74 commits com 14 colisões — a sessão de integração pode descobrir
  que o `PayableService` de `main` divergiu mais do que os 14 nomes sugerem. Se o rebase passar de 1
  sessão, o F-D1(a) volta a ser mais barato e deve ser reaberto de novo, com o número medido.
- **Viés na contagem:** itens do denominador têm peso 1 cada; a NF-e backend é ~3.000 linhas e o
  seam NFE-X ~100. A régua mede **nós fechados**, não esforço — é a mesma régua do §7, só com o
  denominador explícito.
