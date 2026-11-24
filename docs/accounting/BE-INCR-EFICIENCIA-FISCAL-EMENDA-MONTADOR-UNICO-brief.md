# BE-INCR-EFICIENCIA-FISCAL-EMENDA-MONTADOR-UNICO — BRIEF (emenda do nó EFICIENCIA-FISCAL, item 16 do PR-3)

> **Sessão:** `sessao-planejamento` (agente). Saída: este documento, a cédula
> [[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO]], o fold da nota do nó e o dossiê
> `pesquisas-legais/simulacao-montador-unico/`. **Sem código, sem `executa`, sem merge.**

> **RATIFICAÇÃO 21/11/2026** ([[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO-FORKS]]): o dono respondeu os forks F-MU-1..16 no
> questionário (F-MU-14..16 numa 2ª rodada, depois da revisão), **todos (a)**, a recomendação do BRIEF. Com isso o PR-1b entra (F-MU-8 a).

> **`EXECUTA` 21/11/2026** — dono, chat, à pergunta *"O 'Executa tudo' de 21/11 vale também para o código deste BRIEF?"*:
> **"Vale também"**. Cobre PR-0..PR-4 + PR-1b, sem merge.
> **Base:** `origin/main` `43719baa` (21/11). Não edita o BRIEF do nó (`BE-INCR-EFICIENCIA-FISCAL-brief.md`), nem os do X7,
> do X8, do X14 e do IBS-CBS-2027.

> **Ratificação 24/11:** R1–R7 e F-PBA-1..7 ratificados, todos (a) ([[D-2026-11-24-ADR-PAIS-NA-BORDA-FORKS]]). Os forks F-PBA citados abaixo
> já não travam nada; o texto fica como registro do que dependia de cada um.
>
> **EMENDA PAÍS NA BORDA (24/11/2026)** — [`ADR-PAIS-NA-BORDA`](../adr/ADR-PAIS-NA-BORDA.md) (Proposed; R1–R7 e F-PBA-1..7
> **RATIFICAÇÃO PENDENTE**). **Autorização:** dono, 24/11, à pergunta *"Esses BRIEFs seguem como foram escritos ou já
> nascem pela regra?"*: **"Já nascem pela regra"** ([[D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA]] §6). O `executa` de 21/11
> continua e vale para **este BRIEF emendado**. **Divergência registrada (regra 1 da `sessao-planejamento`, "não edita spec
> existente"):** a emenda edita este BRIEF no lugar porque a tarefa e a cédula §6 mandam; os itens, contratos e write-set
> abaixo já estão com os caminhos e nomes novos, e as citações `arquivo:linha` de código existente ficam como estavam. A §6
> (forks) é o texto que foi ao dono em 21/11, com os nomes de 21/11.

**De → para** (centro em inglês, F-PB-4 b + F-PBA-1 a; borda em `paises/br`, F-PB-1 a, com o vocabulário da lei, F-PBA-2 a;
caminhos relativos a `server/src/features/accounting/`):

| Antes (21/11) | Depois (24/11) | Lado |
|---|---|---|
| `models/entradaApuracao.ts`: `Origem` (`FATO`/`PREMISSA`/`NAO_CONFERIDO`), `Premissa`, `ValorEtiquetado<T>`, `EntradaMontada<T>`, `ModoMontagem` (`APURACAO`/`HIPOTESE`), `exigirPremissa` | `models/assessmentInput.ts`: `Provenance` (`FACT`/`ASSUMPTION`/`UNVERIFIED`), `Assumption`, `LabeledValue<T>`, `AssembledInput<TInput, TAlert>`, `AssemblyMode` (`ASSESSMENT`/`HYPOTHESIS`), `requireAssumption` | centro |
| tipos de `models/regimeElegibilidade.ts`: `EstadoElegibilidade` (`ELEGIVEL`/`VEDADO`/`NAO_CONFERIDO`), `MotivoElegibilidade`, `ElegibilidadeRegime`, `ElegibilidadeAno`, regra de agregação no JSDoc | `models/regimeEligibility.ts`: `EligibilityState` (`ELIGIBLE`/`BARRED`/`UNVERIFIED`), `EligibilityReason<TCode>`, `RegimeEligibility<TRegime>`, `YearEligibility<TRegime, TAlert>`, `aggregateEligibility` | centro |
| catálogos, `EntradaElegibilidade`, `elegibilidadeRegimeAno`, `limitesDoSimples` em `models/regimeElegibilidade.ts` | `paises/br/models/regimeElegibilidade.ts` (mesmos nomes; usam os tipos do centro) | borda |
| `services/montadores/I*EntradaMontador.ts` (interfaces com `montar`) | porta do centro `ports/AssessmentInputAssembler.ts` (`assemble`) + `paises/br/services/montadores/I*EntradaMontador.ts` (tipos BR que a especializam) | centro + borda |
| `services/montadores/{Simples,IrpjCsll,PisCofins,IbsCbs,Elegibilidade}EntradaMontador.ts` | `paises/br/services/montadores/` (mesmos nomes) | borda |
| sub-schemas na `dtos/TaxSimulationDto.ts`: `PremissaSchema`, `MotivoSchema`, aferição, `grau` | `dtos/AssessmentInputDto.ts`: `AssumptionSchema`, `EligibilityReasonSchema`, `EligibilitySchema`, `TieOutRowSchema`, `EvidenceGradeSchema` (`TIED_OUT`/`FACTS_ONLY`/`WITH_ASSUMPTIONS`), chaves JSON em inglês | centro |
| campos novos da resposta `elegibilidade`, `premissas`, `grau`, `afericao` | `eligibility`, `assumptions`, `evidenceGrade`, `tieOut` [F-PBA-1]; os campos BR `componentesDevido`, `melhorCondicional`, `economiaCondicionalCents` seguem em português (o DTO é legado BR) | centro no DTO BR |
| PR-1b: colunas `CompanyFiscalProfile.declaracaoVedacoes` e `.declaracaoObrigacaoReal`, no `CompanyFiscalProfileDto` | satélite `BrCompanyFiscalProfile` 1:1 (ADR R4) com as duas colunas, e rota, DTO, serviço e repositório da borda: `GET`/`PUT /api/accounting/company-fiscal-profile/:ano/br` [F-PBA-4] | borda |

**O que trava o quê (regra de 28/10: fork novo para o `executa` do nó):** F-PBA-1 e F-PBA-2 travam **todo** o código deste
BRIEF (todo nome novo depende deles); F-PBA-4 trava o **PR-1b**; F-PBA-5 trava o **PR-0 (item 0, o escopo `LEGADO_BR`) e o
PR-1 ao PR-3** (o legado BR chama a borda nova); F-PBA-3 só pesa no controller do PR-1b; F-PBA-6 e F-PBA-7 não travam
nenhum PR deste BRIEF.

**Escopo `LEGADO_BR` que este BRIEF usa** (ADR §3.1, ramo (a) do F-PBA-5): `services/SimplesApuracaoService.ts` (PR-1 limites,
PR-2 montador), `services/TaxSimulationService.ts` (PR-1 a PR-4), `services/TaxAssessmentService.ts`,
`services/PisCofinsAssessmentService.ts` e `services/IbsCbsAssessmentService.ts` (PR-3), `services/CompanyFiscalProfileService.ts`
(PR-1, avisos do teto). Nenhum arquivo do centro importa a borda: o centro só declara tipos, schemas e a porta. O `models/taxSimulation.ts` (legado BR) **não** entra no escopo: ele recebe as entradas já montadas, tipadas pelos tipos do
centro e pelos inputs legados (`ApuracaoInput`, `PresumidoTrimestralInput`…), sem importar `paises/br`; se o PR-3 precisar, é emenda datada do ADR.

**Item 0 (guarda) entra no PR-0 deste BRIEF**, porque ele é o 1º PR de código entre os cinco BRIEFs emendados pela ordem do
F-MU-13 (ADR §3, "Quem implementa"). Se outro BRIEF emendado receber o `executa` e chegar antes à `main`, o item 0 vai com ele
e sai daqui.

## TLDR (2 linhas)

A simulação de regime (item 16, `GET /simulacoes/regime`) passa a ler a mesma entrada que as rotas de apuração leem, por
**quatro montadores de entrada** (Simples, IRPJ/CSLL, PIS/COFINS, IBS/CBS) chamados pela rota e pela simulação, e a filtrar
os regimes por **uma função pura de elegibilidade por ano** (Res. CGSN 140 art. 15; LC 123 art. 3º §§ 9º–10; Lei 9.718 arts.
13–14), que também gera os alertas de limite da rota. Todo dado que não existe no regime simulado vira **premissa declarada**,
e o cenário do regime atual é **aferido** contra a apuração confirmada.
**Forks:** F-MU-1..16 ratificados em 21/11, todos (a). **Emenda 24/11:** centro em inglês, montadores e regra brasileira em
`paises/br` (bloco acima); o código espera os F-PBA-1..7 do ADR-PAIS-NA-BORDA.
**Risco principal:** a extração do `montar` do Simples (1.377 linhas no serviço) tem de deixar a rota idêntica, com a mesma
`impressao` e o mesmo `parametrosSha256`; e os PRs #1321 (ponte da folha, itens 37 e 39) e #1322 (ciclo fiscal, métodos
`*PeloSistema`) editam os mesmos serviços. Pelo F-MU-13 (a), o PR-2 desta emenda entra antes deles.

---

## 0. Formulário (sessao-planejamento)

- **Item a planejar:** emenda do nó `EFICIENCIA-FISCAL` (`docs/plano/nos/EFICIENCIA-FISCAL.md`), item 16 do BRIEF do nó
  (simulação de regime, PR-3, executado em 28/10 sob [[D-2026-10-28-EFICIENCIA-FISCAL-PR3-EXECUCAO]]). Corrige pela raiz as
  lacunas `L-20261121-172247-f514`, `L-20261121-172248-35df`, `L-20261121-175856-7bff` e `L-20261121-172251-a2ce`.
- **Autorização** (citação exata, registrada na cédula e na nota):
  - dono, 2026-11-21, questionário, à pergunta *"corrigir pela raiz (um montador de entrada e uma regra de elegibilidade
    compartilhados por rota e simulação) ou corrigir os 4 defeitos um a um?"*: **"Montador único"**;
  - chat do mesmo dia: *"Executa tudo pra liberar e poder rodar em xhigh até terminar"*;
  - o dono confirmou ao iniciar o cartão desta sessão.
  - **Passo 1 (cobertura):** o questionário escolhe a correção estrutural, e o "Executa tudo" foi dado para liberar as sessões
    de planejamento abertas naquele turno. **Esta sessão lê os dois como autorização para PLANEJAR** a emenda (BRIEF +
    contratos esboçados + forks levados ao dono). **Não é `executa` de código:** quando o "Executa tudo" foi dito, este
    BRIEF não existia, e a regra de 28/10 ([[D-2026-10-28-FLUXO-AUTONOMO]]) só deixa o `executa` cobrir BRIEF ratificado e
    sem fork pendente. Os forks foram ratificados em 21/11 (§6). Divergência registrada: se o "Executa tudo" vale também
    para o código deste BRIEF, o dono confirma, e a confirmação entra na nota do nó.
- **Insumos existentes** (fato consumado, lidos nesta sessão — CBM-001):
  - `services/TaxSimulationService.ts:177-323` monta a entrada da simulação de regime à parte: lê subrazão e histórico
    (`:205-222`), agrupa as linhas só pelo `excluir` (`:233-250`), soma o resultado do razão por trimestre (`:265-267`) e
    acrescenta os alertas de limite depois do ranking (`:300-306`).
  - `models/taxSimulation.ts:219-351` passa vazias `ajustesBase`, `outrosCreditos`, `retencoes`, `creditosNfe`
    (`:235-238`), `deducoes` (`:313`, `:341`) e `linhasParteA` (`:338`); `simularRegimeAno:360-363` escolhe o `melhor` entre
    os `disponivel` sem nenhum filtro de elegibilidade.
  - `services/SimplesApuracaoService.ts:494-766` (`montar`): exige perfil `SIMPLES` (`:502`), lê subrazão + histórico
    (`:511-529`), caixa (`:536`), contratos de parceria (`:538-564`), segregação manual que prevalece (`:566-633`), benefícios
    de ISS (`:644-675`), limites (`:678`, privado em `:921-971`), tie-out e NFS-e (`:719-725`). `entradaParaSimulacao:371-377`
    já serve o fator r.
  - `services/TaxAssessmentService.ts:803-896` (`calcular`): gates de regime/forma (`:807-815`), recusa multi-unidade
    (`:824-829`), teto do Presumido (`:863-865`), receita hospitalar (`:875`), Lalur e Parte B (`:888-893`); as deduções vêm
    do DTO e só ficam gravadas em `entradaInformada` da linha CONFIRMED (`:529`, `EntradaInformadaX7:298`).
  - `services/PisCofinsAssessmentService.ts:334-418`: modalidade pelo regime (`:339`), recusa do caixa (`:345`),
    `pisCofinsRegime` da unidade (`:350`), créditos das NF-e (`:370`), ajustes/créditos/retenções do DTO (`:389-391`),
    gravados em `EntradaInformadaX8:67`.
  - `services/IbsCbsAssessmentService.ts:379-419`: `assertRegime` (`:384`, `:436`), documentos fiscais (`:395-405`), vendas
    sem documento (`:407-409`), créditos (`:413`), pacote (`:414-415`), split (`:416`).
  - `services/PresumidoTetoService.ts:25-49` + `models/presumidoTeto.ts:68-108`: teto pela receita do **dono** (todas as
    unidades), com `NAO_CONFERIDO`. `CompanyFiscalProfileService.ts:399-418` usa o mesmo para avisos.
  - `models/taxOptimizationAlertas.ts:100-201`: projeção e interdependência (§ 4º III, IV e V) puras.
  - `dtos/CompanyFiscalProfileDto.ts:193`: `lucroRealObrigatorio` só é aceito no regime REAL.
  - `prisma/schema.prisma:2007-2032` (`Partner`): `tipoPessoa`, `residenteBrasil`, `outrasParticipacoes`.
  - `repositories/ReceitaFiscalRepository.ts:66-73`: `somaPorCompetencia` filtra por `unitId` (receita da unidade).
  - Testes: `services/__tests__/taxSimulation.integration.test.ts` (sem tie-out) e `taxSimulation.regime.unit.test.ts`.
  - Decisões ratificadas que esta emenda **respeita**: F-EF-7 (a) (Simples × Presumido × Real), decisões 3, 4 e 5 de
    [[D-2026-10-28-EFICIENCIA-FISCAL-PR3-EXECUCAO]] (carga completa com avisos; `projecao2027`; POST gêmeo SYSTEM; economia ≤ 0
    ⇒ 400). A emenda **altera** a decisão 3 só onde ela dizia "Real sem LALUR" e "PIS/COFINS sem créditos": esses passam a ser
    lidos quando existem e premissa declarada quando não existem. A decisão 4 depende do F-MU-10.
- **Nós vizinhos:**
  - consome X14 (`simplesCalc.apurar`), X7 (`apurarPresumidoTrimestral`/`apurarRealTrimestral`), X8
    (`apurarPisCofinsMensal`), IBS-CBS-2027 (`apurarIbsCbsMes`), PRESUMIDO-TETO-78MI (`tetoPresumido`), LEGAL-PARAMS
    (`SIMPLES_LIMITE`, `TAX_ASSESSMENT`);
  - **PES-4 / ponte** (#1321, BRIEF `BE-INCR-DP-PONTE-RAZAO`): os itens 37 (o Simples lê a folha do DP) e 39 (a CPP da
    simulação vem do DP) editam o `montar` e o `cargaComum`;
  - **CICLO-FISCAL** (#1322, BRIEF `BE-INCR-CICLO-FISCAL`): o PR-1 dele acrescenta `*PeloSistema` no `SimplesApuracaoService` e
    no `IbsCbsAssessmentService`, e chama os `calcular` das rotas;
  - **fora desta emenda e consumida depois:** a camada de decisão (premissas do usuário, projeção, otimização), que só começa
    quando as rotas fecharem (handoff de 21/11, §2 C4).

---

## 1. Desenho em uma tela

```
            ┌───────────────────────── rota de apuração ─────────────────────────┐
 razão,     │ gates (policy, regime, forma, ordem) → MONTADOR → função pura → grava│
 subrazão,  └──────────────────────────────┬─────────────────────────────────────┘
 Lalur,                                    │ mesma classe, mesmo método
 NF-e,      ┌──────────────────────────────┴───── simulação de regime ───────────┐
 títulos…   │ ELEGIBILIDADE(ano) → MONTADOR(modo HIPOTESE) → função pura → ranking │
            │   (filtra antes)      (fato | premissa | não conferido)   (só elegível) │
            │                                         └→ AFERIÇÃO (regime atual × CONFIRMED)
            └───────────────────────────────────────────────────────────────────────┘
```

- **Montador** = o código que hoje está dentro do `calcular`/`montar` de cada rota e lê o banco. Passa a ser uma classe
  (F-MU-1) em `paises/br/services/montadores/`, que implementa a porta do centro `AssessmentInputAssembler`, com dois
  modos: `ASSESSMENT` (a rota, idêntico ao de hoje) e `HYPOTHESIS` (a simulação: o regime do ano não precisa
  ser o simulado e nada é gravado). Cada valor sai **etiquetado** (`Provenance`): fato lido (`FACT`), premissa declarada (`ASSUMPTION`), ou não
  conferido (`UNVERIFIED`).
- **Elegibilidade** = função pura brasileira (`paises/br/models/regimeElegibilidade.ts`), por ano e por regime, sobre os
  tipos do centro (`models/regimeEligibility.ts`): três estados (`ELIGIBLE`, `BARRED`, `UNVERIFIED`), o motivo
  com a base legal e a data de efeito. Gera os alertas de limite que a rota do Simples já emite (mesmos códigos e textos) e
  filtra a simulação **antes** do ranking.
- **Aferição** (`tieOut`) = o cenário do regime atual, montado em `HYPOTHESIS`, comparado período a período com a apuração confirmada.

---

## 2. Base legal da elegibilidade (dossiê `pesquisas-legais/simulacao-montador-unico/`)

Todos os textos foram lidos no acervo (LC 123 [D01], Lei 9.718 [D02], ambos compilados, cópia de 13/10/2026, sem alerta) ou
na fonte oficial (Res. CGSN 140 [D03], SIJUT, visão multivigente, 21/11/2026).

| Regra | Norma | O que a função faz |
|---|---|---|
| Opção e permanência: receita **no mercado interno** até R$ 4,8 mi no ano, mais exportação até R$ 4,8 mi | Res. CGSN 140 art. 2º § 1º [D03]; LC 123 art. 3º II e § 14 [D01] | limite lido de `SIMPLES_LIMITE/EPP`; exportação não é separada hoje (§7 insumo 3) |
| Vedação: receita bruta acima do limite **no ano anterior ou no ano em curso** | Res. CGSN 140 art. 15 I [D03] | ano anterior acima ⇒ `BARRED` desde 1º/jan; ano em curso: ver as 3 linhas abaixo |
| Excesso no ano em curso > 20% ⇒ exclusão no mês seguinte ao excesso | LC 123 art. 3º § 9º [D01] | `BARRED` com `effectiveFrom` = mês seguinte (F-MU-7) |
| Excesso ≤ 20% ⇒ efeitos só no ano seguinte | LC 123 art. 3º § 9º-A [D01] | `ELIGIBLE` no ano, com aviso de exclusão em 1º/jan do ano seguinte |
| Ano de início: limite proporcional; excesso acima de 20% exclui com efeito retroativo ao início | LC 123 art. 3º §§ 2º e 10 [D01] | `BARRED` desde o início de atividade |
| Ano de início, excesso de até 20%: não retroage, efeitos no ano seguinte | LC 123 art. 3º § 12 [D01] | `ELIGIBLE` no ano, com o motivo de efeitos em 1º/jan do ano seguinte (como o § 9º-A) |
| Receita do Simples = soma de **todos os estabelecimentos** | Res. CGSN 140 art. 16 § 2º [D03] | receita da PJ, não da unidade (F-MU-11) |
| 27 vedações por natureza, sócio, atividade e cadastro | Res. CGSN 140 art. 15 I–XXVII [D03] (consolida LC 123 art. 3º § 4º e art. 17 [D01]) | catálogo de códigos `VEDACAO_SIMPLES_*` em `paises/br/models/regimeElegibilidade.ts` (§5.2) |
| — derivável hoje: PJ no capital | art. 15 II (LC 123 § 4º I) | `Partner.tipoPessoa = 'PJ'` vigente no ano |
| — derivável hoje: sócio domiciliado no exterior | art. 15 XIII (LC 123 art. 17 II) | `Partner.residenteBrasil = false` vigente no ano |
| — derivável hoje: interdependência III, IV, V | art. 15 IV–VI | reusa `alertasDeInterdependencia` (`taxOptimizationAlertas.ts:167`) |
| — derivável hoje: locação de imóvel próprio | art. 15 XXIII (LC 123 art. 17 XV) | reusa a declaração lida por `servicoFiscalAvaliacao.ts:89` |
| — não derivável (filial de estrangeira, cooperativa, S.A., cisão, débito, cadastro, atividades vedadas…) | art. 15 III, VII–XII, XIV–XXII, XXIV–XXVII | `UNVERIFIED` até haver declaração (F-MU-8) |
| Presumido: receita total do ano anterior ≤ R$ 78 mi (ou R$ 6,5 mi × meses) | Lei 9.718 art. 13 [D02] | reusa `tetoPresumido` (`EXCEDIDO` ⇒ `BARRED`; o `NAO_CONFERIDO` do teto vira `UNVERIFIED`) |
| Obrigação ao Real: receita acima do teto (I) e as atividades/situações II–VII | Lei 9.718 art. 14 [D02] | I pelo teto; II–VII só por declaração (F-MU-8). Hoje `lucroRealObrigatorio` só existe no REAL |
| MEI | — | fora: a simulação já recusa MEI (`TaxSimulationService.ts:185`) |

---

## 3. Fatiamento

Feature com 2+ PRs no mesmo tema ⇒ `integration/eficiencia-fiscal-montador-unico` como base, pilha nativa (`gh stack`), um PR
de integração para a `main` no fim ([[D-2026-11-10-BRANCH-DE-INTEGRACAO-E-GAP-MAP-POR-FEATURE]]). Cada PR tem `executa`
próprio depois dos forks (regra de 28/10). Escopo **backend**; FE nenhum (nenhuma tela chama a simulação hoje).

| PR | Conteúdo | Itens | Lacuna que fecha |
|---|---|---|---|
| PR-0 | **item 0 (guarda `P1`/`P2`, ADR-PAIS-NA-BORDA §3)** + contrato: tipos e porta do centro, schemas Zod, catálogo de vedações e interfaces BR dos montadores; sem comportamento | 0–4 | — (a `0a7b` em parte, pela guarda) |
| PR-1 | elegibilidade pura + rota do Simples e perfil usando-a + filtro da simulação | 5–12 | `f514`, `35df` |
| PR-1b | declaração das vedações não deriváveis (F-MU-8 a), no satélite `BrCompanyFiscalProfile` | 13–15 | — |
| PR-2 | montador do Simples extraído; rota idêntica; simulação e fator r usando-o | 16–21 | `7bff` |
| PR-3 | montadores de IRPJ/CSLL, PIS/COFINS e IBS/CBS; premissas declaradas | 22–29 | — |
| PR-4 | aferição: teste de tie-out + bloco `tieOut` na resposta | 30–33 | `a2ce` |

---

## 4. Checklist numerado (cada item = ≥ 1 teste)

### PR-0 — guarda + contrato (sem comportamento)

0. **Guarda do país na borda** (ADR-PAIS-NA-BORDA §3, fatia F0): regras `P1-center-not-country` e
   `P2-country-not-other-country` em `server/.dependency-cruiser.cjs`, com o escopo `LEGADO_BR` da §3.1 do ADR conferido
   contra os write-sets do dia [F-PBA-5]; **G1** (`FEATURE_LOGIC` passa a aceitar `paises/<cc>/models/` como folha, senão
   `F1`/`X1` reprovam `lib/` lendo modelo BR); **G2** (`dtos/__tests__/dtoShapeSnapshot.test.ts` descobre também
   `features/<domínio>/paises/<cc>/dtos/`); **G3** (`__tests__/atomicUntil.boundary.test.ts` varre também
   `features/<x>/paises/<cc>/services/`); **G4/G5** conferidos (`scripts/classe-risco.mjs`, `scripts/paralelo.mjs`,
   `server/eslint.config.mjs`, `testMatch` do jest) e ajustados só se não alcançarem `features/*/paises/*/**`; emenda datada
   §1.2 do `docs/adr/ADR-ARCH-BOUNDARIES.md` com o baseline antes/depois **medido no dia** (em 24/11: 27 → 27). **Prova:** os
   5 plantios do ADR §3, com a saída de `npm run check:arch` (exit 1 com `P1`, exit 1 com `P2`, exit 0 no G1, a sonda no
   `__dto-shapes__.json`, exit 0 sem plantio) colada no corpo do PR; plantios removidos antes do commit.
1. **Tipos do centro da entrada etiquetada** em `models/assessmentInput.ts` (novo, centro, inglês [F-PBA-1]): `Provenance`,
   `Assumption`, `LabeledValue<T>`, `AssembledInput<TInput, TAlert>`, `AssemblyMode` (§5.1). Teste unitário: um
   `LabeledValue` com `provenance = 'ASSUMPTION'` exige `assumption` preenchida (guarda de tipo + função `requireAssumption`).
2. **Tipos do centro da elegibilidade** em `models/regimeEligibility.ts` (novo, centro): `EligibilityState`,
   `EligibilityReason<TCode>`, `RegimeEligibility<TRegime>`, `YearEligibility<TRegime, TAlert>` e a assinatura de
   `aggregateEligibility` (corpo no item 5). **Catálogo de vedações** em `paises/br/models/regimeElegibilidade.ts` (novo,
   borda [F-PBA-2]): `CODIGOS_VEDACAO_SIMPLES` (um por inciso do art. 15 da Res. CGSN 140, com o inciso e a base no próprio
   objeto) e `CODIGOS_OBRIGACAO_REAL` (Lei 9.718 art. 14 I–VII). Teste: 27 + 7 códigos, nenhum repetido, todo código com
   `base` não vazia.
3. **Interfaces dos montadores:** a porta do centro `ports/AssessmentInputAssembler.ts` (`AssemblyOptions`,
   `AssessmentInputAssembler<TPeriod, TInput, TAlert, TExtra>` com `assemble(scope, period, opts)`, §5.3) e as interfaces BR
   `paises/br/services/montadores/I*EntradaMontador.ts`, que a especializam com os tipos do Brasil (forma decidida no
   F-MU-1). Sem implementação; `tsc` limpo; `check:arch` sem violação nova (a borda importa o centro; o centro não importa a
   borda).
4. **Schemas Zod:** os do centro em `dtos/AssessmentInputDto.ts` (novo, chaves em inglês [F-PBA-1]): `AssumptionSchema`,
   `EligibilityReasonSchema`, `EligibilitySchema`, `TieOutRowSchema`, `EvidenceGradeSchema` (§5.5). No
   `dtos/TaxSimulationDto.ts` (legado BR), os campos novos do `CenarioRegimeSchema`: os blocos do centro com chave em inglês
   (`eligibility`, `assumptions`, `evidenceGrade`) e o campo BR `componentesDevido` (F-MU-3). Gate:
   `dtoShapeSnapshot.test.ts` atualizado só com os blocos novos (memória: o UPDATE do snapshot reordena no Windows — inserir
   à mão). O PR-0 só exporta os sub-schemas; cada um é acoplado ao `CenarioRegimeSchema`/`RegimeSimulacaoSchema` no PR que
   o preenche (`eligibility` no PR-1, `assumptions` e `evidenceGrade` no PR-3, `tieOut` no PR-4), para a resposta nunca ter
   campo obrigatório vazio.

### PR-1 — elegibilidade única (fecha `f514` e `35df`)

5. **`elegibilidadeRegimeAno(e: EntradaElegibilidade): ElegibilidadeAno`** pura (§5.2), em
   `paises/br/models/regimeElegibilidade.ts`, devolvendo o `YearEligibility` do centro, por regime `SIMPLES`, `PRESUMIDO`,
   `REAL`; o estado de cada regime sai de `aggregateEligibility` (corpo neste PR, em `models/regimeEligibility.ts`, com
   teste dos três ramos e da lista vazia). Testes unitários, um por linha da tabela da §2: ano anterior acima do EPP; excesso no ano > 20% (efeito no mês
   seguinte); ≤ 20% (elegível com aviso); ano de início acima do proporcional em mais de 20% (retroativo, § 10) e em até
   20% (sem retroagir, efeitos no ano seguinte, § 12); PJ no capital; sócio no exterior;
   interdependência acima do limite; locação de imóvel próprio; teto do Presumido `EXCEDIDO` ⇒ Presumido `BARRED` e Real
   obrigatório; o `NAO_CONFERIDO` do teto vira `UNVERIFIED`; vedação não derivável sem declaração ⇒ `UNVERIFIED`.
6. **Os limites do Simples saem do serviço:** o privado `SimplesApuracaoService.limites:921-971` vira chamada a
   `limitesDoSimples(...)` em `paises/br/models/regimeElegibilidade.ts` (a `SimplesApuracaoService` alcança a borda pelo
   escopo `LEGADO_BR` [F-PBA-5]), que devolve os **mesmos códigos e textos** de alerta
   (`LIMITE_ME_EXCEDIDO`, `LIMITE_EPP_EXCEDIDO`, `SUBLIMITE_ICMS_ISS`, `PROJECAO_*`, `INTERDEPENDENCIA_*`) e o booleano do
   sublimite. Gate: a suíte do Simples (`simples*.test.ts`) passa **sem edição** — exceto o que o F-MU-11 mudar para
   multiunidade, declarado no teste novo.
7. **Perfil fiscal:** `CompanyFiscalProfileService.avisosDoTeto:399-418` passa a ler a elegibilidade (mesmos textos de aviso; entrada `LEGADO_BR` [F-PBA-5]).
   Teste: os casos de hoje do teto (EXCEDIDO, NAO_CONFERIDO, REAL com `lucroRealObrigatorio = false`) dão o mesmo aviso.
8. **Montagem da entrada da elegibilidade** num leitor só (`paises/br/services/montadores/ElegibilidadeEntradaMontador.ts`): receita do
   ano anterior e do ano (receita da PJ, F-MU-11), início de atividade, sócios vigentes no ano (`Partner`), declaração de
   locação, teto do Presumido (`PresumidoTetoService.avaliar`), declarações do F-MU-8 (do satélite `BrCompanyFiscalProfile`, PR-1b). Usado pela rota do Simples, pelo perfil
   e pela simulação.
9. **Filtro antes do ranking (lacuna `f514`):** `simularRegimeAno` recebe a elegibilidade e o `melhor` só considera cenário
   `ELIGIBLE` (com `UNVERIFIED` conforme F-MU-9). Teste (o `comoProvar` da lacuna, integração): razão com receita anual
   acima de `SIMPLES_LIMITE/EPP` × 1,2 e Simples mais barato ⇒ `GET /simulacoes/regime` **não** devolve `melhor = SIMPLES`,
   o cenário traz `eligibility.state = 'BARRED'` com `effectiveFrom`, e `POST …/sugestao` não grava `TROCA_DE_REGIME` para
   `SIMPLES`.
10. **Presumido para quem é obrigado ao Real (lacuna `35df`):** teste unitário (o `comoProvar`): teto `EXCEDIDO` e Presumido
    mais barato ⇒ `PRESUMIDO` `BARRED` (Lei 9.718 arts. 13 e 14 I) e fora do `melhor`. Segundo teste: perfil REAL com
    `lucroRealObrigatorio = true` ⇒ Presumido `BARRED` pelo motivo declarado. Terceiro: empresa no Simples sem declaração do
    art. 14 II–VII ⇒ o motivo `OBRIGACAO_REAL_NAO_DECLARADA` sai `UNVERIFIED` e o Presumido fica `UNVERIFIED` pela
    regra de agregação (`aggregateEligibility`, §5.2), indo para `melhorCondicional` (F-MU-9 a); se o Presumido é o regime atual, ele conta como
    conferido nesses incisos (F-MU-16 a).
11. **Alertas da simulação vêm da elegibilidade:** os alertas `LIMITE_EPP_EXCEDIDO`, `SUBLIMITE_EXCEDIDO` e `SUBLIMITE_80` de
    `TaxSimulationService.ts:300-306` passam a sair da mesma função (o texto de hoje "fora do Simples" para qualquer excesso
    some: ele contradiz o § 9º-A). `JANELA_OPCAO` continua. Teste: os 4 casos da suíte `taxSimulation.regime.unit.test.ts`
    continuam passando; o caso de excesso ≤ 20% muda de texto e ganha teste próprio.
12. **Sugestão** (três códigos, um por caso; teste de integração de cada):
    - 400 `REGIME_VEDADO`: o regime sugerido está `BARRED` no ano (defesa em profundidade; o filtro do item 9 já o tira do
      `melhor`);
    - 400 `REGIME_NAO_CONFERIDO`: o pedido é sobre o `melhorCondicional` (F-MU-9 a);
    - 400 `REGIME_VEDADO_NO_ANO_SEGUINTE` (F-MU-15 a): `TROCA_DE_REGIME` para o Simples quando a receita do ano simulado passa
      o limite da EPP em até 20% — o Simples é `ELIGIBLE` no ano (§ 9º-A), mas vedado desde 1º/jan do ano seguinte (Res. CGSN
      140 art. 15 I), que é o ano em que a opção valeria. Fecha a segunda metade da lacuna `f514`.

### PR-1b — declaração das vedações não deriváveis (F-MU-8 a), no satélite do país

13. **Prisma (satélite do país, F-PB-2 a; ADR R4):** model `BrCompanyFiscalProfile` 1:1 com `CompanyFiscalProfile`
    (`companyFiscalProfileId String @unique`, FK `onDelete: Cascade`; tabela `br_company_fiscal_profiles`), colunas
    `declaracaoVedacoes Json?` (`{ [codigo]: 'SIM' | 'NAO' }`, ausente = não declarado) e `declaracaoObrigacaoReal Json?`
    (art. 14 II–VII). O `CompanyFiscalProfile` já é por `anoCalendario`, então a declaração é por ano. Migração aditiva (só a
    tabela nova; nenhuma coluna no model do centro). Repositório da borda
    `paises/br/repositories/{IBrCompanyFiscalProfileRepository,BrCompanyFiscalProfileRepository}.ts`, `tx` propagado.
    Soft-delete: o satélite segue o ciclo de vida do registro do centro (Cascade), sem `deletedAt` próprio. Tabela nova
    classificada no `resetDb()` e no `accountingResetClassification` (ordem de FK: antes do `CompanyFiscalProfile`).
14. **API da borda [F-PBA-4 a]:** `GET` e `PUT /api/accounting/company-fiscal-profile/:ano/br`, cadeia Route
    (`routes/accounting.ts`) → Controller (`src/controllers/brCompanyFiscalProfileController.ts`, F-PBA-3 a) →
    `paises/br/services/BrCompanyFiscalProfileService.ts` → repositório do item 13, com a **mesma policy** do recurso do
    centro (a que o `CompanyFiscalProfileService` usa hoje). DTO `paises/br/dtos/BrCompanyFiscalProfileDto.ts`, `.strict()`,
    com os dois campos e os códigos do catálogo do item 2; vale para todo regime (diferente de `lucroRealObrigatorio`). Ano
    sem `CompanyFiscalProfile` ⇒ 404 nomeado. O `CompanyFiscalProfileDto` **não muda**. Gates: snapshot do DTO em
    `paises/br/dtos` (só existe com o G2 do item 0); path novo em `routes/docs/accounting.company-fiscal-profile.paths.ts` +
    `docs.paths.ts` + `openapi.json` (guarda de path-count sobe 1); `auditCanonical.ts` com o evento de escrita do satélite
    e os dois campos (a allowlist continua central até a fatia F2 do ADR); paridade i18n pt/en dos rótulos dos códigos;
    `.gen.ts` do DTO novo.
15. A elegibilidade lê as declarações pelo `ElegibilidadeEntradaMontador` (borda, lê o repositório do item 13): `SIM` ⇒
    `BARRED` com o código; `NAO` ⇒ conferido; ausente (ou sem satélite no ano) ⇒ `UNVERIFIED`. Teste unitário por estado.

### PR-2 — montador do Simples (fecha `7bff`)

16. **Extração:** o corpo de `SimplesApuracaoService.montar:494-766` (e `montarCaixa`, `perfisDosProdutos`, `sociosNoMes`)
    passa a `paises/br/services/montadores/SimplesEntradaMontador.ts` (F-MU-1), que implementa `ISimplesEntradaMontador`
    (a porta do centro com os tipos do Simples). O serviço da rota (`LEGADO_BR` [F-PBA-5]) delega; `calcular`, `registrarDas`, `medidaDaApuracao` e
    `entradaParaSimulacao` chamam o `assemble` do montador em modo `ASSESSMENT`. **Gate:** a `impressao` e o `parametrosSha256` de uma
    competência de referência ficam byte a byte iguais (teste novo com fixture de subrazão + histórico + segregação + parceria
    + benefício de ISS + caixa), e as suítes do Simples passam sem edição.
17. **Modo `HYPOTHESIS`:** pula o gate `perfil.regime !== 'SIMPLES'` (`:502`) e não chama `tieOut` nem `conferirNfse`
    (são conferências do registro, não entrada do cálculo — os alertas deles não entram). Regime de apuração: o do perfil se o
    ano é do Simples; senão `COMPETENCIA` como premissa declarada (`SIMPLES_REGIME_COMPETENCIA_PRESUMIDO`). Teste unitário dos
    dois ramos.
18. **A simulação usa o montador:** `TaxSimulationService.calcularRegime` deixa de montar `atividadesSimples` e
    `receitaSimplesCents` (`:204-261`) e recebe, por mês, a `ApuracaoInput` do montador. `cenarioSimples` passa a chamar
    `apurar` sobre essa entrada (o histórico do RBT12 segue o mesmo encadeamento de hoje). Teste (o `comoProvar` da lacuna,
    integração): competência com `SimplesSegregacaoManual` diferente da derivada ⇒ o DAS do mês no cenário `SIMPLES` =
    `totalCalculadoCents` de `POST /simples/apuracoes/:c/calcular`.
19. Mesmo teste para **parceria** (contrato `ALUGUEL_BEM_MOVEL` ⇒ atividade `LOCACAO_MOVEL`) e **benefício municipal de ISS**
    (redução por faixa com piso). O aviso fixo de `TaxSimulationService.ts:263` ("cota do salão-parceiro entra como serviço")
    some, porque deixa de ser verdade.
20. **Fator r:** `entradaParaSimulacao` delega ao montador sem mudar a saída; a suíte do fator r passa sem edição.
21. **Interação com a ponte (#1321):** se a ponte entrar antes, o item 37 dela (folha do DP no `montar`) é transportado para o
    montador nesta mesma mudança; se entrar depois, ela edita o montador. Ordem no F-MU-13. Nenhum teste próprio: a suíte da
    ponte cobre.

### PR-3 — montadores de IRPJ/CSLL, PIS/COFINS e IBS/CBS

22. **`paises/br/services/montadores/IrpjCsllEntradaMontador.ts`** extraído de `TaxAssessmentService.calcular:803-896`: receita por atividade, receita
    hospitalar, resultado antes do IRPJ/CSLL, Lalur (`linhasParteA`, `parteBFechada`), memórias anteriores confirmadas e as
    `deducoes`. Modo `ASSESSMENT`: as `deducoes` vêm do DTO, como hoje. Modo `HYPOTHESIS`: do `entradaInformada` da linha
    CONFIRMED do período quando existe e o regime do ano é o simulado (`provenance = 'FACT'`); senão, conforme F-MU-2. Gate: a suíte
    do X7 passa sem edição.
23. **Gates do IRPJ/CSLL no modo `HYPOTHESIS`** (tabela da §5.4): regime e forma (`:807-815`) não se aplicam; a forma do Real
    hipotético segue o F-MU-4; a recusa multiunidade (`:824`) **continua** — vira cenário indisponível com o mesmo motivo; o
    teto (`:863`) sai daqui e vai para a elegibilidade (item 5).
24. **Real hipotético sem Lalur:** conforme F-MU-6; o cenário sai com `evidenceGrade = 'WITH_ASSUMPTIONS'` e uma `Assumption` por trimestre
    (código BR `PARTE_A_NAO_ESCRITURADA`). O aviso fixo de `taxSimulation.ts:365` só aparece quando a premissa existe.
25. **`paises/br/services/montadores/PisCofinsEntradaMontador.ts`** extraído de `PisCofinsAssessmentService.calcular:334-418`: receita por atividade, créditos
    das NF-e (`payableRepo.findPisCofinsCredits` — existe em qualquer regime), saldo anterior, e
    `ajustesBase`/`outrosCreditos`/`retencoes` (DTO na rota; `entradaInformada` do CONFIRMED na hipótese, ou F-MU-2). A
    modalidade vem do regime simulado (`CUMULATIVO` no Presumido, `NAO_CUMULATIVO` no Real). Gate: suíte do X8 sem edição.
26. **Gates do PIS/COFINS no modo `HYPOTHESIS`:** `modalidadeDoRegime` (`:339`) recebe o regime simulado; o caixa (`:345`)
    continua recusando **na rota**; na hipótese (F-MU-14 a) o Presumido/Real de empresa no caixa é simulado por competência
    com a premissa `CAIXA_SIMULADO_POR_COMPETENCIA` (hoje a troca é feita em `TaxSimulationService.ts:454` só com aviso); `pisCofinsRegime` da unidade (`:350`) não se aplica (é configuração do regime atual). O aviso "sem créditos" de
    `taxSimulation.ts:366` só aparece se não houver crédito lido.
27. **`paises/br/services/montadores/IbsCbsEntradaMontador.ts`** extraído de `IbsCbsAssessmentService.calcular:379-419` (documentos, vendas sem documento,
    créditos, pacote, split). Regime atual regular ⇒ fato lido; regime simulado regular de empresa do Simples ⇒ conforme
    F-MU-5. Gate: suíte do IBS-CBS-2027 sem edição.
28. **`cargaComum` e os cenários Presumido/Real** (`taxSimulation.ts:219-351`) passam a receber as entradas montadas (não mais
    receita crua + listas vazias). CPP e ISS fora do Simples continuam como hoje (folha informada × patronal; alíquota do
    perfil), **cada um como `Assumption` declarada** com o motivo que hoje está nos avisos fixos (`:369-370`), até a ponte (#1321
    item 39) e um nó de ISS os trocarem por fato. ICMS da revenda idem (aviso de `:368` vira premissa).
29. **Métrica do ranking** pelo devido (F-MU-3 a); a resposta ganha `componentesDevido` ao lado de `componentes` (a pagar). Teste unitário: com
    retenção informada, o `melhor` não muda por causa dela.

### PR-4 — aferição (fecha `a2ce`)

30. **Teste de tie-out do Simples** (o `comoProvar` da lacuna, integração): a mesma unidade apurada pela rota nos 12 meses
    (`POST /simples/apuracoes/:c/calcular`) ⇒ `cenarios[SIMPLES].componentes.das` = Σ `totalCalculadoCents`.
31. **Teste de tie-out do Presumido:** 4 trimestres confirmados (`TaxAssessment` CONFIRMED de IRPJ e CSLL) e 12 meses de
    PIS/COFINS confirmados ⇒ `irpj`, `csll`, `pis`, `cofins` do cenário `PRESUMIDO` = Σ `devidoCents` e Σ `aPagarCents` das
    linhas confirmadas (F-MU-3 a: o devido para o ranking, os dois na aferição). Mesmo teste para o Real com Lalur escriturado.
32. **Aferição em tempo de execução** (F-MU-12 a): a resposta ganha `tieOut` (§5.5, `TieOutRowSchema` do centro): para cada período do regime atual
    com apuração confirmada, `simulatedCents`, `assessedCents`, `differenceCents`; diferença ≠ 0 ⇒ `state = 'DIVERGES'` e o
    alerta BR `AFERICAO_DIVERGENTE` com o período e o componente. Período sem confirmação ⇒ `NOT_ASSESSED`. Teste de integração: dado
    divergente forçado (DAS registrado com valor oficial diferente não conta — compara-se o **calculado**).
33. **`parametrosSha256` e sugestões vivas:** o `calc` gravado na sugestão muda de forma (elegibilidade, premissas, aferição).
    Uma `TaxOptimizationSuggestion` PROPOSED de `TROCA_DE_REGIME` calculada antes desta emenda vai dar `parametrosDivergentes`
    no próximo POST (I-10: não é recalculada, só avisa). Teste de integração que fixa esse comportamento; nota no corpo do PR.

---

## 5. Contratos esboçados

### 5.1 Entrada etiquetada (centro: `models/assessmentInput.ts`, PR-0)

```ts
export type Provenance = 'FACT' | 'ASSUMPTION' | 'UNVERIFIED';

export interface Assumption {
  code: string;                     // código do país; BR: 'PARTE_A_NAO_ESCRITURADA', 'DEDUCOES_NAO_INFORMADAS', 'CPP_SEM_RAT_FAP_TERCEIROS'
  component: string;                // componente do país; BR: keyof Componentes ('irpj' | 'csll' | 'pis' | 'cofins' | 'cbs' | 'ibs' | 'cpp' | 'iss' | 'das')
  period: string;                   // 'T01' | 'M03' | '2026-03' …
  assumedValueCents: bigint | null; // null = "não entrou no cálculo"
  reason: string;                   // texto com a base legal ou a falta de dado
}

export interface LabeledValue<T> { value: T; provenance: Provenance; assumption?: Assumption }
export function requireAssumption<T>(v: LabeledValue<T>): asserts v is LabeledValue<T> & { assumption: Assumption };

/** O que cada montador devolve: a entrada pronta para a função pura + o que nela não é fato. */
export interface AssembledInput<TInput, TAlert = never> {
  input: TInput;               // BR: ApuracaoInput | PresumidoTrimestralInput | RealTrimestralInput | PisCofinsMensalInput | IbsCbsMesInput
  assumptions: Assumption[];
  alerts: TAlert[];            // BR: AlertaSimples no montador do Simples; [] nos demais
  imprint: string;             // BR Simples: a `impressao` de hoje, byte a byte; nos demais, JSON canônico das leituras
  legalLines: LinhaLegal[];
}

export type AssemblyMode = 'ASSESSMENT' | 'HYPOTHESIS';
```

### 5.2 Elegibilidade (centro: `models/regimeEligibility.ts`; borda: `paises/br/models/regimeElegibilidade.ts`; PR-0 tipos / PR-1 corpo)

```ts
// ---- centro ----
export type EligibilityState = 'ELIGIBLE' | 'BARRED' | 'UNVERIFIED';

export interface EligibilityReason<TCode extends string = string> {
  code: TCode;
  legalBasis: string;              // BR: 'LC 123/2006 art. 3º § 9º-A' …
  detail: string;
  effectiveFrom: string | null;    // YYYY-MM-DD; null = o ano inteiro
  state: EligibilityState;         // o que ESTE motivo produz
}
export interface RegimeEligibility<TRegime extends string, TCode extends string = string> {
  regime: TRegime; state: EligibilityState; reasons: EligibilityReason<TCode>[];
}
export interface YearEligibility<TRegime extends string, TAlert, TCode extends string = string> {
  year: number; regimes: RegimeEligibility<TRegime, TCode>[]; alerts: TAlert[];
}
/** Pura. Algum BARRED ⇒ BARRED; senão algum UNVERIFIED ⇒ UNVERIFIED; senão ELIGIBLE (lista vazia ⇒ ELIGIBLE). */
export function aggregateEligibility(reasons: ReadonlyArray<Pick<EligibilityReason, 'state'>>): EligibilityState;

// ---- borda BR ----
export type CodigoMotivoBr = CodigoVedacaoSimples | CodigoObrigacaoReal | 'LIMITE_EPP_ANO_ANTERIOR' | 'EXCESSO_EPP_ACIMA_20'
  | 'EXCESSO_EPP_ATE_20' | 'EXCESSO_INICIO_ATIVIDADE' | 'TETO_PRESUMIDO_EXCEDIDO' | 'TETO_PRESUMIDO_NAO_CONFERIDO';
export type MotivoElegibilidade = EligibilityReason<CodigoMotivoBr>;
export type ElegibilidadeAno = YearEligibility<RegimeSimulado, AlertaSimples, CodigoMotivoBr>;

export interface EntradaElegibilidade {
  ano: number;
  regimeAtual: string | null;
  inicioAtividade: string | null;          // YYYY-MM
  receitaMensalPj: ReadonlyMap<string, bigint>; // Y−1 e Y, soma de todas as unidades (F-MU-11)
  competenciaCorte: string;                // até onde o ano é realizado (rota: o PA; simulação: dezembro)
  linhas: readonly LinhaLegal[];           // SIMPLES_LIMITE, TAX_ASSESSMENT
  socios: ReadonlyArray<{ tipoPessoa: 'PF' | 'PJ'; residenteBrasil: boolean; outrasParticipacoes: OutraParticipacao[] | null; vigente: boolean }>;
  locacaoImovelProprio: boolean | null;
  tetoPresumido: TetoPresumidoResultado;   // de PresumidoTetoService.avaliar
  lucroRealObrigatorioDeclarado: boolean | null;  // só existe no REAL
  declaracaoVedacoes: Partial<Record<CodigoVedacaoSimples, 'SIM' | 'NAO'>> | null;   // F-MU-8, do BrCompanyFiscalProfile
  declaracaoObrigacaoReal: Partial<Record<CodigoObrigacaoReal, 'SIM' | 'NAO'>> | null;
}

/**
 * Pura. Sem I/O, sem new Date. O `state` de cada regime vem de `aggregateEligibility(reasons)` (centro).
 * Regime atual (F-MU-16 a): as vedações/obrigações NÃO deriváveis contam como conferidas para o regime em que a empresa
 * já está no ano (no Simples, a opção inclui a declaração do art. 6º § 4º da Res. CGSN 140); as deriváveis seguem pelo dado.
 * Consequência com as declarações do F-MU-8 vazias: o regime atual e o Real (sem vedação própria) ficam ELIGIBLE; o outro
 * regime fica UNVERIFIED e, se for o mais barato, sai em `melhorCondicional`. `economiaCents` = atual − melhor ELIGIBLE;
 * `economiaCondicionalCents` = atual − melhorCondicional, à parte (F-MU-16 a).
 */
export function elegibilidadeRegimeAno(e: EntradaElegibilidade): ElegibilidadeAno;
/** Pura. Os alertas de limite que o X14 já emite, com os mesmos códigos e textos, + o booleano do sublimite. */
export function limitesDoSimples(e: EntradaElegibilidade, competencia: string): { alertas: AlertaSimples[]; sublimiteExcedido: boolean };
```

### 5.3 Montadores (centro: `ports/AssessmentInputAssembler.ts`; borda: `paises/br/services/montadores/`; PR-0 interfaces / PR-2 e PR-3 corpo)

```ts
// ---- centro (porta: só tipos do centro + Prisma.TransactionClient) ----
export interface AssemblyOptions<TRegime extends string = string> {
  mode: AssemblyMode; regime?: TRegime; tx?: Prisma.TransactionClient;
}
export interface AssessmentInputAssembler<TPeriod, TInput, TAlert = never, TExtra = {}> {
  assemble(scope: AccountingScope, period: TPeriod, opts: AssemblyOptions): Promise<AssembledInput<TInput, TAlert> & TExtra>;
}

// ---- borda BR ----
export type ISimplesEntradaMontador = AssessmentInputAssembler<string /* competência */, ApuracaoInput, AlertaSimples, MontagemSimplesExtra>;
export type IIrpjCsllEntradaMontador = AssessmentInputAssembler<{ ano: number; periodo: PeriodoTrimestral }, EntradaIrpjCsllTrimestre>;
export type IPisCofinsEntradaMontador = AssessmentInputAssembler<{ ano: number; periodo: PeriodoPisCofins }, EntradaPisCofinsMes>;
export type IIbsCbsEntradaMontador = AssessmentInputAssembler<{ ano: number; mes: number; tributo: 'IBS' | 'CBS' }, EntradaIbsCbsMes>;
/** Só BR: a entrada da elegibilidade é do Brasil (CGSN 140, Lei 9.718), não uma entrada de apuração. */
export interface IElegibilidadeEntradaMontador {
  montar(s: AccountingScope, ano: number, competenciaCorte: string, tx?: Prisma.TransactionClient): Promise<EntradaElegibilidade>;
}
```

`MontagemSimplesExtra` carrega o que só a rota usa hoje (`calculada`, `entrada`, `receitas`, `beneficios`, `tieOut`,
`regimeApuracao`, `baseCaixa`, `impedimentoCaixa`, `dasSemSegregacaoCents`, `receitaPaCents`) — a interface `Montagem` atual,
sem mudança de campo.

### 5.4 Tabela de gates no modo `HYPOTHESIS` (itens 17, 23, 26, 27)

| Gate (hoje) | Onde | No modo `HYPOTHESIS` |
|---|---|---|
| perfil do ano tem de ser SIMPLES | `SimplesApuracaoService.ts:502` | pulado |
| regime de apuração CAIXA do Simples | `:536` | o do perfil, se o ano é do Simples; senão `COMPETENCIA` + premissa |
| tie-out e conferência da NFS-e | `:719-725` | fora (não são entrada do cálculo) |
| regime SIMPLES/MEI recusa IRPJ/CSLL | `TaxAssessmentService.ts:807-810` | pulado |
| forma trimestral × anual do perfil | `:811-816` | Presumido: trimestral; Real: F-MU-4 |
| outra unidade com movimento | `:824-829` | **mantido** ⇒ cenário indisponível com o mesmo motivo |
| teto do Presumido (aviso/400) | `:863-865` | sai daqui; é a elegibilidade |
| modalidade pelo regime | `PisCofinsAssessmentService.ts:339` | modalidade do regime simulado |
| caixa do PIS/COFINS e do IRPJ/CSLL | `:345`; `taxAssessmentCalc.ts:558` | competência + premissa `CAIXA_SIMULADO_POR_COMPETENCIA` (F-MU-14 a) |
| `pisCofinsRegime` da unidade | `:350` | pulado |
| ano ≥ 2027 recusa PIS/COFINS | `:344` | mantido (2027 é IBS/CBS) |
| SIMPLES/MEI recusa IBS/CBS regular | `IbsCbsAssessmentService.ts:384` | pulado; documentos conforme F-MU-5 |
| policy (`assertRead`/`assertManage`) | todos | fica no serviço da rota e no `TaxSimulationService`; o montador não checa policy |

### 5.5 Resposta da simulação (centro: `dtos/AssessmentInputDto.ts`; legado BR: `dtos/TaxSimulationDto.ts`; PR-0)

```ts
// ---- centro — dtos/AssessmentInputDto.ts (chaves em inglês, F-PBA-1 a). Os helpers de centavos são do centro (mesma
// regex de `TaxSimulationDto.ts:13`); o legado BR pode importá-los daqui, nunca o contrário.
export const ELIGIBILITY_STATES = ['ELIGIBLE', 'BARRED', 'UNVERIFIED'] as const;
export const AssumptionSchema = z.object({ code: z.string(), component: z.string(), period: z.string(),
  assumedValueCents: cents.nullable(), reason: z.string() }).strict();
export const EligibilityReasonSchema = z.object({ code: z.string(), legalBasis: z.string(), detail: z.string(),
  effectiveFrom: z.string().nullable(), state: z.enum(ELIGIBILITY_STATES) }).strict();
export const EligibilitySchema = z.object({ state: z.enum(ELIGIBILITY_STATES), reasons: z.array(EligibilityReasonSchema) }).strict();
export const EvidenceGradeSchema = z.enum(['TIED_OUT', 'FACTS_ONLY', 'WITH_ASSUMPTIONS']);
export const TieOutRowSchema = z.object({ period: z.string(), component: z.string(), simulatedCents: signedCents,
  assessedCents: signedCents.nullable(), differenceCents: signedCents.nullable(),
  state: z.enum(['MATCHES', 'DIVERGES', 'NOT_ASSESSED']) }).strict();   // F-MU-12 a

// ---- legado BR — dtos/TaxSimulationDto.ts ----
// CenarioRegimeSchema ganha:
//   eligibility: EligibilitySchema                 [F-PBA-1: bloco do centro, chave em inglês]
//   evidenceGrade: EvidenceGradeSchema
//   assumptions: z.array(AssumptionSchema.extend({ component: z.enum(COMPONENTES) }))   — o BR restringe o componente
//   (F-MU-3 a) componentesDevido: ComponentesSchema   — campo BR, em português; `componentes` segue sendo o a pagar
// RegimeSimulacaoSchema ganha:
//   melhorCondicional: z.enum(REGIMES_SIMULADOS).nullable()   (F-MU-9 a; campo BR)
//   economiaCondicionalCents: signedCents.nullable()           (F-MU-16 a; campo BR)
//   tieOut: z.array(TieOutRowSchema)                           (F-MU-12 a; bloco do centro)
//   (não confundir com o campo `tieOut` da `Montagem` do Simples, §5.3: aquele é a conferência interna do registro do DAS
//   com o razão e não sai na resposta; se a revisão do PR-0 achar o nome ambíguo, a chave da resposta vira `assessmentTieOut`)
```

Gates que o diff aciona (entram nos itens, não na improvisação): snapshot do DTO (itens 4 e 14 — `AssessmentInputDto.ts`
no domínio `accounting`; `BrCompanyFiscalProfileDto.ts` em `accounting/paises/br`, que só entra no snapshot com o G2 do
item 0); `auditCanonical.ts` (item 14); i18n pt/en dos códigos novos de motivo e premissa (itens 2 e 14); path-count do
openapi **muda só no PR-1b** (o path novo `/company-fiscal-profile/{ano}/br`); nos outros PRs o `openapi.json` muda só no
schema da resposta de `GET /simulacoes/regime`; `check:arch` com as regras `P1`/`P2` do item 0: os montadores ficam em
`paises/br/services/` e só chamam repositórios; os serviços legados BR que os chamam estão no escopo `LEGADO_BR` [F-PBA-5];
nenhum arquivo do centro (`models/assessmentInput.ts`, `models/regimeEligibility.ts`, `ports/`, `dtos/AssessmentInputDto.ts`)
importa `paises/`.

---

## 6. FORKS — RATIFICADOS em 21/11/2026 ([[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO-FORKS]])

> Texto de 21/11, com os nomes e caminhos de então (`services/montadores/`, `APURACAO`/`HIPOTESE`, `VEDADO`/`NAO_CONFERIDO`).
> A emenda de 24/11 (bloco do topo) troca nomes e caminhos; não reabre nenhuma das escolhas.

Cada um com os caminhos, a recomendação e a justificativa, como foram levados ao dono. O dono respondeu os 16 no
questionário de 21/11 (F-MU-14..16 numa 2ª rodada, abertos pela revisão do BRIEF), todos na opção recomendada (a). A sessão registrou as respostas; não escolheu nenhuma.

### F-MU-1 — Onde mora o montador
> **RATIFICADO 21/11 → (a)** — dono, questionário: *"Classe por tributo"* ([[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO-FORKS]]).

- (a) **Classe por tributo** em `services/montadores/` (`SimplesEntradaMontador`, `IrpjCsllEntradaMontador`,
  `PisCofinsEntradaMontador`, `IbsCbsEntradaMontador`, `ElegibilidadeEntradaMontador`), injetada pela factory no serviço da
  rota e no `TaxSimulationService`; o serviço da rota fica com policy, gates, gravação e provisão.
- (b) Método público só de leitura em cada serviço de apuração (`entrada(scope, periodo, modo)`), e a simulação injeta
  `Pick<Servico, 'entrada'>` (como já faz com `entradaParaSimulacao`).
- (c) Um `ApuracaoEntradaService` único com os quatro.
- **Recomendação: (a).** É a camada dona: o montador só lê, e a simulação deixa de depender de serviços que lançam no razão.
  O modo `HIPOTESE` precisa pular gates que hoje estão misturados no mesmo método (§5.4), e o montador separado se testa sem
  o resto do serviço. (b) é o remendo: menor diff, mas o `montar` do Simples continua com 270 linhas dentro de um serviço de
  1.377. (c) junta quatro tributos sem relação numa classe só.

### F-MU-2 — Entradas digitadas fora da apuração confirmada (deduções, retenções sofridas, ajustes de base, outros créditos)
> **RATIFICADO 21/11 → (a)** — dono, questionário: *"Premissa nomeada"* ([[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO-FORKS]]).

- (a) Período do regime atual **com** CONFIRMED ⇒ lê o `entradaInformada` (fato). Período sem confirmação, ou regime
  simulado diferente do atual ⇒ `Premissa` nominal por período e componente, com `valorAssumidoCents = 0` e o motivo
  ("não informado na apuração" / "não existe fora do regime"), e o cenário vira `COM_PREMISSAS`.
- (b) Período do regime atual sem confirmação ⇒ cenário indisponível até confirmar.
- (c) (a) + derivar as retenções sofridas do RETENCOES-FONTE quando o nó entregar (hoje não existe leitor).
- **Recomendação: (a)**, com (c) registrada como passo seguinte quando o RETENCOES-FONTE fechar. (b) deixa a simulação
  indisponível na maior parte do ano para quem não confirma todo mês; (a) mostra o mesmo número com o buraco nomeado.

### F-MU-3 — Métrica do ranking
> **RATIFICADO 21/11 → (a)** — dono, questionário: *"Pelo devido"* ([[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO-FORKS]]).

- (a) **Devido** (antes de retenções e compensações): retenção é antecipação do mesmo tributo, não economia. A resposta mostra
  devido e a pagar; a aferição compara os dois.
- (b) A pagar, como hoje (`aPagarCents`).
- **Recomendação: (a).** Com (b), uma retenção sofrida num regime e não no outro muda o `melhor` sem mudar a carga real.

### F-MU-4 — Forma do Real hipotético para quem não está no Real
> **RATIFICADO 21/11 → (a)** — dono, questionário: *"Trimestral"* ([[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO-FORKS]]).

- (a) **Trimestral**, como hoje, com premissa declarada (`REAL_TRIMESTRAL_PRESUMIDO`).
- (b) Anual por estimativa.
- (c) Os dois, como dois cenários.
- **Recomendação: (a).** É o que o cenário já faz; escolher a forma é otimização dentro do regime, que é da camada de
  decisão. Quem já está no Real usa a forma do perfil (fato).

### F-MU-5 — IBS/CBS do regime regular para quem está no Simples (2027+)
> **RATIFICADO 21/11 → (a)** — dono, questionário: *"Receita × alíquota"* ([[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO-FORKS]]).

- (a) **Receita do razão × alíquota vigente** (como o `cargaComum` faz hoje) como premissa declarada, com os créditos dos
  títulos a pagar lidos como fato (`payableRepo.findIbsCbsCredits` existe em qualquer regime).
- (b) Recalcular a partir dos documentos fiscais emitidos, trocando o destaque pela alíquota regular.
- (c) Cenário indisponível a partir de 2027 para quem está no Simples.
- **Recomendação: (a).** O documento de quem está no Simples não traz a base nem o destaque do regime regular (o próprio
  serviço grava `baseCents: null`, `IbsCbsAssessmentService.ts:403`); (b) inventaria a base. (c) esconde justamente a
  comparação que 2027 exige.

### F-MU-6 — Parte A do Lalur no Real hipotético para quem nunca escriturou
> **RATIFICADO 21/11 → (a)** — dono, questionário: *"Zero como premissa"* ([[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO-FORKS]]).

- (a) **Parte A = 0** como premissa declarada por trimestre (`PARTE_A_NAO_ESCRITURADA`), cenário `COM_PREMISSAS`.
- (b) Cenário Real indisponível para quem não tem Lalur.
- (c) Estimar adições usuais por conta contábil (multas, brindes, provisões).
- **Recomendação: (a).** (c) é projeção, da camada de decisão; (b) tira do ranking o regime que mais muda o resultado.

### F-MU-7 — Exclusão no meio do ano (excesso acima de 20%, LC 123 art. 3º § 9º)
> **RATIFICADO 21/11 → (a)** — dono, questionário: *"Vedado, com a data"* ([[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO-FORKS]]).

- (a) **Simples `VEDADO`** no ano, com `efeitosDesde` = mês seguinte ao excesso.
- (b) Cenário parcial: Simples até o mês do excesso e o regime de destino depois.
- **Recomendação: (a).** (b) exige escolher o regime de destino, que é decisão; quando a camada de decisão existir, ela
  monta o parcial em cima deste motivo. Excesso de até 20% (§ 9º-A) **não** é fork: `ELEGIVEL` no ano, por lei.

### F-MU-8 — Vedações e obrigações sem dado no sistema
> **RATIFICADO 21/11 → (a)** — dono, questionário: *"Declaração por inciso"* ([[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO-FORKS]]).

- (a) **Declaração por ano no perfil** (`declaracaoVedacoes`, `declaracaoObrigacaoReal`, tri-estado por código do catálogo;
  PR-1b), com as deriváveis preenchidas pelo sistema; ausente ⇒ `NAO_CONFERIDO`.
- (b) Só as deriváveis; o resto vira um aviso fixo "demais vedações do art. 15 não conferidas".
- (c) Uma declaração única por ano, espelho do ato de opção ("não incorro nas vedações do art. 15", Res. CGSN 140 art. 6º § 4º).
- **Recomendação: (a).** É a única que diz **qual** vedação, e o contador de cada cliente responde uma vez no onboarding.
  (c) é a versão incremental possível se o dono quiser menos campos agora: copia o ato que a lei já exige, mas perde o motivo.

### F-MU-9 — Regime `NAO_CONFERIDO` no ranking
> **RATIFICADO 21/11 → (a)** — dono, questionário: *"Melhor condicional"* ([[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO-FORKS]]).

- (a) `melhor` só entre `ELEGIVEL`; se o mais barato for `NAO_CONFERIDO`, ele sai em `melhorCondicional`, com os motivos, e
  o POST de sugestão recusa 400 `REGIME_NAO_CONFERIDO` para ele.
- (b) `NAO_CONFERIDO` fora do ranking, igual a `VEDADO`.
- (c) Dentro do ranking com aviso.
- **Recomendação: (a).** Mostra a economia possível sem gravar sugestão sobre regime que pode ser vedado. Sem declarações
  (F-MU-8 ainda vazio), (b) tiraria quase todo regime do ranking; (c) repete o defeito da `f514`.

### F-MU-10 — `projecao2027` (decisão 4 de 28/10)
> **RATIFICADO 21/11 → (a)** — dono, questionário: *"Manter, com premissas"* ([[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO-FORKS]]).

- (a) **Manter** como transformação pura da entrada já montada (os fatos de 2026 levados a 2027), com uma `Premissa` por
  componente que a transformação assume (alíquotas 2027, RBT12 deslocado).
- (b) Tirar da resposta e levar para a camada de decisão (altera a decisão 4).
- **Recomendação: (a).** Não regride o que foi ratificado; a projeção já é declarada. A camada de decisão a substitui quando
  existir.

### F-MU-11 — Receita usada para os limites: PJ ou unidade
> **RATIFICADO 21/11 → (a)** — dono, questionário: *"Receita da PJ"* ([[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO-FORKS]]).

- (a) **Receita da PJ** (todas as unidades do dono), na elegibilidade da rota e da simulação — Res. CGSN 140 art. 16 § 2º
  [D03]; o teto do Presumido já soma assim (`PresumidoTetoService.ts:37`).
- (b) Unidade, como a rota do Simples faz hoje (`ReceitaFiscalRepository.ts:69`).
- **Recomendação: (a).** É o texto da norma. Efeito declarado: com mais de uma unidade, os alertas de limite da rota do
  Simples mudam de valor (o item 6 marca esse caso). O RBT12 e o DAS por unidade **não** entram aqui (achado fora de escopo
  1).

### F-MU-12 — Aferição só no teste ou também na resposta
> **RATIFICADO 21/11 → (a)** — dono, questionário: *"Teste e resposta"* ([[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO-FORKS]]).

- (a) **Teste de integração + bloco `afericao`** na resposta, com o alerta `AFERICAO_DIVERGENTE`.
- (b) Só o teste.
- **Recomendação: (a).** O teste prova o dado da fixture; a aferição na resposta prova o dado de cada cliente, que é onde a
  divergência aparece (I-10 já trata sugestão antiga). Custa uma leitura das linhas confirmadas do ano.

### F-MU-13 — Ordem com a ponte da folha (#1321) e o ciclo fiscal (#1322)
> **RATIFICADO 21/11 → (a)** — dono, questionário: *"Montador antes"* ([[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO-FORKS]]).

- (a) **PR-2 desta emenda antes** do item 37 da ponte e do PR-1 do ciclo: a ponte e o ciclo editam o montador já extraído.
- (b) A ponte e o ciclo antes; o PR-2 transporta as mudanças deles para o montador.
- **Recomendação: (a).** Extrair primeiro evita que três sessões editem as mesmas 270 linhas do `montar` e que o item 37 e
  os `*PeloSistema` precisem ser refeitos. Se o dono preferir liberar o ciclo antes (ele é a trava central do fiscal, handoff
  §2 C1), (b) funciona com um passo de transporte no item 21.

### F-MU-14 — Regime de caixa no Presumido/Real hipotético
> **RATIFICADO 21/11 → (a)** — dono, questionário (2ª rodada): *"Competência como premissa"* ([[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO-FORKS]]).
- (a) **Competência com premissa declarada** (`CAIXA_SIMULADO_POR_COMPETENCIA`), cenário `COM_PREMISSAS`.
- (b) Cenário indisponível, com o motivo da rota (IN RFB 2.121 art. 127; `taxAssessmentCalc.ts:558`).
- **Recomendação: (a).** Mantém o comportamento de hoje (troca com aviso), agora nomeado; (b) tira a comparação de quem está
  no caixa.

### F-MU-15 — Excesso de até 20% e a sugestão de trocar para o Simples
> **RATIFICADO 21/11 → (a)** — dono, questionário (2ª rodada): *"Recusa a sugestão"* ([[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO-FORKS]]).
- (a) Simples `ELEGIVEL` no ano simulado (a carga aparece), mas o POST recusa `TROCA_DE_REGIME` para o Simples com 400
  `REGIME_VEDADO_NO_ANO_SEGUINTE`.
- (b) Grava a sugestão com aviso.
- **Recomendação: (a).** A opção valeria para o ano seguinte, em que o Simples está vedado (Res. CGSN 140 art. 15 I).

### F-MU-16 — Declarações vazias e o regime atual
> **RATIFICADO 21/11 → (a)** — dono, questionário (2ª rodada): *"Regime atual conferido"* ([[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO-FORKS]]).
- (a) O regime atual conta como conferido nas vedações e obrigações não deriváveis (a empresa já optou; no Simples a opção
  inclui a declaração do art. 6º § 4º da Res. CGSN 140); os outros regimes sem declaração vão para `melhorCondicional`; a
  economia é contra o melhor elegível, e a condicional sai à parte.
- (b) Nenhuma exceção: até o contador declarar, só o Real é elegível.
- **Recomendação: (a).** Com (b), o Real vira o `melhor` de todo cliente até as declarações existirem.

---

## 7. Pendente de validação externa e insumos ausentes

**Validação externa:** nenhuma regra do checklist depende de contador. As vedações não deriváveis são fato do cliente
(declaração do contador de cada cliente no onboarding, como a P-EF-7), não pergunta ao nosso contador.

**Insumos ausentes:**
1. **Retenções sofridas** sem leitor próprio: só existem digitadas em cada apuração (`entradaInformada`). RETENCOES-FONTE
   (inflight) é a fonte futura (F-MU-2 c).
2. **Folha completa** (CPP com RAT/FAP e terceiros): vem da ponte (#1321 itens 34–39). Até lá, premissa declarada (item 28).
3. **Receita de exportação separada** (Res. CGSN 140 art. 2º § 1º e art. 15 I contam o mercado interno e a exportação em
   limites distintos): o razão não separa. A elegibilidade soma tudo como mercado interno, que é a leitura conservadora (só
   pode errar para `VEDADO`, nunca recomendar regime vedado), e o motivo de limite traz a frase "receita de exportação não
   separada" no `detalhe`. Separar a exportação é nó próprio, sem cliente exportador hoje.
4. **ISS fora do Simples e ICMS da revenda** não têm apuração (X7 e o nó novo de ICMS, decidido em 21/11): seguem premissa.

---

## 8. Achados fora de escopo (vão à caixa)

1. **RBT12 e limites do Simples por unidade:** a apuração soma a receita da unidade (`ReceitaFiscalRepository.ts:69`), mas
   a base de cálculo e os limites do Simples somam todos os estabelecimentos (Res. CGSN 140 art. 16 § 2º [D03]). A PJ com 2
   unidades tem o DAS calculado por faixa errada. Diferente do IRPJ/CSLL, que recusa (`TaxAssessmentService.ts:824`), o Simples
   não avisa. Registrado na caixa (id na §10).

---

## 9. Fold desta sessão

- Cédula nova [[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO]] com a autorização citável e o escopo (planejar; código só com
  `executa` depois dos forks).
- Nota do nó: seção "Fold 21/11 — emenda montador único", linha nova em "Docs", prefixo no `estado_detalhe` e no
  `autorizacao`, `write_set` e `registros` acrescidos, `prs` com o PR deste BRIEF. `estado` continua `inflight`.
- As 4 lacunas ganham `destino` apontando para este BRIEF e o item que as fecha.
- Respostas do dono aos forks: cédula [[D-2026-11-21-EFICIENCIA-FISCAL-MONTADOR-UNICO-FORKS]] e §6 (cada fork marcado RATIFICADO).

## 10. Lacunas registradas nesta sessão

- `L-20261121-200757-976c` (defeito, nó X14): RBT12, faixa e limites do Simples somam só a unidade do escopo; a Res. CGSN
  140 art. 16 § 2º manda somar todos os estabelecimentos (achado 1 da §8).
- As 4 lacunas de origem (`f514`, `35df`, `7bff`, `a2ce`) apontam para este BRIEF, com o item que fecha cada uma (§3).

## 11. Write-set

Caminhos curtos relativos a `server/src/features/accounting/` (emendado em 24/11).

| PR | Arquivos |
|---|---|
| PR-0 | **item 0:** `server/.dependency-cruiser.cjs`, `docs/adr/ADR-ARCH-BOUNDARIES.md` (§1.2), `dtos/__tests__/dtoShapeSnapshot.test.ts`, `__tests__/atomicUntil.boundary.test.ts`, `server/.dependency-cruiser-known-violations.json` (só se o G1 mudar a contagem), e o que o G4/G5 pedir (`scripts/classe-risco.mjs`, `scripts/paralelo.mjs`); **contrato:** `models/assessmentInput.ts` (novo), `models/regimeEligibility.ts` (novo, tipos), `ports/AssessmentInputAssembler.ts` (novo), `dtos/AssessmentInputDto.ts` (novo), `paises/br/models/regimeElegibilidade.ts` (novo, tipos e catálogo), `paises/br/services/montadores/I*EntradaMontador.ts` (novos), `dtos/TaxSimulationDto.ts`, `dtos/__tests__/__dto-shapes__.json`, `my-app/types/contracts/accounting/{TaxSimulationDto,AssessmentInputDto}.gen.ts` (gerados), `my-app/public/locales/{pt,en}/accounting.json` (códigos de motivo e premissa) |
| PR-1 | `models/regimeEligibility.ts` (corpo de `aggregateEligibility`), `paises/br/models/regimeElegibilidade.ts`, `paises/br/services/montadores/ElegibilidadeEntradaMontador.ts` (novo), `services/SimplesApuracaoService.ts` (`limites`), `services/CompanyFiscalProfileService.ts` (`avisosDoTeto`), `services/PresumidoTetoService.ts` (só se a leitura mudar de lugar), `models/presumidoTeto.ts` (leitura), `models/taxOptimizationAlertas.ts` (reuso), `models/taxSimulation.ts`, `services/TaxSimulationService.ts`, `__tests__/**`, `paises/br/**/__tests__/**` |
| PR-1b | `server/prisma/schema.prisma` + migração (`BrCompanyFiscalProfile`), `paises/br/repositories/{IBrCompanyFiscalProfileRepository,BrCompanyFiscalProfileRepository}.ts`, `paises/br/services/BrCompanyFiscalProfileService.ts`, `paises/br/dtos/BrCompanyFiscalProfileDto.ts`, `paises/br/services/montadores/ElegibilidadeEntradaMontador.ts`, `server/src/controllers/brCompanyFiscalProfileController.ts`, `audit/auditCanonical.ts`, `models/accountingResetClassification.ts`, `my-app/types/contracts/accounting/BrCompanyFiscalProfileDto.gen.ts`, i18n, `paises/br/**/__tests__/**` |
| PR-2 | `paises/br/services/montadores/SimplesEntradaMontador.ts` (novo), `services/SimplesApuracaoService.ts`, `services/TaxSimulationService.ts`, `models/taxSimulation.ts`, `__tests__/**`, `paises/br/**/__tests__/**` |
| PR-3 | `paises/br/services/montadores/{IrpjCsll,PisCofins,IbsCbs}EntradaMontador.ts` (novos), `services/TaxAssessmentService.ts`, `services/PisCofinsAssessmentService.ts`, `services/IbsCbsAssessmentService.ts`, `models/taxSimulation.ts`, `services/TaxSimulationService.ts`, `__tests__/**`, `paises/br/**/__tests__/**` |
| PR-4 | `services/TaxSimulationService.ts`, `models/taxSimulation.ts`, `dtos/TaxSimulationDto.ts`, `dtos/AssessmentInputDto.ts` (só se o `TieOutRowSchema` mudar), `services/__tests__/taxSimulation*.test.ts` |

**Registros (choke points PAR-001):** `server/src/lib/factory.ts` (montadores da borda ligados ao serviço da rota e à
simulação, `:1419`, `:1425`, `:1807`, `:2245`, `:2320`, `:2800`; serviço e repositório do satélite no PR-1b),
`server/.dependency-cruiser.cjs` (item 0 e cada emenda datada do escopo `LEGADO_BR`), `server/public/openapi.json`,
`server/src/routes/docs/accounting.tax-simulation.paths.ts` (schema da resposta da simulação),
`server/src/routes/accounting.ts`, `server/src/routes/docs/accounting.company-fiscal-profile.paths.ts` e
`server/src/routes/docs.paths.ts` (PR-1b, path novo), `server/src/features/accounting/audit/auditCanonical.ts` (PR-1b),
`server/src/features/accounting/dtos/__tests__/dtoShapeSnapshot.test.ts` e `__dto-shapes__.json`,
`server/prisma/schema.prisma` (PR-1b), `server/test/helpers/db.ts` (`resetDb`, PR-1b).

Conflito previsto: `SimplesApuracaoService.ts` e `IbsCbsAssessmentService.ts` com o #1322 (PR-1/PR-2 do ciclo);
`SimplesApuracaoService.ts`, `taxSimulation.ts` e `TaxSimulationService.ts` com o #1321 (itens 37 e 39). Ordem no F-MU-13.
O `.dependency-cruiser.cjs` e o `dtoShapeSnapshot.test.ts` (item 0) com o primeiro PR de código dos outros quatro BRIEFs
emendados, se algum chegar antes: o item 0 vai uma vez só.

## 12. OPS-001

1. **Objetivo:** a simulação passa a dizer a mesma coisa que a apuração diria, e nunca recomenda regime vedado — §1, itens
   9, 10, 18 e 30–32.
2. **Grau:** gates, linhas e campos = **verificado** por leitura nesta sessão (arquivo:linha na §0); a regra legal =
   **verificada** no acervo e no SIJUT [D01–D03]; o comportamento de `HIPOTESE` dos gates = **proposta** (§5.4), cujas escolhas
   abertas foram ratificadas nos forks F-MU-2, F-MU-4 e F-MU-5; o tamanho do diff de cada PR = **inferido**.
3. **Adversarial:** a primeira leitura da lacuna `f514` ("Simples vence acima do EPP ⇒ indisponível") foi conferida contra o
   § 9º-A: excesso de até 20% **mantém** o Simples no ano. O texto atual do alerta da simulação ("fora do Simples") está
   errado nesse caso; o item 11 corrige. Também: a lacuna `35df` sugeria ler `perfil.lucroRealObrigatorio`, mas o DTO só aceita
   o campo no REAL (`CompanyFiscalProfileDto.ts:193`) — para quem está no Presumido ou no Simples ele é sempre `null`; por isso
   o item 10 usa o teto (art. 14 I) e a declaração (F-MU-8).
4. **Checagem que teria falhado:** os testes dos itens 9, 10, 18 e 30 são os `comoProvar` das 4 lacunas e falham no código de
   hoje; o gate de `impressao`/`parametrosSha256` do item 16 falha se a extração mudar a rota.
5. **Duas primeiras linhas:** o TLDR.
6. **Emenda 24/11 (país na borda):** caminhos e nomes = **proposta** do ADR-PAIS-NA-BORDA, cujos R1–R7 e F-PBA-1..7 estão
   pendentes; a classificação centro × borda de cada arquivo = **inferida** pelas três perguntas do ADR §1, aplicadas ao
   desenho deste BRIEF (o código novo não existe); os importadores dos serviços legados que chamam a borda =
   **verificados** por grep em 24/11 (ADR §3.1). Checagem que teria falhado: o plantio do item 0 (`P1` exit 1).
