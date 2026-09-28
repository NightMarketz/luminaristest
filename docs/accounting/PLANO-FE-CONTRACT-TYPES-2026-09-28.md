# PLANO GRANULAR v2 — Tipos de payload gerados do snapshot + sequência mestre dos FE (28/09/2026, tarde)

> **Status: tudo decidido.** Nenhum fork aberto. Nada executa sem o "executa" do dono (ORCH-006): as decisões
> abaixo dizem **o que** e **como**; o "executa" diz **quando**.
>
> **Autorizações (chat, 28/09/2026):**
> 1. *"Vamos planejar então usando a solução de snapshot"*: F-CT-1 → snapshot.
> 2. *"Planeja com granularidade"*: este plano.
> 3. *"Pode planejar com bastante granularidade aqui para fecharmos qualquer ponta solta e riscos abertos, pode
>    decidir tudo"*: **delegação expressa** das decisões restantes ao agente. Cada decisão tomada sob delegação
>    está marcada **[delegada]** e registrada em
>    `docs/plano/decisoes/D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE.md`.
>
> **Spec:** `docs/adr/PRE-ADR-FE-CONTRACT-TYPES.md` (§11–§12). **Explicação didática:**
> https://claude.ai/artifact/QcJU1PPjWsz3PQy8vKzU6i. **Base:** `origin/main` = `98756906`.
> **Substitui a v1 da manhã.** A v1 tinha 5 erros que as sondas desta tarde expuseram (§0).

## 0. O que a v1 errava (e por que isso importa)

| # | A v1 dizia | A realidade (sonda de 28/09 tarde) | Efeito se executado como estava |
|---|---|---|---|
| E1 | Mapper com `draft.signers.map((s) => ({…}))` | **Objeto devolvido por `.map` sem tipo de retorno anotado escapa da checagem de chave extra** (G10) | O bug do PR-0 (`identQualif`) passaria de novo pelo `tsc` |
| E2 | Risco aberto: o gerador dentro do Jest | Com o prettier carregado, **o processo do Jest morre** (`ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG`), mesmo com `format:false` (G8) | O PR-1 quebraria a CI do server no primeiro run |
| E3 | seed-year, auto-match, ignore, unmatch e cancel de settlement "sem schema" (C3) | Validam com `SeedYear`/`AutoMatchStatement`/`SetLineIgnored`/`Unmatch`/`*ScopeQuery`, montados de body + params (G13) | Chamadas tipáveis deixadas de fora |
| E4 | SPED: o tipo do DTO é o contrato | O `spedController` aceita **mais** que o DTO: `signerContactIds` (F-C12-4, que eu dei como ausente) e campos que o perfil fiscal X13 preenche (G14) | O tipo gerado recusaria uma chave que o servidor aceita; e o F-FE-SG-2 foi recomendado sobre premissa falsa |
| E5 | Passo 0 = commitar o PR-0 deste worktree | Uma sessão paralela fez um fix **maior** da mesma lacuna (FE-FIX-SPED-ECD-SIGNERS), não commitado; o PR-0 é subconjunto (G15) | Dois PRs para a mesma lacuna, conflito nas mesmas linhas |

## 1. Estado de partida (verificado 28/09 tarde)

- **Este worktree** (`ecstatic-haibt-11235f`, branch `claude/finalizacao-modulos-fiscal-contabil-financeiro-d0a1b5`,
  fast-forward para `98756906`): **só documentos**. O diff do PR-0 e da limpeza pós-PR-0 foi **descartado**
  [delegada: F-A2 → (a)], com backup em
  `scratchpad/backup-pr0-e-limpeza-2026-09-28.patch` (123 linhas, sha256 `ae393be5b1cc425c…`).
- **FE-FIX-SPED-ECD-SIGNERS**, worktree `sig-nfe-xmldsig-verification-5dd1b9`, branch
  `claude/fe-dto-asymmetry-scan-fb5c0a`, **não commitado**:
  - remove `identQualif` do J930;
  - acrescenta CRC, UF do CRC, e-mail e fone na linha;
  - traz o mapper `toEcdSignerPayload`, 2 guardas, 60/322 testes, linha do GAP-MAP e o plano
    `PLANO-PENDENCIAS-FE-DTO-2026-09-28.md`.
  - É a correção que sobe. O dono de execução é a sessão "Varredura FE×DTO assimétrica".
- **Conversão de lead no CRM (Porte/Papel × enum)**: sessão "Corrigir Porte/Papel na conversão de lead (CRM)",
  **em andamento**.
- **Main andou 10 commits desde `b385040e`.** Nenhum toca `my-app/lib/services` nem `accounting/dtos`, então as linhas
  de FE citadas aqui continuam valendo. O único serviço de CRM mudado foi `CrmPipelineService.ts`, e o DTO do CRM
  não mudou.

## 2. Evidências (sondas fora do repo ou temporárias, todas apagadas)

| # | Fato | Como | Grau |
|---|---|---|---|
| G1 | `json-schema-to-typescript@15.0.4` compila os 184 schemas contábeis: 43 arquivos, 0 falha, 0 `any`/`unknown`, `tsc --strict` limpo | scratch | verificado |
| G2 | Saída determinística (mesmo sha256 em 2 rodadas), só LF | scratch | verificado |
| G3 | `format:false`: 2.604 linhas, determinístico, `tsc` limpo, e o probe do PR-0 ainda dá TS2353/TS2322 | scratch | verificado |
| G4 | O JSON do snapshot não usa `$ref`/`$defs`: tipos inline | grep | verificado |
| G5 | `RegisterPaymentSchema` existe em `accounting/dtos/PayableDto.ts` **e** `sales/dtos/RegisterPaymentDto.ts` | grep | verificado |
| G6 | A CI roda o snapshot no job `server` (`npm test` → `test:unit`) | `ci.yml` | lido |
| G7 | **Todos os domínios** no **Jest real do server**: 17 domínios, **258 schemas**, 67 arquivos, **0 falhas** (require, `toJSONSchema`, compile), inclusive os DTOs com `generated/prisma`/presets. 720–831 ms no total. `tsc --strict` limpo nos 67 | teste temporário em `server/src/__probe_contracts__` | verificado |
| G8 | O gerador faz `require("prettier")`, e o `index.cjs:726` do prettier 3 executa `import("./index.mjs")` **no require**. Dentro do Jest isso derruba o processo depois do teste. Nenhum código ou teste do server usa prettier | rodada + leitura | verificado |
| G9 | **Correção provada:** `jest.doMock(require.resolve('prettier', { paths: [dirname(require.resolve('json-schema-to-typescript'))] }), stub)` antes do `require` do gerador leva a PASS, exit 0 e processo íntegro | rodada | verificado |
| G10 | Checagem de chave extra no TS: literal anotado **sim**; `.map((s): T => ({…}))` **sim**; `satisfies T` **sim**; `.map((s) => ({…}))` **NÃO**; `{ ...rascunho }` **NÃO** | `tsc` sobre sonda | verificado |
| G11 | Os 67 `.gen.ts` dentro de `my-app/types/contracts/**` passam no `tsc` do my-app e no `lint:gate` (exit 0), sem `ignores` | cópia temporária, removida | verificado |
| G12 | Tipos frouxos (`unknown`/`[k: string]`) só onde o payload é JSON livre por natureza: analytics, dashboardLayout, dynamicTables, savedViews, structuredData, chat*, accountingBinding (2), documents (1). Contábil, crm, users e sales: **zero** | contagem | verificado |
| G13 | Parse composto (body + params) em seed-year, auto-match, ignore, unmatch e cancel de settlement (AP/AR). **Só o `openPeriod` lê `req.body?.unitId` sem Zod** (`accountingController.ts:592`) | leitura dos controllers | verificado |
| G14 | O `spedController` pré-processa o body **antes** do DTO: `expandCompanyProfile` (X13), `expandSignerContacts` (consome `signerContactIds`, F-C12-4 implementado) e o decode multipart (ECD com `.rtf`). **É o único controller com pré-processamento de body** | leitura + grep de todos os controllers | verificado |
| G15 | O FE-FIX-SPED-ECD-SIGNERS contém tudo do PR-0 + limpeza: sem `identQualif` e sem `qualifDesc`, mapper chave a chave, guarda de payload | leitura do worktree | verificado |
| G16 | `document.service.ts:57` `triggerQdrantInjection` → `POST /documents/:id/qdrant`: **a rota não existe** (só `GET /:id/qdrant`) e a função **não tem chamador**, desde o baseline `0db39612` | grep FE + rotas | verificado |
| G17 | OpenAPI (JSDoc) × Zod: `CreatePayableInput` sem `inventoryItems`/`inventoryMultiItem`/`recoverableTaxLines`; `PostEntryInput` sem `unitId` (o Zod exige). No total, 17 de 117 pares por nome divergem (heurística, com falsos positivos de multipart) | `public/openapi.json` × `toJSONSchema` | verificado nos 2 exemplos |
| G18 | Query strings: `year` sai `integer`, `includeArchived` sai `boolean \| "true"\|"false"`. O tipo gerado descreve o valor **depois** do coerce, não a string do fio | snapshot | verificado |
| G19 | `my-app` declara `zod` sem nenhum dependente (`npm ls zod` → só a dep direta) e sem nenhum import | `npm ls` + grep | verificado |

## 3. Decisões (todas fechadas)

| # | Decisão | Quem |
|---|---|---|
| D1 | Fonte do contrato = tipos gerados do `dtoShapeSnapshot` (F-CT-1) | dono |
| D2 | Gerador `json-schema-to-typescript` em versão **exata** `15.0.4`, devDep do server | dono (lib) · [delegada] (pin) |
| D3 | Todos os services, exceto DynamicTable (F-CT-4 → b); um JSON por domínio (F-CT-6 → a) | dono |
| D4 | `format:false` (G3) e prettier stubado **no próprio teste** por `jest.doMock` resolvido a partir do gerador (G9). **Não** muda o `jest.config` global | [delegada] |
| D5 | Um `.gen.ts` por arquivo de DTO em `my-app/types/contracts/<domínio>/`. Nome `<X>Schema` → `<X>Input`; export sem sufixo `Schema` → `<Nome>Input` | [delegada] |
| D6 | `.gitattributes`: `my-app/types/contracts/**/*.gen.ts text eol=lf linguist-generated=true`. A comparação normaliza `\r\n`. O diff do contrato que o revisor lê é o JSON; o `.gen.ts` vem colapsado no GitHub | [delegada] |
| D7 | **Regra do mapper** (§9): objeto aninhado sai de função com tipo de retorno declarado ou de `satisfies`; `.map(toX)` ou `.map((s): X => …)`; **proibido** `.map` sem anotação e `...spread` de rascunho; `as` só em folha string → união | [delegada] |
| D8 | Parse composto (G13): o body do FE = `Pick<XInput, <chaves que vão no body>>`. `Pick` com chave inexistente é erro de compilação, então continua amarrado | [delegada] |
| D9 | Rotas com pré-processamento (só as do SPED, G14): o FE tipa o corpo como o **DTO completo** (é o que ele manda hoje). Uma extensão aceita pelo controller entra **explícita**: `SpedEcdRequestInput & { signerContactIds?: string[] }` com `// ponytail: consumida por spedController.expandSignerContacts antes do .strict()` | [delegada] |
| D10 | Tipos frouxos de JSON livre (G12) ficam como o gerador emite. Apertar à mão seria espelho de novo | [delegada] |
| D11 | **Fora deste plano, com motivo:** query strings (G18: o tipo é do valor pós-coerce, não do fio); tipos de resposta (a maioria das respostas não tem schema Zod); OpenAPI gerado do Zod | [delegada] |
| D12 | `triggerQdrantInjection` (G16) é **removida** no PR-3: código morto, rota inexistente, zero chamador | [delegada] |
| D13 | GAP-MAP ganha 2 linhas no PR-DOCS: OpenAPI × Zod (G17, [ABERTO]) e `openPeriod` sem DTO (G13, [ABERTO], baixa). Porte/Papel do CRM **não**: é da sessão do CRM | [delegada] |
| D14 | PR-0 deste worktree **não sobe**; sobe o FE-FIX-SPED-ECD-SIGNERS (F-A2 → a do `PLANO-PENDENCIAS`) | [delegada] · executado |
| D15 | Forks da Onda 1 (`PLANO-ONDA1-FE-2026-09-28.md` §11) todos decididos, na recomendada, **exceto** F-FE-SG-2 → **(d) novo**: select "contador do cadastro" que envia `signerContactIds` (a via já existe no BE, G14), mantendo a linha manual | [delegada] |
| D16 | Forks do `PLANO-PENDENCIAS-FE-DTO-2026-09-28.md`: F-A1 → (c) 1 commit por assunto, A1 + A4 no mesmo PR; F-A2 → (a); F-A3 → (a) seção nova no RUNBOOK-H2; F-B2-1 → (a); F-B2-2 → (a). F-B3-1/F-B3-2: vale a ratificação da sessão do CRM que está executando; na falta dela, (a)/(a). **B8 superado** por D1. **B7 absorvido** pelo PR-3. **B5 fechado**: o `ImportExportPanel` não oferece `EXPORT_BANK_RECONCILIATION`/`EXPORT_ENTRY_SAMPLE` (BRIEF DELIVERY §6.2). B6 sem efeito com o gerador | [delegada] |
| D17 | Gate de merge = CI verde + "merge" do dono. Sem revisor novo (CLAUDE.md §⛔); revisão por agente separado só se o dono pedir | [delegada] |
| D18 | Sequência **serial** (§4). Paralelo só o BANK-SETTLEMENT, e só depois do PR-2 | [delegada] |

## 4. Sequência mestre

| Passo | Entrega | Sessão / onde | Pré-requisito | Pronto quando |
|---|---|---|---|---|
| **0** | **PR-DOCS**: este plano, `PLANO-ONDA1` (com emenda), PRE-ADR, nota de decisão, nó `FE-CONTRACT-TYPES`, fold de 7 nós, 2 linhas no GAP-MAP | este worktree | "pode commitar" do dono | `plano-vault.mjs check` exit 0, CI verde, merge |
| **1** | **FE-FIX-SPED-ECD-SIGNERS** (A1 + A4 do PLANO-PENDENCIAS) | sessão da varredura, worktree dela | "executa/merge" do dono | Merge. Destrava o **H1** (a ECD sai pela tela) |
| **2** | **CRM Porte/Papel** | sessão do CRM (em andamento) | a dela | Merge |
| **3** | **Contrato PR-1**: gerador + 43 contábeis + piloto SPED sobre o mapper do passo 1 (§6) | `sessao-feature` | passo 1 mergeado | §6.5 |
| **4** | **Contrato PR-2**: 9 services contábil/financeiro (§7) | `sessao-feature` | passo 3 | §7 |
| **5** | **FE-INCR-LALUR-PR2** (nasce tipado) | `sessao-feature` | passo 4 | BRIEF FE-LALUR + PLANO-ONDA1 §4 |
| **6** | **FE-INCR-SPED-SIGNERS**: combobox + rota `GET /sped/qualif-assinante` + contador do cadastro (D15) | `sessao-feature` | passo 4 | PLANO-ONDA1 §5 + delta do PLANO-PENDENCIAS §B1 |
| **7** | **FE-INCR-REVIEW** | `sessao-feature` | passo 4 | BRIEF REVIEW |
| **8** | **FE-INCR-DELIVERY**: PR-D1 (BE `GET /delivery`) → PR-D2 (FE) | `sessao-feature` | passo 7 (mesma aba) | BRIEF DELIVERY |
| **9** | **FE-INCR-BANK-SETTLEMENT** (pode correr em paralelo com 5–8, em worktree própria) | `sessao-feature` | passo 4 | BRIEF BANK-SETTLEMENT |
| **10** | **Contrato PR-3**: snapshot em todos os domínios + 7 services + remoção do código morto (§8) | `sessao-feature` | passos 2 e 4 | §8 |
| **H** | H1 (PVA), H2 (browser): **humanos** | dono | — | runbooks assinados |

**Linha em branco no RUNBOOK-H2** por tela entregue: cada PR de FE deixa a sua seção em branco. O agente prepara e
não preenche.

## 5. Passo 0 — PR-DOCS (preparado neste worktree; falta o "pode commitar")

1. Conteúdo:
   - `docs/accounting/PLANO-FE-CONTRACT-TYPES-2026-09-28.md` (este);
   - `docs/accounting/PLANO-ONDA1-FE-2026-09-28.md` (emenda de 28/09 tarde no topo);
   - `docs/adr/PRE-ADR-FE-CONTRACT-TYPES.md`;
   - `docs/plano/decisoes/D-2026-09-28-FE-CONTRATO-GERADO-E-FORKS-FE.md`;
   - `docs/plano/nos/FE-CONTRACT-TYPES.md`;
   - fold de `GET-DATA-EXCHANGE-JOBS` (done, #368), `FE-INCR-SPED-SIGNERS`, `FE-INCR-FIXED-ASSETS`,
     `FE-INCR-LALUR-PR2`, `FE-INCR-REVIEW`, `FE-INCR-DELIVERY` e `FE-INCR-BANK-SETTLEMENT`;
   - `docs/operating-manual/GAP-MAP.md` (+2 linhas, D13);
   - `_INDEX.md`/`_ANCORAS.md` regenerados.
2. `node scripts/plano-vault.mjs index && node scripts/plano-vault.mjs check` → exit 0.
3. Commits por assunto:
   - (i) planos + PRE-ADR;
   - (ii) vault (decisão, nó, fold, índice);
   - (iii) GAP-MAP.
4. Push + PR `docs(plano): contrato FE gerado do snapshot + sequência mestre + decisões delegadas de 28/09`.
5. **Conflito provável:** a sessão "GAP-MAP abertos" (ativa) mexe no mesmo arquivo. A resolução é textual: as linhas
   são novas, ao fim da tabela do Nível 3.

## 6. Passo 3 — Contrato PR-1 (gerador + contábil + piloto SPED)

### 6.1 Servidor

1. `cd server && npm i -D -E json-schema-to-typescript@15.0.4`. Conferência: `package.json` sem `^`; `npm ls prettier`
   mostra uma cópia só (a do server). Se aparecer uma aninhada, o D4 continua valendo, porque o `doMock` resolve pelo
   caminho do gerador.
2. Em `server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts` (esqueleto no **Apêndice B**):
   1. topo: `doMock` do prettier (D4) **antes** do `require` do gerador. `import` estático do gerador é proibido,
      porque é içado acima do mock;
   2. `GEN_DIR = path.resolve(__dirname, '../../../../../../my-app/types/contracts/accounting')` (6 níveis até a raiz);
   3. `render(entry)`: banner + `compile(structuredClone(js), toTypeName(name), { bannerComment: '',
      additionalProperties: false, format: false })`, na **ordem das chaves do JSON**;
   4. fonte = `atual` no modo UPDATE, `snapshot` fora dele;
   5. `beforeAll(async)` gera tudo num `Map`. No UPDATE, grava os `.gen.ts` e apaga os órfãos;
   6. asserts novos: `it.each(arquivos)` comparando `eol(read(gen))` com o gerado, e `it('sem .gen.ts órfão')`.
3. Atualizar o cabeçalho do teste: tirar *"comparar os dois exige codegen e está fora"* e pôr a referência ao PRE-ADR.
4. `.gitattributes` (D6).
5. `UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot`:
   - 43 `.gen.ts`;
   - `__dto-shapes__.json` **sem diff** (se mudar, PARE: DTO mudou fora do PR);
   - rodar de novo sem a variável fica verde;
   - **no Windows use `--testPathPatterns`, não caminho posicional** (o Git Bash converte `/…` em caminho do
     Windows; medido hoje).

### 6.2 Frontend (sobre o FE-FIX já mergeado)

6. `cd my-app && npm uninstall zod` (G19).
7. `lib/services/sped.service.ts`:
   - `GenerateEcdPayload`, `GenerateEcfPayload` e `GenerateEcfRealPayload` viram aliases de
     `SpedEcdRequestInput`, `SpedEcfRequestInput` e `SpedEcfRealRequestInput` (`import type` de
     `@/types/contracts/accounting/SpedEcd*.gen`);
   - os rascunhos de tela viram `*Draft`;
   - o comentário "BY HAND" é revogado.
8. Mappers (D7):
   - `toEcdSignerPayload` (do FE-FIX) passa a `(s: EcdSignerDraft): SpedEcdRequestInput['signers'][number]`;
   - `toEcfSignerPayload`, `toDeclarantPayload` e `toBookPayload` **no mesmo formato**;
   - os `handleGenerate*` montam o corpo como **literal anotado** com `signers: drafts.map(toEcdSignerPayload)`;
   - `as` só em folha: `codAssin`, ECF `identQualif`, `uf`, `indNire`…, com o comentário `ponytail:`.
9. Guarda de tipo `my-app/lib/services/__tests__/sped.contract.test.ts` (roda no `npm run test:types`):
   - `// @ts-expect-error` com `identQualif` num signatário J930;
   - `// @ts-expect-error` com `codAssin: '123'`;
   - `// @ts-expect-error` com um `.map` anotado devolvendo chave extra;
   - um objeto válido;
   - um `it` trivial para o vitest aceitar o arquivo.
10. `my-app/CLAUDE.md`, gates de frontend (3 linhas): body tipado por `@/types/contracts/**.gen.ts`; mapper pela regra
    D7; `.gen.ts` nunca se edita, se regenera.
11. GAP-MAP, linha "Evolução assimétrica" (Nível 3): status `[PARCIAL]` → "FE contábil coberto por tipos gerados
    (PR-1); demais domínios no PR-3", com o comando que prova.

### 6.3 Mordidas (protocolo de conserto de gate: vermelho → verde **no mesmo PR**, saída colada no corpo)

12. (i) `foo: z.string()` temporário no `SignerSchema` → snapshot vermelho no JSON **e** no `.gen.ts` → reverter → verde.
13. (ii) Editar uma linha de `SpedEcdDto.gen.ts` → vermelho → reverter.
14. (iii) Pôr `identQualif: ''` no `toEcdSignerPayload` → TS2353 no `npx tsc --noEmit` do my-app → reverter.
15. (iv) Trocar `drafts.map(toEcdSignerPayload)` por um `.map((s) => ({ …, identQualif: '' }))` **sem anotação**
    → **fica verde** (G10). Colar no PR como prova de por que a regra D7 existe, e reverter.
16. Ambiente: rodar o snapshot no Windows local. Declarar no PR que o Linux é provado pela CI.

### 6.4 Gates

17. `cd server && npx tsc --noEmit && npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot`.
18. `cd my-app && npx tsc --noEmit && npm run test:types && npx vitest run && npm run lint:gate && npm run build`.
    A linha de base é a do FE-FIX mergeado (60/322 no relato dele), e o PR-1 soma 1 arquivo.
19. RUNBOOK-H2: linha em branco "gerar ECD, ECF e ECF Real pela tela depois do PR-1".

### 6.5 Pronto e reversão

- **Pronto quando:** os gates 17–18 estão verdes, as 4 mordidas estão coladas e a CI está verde.
- **Reversão:** `git revert` do squash. Nenhum dado persistido muda.

## 7. Passo 4 — Contrato PR-2 (9 services; linhas de `98756906`, reconferir com o Apêndice A)

**Receita por chamada:** tipo gerado → literal anotado ou função `toX()` (D7) → `Pick` quando o parse é composto
(D8) → apagar a interface manual sem uso → `tsc` → **classificar cada erro pelo §10 antes de mexer**.

| Service:linha | Rota | Tipo (`.gen.ts`) | Classe |
|---|---|---|---|
| accounting:661 | POST /accounting/post | `PostEntryInput` (PostingDto) | C1 |
| accounting:668 | POST /accounting/reverse | `ReverseEntryInput` (PostingDto) | C1 |
| accounting:743 | POST /accounting/accounts | `CreateAccountInput` (PostingDto) | C1 |
| accounting:758 | PATCH /accounting/accounts/:id/requires-dimension | `SetAccountRequiresDimensionInput` (PostingDto) | C1 |
| accounting:791 | POST /accounting/:unitId/periods/seed-year | `Pick<SeedYearInput,'unitId'\|'year'>` (PostingDto) | C1 composto |
| accounting:803 | POST /accounting/closing/exercise | `CloseExerciseInput` (ClosingDto) | C1 |
| accounting:810 | POST /accounting/periods/:id/open | — (`openPeriod` sem Zod, GAP-MAP D13) | C3: fica `{ unitId: string }` manual, com comentário apontando a linha do GAP-MAP |
| accounting:817/824 | POST …/soft-close, …/hard-close | `ClosePeriodInput` (PostingDto) | C1 |
| accounting:831 | POST …/reopen | `ReopenPeriodInput` (PostingDto) | C1 |
| accounting:899 | POST …/reconciliation/statements (multipart) | — | C3 multipart |
| accounting:940 | POST …/statements/:id/auto-match | `Pick<AutoMatchStatementInput,'unitId'>` (ReconciliationDto) | C1 composto |
| accounting:958 | POST …/lines/:id/ignore | `Pick<SetLineIgnoredInput,'unitId'\|'ignored'>` | C1 composto |
| accounting:971 | POST …/reconciliation/matches | `ManualMatchInput` (ReconciliationDto) | C1 |
| accounting:981 | POST …/matches/:id/unmatch | `Pick<UnmatchInput,'unitId'\|'reason'>` | C1 composto |
| lalur:185/191/197 | entries create/patch/archive | `CreateLalurEntryInput`/`UpdateLalurEntryInput`/`ArchiveLalurInput` (LalurDto) | C1 |
| lalur:213/219/225 | parte-b create/patch/archive | `CreateLalurParteBAccountInput`/`UpdateLalurParteBAccountInput`/`ArchiveLalurInput` | C1 |
| entryApprovals:89/96/106/116/126 | drafts create/update, submit/approve/reject | `CreateDraftEntryInput`/`UpdateDraftEntryInput`/`SubmitEntryInput`/`ApproveEntryInput`/`RejectEntryInput` (EntryApprovalDto) | C1 |
| dimensions:165/172/182/189 | definitions/values create + archive | `CreateDimensionDefinitionInput`/`CreateDimensionValueInput`/`ArchiveDimensionInput` (DimensionDto) | C1 |
| accountsReceivable:164/171/181/195 | create, receive, cancel, receipts/:id/cancel | `CreateReceivableInput`/`RegisterReceiptInput`/`CancelReceivableInput`/`CancelReceiptInput` (ReceivableDto) | C1 |
| accountsPayable:177/184/194/208 | create, pay, cancel, payments/:id/cancel | `CreatePayableInput`/**`RegisterPaymentInput` de `accounting/PayableDto.gen`** (G5)/`CancelPayableInput`/`CancelPaymentInput` | C1 |
| referential:109/123 | mappings/batch, mappings/copy | `BatchSetReferentialMappingInput`/`CopyReferentialMappingInput` (ReferentialMappingDto) | C1 |
| referential:165 | catalog/import (multipart) | — | C3 multipart |
| dataExchange:123 | imports (multipart) | — | C3 multipart |
| dataExchange:151/161 | jobs/:id/commit, exports | `CommitImportInput`/`ExportRequestInput` (DataExchangeDto) | C1 |
| counterparties:81/88 | create, archive | `CreateCounterpartyInput`/`ArchiveCounterpartyInput` (CounterpartyDto) | C1 |

- **Números:** cerca de 40 chamadas tipadas (C1 + composto) e 4 C3.
- **Revogar** o comentário "BY HAND" do `lalur.service.ts`.
- **RUNBOOK-H2:** linhas em branco para AP, AR, Lalur, Aprovações, Dimensões, Conciliação, Import/Export,
  Referencial e Contrapartes.
- **Gates:** os do §6.4.

## 8. Passo 10 — Contrato PR-3 (todos os domínios + 7 services)

1. Generalizar o coletor **sem mover o teste** (a linha do GAP-MAP aponta para o caminho atual):
   - iterar `src/features/*/dtos/`;
   - JSON por domínio em `features/<d>/dtos/__tests__/__dto-shapes__.json`, com o contábil **inalterado** (zero
     diff);
   - `.gen.ts` em `my-app/types/contracts/<d>/`;
   - `describe` por domínio e piso ≥ 1 schema por domínio;
   - cabeçalho atualizado.
2. `UPDATE_DTO_SNAPSHOT=1 …` e contagem por domínio no PR. G7 é o esperado: 258 schemas em 17 domínios, se nenhum
   DTO mudou até lá.
3. Inventário manual (o mapeador não resolve controller por factory): documents (search, upload, token-cost,
   `PATCH /:id`), dashboard (create, modules/install, ai/ChatInterview), saved-views (create, update) e auth/logout.
   Classificar em C1/C2/C3 lendo o controller.
4. Migrar:

| Service | Tipo(s) | Classe |
|---|---|---|
| crm | `AdvanceStageInput`/`CreateProposalInput`/`RecordNoShowInput`/`ConvertLeadInput` (crm/CrmPipelineDto), `AdvanceOpportunityInput`/`ConvertLeadToOpportunityInput` (crm/CrmOpportunityDto); anexos por `fetch` multipart | C1 ×6, C3 ×1. Depois do fix Porte/Papel (passo 2). `AdvanceStage`/`AdvanceOpportunity` ainda aceitam `stageType`/`status` ignorados (GAP-MAP linhas do CRM): o FE **não** manda |
| sales | `RegisterPaymentInput` **de `sales/RegisterPaymentDto.gen`** (G5), `CancelSaleInput`/`ReturnSaleInput` (sales/SalesCancellationDto) | C1 ×3 |
| user | `CreateUserInput`/`UpdateUserInput`/`UpdatePreferencesInput` (users/UserDto). `types/User.ts` `UpdateUserDto` vira alias; `IUser` é resposta e fica | C1 ×3 |
| auth | `LoginInput`, `CreateUserInput` (users/UserDto) | C1 ×2 |
| savedView, setup, document | conforme o inventário do passo 3. **Remover `triggerQdrantInjection`** (D12) | ? |
| dynamic-table | schema em runtime | **C2, não migra** |

5. RUNBOOK-H2: linhas em branco para CRM, usuários, vendas, login e setup.

## 9. Regra do mapper (D7), com o comportamento medido (G10)

| Forma | Chave extra pega? | Uso |
|---|---|---|
| `const body: XInput = { … }` (literal anotado) | sim | corpo de topo |
| `function toY(d: YDraft): XInput['y'] { return { … }; }` | sim | todo objeto aninhado e todo item de array |
| `drafts.map(toY)` | sim, porque `toY` é anotada | arrays |
| `drafts.map((d): XInput['y'][number] => ({ … }))` | sim | alternativa inline |
| `({ … }) satisfies T` | sim | alternativa inline |
| `drafts.map((d) => ({ … }))` | **não** | **proibido** |
| `{ ...draft, … }` | **não** | **proibido** |
| `as XInput` no objeto | anula tudo | **proibido** |
| `valor as XInput['campo']` em folha string → união | n/a | permitido, com `// ponytail:` |

## 10. Protocolo para cada erro de `tsc` na migração (PR-2 e PR-3)

| O erro mostra | É | Faça |
|---|---|---|
| Chave que o FE manda e o schema não tem (D1) | bug de produção (classe PR-0) | Tirar do mapper, abrir linha no GAP-MAP Nível 3 (CORRIGIDO no PR) e listar no PR |
| Chave obrigatória que o FE não manda (D2) | bug de produção (400 hoje) | Igual. Se a tela não tem o dado, **PARE**: é decisão de produto |
| Valor de tipo diferente | divergência de valor | Mapper sem `as`; `as` só em folha string → união |
| Chave que o **controller** aceita fora do DTO (hoje só SPED, G14) | contrato de fio ≠ DTO | Extensão explícita (D9), nunca `as` |
| O tipo gerado está errado (o JSON Schema não expressa o Zod) | limite do gerador | **PARE** e reporte com o schema |

## 11. Riscos

**Fechados nesta sessão, com evidência:** gerador no Jest (G8 + G9); domínios fora da contabilidade (G7); lint e
`tsc` do FE com os gerados (G11); determinismo e fim de linha (G2, G3, D6); mordida além de um schema (G1 + G10: toda
interface sem assinatura de índice recusa chave extra em literal anotado, e o G12 lista exatamente onde há assinatura);
F-C12-4 (G14); rota `qdrant` (G16); PR-0 duplicado (G15, D14); risco de ESM do prettier (G8).

**Residuais aceitos:**
- Os tipos de JSON livre (G12) não mordem dentro do blob.
- As rotas multipart e o `openPeriod` ficam fora.
- As linhas citadas mudam se a `main` mexer nesses services antes do PR; o Apêndice A reconfere em minutos.
- A sessão paralela do CRM e a do FE-FIX podem mudar a ordem real; o passo 3 **só começa com o FE-FIX em `main`**.

**Vieses meus:**
- A solução do snapshot e várias decisões delegadas partiram de mim.
- A mordida do PR-1 foi desenhada por quem desenhou a regra. O passo 15 (mordida iv) existe para provar a regra
  contra a forma que a quebra, não só a favor.

## 12. Fora de escopo (com motivo)

- **Query strings e respostas** (D11).
- **OpenAPI gerado do Zod** (G17): a frente é própria e não foi autorizada. Fica registrado no GAP-MAP.
- **FE-INCR-FIXED-ASSETS e a fatia NF-e `classId`** (PLANO-PENDENCIAS §B2): forks decididos (D16), mas o nó não tem
  `autorizacao`. Precisa do "planeje" ou "executa" do dono.
- **H1/H2:** gates humanos.

## Apêndice A — mapeador de rotas de escrita (v2, pega parse composto)

Uso: salve no seu scratchpad e rode com `MSYS_NO_PATHCONV=1 node map-writes.js server/src /accounting,/payables`. No
Git Bash, o prefixo `/…` vira caminho do Windows sem a variável.

```js
const fs = require('fs'), path = require('path');
const SRC = path.resolve(process.argv[2]); const WANT = (process.argv[3] || '').split(',').filter(Boolean);
const read = (p) => fs.readFileSync(p, 'utf8');
const resolveTs = (from, spec) => { const b = path.resolve(path.dirname(from), spec); return [b + '.ts', path.join(b, 'index.ts')].find((x) => fs.existsSync(x)); };
const idxFile = path.join(SRC, 'routes', 'index.ts'); const idx = read(idxFile);
const imports = {}; for (const m of idx.matchAll(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g)) imports[m[1]] = m[2];
const mounts = [...idx.matchAll(/router\.use\(\s*['"]([^'"]+)['"]\s*,\s*(\w+)/g)].map((m) => ({ prefix: m[1], spec: imports[m[2]] }));
const handlerBody = (file, name) => { const src = read(file); const m = new RegExp(`export\\s+(?:const|async\\s+function|function)\\s+${name}\\b`).exec(src); if (!m) return null; const rest = src.slice(m.index + 1); const n = rest.search(/\nexport\s+(?:const|async\s+function|function)\s+\w+/); return src.slice(m.index, n < 0 ? src.length : m.index + 1 + n); };
for (const { prefix, spec } of mounts) {
  if (!spec || (WANT.length && !WANT.includes(prefix))) continue;
  const rf = resolveTs(idxFile, spec); if (!rf) continue; const rsrc = read(rf); const origin = {};
  for (const m of rsrc.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) { const f = resolveTs(rf, m[2]); for (const part of m[1].split(',')) { const [o, a] = part.trim().split(/\s+as\s+/); if (o) origin[(a || o).trim()] = { file: f, name: o.trim() }; } }
  for (const m of rsrc.matchAll(/router\.(post|put|patch)\(\s*['"]([^'"]+)['"]\s*,([\s\S]*?)\);/g)) {
    const args = m[3].split(',').map((s) => s.trim()).filter(Boolean); const h = args[args.length - 1]; const o = origin[h];
    const body = o && o.file ? handlerBody(o.file, o.name) : null;
    // v2: pega parse(req.body), parse(body) E parse({ ...req.body, … }) / parse({ unitId: body?.unitId, … })
    const schemas = body ? [...new Set([...body.matchAll(/(\w+Schema)\.(?:safeParse|parse)\(\s*(?:req\.body|body\b|\{)/g)].map((x) => x[1]))] : [];
    const semZod = body && !schemas.length && /req\.body/.test(body) ? ' ⚠ lê req.body sem Zod' : '';
    console.log(`${m[1].toUpperCase()} /api${prefix}${m[2] === '/' ? '' : m[2]} | ${h} | ${o && o.file ? path.relative(SRC, o.file) : 'NÃO RESOLVIDO (factory?)'} | ${schemas.join(' + ') || '(sem schema)'}${semZod}`);
  }
}
```

## Apêndice B — esqueleto das mudanças no `dtoShapeSnapshot.test.ts` (PR-1)

```ts
// (topo, antes de qualquer uso do gerador) D4 — prettier 3 faz import() no require e derruba o Jest (G8).
const JSTT = require.resolve('json-schema-to-typescript');
const PRETTIER = require.resolve('prettier', { paths: [path.dirname(JSTT)] });
jest.doMock(PRETTIER, () => ({ format: () => { throw new Error('prettier desligado: gerador roda com format:false'); } }));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { compile } = require(JSTT) as typeof import('json-schema-to-typescript');

const GEN_DIR = path.resolve(__dirname, '../../../../../../my-app/types/contracts/accounting');
const BANNER = '// GERADO por server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts — NÃO EDITE.\n'
  + '// Mudou um DTO? UPDATE_DTO_SNAPSHOT=1 npx jest --selectProjects unit --testPathPatterns dtoShapeSnapshot e comite o diff.\n';
const toTypeName = (n: string) => n.replace(/Schema$/, '') + 'Input';
const genFile = (f: string) => path.join(GEN_DIR, f.replace(/\.ts$/, '.gen.ts'));
const eol = (s: string) => s.replace(/\r\n/g, '\n');
async function render(entry: Record<string, unknown>): Promise<string> {
  let out = BANNER;
  for (const [name, js] of Object.entries(entry)) {
    out += await compile(structuredClone(js) as Parameters<typeof compile>[0], toTypeName(name), { bannerComment: '', additionalProperties: false, format: false });
  }
  return out;
}
const UPDATE = process.env.UPDATE_DTO_SNAPSHOT === '1';
const fonte: ShapeMap = UPDATE ? atual : snapshot;
const gerado = new Map<string, string>();
beforeAll(async () => {
  for (const f of Object.keys(fonte)) gerado.set(f, await render(fonte[f]));
  if (!UPDATE) return;
  fs.mkdirSync(GEN_DIR, { recursive: true });
  for (const [f, txt] of gerado) fs.writeFileSync(genFile(f), txt);
  const esperados = new Set([...gerado.keys()].map((f) => path.basename(genFile(f))));
  for (const g of fs.readdirSync(GEN_DIR)) if (g.endsWith('.gen.ts') && !esperados.has(g)) fs.rmSync(path.join(GEN_DIR, g));
});
// dentro do describe existente:
it.each(Object.keys(fonte))('%s: o .gen.ts do FE bate com o snapshot', (file) => {
  const p = genFile(file);
  expect(fs.existsSync(p) ? eol(fs.readFileSync(p, 'utf8')) : 'GEN AUSENTE — rode UPDATE_DTO_SNAPSHOT=1 e comite my-app/types/contracts')
    .toBe(gerado.get(file));
});
it('não há .gen.ts órfão em my-app/types/contracts/accounting', () => {
  const esperados = new Set(Object.keys(fonte).map((f) => path.basename(genFile(f))));
  const orfaos = fs.existsSync(GEN_DIR) ? fs.readdirSync(GEN_DIR).filter((g) => g.endsWith('.gen.ts') && !esperados.has(g)) : [];
  expect(orfaos).toEqual([]);
});
```
