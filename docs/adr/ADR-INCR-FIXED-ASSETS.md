# ADR-INCR-FIXED-ASSETS — Imobilizado + depreciação + retificação versionada de ECD/ECF

- **Data:** 2026-09-15
- **Status:** **Proposed → parecer anexado 2026-09-15 (§4): D1–D11 confirmados com refinamentos,
  F-FA1..F-FA9 todos com recomendação ⇒ ratificados por delegação (cédula 2026-09-14, C8).** Próximo: o BRIEF
  `docs/accounting/BE-INCR-FIXED-ASSETS-brief.md` via `sessao-planejamento`. Forks (§3) **com
  recomendação escrita no parecer ficam ratificados por delegação** (cédula 2026-09-14, linha C8);
  fork **sem recomendação volta ao dono** por questionário. Nenhum código abre antes do BRIEF.
- **Autores:** `luminaris-orchestrator` (este texto) + `luminaris-accounting-architect` (parecer §4).
- **Depende de:** nenhuma aresta de código aberta (nó **C8**, `plan` no
  `GRAFO-DEPENDENCIAS-2026-09-14.md`; D3b ✅ Anexo III no corpus). Assume como já mergeado: ledger
  (`PostingService` + gate de período dentro da tx), INCR-6 (`AccountingDataExchangeJob`),
  ADR-INCR-SPED-ECD/ECF (geração), ECF Fase 3C Parte B (`LalurParteB*`, PR #316), X6 (`FiscalProfile`
  + parser NF-e com CFOP, PR #328), F7 (`AccountingScopeSettings`, PR #326), CashFlow
  (`INVESTING_ASSET_CODE_PREFIXES`). Depende de **dado externo**: contas do plano (imobilizado por
  classe, depreciação acumulada, despesa de depreciação) e taxas praticadas — pedido ao contador,
  Passo 11 (h).
- **Nó do master map:** `ACCOUNTING-MASTER-MAP.md` §5 linha *"Imobilizado + depreciação
  (`ADR-INCR-FIXED-ASSETS`, nomeado no §5 desde julho e nunca aberto) — ⚫→⏳ autorizado a abrir ADR
  2026-09-03 (F-Z0, camada zero)"*; §5.1 item 12 (*"Imobilizado segue ⚫ diferido — ADR próprio"*);
  §7.1 linha C8. Traz junto o item **retificação de ECD/ECF** (§5: *"quem escritura, retifica"*;
  master map linha 902 lista os dois como pendentes do trilho contábil).

## Autorização citável (ORCH-006)

1. **F-Z0** (`CEDULA-DECISAO-2026-09-03-modulos.md`), consequência (1): *"**imobilizado + depreciação**
   viram frente autorizada (`ADR-INCR-FIXED-ASSETS`, já nomeado no §5 do master map), **acima** de
   EFD-Contribuições por sobrevivência"*; consequência (2): *"**retificação de ECD/ECF** entra na
   lista"*. Palavras do dono que abriram F-Z0: *"substituir completamente todo o processo manual de
   contabilidade e exportar para contador apenas assinar o trabalho pronto"*.
2. **Master map §5** (linha "Imobilizado + depreciação"): *"autorizado a abrir ADR 2026-09-03 (F-Z0,
   camada zero) … não existe empresa no Lucro Real sem imobilizado, então 'só atendemos quem não
   deprecia' seria lista vazia. 0 linhas no repo."*
3. **Cédula 2026-09-10** (entrevista de fechamento), respostas **6** e **7** — decisões já tomadas, não
   forks: (6) *"Tabela de taxas **editável por tenant**, semeada do Anexo III da IN 1.700/2017, com
   link da fonte na tela. Não hardcode"*; (7) *"Retificação **versionada**: o arquivo entregue
   anteriormente é preservado e permanece consultável."*
4. **Cédula 2026-09-14** (`CEDULA-DECISAO-2026-09-14-forks-ratificacoes.md`, linha C8): *"ratificação
   por delegação **condicionada** … fork **com recomendação escrita no parecer** fica ratificado sem
   voltar ao dono; fork **sem recomendação** volta"*. Ordem: `CEDULA-DECISAO-2026-09-14-gates-humanos.md`
   §5 *"C11 → C12 → C6b → C8 ADR"* (C11/C12/C6b ✅ #321/#322/#324).
5. **`PROXIMOS-PASSOS-2026-09-14.md` Passo 10** (10.1 ADR → 10.2 parecer → 10.3 BRIEF), dentro de
   *"Pode orquestrar os proximos passos"* (dono, 2026-09-14).

## TLDR (2 linhas)

Imobilizado é **Prisma first-class** (`FixedAsset` + `DepreciationRate` por tenant semeada do Anexo
III) e a depreciação mensal é um **`JournalEntry` idempotente por ativo×mês** postado pelo
`PostingService` existente (gate de período já dentro da tx) — nunca um saldo calculado à parte do
razão. Retificação de ECD/ECF é um **job novo que aponta para o substituído** (`supersedesJobId`),
com o arquivo anterior preservado; o Termo de Verificação (ECD substituta, art. 8º IN 2.003) é gate
humano de runbook, nunca preenchido pelo sistema. Oito forks em §3, cada um com recomendação e custo
de errar — o parecer do arquiteto confirma/contesta e o que ficar sem recomendação vai ao dono.

---

## 1. Evidência (CBM-001 — grafo localiza, código/corpus confirma)

| Claim | Grau | Evidência |
|---|---|---|
| **0 linhas de imobilizado no repo**: `grep -c -iE "model FixedAsset\|Depreciation" server/prisma/schema.prisma` = 0; nenhum service/route com "imobilizado"/"depreciação" | verificado | grep nesta sessão sobre `origin/main` = `fb7ae649` |
| A única semântica de "ativo de investimento" hoje é o prefixo de conta `1.2` no fluxo de caixa (`INVESTING_ASSET_CODE_PREFIXES = ['1.2']`) — compra de imobilizado que debite conta `1.2.*` já cai em *investing* sem código novo | verificado | `server/src/features/accounting/services/CashFlowReportService.ts:28,72` |
| `JournalEntry` tem `sourceType` (default `manual`) + `@@unique([userId, unitId, sourceType, sourceId])` — a chave de idempotência canônica do ledger; `SourceDocument.sourceType` é taxonomia viva (`crm.opportunity.won \| sale.* \| IMPORT_*`) | verificado | `server/prisma/schema.prisma:531,553,796` |
| `PostingService.postEntry` roda `assertPeriodOpen` como preflight **e** `assertPeriodOpenTx` dentro de `runTransaction` (gate autoritativo na tx); status de período = `FUTURE/OPEN/SOFT_CLOSED/HARD_CLOSED` | verificado | `PostingService.ts:83,114-117,323`; `schema.prisma:347-353` |
| ECD: o DTO **já expõe** `declarant.indFinEsc` (`'0'\|'1'`, default `'0'`) e `declarant.codHashSub` (opcional), e `SpedGenerationService` os repassa ao `lib/sped.ts` (registro 0000) — mas **nada liga o job substituto ao substituído** nem valida que `codHashSub` seja informado quando `indFinEsc='1'` | verificado | `dtos/SpedEcdDto.ts:46-47`; `services/SpedGenerationService.ts:366-367`; `lib/sped.ts:160,174,194` |
| ECF: `lib/ecf.ts` suporta `retificadora` (`'N'` default) e `NUM_REC` (vazio quando `'N'`), mas **nenhum DTO de ECF (`SpedEcfDto`/`SpedEcfRealDto`) expõe** esses campos — geração é sempre original | verificado | `lib/ecf.ts:114,125-127,142`; `grep retificadora\|numRec dtos/SpedEcf*.ts` vazio |
| `AccountingDataExchangeJob` tem `kind`/`status` como `String` (sem enum de banco), `sha256`, `storageKey`, `periodStart`, `periodEnd` — versionar = **job novo** apontando para o anterior, sem migração de enum | verificado | `schema.prisma:615-638` |
| Parser NF-e expõe `cfop` por item (I08) — CFOP `1551`/`2551` (compra para ativo imobilizado, dentro/fora do estado) é discriminável na importação; **nenhuma ocorrência de `1551`/`2551` no código hoje** | verificado | `server/src/lib/nfe.ts:54,236`; grep vazio |
| Parte B do e-Lalur/e-Lacs é persistida (`LalurParteBAccount` com `codCtaB`, `codPbRfb`, `codTributo`, `saldoIniCents`; `LalurParteBMovement`; fechamento trimestral) — a exclusão do art. 124 §4 tem onde viver | verificado | `schema.prisma:1509-1603`; PR #316 |
| `AccountingScopeSettings` (F7) é o lugar canônico de "conta configurada por tenant vinda do contador" (`bankChargeExpenseAccountId` etc., FK `Restrict`) — as contas de depreciação seguem o mesmo padrão | verificado | `schema.prisma:1337-1349` |
| **IN RFB 1.700/2017** arts. 121–125 (corpus `fontes-oficiais/IN-RFB-1700-2017.txt`, linhas 2504–2590): art. 121 §2 dedutível a partir de instalado/posto em serviço; **§3 acumulado ≤ custo de aquisição**; §4 imprestável → redução do ativo; §6 quota não deduzida não se recupera depois; art. 122 §ú **I terrenos não depreciam** (salvo melhoramentos), I-b edificação destacada do terreno (laudo); art. 123 **§2 quotas mensais, dispensado o ajuste no mês** de entrada/baixa; art. 124 **§1 prazo = Anexo III, taxa diferente exige prova**; **§3 conjunto sem especificação → taxa do bem de maior vida útil**; **§4 quota contábil < fiscal → diferença excluída na Parte B**; §5 ao atingir o custo, adiciona e baixa a Parte B | verificado | leitura integral nesta sessão |
| **Anexo III** (`IN-RFB-1700-2017-anexos/43557-tabela.html`, sha `d526ac53071a`, MANIFEST linha 80): 260 linhas × 4 colunas (`Referência NCM \| Bens \| Prazo (anos) \| Taxa anual`); 2 linhas sem NCM (`INSTALAÇÕES` 10 anos/10%, `EDIFICAÇÕES` 25 anos/4%); linhas de capítulo sem taxa; demais = NCM 4 dígitos + prazo + taxa | verificado | parse nesta sessão (`rows 260`) |
| **IN RFB 2.003/2021** art. 8º: ECD autenticada só substituída por erro **não corrigível por lançamento extemporâneo** (ITG 2000 itens 31–36); §1 exige **Termo de Verificação para Fins de Substituição** (identificação da substituída, descrição dos erros, registros afetados, autorização de acesso ao CFC); §2 assinado pelo profissional que assina os livros substitutos | verificado | corpus `IN-RFB-2003-2021-ECD.txt:83-95` |
| **IN RFB 2.004/2021** art. 7º: retificadora **substitui integralmente** a ECF; §3 se altera saldos da Parte B, retifica anos posteriores; §4 hipóteses sem efeito (DAU/procedimento fiscal); **art. 8º ECD substituta que altere saldos recuperados ⇒ ECF retificadora obrigatória**; art. 9º lançamento extemporâneo que altere base ⇒ ECF retificadora do ano; art. 10 ⇒ DCTF retificadora | verificado | corpus `IN-RFB-2004-2021-ECF.txt:73-105` |
| Resposta 6 do dono (10/09): tabela editável por tenant, semeada do Anexo III, link da fonte na tela, **não hardcode**; resposta 7: retificação versionada, anterior preservado | verificado | `CEDULA-DECISAO-2026-09-10-entrevista.md:43-44` |
| Memória do projeto: tabela transcrita de lei → conferir a **redação vigente**, não a original (Lei 10.485 art. 1º mordeu em X6, ERRATA). Aplicado aqui: no JSON multivigente da IN 1.700 o Anexo III tem **dois binários** — `43237` (original, `tachado: true`, `compilado: false`) e **`43557` (versão 2, `compilado: true` = vigente)**; o arquivo do corpus é o `43557`. Após a tabela há **Notas (1)–(3)** no corpo da IN, fora do HTML: (1) fornos para vidro NCM 8417 → 3 anos/33,3%; (2) máquinas/instalações industriais na **indústria química** → 5 anos/20%; (3) acessórios e partes só depreciam quando incorporados ao bem, integrando a base dele | verificado | segmentos `ordemSegmentoAto` 2443–2452 do `IN-RFB-1700-2017.json`, lidos nesta sessão |

**Tradução aspiracional → projeto:** não há `LegalEntity`/`Establishment`; o imobilizado é do
`AccountingScope` (`userId`+`unitId`), igual a `Account`/`JournalEntry`/`Payable`. "Empresa" no texto
das INs = escopo contábil aqui.

---

## 2. O que este ADR decide vs. o que fica em fork

### Decidido (não-fork — decorre da evidência acima e das respostas 6/7)

- **D1 — Prisma first-class, nunca DynamicTable.** `FixedAsset`, `DepreciationRate` e o registro de
  cada quota são entidades com invariante fiscal (art. 121 §3, art. 124) — classe de `Account`/
  `JournalEntry`, não formulário do usuário (Contrato §2.1; memória
  `new-modules-use-prisma-not-dynamictable`). Cadeia completa Route → Controller → Service
  (`FixedAssetService`, `DepreciationService`) → Repository → Prisma, Policy própria
  (`canManageFixedAssets`, deny-by-default), DTO Zod, soft-delete.
- **D2 — A quota mensal é um `JournalEntry` postado pelo `PostingService` existente**, com
  `sourceType = 'fixed_asset.depreciation'` e `sourceId = '<assetId>:<YYYY-MM>'` — o `@@unique`
  existente fecha a idempotência (rodar o mês duas vezes = P2002 tratado como "já postado", nunca
  segunda quota). Gate de período é o **já existente** dentro da tx (`assertPeriodOpenTx`); mês
  `HARD_CLOSED` → `AccountingPeriodNotOpenError`, sem bypass. Lançamento: D despesa de depreciação /
  C depreciação acumulada (conta retificadora de ativo). **Nunca** um saldo de depreciação mantido
  fora do razão: o valor contábil do bem é `custo − Σ quotas postadas`, lido do ledger.
- **D3 — Quota mensal = `custo depreciável × taxa anual ÷ 12`, mês de ativação e mês de baixa
  contam inteiros** (art. 123 §2 — "dispensado o ajuste da taxa para os bens postos em funcionamento
  ou baixados no curso do mês"). Começa no mês em que `activatedAt` cai (art. 121 §2: instalado/posto
  em serviço — **não** a data da NF). Última quota é truncada para que **Σ quotas ≤ custo** (art. 121
  §3) — invariante checado **dentro da tx**, contra as quotas já postadas no ledger, não contra um
  contador em memória (memória `authoritative-gate-inside-tx`).
- **D4 — `DepreciationRate` é tabela por tenant, semeada do Anexo III, editável, com a fonte.** Cada
  linha guarda `ncmPrefix` (4 dígitos; `null` para INSTALAÇÕES/EDIFICAÇÕES), `description`, `lifeYears`,
  `annualRateBp` (taxa em basis points — inteiro, nunca float), `source` (`'ANEXO_III_IN_1700_2017'` \|
  `'CUSTOM'`), `sourceUrl` (link do gov.br gravado no seed, exibido na tela — resposta 6), `sourceSha256`
  (`d526ac53071a…` do MANIFEST). Editar = linha `CUSTOM` com `justification` **obrigatória** quando a
  taxa difere da do Anexo III para o mesmo NCM (art. 124 §1: "desde que faça prova dessa adequação") —
  o sistema não julga a prova, só a exige e a guarda. Seed é idempotente por `(scope, ncmPrefix, source)`.
  Linhas de capítulo (sem taxa) **não** são semeadas. As **Notas (1)–(3)** do Anexo (vidro 8417 → 33,3%;
  indústria química → 20%; partes/acessórios só quando incorporados) entram como linhas `source='ANEXO_III_NOTA_N'`
  que o operador escolhe explicitamente — o sistema **não** infere "indústria química" de nada.
- **D5 — Baixa/alienação é comando próprio (`dispose`), nunca `PATCH status`.** Posta um
  `JournalEntry` (`sourceType='fixed_asset.disposal'`, `sourceId=assetId`) que zera custo e depreciação
  acumulada e leva a diferença a resultado (ganho/perda na alienação; art. 121 §4 para imprestável).
  Ativo vira `DISPOSED` (terminal); quota do mês da baixa entra inteira (D3). Soft-delete de
  `FixedAsset` só antes da primeira quota postada; depois, só `dispose`.
- **D6 — Diferença contábil × fiscal vai para a Parte B pelo caminho já existente.** Se a taxa
  contábil praticada for **menor** que a fiscal (art. 124 §4), a diferença é exclusão com registro em
  `LalurParteBAccount`/`Movement` (PR #316); ao atingir o custo, adição + baixa da Parte B (§5). O
  **default** é taxa contábil = fiscal (Anexo III), logo diferença zero e nenhuma Parte B — o caminho
  só acorda quando F-FA4 (residual) ou F-FA8 (override contábil) o ligar.
- **D7 — Contas vêm do contador, configuradas por tenant, nunca hardcoded.** `AccountingScopeSettings`
  (padrão F7) ganha as contas necessárias — mínimo: despesa de depreciação, e por **classe** de ativo
  a conta de custo (`1.2.x`) e a de depreciação acumulada (F-FA6 decide a granularidade). Sem conta
  configurada, `activate`/`runMonth` falham com `ValidationError` nomeando a conta ausente — nunca
  postam em conta "genérica". Item (h) do pedido ao contador (Passo 11).
- **D8 — Retificação é um job novo que aponta para o substituído; o anterior nunca muda.**
  `AccountingDataExchangeJob.supersedesJobId` (self-FK nullable, `onDelete: Restrict`). O job
  substituído permanece `EXPORTED`, `storageKey`/`sha256` intactos, listado e baixável (resposta 7).
  ECD substituta: `indFinEsc='1'` **exige** `codHashSub` (DTO `superRefine` — hoje é opcional
  desacoplado) e `supersedesJobId`; ECF retificadora: DTOs de ECF passam a expor `retificadora='S'`
  + `numRec` (obrigatório quando `'S'`) + `supersedesJobId`. `codHashSub`/`numRec` são dados do
  **recibo** do PVA/Sped — entrada humana, nunca calculados pelo sistema (o `sha256` do job **não é**
  o hash do Sped).
- **D9 — Termo de Verificação (art. 8º §1 IN 2.003) é gate humano.** O sistema gera a ECD substituta
  só depois de um runbook assinado (`docs/operating-manual/RUNBOOK-FORMAT.md`) com o Termo anexado
  como evidência colada; o agente **prepara o runbook em branco** (CLAUDE.md: "não pode preencher
  evidência, marcar desfecho nem assinar"). O job substituto guarda `verificationTermRef` (referência
  ao runbook/arquivo), não o texto.
- **D10 — Auditoria: eventos `fixed_asset.activated` / `depreciation.posted` / `fixed_asset.disposed` /
  `sped.ecd_substituted` / `sped.ecf_rectified` entram na allowlist fechada (`auditCanonical.ts`) com
  payload de ids/centavos/hash — sem PII; qualquer campo novo de PII exige teste-guarda no mesmo PR
  (memória `accounting-audit-allowlist-guards`).
- **D11 — Tenancy:** todo `find` é por `(scope, id)`; ativo/taxa de outro escopo = `NotFoundError`,
  nunca `ForbiddenError` (padrão `findJobById(scope, id)`).

### Fora de escopo deste ADR (nomeado, não esquecido)

- Amortização de intangível (art. 126) e exaustão — mesma máquina, ADR/BRIEF próprios depois.
- Impairment (CPC 01), reavaliação, arrendamento (CPC 06) — não são da IN 1.700 e não entram.
- CIAP (crédito de ICMS de ativo em 48 parcelas) e crédito de PIS/COFINS sobre depreciação
  (Lei 10.833 art. 3º VI) — gancho com X6 (`FiscalProfile`), fora deste incremento; nomeado para o
  contador (Passo 11 h).
- Depreciação acelerada incentivada (Parte B própria) — só a "por turnos" é fork aqui (F-FA2).
- DCTF retificadora (art. 10 IN 2.004) — obrigação humana derivada, fora do sistema.

---

## 3. Forks (cada um com recomendação → ratificado por delegação se o parecer a confirmar)

**F-FA1 — Granularidade do registro (art. 124 §3):**
- **(a) Recomendado — um `FixedAsset` por bem**, com `quantity` opcional só para bens idênticos
  adquiridos na mesma NF (mesmo custo unitário, mesma taxa). Custo de errar: cadastro mais verboso;
  ganho: cada bem tem sua taxa, sua ativação e sua baixa — nunca cai na regra punitiva do §3 (conjunto
  sem especificação → taxa do bem de **maior** vida útil, i.e. menor dedução).
- (b) Registro por conjunto/instalação com taxa média justificada — modela o §3 literalmente, mas exige
  guardar a justificativa da taxa média e o sistema não tem como validá-la.
- **Recomendação:** (a).

**F-FA2 — Método:**
- **(a) Recomendado — linear único no MVP**, `annualRateBp` fixo por ativo (copiado da tabela na
  ativação, não referência viva — mudar a tabela depois não muda o bem já ativado).
- (b) Também acelerada por turnos (coeficiente 1,5 / 2,0 para 2 ou 3 turnos — art. 69 da Lei
  3.470/58 via IN 1.700, não lido no corpus nesta sessão): campo `shiftCoefficient` multiplicando a
  taxa. Custo de errar se **não** existir: cliente industrial com 2 turnos deduz menos do que pode.
- **Recomendação:** (a). **[emenda pós-parecer]** Sem coluna reservada `shiftCoefficient` — o parecer
  contestou (coluna sem lógica = param aceito-e-ignorado); quando (b) vier, é 1 coluna + 1 multiplicação.

**F-FA3 — Entrada do bem: NF-e (CFOP 1551/2551) × manual:**
- (a) Só manual — cadastro pela tela; a NF-e de compra com CFOP 1551/2551 hoje cairia no fluxo de
  compra/estoque de X6, o que é **errado** para imobilizado (não é estoque nem despesa).
- **(b) Recomendado — manual + NF-e cria rascunho:** a importação de NF-e (X6) roteia item com CFOP
  `1551`/`2551` para a conta de imobilizado da classe (D `1.2.x` / C fornecedor, sem estoque) e cria
  `FixedAsset` em `PENDING_ACTIVATION` com custo = valor do item + IPI/frete não recuperáveis,
  `sourceDocument` = a NF-e. **Nada deprecia até `activate` humano** informar `activatedAt` (art. 121
  §2). Custo de errar: 1 branch a mais no `NfeCostService` de X6 — mas é o único caminho que impede a
  NF de ativo virar CMV/estoque em silêncio (memória `param-aceito-e-ignorado-e-bug`: CFOP lido e
  ignorado é bug).
- **Recomendação:** (b).

**F-FA4 — Valor residual:**
- **(a) Recomendado — campo `residualValueCents` existe, default 0.** Base depreciável contábil =
  custo − residual; base fiscal = custo integral (art. 123: "sobre o custo de aquisição"). Residual
  ≠ 0 ⇒ quota contábil < fiscal ⇒ D6 (Parte B) acorda. Custo de errar: quem preencher residual sem a
  Parte B implementada deduz a menor — por isso D6 é decidido, não fork.
- (b) Sem residual (base = custo sempre) — mais simples, mas fere CPC 27 §53 para quem quiser
  escrituração societária correta; "só atendemos quem não tem residual" é a mesma lista vazia de F-Z0.
- **Recomendação:** (a).

**F-FA5 — Terrenos e edificações (art. 122 I-b e §ú I):**
- **(a) Recomendado — classe `LAND` com `depreciable=false`** (nunca gera quota; `runMonth` a ignora
  explicitamente, com teste); compra de imóvel = **dois** `FixedAsset` (terreno + edificação), o rateio
  informado pelo humano (laudo, art. 122 I-b) — o sistema exige os dois valores, não deduz.
- (b) Um ativo com `landPortionCents` — menos linhas, mas a baixa parcial (vender só a construção)
  fica torta.
- **Recomendação:** (a).

**F-FA6 — Conta de depreciação acumulada: por classe × por bem:**
- **(a) Recomendado — por classe** (`FixedAssetClass` com `costAccountId` + `accumulatedDepreciationAccountId`,
  ambos FK `Restrict`, configurados via `AccountingScopeSettings`/tela de classes). O razão por bem sai
  do `sourceId` do lançamento (`assetId`), não de uma conta por bem — o plano de contas não explode
  (K155 da ECD lista contas, não bens).
- (b) Conta por bem — auditoria contábil clássica, mas cria 2 contas por ativo no chart, mordendo o
  K155/J100 e a tela de plano de contas.
- **Recomendação:** (a).

**F-FA7 — ECF retificadora quando há ECD substituta (art. 8º IN 2.004):**
- (a) Automática — gerar a ECF retificadora no mesmo comando da ECD substituta.
- **(b) Recomendado — comando explícito com pendência obrigatória:** gerar ECD substituta (D8/D9)
  marca o exercício com `ecfRectificationRequired=true` (na `LalurProcess`/job) e **bloqueia** o pacote
  ao contador (ADR-CONTADOR-DELIVERY, F-CD7) até a ECF retificadora ser gerada com `numRec` do recibo
  anterior. Automático é impossível de fazer certo: `NUM_REC` vem do recibo humano, e o art. 7º §4
  tem hipóteses em que a retificadora **não produz efeito** — decisão do contador, não do sistema.
- **Recomendação:** (b).

**F-FA8 — Taxa contábil diferente da fiscal (override por ativo):**
- (a) Não existe — taxa única (a da tabela) para contábil e fiscal; Parte B só acorda por residual.
- **(b) Recomendado — `bookAnnualRateBp?` opcional por ativo**, com `justification` obrigatória;
  quando presente e **menor** que a fiscal, a diferença mensal vai à Parte B (D6) no fechamento
  trimestral já existente (PR #316). Quando **maior** que a fiscal, a diferença é **adição** (não
  dedutível) — mesma máquina, sinal oposto. Custo de errar em (a): empresa que segue vida útil
  econômica (CPC 27) não consegue escriturar no sistema — de novo a lista vazia.
- **Recomendação:** (b), **no mesmo incremento** que D6 (senão é campo aceito-e-ignorado).

**F-FA9 — Execução da quota mensal: comando × job agendado:**
- **(a) Recomendado — comando `POST /fixed-assets/depreciation/run` com `{ yearMonth }`**, idempotente
  (D2), executado pelo operador no fechamento do mês (mesmo lugar em que hoje se fecha o período). Sem
  cron: o projeto não tem scheduler de posting e "quota postada sem ninguém olhar" num mês errado é
  exatamente o art. 121 §6 (não se recupera depois).
- (b) Job agendado no dia 1 — conveniente, mas posta em período que pode ainda estar recebendo
  lançamentos e sem humano no laço.
- **Recomendação:** (a); (b) como gancho futuro se o fechamento de período ganhar automação.

---

## 4. Parecer do `luminaris-accounting-architect` (2026-09-15)

**Bloco do roadmap:** 2 núcleo (subrazão) + 7 compliance (retificação).
**Já existe no projeto?** Tudo o que D2/D6/D8 reusam está mergeado e foi **lido**, não suposto:
- `PostingService.postEntry` é idempotente **por desenho**: lado de leitura `findBySource(scope, sourceType, sourceId)` devolve o entry existente (`PostingService.ts:303-311`) e o lado de escrita re-busca em P2002 sobre `@@unique([userId,unitId,sourceType,sourceId])` (`:446-453`). → **D2 não precisa de guarda própria**; o BRIEF **não** deve inventar uma segunda idempotência (memória `orchestration-service-tx-repo-smell`).
- Parte B já tem movimentos `origem='system'` que o fechamento trimestral **substitui** por tributo (`LalurService.ts:838`, PF/BC derivado, F-3C-2 a) e o vínculo `LalurEntryJournalEntry` (M312/M362, `:239`) exige `journalEntryId` POSTADO. → **D6 tem mecanismo pronto** — a diferença de depreciação é mais um movimento `system` substituído no fechamento, e o vínculo M312 aponta para os entries de quota. Isto é o motivo técnico para **um entry por ativo×mês** (§3 F-FA1/D2): o M312 liga ajuste a lançamento, e um entry agregado do mês não deixaria ligar o ajuste do bem X ao lançamento do bem X.
- `NfeImportService` (X6) já computa custo D3 e rateia por item com `FiscalProfileService` injetado (`NfeImportService.ts:9,26,71`); o `cfop` está no parser (`lib/nfe.ts:54`) mas **nenhum service o lê** — F-FA3 (b) é o primeiro consumidor.
- `MAX_CENTS = 2_147_483_647` é **política de posting** (`models/money.ts:20`, `PostingService.ts:220`): linha acima de R$ 21.474.836,47 → `MaxCentsExceededError` (400). Persistência é `BigInt` desde #245 (memória `max-cents-e-politica-nao-persistencia`).

**Colisão com decisão commitada?** **NÃO.** Sem torre `LegalEntity` (tenancy = `AccountingScope`), sem PG, sem DynamicTable, sem reabertura de D7 do ADR-INCR-SPED-ECD (geração continua livre de status de período; o gate novo de D8/D9 é sobre **substituição**, comando diferente).

### Veredito por decisão (D1–D11)

| D | Veredito | Refinamento obrigatório (entra no BRIEF) |
|---|---|---|
| D1 | ✅ confirma | Policy `canManageFixedAssets` **separada** de `canManageData`; leitura de taxa (`DepreciationRate`) pode ficar sob `canRead` do escopo. |
| D2 | ✅ confirma | **`sourceId` sem `userId`** (ACC-013) — `'<assetId>:<YYYY-MM>'` está certo. `runMonth` = **uma tx por ativo** (cada `postEntry` já abre a sua), nunca uma tx gigante para N ativos (lock do SQLite); resultado `{posted, skipped, failed[]}` e re-execução preenche o que faltou — idempotência é o que torna a falha parcial segura. |
| D3 | ✅ confirma, com **ACC-TIEOUT** | "Σ quotas ≤ custo dentro da tx" **não** se prova somando o razão a cada mês (N queries por ativo). Padrão do projeto (ADR-INCR-INVENTORY): `FixedAsset.accumulatedDepreciationCents` **denormalizado, atualizado na MESMA tx** do `postEntry` (CAS: `where accumulated = valorLido`), + **teste de tie-out** `Σ linhas do ledger com sourceType='fixed_asset.depreciation' e sourceId LIKE '<assetId>:%' === accumulatedDepreciationCents` (mesmo desenho de `Σ StockMovement == saldo(1.1.6)`). Cálculo em `BigInt`, truncamento da última quota provado no gate 2 de §5. `activatedAt`/`disposedAt` são **date-only** (`isValidDateOnly`, memória `date-only-regex-nao-valida-calendario`; renderização sem `new Date(iso)`, memória `date-only-rendering-utc-shift`). |
| D4 | ✅ confirma | Linhas `ANEXO_III_*` são **imutáveis** (editar = criar `CUSTOM`; a linha do Anexo pode ser `hiddenAt`, nunca alterada) — senão o "link da fonte na tela" (resposta 6) aponta para um número que já não é o da fonte. `annualRateBp` **copiado** para o ativo na ativação (snapshot), não FK viva. |
| D5 | ✅ confirma | ACC-018: baixa é entry novo; mês `HARD_CLOSED` → mesmo `AccountingPeriodNotOpenError`. `dispose` **exige** que a quota do mês da baixa já esteja postada (ou a posta na mesma chamada, sequencialmente — 2 entries, 2 tx, idempotentes) para o ganho/perda sair do valor contábil certo. |
| D6 | ✅ confirma | Dado externo: **COD_PB_RFB** da conta da Parte B para "depreciação — diferença contábil × fiscal" (aba PARTEB_PADRAO) — **item (h) do pedido ao contador**, não fork. Enquanto não houver conta cadastrada e existir diferença ≠ 0 no trimestre, o fechamento falha com `ValidationError` nomeando o COD_PB_RFB — mesmo padrão da C4 (`LalurService.ts:840-845`). |
| D7 | ✅ confirma | Com F-FA6 (a), as contas de custo/acumulada vivem em `FixedAssetClass`; em `AccountingScopeSettings` só `depreciationExpenseAccountId` (+ `disposalGainAccountId`/`disposalLossAccountId` para D5). Todas FK `Restrict`. |
| D8 | ✅ confirma, com 2 invariantes | (i) `supersedesJobId` **`@unique`** — cadeia linear, um sucessor por job (dois substitutos do mesmo original é ambiguidade que o Sped não aceita); (ii) o serviço valida **dentro da tx** que substituto e substituído têm o **mesmo `scope`, mesmo `kind` e mesmos `periodStart/periodEnd`** — senão a cadeia não significa nada. O substituído **nunca** muda de `status` (segue `EXPORTED`); "qual é o vigente" = o último da cadeia, derivado, não coluna. |
| D9 | ✅ confirma | Runbook em branco pelo agente; `verificationTermRef` obrigatório quando `indFinEsc='1'` (400 sem ele). |
| D10 | ✅ confirma | Payloads só ids/centavos/hash/`yearMonth`. |
| D11 | ✅ confirma | — |

### Recomendação por fork (fork com recomendação = ratificado por delegação, cédula 2026-09-14 C8)

| Fork | Recomendação | Justificativa de domínio |
|---|---|---|
| F-FA1 | **(a) por bem** — confirma | M312 liga ajuste→lançamento por bem; art. 124 §3 pune o conjunto mal especificado com a **menor** dedução. |
| F-FA2 | **(a) linear único** — confirma, **contesta o "campo reservado"**: **não** criar `shiftCoefficient` no schema. Coluna sem lógica é param aceito-e-ignorado (memória) e vira dívida de migração; quando (b) vier, é 1 coluna + 1 multiplicação. | YAGNI só na forma; a regra dos turnos (Lei 3.470/58 art. 69) não foi lida no corpus — não modelar o que não se leu. |
| F-FA3 | **(b) NF-e cria rascunho** — confirma, com precisão: o item CFOP 1551/2551 **sai do rateio de estoque** (X6 D3) e o custo do rascunho usa a **mesma fórmula D3** (`lib/nfeCost.ts`), com ICMS **incluído** no custo no MVP (CIAP 1/48 fora de escopo, §2 "Fora"); a NF-e vira `SourceDocument` do rascunho (INCR-8). | CFOP lido e ignorado é a classe de bug `param-aceito-e-ignorado`; hoje a NF de máquina viraria estoque/CMV em silêncio. |
| F-FA4 | **(a) residual default 0** — confirma | Base fiscal = custo integral (art. 123); residual só existe no contábil ⇒ D6. |
| F-FA5 | **(a) classe `LAND` não deprecia; imóvel = 2 ativos** — confirma | art. 122 I-b + §ú I; o rateio é laudo humano. |
| F-FA6 | **(a) contas por classe** — confirma | K155/J100 listam contas; o razão por bem sai do `sourceId`. |
| F-FA7 | **(b) comando explícito + pendência que bloqueia o pacote ao contador** — confirma | `NUM_REC` é dado de recibo; art. 7º §4 tem hipóteses sem efeito — decisão do contador. |
| F-FA8 | **(b) override contábil com justificativa, no mesmo incremento que D6** — confirma | Sem D6 no mesmo PR o override é aceito-e-ignorado. |
| F-FA9 | **(a) comando idempotente por `yearMonth`** — confirma | art. 121 §6: quota no mês errado não se recupera; humano no laço. |

**Nenhum fork ficou sem recomendação** → todos os nove ratificados por delegação (cédula 2026-09-14, linha C8). Nada volta ao dono deste ADR.

### Invariantes que o BRIEF DEVE garantir (além de §5)
- **[ACC-011]** gate de período e CAS do acumulado **dentro** da tx do `postEntry`; **[ACC-012]** o `tx` do `postEntry` propaga para o `update` do `FixedAsset` (repo de ativo recebe `tx`) — senão o contador denormalizado e o entry divergem na falha.
- **[ACC-014]** custo/acumulado em `BigInt`; **risco nomeado:** imóvel com custo de linha > R$ 21,47M cai na política `MAX_CENTS` (400) — **não** reabrir a política neste ADR; se um cliente real trouxer o caso, é decisão do dono sobre `MAX_CENTS`, não sobre imobilizado.
- **[ACC-016]** `activate`/`dispose`/`runMonth`/`substitute` são comandos; nenhum `PATCH status`.
- **[ACC-019]** eventos de auditoria na mesma tx do posting.
- **[ACC-021]** BP: a conta de depreciação acumulada é `nature=Asset` com saldo **credor** (`balanceCents = debit − credit` negativo, `AccountingReportService.ts:191`) — deve aparecer **subtraindo** dentro do ativo, não como passivo. **Grau: inferido** (a regra de sinal é centralizada, mas nenhum teste de BP hoje tem conta retificadora) → **gate de BRIEF: teste de BP com conta retificadora** (memória `bp-dre-diagnostics-test-must-mix-natures`).
- ECD/ECF: o job substituto **reexecuta a geração** a partir do razão atual (é o ponto de retificar); o `sha256` do substituto é sempre diferente do substituído — teste que assere os **dois** hashes (memória `comentario-de-teste-afirma-o-que-nao-assere`).

### Riscos de domínio
- **Backfill**: escopo já com contas `1.2.*` e lançamentos manuais de depreciação antes deste incremento — `FixedAsset` novo com `activatedAt` no passado geraria quotas retroativas em períodos `HARD_CLOSED` (bloqueadas) e duplicaria o que já foi lançado à mão. **Regra:** `activatedAt` anterior ao primeiro período `OPEN` do escopo exige `openingAccumulatedCents` informado (saldo inicial da acumulada, sem entry) — o smoke-gate S6 reprova backfill por desenho (memória `smoke-gate-s6-x-migracao-de-dado`).
- **Seed do Anexo III por tenant** = ~250 linhas × N escopos; seed idempotente **no `installPresetAsSystem`/T0** (P2, #320) ou lazy na primeira leitura — o BRIEF escolhe, o parecer só exige idempotência por `(scope, ncmPrefix, source)`.
- **Windows serializa SQLite** (memória): teste de `runMonth` concorrente verde local não é evidência; a CI é o oráculo.

PARECER PRONTO. Entregar ao luminaris-orchestrator para montar o plano de skills.

---

## 5. Gates que o BRIEF deve herdar (mínimo)

1. Idempotência: `runMonth` 2× no mesmo mês → 1 `JournalEntry` (assere a **segunda** chamada, memória
   `comentario-de-teste-afirma-o-que-nao-assere`).
2. `Σ quotas ≤ custo` provado com custo não divisível por 12×anos (última quota truncada).
3. Mês `HARD_CLOSED` → `AccountingPeriodNotOpenError`, nenhum entry criado (gate dentro da tx).
4. Classe `LAND` nunca gera quota; ativo `PENDING_ACTIVATION` nunca gera quota.
5. Seed do Anexo III: contagem de linhas com taxa esperada + `INSTALAÇÕES`/`EDIFICAÇÕES` presentes
   com NCM `null`; taxa `CUSTOM` sem `justification` → 400.
6. Cross-tenant: ativo/taxa de outro escopo → `NotFoundError`.
7. ECD `indFinEsc='1'` sem `codHashSub` ou sem `supersedesJobId` → 400; job substituído continua
   `EXPORTED` com `sha256` inalterado após a substituição.
8. ECF `retificadora='S'` sem `numRec` → 400; `openapi-paths` BASELINE sobe **de propósito** pelas rotas
   novas.
9. `dispose` posta ganho/perda correto (3 casos: valor de venda >, =, < valor contábil).
10. Fluxo de caixa: aquisição por NF-e cai em *investing* sem código novo (prova o reuso do prefixo `1.2`).
