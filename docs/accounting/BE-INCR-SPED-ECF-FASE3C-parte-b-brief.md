# BRIEF — BE-INCR-SPED-ECF-FASE3C-parte-b (M410 + M500 + N-1: o que falta da Parte B do e-Lalur/e-Lacs)

> **Estado: preparação apenas.** Produzido em `sessao-planejamento` (2026-09-12). Checklist e contratos abaixo
> **não autorizam código** — todo fork em §3 está `RATIFICAÇÃO PENDENTE`. Este BRIEF é o **item 13 do BRIEF 3B**
> (`BE-INCR-SPED-ECF-FASE3B-blocos-LMN-brief.md:148`) desdobrado, e o que o ADR **D-M5** deixou explicitamente
> "para o item 13, com o dono". Na régua é **crescimento do nó X4**, não nó novo (master map §7.1 regra 2).
> **ADR normativo:** `docs/adr/ADR-INCR-SPED-ECF-FASE3-lucro-real.md` (EMENDA 2ª, D-M1..D-M5). O Fork N-1
> em qualquer perna que crie tabela exige **EMENDA 3ª ao ADR antes do 1º código de model** (mesma regra do
> Fork 4→(b)) — a 2ª migração foi nomeada no D-M5 "para que o `smoke-migration-gate` não a receba como surpresa".

---

## Contexto fixo (não rediscutir)

- **Item a planejar:** BRIEF 3B §1 item 13 — `M410` (lançamento na Parte B sem reflexo na Parte A, p.268),
  `M500` (controle de saldos da Parte B, p.271) e a nota **N-1** (saldo final da Parte B → `E020` da ECF
  seguinte, `REGRA_SALDOS_M010_E020` p.237). Mais os registros que só eram citados por regra de outros:
  `M312/M362` (números de lançamento da ECD), `M315/M365/M415` (processos judiciais) e `M510` (saldos por
  conta padrão) — **transcritos nesta sessão** (§1 item 1) para que a decisão de emissão seja por leiaute,
  não por chute.
- **Autorização:** dono, em sessão, 2026-09-12: *"Autorizo escrever o BRIEF BE-INCR-SPED-ECF-FASE3C-parte-b
  (M410 + M500 + N-1). Apresente como fork, com questionário e contexto … Registre também os MENOR do review
  como itens do BRIEF"*. Cobre **planejar** e **transcrever** (Passo A complementar, mesmo script). **Não
  cobre implementar nem ratificar fork.**
- **Insumos (fato consumado, em `main` `197cc9fc`):**
  - Models `LalurEntry` / `LalurParteBAccount` (`schema.prisma:1376-1433`), `@@unique` sem `deletedAt` +
    rename-on-key (D-M2). **`saldoIniCents` é UMA coluna na conta, sem dimensão de exercício** — é o que
    a N-1 precisa resolver (ver §3 Fork N-1, "o defeito de forma").
  - `LalurDto.ts` (create/update/archive/list × entry e Parte B, `.strict()`), `LalurService.ts`
    (`validateLineRefs` pré-tx, `archiveParteB` com guarda pré-tx), `LalurRepository.ts`.
  - `lib/ecfReal.ts` — `buildM010` (10 campos), `buildParteALine`, `buildParteBChild` (REGRA_PEA), 
    `buildContabilChild` (`indVlCtaContabil`: tudo que não é `'04'` vira patrimonial — origem do MENOR
    `codNat 09`), `buildEcfRealFile` (bodyM = M010 × contas + M030 × períodos ⊃ M300/M350). O comentário de
    cabeçalho já lista o que **não** emite: `M312/M362, M410/M415, M500/M510`.
  - `SpedEcfRealGenerationService.ts:117-146` — filtro `REGRA_MENOR_IGUAL_DT_FIN`, erro `REGRA_DT_AP_ZERO`,
    `toSerializerLine` (I-2: linha encerrada = 400), audit `lalurEntries` (contagem).
  - `lib/sped.ts:36` — `spedLine` lança `Error` puro se um campo contém `|` (origem do MENOR "500 na geração").
  - `SpedGenerationService.ts:34` `natureToCodNat` (`default → '09'`); `:309` `I200.NUM_LCTO = entryNumber`
    (é o que `M312/M362.NUM_LCTO` precisa citar).
  - `AccountingReportService.incomeStatement(scope, asOf)` — DRE **YTD**, closing-EXCLUSIVE; resultado do
    trimestre = DRE(fim do T) − DRE(fim do T−1). `quarterWindows(year)` em `SpedEcfGenerationService.ts:29`.
  - Catálogo `ecf-l12-linhas.json`: aba `PARTEB_PADRAO` (126 linhas) tem os códigos de prejuízo
    **`1000/1001/1002` (I)** e base negativa **`1003/1004` (C)**; linhas `P` do M300A/M350A = `173/174`.
  - Transcrição `BE-INCR-SPED-ECF-FASE3-layout-transcription-LMN.md` (27 registros após esta sessão).
- **Nós vizinhos:** X4 (este é o resto dele) · **C9 retificação** (versão anterior preservada — resposta 7):
  a Parte B materializada é o que a retificação precisa reler · **X12** catálogo de adições (consome M300A,
  não a Parte B) · **H1 2ª passada** (oráculo PVA — §4) · `FE-INCR-LALUR` (BRIEF irmão, tela) ·
  `ADR-INCR-TAX-ASSESSMENT` (apuração de tributos, ⚫ — **não** é deste BRIEF: aqui nenhuma alíquota entra).

## Definição de pronto

Um `sessao-feature` sobre este BRIEF, com os forks ratificados, entrega: (1) os registros da Parte B
decididos em §3 emitidos por `ecfReal.ts` a partir do model (o DTO de geração continua **sem** ajustes —
item 11 do 3B); (2) `M010.VL_SALDO_INI` do exercício N+1 **derivado** do saldo final de N (N-1 fechada),
com a retificação (C9) relendo a mesma versão; (3) os 4 MENOR do review do #313 fechados por teste-guarda;
(4) gates: tsc ×2, `smoke:migration` sobre cópia do `dev.db`, path-count do OpenAPI, snapshot de shape dos
DTOs, allowlist de audit, i18n (só se houver string de UI — não há), review independente.

## 1. Checklist de comportamentos

### Passo A complementar — feito NESTA sessão (docs-only, mesmo PR do BRIEF)

1. **[direto — FEITO]** `scripts/transcrever-ecf-lmn.mjs` ganha `M315, M362, M365, M415, M510` na lista
   `REGS` (+5, 22→27 registros); a transcrição cresce **77 linhas, 0 `[PARSER?]`** novos; rodar de novo
   dá diff vazio. Correções ao pedido: **`M312` já estava transcrito** (l.241, p.254); **`M315`/`M365`**
   (processos judiciais da Parte A, pp.255/267) **não constavam de lista nenhuma** e têm a mesma forma
   do `M415` — entram na decisão de emissão (Fork F-3C-4). Testável: `node scripts/transcrever-ecf-lmn.mjs
   && git diff --exit-code docs/accounting/BE-INCR-SPED-ECF-FASE3-layout-transcription-LMN.md`.

### Parte B — movimentos sem reflexo na Parte A (M410, p.268)

2. **[cond:Fork N-1 — qualquer perna com tabela ⇒ EMENDA 3ª ao ADR antes]** Model `LalurParteBMovement`
   (= `M410`, 8 campos): `parteBId` (FK `LalurParteBAccount`, Restrict), `year`, `quarter` (M410 é nível 3
   sob `M030`, p.268 — um período), `codTributo` (`'I'|'C'`, **derivado** da conta — REGRA_MESMO_TRIBUTO
   p.269; nunca input), `valorCents ≥ 0`, `indicador ∈ {CR, DB, PF, BC}`, `contrapartidaId?` (FK
   `LalurParteBAccount`; **proibido** com PF/BC — REGRA_NAO_PREENCHER_CTP; **mesmo tributo** — REGRA_MESMO_TRIBUTO),
   `historico` (C, obrigatório), `indLanAnt ∈ {S, N}` (p.268 obs.: "S" = reajuste de saldo em início de período
   por realização de valor diferido), `origem ∈ {user, system}` (ver item 6), soft-delete. **Sem chave de
   negócio** (Manual: "Campo(s) chave: —") ⇒ sem `@@unique`; duplicata por duplo-submit é do FE. Testável:
   CRUD; PF com contrapartida = 400; contrapartida de outro tributo = 400; tenancy cross-scope = `NotFoundError`.
3. **[cond:Fork F-3C-2]** `parteBId` **obrigatório** no nosso DTO (mais estrito que o leiaute, cujo
   `COD_CTA_B` é `Obrig.=Não` sem regra que diga quando fica vazio — leitura: campo 2 p.268). Declarado
   em §4 como INFERIDO; relaxar só com caso do PVA/contador que exija `COD_CTA_B` vazio.
4. **[direto]** Cadeia `/api/lalur/parte-b/movements` — `GET` (query `unitId, year?, quarter?, parteBId?,
   includeArchived` via `queryBoolean`), `POST`, `PATCH /:id`, `POST /:id/archive` — Route → Controller →
   `LalurService` (mesmo serviço; não abrir `LalurMovementService`) → `LalurRepository` → Prisma, Policy
   `canManageLalur`/`canReadLalur`, DTO `.strict()`, registro em 2 toques (`index.ts` + `docs.paths.ts`),
   path-count 166→170, 3 eventos `lalur.movement_{created,updated,archived}` na allowlist (payload: ids,
   `quarter`, `year`, `indicador`, `valorCents` — sem `historico`, que é texto livre).
5. **[direto]** Serializer: `buildM410` (8 campos na ordem p.268: REG, COD_CTA_B, COD_TRIBUTO,
   VAL_LAN_LALB_PB, IND_VAL_LAN_LALB_PB, COD_CTA_B_CTP, HIST_LAN_LALB, IND_LAN_ANT); emitido **sob o M030 do
   período**, depois das linhas M300/M350 daquele período (ordem do Bloco M p.236: M300…M350…M410…M500 — 
   **confirmar a ordem intra-período no PVA**, §4 item 3). Determinismo: ordenar por `(quarter, parteB.codCtaB,
   createdAt, id)`. Teste tabela-dirigido: exemplo da p.269 `|M410|101|I|1000,00|CR|202|…|N|` reproduzido byte a byte.
6. **[cond:Fork F-3C-2 — PF/BC]** Prejuízo fiscal do período (`PF`) e base negativa da CSLL (`BC`):
   `REGRA_PREJUIZO_FISCAL` / `REGRA_BC_NEGATIVA` (p.269, **erro**) exigem Σ PF = base de cálculo do IRPJ e
   Σ BC = base da CSLL **quando negativas**. Ninguém digita esse número com segurança — ele é derivado. Ver
   Fork F-3C-2 (quem produz o movimento PF/BC). Conta destino = a conta viva da Parte B com `codPbRfb ∈
   {1000,1001,1002}` (I) / `{1003,1004}` (C); se houver **mais de uma** viva para o tributo (ex.: geral +
   rural), a derivação é ambígua ⇒ 400 pedindo lançamento manual — apuração por atividade é frente própria (§6).

### Parte B — controle de saldos (M500 / M510) e transporte ao E020 (N-1)

7. **[cond:Fork N-1]** Saldo por conta × período: `sdIni`, `vlLctoParteA` (Σ M305/M355 do período — sinal
   por REGRA_PEA: A/L debita, E/P credita), `vlLctoParteB` (Σ M410 CR/DB/PF/BC do período — CR credita,
   DB debita, PF/BC **debitam** a conta de prejuízo: "D – para prejuízos ou valores que reduzam o lucro real",
   p.237 campo 9), `sdFim` = `sdIni ± movimentos`, cada valor com indicador `D|C` (magnitude ≥ 0 + sinal —
   mesma convenção do `M010`). `sdIni` do T01 = `M010.VL_SALDO_INI`; `sdIni` do Tn = `sdFim` do Tn−1
   (p.271: "quando trimestral, o saldo final do período será transportado para o saldo inicial do
   seguinte"). Testável: tabela de 4 trimestres com adição, exclusão, compensação e transferência entre
   contas fecha em `sdFim`; propriedade: Σ_contas(vlLctoParteB com contrapartida) = 0 por período.
8. **[cond:Fork N-1]** `buildM500` (11 campos p.271) emitido sob cada `M030`, **uma linha por conta viva
   do M010** (mesmo com movimento zero — p.271 "visão sintética"; **confirmar no PVA** se conta sem
   movimento e saldo zero pode ser omitida — §4 item 4). `buildM510` (12 campos p.273): agregação do M500
   por `COD_PB_RFB + COD_TRIBUTO` (Σ das contas com o mesmo código padrão; `DESCRICAO_PB_RFB` da aba
   PARTEB_PADRAO). Testável: Σ M500 por padrão == M510; arquivo determinístico (sha256).
9. **[cond:Fork N-1 — N-1 propriamente dita]** `M010.VL_SALDO_INI` / `IND_VL_SALDO_INI` do exercício **N+1**
   = `M500.SD_FIM_LAL` / `IND_SD_FIM_LAL` do **T04 de N** (p.271: "transportados para o E020 da próxima
   ECF"; p.237 `REGRA_SALDOS_M010_E020` = **erro** se divergir). Consequência de forma: `saldoIniCents`
   deixa de ser "o saldo" e passa a ser **saldo de abertura ancorado num exercício** — só é lido para a
   ECF do exercício âncora; nos seguintes, o gerador deriva. Testável: gerar N e N+1 sobre o mesmo store
   ⇒ `M010(N+1).VL_SALDO_INI == M500(N,T04).SD_FIM_LAL` para toda conta; editar um ajuste de N depois de
   gerar N+1 ⇒ comportamento definido pela perna do fork (materializado: N+1 **não** muda até refechar;
   recompute: muda).
10. **[cond:Fork N-1(a)]** Comando de fechamento da Parte B: `POST /api/lalur/parte-b/close` `{unitId, year,
    quarter}` materializa as linhas do período (idempotente: refechar recalcula se nenhum período posterior
    estiver fechado; senão 400) e `POST …/reopen` (400 se período posterior fechado — ordem limpa, precedente
    F-W2F-5). Gate **dentro da tx**: re-lê estado dos períodos na mesma `runTransaction` (memória
    `authoritative-gate-inside-tx`). Auditoria `lalur.parte_b_closed/reopened` (payload: `year`, `quarter`,
    contagem de contas, sha256 do conjunto de saldos — não os valores). **Não** acopla a
    `ExerciseClosingService.closeExercise` (encerramento contábil ≠ fechamento fiscal; ver Fork N-1 sub-decisão).
11. **[cond:Fork N-1(a)]** Geração da ECF Real exige os 4 trimestres do exercício **fechados** (400 nomeando
    o primeiro aberto), e roda o **diagnóstico** `GET /api/lalur/parte-b/balances?unitId&year` que devolve
    materializado × recomputado por conta × período com `divergences[]` (precedente BP/DRE diagnostics —
    memória `bp-dre-diagnostics-test-must-mix-natures`: fixture com adição E exclusão E transferência, senão
    guarda recíproca passa quebrada). Divergência ⇒ 400 na geração ("refeche o período"), nunca arquivo
    silenciosamente errado. Testável: alterar um ajuste após fechar ⇒ diagnóstico acusa; refechar ⇒ zera.
12. **[cond:Fork N-1(c)]** (perna recompute) `LalurService.computeParteBBalances(scope, year)` puro sobre o
    store, chamado na geração; sem tabela; `M010.VL_SALDO_INI` de N+1 = recompute de N encadeado até o
    exercício âncora. Testável: idem item 9 (perna "muda").
13. **[direto — vale nas 3 pernas]** Compensação de prejuízo (linha `P` do M300/M350 com `indRelacao=1`,
    REGRA_IND_RELACAO p.247) **não pode exceder o saldo** da conta da Parte B no período: `sdFim < 0` ⇒
    400 no create/update do ajuste **e** na geração (defesa em profundidade). Grau: INFERIDO (o Manual não
    transcreve regra de saldo negativo; a compensação limitada a 30% da base — Lei 9.065/95 art. 15 — é
    regra da **apuração**, do PVA/`ADR-INCR-TAX-ASSESSMENT`, não daqui; §4 item 5).

### Registros condicionais — decididos pela transcrição desta sessão

14. **[cond:Fork F-3C-3]** `M312`/`M362` (`NUM_LCTO` da ECD, pp.254/266): **obrigatórios** quando
    `M310/M360.VL_CTA` não é igual a nenhum dos 4 agregados da conta no período (saldo final, saldo do
    período, Σ débitos, Σ créditos — `REGRA_REGISTRO_M312_OBRIGATORIO`, p.253), facultativos só para
    financeiras/seguradoras. Nosso M310 emite `VL_CTA = valor do ajuste`; caso comum (ajuste = saldo inteiro
    da conta, ex.: multas indedutíveis) dispensa; caso parcial **exige** citar os lançamentos. Perna (a):
    relação `LalurEntryJournalEntry (entryId, journalEntryId)` (N:N, `@@unique`) + `journalEntryIds[]` no
    DTO (existência + mesmo escopo + data dentro do trimestre validadas no serviço) ⇒ `buildM312/M362`
    (`NUM_LCTO = JournalEntry.entryNumber`, o mesmo do `I200`). Testável: ajuste parcial sem lançamentos
    ⇒ **aviso** no diagnóstico (não 400 — a igualdade com K155/K355 só o PVA fecha).
15. **[cond:Fork F-3C-4]** `M315`/`M365`/`M415` (processos judiciais/administrativos, 3 campos: `IND_PROC
    ∈ {1,2}`, `NUM_PROC` C 20; chave `IND_PROC + NUM_PROC`; 0:N): uma tabela `LalurProcess` com **um** pai
    (`entryId?` xor `movementId?` — check no serviço; SQLite sem CHECK) + `@@unique([entryId, movementId,
    indProc, numProc])`; DTO `processos?: [{indProc, numProc}]` no create/update de ajuste e de movimento.
    Testável: emitido logo após o pai; `NUM_PROC` > 20 ⇒ 400.

### Os 4 MENOR do review do #313 — viram itens (teste-guarda vermelho primeiro)

16. **[direto]** **TOCTOU create × archive.** `createEntry` valida `parteBId`/`accountId` em
    `validateLineRefs` **antes** da tx e `archiveParteB` conta linhas vivas **antes** da sua tx: entre a
    checagem e o write, o outro lado pode mudar ⇒ M305 apontando para conta arquivada. Fix: re-ler a
    conta da Parte B (`deletedAt: null`) e a `Account` **dentro** da `runTransaction` do create/update; e
    `countLiveEntriesByParteB` dentro da tx do archive (o repo já aceita `tx`). Classe: memória
    `authoritative-gate-inside-tx`; precedente `Dimension` é o que o review chamou de "aceito", aqui fecha.
    Testável: teste de interleaving com `runTransaction` fake (padrão dos testes de CAS do AP/AR) —
    **a CI Linux é o oráculo** (memória `windows-serializa-sqlite-ci-linux-nao`).
17. **[direto]** **`|` em texto livre ⇒ 500 na geração.** `spedLine` lança `Error` puro. Fix em duas
    camadas: DTO rejeita `|` em `histLancamento`, `descricao` (Parte B), `historico` (M410), `numProc`
    (`z.string().regex(/^[^|]*$/)`, mensagem citando ECF/Manual p.31 — separador de campo); e a geração
    envolve `buildEcfRealFile` num `try` que converte `Error` de `spedLine` em `ValidationError` nomeando
    o registro/linha (dados pré-existentes). Classe pré-existente no Presumido/ECD — **fora de escopo aqui**
    (§6), mesma correção quando for autorizada.
18. **[direto]** **`codNat 09` tratado como patrimonial.** `indVlCtaContabil` decide o sinal por
    `codNat === '04'` senão patrimonial; a regra p.246 só define `1,2,3` e `4`. `natureToCodNat` devolve
    `'09'` para natureza fora do domínio. Fix: no create/update com `indRelacao ∈ {2,3}`, 400 se a conta
    não mapeia para `01..04`; na geração, `ValidationError` (defesa). Testável: conta `nature` inválida ⇒ 400.
19. **[direto]** **Conta contábil soft-deletada após o ajuste sai no M310.** `findEntriesForYear` inclui
    `account` sem filtrar `deletedAt`. Fix: geração ⇒ 400 nomeando o ajuste e a conta; **e** guarda no
    arquivamento da `Account` (blast radius: `AccountService` é de outro incremento — item com nota: contar
    `lalurEntry` vivas com `accountId` dentro da tx do archive, 400 "arquive os ajustes do e-Lalur antes"),
    espelho do que `archiveParteB` já faz. Testável nos dois lados.

### Documentação, OpenAPI, runbook

20. **[direto]** `docs.paths.ts` + `npm run docs:generate`; path-count guard; snapshot de shape dos DTOs;
    `RUNBOOK-H1-PVA.md` §2ª passada ganha 2P-4 (Parte B: M410 PF num trimestre com prejuízo + M500 batendo
    com o E020 recuperado) — **em branco**; EMENDA 3ª do ADR (se Fork N-1 criar tabela) com a forma do model.

## 2. Contratos esboçados — **tentativos, condicionados aos forks**

### 2.1 `CreateLalurParteBMovementSchema` (M410) — `.strict()`

```ts
{
  unitId: string;
  parteBId: string;                 // FK LalurParteBAccount (viva, mesmo escopo) — Fork F-3C-2 (obrigatório)
  year: int 2015..2100;
  quarter: 'T01'|'T02'|'T03'|'T04';
  indicador: 'CR'|'DB'|'PF'|'BC';   // M410.IND_VAL_LAN_LALB_PB (p.268)
  valorCents: int ≥ 0 ≤ MAX_CENTS;  // M410.VAL_LAN_LALB_PB
  contrapartidaId?: string;         // FK LalurParteBAccount; PROIBIDO com PF/BC (REGRA_NAO_PREENCHER_CTP);
                                    // mesmo codTributo da conta (REGRA_MESMO_TRIBUTO) — serviço
  historico: string 1..500, sem '|'; // M410.HIST_LAN_LALB
  indLanAnt: 'S'|'N';               // M410.IND_LAN_ANT
  processos?: Array<{ indProc: '1'|'2'; numProc: string 1..20 }>; // M415 (Fork F-3C-4)
}
// derivados no serviço, nunca input: codTributo (= parteB.codTributo), origem ('user'; 'system' só pelo item 6)
```

`UpdateLalurParteBMovementSchema`: patch parcial de `valorCents, indicador, contrapartidaId (nullable),
historico, indLanAnt, processos`; `year/quarter/parteBId` não mudam (arquive e recrie — mesma regra do 3B).
Movimento `origem='system'` (PF/BC derivado) **não aceita PATCH** de `valorCents`/`indicador` (400) — só archive
(que o próximo fechamento recria).

### 2.2 Prisma (Fork N-1 — só a perna (a)/(b) cria as tabelas; (c) cria só `LalurParteBMovement`)

```prisma
model LalurParteBMovement {                 // M410 (p.268)
  id, userId (FK User Cascade), unitId
  parteBId        String   // FK LalurParteBAccount, Restrict
  year            Int
  quarter         String   // 'T01'..'T04'
  codTributo      String   // 'I'|'C' — DERIVADO da conta no create (denormalizado p/ ordenação/consulta)
  indicador       String   // 'CR'|'DB'|'PF'|'BC'
  valorCents      BigInt   // ≥ 0
  contrapartidaId String?  // FK LalurParteBAccount, Restrict — NULL com PF/BC
  historico       String
  indLanAnt       String   // 'S'|'N'
  origem          String   // 'user'|'system'
  createdById, createdAt, updatedAt, deletedAt
  @@index([userId, unitId, year, quarter])
  // sem @@unique: o leiaute não tem chave (p.268 "Campo(s) chave: —")
}
model LalurParteBBalance {                  // M500 (p.271) materializado — Fork N-1 (a)/(b)
  id, userId (FK User Cascade), unitId
  parteBId          String   // FK LalurParteBAccount, Restrict
  year              Int
  quarter           String
  sdIniCents        BigInt;  indSdIni        String  // 'D'|'C'
  vlParteACents     BigInt;  indVlParteA     String
  vlParteBCents     BigInt;  indVlParteB     String
  sdFimCents        BigInt;  indSdFim        String
  closedAt          DateTime
  closedById        String?
  @@unique([userId, unitId, parteBId, year, quarter])   // uma linha por conta × período (chave do M500)
}
model LalurProcess {                        // M315/M365/M415 (pp.255/267/270) — Fork F-3C-4
  id, userId, unitId
  entryId    String?  // FK LalurEntry — XOR movementId (serviço)
  movementId String?  // FK LalurParteBMovement
  indProc    String   // '1'|'2'
  numProc    String   // C 20
  @@unique([entryId, movementId, indProc, numProc])
}
model LalurEntryJournalEntry {              // M312/M362 (pp.254/266) — Fork F-3C-3
  entryId        String  // FK LalurEntry
  journalEntryId String  // FK JournalEntry
  @@id([entryId, journalEntryId])
}
```

Sem `deletedAt` em `LalurParteBBalance` (é snapshot: refechar **substitui** as linhas do período na mesma tx;
reabrir apaga — trilha no `AuditEvent`, precedente `ReferentialMapping` D5). Migração aditiva (CREATE TABLE
puros, prólogo `DROP … IF EXISTS`, `smoke:migration` sobre cópia do `dev.db` — memória
`migracao-sqlite-nao-e-transacional`).

### 2.3 Serializer (`ecfReal.ts`) — entrada nova

```ts
interface EcfRealParteBMovement { perApur; codCtaB; codTributo; valorCents; indicador; codCtaBCtp?; hist; indLanAnt; processos?: Proc[] }
interface EcfRealParteBBalance  { perApur; codCtaB; codTributo; codPbRfb; descricaoPbRfb; sdIni; indSdIni; vlA; indA; vlB; indB; sdFim; indSdFim }
EcfRealFileInput += { movements: EcfRealParteBMovement[]; balances: EcfRealParteBBalance[] }
// bodyM por período: M030 → M300(+M305/M310/M312/M315) → M350(+M355/M360/M362/M365) → M410(+M415) → M500 → M510
```

### 2.4 Resposta do diagnóstico (Fork N-1 (a))

```ts
GET /api/lalur/parte-b/balances?unitId&year → {
  year, periods: [{ quarter, closed: boolean, closedAt?, accounts: [{ parteBId, codCtaB, codTributo,
    materialized?: Balance, recomputed: Balance, divergent: boolean }] }],
  divergences: Array<{ quarter, codCtaB, codTributo, field, materialized, recomputed }>
}
```

## 3. Forks pendentes de ratificação — **decisão do dono, fora desta sessão**

### Fork N-1 — Como a Parte B carrega saldo entre períodos e exercícios (**o fork deste BRIEF**)

**O defeito de forma que o fork resolve:** `LalurParteBAccount.saldoIniCents` é uma coluna única, sem
exercício. Hoje, para gerar a ECF de 2026 depois da de 2025, o usuário teria de **sobrescrever** o saldo
inicial com o saldo final de 2025 — e a ECF de 2025 regerada (C9, retificação) passaria a emitir o `M010`
**errado** (`REGRA_SALDOS_M010_E020` = erro no PVA). O saldo final de N é dado **derivado** (M500 p.271:
"registro gerado pelo sistema a partir do saldo inicial e das movimentações"); o que muda entre as pernas é
**quando** ele é calculado e **se** fica congelado.

| Perna | O que muda no arquivo | 2ª migração | `E020` do exercício seguinte (N-1) | O que deixa aberto |
|---|---|---|---|---|
| **(a) Tabela `LalurParteBBalance` materializada por comando de fechamento + recompute como diagnóstico — RECOMENDADA** | `M500`/`M510` lidos da tabela; geração exige 4 trimestres fechados e sem divergência (itens 10-11) | **Sim**: `LalurParteBMovement` + `LalurParteBBalance` (+ `LalurProcess`/`LalurEntryJournalEntry` se F-3C-3/4) | `M010(N+1).VL_SALDO_INI` = linha materializada `(conta, N, T04).sdFim` — o **mesmo número transmitido** em N, mesmo que alguém edite N depois; C9 relê a versão congelada | Custo: comando + tabela + diagnóstico; o dono precisa **fechar** trimestre (um clique a mais — FE-INCR-LALUR); residual: janela entre editar N e refechar (o diagnóstico acusa, a geração recusa) |
| **(b) Tabela materializada, sem diagnóstico** | idem (a) | idem (a) | idem (a) | Edição de N após fechar passa **em silêncio** até o PVA acusar `REGRA_SALDOS_M010_E020` na ECF de N+1 (oráculo externo, 14+ dias) — é o buraco que (a) fecha |
| **(c) Recompute do razão da Parte B a cada geração** | `M500`/`M510` calculados na hora; arquivo é função pura do store | **Sim, menor**: só `LalurParteBMovement` (+ opcionais); e `saldoIniCents` precisa de **âncora de exercício** (`saldoIniYear` — coluna nova em `LalurParteBAccount` = `ALTER`, que o smoke gate S6 morde) | `M010(N+1)` = recompute encadeado de N; **se N foi editada depois de transmitida e não retificada, N+1 diverge do E020 recuperado** ⇒ erro no PVA, invisível até lá | Sem "fechar" — mas o número transmitido não fica registrado em lugar nenhum; C9 (retificação versionada) teria de reconstruir o que foi enviado a partir do audit |

**Recomendação: (a)** — é a única que fecha a N-1 **e** a C9 ao mesmo tempo (o número transmitido é dado
persistido, não recomputo), e é a que transforma o erro do PVA (externo, tardio) em 400 nosso (interno,
imediato). (b) é (a) menos a peça que produz evidência; (c) é o menor diff e deixa a divergência para o oráculo
que o projeto já mediu como gargalo. Custo de (a) é insumo de planejamento: +1 comando, +1 tabela, +1 endpoint
de diagnóstico, +1 passo no runbook H1 2ª (2P-4). **Sub-decisão embutida (D2, decidida aqui, reversível):** o
fechamento é **comando próprio por trimestre**, não efeito do `closeExercise` anual — fiscal ≠ contábil, e a
apuração é trimestral (Fork 5→a). **RATIFICAÇÃO PENDENTE.**

### Fork F-3C-2 — Quem produz o movimento `PF`/`BC` (prejuízo fiscal / base negativa do período)

`REGRA_PREJUIZO_FISCAL` e `REGRA_BC_NEGATIVA` (p.269, **erro**) exigem Σ PF = base do IRPJ e Σ BC = base da
CSLL quando negativas. A base é: resultado contábil do trimestre (nosso razão — DRE closing-exclusive, janela
do trimestre) + adições − exclusões (`LalurEntry` A/E do `lalur`/`lacs`) − compensações (`P`). O Bloco N é do
PVA (Fork 3→a), mas o PVA **recupera** L300 da ECD que **nós** geramos — a base que ele computa é a nossa,
se o razão for o mesmo.

| Perna | O que faz | O que deixa aberto |
|---|---|---|
| **(a) Sistema deriva e PERSISTE o movimento PF/BC no fechamento do trimestre (`origem='system'`), visível e arquivável, nunca editável em valor — RECOMENDADA** | No `close` (Fork N-1 a): computa a base por tributo; se < 0, cria/atualiza o `LalurParteBMovement` PF/BC na conta de prejuízo (`codPbRfb` 1000..1002 / 1003..1004); se ≥ 0, garante que não exista PF/BC `system` no período. Geração: 400 se existir PF/BC `user` **e** `system` no mesmo período (ambiguidade) | Depende de "base = resultado contábil + Parte A" ser exatamente o que o PVA computa — **oráculo H1 2ª (2P-4)**; >1 conta de prejuízo viva por tributo ⇒ 400 pedindo manual (atividade rural é frente própria) |
| (b) Usuário lança PF/BC manualmente (M410 comum); o FE mostra a base calculada como sugestão | Zero derivação no BE; BE só valida forma | O número certo depende de alguém copiar a sugestão; divergência só aparece no PVA (erro) |
| (c) (a) sem persistir: deriva na hora da geração | Sem `origem`, sem movimento visível | O M500 (Fork N-1 a) precisa do movimento para fechar `sdFim` — (c) contradiz a materialização; e o valor transmitido não fica registrado |

**Recomendação: (a)** — o único número que o Manual chama de erro se divergir é derivado do nosso próprio
razão; derivar e congelar é o que "cobrir a lacuna por inteiro" significa aqui. Só faz sentido com Fork N-1 (a)
ou (b). **RATIFICAÇÃO PENDENTE.**

### Fork F-3C-3 — `M312`/`M362`: relacionar ajuste a lançamentos contábeis da ECD

| Perna | O que faz | O que deixa aberto |
|---|---|---|
| **(a) Relação N:N `LalurEntryJournalEntry` + `journalEntryIds[]` no DTO; `M312/M362` emitidos com `entryNumber` — RECOMENDADA** | Cobre o caso parcial (ajuste < saldo da conta) que `REGRA_REGISTRO_M312_OBRIGATORIO` exige; diagnóstico avisa ajuste parcial sem lançamentos | Igualdade com K155/K355 só o PVA fecha; 1 tabela a mais na 2ª migração |
| (b) Não emitir; documentar que ajuste **deve** igualar um dos 4 agregados da conta | Zero código | Todo ajuste parcial (o caso real: parte de uma conta de despesa é indedutível) vira erro no PVA sem saída no produto |

**Recomendação: (a).** **RATIFICAÇÃO PENDENTE.**

### Fork F-3C-4 — Processos judiciais: `M415` só, ou `M315`/`M365`/`M415` juntos

| Perna | O que faz | O que deixa aberto |
|---|---|---|
| **(a) Uma tabela `LalurProcess` com pai `entry` xor `movement`; os 3 registros emitidos — RECOMENDADA** | Mesma forma (3 campos) para os 3; custo marginal sobre M415 | Nada de leiaute; item 1.29 do Manual (ações judiciais) não transcrito — só forma, sem regra extra |
| (b) Só `M415` (o que o pedido listou) | Menor | Ajuste da Parte A amparado em decisão judicial (adição menor que a legal) não tem onde citar o processo — o caso volta como lacuna |

**Recomendação: (a).** Achado de escopo: `M315`/`M365` não estavam na lista do pedido; entram por serem o
mesmo registro em outro pai. **RATIFICAÇÃO PENDENTE.**

### Fork F-3C-5 — Ordem dos MENOR do review dentro deste incremento

| Perna | O que faz |
|---|---|
| **(a) Os 4 MENOR (itens 16-19) entram no MESMO `sessao-feature`, cada um como ciclo instrumentação→correção (teste vermelho primeiro) — RECOMENDADA** | Fecha o resíduo do #313 junto com a Parte B; a guarda no `AccountService` (item 19) é o único toque fora de `lalur*` |
| (b) MENOR em PR próprio antes do 3C | Isola blast radius; atrasa a Parte B por 1 ciclo de review |

**Recomendação: (a).** **RATIFICAÇÃO PENDENTE.**

## 4. Pendências de validação externa (oráculo = PVA / contador — H1 2ª passada, 2P-4)

1. **Σ PF por período = base negativa do IRPJ** (p.269): "período" lido como o `M030` sob o qual o M410 está
   (trimestral) — grau INFERIDO; o PVA confirma.
2. **`M410.COD_CTA_B` `Obrig.=Não`** (p.268): nenhuma regra transcrita diz quando fica vazio; DTO exige
   (item 3) — relaxar se o PVA/contador trouxer caso.
3. **Ordem intra-período** do Bloco M (M300… M350… M410… M500 sob o mesmo M030) — a ordem da p.236 é
   hierárquica; o PVA decide se M410/M500 vêm depois de todos os M300/M350 do período.
4. **`M500` para conta sem movimento e saldo zero** — omitir ou emitir (p.271 "visão sintética").
5. **Saldo negativo da Parte B** (item 13): regra INFERIDA; o limite de 30% da compensação (Lei 9.065/95
   art. 15) é da apuração (`ADR-INCR-TAX-ASSESSMENT`), não daqui.
6. **Base do PF/BC = resultado contábil do trimestre + Parte A** exatamente como o PVA computa a partir da
   ECD recuperada (Fork F-3C-2 a) — só a 2ª passada do H1 prova.
7. **Item 1.29 do Manual (Ações Judiciais)** — citado por M315/M365/M415, não transcrito (só forma dos campos).

## 5. Insumos ausentes

- **Nenhum bloqueante.** O Manual e as Tabelas Dinâmicas estão no corpus (sha256 conferido nesta sessão:
  `7216ec2bd62d`, `366b8d9030a0`); a transcrição complementar está feita.
- **Leiaute 13** (2026) segue não publicado — `year=2026` continua 400 (Fork 7→a); nada aqui muda isso.

## 6. Achados fora de escopo (registrados, não planejados — ORCH-006)

1. **`|` em texto livre no Presumido/ECD** (`ecf.ts`, `sped.ts` via `spedLine`): mesma classe do item 17,
   nos serializers anteriores — correção igual quando autorizada.
2. **Apuração por atividade (rural)**: `PARTEB_PADRAO` 1002/1004 e M300A 174 existem; a derivação de PF/BC
   por atividade exige segregar o resultado por atividade — frente própria, não deste BRIEF.
3. **`M312/M362` no caso "ajuste = saldo da conta"** depende de o `K155/K355` recuperado bater com o razão —
   é a mesma premissa do `M310.COD_CTA = J050` (BRIEF 3B §4 item 5).
4. **Guarda de arquivamento na `Account`** (item 19) toca `AccountService` — se o dono preferir, vira
   incremento próprio (Fork F-3C-5 b).
5. **`FE-INCR-LALUR`** precisa, além do CRUD, do botão "fechar trimestre" e do diagnóstico (Fork N-1 a) — 
   já refletido no BRIEF irmão como fork condicional.

## 7. Divergência de autorização

- O pedido listou `M312/M362/M415/M510` como "sem transcrição": **`M312` já estava transcrito** (PR #311);
  `M315`/`M365` faltavam e não estavam na lista — transcritos junto (mesmo script, +2 nomes). Nenhum código
  de aplicação foi tocado; o script de transcrição (`scripts/`, docs-tooling) ganhou 5 nomes na lista.
- Nenhum fork foi ratificado nesta sessão. O questionário ao dono acompanha o relatório da sessão.
