# BE-INCR-DP-F0-F1 — DP, núcleo: fundação (F0) e cadastros com tabelas legais (F1) (BRIEF, nó PES-4)

> **Sessão:** `sessao-planejamento` (sessão 2 de 3 do DP) — produz decisão, não código.
> **Autorização (dono, chat, 2026-11-02):** *"Podemos seguir o pre-adr numa sessão, esperar, criar o nó no vault + brief
> em outra e o executa na terceira"* e, depois do PRE-ADR Accepted no #1009, *"Sim, abre agora"* (resposta a "Abro já a
> sessão 2 (nó PES-4 + BRIEF de F0 e F1) em cima do branch do #1009?"). Cobre a nota do nó
> [`PES-4`](../plano/nos/PES-4.md) e **este** BRIEF (fases F0 e F1). **Não** cobre código: o código espera o `executa`
> da sessão 3 (F-DP-9; ORCH-006).
> **Passo 1 (a autorização cobre o item?):** cobre exatamente. O F-DP-9 (a) fixou "BRIEF de F0 + F1"; o F-DP-13 manda o
> SST para BRIEF próprio da mesma fase, e aqui ele só ganha o lugar (§7). Sem divergência.
> **PRE-ADR:** [`PRE-ADR-DP-DEPARTAMENTO-PESSOAL.md`](../adr/PRE-ADR-DP-DEPARTAMENTO-PESSOAL.md), **Accepted** (F-DP-1..14,
> cédulas em [`D-2026-11-02-DP-PRE-ADR`](../plano/decisoes/D-2026-11-02-DP-PRE-ADR.md)). O DP é a fase 2 do F-PES-0 (c) do
> [`PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF`](PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md) (F-PES-0..13 ratificados em 12/10).
> **Forks deste BRIEF:** F-DPB-1..3 ratificados pelo dono no mesmo dia
> ([`D-2026-11-02-DP-BRIEF-F0-F1`](../plano/decisoes/D-2026-11-02-DP-BRIEF-F0-F1.md)); os de estrutura foram decididos
> pela casa ou pela referência, com a fonte (regra do dono de 07/10, aplicada também no PRE-ADR §5), em §4.
> **Base:** `origin/main` = `1e2087e9` (re-fetch 02/11). O worktree está em `0b3d165e` + o commit do PRE-ADR; entre os
> dois só mudaram presets do motor, e o `registry.ts` foi lido em `origin/main`.
> **Escopo:** backend. O FE é nó vizinho (`FE-INCR-DP-CADASTROS`, a abrir).
> **Dossiê legal:** [`pesquisas-legais/brief-pes4-f0-f1/`](../../pesquisas-legais/brief-pes4-f0-f1/relatorio.md) — as
> referências [Dnn] abaixo são dele.

## TLDR (2 linhas)

F0 cria o esqueleto do núcleo (`features/dp/`), os tipos puros de competência e vigência, o registro dos 9 submódulos
opcionais com ativação por competência, a porta com adaptador nulo e a trava `D1` no `check:arch`. F1 cria os cadastros
(lotação, cargo, jornada, sindicato e CCT, trabalhador, vínculo com versões, afastamento, férias), o catálogo de
rubricas em código e as tabelas legais que faltam. IRRF com redutor, FGTS, teto e salário mínimo **já estão** em `main`.
**Risco principal:** o cadastro nasce sem oráculo. Nada aqui é conferido pelo contador até o F2, e a escolha de natureza e
incidência das rubricas (item 51) é enquadramento que só ele valida.

---

## 0. Fatos consumados que este BRIEF respeita (lidos nesta sessão)

Grau **V** = lido no arquivo ou na fonte citada.

| # | Fato | Onde |
|---|---|---|
| F1 | `moduleDefSchema` = `{key, category, group?, name{pt,en}, aiDescription, fixed, tables(min 1), dependsOn, requiresOneOf (default []), freeSelects}`; `resolveModuleSelection` fecha `dependsOn` e recusa dependência não-fixa ausente com o módulo nomeado. `MODULE_KEYS` já usa `PES-0` e `PES-FORN` (PESSOAS) | `features/dynamicTables/presets/modules/registry.ts` e `moduleSelection.ts` em `origin/main` `1e2087e9` (#1007) |
| F2 | `KitInstallation` é um por unidade, sem vigência por módulo | `schema.prisma` (`@@unique([userId, unitId])`); PRE-ADR F-DP-6 |
| F3 | `LegalParameter`: `tabela` (enum fechado), `chave`, `discriminador?`, `valorInt` (bp ou centavos), `valorTexto?`, `valorJson?`, `fonte` obrigatória, `fonteUrl?`, `fonteSha256?`, `vigenteDesde`/`vigenteAte` date-only, `DRAFT→PUBLISHED→REVOKED`, `supersedesId` | `schema.prisma:3476-3502` |
| F4 | `LEGAL_PARAMETER_TABELAS`, `TABELAS_MIGRADAS` (o `propose` recusa tabela fora dele), `linhaLegalVigente`, `linhasEmVigor`, `ParametroLegalAusenteError`; formato por tabela em `formatoLinha.ts` (`REGRAS`); `LegalParameterService.fotografia(tabelas)` | `legalParameters/models/legalParameter.ts`, `formatoLinha.ts`, `services/LegalParameterService.ts:128` |
| F5 | **Já em `main`, PUBLISHED, com fonte e sha:** `SALARIO_MINIMO` 2024–2026 (Decreto 12.797/2025, R$ 1.621,00 desde 01/01/2026); `IRRF_PF_MENSAL` `FAIXA_1..5` desde 2025-05 (Lei 11.482 art. 1º XII, incl. Lei 15.191/2025), `REDUCAO_ART3A` desde 2026-01-01 (Lei 9.250 art. 3º-A, incl. Lei 15.270/2025), `DEPENDENTE`, `DESCONTO_SIMPLIFICADO_BP`; `ENCARGO_FOLHA` `CI_SEGURADO_BP` 1100, `PATRONAL_BP` 2000, `FGTS_BP` 800, `TETO_RGPS_CENTS` 847555 desde 2026-01-01; `FERIADO_NACIONAL`, `FERIADO_LOCAL` | `prisma/data/legal_parameters_simples_v3.sql`, `_retencoes_v1.sql:319-326`, `_encargo_folha_v1.sql` |
| F6 | **Correção ao PRE-ADR §2.2** (linha "não tem INSS, IRRF nem FGTS"): IRRF e FGTS existem (F5). Falta só a tabela progressiva do INSS do empregado | F5 |
| F7 | Seed de tabela legal = `prisma/data/legal_parameters_*.sql` (`INSERT OR IGNORE`, id fixo) + migração com o mesmo texto (teste-guarda de igualdade) + entrada em `LEGAL_PARAMS_SEEDS` | `migrations/20261029120000_legal_parameters_encargo_folha/migration.sql`; `test/helpers/templateDb.ts:18`, `legalParams.ts:73` |
| F8 | `calcularIrrfPf` aplica a tabela mensal e a redução do art. 3º-A | `accounting/models/withholdingCalc.ts` |
| F9 | `Partner` (sócio): por PJ, sem `unitId`; `taxId` CPF/CNPJ, `tipoPessoa`, `entradaEm`/`saidaEm` date-only sem sobreposição por `taxId` (gate no serviço, dentro da tx); PII fora da auditoria. O controller resolve o escopo com um `unitId` qualquer da instância e grava só `userId` | `schema.prisma:1850-1880`; `controllers/partnerController.ts` |
| F10 | `AccountingScope` `{ownerUserId, actorUserId, unitId (linha de units)…}`; `accountingScopeWhere`; controller resolve pelo `AccountingScopeResolver` (regra `I6` do `check:arch`) | `accounting/scope/AccountingScope.ts` |
| F11 | `CompanyFiscalProfile` por `(userId, anoCalendario)` com `regime` ∈ `MEI·SIMPLES·PRESUMIDO·REAL` | `schema.prisma:1760` |
| F12 | Tabela `employees` do motor (cargo, admissão, comissões, `monthlyCost`, `workSchedule`) é base do Core | `presets/modules/core/EmployeesModule.ts`; D-2026-10-31 |
| F13 | `*Ref String` sem FK declara no schema o preset e a guarda contra órfão (`deleteConstraints` ou verificação no read); `checkDeleteRules` só enxerga relação do motor | `ADR-PERSISTENCE-BOUNDARY…md:56, 62` |
| F14 | Porta com adaptador nulo: seleção pura, desabilitado ⇒ `DfeDisabledEmissor` com motivo nomeado, "nunca silêncio" | `accounting/dfe/selectDfeEmissor.ts` |
| F15 | `check:arch` = dependency-cruiser com baseline; regras L1–L6, B1, B7, I6, F1, X1–X3; `lib/factory.ts` é a única peça de `lib/` que conhece features (X1). Mudar fronteira = emenda datada com baseline antes/depois; prova de que morde = plantio | `server/.dependency-cruiser.cjs`; `ADR-ARCH-BOUNDARIES.md` §1, §3, §5 |
| F16 | Feature: `dtos/ models/ policies/ repositories/ services/` + `README.md`; controller em `src/controllers/`; testes em 4 níveis; Tier-0 (outro dono ⇒ 404) | `features/FEATURE_TEMPLATE.md` §1–§10 |
| F17 | `PAYLOAD_ALLOWLIST`: a canonicalização itera sobre a allowlist; vazamento de PII é irreversível (cadeia de hash). Campo com PII exige teste-guarda de append direto no mesmo PR | `accounting/audit/auditCanonical.ts`; memória `accounting-audit-allowlist-guards` |
| F18 | Competência `YYYY-MM` validada por regex local nos DTOs; `isValidDateOnly`, `dayNumberFromDateOnly`, `dateOnlyFromDayNumber` | `ProfitDistributionDto.ts:15`, `SimplesDto.ts:16`; `accounting/models/dates.ts` |
| F19 | `@@unique` de idempotência morre em apagar→recriar com soft-delete; unicidade de registro vivo vai para gate no serviço dentro da tx | memória `unique-de-idempotencia-x-soft-delete`; precedente F9 |
| F20 | Migração SQLite não é transacional (prólogo defensivo); regex de data não valida calendário | memórias `migracao-sqlite-nao-e-transacional`, `date-only-regex-nao-valida-calendario` |
| F21 | `jest` + `fast-check` | `server/package.json:99-100` |

**Lei e eSocial (dossiê `brief-pes4-f0-f1`, V):** EC 103 art. 28 [D01, conferida no Planalto D06]; tabela do INSS de 2026
[D07]; Lei 8.212 arts. 12 V "f" e 28 III [D02]; Lei 10.666 [D03]; Lei 8.036 art. 15 e § 7º [D04], vigente desde
20/12/2000 [D13, D14]; CLT arts. 130, 133, 134, 428, 433 [D05]; CF art. 7º V e XXXIII [D12]; leiaute S-1.3 (NT 07/2026
rev. 20/10/2026) [D09] e suas tabelas [D10]; MOS consolidado até a NO 12/2026 [D11].

---

## 1. Divisão em PRs (o `executa` vale para o BRIEF inteiro; merge na ordem)

| PR | Conteúdo | Itens | Muda comportamento? |
|---|---|---|---|
| **PR-0** | Fundação pura: feature `dp`, competência, vigência, códigos de erro; regra `D1` no `check:arch` + emenda datada no ADR | 1–7 | Não (só tipos e gate) |
| **PR-1** | Registro dos submódulos, ativação com vigência por competência, porta `JORNADA_APURADA` com adaptador nulo e resolvedor | 8–19 | Sim: rotas novas em `/api/dp/modules` |
| **PR-2** | Tabelas legais do DP: `INSS_EMPREGADO` (2026), `FGTS_APRENDIZ_BP`, tabelas do eSocial como dado; leitor tipado dos parâmetros da folha | 20–27 | Sim: linhas novas em `legal_parameters` |
| **PR-3** | Cadastros de estrutura: lotação, cargo, jornada, sindicato, CCT e parâmetros | 28–36 | Sim |
| **PR-4** | Trabalhador, vínculo e versões do vínculo; categorias do núcleo; aprendiz; pró-labore; correção auditada | 37–49 | Sim |
| **PR-5** | Catálogo de rubricas em código | 50–55 | Sim: rota de leitura |
| **PR-6** | Afastamento e períodos de férias (com implantação de saldo) | 56–62 | Sim |

Dependências: PR-0 antes de todos. PR-1 e PR-2 podem correr em paralelo depois do PR-0. PR-3 depois do PR-1 (o
`lib/factory.ts` e o `routes/index.ts` são pontos de registro, então os PRs que os tocam vão em série). PR-4 depois do
PR-2 e do PR-3. PR-5 depois do PR-2. PR-6 depois do PR-4.

---

## 2. Checklist de comportamentos (cada um testável isoladamente)

### PR-0 — fundação pura e trava de fronteira (F0)

1. **Feature `server/src/features/dp/`** (núcleo; D-1 em §4) com `README.md` no formato do `FEATURE_TEMPLATE.md` §8.
   O README diz:
   - o núcleo existe em toda instância, sem ativação (F-DP-6);
   - o que é núcleo: cadastros, folha, eSocial, guias, fechamento, ponte contábil e SST (F-DP-13);
   - opcional é feature própria `features/dp<Nome>/`;
   - a regra `D1`.
2. **`models/competencia.ts`** — `CompetenciaSchema` com o regex de F18, tipo `Competencia`, e as funções puras
   `primeiroDia`, `ultimoDia` (calendário real), `competenciaDe(dataDateOnly)`, `proxima`, `anterior` e `comparar`.
   *Teste (fast-check):*
   - `competenciaDe(primeiroDia(c)) = c = competenciaDe(ultimoDia(c))`;
   - `proxima(anterior(c)) = c`;
   - `ultimoDia('2028-02') = '2028-02-29'` e `ultimoDia('2027-02') = '2027-02-28'`.
3. **`models/vigencia.ts` — vigência por data de efeito** (F-DP-8 → b: sem `registradoEm`/`substituidaEm`).
   `Vigencia = {vigenteDesde, vigenteAte | null}`, inclusiva, no molde do `LegalParameter` (F3). `VigenciaSchema` valida
   as duas pontas com `isValidDateOnly` (F20) e exige `vigenteAte ≥ vigenteDesde`. Funções puras: `vigenteEm(v, data)`,
   `sobrepoe(a, b)`, `semSobreposicao(vs)` e `versaoVigente(vs, data)`, que devolve a única versão que cobre a data ou
   lança `VigenciaSobrepostaError`.
   *Teste (fast-check):* `sobrepoe` é simétrica; `semSobreposicao(vs)` ⇔ nenhuma data tem duas versões vigentes;
   `2027-02-30` é recusado.
4. **`models/vigencia.ts` — vigência por competência** (para a ativação, item 12): `VigenciaCompetencia =
   {competenciaInicio, competenciaFim | null}`, com `ativaEm(v, c)` e `sobrepoeCompetencia`. *Teste:* as mesmas
   propriedades do item 3.
5. **Códigos de erro do DP** (`models/erros.ts`): a união `DpErrorReason` com os códigos de §3.6. Os erros usam as classes
   de `lib/errors` (`ValidationError`, `ConflictError`, `NotFoundError`) com `reason` no detalhe; não nasce classe nova. O
   texto em português fica no `throw`, e o FE traduz pelo `reason`. *Teste:* nenhum próprio (coberto pelos itens que
   lançam).
6. **Regra `D1-dp-core-not-optional`** em `server/.dependency-cruiser.cjs` (F-DP-10 → a):
   `from: { path: '^src/features/dp/', pathNot: TEST }` e `to: { path: '^src/features/dp[A-Z][A-Za-z0-9]*/' }`, com
   severidade de erro e comentário citando F-DP-10. Baseline: 0 (não entra em `known-violations`).
   *Prova de que morde (condição que falha, F15):* plantar `src/features/dpSondaD1/x.ts` e
   `src/features/dp/__sondaD1.ts`, este importando aquele ⇒ `npm run check:arch` sai ≠ 0 apontando `D1`. Sem o plantio,
   sai 0. O plantio é removido e as duas saídas vão coladas no corpo do PR.
7. **Emenda datada ao `ADR-ARCH-BOUNDARIES.md`** (§5 exige): linha `D1` na tabela do §1 (baseline 0) e um bloco
   "Emenda 2026-11-xx — D1 (F-DP-10)" com o número de violações conhecidas antes e depois (igual) e a prova do item 6.
   A cobertura é a exceção de 13/10 (§4: gate estático que lê código), como a `B7`. **Ponto cego declarado:** a regra
   olha `features/dp/`. Controller e rota do núcleo (`src/controllers/dp*.ts`, `src/routes/dp.ts`) ficam fora e falam só
   com o `getFactory()`.

### PR-1 — registro, ativação e portas (F0)

8. **`models/moduleRegistry.ts`** — `DP_MODULE_KEYS` (F-DPB-2 → `DP-<SUFIXO>`) e o `dpModuleDefSchema`, `.strict()`.
   - **Campos com o mesmo nome e sentido do `moduleDefSchema`** (F1; F-DP-6 → a, "formato do `MODULE_REGISTRY`"): `key`,
     `name {pt,en}`, `aiDescription`, `dependsOn`, `requiresOneOf` (default `[]`).
   - **Campos novos:** `featureDir` (regex `^dp[A-Z][A-Za-z0-9]*$`), `provides: DpPortKey[]` e `disponivel: boolean`.
   - **Fora, com o motivo no comentário:** `category`, `fixed`, `tables`, `group` e `freeSelects`. O núcleo não está no
     registro, porque é sempre ligado; e os módulos do DP são Prisma, não tabelas de preset.
   - **Entradas (spec §2):**

     | Spec | Chave | `featureDir` | `provides` |
     |---|---|---|---|
     | timekeeping | `DP-PONTO` | `dpPonto` | `['JORNADA_APURADA']` |
     | payments | `DP-PAG` | `dpPagamentos` | `[]` |
     | benefits | `DP-BEN` | `dpBeneficios` | `[]` |
     | onboarding | `DP-ADM` | `dpAdmissao` | `[]` |
     | self-service | `DP-APP` | `dpApp` | `[]` |
     | performance | `DP-DES` | `dpDesempenho` | `[]` |
     | documents | `DP-GED` | `dpDocumentos` | `[]` |
     | special-categories | `DP-CAT` | `dpCategorias` | `[]` |
     | analytics | `DP-BI` | `dpIndicadores` | `[]` |

     Todos com `dependsOn: []`, porque na spec §2 cada opcional só "requer" peças do núcleo, e com `disponivel: false`,
     porque ainda não há implementação. A `aiDescription` sai da coluna "Entrega" da spec §2.
   - *Teste:* `parse` de cada entrada; snapshot das chaves.
9. **`assertDpRegistryInvariants(registry)`** (molde `assertRegistryInvariants`, F1):
   - chaves e `featureDir` únicos;
   - `dependsOn` e `requiresOneOf` só citam chaves do registro;
   - sem ciclo (a spec §3 regra 2 pede "ciclo → erro de build");
   - cada `DpPortKey` provida por no máximo um módulo.

   *Teste:* registro fixture com ciclo ⇒ erro nomeado; o registro real passa.
10. **Consistência registro × regra `D1`:** teste que faz `require('../../.dependency-cruiser.cjs')` e verifica que o
    `to.path` da `D1` casa `src/features/<featureDir>/x.ts` para todo `featureDir` e **não** casa
    `src/features/dp/x.ts`. Falha se alguém criar módulo com pasta fora do padrão.
11. **`resolveDpModuleActivation(pedido, ativosNaCompetencia, registry)`**, pura, no molde de `resolveModuleSelection`
    (F1):
    - `dependsOn` ausente ⇒ `ValidationError` `DP_MODULE_MISSING_DEPENDENCY` com **todos** os faltantes (spec §3 regra 2);
    - grupo de `requiresOneOf` vazio ⇒ `DP_MODULE_REQUIRES_ONE_OF`;
    - `disponivel: false` ⇒ `ConflictError` `DP_MODULE_UNAVAILABLE`.

    **Diferença declarada do molde:** aqui não há base fixa para incluir sozinha (o núcleo é implícito), então
    dependência faltante recusa. *Teste:* tabela de casos com registro fixture.
12. **Model `DpModuloAtivacao`** (§3.2):
    - **Escopo:** por instância, só `userId`, sem `unitId` (empregador = instância: R8, F-DP-2, F-DP-6).
    - **Vigência por competência** (D-4 em §4).
    - **Sem sobreposição** por `(userId, moduleKey)`, checada no serviço dentro da tx (F19). Desativar grava
      `competenciaFim` e nunca apaga dado (spec §3 regra 1).

    *Teste (integração):*
    - ativar, encerrar e reativar numa competência posterior funciona;
    - sobreposição ⇒ 409 `DP_MODULE_ACTIVATION_OVERLAP`.
13. **`DpModuleService`**:
    - `listCatalog()`, `listActivations(scope)` e `modulosAtivosEm(ownerUserId, competencia)`;
    - `activate(scope, {moduleKey, competenciaInicio, motivo})`: policy → item 11 com os ativos em `competenciaInicio`
      → gate na tx → grava → audita na tx;
    - `end(scope, id, {competenciaFim, motivo})`: exige `competenciaFim ≥ competenciaInicio`, e recusa com 409
      `DP_MODULE_DEPENDENT_ACTIVE` quando outro módulo ativo naquela competência depende deste.

    *Teste:* integração com Tier-0 (outro dono ⇒ 404).
14. **`DpPolicy`** própria (`canRead(scope)`, `canManage(scope)`), com a mesma regra de hoje do
    `canManageFiscalProfile`, que o `PartnerService` usa (dono ou admin do escopo). Ela é separada (D-7 em §4) para um
    papel "RH" poder divergir depois. *Teste:* matriz da policy (FEATURE_TEMPLATE §10 nível 1).
15. **Controller e rotas:** `src/controllers/dpModuleController.ts` e `src/routes/dp.ts`, montado em `/api/dp`.
    - `GET /dp/modules`: o catálogo;
    - `GET /dp/modules/activations`;
    - `POST /dp/modules/activations`;
    - `POST /dp/modules/activations/:id/end`.

    Escopo pelo `AccountingScopeResolver` com `unitId` na query ou no body, como o `partnerController` (F9, F10). DTOs
    `.strict()`. Paths no `routes/docs/dp.paths.ts`, com o guard de contagem do openapi atualizado (+4).
16. **Porta `JORNADA_APURADA`** em `features/dp/ports/`. É a única porta do F0 (D-3 em §4).
    - `JornadaApuradaPort.apurar(ownerUserId, vinculoId, competencia)` devolve `JornadaApurada = {origem: 'NULO' |
      'MODULO', motivo?: string, itens: readonly JornadaApuradaItem[]}`.
    - O formato de `JornadaApuradaItem` nasce no BRIEF do F2, junto com os lançamentos manuais. Aqui ele é
      `never`, e a lista fica vazia.
    - `NullJornadaApurada` devolve `{origem: 'NULO', motivo: 'DP-PONTO desligado na competência <c>', itens: []}`.
17. **`DpPortResolver`** (`ports/DpPortResolver.ts`, no núcleo):
    - **Entradas:** `implementacoes: ReadonlyMap<DpModuleKey, Partial<DpPorts>>`, que o `lib/factory.ts` monta (é o único
      ponto que importa `features/dp<Nome>/`, F15), e `modulosAtivosEm`.
    - **`resolver(ownerUserId, competencia)`:** para cada porta, usa o módulo que está ativo na competência, a declara em
      `provides` e tem implementação. Na falta de qualquer um dos três, usa o adaptador nulo **com o motivo nomeado** (F14).
      Por isso o núcleo roda com todos os opcionais desligados.
    - *Teste:* fixture com módulo fake disponível e implementação fake. Ativo em 2027-03 ⇒ implementação real. Em
      2027-02 ⇒ nulo com o motivo. Ativo mas sem implementação ⇒ nulo com outro motivo.
18. **Wiring:** `getDpModuleService()` e `getDpPortResolver()` no `lib/factory.ts`. O mapa de implementações nasce vazio
    no F0.
19. **Auditoria:** `dp.module_activation.created` (`activationId`, `moduleKey`, `competenciaInicio`) e
    `dp.module_activation.ended` (`activationId`, `moduleKey`, `competenciaFim`) entram no `PAYLOAD_ALLOWLIST` no mesmo PR.
    Sem PII. *Teste:* integração lê o `AuditEvent` gravado.

### PR-2 — tabelas legais do DP (F1)

20. **Tabela nova `INSS_EMPREGADO`** no enum (F4), em `TABELAS_MIGRADAS` e em `REGRAS` do `formatoLinha.ts`.
    - **Formato:** chave `FAIXA_1..FAIXA_n`, sem discriminador, com `valorJson = {ateCents: inteiro > 0 | null,
      aliquotaBp: 0..10000}`.
    - **Última faixa:** `ateCents: null`, "até o limite do salário de contribuição" [D06 EC 103 art. 28 IV]. O limite é o
      `TETO_RGPS_CENTS` que já existe (F5), sem duplicar o teto.
    - **Base legal:** alíquotas progressivas por faixa [D06 art. 28 caput e § 1º].
21. **Carga de 2026** (`prisma/data/legal_parameters_dp_v1.sql` + migração com o mesmo texto + `LEGAL_PARAMS_SEEDS`, F7).
    - **Linhas:** `PUBLISHED`, `vigenteDesde 2026-01-01`, `fonte` "Portaria Interministerial MPS/MF nº 13/2026 (EC 103/2019
      art. 28 I–IV e § 1º) — tabela oficial do INSS", `fonteUrl` da página do INSS e `fonteSha256` do [D07].
    - **Valores [D07]:**

      | Chave | `ateCents` | `aliquotaBp` |
      |---|---|---|
      | `FAIXA_1` | 162100 | 750 |
      | `FAIXA_2` | 290284 | 900 |
      | `FAIXA_3` | 435427 | 1200 |
      | `FAIXA_4` | `null` | 1400 |

    - **Uso:** 2026 é dado de teste e de golden (PRE-ADR §4). A produção começa nas linhas de 2027, que entram por PR de
      dado quando a portaria de 2027 sair (§5).
22. **FGTS do aprendiz:** chave `FGTS_APRENDIZ_BP` = 200 na `ENCARGO_FOLHA`, somada a `ENCARGO_FOLHA_CHAVES_BP`.
    `fonte` "Lei 8.036/1990 art. 15 § 7º (incl. Lei 10.097/2000)", `vigenteDesde 2000-12-20` [D04; D13 art. 4º; D14 DOU de
    20/12/2000]. Mesmo arquivo de carga do item 21.
23. **Tabelas do eSocial como dado**, no precedente da `NATUREZA_RENDIMENTO` (Tabela 01 da Reinf no `LegalParameter`):

    | Tabela nova | Origem | Chave | `valorJson` |
    |---|---|---|---|
    | `ESOCIAL_CATEGORIA` | Tabela 01 [D10] | código | `{grupo, descricao, evento: 'S-2200' \| 'S-2300' \| null}` |
    | `ESOCIAL_NATUREZA_RUBRICA` | Tabela 03 [D10] | código | `{nome, descricao}` |
    | `ESOCIAL_INCIDENCIA_RUBRICA` | discriminador `CP`/`FGTS`: domínios de `codIncCP` e `codIncFGTS` do S-1010 [D09]; `IRRF`: Tabela 21 [D10] | código | `{descricao}` |
    | `ESOCIAL_MOTIVO_AFASTAMENTO` | Tabela 18 [D10] | código | `{descricao}` |

    - **Vigência:** as colunas "início" e "término" da própria tabela, quando houver.
    - **`evento` da categoria:** sai das duas listas do leiaute ("A utilização do evento S-2200 só é permitida para as
      categorias [...]" e "O evento S-2300 é permitido apenas para as categorias [...]", [D09]).
    - **Carga transcrita por script** a partir dos arquivos do dossiê (S-1.3, NT 07/2026 rev. 20/10/2026), com o
      `fonteSha256` do arquivo de origem. **Este BRIEF não digita código nenhum dessas tabelas.**
    - *Teste:*
      - a contagem de linhas de cada tabela é igual à registrada no PR, junto com o hash do arquivo;
      - amostras conferidas no dossiê: 101 e 103 ⇒ `S-2200`; 723 e 901 ⇒ `S-2300` [D09, D10].
24. **Formato** de cada tabela nova em `REGRAS` (`formatoLinha.ts`) e em `TABELAS_MIGRADAS`. *Teste:*
    `linhasPublicadasForaDoFormato()` vazio depois da carga.
25. **Reuso sem tabela nova** (F5): IRRF (`IRRF_PF_MENSAL`, com `REDUCAO_ART3A`, `DEPENDENTE` e
    `DESCONTO_SIMPLIFICADO_BP`), FGTS de 8%, teto do RGPS, 11% do contribuinte individual e 20% patronal (pró-labore),
    salário mínimo e feriados. O DP só lê. Pelo `_REUSE-CRITERION`, é o mesmo objeto de domínio, vivo dos dois lados, e
    tem dono: `RETENCOES-FONTE` (IRRF), `EFICIENCIA-FISCAL` (`ENCARGO_FOLHA`) e `X14` (salário mínimo).
26. **Leitor tipado `features/dp/models/parametrosFolha.ts`:** `parametrosFolha(fotografia, data)` devolve
    `{inssEmpregado: Faixa[], tetoRgpsCents, fgtsBp, fgtsAprendizBp, ciSeguradoBp, patronalBp, salarioMinimoCents,
    irrf: {faixas, reducaoArt3A, dependenteCents, descontoSimplificadoBp}}` lido das tabelas de F5 e do item 20.
    - **Validação:** faixas ordenadas e contíguas, com a última `ateCents: null`.
    - **Tabela ausente:** `ParametroLegalAusenteError` (F4). O leitor nunca cai em tabela de outro ano, como o resolvedor
      do KMEE `fiscal_tables` que o PRE-ADR-PESSOAL §3 leu.
    - É o insumo legal do snapshot do F2 (F-DP-8).

    *Teste (integração com as cargas reais):*
    - em 2026-03-15 devolve as 4 faixas, o teto 847555, FGTS 800 e 200, CI 1100, patronal 2000 e mínimo 162100;
    - em 2025-12-31 ⇒ `ParametroLegalAusenteError('INSS_EMPREGADO', …)`.
27. **Consistência cruzada:** teste de que, em 2026, `INSS_EMPREGADO.FAIXA_1.ateCents` = `SALARIO_MINIMO` (EC 103
    art. 28 I: "até 1 (um) salário-mínimo" [D06]). Ele fica vermelho se o PR de dado de 2027 atualizar um sem o outro.

### PR-3 — cadastros de estrutura (F1)

28. **Model `DpLotacao`** (conceito do S-1020):
    - **Campos:** `userId`, `unitId` (estabelecimento = unidade, R8, F-DP-2), `codigo` (1 a 30 caracteres, como o
      `codLotacao`, "C 1 1-30" [D09]), `descricao`, soft-delete.
    - **Unicidade:** `codigo` vivo único por instância, por gate na tx (F19).
    - **Fora do F1:** FPAS, terceiros e tipo de lotação (Tabelas 04 e 10). Entram no F2 (patronal) e no F4 (S-1020), §7.

    *Teste:* CRUD; Tier-0; apagar e recriar com o mesmo código funciona.
29. **Model `DpCargo`**: `userId`, `nome`, `cbo` com 6 caracteres (`CBOCargo`, "C 1 6" [D09]) e soft-delete. *Teste:* CBO
    com 5 dígitos ⇒ 400.
30. **Model `DpJornada`**:
    - **Campos:** `userId`, `nome`, `minutosSemanais` (inteiro > 0), `tipoJornada` (domínio `tpJornada` do S-2200 [D09],
      transcrito no PR), `descricao` (horário contratual, como o `dscJorn`) e soft-delete.
    - **Trava de cálculo (D-5 em §4):** depois que uma versão de vínculo referencia a jornada, `minutosSemanais` e
      `tipoJornada` não mudam (409 `DP_JORNADA_EM_USO`). Mudança = jornada nova + versão nova do vínculo.
    - **Limite legal da jornada:** não é validado no F1. É verificação do fechamento (F5, §7).
31. **Model `DpSindicato`**: `userId`, `cnpj` (14 dígitos com DV, `lib/cnpj`), `nome`, soft-delete; CNPJ vivo único por
    instância (gate na tx).
32. **Model `DpConvencaoColetiva`** (F-PES-8 → a): `userId`, `sindicatoId`, `identificacao` (texto livre, por exemplo o
    registro do instrumento), `vigenteDesde`, `vigenteAte?`, `fonte` obrigatória e soft-delete.
33. **Model `DpConvencaoParametro`**:
    - **Campos:** `convencaoId`, `chave` (enum fechado `CCT_CHAVES`), `discriminador?`, `valorInt` (centavos ou bp, pela
      chave), `clausula` (texto da cláusula, obrigatório) e vigência.
    - **Regras:** vigência dentro da vigência da convenção; sem sobreposição por `(convencaoId, chave, discriminador)`,
      com gate na tx.
    - **`CCT_CHAVES` no F1 = `['PISO_SALARIAL_CENTS']`**, com `discriminador` = `cargoId`. O piso é instituto
      constitucional ("piso salarial proporcional à extensão e à complexidade do trabalho" [D12 CF art. 7º V]); as outras
      cláusulas esperam a primeira CCT real (L-PES-7) e o consumidor do F2. O enum cresce por PR, com teste (F-PES-9).
34. **Leitor puro `parametroCctVigente(params, chave, discriminador, data)`**, no molde de `linhaLegalVigente` (F4).
    *Teste:* unitário.
35. **Rotas:** CRUD de `/dp/lotacoes`, `/dp/cargos`, `/dp/jornadas`, `/dp/sindicatos` e `/dp/convencoes`, mais
    `/dp/convencoes/:id/parametros`. Cadeia completa (Route → Controller → Service → Repository, com Policy), factory, DTO
    `.strict()`, `limit` com teto e update parcial **sem default** (memória `zod4-partial-aplica-default-reseta-campo`).
    Paths no openapi, com o guard de contagem.
36. **Auditoria e testes:** eventos `dp.lotacao.*`, `dp.cargo.*`, `dp.jornada.*`, `dp.sindicato.*`, `dp.convencao.*` e
    `dp.convencao_parametro.*`, com ids, códigos e datas; o piso entra como dinheiro em string, como no contas a pagar, por
    ser dado da convenção e não de uma pessoa. Os 4 níveis de teste do FEATURE_TEMPLATE §10.

### PR-4 — trabalhador, vínculo e versões (F1)

37. **Model `DpTrabalhador`**:
    - **Campos:** `userId`, `cpf` (PII, `lib/cpf`), `nome` (PII), `nascimento`, `pcd` (CLT art. 428 §§ 3º e 5º [D05]),
      `origem` ∈ `DIGITADA | IMPORTADA_ESOCIAL` (F-DP-12; o F1 só grava `DIGITADA`) e soft-delete.
    - **`employeeRef String?`** (F-DP-1 → a): comentário no schema com o preset (`employees` do Core) e a guarda
      (verificação no read, D-6 em §4).
    - **`partnerId String?`:** FK `Partner`, `onDelete: Restrict` (item 44).
    - **Unicidade:** CPF vivo único por instância, por gate na tx (F19; precedente F9).
38. **`employeeRef`:**
    - **Ao gravar:** o serviço confere que a linha existe e é do dono, por uma porta de leitura `EmployeeRowLookup`
      declarada no DP e implementada no `lib/factory.ts` sobre o motor. O DP não importa `dynamicTables`.
    - **Na leitura:** se a linha foi apagada, devolve `pessoaOperacionalRemovida: true`, sem erro. Nenhum cálculo do DP lê
      `employees`.
    - *Teste:* ref inexistente ⇒ 400 `DP_EMPLOYEE_REF_INVALIDO`; linha apagada depois ⇒ leitura com a marca.
39. **Model `DpVinculo`** (identidade):
    - **Campos:** `userId`, `trabalhadorId`, `unitId` (estabelecimento), `matricula` (obrigatória e única viva por
      instância, gate na tx), `categoria`, `dataInicio`, `dataTermino?`, `origem` e soft-delete. O `dataDesligamento` é do
      F3 e o F1 não o grava.
    - **`natureza` derivada** do `evento` da categoria (item 23): `S-2200` ⇒ `EMPREGO`; `S-2300` ⇒ `TSVE`.
40. **Categorias do núcleo** (F-DPB-1): `CATEGORIAS_NUCLEO = ['101', '103', '901', '723']`.
    - Fora da lista ⇒ 400 `DP_CATEGORIA_FORA_DO_NUCLEO`. Para 102, 104, 111, avulso e cooperado, a mensagem aponta o
      submódulo `DP-CAT`.
    - A categoria tem de estar vigente na `ESOCIAL_CATEGORIA` em `dataInicio`.

    *Teste:* 104 ⇒ 400 com o `reason`; 723 ⇒ aceito.
41. **Aprendiz (103)**:
    - idade de pelo menos 14 anos completos em `dataInicio` [D12 CF art. 7º XXXIII: "a partir de quatorze anos"];
    - sem `pcd`: idade menor que 24 em `dataInicio` [D05 CLT art. 428 caput] e `dataTermino` antes do 24º aniversário
      [art. 433: "extinguir-se-á [...] quando o aprendiz completar 24"];
    - `dataTermino` obrigatória e no máximo `dataInicio` + 2 anos − 1 dia, salvo `pcd` [art. 428 § 3º].

    Erros `DP_APRENDIZ_IDADE` e `DP_APRENDIZ_PRAZO`. *Teste:* bordas — 14º aniversário no dia da admissão ⇒ aceito;
    termo depois do 24º aniversário ⇒ 400; `pcd` ⇒ aceito.
42. **Idade mínima do empregado geral (101):** menos de 16 anos em `dataInicio` ⇒ 400 `DP_IDADE_MINIMA` [D12 CF art. 7º
    XXXIII]. A proibição de trabalho noturno, perigoso ou insalubre abaixo de 18 é do SST e da jornada (§7).
43. **Model `DpVinculoVersao`** (F-DP-8 → b):
    - **Campos:** `vinculoId`, vigência, `lotacaoId` (sempre), `cargoId?`, `jornadaId?`, `sindicatoId?`, `salarioCents
      BigInt` (salário contratual, pró-labore ou bolsa) e `unidadeSalario` (domínio `undSalFixo` do S-2200 [D09],
      transcrito no PR).
    - **Por natureza:** `EMPREGO` exige cargo e jornada; `TSVE` exige só lotação e valor.
    - **Cobertura contínua:** a 1ª versão começa em `dataInicio` e nasce na mesma tx do vínculo. A versão nova fecha a
      anterior (`vigenteAte` = véspera) na mesma tx. Sobreposição ⇒ 409, checada na tx.

    *Teste:* versão nova fecha a anterior; versão antes de `dataInicio` ⇒ 400; duas versões na mesma data ⇒ 409.
44. **Pró-labore (723)** (F-DP-11 → a). Base: o sócio que recebe pelo trabalho é contribuinte individual [D02 Lei 8.212
    art. 12 V "f"], com salário-de-contribuição = remuneração do mês [art. 28 III]; categoria 723 [D10], S-2300 com envio
    prévio obrigatório [D11 MOS, S-1200 item 23.1].
    - **Sócio:** o trabalhador tem `partnerId` de um `Partner` PF da mesma instância, com `taxId = cpf`. Senão ⇒ 400
      `DP_PRO_LABORE_SEM_SOCIO`.
    - **Vigência:** a vigência do vínculo cabe em `[entradaEm, saidaEm]` do sócio. Senão ⇒ 400
      `DP_PRO_LABORE_FORA_DA_SOCIEDADE`.
    - **MEI:** `CompanyFiscalProfile.regime = MEI` no ano de `dataInicio` ⇒ 400 `DP_PRO_LABORE_MEI`, porque o MEI "não
      deve cadastrar seu próprio CPF como contribuinte individual para informar o valor do seu pró-labore" [D11 MOS §2.1].
      Sem perfil daquele ano, o vínculo é aceito.
    - **Fora do F1:** o cálculo (11%, IRRF, CPP) é do F2.
45. **Correção de dado já registrado** (F-DP-8 → b + F-DPB-3 → "audit sem valores"):
    - O `PATCH` de versão ou de trabalhador altera o registro no lugar, dentro da tx.
    - O evento `dp.vinculo_versao.corrected` (ou `dp.trabalhador.corrected`) leva `{…Id, campos[], antesSha256,
      depoisSha256}`: SHA-256 do JSON canônico dos campos alterados, **sem os valores** (F17).

    *Teste:*
    - append direto com payload cru que traz `salarioCents`, `cpf` e `nome` ⇒ o persistido não tem nenhum deles (padrão da
      memória F17);
    - o hash muda quando o valor muda.
46. **Rotas:**
    - `/dp/trabalhadores`: CRUD;
    - `/dp/vinculos`: `POST` cria vínculo + 1ª versão numa tx; `GET` lista e detalhe com as versões;
    - `/dp/vinculos/:id/versoes`: `POST` cria versão nova; `PATCH /:versaoId` corrige.

    Cadeia completa e DTO `.strict()`.
47. **Leitura `vinculoNaData(vinculoId, data)`:** identidade + versão vigente + lotação, cargo, jornada e sindicato
    resolvidos. Função pura sobre as linhas carregadas, mais o método de repositório. É a entrada do snapshot do F2.
    *Teste:* unitário e integração.
48. **Apagar:**
    - trabalhador com vínculo vivo ⇒ 409 `DP_TRABALHADOR_COM_VINCULO`;
    - vínculo: soft-delete livre no F1. O bloqueio por folha calculada é do F2, e a exclusão no eSocial (S-3000) é do F4.
49. **Auditoria e testes:**
    - **Eventos:** `dp.trabalhador.created/updated/deleted` (`trabalhadorId`, `origem`, `temEmployeeRef`, `temPartner`;
      nunca CPF, nome nem nascimento), `dp.vinculo.created` (`vinculoId`, `trabalhadorId`, `unitId`, `categoria`,
      `dataInicio`) e `dp.vinculo_versao.created` (`vinculoId`, `versaoId`, `vigenteDesde`; sem salário).
    - **Testes:** guarda de allowlist para `cpf`, `nome` e `salarioCents` (F17); Tier-0 em todas as rotas; os 4 níveis.

### PR-5 — catálogo de rubricas (F1)

50. **`features/dp/models/rubricas/catalogo.ts`** (F-PES-9 → a; F-DP-5 revisto): sem intérprete e sem fórmula em dado.
    - **`RubricaDef`:** `codigo` estável do Luminaris (vira `codRubr` no S-1010), `nome {pt,en}`, `tipo` ∈ `PROVENTO |
      DESCONTO | INFORMATIVA`, `natureza` (Tabela 03), `incidencia {cp, irrf, fgts}` (item 23), `categorias` (subconjunto
      de `CATEGORIAS_NUCLEO`) e `calculo` ∈ `CONTRATUAL | LEGAL | INFORMADO`.
    - **`calculo` só nomeia a família.** A função pura que calcula é do F2.
    - O catálogo é Zod `.strict()` + `as const satisfies`. Rubrica nova = PR com teste.
51. **Rubricas do F1** (o mínimo do primeiro holerite e do pró-labore; o F2 acrescenta as variáveis): `SALARIO_BASE`
    (101, 103), `BOLSA_ESTAGIO` (901), `PRO_LABORE` (723), `INSS_SEGURADO` (desconto), `IRRF` (desconto) e `FGTS_MES`
    (informativa).
    - **Natureza e incidência:** o executor escolhe cada código nas tabelas carregadas no PR-2 e cita a linha do dossiê
      [D09/D10] em comentário.
    - **Conferência:** a escolha é enquadramento e vai ao contador (§5). Até a resposta, o catálogo fica marcado
      `conferidoPeloContador: false`.
52. **Consistência catálogo × tabelas** (teste com as cargas reais):
    - toda `natureza` e toda incidência existe e está vigente na tabela certa (item 23);
    - códigos únicos;
    - `categorias` ⊆ `CATEGORIAS_NUCLEO`;
    - nenhuma rubrica aplicável a 723 ou 901 tem `codIncCP` em `[25, 26, 51]`, que o leiaute veda para contribuinte
      individual e bolsista no S-1200 [D09, `codRubr`, validação "a"].
53. **Congelamento:** `rubricas/published.json` com o SHA-256 de `{codigo, natureza, incidencia}` de cada rubrica
    publicada; mudar uma publicada quebra o teste. Mudança de enquadramento = código novo (precedente: item 5 do
    BE-INCR-KIT-SETOR).
54. **Rota** `GET /dp/rubricas` (catálogo, só leitura), com o openapi +1.
55. **Sem ligação CCT × rubrica no F1:** o piso (item 33) não é rubrica. A ligação nasce no F2 (complemento de piso).

### PR-6 — afastamento e férias (F1)

56. **Model `DpAfastamento`**:
    - **Campos:** `vinculoId`, `motivo` (vigente na `ESOCIAL_MOTIVO_AFASTAMENTO` no `inicio`), `inicio`, `fim?` (`null` =
      em aberto), `observacao?` e soft-delete.
    - **Regras:** sem sobreposição no mesmo vínculo (gate na tx) e `inicio ≥ dataInicio` do vínculo.
    - **Sem CID nem outro dado clínico** (LGPD, dado de saúde).
    - **Compatibilidade motivo × categoria:** fica para o F4 (S-2230).
57. **`periodosDeFerias(dataInicio, dataRef, dataFim?)`**, pura, só para natureza `EMPREGO`:
    - **Saída:** a sequência `{aquisitivoInicio, aquisitivoFim, concessivoFim}` até `dataRef`;
    - **Aquisitivo:** cada 12 meses de vigência do contrato [D05 CLT art. 130 caput];
    - **Concessivo:** os 12 meses seguintes [art. 134 caput].
    - **Data do aniversário:** o aquisitivo termina na véspera do aniversário do contrato. Para admissão em 29/02, a
      leitura adotada é que o aniversário em ano não bissexto cai em 01/03, e o contador confirma no golden (§5).
    - **Fora do F1:** os dias de direito por faltas [art. 130 I–IV] e a perda do direito [art. 133] dependem de faltas e de
      afastamentos computados; ficam para a fase das folhas especiais (§7).

    *Teste (fast-check):* períodos contíguos, sem sobreposição, cada um com 12 meses; bordas de 29/02 e 31/01.
58. **Model `DpFeriasImplantacao`**, para quem chega com histórico de outro sistema:
    - **Campos:** `vinculoId`, `aquisitivoInicio` (tem de casar com um período do item 57), `diasGozados` (0..30),
      `fonte` (texto, por exemplo "ficha de férias do sistema anterior") e `informadoPorId`.
    - **Unicidade:** viva por `(vinculoId, aquisitivoInicio)`, com gate na tx.
59. **Rota** `GET /dp/vinculos/:id/ferias`: devolve os períodos (item 57) e os dias gozados implantados. **Sem cálculo de
    saldo no F1**, porque o saldo depende das faltas (art. 130).
60. **Rotas** CRUD de `/dp/vinculos/:id/afastamentos` e `/dp/vinculos/:id/ferias/implantacao`.
61. **Auditoria:**
    - `dp.afastamento.*` leva `afastamentoId`, `vinculoId`, `inicio` e `fim`. O **`motivo` fica fora**: ligado à pessoa,
      ele pode ser dado de saúde (licença por doença ou acidente), e o `AuditEvent` não se apaga (F17).
    - `dp.ferias_implantacao.*` leva ids, `aquisitivoInicio` e `diasGozados`.
62. **Testes:** os 4 níveis; guarda de allowlist para `motivo`.

---

## 3. Contratos (esboço materializável)

### 3.1 Tipos puros (PR-0)

```ts
// features/dp/models/competencia.ts
export const CompetenciaSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'competência = YYYY-MM');
export type Competencia = z.infer<typeof CompetenciaSchema> & { readonly __brand: 'Competencia' };

// features/dp/models/vigencia.ts
const DateOnly = z.string().refine(isValidDateOnly, 'data inválida (YYYY-MM-DD)');
export const VigenciaSchema = z.object({ vigenteDesde: DateOnly, vigenteAte: DateOnly.nullable() }).strict()
  .refine((v) => v.vigenteAte === null || v.vigenteAte >= v.vigenteDesde, 'vigenteAte < vigenteDesde');
export const VigenciaCompetenciaSchema = z.object({
  competenciaInicio: CompetenciaSchema, competenciaFim: CompetenciaSchema.nullable(),
}).strict().refine((v) => v.competenciaFim === null || v.competenciaFim >= v.competenciaInicio);
```

### 3.2 Prisma (dinheiro em `BigInt` centavos; datas date-only em `String`; `userId` FK cascade como os vizinhos)

```prisma
// PR-1 — ativação por instância (R8: empregador = instância; sem unitId)
model DpModuloAtivacao {
  id                String    @id @default(cuid())
  userId            String
  moduleKey         String    // DP_MODULE_KEYS (DTO)
  competenciaInicio String    // YYYY-MM
  competenciaFim    String?   // YYYY-MM inclusive; null = sem fim
  motivo            String
  createdById       String
  endedById         String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?
  @@index([userId, moduleKey])
  @@map("dp_modulo_ativacoes")
}

// PR-3
model DpLotacao        { id String @id @default(cuid()) userId String unitId String codigo String descricao String
                         createdAt DateTime @default(now()) updatedAt DateTime @updatedAt deletedAt DateTime?
                         @@index([userId, codigo]) @@map("dp_lotacoes") }
model DpCargo          { id String @id @default(cuid()) userId String nome String cbo String /* 6 */
                         createdAt DateTime @default(now()) updatedAt DateTime @updatedAt deletedAt DateTime?
                         @@index([userId]) @@map("dp_cargos") }
model DpJornada        { id String @id @default(cuid()) userId String nome String minutosSemanais Int tipoJornada String
                         descricao String? createdAt DateTime @default(now()) updatedAt DateTime @updatedAt
                         deletedAt DateTime? @@index([userId]) @@map("dp_jornadas") }
model DpSindicato      { id String @id @default(cuid()) userId String cnpj String nome String
                         createdAt DateTime @default(now()) updatedAt DateTime @updatedAt deletedAt DateTime?
                         @@index([userId, cnpj]) @@map("dp_sindicatos") }
model DpConvencaoColetiva { id String @id @default(cuid()) userId String sindicatoId String identificacao String
                         vigenteDesde String vigenteAte String? fonte String createdAt DateTime @default(now())
                         updatedAt DateTime @updatedAt deletedAt DateTime? @@index([userId, sindicatoId])
                         @@map("dp_convencoes_coletivas") }
model DpConvencaoParametro { id String @id @default(cuid()) convencaoId String chave String discriminador String?
                         valorInt BigInt clausula String vigenteDesde String vigenteAte String?
                         createdAt DateTime @default(now()) updatedAt DateTime @updatedAt deletedAt DateTime?
                         @@index([convencaoId, chave]) @@map("dp_convencao_parametros") }

// PR-4
model DpTrabalhador {
  id          String    @id @default(cuid())
  userId      String
  cpf         String    // PII — nunca em auditoria; 11 dígitos com DV (lib/cpf); único vivo por instância (gate na tx)
  nome        String    // PII
  nascimento  String    // YYYY-MM-DD
  pcd         Boolean   @default(false)
  // *Ref (ADR-PERSISTENCE-BOUNDARY): linha do preset `employees` (Core). Guarda contra órfão = verificação no read
  // (pessoaOperacionalRemovida); nenhum cálculo do DP lê `employees`.
  employeeRef String?
  partnerId   String?   // FK Partner (sócio) — obrigatório para a categoria 723
  partner     Partner?  @relation(fields: [partnerId], references: [id], onDelete: Restrict)
  origem      String    // DIGITADA | IMPORTADA_ESOCIAL (F-PES-0 / F-DP-12)
  createdById String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?
  vinculos    DpVinculo[]
  @@index([userId, cpf])
  @@map("dp_trabalhadores")
}
model DpVinculo {
  id            String    @id @default(cuid())
  userId        String
  trabalhadorId String
  trabalhador   DpTrabalhador @relation(fields: [trabalhadorId], references: [id], onDelete: Restrict)
  unitId        String    // estabelecimento = unidade (R8)
  matricula     String    // única viva por instância (gate na tx)
  categoria     String    // CATEGORIAS_NUCLEO (F-DPB-1)
  dataInicio    String
  dataTermino   String?   // obrigatória para 103
  origem        String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?
  versoes       DpVinculoVersao[]
  @@index([userId, unitId])
  @@map("dp_vinculos")
}
model DpVinculoVersao {
  id             String   @id @default(cuid())
  vinculoId      String
  vinculo        DpVinculo @relation(fields: [vinculoId], references: [id], onDelete: Restrict)
  vigenteDesde   String
  vigenteAte     String?
  lotacaoId      String
  cargoId        String?
  jornadaId      String?
  sindicatoId    String?
  salarioCents   BigInt   // salário contratual, pró-labore ou bolsa
  unidadeSalario String   // undSalFixo do S-2200
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@index([vinculoId, vigenteDesde])
  @@map("dp_vinculo_versoes")
}

// PR-6
model DpAfastamento { id String @id @default(cuid()) vinculoId String motivo String inicio String fim String?
                      observacao String? createdAt DateTime @default(now()) updatedAt DateTime @updatedAt
                      deletedAt DateTime? @@index([vinculoId, inicio]) @@map("dp_afastamentos") }
model DpFeriasImplantacao { id String @id @default(cuid()) vinculoId String aquisitivoInicio String diasGozados Int
                      fonte String informadoPorId String createdAt DateTime @default(now()) updatedAt DateTime @updatedAt
                      deletedAt DateTime? @@index([vinculoId]) @@map("dp_ferias_implantacoes") }
```

Os modelos de uma linha estão abreviados; no PR, cada um vai no formato do schema (um campo por linha, com comentário de
origem). Os FKs da versão do vínculo (`lotacaoId`, `cargoId`, `jornadaId`, `sindicatoId`), o `sindicatoId` da convenção, o
`convencaoId` do parâmetro e o `vinculoId` do afastamento e da implantação são `onDelete: Restrict`. Todos os modelos com `userId` ganham a relação com `User` (cascade), como o `Partner`.

### 3.3 Registro e portas (PR-1)

```ts
export const DP_MODULE_KEYS = ['DP-PONTO', 'DP-PAG', 'DP-BEN', 'DP-ADM', 'DP-APP', 'DP-DES', 'DP-GED', 'DP-CAT', 'DP-BI'] as const;
export const DP_PORT_KEYS = ['JORNADA_APURADA'] as const;
export const dpModuleDefSchema = z.object({
  key: z.enum(DP_MODULE_KEYS),
  name: z.object({ pt: z.string().min(1), en: z.string().min(1) }).strict(),
  aiDescription: z.string().min(1),
  dependsOn: z.array(z.enum(DP_MODULE_KEYS)),
  requiresOneOf: z.array(z.array(z.enum(DP_MODULE_KEYS)).min(2)).default([]),
  featureDir: z.string().regex(/^dp[A-Z][A-Za-z0-9]*$/),
  provides: z.array(z.enum(DP_PORT_KEYS)),
  disponivel: z.boolean(),
}).strict();

export interface DpPorts { JORNADA_APURADA: JornadaApuradaPort }
export interface JornadaApuradaPort {
  apurar(ownerUserId: string, vinculoId: string, competencia: Competencia): Promise<JornadaApurada>;
}
export type JornadaApurada = { origem: 'NULO' | 'MODULO'; motivo?: string; itens: readonly never[] }; // item: F2
```

### 3.4 DTOs de entrada (PR-3/PR-4, esboço)

```ts
export const CATEGORIAS_NUCLEO = ['101', '103', '901', '723'] as const; // F-DPB-1
export const CreateVinculoSchema = z.object({
  unitId: z.string().min(1),
  trabalhadorId: z.string().cuid(),
  matricula: z.string().min(1).max(30),          // `matricula` "C 1 1-30" no S-2200 [D09]
  categoria: z.enum(CATEGORIAS_NUCLEO),
  dataInicio: DateOnly,
  dataTermino: DateOnly.optional(),
  versao: z.object({
    lotacaoId: z.string().cuid(), cargoId: z.string().cuid().optional(), jornadaId: z.string().cuid().optional(),
    sindicatoId: z.string().cuid().optional(),
    salarioCents: z.coerce.bigint().positive(),   // teto de MAX_CENTS do 400 (memória max-cents-e-politica)
    unidadeSalario: z.string().min(1),            // domínio undSalFixo transcrito no PR-4
  }).strict(),
}).strict();
export const CorrigirVersaoSchema = CreateVinculoSchema.shape.versao.partial().strict(); // sem default (zod4 partial)
export const CreateTrabalhadorSchema = z.object({
  unitId: z.string().min(1), cpf: z.string().regex(/^\d{11}$/), nome: z.string().min(1).max(120),
  nascimento: DateOnly, pcd: z.boolean().default(false),
  employeeRef: z.string().min(1).optional(), partnerId: z.string().cuid().optional(),
}).strict();
export const AtivarModuloSchema = z.object({
  unitId: z.string().min(1), moduleKey: z.enum(DP_MODULE_KEYS), competenciaInicio: CompetenciaSchema,
  motivo: z.string().min(3).max(500),
}).strict();
```

### 3.5 HTTP (aditivo; tudo sob `/api/dp`)

| Rota | PR |
|---|---|
| `GET /dp/modules` · `GET/POST /dp/modules/activations` · `POST /dp/modules/activations/:id/end` | PR-1 |
| CRUD `/dp/lotacoes`, `/dp/cargos`, `/dp/jornadas`, `/dp/sindicatos`, `/dp/convencoes` (+ `/:id/parametros`) | PR-3 |
| CRUD `/dp/trabalhadores` · `POST/GET /dp/vinculos` · `POST /dp/vinculos/:id/versoes` · `PATCH /dp/vinculos/:id/versoes/:versaoId` | PR-4 |
| `GET /dp/rubricas` | PR-5 |
| `GET /dp/vinculos/:id/ferias` · CRUD `/dp/vinculos/:id/afastamentos` e `/dp/vinculos/:id/ferias/implantacao` | PR-6 |

### 3.6 Códigos de erro (`DpErrorReason`)

`DP_MODULE_MISSING_DEPENDENCY` · `DP_MODULE_REQUIRES_ONE_OF` · `DP_MODULE_UNAVAILABLE` · `DP_MODULE_ACTIVATION_OVERLAP` ·
`DP_MODULE_DEPENDENT_ACTIVE` · `DP_JORNADA_EM_USO` · `DP_CODIGO_DUPLICADO` · `DP_CPF_DUPLICADO` · `DP_MATRICULA_DUPLICADA`
· `DP_EMPLOYEE_REF_INVALIDO` · `DP_CATEGORIA_FORA_DO_NUCLEO` · `DP_APRENDIZ_IDADE` · `DP_APRENDIZ_PRAZO` ·
`DP_IDADE_MINIMA` · `DP_PRO_LABORE_SEM_SOCIO` · `DP_PRO_LABORE_FORA_DA_SOCIEDADE` · `DP_PRO_LABORE_MEI` ·
`DP_VERSAO_SOBREPOSTA` · `DP_VERSAO_ANTES_DO_INICIO` · `DP_TRABALHADOR_COM_VINCULO` · `DP_AFASTAMENTO_SOBREPOSTO` ·
`DP_FERIAS_PERIODO_INEXISTENTE`.

### 3.7 Eventos de auditoria (allowlist do `auditCanonical.ts`, no PR que os emite)

`dp.module_activation.created/ended` (PR-1) · `dp.lotacao.*`, `dp.cargo.*`, `dp.jornada.*`, `dp.sindicato.*`,
`dp.convencao.*`, `dp.convencao_parametro.*` (PR-3) · `dp.trabalhador.created/updated/deleted/corrected`,
`dp.vinculo.created/deleted`, `dp.vinculo_versao.created/corrected` (PR-4) · `dp.afastamento.*`, `dp.ferias_implantacao.*`
(PR-6). Os payloads levam só ids, códigos, datas, contagens e hashes. CPF, nome, nascimento, salário e motivo de
afastamento nunca entram (F-DPB-3; F17).

### 3.8 Gates de cada PR

- `cd server && npx tsc --noEmit` e o `tsconfig.test.json` dos testes; `cd my-app && npx tsc --noEmit` (o snapshot de
  DTO gera tipos para o FE, memória `fe-contract-types-import-type`).
- `npm run check:arch` em `server/` e em `my-app/`: exit 0, com o baseline sem crescer (no PR-0, também a prova do item 6).
- `npm run test:unit` e `npm run test:integration` (serial).
- Snapshot de shape dos DTOs (`__dto-shapes__.json`), inserindo só o novo (memória `dto-snapshot-update-reordena-no-windows`).
- Guard de contagem de paths do openapi (`src/__tests__/openapi-paths.test.ts`) e `public/openapi.json`.
- Allowlist do `auditCanonical.ts` com os eventos novos e as guardas de PII.
- Lint do server (`no-console`, `catch` silencioso).

---

## 4. Forks deste BRIEF

**Ratificados pelo dono** (questionário, 02/11; cédula
[`D-2026-11-02-DP-BRIEF-F0-F1`](../plano/decisoes/D-2026-11-02-DP-BRIEF-F0-F1.md)):

| Fork | Pergunta | Decisão (palavras do dono) |
|---|---|---|
| F-DPB-1 | Categorias aceitas no núcleo | *"101+103+901+723 (Recommended)"*. O autônomo 701 espera a costura com o RETENCOES-FONTE no F2 |
| F-DPB-2 | Chave dos submódulos no registro | *"DP-<SUFIXO> (Recommended)"* |
| F-DPB-3 | Histórico de correção | *"Audit sem valores (Recommended)"* |

**Decididos pela casa ou pela referência** (regra do dono de 07/10; o dono pode reverter qualquer um):

| # | Pergunta | Decisão | Base |
|---|---|---|---|
| D-1 | Onde mora o núcleo | Uma feature `features/dp/` para todo o núcleo (cadastros agora; folha, eSocial, fechamento, ponte e SST depois), e uma feature `features/dp<Nome>/` por opcional | Precedente `features/accounting/`: um núcleo sempre ligado numa feature só. PRE-ADR §3, última linha, para os opcionais. A regra `D1` precisa dessa separação por pasta |
| D-2 | Fronteira do núcleo com o motor | O DP nunca é injetado no motor; a leitura de `employees` passa por porta implementada no factory | `AC-2.1-B1`, `AC-2.1-B4`; vazamentos medidos no KIT-SETOR F20 |
| D-3 | Quantas portas no F0 | Só `JORNADA_APURADA` (o exemplo da spec §3 regra 3, ligada ao gate legal do ponto). As outras nascem no BRIEF da fase que as consome | Porta sem consumidor é contrato especulativo. Contrato §2: padrão de camada sim, código sem uso não |
| D-4 | Granularidade da ativação | Por competência (`AAAA-MM`) | Leiaute do eSocial: a validade das informações vai em `iniValid`, "no formato AAAA-MM" [D09]; e a spec §3 regra 5 pede "os módulos que estavam ativos naquela data" da competência |
| D-5 | Cadastro referenciado muda? | Jornada referenciada trava os campos de cálculo; muda por cadastro novo + versão nova do vínculo | F-DP-8 (b): reproduzir sem versionar o cadastro; só o vínculo tem versões |
| D-6 | Guarda do `employeeRef` | Verificação no read; o DP não depende da linha | ADR-PERSISTENCE-BOUNDARY:56 (as duas guardas são válidas) e :62 (`checkDeleteRules` não vê o Prisma) |
| D-7 | Policy | `DpPolicy` própria, com a regra de hoje do `canManageFiscalProfile` | `_REUSE-CRITERION`: a posse diverge (dado de RH, com salário), embora a regra seja igual hoje |
| D-8 | Tabelas do eSocial | `LegalParameter`, transcritas da fonte oficial | Precedente `NATUREZA_RENDIMENTO` e `CST_PIS_COFINS`; "jurisdição = dado" (PRE-ADR-PESSOAL F-PES-8) |
| D-9 | Pró-labore e sócio | O vínculo 723 aponta para o `Partner` | `_REUSE-CRITERION`: o mesmo objeto (o sócio), vivo em IRRF-DISTRIBUICAO e no DP |

**PENDENTE:** nenhum fork deste BRIEF. Os F-FOL-1..9 (`PRE-ADR-FOLHA-CONTABILIZACAO`) continuam pendentes e são da ponte
contábil, não deste BRIEF.

## 5. Pendente de validação externa (não entra em checklist até ter fonte ou resposta)

- **Tabelas de 2027** (faixas do INSS, teto, salário mínimo e IRRF): saem em portaria e decreto de dez/2026 a jan/2027.
  Entram por PR de dado com fonte, e o teste do item 27 amarra o mínimo à faixa 1.
- **Enquadramento das rubricas do item 51** (natureza da Tabela 03 e incidências): o contador confere. Entra no próximo
  pacote do contador **depois da triagem** (memória `pacote-contador-triar-antes`), como **uma** pergunta: "estas 6
  rubricas, com estes códigos, estão certas para o S-1010?". Até lá, `conferidoPeloContador: false`.
- **Primeira CCT real** (L-PES-7; spec §12, "antes de F1"): diz quais cláusulas além do piso entram em `CCT_CHAVES`. O
  texto da CCT é dado do cliente ou do sindicato.
- **Leitura de 29/02 no período aquisitivo** (item 57): o contador confirma no cenário golden.
- **Portaria Interministerial MPS/MF 13/2026 no DOU:** não baixou (403). Vale a tabela oficial do INSS que a transcreve
  [D07], como no dossiê do EFICIENCIA-FISCAL.

## 6. Insumos ausentes

- **Domínios do leiaute** que o executor transcreve no PR: `tpJornada`, `undSalFixo` e os domínios de `codIncCP` e
  `codIncFGTS` do S-1010. Estão no [D09], mas não foram copiados para cá.
- **Lei 11.788/2008 (estágio):** não lida. O F1 só cadastra a categoria 901; jornada máxima, recesso e seguro ficam para
  a fase que calcular a bolsa.
- **As figuras da spec** (fluxo da competência etc.) seguem ausentes (PRE-ADR §7).

## 7. Encaixes registrados (o que este BRIEF prepara e outro BRIEF faz)

| Encaixe | Onde entra | O que este BRIEF já deixa |
|---|---|---|
| **SST no núcleo** (F-DP-13, F-PES-3) | BRIEF próprio `BE-INCR-DP-SST`, na fase do motor e do eSocial, dentro de `features/dp/` (não é submódulo, não tem porta nem ativação) | Vínculo, lotação, cargo e afastamento, que o S-2240 e o S-2220 referenciam; a idade abaixo de 18 (item 42) |
| Snapshot do cálculo, guardado inteiro (F-DP-8) | F2 | `parametrosFolha` (item 26), `vinculoNaData` (item 47), `parametroCctVigente` (item 34), `DpPortResolver` (item 17) |
| Calculadoras de INSS e IRRF | F2 | `calcularIrrfPf` (F8) é o canônico do IRRF; o INSS progressivo é novo |
| Lançamentos manuais e `JornadaApuradaItem` | F2 | A porta nula (item 16) |
| Autônomo 701 × RETENCOES-FONTE (`TRABALHO_NAO_ASSALARIADO_PF`; item 19 do EFD-REINF) | F2, fork obrigatório | F-DPB-1 deixou a categoria fora |
| FPAS, terceiros, RAT/FAP, tipo de lotação | F2 (patronal) e F4 (S-1005/S-1020) | Lotação com `unitId` (item 28) |
| Dias de férias por faltas (CLT art. 130 I–IV) e perda do direito (art. 133) | F3 (férias) | `periodosDeFerias` puro (item 57) |
| Gate do ponto (CLT art. 74 § 2º, F-DP-7) | F5 (fechamento) | Registro com `DP-PONTO` e vínculo por `unitId`. A contagem por estabelecimento nasce com o consumidor |
| Limite legal da jornada | F5 (verificações) | Jornada com `minutosSemanais` e `tipoJornada` |
| Campos do S-2200/S-2300 só do eSocial (raça, instrução, endereço…) e o S-1000/S-1005 | F4 | Trabalhador e vínculo, com espaço por migração aditiva |
| Dependentes (dedução do IRRF, salário-família) | F2 | — |

## 8. Achados fora de escopo (registrados, não planejados)

- **O cabeçalho do `PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF` ainda diz "Proposed — RATIFICAÇÃO PENDENTE"**, embora o lote
  F-PES-0..13 tenha sido ratificado em 12/10 (já registrado no PRE-ADR-DP §8; fold à parte).
- **PRE-ADR-DP §2.2** diz que o enum não tem INSS, IRRF nem FGTS. IRRF e FGTS existem (F6). Este BRIEF registra a
  correção e não edita o PRE-ADR.
- **Regra entre opcionais** (spec §4 regra 4: opcional só importa outro opcional declarado em `dependsOn`) não foi
  pedida (F-DP-10 é só núcleo → opcional). Hoje todos os `dependsOn` estão vazios; vale olhar quando o primeiro
  opcional depender de outro.
- **`controllers/` e `routes/` fora da `D1`** (item 7): se um controller do núcleo passar a chamar serviço de opcional,
  nenhuma regra pega.

## 9. Perfil previsto por PR (taxonomia do `classificador.md`; previsão, não decisão)

| PR | Perfil | Por quê |
|---|---|---|
| PR-0 | opus-baixo | Tipos puros com fast-check e uma regra de dependency-cruiser com plantio |
| PR-1 | opus-medio | Registro, gate na tx e resolvedor de portas com motivo nomeado |
| PR-2 | opus-medio | Transcrição por script de quatro tabelas oficiais, com contagem e hash |
| PR-3 | opus-baixo | Cinco CRUDs no molde, com uma trava de uso |
| PR-4 | opus-medio | Regras legais (aprendiz, pró-labore, MEI), versões contínuas e guarda de PII |
| PR-5 | opus-baixo | Catálogo com testes de consistência; a escolha dos códigos fica marcada para o contador |
| PR-6 | opus-baixo | Um cadastro e uma função pura de calendário |

## 10. Riscos (incluindo os vieses do autor)

- **Sem oráculo no F0/F1.** Cadastro errado só aparece no cálculo (F2) ou na rejeição do eSocial (F4). Mitigação:
  regra legal só com artigo lido (§0) e o golden do contador no F2. Este BRIEF não finge que o teste do agente prova
  folha.
- **Escopo grande.** São 62 itens em 7 PRs. A ordem do §1 deixa o valor em camadas: PR-0..PR-2 já dão a fundação e as
  tabelas, mesmo que o resto espere.
- **Tabelas do eSocial mudam por nota técnica** (a NT 07/2026 mudou a Tabela 18). Elas são `LegalParameter` com
  vigência: a mudança é linha nova, não código.
- **Viés do autor:** preferi o molde da casa em todos os forks de estrutura (D-1..D-9). O caso adversarial tentado foi o
  D-1 ("uma feature por pacote, como a spec manda"): com pacotes do núcleo separados, a regra `D1` teria de listar as
  pastas do núcleo uma a uma e o núcleo passaria a se importar entre pastas sem regra. O precedente `accounting` resolve
  com uma pasta. O custo é uma feature grande, como já é a contabilidade.
- **Leitura adotada em duas bordas legais:** o limite de 24 anos do aprendiz vale para o contrato inteiro (art. 433), e
  não só na admissão; e o aniversário de 29/02. As duas estão declaradas, não escondidas.
