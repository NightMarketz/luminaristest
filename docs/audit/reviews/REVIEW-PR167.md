# Revisão independente — PR #167

- **Revisor:** agente revisor isolado (claude-opus-5), sessão distinta da que implementou o #167.
- **Data:** 2026-08-07.
- **Objeto:** PR #167, mergeado em `40892baa` (branch `claude/audit-triagem-items-5-6-7`).
- **Worktree de medição:** `C:/Users/smurf/Downloads/Luminaris/.claude/worktrees/rv-167`, detached em `18b14b12` (contém o #167 mergeado).
- **Higiene:** todas as mutações aplicadas por protocolo `.bak` (cópia → mutar → `git diff --numstat` → rodar → restaurar da cópia → `numstat` vazio → `rm .bak`). Nenhum `git checkout --`, nenhum commit, nenhum conserto. **`git status --porcelain` em `rv-167` está VAZIO ao fim** (conferido; zero `*.bak` remanescentes fora de `node_modules`/`.git`).

---

## 2. Veredito

**`revisado_com_ressalva` — as duas barreiras MORDEM de verdade (12 de 12 mutações minhas nos 8 DTOs morreram, e as 7 regras do gate reprovam o que dizem reprovar), mas a frase que justifica o RECORTE dos 9 DTOs fora de escopo é factualmente FALSA e o gate não confere NADA fora do próprio arquivo.**

**O risco principal é este:** o gate satisfaz-se com forma pura — `commit` é só regex de hexa (um sha inexistente passa), `pr` nunca é confrontado com um PR real, `artifact` só precisa que `existsSync` diga `true` (um **diretório**, um arquivo de **0 byte**, ou o **próprio razão** são aceitos como artefato de revisão) e a barreira §9.4 é **igualdade de string**, derrotada por uma letra maiúscula. Um `revisado_pass` completamente fabricado passa verde hoje; a única coisa que o gate realmente impede é o **silêncio**.

Eu reprovaria a frase "os 9 DTOs restantes só declaram `.strict()` e/ou enum" (§6, alegação caída nº 1) — mas **não corrigi nada**, conforme a instrução, e por isso o veredito é `revisado_com_ressalva` e não `revisado_reprovado_e_corrigido`.

---

## 3. O que reexecutei

### 3.1 Linha de base (antes de qualquer mutação)

```
$ cd server && OPENAI_API_KEY=ci-dummy-openai-key npx jest --selectProjects unit \
    --cacheDirectory ".../jestcache-167" src/features/accounting/dtos/__tests__
Test Suites: 12 passed, 12 total
Tests:       110 passed, 110 total
```

```
$ node scripts/review-ledger-check.mjs            → EXIT=0
$ node scripts/review-ledger-check.mjs --pr 167   → EXIT=0
OK: 5 PR(s) com veredito declarado em docs/audit/REVIEW-LEDGER.jsonl.
Distribuição: sem_revisao_independente=5
Cobertura: 5 declarado(s) / 225 merge(s) na história.
```

```
$ node scripts/bancada-gate.mjs                   → EXIT=0 (29 itens, 15 blocos, 22 avisos)
```

Nota de discrepância benigna: o texto do PR registra **218** merges; hoje são **225**. A história andou 7 merges desde o merge do #167 — não é defeito, é o número sendo recalculado pelo gate como prometido.

### 3.2 Suíte INTEIRA sob uma mutação minha (o "antes" medido, não citado)

Com `cashFlowReport.dto.ts:31` perdendo o `refine(isValidDateOnly)` (`numstat 1/1`), rodei os **133** projetos `unit`:

```
FAIL unit src/features/accounting/dtos/__tests__/cashFlowReport.dto.test.ts
Test Suites: 1 failed, 132 passed, 133 total
Tests:       2 failed, 1588 passed, 1590 total
```

Um único arquivo pega — o novo. Isto **confirma** o miolo do achado (nenhum teste pré-existente cobria a fronteira de DTO) e confirma que a barreira é a única linha de defesa. Nenhuma rodada minha caiu na armadilha 1 (`Tests: 0 failed`): toda morte trouxe `Tests: N failed` com N ≥ 1.

### 3.3 Controle do harness

Quatro mutações de **1 linha semanticamente neutras** (só o texto da mensagem de erro), no mesmo protocolo `.bak`, `numstat 1/1` cada:

| Controle | Arquivo:linha | numstat | Resultado |
|---|---|---|---|
| C1 | `aging.dto.ts:35` (mensagem) | 1/1 | **exit=0 · 12 passed / 110 passed** |
| C2 | `cashFlowReport.dto.ts:31` (mensagem) | 1/1 | **exit=0 · 12 passed / 110 passed** |
| C3 | `InventoryDto.ts:22` (mensagem) | 1/1 | **exit=0 · 12 passed / 110 passed** |
| C4 | `dailyJournal.dto.ts:31` (mensagem) | 1/1 | **exit=0 · 12 passed / 110 passed** |

Sem isto, "tudo vermelho" seria indistinguível de harness quebrado. Nenhum dos 8 testes novos amarra-se ao texto da mensagem.

---

## 4. Minhas próprias mutações

### (i) Contra os 8 DTOs — uma mutação de 1 linha **no DTO**, nunca no teste

Todas com `numstat 1/1`, restauradas de `.bak`, `numstat` vazio depois. "Discriminante" = na rodada do diretório `dtos/__tests__` (12 suítes) **exatamente uma** suíte reprova, e é a do DTO mutado.

| # | DTO:linha | Mutação (o que afrouxa) | numstat | Morreu? | Suíte que pegou |
|---|---|---|---|---|---|
| R1 | `DataExchangeDto.ts:34` | `(BALANCE_SHEET \|\| INCOME_STATEMENT) && !asOf` → só `BALANCE_SHEET` (DRE deixa de exigir `asOf`) | 1/1 | **SIM** · 1 failed / 109 passed | `DataExchangeDto.test.ts` |
| R2 | `EntryApprovalDto.ts:40` | `lines.min(2)` → `min(2 - 1)` (partida dobrada aceita 1 perna) | 1/1 | **SIM** · 1 failed | `EntryApprovalDto.test.ts` |
| R3 | `InventoryDto.ts:24` | `qty = z.number().int().positive()` → `.int()` (0 e negativo passam) | 1/1 | **SIM** · 1 failed | `InventoryDto.test.ts` |
| R4 | `SpedEcdDto.ts:100` | J930 `respLegal.length !== 1` → `< 1` (dois responsáveis legais passam) | 1/1 | **SIM** · 1 failed | `SpedEcdDto.test.ts` |
| R5 | `aging.dto.ts:38` | `.strict()` removido (chave desconhecida aceita-e-ignorada) | 1/1 | **SIM** · 1 failed | `aging.dto.test.ts` |
| R6 | `cashFlowReport.dto.ts:31` | `asOf` perde `refine(isValidDateOnly)` (`2026-02-30` passa) | 1/1 | **SIM** · 2 failed | `cashFlowReport.dto.test.ts` |
| R7 | `dailyJournal.dto.ts:27` | `if (from > to)` → `if (from > to && from === to)` (condição impossível: ordenação nunca dispara) | 1/1 | **SIM** · 1 failed | `dailyJournal.dto.test.ts` |
| R8 | `periodComparison.dto.ts:22` | `refine(isValidDateOnly)` → `refine(() => true)` (no-op) | 1/1 | **SIM** · 3 failed | `periodComparison.dto.test.ts` |
| R9 | `periodComparison.dto.ts:41` | `.strict()` removido | 1/1 | **SIM** · 1 failed | `periodComparison.dto.test.ts` |
| R10 | `EntryApprovalDto.ts:18` | `expectedVersion.min(1)` → `min(0)` (openapi declara `minimum: 1`) | 1/1 | **SIM** · 1 failed | `EntryApprovalDto.test.ts` |
| R11 | `DataExchangeDto.ts:12` | `dateOnly` perde o `refine` de calendário | 1/1 | **SIM** · 1 failed | `DataExchangeDto.test.ts` |
| R12 | `SpedEcdDto.ts:23` | `cnpj` perde o regex `^\d{14}$` | 1/1 | **SIM** · 1 failed | `SpedEcdDto.test.ts` |

**12 de 12 mortas, todas discriminantes. Os 8 de 8 arquivos mordem** — nenhum é teste de caminho feliz. Nenhuma das minhas mutações repete as duas do autor (M2 = teto `MAX_CENTS` do `InventoryDto`; M7 = `refine` do `aging.dto`); ataquei deliberadamente os **outros 6 arquivos** e as invariantes **cross-field** (`superRefine`) que o autor não tocou, que eram o lugar mais provável de um teste só-caminho-feliz. Não havia.

Higiene por arquivo: os 8 novos não têm `.skip`, `.todo` nem `.only`; somam 75 `it(...)` (12+11+12+14+8+6+6+6), coerentes com 110 − 35 dos 4 pré-existentes.

### (ii) Contra `scripts/review-ledger-check.mjs`

Mutei o **razão** (a entrada que o gate guarda), protocolo `.bak` sobre o arquivo real, `--pr` explícito, restauração byte-a-byte ao fim (`git status --porcelain` vazio, verificado pelo próprio driver).

**Vermelhos — regras que reprovam (mordida confirmada):**

| # | Regra | Variante minha | exit | Mensagem |
|---|---|---|---|---|
| GR1 | RL2 | duas linhas com `pr:9001` | 1 | `PR 9001 já declarado na linha 25 — registro ambíguo` |
| GR2 | RL4 | `revisado_pass` com `reviewer === implementer` ("alice") | 1 | `AV-00 §9.4 rejeita PASS emitido pela mesma sequência` |
| GR3 | RL4 | `artifact: docs/audit/reviews/NAO-EXISTE.md` | 1 | `não existe no disco — caminho declarado não é caminho verificável` |
| GR4 | RL6 | `--pr 4242` sem entrada | 1 | `PR 4242 não tem entrada … Acrescente UMA linha antes do merge` |
| GR5 | RL3 | `verdict: "aprovado"` | 1 | `"verdict" fora da lista fechada` |
| GR6 | RL1 | `commit: "zzzzzzz"` | 1 | `"commit" deve ser um sha (7-40 hex)` |
| GR7 | RL5 | `sem_revisao_independente` + `reviewer` | 1 | `não pode trazer reviewer/artifact` |
| GR8 | RL1 | linha `{isto nao e json}` | 1 | `JSON inválido — o razão é JSONL` |
| GR9 | RL0 | razão REMOVIDO do disco | 1 | `docs/audit/REVIEW-LEDGER.jsonl ausente` |
| GG11 | RL4 | **controle pareado de GG6** — `"alice"` × `" alice "` (só espaços) | 1 | trim funciona: `reviewer === implementer (" alice ")` |
| GG13 | RL5 | **controle pareado de GG12** — `note: "   "` | 1 | `exige "note" — declaração de ausência tem de dizer por quê` |

**Verdes — o que o gate ACEITA (a medição de (a)):**

| # | Variante minha | exit | O que prova |
|---|---|---|---|
| GG0 | **CONTROLE** — razão real intacto, `--pr 167` | **0** | harness sadio; sem isto os 11 vermelhos acima não valeriam nada |
| GG1 | `{"pr":9001,"commit":"0000000","implementer":"x","verdict":"sem_revisao_independente","note":"x"}` | **0** | `implementer` de **1 caractere** e `note` de **1 caractere** bastam |
| GG12 | `note: "nao"` | **0** | a "declaração de por quê" pode ser uma palavra |
| GG2 | `revisado_pass`, `artifact: "docs"` (**um DIRETÓRIO**) | **0** | `existsSync` não distingue arquivo de pasta |
| GG3 | `revisado_pass`, `artifact` = arquivo de **0 byte** fora do repo | **0** | conteúdo do artefato **nunca** é lido |
| GG10 | `revisado_pass`, `artifact` = **o próprio razão** | **0** | auto-referência circular aceita como "artefato de revisão" |
| GG4 | `pr: 999999` (PR que nunca existiu) + `commit: "deadbee"` (sha ausente do repo) | **0** | **nem o PR nem o commit são confrontados com o mundo** |
| GG14 | `pr: 9001` declarado com o `commit` do PR **#170** | **0** | `pr` × `commit` não são correlacionados |
| GG5 | `implementer: "claude-opus-5"` × `reviewer: "Claude-Opus-5"` | **0** | **§9.4 derrotada por UMA letra maiúscula** |
| GG6 | `implementer: "alice"` × `reviewer: "alice."` | **0** | §9.4 é igualdade de string, não identidade de ator |
| GG8 | `revisado_pass` **sem** `note`, com chaves desconhecidas (`"lgtm":true`) | **0** | sem schema estrito; `revisado_*` não precisa justificar nada |
| GG7 | razão **truncado** — as 5 entradas históricas apagadas, só a do PR corrente | **0** | **não há append-only**: o histórico pode ser reescrito e a "cobertura" só cai |
| GG9 | evento `push` (sem `--pr`, sem `PR_NUMBER`) + razão **vazio** | **0** | fora de `pull_request` a exigência por PR desaparece (por desenho; ver §7) |

Zero resultados inesperados em 20 sondas (11 vermelhas + 9 verdes). Cada verde revelador está pareado com um vermelho legítimo no mesmo harness.

Erro meu, declarado: a primeira rodada usou `artifact: "package.json"` — que **não existe na raiz** deste monorepo (é `server/package.json`) — e 4 sondas reprovaram pelo motivo errado. Refiz com `docs/audit/REVIEW-LEDGER.jsonl`. Os números da tabela são os da rodada corrigida.

---

## 5. A circularidade do gate — o que ele NÃO confere, medido

A alegação central do PR é: *"o gate cobra DECLARAÇÃO, não aprovação, e por isso `sem_revisao_independente` é veredito legítimo — se ele exigisse aprovação, este próprio PR só ficaria verde fabricando uma revisão inexistente."*

**A alegação sobrevive como intenção de desenho e cai como suficiência.** Ela é honesta: o cabeçalho do script declara em primeiro lugar o que ele não faz. Mas a pergunta que este relatório tinha de responder era *"um gate cuja única exigência é declarar pode ser satisfeito por qualquer coisa?"*, e a resposta medida é **quase**.

**Placar das 7 regras.** Todas as 7 reprovam alguma coisa — nenhuma é pura forma decorativa. Mas o corte útil é outro: **quantas conferem algo FORA do próprio arquivo?**

| Regra | Morde? | Mas confere o mundo? |
|---|---|---|
| RL0 razão ausente | sim (GR9) | n/a |
| RL1 JSON + `commit` hexa + `implementer` não-vazio | sim (GR6, GR8) | **não** — `commit` é `/^[0-9a-f]{7,40}$/`, sem `git cat-file`; `"0000000"` e `"deadbee"` passam (GG1, GG4) |
| RL2 `pr` inteiro positivo + único | sim (GR1) | **não** — `pr: 999999` passa (GG4); nada consulta a API do GitHub |
| RL3 lista fechada de vereditos | sim (GR5) | n/a (é fechamento interno, e funciona) |
| RL4 `reviewer ≠ implementer` + `artifact` existe | sim (GR2, GR3) | **não × 2** — `existsSync` aceita diretório (GG2), arquivo vazio (GG3) e o próprio razão (GG10); `≠` é string, derrotada por caixa (GG5) ou por um ponto (GG6) |
| RL5 `note` obrigatória, sem `reviewer`/`artifact` | sim (GR7, GG13) | **não** — `"x"` satisfaz (GG1) |
| RL6 PR do evento tem entrada | sim (GR4) | **não** — só que a linha existe, não que corresponde ao PR (GG14) |

**7 de 7 têm mordida sintática. 0 de 7 confrontam o registro com o repositório, com o GitHub, ou com o conteúdo do artefato.** O gate é um validador de *forma de linha*, não um verificador de *fato*. Isso não contradiz o cabeçalho — que diz explicitamente "prova que a declaração existe, é única por PR e é internamente consistente" — mas contradiz a leitura fácil de que "artefato apontando caminho QUE EXISTE no disco … é o único campo do registro que outra pessoa pode abrir e conferir": **`docs` é um caminho que existe e ninguém abre e confere coisa alguma**.

**A circularidade concreta, medida:** as três checagens que separariam um `revisado_pass` verdadeiro de um fabricado — o artefato ter conteúdo, o revisor ser outro ator, o commit/PR existirem — são exatamente as três que o gate não faz. Um agente que quisesse fabricar uma revisão hoje precisaria de: um sha de 7 hexas quaisquer, um nome com uma letra trocada de caixa, e a string `docs`. **Exit 0.**

Isso **não** anula o ganho declarado (converter ausência-de-declaração em declaração-de-ausência, e tornar o registro contável). Anula a leitura de que o gate protege contra registro falso: ele protege contra registro **omisso**.

---

## 6. Alegações que caíram

1. **CAIU — (e) "os 9 DTOs restantes só declaram `.strict()` e/ou enum".** Falso para pelo menos 4 dos 9, verificado lendo os arquivos:
   - `SpedEcfDto.ts:85-106` — `superRefine` **cross-field** de compliance ECF (REGRA_OBRIGATORIO_ASSIN_CONTADOR): exige ≥1 contador `IDENT_QUALIF='900'` e ≥1 não-contador, e para cada contador exige CPF de 11 dígitos + `IND_CRC`. É a **invariante irmã** da que o PR cobriu no `SpedEcdDto` (R4 acima matou exatamente essa classe lá). Mais: `cnpj`/`cpfOrCnpj`/`codMun`/`cep`/`cnaeFiscal` são regexes fiados.
   - `ReferentialMappingDto.ts:154-157 e 189-192` — **duas** `.refine()` cross-field: `accountId` duplicado no lote é rejeitado, e `fromVersion !== toVersion`.
   - `ClosingDto.ts:23` — `year: z.number().int().min(2000).max(2100)`.
   - `DocumentAttachmentDto.ts:6` — `idLike` com regex `^[A-Za-z0-9_-]+$` cujo próprio comentário diz que **bloqueia path traversal** ("defense in depth"); e os três schemas do arquivo são `z.object()` **sem `.strict()`** — ou seja, o DTO nem sequer declara o `.strict()` que a frase lhe atribui.
   Só `ReceiptDto` e `tieOutDiagnostic.dto` casam literalmente com a descrição.

2. **SOBREVIVE o recorte, CAI a justificativa.** O critério **operativo** declarado no mesmo parágrafo — "dinheiro (`MAX_CENTS`) ou data-only (`isValidDateOnly`) fiada em CÓDIGO" — está **correto**: reconferi por `grep` cru nos 21 arquivos e os únicos casamentos nos 9 fora de escopo são os **comentários** de `CounterpartyDto.ts:6` e `DimensionDto.ts:7` (que dizem literalmente *"NO money, NO dates … no MAX_CENTS / date-only concern here"* — a armadilha 5 confirmada). Nenhum dos 9 fia `MAX_CENTS` ou `isValidDateOnly` em código. Ou seja: **o item 5 escolheu os 8 arquivos certos e escreveu a frase errada ao descrever os que sobraram.**

3. **CAIU — a leitura de que `artifact` é "o único campo que outra pessoa pode abrir e conferir".** GG2/GG3/GG10: diretório, arquivo de 0 byte e o próprio razão passam.

4. **CAIU — a suficiência de "reviewer != implementer (AV-00 §9.4)".** GG5/GG6: uma letra maiúscula ou um ponto final derrotam a regra. O `trim()` funciona (GG11), o resto não.

---

## 7. Alegações que sobreviveram

1. **(d) e a generalização que eu tentei derrubar: os 8 arquivos mordem.** Ataquei os 6 que o autor não mutou, com 12 mutações minhas concentradas nas invariantes cross-field — a hipótese era "teste de caminho feliz". **12/12 morreram**, todas discriminantes, com 4 controles neutros verdes. Não achei nenhum teste decorativo. As mortes M2/M7 do autor são reproduzíveis mas irrelevantes: o resultado forte é que eu não consegui escolher uma invariante que o teste deixasse passar.

2. **(c) O denominador 21 fecha.** Verificado mecanicamente: `git ls-tree 40892baa^1` confirma que os testes pré-existentes eram exatamente 4 (`PayableDto`, `PostingDto`, `ReceivableDto`, `ReconciliationDto`); 8 novos no diff; 21 arquivos `.ts` no diretório `dtos/`. **4 + 8 + 9 = 21.** E a correção da varredura (10 → 8 removendo comentários) está certa pelo motivo declarado.

3. **A honestidade estrutural do gate.** O que ele não faz está escrito **antes** do que ele faz, nos dois arquivos, e a mensagem final impressa (`LIMITE: o veredito é auto-declarado…`) sai em toda execução verde. O gate não se vende como mais do que é. Minha ressalva é sobre o **alcance**, não sobre má-fé.

4. **A escolha "declaração, não aprovação" resolve a circularidade que o autor nomeou.** Se o gate exigisse `revisado_*`, o #167 teria de fabricar um revisor. Ele declarou `sem_revisao_independente` e essa entrada é verdadeira — este relatório é a primeira revisão independente sobre esse trabalho, e chega depois do merge, o que a própria nota do razão antecipava.

5. **O CI está ligado de verdade.** O passo existe no job `governance-presence` com `fetch-depth: 0` e `PR_NUMBER` do evento; o job só usa builtins do Node, então não é mascarado por falha de `npm ci`. A suíte `unit` que contém os 8 testes roda no job `server` (`npm test`). Ambos os artefatos estão no caminho de execução, não em prosa.

---

## 8. Achados novos (NÃO corrigidos)

**A1 — `.strict()` do `periodComparison.dto` é inalcançável na fronteira HTTP, e o cabeçalho do DTO afirma o contrário.**
`accountingController.ts:347-350` monta um literal com **exatamente duas chaves** antes do `safeParse`, e lê `unitId` à parte (`:342-346`). Os irmãos passam `req.query` **direto** (`CashFlowStatementQuerySchema:313`, `DailyJournalRequestSchema:380`, `AgingReportQuerySchema:410`, `TieOutDiagnosticQuerySchema:438`) — ali o `.strict()` morde. Só neste não. Consequência: `?...&bogus=1` é **aceito-e-ignorado** na rota, exatamente a classe `param-aceito-e-ignorado-e-bug`; e o cabeçalho do DTO (`periodComparison.dto.ts:15-16`) promete *"`.strict()` rejeita chaves desconhecidas … em vez de silenciosamente aceito-e-ignorado"*. O teste novo (`periodComparison.dto.test.ts:40`) **ratifica a promessa no schema** sem notar que o único chamador a neutraliza — é a classe `gate-eval-prova-o-texto-nao-o-app` aplicada a um DTO. Defeito **pré-existente** ao #167; o #167 o deixa parecer coberto.
*Falsificador de uma linha:* `GET /accounting/reports/period-comparison?unitId=u1&asOfCurrent=2026-06-30&asOfPrevious=2026-05-31&bogus=1` devolve **200**; se o `.strict()` valesse na rota, devolveria 400.

**A2 — `ReceiveStockSchema` (`InventoryDto.ts:35`) não tem NENHUM consumidor de produção.**
`grep -rn "ReceiveStockSchema\|ReceiveStockInput" server/src my-app` devolve só o próprio DTO e o próprio teste. O DTO declara isso no cabeçalho ("NO HTTP surface this increment, F-INV2 deferred"), então não é mentira — mas significa que **M2, a mutação que o PR apresenta como a prova de mordida de dinheiro, guarda um schema que nenhuma rota ou serviço usa**. A mordida é real no schema e nula no app. Os outros 7 estão ligados a um controller (verificado um a um).
*Falsificador de uma linha:* `grep -rl ReceiveStockSchema server/src --include=*.ts | grep -v "dtos/"` devolve vazio.

**A3 — `DocumentAttachmentDto` é o único DTO da pasta sem `.strict()`, e está na lista dos "fora de escopo por só declararem `.strict()`".**
Três schemas em `z.object()` puro (`:38`, `:46`, `:52`), com um `idLike` cujo comentário o declara guarda anti-path-traversal. Sem teste, e classificado por uma frase que descreve uma propriedade que ele não tem.
*Falsificador de uma linha:* `grep -c "strict()" server/src/features/accounting/dtos/DocumentAttachmentDto.ts` devolve **0**.

**A4 — O razão não é append-only e nada detecta a remoção de entradas (GG7).**
Apagar as 5 entradas históricas e deixar só a do PR corrente mantém exit 0; o único sinal é a linha "Cobertura: N declarado(s)" cair, e nenhum gate compara esse N com o da execução anterior. O achado original mediu justamente a diferença entre registro contável e prosa; um registro que pode encolher em silêncio recria metade do problema.
*Falsificador de uma linha:* `git show HEAD:docs/audit/REVIEW-LEDGER.jsonl | grep -c '^{'` comparado ao valor impresso pelo gate — a divergência não reprova nada hoje.

**A5 — §9.4 é `String(a).trim() === String(b).trim()`, case-sensitive (`review-ledger-check.mjs:104`).**
`"claude-opus-5"` × `"Claude-Opus-5"` passa (GG5). Como o campo é texto livre auto-declarado, a regra oferece uma garantia mais forte do que entrega.
*Falsificador de uma linha:* trocar a caixa da primeira letra do `reviewer` numa entrada `revisado_*` mantém o gate verde.

---

## 9. O que ficou FORA desta revisão

- **`bancada-gate.mjs`** — rodei (exit 0) mas **não** o revisei; não é objeto do #167.
- **Os 4 DTOs pré-existentes** (`PayableDto`, `PostingDto`, `ReceivableDto`, `ReconciliationDto`) — não mutei; o #167 não os tocou.
- **`docs/audit/CONTINUACAO.md` e `TRIAGEM-R1-R3.json`** — li os trechos do diff que sustentam as alegações (a)/(c)/(e); não auditei o resto do JSON de triagem nem os outros itens (5/6/7 têm mais superfície do que a que me foi apontada).
- **CI real** — verifiquei o YAML e o encadeamento dos jobs; **não** observei uma execução real do GitHub Actions. Que o passo exista no arquivo não prova que ele passou/reprovou num run.
- **Camada de serviço/rota dos 7 DTOs ligados** — confirmei o import no controller, mas não exercitei nenhuma rota real (sem servidor, sem `dev.db`). A1 é achado por leitura de código, não por requisição.
- **`my-app/`** — intocado.
- **Reexecução das mutações M2/M7 do autor com os números exatos dele** — deliberadamente não repeti; a instrução era escrever as minhas, e repetir a medição do autor não é revisão.

---

## 10. Meus próprios vieses, nomeados

1. **Viés de procurar o buraco.** Fui instruído a refutar, e isso enviesa para achar defeito. Contramedida aplicada: quatro controles neutros verdes e uma tabela explícita de "alegações que sobreviveram" — e o resultado forte do relatório (**12/12 mortas**) é o oposto do que eu estava procurando. Registro que tentei 12 vezes derrubar a mordida dos testes e falhei nas 12.
2. **Viés de mutação escolhida por mim.** Todas as 12 mutações são invariantes que **eu** julguei relevantes. Um teste que só cobre o que eu penso em mutar continua invisível para mim. Não há mutante gerado automaticamente aqui; a cobertura da minha sonda é do tamanho da minha imaginação.
3. **Viés de fronteira sintática.** Ataquei o **schema**, não o **caminho de produção** — e foi exatamente aí que A1 e A2 apareceram, por leitura, não por medição. Se houver mais DTOs cujo `.strict()` o controller neutraliza, minha sonda não os acharia: eu só olhei os 5 chamadores dos DTOs do #167.
4. **Viés de "gate honesto ⇒ gate suficiente".** O cabeçalho do `review-ledger-check.mjs` é desarmante: declara os próprios limites antes de tudo. Tive de me forçar a medir o que ele aceita em vez de aceitar a autodeclaração de limite — as 9 sondas verdes existem porque eu quase não as escrevi.
5. **Viés de mesma família.** Sou o mesmo modelo que implementou o #167, em sessão separada e worktree separado. Isso satisfaz a letra do AV-00 §9.4 (sequência distinta) e **não** satisfaz o espírito de "outro par de olhos": partilho vocabulário, hábitos de teste e provavelmente pontos cegos com quem escreveu o código. Um revisor humano ou de outra família atacaria coisas que nem me ocorreram.
6. **Um erro meu nesta rodada, já declarado (§4.ii):** usei `package.json` como caminho "que existe" sem verificar que este monorepo não tem `package.json` na raiz, e 4 sondas reprovaram pelo motivo errado. Só percebi porque a mensagem de erro não batia com a hipótese. Se a mensagem do gate fosse menos específica, eu teria registrado 4 achados falsos.

---

## Adendo do orquestrador — a circularidade aplicada às entradas DESTA rodada

**Autor:** claude-opus-5, sessão orquestradora (2026-08-07). É a regra T3 do projeto aplicada a mim:
a regra que eu crio vale primeiro para mim, e eu declaro onde ela falha em si mesma.

O revisor acima mediu que 7 das 7 regras do `review-ledger-check.mjs` têm mordida sintática e 0
confrontam o mundo. Reexecutei essa medição **contra as seis entradas `revisado_com_ressalva` que esta
mesma rodada acabou de escrever**, com harness que sai != 0 se a mutação não aplicar (sem isso, "gate
verde" seria indistinguível de "mutação não aplicada" — armadilha 9 do `CONTINUACAO.md`, na qual caí
uma vez antes de escrever o script):

| Mutação | `git diff --numstat` | exit | mensagem |
|---|---|---|---|
| `verdict` fora da lista fechada | 7/5 | **1** | `[RL3] "verdict" fora da lista fechada` |
| `artifact` → `docs/audit/reviews/NAO-EXISTE.md` | 7/5 | **1** | `[RL4] artifact … não existe no disco` |
| linha do PR 167 duplicada | 8/5 | **1** | `[RL2] PR 167 já declarado na linha 25` |
| `reviewer` := `implementer` (string idêntica) | 7/5 | **1** | `[RL4] reviewer === implementer` |
| `reviewer` := `implementer.toUpperCase()` | 7/5 | **0** | — **FUGA** |
| `artifact` := `docs` (um diretório) | 7/5 | **0** | — **FUGA** |
| `artifact` := arquivo de 0 byte | 7/5 | **0** | — **FUGA** |
| `commit` := `deadbee` (sha inexistente) | 7/5 | **0** | — **FUGA** |
| **controle** — arquivo intacto | 0/0 | 0 | `OK: 6 PR(s) … revisado_com_ressalva=6` |

**A leitura, sem arredondar:** as seis entradas que esta rodada escreveu passariam no gate **mesmo se
fossem fabricadas**. A barreira do §9.4 é comparação de string case-sensitive; o `artifact` é
`existsSync` e nada mais; o `commit` é regex de hexa. Logo o gate NÃO é o que dá valor a estas seis
declarações — ele prova que existem, são únicas por PR e são internamente consistentes, e nada além
disso, exatamente como o próprio cabeçalho do arquivo declara. **O que dá valor a elas são os seis
artefatos apontados**, que outra pessoa pode abrir, e as reexecuções registradas dentro deles.

Não corrigi nenhuma das quatro fugas: o achado não está triado, e o bloco 9 do AV-00 proíbe. Elas ficam
como achado com falsificador de uma linha cada, no corpo deste relatório.
