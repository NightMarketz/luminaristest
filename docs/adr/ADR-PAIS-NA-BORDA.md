# ADR-PAIS-NA-BORDA — conceito universal no centro, nomeado em inglês; país em `features/<dominio>/paises/<cc>/`

- **Data:** 2026-11-24
- **Status:** **Proposed.** A direção é do dono (15/11), e os forks F-PB-1..9 foram ratificados em 24/11
  ([`D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA`](../plano/decisoes/D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA.md) §1;
  [`PRE-ADR-PAIS-NA-BORDA`](PRE-ADR-PAIS-NA-BORDA.md) §5.1). **Pendentes de ratificação:** a redação da regra R1–R7 (§1)
  e os forks novos F-PBA-1..7 (§6). Este ADR **não autoriza código sozinho**. A guarda (§3) é implementada como item 0
  do primeiro PR de código de um dos BRIEFs emendados que receber `executa`, no molde da `D1` (ADR-ARCH-BOUNDARIES §1.1).
- **Classe:** DECISÃO ARQUITETURAL (fronteira mecanizada).
- **Substitui:** a redação proposta do PRE-ADR §1, escrita para F-PB-1 (c) e F-PB-4 (a), que o dono não escolheu.
- **Relaciona:** [`ADR-ARCH-BOUNDARIES.md`](ADR-ARCH-BOUNDARIES.md) (a guarda é emenda dele, §4 e §5 de lá);
  [`ADR-PERSISTENCE-BOUNDARY-user-designed-vs-law-designed.md`](ADR-PERSISTENCE-BOUNDARY-user-designed-vs-law-designed.md)
  (o que a lei desenha continua Prisma first-class; a regra só decide **onde** e **com que nome**);
  [`ADR-DOMAIN-MOTOR-rejected.md`](ADR-DOMAIN-MOTOR-rejected.md) (porta de país não é motor: composição fixa no
  `lib/factory.ts`, sem DAG, sem configuração por tenant); Contrato `.claude/skills/_ARCHITECTURE-CONTRACT.md` §2 e §2.1.
- **BRIEFs emendados por este ADR** (D-2026-11-24 §6, "já nascem pela regra"):
  [`BE-INCR-EFICIENCIA-FISCAL-EMENDA-MONTADOR-UNICO`](../accounting/BE-INCR-EFICIENCIA-FISCAL-EMENDA-MONTADOR-UNICO-brief.md),
  [`BE-INCR-CICLO-FISCAL`](../accounting/BE-INCR-CICLO-FISCAL-brief.md),
  [`BE-INCR-NFSE-PAULISTANA`](../accounting/BE-INCR-NFSE-PAULISTANA-brief.md),
  [`BE-INCR-DP-PONTE-RAZAO`](../accounting/BE-INCR-DP-PONTE-RAZAO-brief.md) e
  [`BE-INCR-SIMULACAO-CENARIO-PR0`](../accounting/BE-INCR-SIMULACAO-CENARIO-PR0-brief.md).

## TLDR (2 linhas)

Conceito que existe em qualquer país mora no centro de cada domínio e nasce com nome em inglês. O que só existe no Brasil
mora em `server/src/features/<dominio>/paises/br/**`, e o `check:arch` reprova o centro importando essa pasta (regra `P1`).
**Risco principal:** a guarda por pasta só enxerga o que já foi movido. Até cada fatia mover a sua área, o código brasileiro
que ainda está fora de `paises/br` continua invisível para ela, e quem consome a borda nova precisa de um escopo nomeado
(F-PBA-5). Nenhum dos cinco BRIEFs emendados roda antes de o dono ratificar F-PBA-1..7.

---

## 0. De onde vem

- Direção (dono, chat, 15/11/2026): *"precisamos definir uma regra onde o país fica na borda, sempre, pq conceitos de
  contabilidade, DP e financeiro são universais, temos que separar melhor"*. Antes, 14/11: *"deixar desacoplado desde já
  tudo é uma boa prática mesmo se não internacionalizar ainda"* (`D-2026-11-15-PAIS-NA-BORDA`).
- Ratificação (dono, questionário, 24/11/2026), quatro escolhas contra a recomendação do PRE-ADR:
  F-PB-1 (a) pasta `features/<dominio>/paises/br/**`; F-PB-4 (b) centro em inglês; F-PB-7 (a) o dado existente migra por
  fatias; F-PB-9 (b) dois regimes convivem, com prazo e dono por fatia. Seguiram a recomendação: F-PB-2 (c no existente,
  a no novo), F-PB-5 (a no novo), F-PB-6 (a), F-PB-8 (a), F-PB-3 (a, inteiro, por consequência do F-PB-7).
- Os BRIEFs com `executa` nascem pela regra (D-2026-11-24 §6, 2º questionário: *"Já nascem pela regra"*).

## 1. A regra (redação para F-PB-1 a, F-PB-4 b, F-PB-7 a, F-PB-9 b) — RATIFICAÇÃO PENDENTE

- **R1 — Centro é conceito, e o nome é em inglês.** O centro de cada domínio modela o que existe em qualquer país:
  lançamento, conta, período, documento fiscal, tributo, alíquota, base, retenção, apuração, obrigação acessória, prazo,
  título, conciliação, trabalhador, vínculo, rubrica, folha, afastamento, férias, benefício. O identificador **novo** de
  conceito do centro nasce em inglês (F-PB-4 b). O alcance do "identificador" (arquivo, tipo, model e coluna Prisma, valor
  de enum, chave JSON, path de rota, `eventType`, código de erro) é o **F-PBA-1**. O código existente em português não é
  renomeado fora da fatia dele (R6).
- **R2 — Borda é país, e mora na pasta do país dentro do domínio.** Tudo o que só existe num país mora em
  `server/src/features/<dominio>/paises/<cc>/**`, com `<cc>` = ISO 3166-1 alfa-2 minúsculo (hoje só `br`): (a) as
  instâncias (tributos, documentos, obrigações, identificadores, categorias de trabalhador, formas de pagamento); (b) as
  regras e os números de lei (formatos de tabela de `LegalParameter` e regras de cálculo, com jurisdição); (c) leiautes e
  serializers (SPED, eSocial, NF-e, RPS, CNAB); (d) validadores de identificador; (e) textos, formatos, fuso e calendário.
  Dentro da pasta do país valem as **mesmas subpastas de camada** do Contrato (`models/`, `dtos/`, `services/`,
  `repositories/`, `policies/`, `ports/`, `adapters/`, `dfe/`…): as regras `L1`–`L6` casam por subcaminho
  (`/services/`, `/models/`…) e continuam valendo lá dentro. A língua dos nomes da borda é o **F-PBA-2**. Onde fica o que
  não mora em `features/` (controller, rota, job, `lib/`) é o **F-PBA-3**.
- **R3 — A dependência aponta para dentro.** A borda importa o centro. O centro (`features/<dominio>/` fora de `paises/`)
  **nunca** importa `paises/`. Uma pasta de país não importa a de outro país. Quando o centro precisa de algo do país (uma
  guarda, um cálculo, um formato, uma linha do lançamento), ele declara uma **porta** em `features/<dominio>/ports/`
  (interface só com tipos do centro) e o adaptador do país mora em `paises/<cc>/adapters/` (ou na camada que ele é). A
  ligação é feita só no `lib/factory.ts` (composition root, `X1`). O gate continua dentro da transação; só deixa de nomear o
  país. Isto não é motor de domínio: a composição é fixa no código, sem DAG, fila ou configuração por tenant
  (`ADR-DOMAIN-MOTOR-rejected` §3).
- **R4 — No banco também.** Model do centro não ganha coluna de instância de país. O dado novo do país vai em **tabela do
  país ligada 1:1** ao registro do centro (F-PB-2 a; F-PB-5 a para identificador). Convenção: model `<Cc><ModeloDoCentro>`
  (`BrFiscalProfile`, `BrCompanyFiscalProfile`, `BrServiceFiscalProfile`, `BrAccountingScopeSettings`, `BrUnit`), tabela
  `<cc>_<tabela_do_centro>`, chave única para o registro do centro (FK com `onDelete: Cascade` quando o centro é Prisma;
  `@@unique([userId, unitId])` quando o centro é linha de DynamicTable, como a `units`). Um satélite por model do centro,
  compartilhado pelos BRIEFs que chegarem a ele: quem chega primeiro cria, o seguinte acrescenta coluna. As colunas do
  satélite seguem o F-PBA-2. Como o dado do satélite entra pela API sem o DTO do centro importar a borda é o **F-PBA-4**.
  As 27 tabelas mistas de hoje (PRE-ADR §3) ficam como estão até a fatia de cada uma (F-PB-2 c), que migra o dado (F-PB-7 a).
- **R5 — Idioma não é país.** Nome em português de conceito universal não é acoplamento de país; é dívida de nome, que a
  fatia da área paga (F-PB-4 b). Teste de uma pergunta: *"isto existiria num ERP de outro país, com outro valor ou outro
  nome?"* Sim ⇒ conceito, centro. *"Só existe aqui"* ⇒ instância, borda.
- **R6 — Vale sempre, a partir de já.** Código novo nasce separado e com o nome da R1. O existente migra **por fatias**,
  cada uma com prazo e dono (§5; F-PB-7 a, F-PB-9 b). A fronteira tem guarda no `check:arch` (§3). A regra **não** abre
  segundo país: aceitar outra jurisdição continua sendo a fase P-i18n e a decisão T9 (BRL-only).
- **R7 — Convivência com prazo.** Enquanto uma fatia não move a sua área, o código brasileiro que ainda mora fora de
  `paises/br` (o **legado BR**) pode precisar consumir código novo da borda. Esse consumo só existe por um dos dois meios do
  **F-PBA-5**: porta do centro ligada na factory, ou escopo nomeado `LEGADO_BR` da regra `P1`, com a fatia que o encerra. O
  escopo nomeado só encolhe; entrada nova é emenda datada deste ADR, com sinal do dono (ADR-ARCH-BOUNDARIES §5).

**Como classificar (três perguntas, na ordem; mantidas do PRE-ADR §1):**
1. É um conceito que outro país também tem? Não ⇒ **borda**.
2. O que muda de país para país é só o **valor** (alíquota, prazo, teto)? ⇒ centro, com o valor em **parâmetro legal**
   registrado pela borda.
3. O que muda é a **forma** (como se calcula, quais campos, qual arquivo)? ⇒ centro com **porta**; a forma mora na borda.

**O que a guarda enxerga, e o que não (PRE-ADR §1, finding 3 da revisão).** A `P1` lê imports, inclusive `type`-only.
Ela pega o centro importando `paises/`. Ela **não** pega: (i) regra de país escrita dentro de arquivo do centro, sem import
(a regra de níveis da ECD em `PostingService.ts:960-985`); (ii) instância de país guardada como valor (código do eSocial em
`DpVinculo.categoria`, `regime`); (iii) coluna de país num model do centro; (iv) FK do centro para tabela de país
(`AccountingScopeSettings` → `LalurParteBAccount`); (v) código brasileiro que ainda está fora de `paises/` (legado BR): ele
é "centro" para a regra até a fatia dele. R3 em parte é mecanizável; R1, R4 e R5 dependem de **revisão por leitura** em
cada PR, e o corpo do PR diz, por arquivo novo, se é centro ou borda e por quê.

## 2. Glossário do centro (nomes em inglês usados pelas emendas)

Nome proposto para os conceitos do centro que os cinco BRIEFs criam. Valem no ramo recomendado do F-PBA-1; o nome final é
o do PR que o cria.

| Conceito | Nome no centro | Onde nasce | BRIEF |
|---|---|---|---|
| Origem de um valor de entrada (fato lido, premissa declarada, não conferido) | `Provenance` = `'FACT' \| 'ASSUMPTION' \| 'UNVERIFIED'` | `features/accounting/models/assessmentInput.ts` | montador, simulação |
| Premissa declarada | `Assumption` | idem | montador |
| Entrada montada para a função pura | `AssembledInput<TInput, TAlert>`; modo `AssemblyMode` = `'ASSESSMENT' \| 'HYPOTHESIS'` | idem | montador |
| Montador de entrada de apuração (porta) | `AssessmentInputAssembler<TPeriod, TInput, TAlert, TExtra>` | `features/accounting/ports/AssessmentInputAssembler.ts` | montador |
| Elegibilidade a um regime | `EligibilityState` = `'ELIGIBLE' \| 'BARRED' \| 'UNVERIFIED'`; `EligibilityReason`, `RegimeEligibility`, `YearEligibility`, `aggregateEligibility` | `features/accounting/models/regimeEligibility.ts` | montador |
| Aferição (simulado × apurado) | `TieOutRow`, estado `'MATCHES' \| 'DIVERGES' \| 'NOT_ASSESSED'` | `features/accounting/dtos/AssessmentInputDto.ts` | montador |
| Ocorrência de obrigação no calendário | model `TaxObligationOccurrence` (`tax_obligation_occurrences`) | `schema.prisma` + `features/accounting/models/complianceCycle.ts` | ciclo |
| Ciclo de cumprimento (orquestrador e job) | `ComplianceCycleService`, `ComplianceCycleScheduler` | `features/accounting/services/`, `jobs/` | ciclo |
| Calendário de obrigações do país (porta) | `ObligationCalendarPort` | `features/accounting/ports/` | ciclo |
| Tratador de uma família de obrigação (porta) | `ObligationHandlerPort` | `features/accounting/ports/` | ciclo |
| Situação do prazo | `DueStatus` = `'ON_TIME' \| 'DUE_SOON' \| 'OVERDUE'` | `complianceCycle.ts` | ciclo |
| Lançamento contábil da folha | model `PayrollPosting` (`payroll_postings`), `PayrollPostingService` | `schema.prisma` + `features/dp/services/` | DP-ponte |
| Composição das linhas do lançamento da folha (porta) | `PayrollJournalComposerPort` | `features/dp/ports/` | DP-ponte |
| Papel contábil universal da folha | `PayrollAccountRole` (`SALARIES_EXPENSE`, `OWNER_PAY_EXPENSE`, `SALARIES_PAYABLE`…) | `features/dp/models/` | DP-ponte |
| Esqueleto do cenário de simulação | `ScenarioInput`, `ScenarioOutput`, `ValueWithSource` | `features/accounting/dtos/ScenarioDto.ts` | simulação |
| Série de numeração do documento fiscal | coluna `numberingScheme` em `FiscalDocumentSequence` | `schema.prisma` | NFS-e SP |

## 3. A guarda (emenda de `ADR-ARCH-BOUNDARIES`, §1.2 nova) — plano, não executado

**Quem implementa:** o item 0 do primeiro PR de código, entre os cinco BRIEFs emendados, que receber `executa` (pela ordem
do F-MU-13, o PR-0 do montador único). O `executa` desse BRIEF cobre o item 0 porque o item está no BRIEF emendado. A
cobertura é a exceção de 13/10 do `check:arch` (ADR-ARCH-BOUNDARIES §4): gate estático que lê o código, como a `B7` e a
`D1`. Não reabre bancada, rodada nem revisor.

**Regras novas em `server/.dependency-cruiser.cjs`** (esboço):

```js
const PAIS = '^src/features/[^/]+/paises/';
const LEGADO_BR = '^src/features/accounting/(services/(SimplesApuracaoService|TaxSimulationService)|dfe/(selectDfeEmissor|resolveEmissor))\\.ts$'; // F-PBA-5 (a); lista do §3.1
{
  name: 'P1-center-not-country',
  severity: 'error',
  comment: 'ADR-PAIS-NA-BORDA R3: o centro (features/<d>/ fora de paises/) não importa paises/<cc>/. ' +
    'Precisa do país? Porta em features/<d>/ports/ + adaptador em paises/<cc>/, ligados no lib/factory.ts. ' +
    'LEGADO_BR = legado brasileiro fora da pasta, cada um com a fatia que o move (ADR §3.1).',
  from: { path: '^src/features/[^/]+/(?!paises/)', pathNot: `(${TEST}|${LEGADO_BR})` },
  to: { path: PAIS },
},
{
  name: 'P2-country-not-other-country',
  severity: 'error',
  comment: 'ADR-PAIS-NA-BORDA R3: paises/<cc>/ não importa paises/<outro>/.',
  from: { path: '^src/features/[^/]+/paises/([^/]+)/', pathNot: TEST },
  to: { path: PAIS, pathNot: '^src/features/[^/]+/paises/$1/' },
},
```

**Ajustes que a pasta nova exige em regras e gates que já existem** (lidos em 24/11; sem eles, mover código para a borda o
tira do gate em silêncio):

| # | O que | Por quê (lido) | Mudança |
|---|---|---|---|
| G1 | `FEATURE_LOGIC` do `.dependency-cruiser.cjs` | `'^src/features/[^/]+/(?!models/).+'`: `features/accounting/paises/br/models/x.ts` conta como lógica de feature, e `F1`/`X1` passariam a reprovar `lib/sped.ts` lendo um modelo brasileiro movido | `'^src/features/[^/]+/(?!models/\|paises/[^/]+/models/).+'` (o grupo opcional com lookahead não serve: o motor recua e casa) |
| G2 | `dtoShapeSnapshot.test.ts` (`features/accounting/dtos/__tests__/`) | descobre só `src/features/<domínio>/dtos/` (linhas 10 e 121–125) | também `src/features/<domínio>/paises/<cc>/dtos/`, gravados no **mesmo** `features/<domínio>/dtos/__tests__/__dto-shapes__.json` do domínio, com o módulo prefixado `paises/<cc>/` (ex.: `paises/br/BrCompanyFiscalProfileDto`); o `.gen.ts` do FE vai para `my-app/types/contracts/<domínio>/paises/<cc>/` |
| G3 | `atomicUntil.boundary.test.ts` (`features/accounting/__tests__/`, linhas 22–26) | varre só `features/<x>/services/` | também `features/<x>/paises/<cc>/services/` |
| G4 | `scripts/classe-risco.mjs` | `server/src/features/accounting/**` já cobre `accounting/paises/br/**`; `features/dp/**` não foi lido | conferir o glob do DP e o de `features/**/*iscal*` (linha 100); só ajustar se não cobrir |
| G5 | `scripts/paralelo.mjs`, `server/eslint.config.mjs`, `jest.config` (`testMatch`) | não lidos (insumo ausente) | conferir que alcançam `features/*/paises/*/**` no item 0 |

**Baseline antes/depois.** Antes: **27** violações conhecidas no `.dependency-cruiser-known-violations.json` (medido em
24/11: `L4` 4, `L5` 4, `L6` 4, `X3` 15). A `P1` e a `P2` nascem com **0** (não existe nenhuma pasta `paises/` em 24/11) e não
entram no arquivo. Depois: **27**, salvo se o ajuste G1 mudar alguma contagem, e então o PR traz o número.

**Prova por plantio (a executar no item 0, com a saída colada no corpo do PR):**
1. `src/features/accounting/paises/br/__sondaP1.ts` (exporta uma constante) e `src/features/accounting/services/__sondaP1.ts`
   importando aquele ⇒ `npm run check:arch` exit 1 com `error P1-center-not-country`.
2. `src/features/accounting/paises/zz/__sondaP2.ts` e `src/features/accounting/paises/br/__sondaP2.ts` importando aquele ⇒
   exit 1 com `error P2-country-not-other-country`.
3. `src/lib/sped.ts` importando um `paises/br/models/__sondaG1.ts` ⇒ exit 0 (o G1 funciona; sem o G1, `F1` daria exit 1).
4. Um DTO de sonda em `features/accounting/paises/br/dtos/` aparece no `__dto-shapes__.json` (G2).
5. Sem os plantios: exit 0, "27 known violations ignored". Plantios removidos antes do commit.

### 3.1 Escopo `LEGADO_BR` (só no ramo (a) do F-PBA-5)

Arquivos brasileiros que hoje moram fora de `paises/br` e que os BRIEFs emendados fazem consumir código novo da borda.
Cada um foi classificado pelas três perguntas da §1 (é instância brasileira) e sai do escopo quando a fatia indicada o
mover. **Nenhum arquivo do centro entra aqui:** o centro sempre usa porta.

| Arquivo | Por que é BR | Quem o faz consumir a borda | Sai na fatia |
|---|---|---|---|
| `features/accounting/services/SimplesApuracaoService.ts` | apuração do Simples (LC 123) | montador (elegibilidade e montador do Simples); DP-ponte (porta do fator r) | F5 |
| `features/accounting/services/TaxSimulationService.ts` | ranking Simples × Presumido × Real | montador; simulação | F5 |
| `features/accounting/services/TaxAssessmentService.ts` | IRPJ/CSLL (Presumido e Real) | montador (PR-3) | F5 |
| `features/accounting/services/PisCofinsAssessmentService.ts` | PIS/COFINS | montador (PR-3) | F5 |
| `features/accounting/services/IbsCbsAssessmentService.ts` | IBS/CBS (LC 214) | montador (PR-3) | F5 |
| `features/accounting/services/TaxAssessmentPeriodosService.ts` | períodos esperados do IRPJ/CSLL, PIS/COFINS e Simples | ciclo (item 4: a regra de períodos extraída para `paises/br/models/periodosEsperados.ts`) | F5 |
| `features/accounting/services/CompanyFiscalProfileService.ts` | regime do ano (MEI, Simples, Presumido, Real) e avisos do teto | montador (PR-1) | F6 |
| `features/accounting/services/FiscalDocumentEmissionService.ts` | montagem da DPS/NF-e | NFS-e SP (renderizador do RPS) | F5 |
| `features/accounting/services/FiscalDocumentLifecycleService.ts` | eventos da NFS-e/NF-e | NFS-e SP | F5 |
| `features/accounting/dfe/**` (a pasta inteira: SEFAZ, ADN, NFC-e, assinador local, seleção e resolução do adaptador) | DF-e é instância brasileira | NFS-e SP (adaptadores `paulistana`, hosts e protocolo do assinador) | F5 |
| `features/accounting/services/FiscalProfileService.ts` | perfil fiscal da unidade (model misto, 48/117) | NFS-e SP (volta a `NACIONAL` na troca de regime, mesma tx do satélite) | F6 |
| `features/accounting/models/issCompetencia.ts` | ISS por município | NFS-e SP (`locaisDoPayload` lê o RPS) | F5 |
| `features/legalParameters/models/formatoLinha.ts` | **não é BR** (é plataforma); entra só no ramo (b) do F-PBA-7 | ciclo, DP-ponte (formatos de tabela nova) | F3 |

A lista exata (regex) é a do item 0, conferida contra os write-sets dos BRIEFs emendados no dia do PR. Cada BRIEF emendado
diz quais destas entradas ele usa.

## 4. O que a regra muda nos cinco BRIEFs (resumo; o detalhe está em cada BRIEF, editado no lugar)

| BRIEF | Centro novo (inglês) | Borda nova (`paises/br`) | Satélite 1:1 |
|---|---|---|---|
| Montador único (EFICIENCIA-FISCAL) | `assessmentInput.ts`, `regimeEligibility.ts`, porta `AssessmentInputAssembler`, `AssessmentInputDto.ts` | catálogo das vedações, `elegibilidadeRegimeAno`, `limitesDoSimples`, os 5 montadores | `BrCompanyFiscalProfile` (declarações das vedações, PR-1b) |
| CICLO-FISCAL | `TaxObligationOccurrence`, `complianceCycle.ts`, `ComplianceCycleService`, `ComplianceCycleScheduler`, as duas portas | `OBRIGACOES_CICLO`, `REGRAS_PRAZO`, `vencimentoDe`, `ocorrenciasEsperadas`, tratadores por família | — (a política vai em colunas novas em inglês no `CompanyFiscalProfile`, F-CF-3 b, F-PBA-1) |
| NFSE-PAULISTANA | `numberingScheme` | tudo do RPS, os dois adaptadores, o falso, o renderizador | `BrFiscalProfile`, `BrServiceFiscalProfile` |
| DP-PONTE-RAZAO | `PayrollPosting`, `PayrollPostingService`, `PayrollAccountRole`, porta `PayrollJournalComposerPort` | `cppPatronal`, `enquadramentoNaCompetencia`, `provisaoMensal`, papéis BR, composição BR do lançamento, portas do fator r | `BrAccountingScopeSettings` (contas de papel BR), `BrFiscalProfile` (`simplesCppForaDoDas`), `BrUnit` (CNPJ do estabelecimento, cédula §2) |
| SIMULACAO-CENARIO PR-0 | esqueleto `ScenarioDto.ts` | extensão BR do cenário (`paises/br/dtos/CenarioBrDto.ts`) | — (sem banco) |

## 5. Fatias do existente (F-PB-7 a, F-PB-9 b) — ordem, prazo e dono

Cada fatia tem BRIEF próprio (sessão de planejamento), `executa` próprio e prazo. **Dono** = o nó `PAIS-NA-BORDA` (nasce no
fold da ratificação deste ADR) e a sessão que recebe o `executa` da fatia; o maestro cobra o prazo pela caixa. Os prazos
abaixo são **proposta** (F-PBA-6), contados a partir do go-live em 2027.

| # | Fatia | Escopo | Lacunas que fecha | Prazo proposto |
|---|---|---|---|---|
| F0 | Guarda | §3 inteiro (P1, P2, G1–G5, plantio, emenda do ADR-ARCH-BOUNDARIES) | `0a7b` (em parte: a guarda passa a existir; o razão só fica coberto na F1) | junto do 1º PR de código emendado |
| **F1** | **Razão × fiscal BR em `features/accounting`** (F-PB-8 a) | (1) portas `AccountDeletionGuard` e `AccountCreationRule` em `features/accounting/ports/`; (2) `git mv` de `Lalur.model.ts`, `lalurBlocoF.ts`, `ILalurRepository.ts`, `LalurRepository.ts`, `LalurService.ts`, `lalurParteBBalances.ts`, `LalurDto.ts` para `features/accounting/paises/br/**`, com os nomes de hoje (F-PBA-2 a); (3) adaptadores BR `LalurAccountDeletionGuard` e `EcdAccountLevelRule` (a regra do I050, hoje em `PostingService.ts:960-985`); (4) `PostingService` perde o `lalurRepo` (`:23`, `:94`, `:1064-1068`) e o `assertNivelDoPlano`; (5) os outros importadores de `ILalurRepository` (9, lidos em 24/11) usam porta, se forem centro, ou entram no escopo da R7 pela emenda datada, se forem BR. **Prova (o `comoProvar` da `41b5`):** com o passo 2 feito e o 4 desfeito, `check:arch` dá exit 1 em `PostingService.ts → paises/br/repositories/ILalurRepository.ts`; com o 4 feito, exit 0 | `41b5`, `0a7b` | 18/12/2026 |
| F2 | Primitivas de plataforma e auditoria | `dates`, `money`, `AccountingScope`, `AuditService` sobem para camada compartilhada fora de `features/accounting` (cédula D-2026-11-21, `b556`; o lugar e o nome são do BRIEF da fatia, em inglês); allowlist por domínio com composição central (`1cb6`), a parte BR registrada de `paises/br`; os slots de moeda e fuso lidos do `AccountingScope` em vez do literal (`d704`; ler do slot não reabre T9) | `b556`, `1cb6`, `d704` | 29/01/2027 |
| F3 | Plataforma de parâmetros legais não conhece domínio | `formatoLinha.ts` deixa de importar 7 modelos da contabilidade e de definir os formatos do DP: cada domínio, e dentro dele cada país, registra os formatos das suas tabelas (`0d37`). A vigência escrita em código (`675c`, `b25f`) vira linha com vigência ou regra pela decisão do F-ML-0 do `LEGAL-REGRAS` (pendente) | `0d37`; `675c` e `b25f` depois do F-ML-0 | **antes** do PR-0 do ciclo e do PR-P0 da ponte, se o F-PBA-7 for (a); senão 26/02/2027 |
| F4 | Motor DynamicTable sem identificador de país | os formatos `cpf`/`cnpj` do campo saem do enum fixo (`DynamicTable.model.ts:29`, `DynamicTable.dto.ts:34`) para um registro de formatos de documento, que o Brasil preenche de `features/dynamicTables/paises/br/` ligado na factory (`B1` continua: o motor não importa a contabilidade) | `5722` | 26/02/2027 |
| F5 | Fiscal BR com nome de instância | os 19 models e serviços de nome brasileiro (`Simples*`, `Nfce*`, `ReinfBatch`, `MitExport`, `IssBeneficioMunicipal`; o `Lalur*` já saiu na F1) e os serviços BR do escopo `LEGADO_BR` vão para `features/accounting/paises/br/**` por `git mv`, uma área por PR; o escopo da R7 encolhe a cada PR | — | 31/03/2027 |
| F6 | Models mistos (27) | um model por BRIEF, maior primeiro: `CompanyFiscalProfile` (20/55), `FiscalProfile` (48/117), `WithholdingProfile`, `ProductFiscalProfile`, `FiscalDocument`…; as colunas BR migram para o satélite `Br<Model>` (F-PB-7 a), com prólogo defensivo (migração do SQLite não é transacional) e o smoke S6 tratado no BRIEF; identificadores `cpf`/`cnpj` dos models existentes (F-PB-5 b até aqui) | — | um model por mês, de 04/2027 a 09/2027 |
| F7 | DP existente (F0–F2) | o código brasileiro de `features/dp` vai para `features/dp/paises/br/**`; os conceitos do centro ganham nome em inglês (F-PB-4 b); do F3 em diante o DP já nasce pela regra (F-PB-6 a) | — | junto do F3 do DP |
| F8 | Libs fiscais puras | `lib/{sped,ecf,ecfReal,nfe*,nfse*,mit,cnab,cnpj,cpf,referentialCatalog,prazoReinf,vencimentoRetencao,ibsCbsApuracao}.ts` vão para `features/accounting/paises/br/models/**` (F-PBA-3 a), e a regra `F1` troca a lista de arquivos pela pasta | — | 30/06/2027 |
| — | Fim da convivência | escopo `LEGADO_BR` vazio e baseline das fatias pago | — | 31/12/2027 |

Fora das fatias: o front (`my-app`), que tem a mesma pergunta e não foi medido por conceito (PRE-ADR §8).

## 6. Forks novos — RATIFICAÇÃO PENDENTE

Nenhum foi decidido por esta sessão. A cédula de 24/11 não cobre nenhum deles (conferido na §1 dela e no PRE-ADR §5.1). A
recomendação é a estrutural (D-2026-11-21-RECOMENDAR-SOLUCAO-ESTRUTURAL). **O que cada um trava** está na última coluna:
pela regra de 28/10, fork novo para o `executa` do nó até a resposta.

| Fork | Evidência lida | Caminhos | Recomendação | Trava |
|---|---|---|---|---|
| **F-PBA-1** Alcance do "centro em inglês" | A cédula diz "o centro é nomeado em inglês" e "a renomeação do existente entra em cada fatia" (PRE-ADR §5.1). Não diz se vale para coluna Prisma, valor de enum, chave JSON, path de rota, `eventType` e código de erro, nem o que fazer com campo novo em model antigo em português (`DpFolha.estado` = `'ABERTA' \| 'CALCULADA'`; rotas `/dp/folhas/*`; JSON da simulação em português) | (a) todo identificador **novo** em inglês (arquivo, tipo, função, model, tabela, coluna, chave JSON de DTO do centro, recurso de rota novo, `eventType` de entidade nova); o que **completa um conjunto que já existe** segue o conjunto até a fatia dele (valor novo num enum antigo, subpath de recurso antigo, evento novo de entidade antiga); texto para o usuário segue o i18n (pt/en); (b) só os nomes de código (TS) em inglês; dado, JSON, enum e rota seguem em português; (c) tudo em inglês já, inclusive o que completa conjunto antigo | **(a).** É o "centro em inglês" sem enum bilíngue nem recurso de rota com metade dos subpaths em cada língua; (b) deixa o contrato HTTP e o banco para outra rodada de renomeação, que é a dívida que a F-PB-4 (b) quis evitar | código dos 5 BRIEFs (todo nome novo depende) |
| **F-PBA-2** Língua dos nomes da borda | A cédula fala só do centro. Hoje o código brasileiro é termo da lei + sufixo de camada do Contrato (`SimplesApuracaoService`, `LalurRepository`, `issCompetencia.ts`) | (a) a borda usa o vocabulário da lei do país (português no BR) com o sufixo de camada do Contrato, como hoje; model satélite `Br<ModeloDoCentro>` com colunas em português; mover legado para a pasta é `git mv` sem renomear; (b) a borda também em inglês, com o termo da lei só como nome próprio (`SimplesInputAssembler`, `BrFiscalProfile.nfseSystem`) | **(a).** O termo da lei não tem tradução que o contador reconheça, e as fatias F1, F5 e F7 viram movimento puro de arquivo, sem renomear centenas de nomes; (b) dobra o custo de cada fatia | código dos 5 BRIEFs |
| **F-PBA-3** Borda fora de `features/` | F-PB-1 (a) nomeia só `features/<dominio>/paises/br/**`. Os BRIEFs criam `lib/paulistana/**` (NFS-e SP, PR-1), `vencimentoDe` em `lib/` (ciclo, item 2), controller, rota e job | (a) controller, rota e job ficam onde o Contrato manda (`src/controllers`, `src/routes`, `src/jobs`): são camada de aplicação e falam com a factory, como hoje; **lib pura nova de país** vai para `features/<dominio>/paises/<cc>/models/**` (é folha, `L6`), e a `lib/` fiscal de hoje sai na F8; (b) também controller, rota e job dentro de `paises/<cc>/` (`paises/br/controllers/`), montados pela rota do domínio; (c) lib pura nova de país continua em `lib/`, na lista da regra `F1` | **(a).** Uma regra só para a lógica de país, sem mexer no roteamento; (b) espalha o roteamento por pastas de país; (c) é a segunda convenção sem data para acabar | NFS-e SP PR-1; ciclo PR-0 (item 2) e PR-1 (job e controller); montador PR-1b (controller) |
| **F-PBA-4** Como o dado do satélite 1:1 entra pela API | R3 proíbe o DTO do centro importar o schema da borda. Hoje o perfil fiscal tem uma rota só (`PUT /accounting/fiscal-profile`, `routes/accounting.ts:462`; `PUT /accounting/service-fiscal-profiles/:serviceRef`, `:466`) | (a) rota, DTO, serviço e repositório **da borda** para o satélite, sob o recurso do centro (`PUT /accounting/fiscal-profile/br`, `PUT /accounting/service-fiscal-profiles/:serviceRef/br`, `PUT /accounting/company-fiscal-profile/:ano/br`), com a mesma policy do recurso; o GET do centro não muda e o da borda devolve o satélite; (b) campo aninhado `br` no DTO do centro, montado por um registro de extensão de schema que a borda preenche na factory; (c) o serviço legado BR do recurso grava o satélite na mesma tx, com o campo no DTO legado | **(a).** Cada lado valida o seu dado, e o satélite já nasce no lugar da F6; custa um path novo por satélite (guarda de path-count do openapi). (b) é estrutural também, mas cria registro de schema para um país só; (c) põe dado novo no DTO que a F6 vai esvaziar | montador PR-1b; NFS-e SP PR-2; DP-ponte PR-P1 e PR-P3 (`/accounting/settings/br`) |
| **F-PBA-5** Legado BR que consome borda nova (R7) | O `ADR-ARCH-BOUNDARIES` §3 proíbe crescer o baseline para engolir violação nova. A `SimplesApuracaoService` (legado BR, fora da pasta) vai chamar o montador e a elegibilidade novos em `paises/br`; o `selectDfeEmissor` vai escolher o adaptador `paulistana`. Mover o consumidor arrasta os importadores dele: o `CompanyFiscalProfileService` tem 9, inclusive `features/onboarding` (lido em 24/11) | (a) escopo nomeado `LEGADO_BR` na `P1`, fixado no item 0 com os arquivos da §3.1 (só legado BR, cada um com a fatia que o move), que só encolhe; entrada nova é emenda datada deste ADR; consumidor que é centro usa porta; (b) porta do centro para **toda** aresta legado → borda, sem escopo nomeado; (c) mover o consumidor e a cascata para `paises/br` antes de ele consumir | **(a), como etapa declarada da (c).** A (c) é o destino (a F5 move tudo), mas fazê-la antes de cada BRIEF é migrar tudo de uma vez, que a F-PB-9 (b) não pediu. A (b) obriga a tipar como centro coisas que são do Brasil (`ApuracaoInput`, `MontagemSimplesExtra`), o que é o vazamento ao contrário | montador item 0 e PR-1 a PR-3; NFS-e SP PR-2, PR-M e PR-4; ciclo PR-0 (item 4, `TaxAssessmentPeriodosService`); DP-ponte PR-P5; simulação PR-1 em diante (o PR-0 só pelo desenho) |
| **F-PBA-6** Prazo e dono por fatia | F-PB-9 (b) pede prazo e dono por fatia; a cédula não fixa os valores | (a) os prazos e o dono da §5 (nó `PAIS-NA-BORDA`, sessão do `executa`, cobrança pelo maestro); (b) prazo por fatia só quando o BRIEF da fatia for escrito; (c) outros valores | **(a).** Sem data agora, a convivência fica sem fim, que é o defeito que a F-PB-9 (b) evita | nenhum PR dos 5 BRIEFs; trava o nó `PAIS-NA-BORDA` |
| **F-PBA-7** Tabela nova de `LegalParameter` de país antes da F3 | O ciclo (item 1, `PRAZO_OBRIGACAO`) e a ponte (itens 1–3 e 7, seis tabelas) registram formato no `formatoLinha.ts`, que é plataforma e já importa 7 modelos da contabilidade (lacuna `0d37`). Com o formato em `paises/br`, o `formatoLinha.ts` importaria a borda e a `P1` reprovaria | (a) a F3 (registro de formato por domínio e país) entra **antes** do PR-0 do ciclo e do PR-P0 da ponte, e as tabelas novas já nascem registradas de `paises/br/legalParameters/`; (b) as tabelas novas entram no `formatoLinha.ts` como hoje, ele entra no escopo da R7 até a F3, e a F3 as move | **(a).** É a causa raiz da `0d37`, e o registro é pequeno; a (b) põe na plataforma mais sete formatos de país para a F3 tirar depois | ciclo PR-0; DP-ponte PR-P0 e PR-P1 |

**Forks novos dentro dos BRIEFs** (também pendentes; travam só o PR indicado): **F-PNT-PB-1**, por qual rota o `BrUnit` entra
pela API (a `units` é linha de DynamicTable, sem recurso Prisma nem rota; recomendada `GET|PUT /api/accounting/units/:unitId/br`),
trava o PR-P1 da ponte (BRIEF DP-PONTE §4.3); **F-SIM-13**, ganhou o ramo (d), recomendado, e segue pendente com os F-SIM-9..15
(BRIEF do PR-0 da simulação §5).

## 7. Pendente de validação externa e insumos ausentes

- **Validação externa:** nenhuma. A regra é de arquitetura; o conteúdo legal de cada BRIEF continua com o dossiê dele.
- **Insumos ausentes:** `scripts/paralelo.mjs`, `server/eslint.config.mjs` e o `testMatch` do jest não foram lidos contra
  a pasta nova (G5); o corpo dos 9 importadores de `ILalurRepository` não foi lido (F1, passo 5), só localizados por grep;
  a ordem de merge entre os 5 BRIEFs emendados e as pilhas abertas (#1321, #1322, #1326) é a do F-MU-13, não remedida aqui.

## 8. Achados fora de escopo (na caixa)

Ids no relatório da sessão e no corpo do PR.

## 9. O que este ADR não decide

Abrir outro país (P-i18n, T9); o motor de leis (`LEGAL-REGRAS`, F-ML-0 pendente); leiaute ou serializer; o front; o nome
e o lugar da camada compartilhada da F2 (é do BRIEF dela).
