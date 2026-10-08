# BE-INCR-KIT-SETOR — kit de setor: núcleo portável + estrutura importada pelo wizard, com atualização em 3 níveis (BRIEF, nó KIT-SETOR)

> **Sessão:** `sessao-planejamento` — produz decisão, não código.
> **Autorização (dono, chat, 2026-10-07):** *"Sim abre o brief com o máximo de detalhe possível"*, sobre o nó
> [`KIT-SETOR`](../plano/nos/KIT-SETOR.md), cujo campo `autorizacao` diz *"autoriza o BRIEF; sem 'executa'"*. Cobre o
> BRIEF **inteiro** do nó. **Não** cobre código: cada PR exige "executa" próprio (ORCH-006).
> **Prioridade:** 1 da fila (*"Pode passar esse plano na frente de tudo"*; F-KS-0 → b: só a [LAC-B](../plano/nos/LAC-B.md) pausa).
> **PRE-ADR:** [`PRE-ADR-NUCLEO-KIT-DE-SETOR.md`](../adr/PRE-ADR-NUCLEO-KIT-DE-SETOR.md), **Accepted**. Cédulas em
> [`D-2026-10-07-NUCLEO-KIT-DE-SETOR`](../plano/decisoes/D-2026-10-07-NUCLEO-KIT-DE-SETOR.md) e
> [`D-2026-10-07-KIT-SETOR-FORKS-POR-REFERENCIA`](../plano/decisoes/D-2026-10-07-KIT-SETOR-FORKS-POR-REFERENCIA.md).
> **Regra do dono para forks deste BRIEF (07/10):** fork de **arquitetura/estrutura** que um projeto consolidado
> responde é decidido pela referência, com fonte citada (*"O que vc não souber em arquitetura e estrutura, pesquise em
> projetos consolidados"* + *"precisa de questionário em vez de já corrigir com a referência?"*). Fica **PENDENTE** só o
> que a referência não decide (conteúdo, produto) ou o que contraria uma decisão explícita do dono. Essa regra
> **substitui**, para este nó, o "nenhum fork se auto-ratifica" do template. O dono pode reverter qualquer cédula.
> **Base:** `origin/main` `dc6fb361` (re-fetch 07/10). O código foi lido numa cópia de `origin/main`, não no worktree (que está atrás).
> **Escopo:** backend. O FE é nó vizinho: a tela da [LAC-B](../plano/nos/LAC-B.md) (pausada) e um `FE-INCR-KIT-SETOR` a abrir.

---

## 0. Fatos consumados que este BRIEF respeita (lidos nesta sessão, em `origin/main`)

Grau **V** = lido no arquivo citado.

| # | Fato | Onde |
|---|---|---|
| F1 | Catálogo **fechado** de 7 arquétipos em código; `get()` nunca cria | `features/accountingBinding/archetypes/catalog.ts` |
| F2 | `AccountRole` **fechada** em 10 papéis (`controle-recebível`, `receita-serviço`, `receita-revenda`, `caixa-por-metodo` com sub-chave, `contra-receita`, `passivo-diferido`, `passivo-adiantamento`, `custo-mercadoria-vendida`, `estoque`, `receita-nao-uso`) | `accountingBinding/models/types.ts` |
| F3 | `AccountingBindingV1`: `eventBindings[]` = `{eventKey, archetypeKey, fieldSlots, roleSlots[{role, accountCode}]}`, com `accountCode` **literal e obrigatório** (F-P1-5a) e `transform` ∈ {`cents_from_reais`, `identity`} | `accountingBinding/dtos/AccountingBindingDto.ts` |
| F4 | `BindingCompileService.compile(scope, {sectorKey, operationalSchema, chart, eventBindings})` recebe os `accountCode` **já escolhidos**. Valida (`BindingValidationService`) e aplica o gate de cobertura (`missing` = emitível sem binding ⇒ Draft). Cria **sempre** linha nova `bindingVersion = max+1` dentro da tx, auto-ativa e supersede a anterior atomicamente. Audita `binding.compiled/activated/validation_failed` | `accountingBinding/services/BindingCompileService.ts` |
| F5 | `SECTOR_BINDING_REGISTRY` = `{beautySalon, aestheticClinic}` → `{binding, operationalSchema}`; `DEFAULT_SECTOR_KEY` = salão. É lido pelo CLI e pelo `activate-default` | `accountingBinding/fixtures/sectorBindingRegistry.ts` |
| F6 | `BindingActivationService.activateDefault`: policy → setor do registry → `already-active` → pré-checks sem efeito (chart vazio, período do mês) → `installCanonicalChart()` → `seedAndOpen` → `compile()` | `accountingBinding/services/BindingActivationService.ts` |
| F7 | `eventKey` **=** `AccountingEvent.sourceType` (`sale.finalized`, `sale.settled`, `sale.returned`, `sale.package.sold`, `sale.cogs`, `sale.package.expired`). A clínica reaproveita o vocabulário `sale.*` (F-P2-6 b). `sourceType` é **união fechada** no núcleo | `fixtures/saleBinding.ts`, `fixtures/clinicBinding.ts`; `accounting/sync/AccountingSyncPort.ts` |
| F8 | Em produção, o boot lê **todos** os bindings `Active` do banco (`AccountingBindingFeederService.buildActiveMapperRegistrations`) e troca o `AccountingSyncService` **antes** do `app.listen()`. O mapper é chaveado por `unitId:sourceType`. Zero `Active` ⇒ boot abortado | `server.ts` `bootstrap()`; `lib/factory.ts` `initializeAccountingSyncFromBindings()` (~l.1472); `AccountingSyncService.ts` ~l.100-125 |
| F9 | Ativar depois do boot **não** recarrega os mappers (F-I4-4 **PENDENTE** no BRIEF do I4/I5) | `BE-INCR-ONBOARDING-ACTIVATION-brief.md` l.16-18, item 13 |
| F10 | `activateAccountingBindingCli` é chamado por humano ou pela **etapa de migração do pipeline**, nunca no boot (ADR-M2 decisão 4). É idempotente: com `Active` presente, sai 0 | `server/src/jobs/activateAccountingBindingCli.ts` (cabeçalho) |
| F11 | Plano canônico único (20 contas: `1`, `1.1.1`–`1.1.6`, `2`, `2.1.1`, `2.1.2`, `2.3`, `2.3.1`, `3`, `3.1`–`3.4`, `4`, `4.1`, `4.2`) | `accounting/fixtures/ChartOfAccountsFixture.ts` |
| F12 | `PostingService.ensureChartOfAccounts` cria o que falta **e restaura conta canônica soft-deleted**. É chamado **dentro de todo `postEntry`** | `accounting/services/PostingService.ts:157-187, 298` |
| F13 | Conta por papel existe em **três** lugares: (i) `roleSlots` do binding; (ii) `AccountingScopeSettings` (encargo pago/recebido, depreciação, ganho/perda na baixa, Parte B); (iii) `FiscalProfile` (ICMS e PIS/COFINS a recuperar, insumo, IRPJ/CSLL despesa e a recolher, PIS/COFINS despesa e a recolher, crédito outros, retido a compensar, retenção a conciliar, saldo negativo IRPJ/CSLL). (ii) e (iii) já são editáveis por escopo | `schema.prisma` `AccountingScopeSettings`, `FiscalProfile` |
| F14 | `ReferentialMapping` por `(userId, unitId, accountId, mappingVersion)`; `ReferentialMappingService.setMapping/batchSet` com gate de conta viva in-tx + audit in-tx; catálogo RFB global `ReferentialAccount(layoutVersion, code, isAnalytic)` | `schema.prisma`; `ReferentialMappingService.ts`; `ReferentialCatalogService.ts` |
| F15 | Catálogo RFB **2025** importado (1.123 contas), gate X2 fechado (#372) | `docs/plano/gates/X2.md` |
| F16 | `ServiceFiscalProfile(unitId, serviceRef)`: `cTribNac`, `cTribMun?`, `cNBS?`, `cIndOp` (default `030101`), `cLocPrestacao?`, `xDescServ?`; `upsert` idempotente; o serviço **não** lê o preset `services` | `ServiceFiscalProfileService.ts:29-32` |
| F17 | Regime da empresa por ano: `CompanyFiscalProfile.regime` ∈ `MEI·SIMPLES·PRESUMIDO·REAL`; da unidade: `FiscalProfile.regimeTributario` ∈ `SIMPLES·PRESUMIDO·REAL` (`regimeUnidadeEsperado`) | `accounting/models/regimeEmpresa.ts` |
| F18 | Marca de ano entregue: `CompanyFiscalProfile.ecfRecibo` (`marcarEcfTransmitida`). Não há campo de recibo da ECD | `schema.prisma` `CompanyFiscalProfile`; `CompanyFiscalProfileService.ts:202` |
| F19 | Fronteiras de import testadas: `dynamicTables` nunca importa `accounting`; `accountingBinding` só importa de `accounting` os contratos nomeados | `dynamicTables/__tests__/no-accounting-imports.boundary.test.ts`; `accountingBinding/__tests__/importBoundary.test.ts` |
| F20 | **Vazamentos do futuro núcleo** (medidos): `accounting/services/PhysicalStockSync.ts` e `ProductRefLookup.ts` importam tipos de `dynamicTables`; `FiscalDocumentEmissionService.ts:35` importa `packages/models/validity`. Os formatos de `lib/` (`sped`, `ecf`, `nfe`, `nfse`, `mit`) só importam `legalParameters` e `accounting/models` | grep em `origin/main` |
| F21 | Migração SQLite não é transacional: `ABORT` deixa metade aplicada → prólogo `IF NOT EXISTS` | memória `migracao-sqlite-nao-e-transacional` |

**Referência externa** (PRE-ADR §2.4/§2.5, V no código-fonte): Odoo 17 `chart_template.py` (`_load` ≠ recarga;
`_pre_reload_data` descarta `property_*`, não sobrescreve conta existente além das tags, renomeia imposto alterado
para `[old]` e cria um novo, só acrescenta mapeamento de posição fiscal); OCA `account_chart_update` (diff com exclusão
item a item); Business Central (matriz de lançamento como dado da empresa; pacote de configuração só em empresa nova).

---

## 1. Divisão em PRs (cada um exige "executa" próprio; merge na ordem)

| PR | Conteúdo | Itens | Muda comportamento? |
|---|---|---|---|
| **PR-1** | Contrato `SectorKitV1` + módulo `features/sectorKits` + migração dos 2 setores para kit v1 (**zero-diff**) | 1–8 | Não (golden) |
| **PR-2** | Instalação do kit (`KitInstallation`, `activate-default` instala o kit inteiro, passos idempotentes) | 9–17 | Sim: o tenant novo recebe padrões fiscais e referencial quando o kit os tiver (v1 = vazio ⇒ inofensivo) |
| **PR-3** | Ajuste papel→conta (`RoleAccountOverride`) + compilação *kit ⊕ ajustes* + rotas | 18–25 | Sim |
| **PR-4** | Classificador de diff (puro) + CLI de atualização (passo do deploy) + `KitUpgradeRun`/`KitUpgradePending` + rotas de pendência | 26–40 | Sim |
| **PR-5** | Fronteira de portabilidade do núcleo: teste de import + correção dos 3 vazamentos (F20) | 41–45 | Não |
| **PR-6** | Vocabulário de evento aberto: `sourceType` declarado pelo kit, validado por registro | 46–51 | Não para os setores atuais |

Dependências: PR-2 depois do PR-1; PR-3 e PR-4 depois do PR-2 (o PR-4 consome o ajuste do PR-3); PR-5 é independente
(pode ir em paralelo ao PR-1); PR-6 depois do PR-1.

---

## 2. Checklist de comportamentos (cada um testável isoladamente)

### PR-1 — contrato do kit e migração zero-diff

1. **Módulo novo `server/src/features/sectorKits/`** (F-KB-1 → a), com `kits/<kitKey>/kit.v<N>.ts`, `registry.ts`,
   `dtos/SectorKitDto.ts`, `models/kitTypes.ts`. Ele não importa `features/accounting` (só os contratos já permitidos
   ao `accountingBinding`, via `accountingBinding`) nem `dynamicTables`. *Teste:* boundary test próprio, no molde de
   `importBoundary.test.ts`.
2. **`SectorKitV1Schema`** (Zod `.strict()` em todo nível, §3.1), com refinamentos:
   - `kitVersion` inteiro ≥ 1;
   - códigos de `chartExtension` únicos e **fora** do canônico (F11);
   - todo `accountCode` de `roleSlots`/`roleDefaults` existe em canônico ∪ `chartExtension` e é folha;
   - todo `eventKey` de `binding.eventBindings` está em `emittableEventKeys`, e vice-versa (o mesmo gate de cobertura de F4, adiantado para o tipo);
   - `referential[].entries[].accountCode` ∈ canônico ∪ extensão;
   - `serviceFiscalDefaults[].cTribNac` com 6 dígitos.

   *Teste:* um caso de rejeição por refinamento.
3. **Kit v1 do salão e da clínica** derivados **literalmente** de `SALE_BINDING_V1`/`CLINIC_BINDING_V1` e dos
   `*_OPERATIONAL_SCHEMA_SNAPSHOT`, com `chartExtension: []`, `roleDefaults: {}`, `serviceFiscalDefaults: []`,
   `referential: []` (F-KB-6 → conteúdo novo só em v2). *Teste golden:* `kit.binding` é deep-equal ao fixture
   atual, e o `compiledFromHash` é igual.
4. **`KIT_REGISTRY`** (`kitKey → SectorKitV1[]`, versões em ordem) e `latestKit(kitKey)`. O
   `SECTOR_BINDING_REGISTRY` vira **derivado** do `KIT_REGISTRY` (mesmo shape `{binding, operationalSchema}`), e os
   consumidores (CLI, `BindingActivationService`) ficam sem diff de comportamento. *Teste:* o registro derivado é
   deep-equal ao de hoje.
5. **Versionamento disciplinado:** um kit novo é um arquivo novo `kit.v<N+1>.ts`; o anterior nunca é editado depois
   de mergeado. *Gate:* teste que congela o sha256 do JSON canônico de cada `kit.v<N>` já publicado (lista em
   `kits/<kitKey>/published.json`). Editar uma versão publicada quebra o teste; publicar exige acrescentar a linha.
   (Precedente: `nfe-fixture-provenance.test.ts`, trava deliberada.)
6. **`changelog`** obrigatório por versão (`string[]`, ≥ 1 linha para N > 1). Ele vira o texto da pendência no PR-4.
7. **Catálogo de setores para o wizard:** `listKits()` devolve `{kitKey, label, latestVersion}` (sem rota nova neste
   PR; consumido pelo PR-2).
8. **Regressão:** as suítes de `accountingBinding` (golden fases 0/1, ativação, feeder) seguem verdes sem mudança.

### PR-2 — instalação

9. **Model `KitInstallation`** (§3.2): uma linha por `(userId, unitId)`, ou seja, **um kit por unidade** (direto:
   dois kits na mesma unidade colidiriam em `unitId:sourceType`, F8). `kitKey`, `kitVersion`, `status`
   (`INSTALLING | INSTALLED | FAILED`), `steps` (Json com o último passo concluído), `installedAt`, `updatedById`,
   soft-delete. Migração com prólogo `IF NOT EXISTS` (F21).
10. **`KitInstallService.install(scope, {kitKey, regime, ano})`** com 7 passos em ordem fixa, **cada um idempotente
    e com commit próprio** (F-KB-2 → Contrato §2.3: cabeçalho `atomicUntil` declarando os commits e o reconcile;
    não há tx única, porque cada serviço abre a sua). Os passos:
    1. plano canônico (`installCanonicalChart`, existente);
    2. `chartExtension` (cria se faltar; **nunca** restaura conta extensão apagada pelo contador, ao contrário de F12);
    3. `roleDefaults` de `AccountingScopeSettings`/`FiscalProfile`, **só campos nulos** (regra Odoo: o modelo preenche, nunca sobrescreve);
    4. compilação do binding (`compile()` com `applyRoleOverrides`, que é identidade enquanto não há ajuste);
    5. `serviceFiscalDefaults` (`upsert` só onde não existe perfil);
    6. referencial do regime×ano (`batchSet`, só contas sem mapeamento na versão);
    7. período do mês (`seedAndOpen`, existente).

    O `steps` grava o passo concluído. Uma nova chamada retoma do primeiro passo não concluído.
11. **`activate-default` passa a instalar o kit:** o `BindingActivationService.activateDefault` delega ao
    `KitInstallService`, mantendo o contrato HTTP (`ActivateDefaultBindingDto`) e os pré-checks atuais. O
    `already-active` vira "kit instalado na versão N". O DTO de resposta ganha, de forma aditiva e opcional,
    `kit: {kitKey, kitVersion, status}`. *Teste:* as suítes atuais de `activateDefault.integration.test.ts` ficam verdes.
12. **Regime e ano da instalação:** `regime` = `CompanyFiscalProfile.regime` do ano corrente; se não existir,
    `FiscalProfile.regimeTributario` da unidade; se nenhum existir, o passo 6 é **pulado** com aviso
    `KIT_REFERENTIAL_SKIPPED_NO_REGIME` (não bloqueia; o referencial entra na próxima atualização). Ano = ano do `today` do validador (F6).
13. **Passo 6 só com catálogo:** sem `ReferentialAccount` para o `mappingVersion` do kit ⇒ o passo pula com aviso
    `KIT_REFERENTIAL_SKIPPED_NO_CATALOG`. Código referencial que não seja analítico no catálogo ⇒ o kit é **inválido**
    (erro de build do kit, pego por um teste que roda os kits contra o catálogo 2025 de fixture).
14. **Falha no meio:** `status = FAILED`, `steps` preservado, erro nomeado `KitInstallStepFailedError(step)`, e a resposta
    vira `Draft` com `blocking:[{code:'KIT_INSTALL_STEP_FAILED', step}]`, como a assimetria do I4 (tenant de pé, contabilidade em `Draft`).
15. **Auditoria:** `kit.installed` (`{kitKey, kitVersion, unitId}`) e `kit.install_failed` (`{kitKey, kitVersion, step}`),
    sem PII. Ambos na allowlist do `auditCanonical.ts` **no mesmo PR**. A trilha `binding.*` do passo 4 continua.
16. **CLI `installSectorKitCli`** (molde de F10): `--owner-user-id --unit-id --kit-key [--actor-user-id]`. Absorve o
    `activateAccountingBindingCli` (que vira alias, sem mudança de comportamento para quem o chama hoje).
17. **Recarga dos mappers depois da instalação pela tela:** **não** é deste BRIEF. Segue o F-I4-4 (pendente no BRIEF
    do I4/I5). Sem ele, a unidade instalada pela tela lança só depois do reinício. A instalação pelo CLI do pipeline
    (antes do boot) não depende dele (F8).

### PR-3 — ajuste papel→conta (o "ajuste do contador")

18. **Model `RoleAccountOverride`** (§3.2): `(userId, unitId, role, accountId)`. `role` ∈ papéis do binding (F2,
    incluindo sub-chave `caixa-por-metodo:<método>`). `setById`, `motivo` (obrigatório, 10–500 chars), soft-delete,
    `@@unique([userId, unitId, role])` entre linhas vivas. **Só papéis do binding** (F-KB-3 → b): os papéis de
    `AccountingScopeSettings`/`FiscalProfile` já são dado editável da unidade (F13) e continuam nas suas casas,
    como as `property_*` do Odoo, que ficam em empresa, categoria e parceiro.
19. **`applyRoleOverrides(eventBindings, overrides) → eventBindings`**, função **pura**: troca o `accountCode` de
    todo `roleSlot` cujo `role` tem ajuste. *Teste:* tabela de casos (sem ajuste = identidade; com sub-chave; papel
    inexistente no binding = ignorado e listado em `unusedOverrides`).
20. **Validação do ajuste dentro da tx** (gate autoritativo in-tx): a conta existe, está viva, é folha
    (`acceptsEntries`), pertence ao escopo, e a **natureza é compatível com o papel**. A tabela papel→natureza é
    derivada do lado (`debit`/`credit`) e da natureza esperada nos arquétipos (F1); a fonte é o mesmo validador do
    binding. Incompatível ⇒ 422 `ROLE_ACCOUNT_NATURE_MISMATCH`.
21. **Ajuste dispara recompilação** na mesma requisição: `PUT` grava o ajuste e chama `compile()` com
    `applyRoleOverrides`. Se o `compile()` der `Draft`, o ajuste **não** é persistido (tx do ajuste antes da
    compilação; revertida se a compilação reprovar). Ponto de commit declarado em `atomicUntil`. Resposta:
    `{override, binding:{status, bindingVersion}}`.
22. **Rotas** (em 2 toques: `routes/` + `docs.paths.ts`):
    - `GET /accounting-kit/role-overrides?unitId=`
    - `PUT /accounting-kit/role-overrides/:role` (body `{unitId, accountId, motivo}`)
    - `DELETE /accounting-kit/role-overrides/:role?unitId=`

    Remover o ajuste também recompila, voltando ao código do kit.
23. **Policy:** `canManageKit(scope)` = a mesma regra de `canCompile` do `AccountingBindingPolicy` (o administrador
    financeiro do escopo; referência: Odoo exige administrador para carga e recarga). Quando a [GOV-CONTADOR] entregar
    o papel de contador responsável, a policy passa a aceitar esse papel (achado §7).
24. **Auditoria:** `kit.role_override_set` (`{role, accountId, previousAccountId}`) e `kit.role_override_removed`
    (`{role}`) na allowlist. O `motivo` **não** vai ao payload (texto livre = risco de PII; fica só na linha).
25. **Recompilação também lê os ajustes** em todo caminho que compila: instalação (passo 4), atualização (PR-4) e o
    `POST /accounting-binding/compile` existente quando chamado com `sectorKey` de kit. *Teste:* com ajuste ativo,
    recompilar pelo caminho antigo **não** perde o ajuste.

### PR-4 — atualização em 3 níveis (decisão 7 + R1–R4)

26. **`classifyKitDiff(target: SectorKitV1, installed: SectorKitV1, tenant: TenantKitState) → KitDiff`**, função
    **pura**, sem I/O. `TenantKitState` = contas vivas e apagadas por código, ajustes, campos de
    `AccountingScopeSettings`/`FiscalProfile` preenchidos, perfis fiscais por serviço, mapeamentos referenciais por
    versão, e anos congelados (item 31). Compara **o alvo com o estado real do tenant**, como o assistente da OCA,
    usando a versão instalada só para saber "isto veio do kit ou foi criado pelo usuário".
27. **Nível (a) — `additive`, aplica sozinho.** Itens que **não mudam onde um lançamento cai**:
    - conta nova de `chartExtension` cujo código não existe vivo nem apagado;
    - `roleDefaults` para campo **nulo** no tenant;
    - `serviceFiscalDefaults` para `serviceRef` sem perfil;
    - referencial de versão de ano **não congelado** para conta sem mapeamento.
28. **Nível (b) — `forward`, aplica com aviso.** Muda onde lançamentos **futuros** caem; o passado fica intocado:
    - `eventBinding` **novo** (R1: Odoo não muda comportamento de lançamento numa recarga, logo não é aditivo);
    - `eventBinding` alterado (arquétipo, `fieldSlots` ou `roleSlots` de papel **sem** ajuste);
    - `serviceFiscalDefaults` alterado para `serviceRef` cujo perfil ainda é o do kit anterior.

    Aplica recompilando (nova `bindingVersion`, a anterior vira `Superseded`, como o "`[old]` + novo" do Odoo).
    Registra um aviso visível (`KitUpgradeRun.notices`).
29. **Nível (c) — `conflict`, vira pendência e não aplica.** A empresa segue na versão atual daquele item:
    - `override`: papel com ajuste do contador e o kit mudou a conta daquele papel;
    - `account_deleted_by_user`: conta do kit apagada pelo tenant e o alvo ainda a usa;
    - `account_changed_in_use`: o kit muda nome ou natureza de conta que já tem partida (natureza com partida **nunca** muda; o nome vira pendência);
    - `field_set_by_user`: `roleDefaults` diferente de um campo já preenchido no tenant;
    - `service_profile_edited`: perfil fiscal do serviço editado pelo tenant e o kit mudou o padrão;
    - `referential_year_frozen`: mudança de referencial em ano congelado (R3);
    - `referential_mapped_differently`: conta com mapeamento diferente na mesma versão.
30. **Nada é removido pela atualização:** item que sumiu do alvo vira `notices` ("o kit não usa mais X"). Nunca há
    delete nem desativação automática (o Odoo só acrescenta; a desativação é escolha do usuário no assistente da OCA).
31. **Ano congelado** (F-KB-5 → a): o ano A está congelado se `CompanyFiscalProfile(ano=A).ecfRecibo` não é nulo **ou**
    existe período de A com status `HARD_CLOSED` (análogo à data de bloqueio do Odoo).
32. **Model `KitUpgradeRun`** (§3.2): uma linha por execução e por unidade. `fromVersion`, `toVersion`, `mode`
    (`DRY_RUN | APPLY`), `report` (Json = `KitDiff` + `notices` + resultado por item), `status`
    (`PLANNED | APPLIED | PARTIAL | FAILED`), `startedAt`, `finishedAt`, `actor` (`'deploy-cli'` ou userId).
33. **Model `KitUpgradePending`** (§3.2): uma linha por conflito. `runId`, `itemKey`, `reason`, `kitValue` (Json),
    `tenantValue` (Json), `status` (`OPEN | ACCEPTED | REJECTED`), `decidedById`, `decidedAt`, `motivo`.
    `@@unique([userId, unitId, kitKey, toVersion, itemKey])` evita pendência duplicada em reexecução.
34. **CLI `upgradeSectorKitsCli`** (F-KS-5 → b + R2), chamado na etapa de migração do pipeline, **antes** do boot (F10):
    - `--dry-run` (padrão) calcula e grava `KitUpgradeRun(DRY_RUN)`, sem escrita de domínio;
    - `--apply` exige um `DRY_RUN` da **mesma** `(unit, from→to)` gravado no mesmo deploy (identificador `--deploy-id`) e aplica (a)+(b), criando pendências para (c);
    - itera todas as `KitInstallation` com `kitVersion < latest`;
    - por unidade, o erro é isolado (uma unidade falha, as outras seguem; `status = PARTIAL` no resumo);
    - código de saída ≠ 0 se alguma unidade falhar, para o pipeline ver.

    Como roda antes do boot, o leitor do boot (F8) já pega os bindings novos, sem depender do F-I4-4.
35. **Aplicar é idempotente:** reexecutar o `--apply` do mesmo deploy é no-op (os itens aplicados já batem com o alvo e
    as pendências já existem). `KitInstallation.kitVersion` só avança para `toVersion` quando (a)+(b) foram aplicados,
    mesmo com pendências abertas. A pendência é por item, não trava a versão.
36. **Instalar ≠ atualizar** (R2): `install()` (PR-2) e `upgrade()` são métodos e caminhos separados. `upgrade()`
    nunca toca `RoleAccountOverride` nem campos já preenchidos de `AccountingScopeSettings`/`FiscalProfile`
    (a regra `property_*` do Odoo). *Teste:* um ajuste sobrevive a uma atualização que muda o mesmo papel no kit e gera pendência `override`.
37. **Rotas de pendência:**
    - `GET /accounting-kit/pending?unitId=&status=`
    - `POST /accounting-kit/pending/:id/accept`: aplica o valor do kit. Para `override`, remove o ajuste e recompila; se a recompilação der `Draft`, nada é aplicado.
    - `POST /accounting-kit/pending/:id/reject`: mantém o valor do tenant; a pendência fecha e não reaparece para o mesmo `toVersion`.

    Body com `motivo` obrigatório. Policy `canManageKit` (item 23).
38. **`GET /accounting-kit?unitId=`** devolve a instalação (`kitKey`, `kitVersion`, `latestVersion`, `status`), a
    última execução, a contagem de pendências abertas e o `changelog` entre a versão instalada e a última.
39. **Auditoria:**
    - `kit.upgrade_applied` (`{fromVersion, toVersion, additive, forward, conflicts}` — só contagens);
    - `kit.upgrade_pending_accepted` / `kit.upgrade_pending_rejected` (`{pendingId, itemKey, reason}`).

    O dry-run **não** audita (não escreve domínio); ele fica no `KitUpgradeRun`. Tudo entra na allowlist.
40. **Testes por classe** (o risco do PRE-ADR): um teste por motivo de (c), um por tipo de (a) e de (b), e o
    `--apply` sem dry-run recusado. Mais um teste de **propriedade**: para qualquer par de kits gerado, todo item cai
    em exatamente uma classe, e aplicar (a)+(b) no estado do tenant devolve `classifyKitDiff` com `additive` e `forward` vazios (convergência).

### PR-5 — fronteira de portabilidade do núcleo (F-KS-6 → a)

41. **Definição do núcleo:** `features/accounting/**`, `features/accountingBinding/{archetypes,interpreter,models,dtos}/**`,
    `features/legalParameters/**`, `features/sectorKits/{dtos,models}/**`, e de `lib/`: `sped`, `ecf`, `ecfReal`, `nfe`,
    `nfeSignature`, `nfse`, `nfseSignature`, `nfseEvento`, `nfseReadback`, `cnab`, `ofx`, `mit`, `cnpj`, `cpf`,
    `errors`, `logger`.
42. **Teste de fronteira `core-boundary.test.ts`:** nenhum arquivo do núcleo importa `features/{dynamicTables,
    interview,onboarding,sales,crm,packages,chat*,documents,dashboardLayout,savedViews,structuredData,analytics,reports}`.
    Usa checagem por **segmento** de caminho (lição do `importBoundary.test.ts`) e normaliza `\` → `/` (memória `rg-win32-backslash`).
    *Prova na condição que falha:* o teste fica vermelho em `origin/main` com exatamente os 3 vazamentos de F20,
    antes das correções 43–44 (SG-005).
43. **`PhysicalStockSync` e `ProductRefLookup`** passam a depender de portas (`StockRowPort`, `ProductRefPort`)
    declaradas no núcleo e implementadas em `lib/factory.ts` sobre o `IDynamicTableRepository`. Zero mudança de comportamento (testes atuais verdes).
44. **`FiscalDocumentEmissionService`**: `expiryCompetence`/`parseExpiryMovementKey` (`packages/models/validity`)
    entram por porta (`PackageExpiryPort`) ou são movidos para `accounting/models` se forem puros e só de data (decisão do executor por leitura, registrada no PR). Zero mudança de comportamento.
45. **Documento curto `docs/accounting/NUCLEO-PORTAVEL.md`:** a lista do item 41, as portas que um projeto novo
    implementa (`AccountingEvent` emitido pela origem, `StockRowPort`, `ProductRefPort`, `PackageExpiryPort`, portas do
    `BindingActivationService`) e o passo a passo para plugar um vertical rígido.

### PR-6 — vocabulário de evento aberto (decisão 3 + F-KB-4 → b)

46. **`AccountingEvent.sourceType: string`** com formato `^[a-z][a-z0-9]*(\.[a-z0-9_]+)+$`, no lugar da união fechada
    (F7). Os `sourceType` legados (`CRM_LEGACY_SOURCE_TYPE` etc.) e seus guards ficam como estão.
47. **Registro de eventos de negócio:** `emittableEventKeys` de cada kit. O `AccountingSyncService.sync` já rejeita
    evento sem mapper (F8). Passa a distinguir `UNKNOWN_EVENT_KEY` (nenhum kit declara) de `NO_MAPPER_FOR_UNIT`
    (declarado, mas a unidade não tem binding), reusando o `NoMapperForUnitError` existente.
48. **Os mappers `sale.*` à mão** (`accounting/sync/mappers/*`, referência do golden) seguem tipados com o literal; só
    a porta alarga. *Teste:* `tsc` limpo e golden verde.
49. **Kit novo com evento novo não edita o núcleo:** teste com um kit de fixture (`testKit`) declarando
    `service.subscription.billed` → `revenue_recognition` compila, ativa e lança, sem tocar `features/accounting`.
50. **Rastro evento → fato → lançamento** (decisão 3): o `JournalEntry` já guarda `sourceType`/`sourceId` (o evento de
    negócio). A linha do binding guarda `eventKey → archetypeKey` (o fato contábil). `GET /accounting-kit/trace?sourceType=&sourceId=`
    devolve `{evento, arquétipo, bindingVersion, journalEntryId}`. Só leitura.
51. **Gates:** snapshot de shape dos DTOs (`dtoShapeSnapshot`) para todo DTO novo ou alterado; paridade i18n pt/en
    dos códigos de erro e motivos de pendência; `npm run docs:generate` e o guard de path-count do openapi (rotas novas:
    PR-3 +3, PR-4 +4, PR-6 +1).

---

## 3. Contratos (esboço materializável)

### 3.1 Kit (código, versionado)

```ts
// features/sectorKits/dtos/SectorKitDto.ts
const RoleDefaultsSchema = z.object({
  scopeSettings: z.object({            // F13 (ii) — só preenche campo nulo
    bankChargeExpenseAccountCode: z.string().optional(),
    bankChargeIncomeAccountCode: z.string().optional(),
    depreciationExpenseAccountCode: z.string().optional(),
    disposalGainAccountCode: z.string().optional(),
    disposalLossAccountCode: z.string().optional(),
  }).strict().default({}),
  fiscalProfile: z.object({            // F13 (iii) — só preenche campo nulo
    icmsRecuperavelAccountCode: z.string().optional(),
    pisCofinsRecuperavelAccountCode: z.string().optional(),
    insumoExpenseAccountCode: z.string().optional(),
    irpjDespesaAccountCode: z.string().optional(), csllDespesaAccountCode: z.string().optional(),
    irpjRecolherAccountCode: z.string().optional(), csllRecolherAccountCode: z.string().optional(),
    pisDespesaAccountCode: z.string().optional(), cofinsDespesaAccountCode: z.string().optional(),
    pisRecolherAccountCode: z.string().optional(), cofinsRecolherAccountCode: z.string().optional(),
  }).strict().default({}),
}).strict();

export const SectorKitV1Schema = z.object({
  kitKey: z.string().regex(/^[a-z][A-Za-z0-9]+$/),          // = sectorKey (ex.: 'beautySalon')
  kitVersion: z.number().int().min(1),
  label: z.string().min(1).max(80),
  changelog: z.array(z.string().min(1)).min(1),
  chartExtension: z.array(CanonicalAccountSchema),           // F-KS-3a: só acrescenta
  binding: AccountingBindingV1Schema,                        // ADR-P1, inalterado
  operationalSchema: z.record(z.unknown()),                  // chaves = emittableEventKeys (F4)
  roleDefaults: RoleDefaultsSchema.default({}),
  serviceFiscalDefaults: z.array(z.object({
    serviceRef: z.string().min(1),                           // chave do serviço no preset do setor
    cTribNac: z.string().regex(/^\d{6}$/),
    cNBS: z.string().regex(/^\d{9}$/).optional(),
    cIndOp: z.string().regex(/^\d{6}$/).default('030101'),
  }).strict()).default([]),
  referential: z.array(z.object({                            // F-KS-7a
    regime: z.enum(['MEI', 'SIMPLES', 'PRESUMIDO', 'REAL']),
    mappingVersion: z.string().regex(/^\d{4}$/),             // = layoutVersion do catálogo (F14/F15)
    entries: z.array(z.object({
      accountCode: z.string(), referentialCode: z.string(), label: z.string(),
    }).strict()),
  }).strict()).default([]),
}).strict().superRefine(kitRefinements);                    // item 2
```

### 3.2 Prisma (por escopo; todos com `userId` FK cascade, `unitId` string, `createdAt/updatedAt`)

```prisma
model KitInstallation {
  id          String    @id @default(cuid())
  userId      String
  unitId      String
  kitKey      String
  kitVersion  Int
  status      String    // INSTALLING | INSTALLED | FAILED
  steps       String    // JSON: { lastCompletedStep: 0..7, warnings: string[] }
  installedAt DateTime?
  updatedById String?
  deletedAt   DateTime?
  @@unique([userId, unitId])          // um kit por unidade (item 9)
  @@index([kitKey, kitVersion])
  @@map("kit_installations")
}

model RoleAccountOverride {
  id        String    @id @default(cuid())
  userId    String
  unitId    String
  role      String    // AccountRole (F2), com sub-chave 'caixa-por-metodo:<m>'
  accountId String
  account   Account   @relation(fields: [accountId], references: [id], onDelete: Restrict)
  motivo    String
  setById   String
  deletedAt DateTime?
  @@index([userId, unitId, role])     // unicidade viva garantida no serviço, in-tx (soft-delete × @@unique)
  @@map("role_account_overrides")
}

model KitUpgradeRun {
  id          String    @id @default(cuid())
  userId      String
  unitId      String
  kitKey      String
  fromVersion Int
  toVersion   Int
  deployId    String
  mode        String    // DRY_RUN | APPLY
  status      String    // PLANNED | APPLIED | PARTIAL | FAILED
  report      String    // JSON: KitUpgradeReport (§3.3)
  actor       String
  startedAt   DateTime  @default(now())
  finishedAt  DateTime?
  @@index([userId, unitId, kitKey, toVersion])
  @@map("kit_upgrade_runs")
}

model KitUpgradePending {
  id          String    @id @default(cuid())
  userId      String
  unitId      String
  kitKey      String
  toVersion   Int
  runId       String
  itemKey     String    // ex.: 'role:receita-serviço', 'account:2.1.3', 'referential:2026:1.1.1'
  reason      String    // §3.3 ConflictReason
  kitValue    String    // JSON
  tenantValue String    // JSON
  status      String    // OPEN | ACCEPTED | REJECTED
  decidedById String?
  decidedAt   DateTime?
  motivo      String?
  @@unique([userId, unitId, kitKey, toVersion, itemKey])
  @@map("kit_upgrade_pendings")
}
```

Nota sobre o `RoleAccountOverride`: o `@@unique` com soft-delete morre em P2002 quando se remove e depois se
recria o mesmo papel (memória `unique-de-idempotencia-x-soft-delete`). Por isso a unicidade é viva, in-tx, no serviço.

### 3.3 Diff, relatório e pendência

```ts
type AdditiveKind = 'account' | 'roleDefault' | 'serviceFiscalDefault' | 'referential';
type ForwardKind  = 'new_binding' | 'changed_binding' | 'changed_service_fiscal_default';
type ConflictReason =
  | 'override' | 'account_deleted_by_user' | 'account_changed_in_use' | 'field_set_by_user'
  | 'service_profile_edited' | 'referential_year_frozen' | 'referential_mapped_differently';

interface KitDiff {
  additive: Array<{ kind: AdditiveKind; itemKey: string; value: unknown }>;
  forward:  Array<{ kind: ForwardKind;  itemKey: string; eventKey?: string; before: unknown; after: unknown }>;
  conflict: Array<{ reason: ConflictReason; itemKey: string; kitValue: unknown; tenantValue: unknown }>;
  notices:  Array<{ itemKey: string; message: string }>;   // removidos do alvo (item 30), avisos de (b)
}

interface KitUpgradeReport extends KitDiff {
  results: Array<{ itemKey: string; outcome: 'applied' | 'pending' | 'skipped' | 'failed'; error?: string }>;
  bindingVersionBefore?: number;
  bindingVersionAfter?: number;
}
```

### 3.4 HTTP (aditivo)

| Rota | Entrada | Saída | PR |
|---|---|---|---|
| `POST /accounting-binding/activate-default` (existente) | inalterada | + `kit?: {kitKey, kitVersion, status}` | PR-2 |
| `GET /accounting-kit` | `?unitId` | `KitInstallationView` (item 38) | PR-4 |
| `GET /accounting-kit/role-overrides` | `?unitId` | `RoleAccountOverrideView[]` | PR-3 |
| `PUT /accounting-kit/role-overrides/:role` | `{unitId, accountId, motivo}` | `{override, binding}` | PR-3 |
| `DELETE /accounting-kit/role-overrides/:role` | `?unitId` | `{binding}` | PR-3 |
| `GET /accounting-kit/pending` | `?unitId&status` | `KitUpgradePendingView[]` | PR-4 |
| `POST /accounting-kit/pending/:id/accept` | `{motivo}` | `KitUpgradePendingView` | PR-4 |
| `POST /accounting-kit/pending/:id/reject` | `{motivo}` | `KitUpgradePendingView` | PR-4 |
| `GET /accounting-kit/trace` | `?unitId&sourceType&sourceId` | `{eventKey, archetypeKey, bindingVersion, journalEntryId}` | PR-6 |

Erros nomeados (pt/en): `KIT_UNKNOWN`, `KIT_INSTALL_STEP_FAILED`, `KIT_REFERENTIAL_SKIPPED_NO_REGIME`,
`KIT_REFERENTIAL_SKIPPED_NO_CATALOG`, `ROLE_ACCOUNT_NATURE_MISMATCH`, `ROLE_NOT_IN_KIT`,
`KIT_UPGRADE_DRY_RUN_REQUIRED`, `KIT_PENDING_NOT_OPEN`, `UNKNOWN_EVENT_KEY`.

### 3.5 Eventos de auditoria novos (allowlist do `auditCanonical.ts`, no PR que os emite)

`kit.installed`, `kit.install_failed` (PR-2) · `kit.role_override_set`, `kit.role_override_removed` (PR-3) ·
`kit.upgrade_applied`, `kit.upgrade_pending_accepted`, `kit.upgrade_pending_rejected` (PR-4). O payload só leva ids,
versões, códigos de papel ou de item e contagens.

---

## 4. Forks deste BRIEF

**Decididos pela referência** (regra do dono, 07/10; o dono pode reverter):

| Fork | Pergunta | Decisão | Base |
|---|---|---|---|
| F-KB-1 | Onde o kit vive no código | (a) módulo próprio `features/sectorKits/`, fora de `accounting` e de `accountingBinding` | Odoo: cada localização (`l10n_*`) é um addon separado do núcleo `account`, ligado por dependência declarada |
| F-KB-2 | Atomicidade da instalação | (a) passos idempotentes com commit próprio + `atomicUntil` + retomada | Odoo instala numa transação só, mas aqui cada serviço abre a sua (SQLite sem tx aninhada, F12 `postEntry` abre tx raiz). Vence a regra da casa: Contrato §2.3, motor rejeitado → `atomicUntil` |
| F-KB-3 | O ajuste cobre quais papéis | (b) só os do binding; `AccountingScopeSettings`/`FiscalProfile` seguem nas suas casas | Odoo: `property_*` ficam em empresa, categoria de produto e parceiro, sem tabela única; a recarga não as sobrescreve |
| F-KB-4 | Vocabulário de evento | (b) `sourceType: string` + registro declarado pelos kits | Business Central: "Source Code" é tabela de dados; Odoo: a origem do lançamento é genérica (`res_model`/`res_id`) |
| F-KB-5 | Critério de ano congelado | (a) `ecfRecibo` preenchido **ou** período `HARD_CLOSED` no ano | Odoo: data de bloqueio fiscal `fiscalyear_lock_date` ([`account/models/company.py` 17.0, l.64](https://raw.githubusercontent.com/odoo/odoo/17.0/addons/account/models/company.py)) ≈ período fechado; o recibo é o fato de entrega já gravado (F18) |
| F-KB-7 | Quem aceita ou recusa pendência | (a) `canManageKit` = administrador financeiro do escopo | Odoo: só administrador carrega e recarrega o modelo; OCA: o usuário de finanças decide item a item |
| F-KB-8 | O diff compara com o quê | (a) alvo × **estado real** do tenant; a versão instalada só distingue "veio do kit" | OCA `account_chart_update`: compara o plano da empresa com o modelo |

**PENDENTE (a referência não decide — conteúdo ou produto):**

- **F-KB-6 — Conteúdo novo nos kits v1.**
  - (a) v1 = migração literal, sem conteúdo novo: `chartExtension`, `roleDefaults`, `serviceFiscalDefaults` e `referential` vazios. O conteúdo entra como v2, um PR por setor, com a fonte de cada item.
  - (b) v1 já traz as contas de imposto (IRPJ/CSLL/PIS/COFINS a recolher…), os padrões fiscais por serviço e o referencial RFB 2025 do canônico.

  **Recomendação: (a).** O PR-1 fica provável por golden (zero-diff). Cada conteúdo novo passa pelo próprio caminho de atualização (PR-4) e prova o mecanismo no primeiro uso real. O conteúdo também depende do §5.

- **F-KB-9 — Primeira versão com conteúdo (v2) de qual setor.**
  - (a) salão (o 1º cliente é Simples em SP capital);
  - (b) clínica;
  - (c) os dois juntos.

  **Recomendação: (a)**, pelo 1º cliente.

---

## 5. Pendente de validação externa (não entra em checklist até ter fonte ou resposta)

- **Mapeamento referencial do canônico** (F11 → catálogo RFB 2025, F15) por regime. O plano referencial muda com a
  forma de tributação (código do plano na ECD). Há catálogo (V), mas a escolha conta-canônica → código RFB é
  enquadramento. Pela regra do dono de 07/10 ("decide-se pela lei"), a fonte é a IN RFB 2.003/2021 (ECD) e a
  2.004/2021 (ECF), já no corpus. Falta a transcrição do de-para.
- **Contas de imposto do kit** (`roleDefaults.fiscalProfile`): os códigos e nomes no plano. O plano da empresa é livre (não é lei); o referencial a que elas mapeiam é lei.
- **Padrões fiscais por serviço** (`cTribNac`/`cNBS`) do salão e da clínica: a lista é lei (LC 116, NBS 2.0); o
  enquadramento de cada serviço do preset é a pendência (o X14 já cita 060101/060201/060301 para beleza, Res. CGSN 140 art. 25 § 1º III "m").

## 6. Insumos ausentes

- **F-I4-4** (recarga dos mappers após ativar pela tela) segue pendente no BRIEF do I4/I5. Ele condiciona a instalação
  **pela tela** (item 17), não a atualização (item 34).
- O papel "contador responsável" da [GOV-CONTADOR] (em andamento) ainda não é uma policy. O item 23 começa com a regra de `canCompile`.
- O `serviceRef` estável de cada serviço do preset do setor (a chave que o `serviceFiscalDefaults` usa). Ler o preset
  `services` de `beautySalon`/`aestheticClinic` na hora do PR-2 (o `ServiceFiscalProfileService` não lê o preset, F16).
- A natureza esperada por papel (item 20) está implícita nos arquétipos (`side` + validador). O executor extrai a tabela e a congela num teste.

## 7. Achados fora de escopo (registrados, não planejados)

- **F-I4-4 pela regra de referência:** o Odoo e o Business Central aplicam configuração sem reiniciar. Pela regra do
  dono, isso puxaria o F-I4-4 para (a). A decisão é do BRIEF do I4/I5, não deste.
- **Conta usada por binding `Active` pode ser apagada** sem aviso: emenda 4 do ADR-P1, "mudança de chart/arquivamento
  de conta bound (hoje SEM ponte)". O PR-4 trata o efeito na atualização (`account_deleted_by_user`), mas o guard no
  delete de conta é de outro nó, porque exigiria porta `accounting → accountingBinding`.
- **Comentários desatualizados:** o exemplo `eventKey: 'salon.sale.finalized'` no `@openapi` de
  `AccountingBindingDto.ts` (o real é `sale.finalized`, F7), e o "ninguém chama este serviço ainda" no cabeçalho do
  `AccountingBindingFeederService.ts` (ele é chamado no boot, F8).
- **R6/R7 do PRE-ADR:** o estado "Simples com excesso de sublimite" no regime e a tabela tipo "operação fiscal" para NFC-e/NF-e → [X13]/[X10a].
- **5 códigos de conta fixos em serviços** (`CashFlowReportService` ×3, `TieOutDiagnosticService`, `FiscalDocumentEmissionService`): só incomodam se um kit mudar o canônico, o que o F-KS-3 (a) proíbe.
- **LAC-B:** quando voltar, o BRIEF da tela (`FE-INCR-BINDING-ACTIVATION-screen-brief.md`) precisa de emenda para mostrar o kit (versão, pendências) em vez de só o binding.

## 8. Perfil previsto por PR (taxonomia do `classificador.md`; previsão, não decisão)

| PR | Perfil | Por quê |
|---|---|---|
| PR-1 | opus-baixo | Contrato + derivação literal com golden; risco baixo |
| PR-2 | opus-medio | Orquestração em passos idempotentes sobre 5 serviços existentes + `atomicUntil` |
| PR-3 | opus-medio | Gate in-tx + recompilação condicionada |
| PR-4 | opus-medio (alto no classificador) | O ponto mais delicado (o Odoo deixou para terceiros); teste de propriedade |
| PR-5 | opus-baixo | Portas + teste de fronteira provado vermelho antes |
| PR-6 | opus-medio | Alarga um tipo do núcleo usado em vários lugares |

## 9. Riscos (incluindo os vieses do autor)

- **Atualização automática** (R4, decisão do dono): um erro no `classifyKitDiff` muda lançamentos de muitos tenants
  num só deploy. Mitigação: dry-run obrigatório gravado (item 34), teste de propriedade (item 40), `forward` nunca
  reescreve o passado (nova `bindingVersion`), e a pendência por item não trava a versão.
- **O BRIEF ficou grande.** A divisão em 6 PRs com dependências explícitas é a defesa. PR-5 e PR-6 podem esperar sem bloquear o valor de PR-1..PR-4.
- **Viés do autor:** este BRIEF decide 7 forks pela referência. Onde a referência é de outra plataforma (Odoo, com
  tx única e Postgres), a tradução para o SQLite + `atomicUntil` daqui é inferência minha (F-KB-2), marcada como tal.
- **O F-KB-6 (a) adia o valor visível:** o v1 não muda nada para o cliente. O primeiro ganho real é o v2 do salão (F-KB-9).

## 10. Emenda do PR-2 — lacunas resolvidas pelo dono (chat, 2026-10-08, questionário)

A execução do PR-2 achou 7 decisões que o checklist não cobria. Todas foram perguntadas e respondidas
(regra 2 da `sessao-feature`); nenhuma foi escolhida pelo executor.

| # | Lacuna | Decisão do dono |
|---|---|---|
| E-1 | O compile faz dry-run com `validateEntry`, que exige o período aberto, mas o item 10 abria o período só no passo 7. Instalação nova sairia `Draft` | **Período antes do compile.** Ordem final: 1 plano · 2 extensão · 3 `roleDefaults` · **4 período** · **5 compile** · 6 padrões fiscais por serviço · 7 referencial |
| E-2 | `kit` na resposta × `toEqual` exato em 2 asserts de `activateDefault.integration.test.ts` | Incluir `kit` e ajustar **só esses 2 asserts** |
| E-3 | Unidade com binding `Active` anterior ao PR-2, sem `KitInstallation` | **Backfill na migração:** `KitInstallation` v1 `INSTALLED` para todo binding `Active` de setor com kit (o v1 é vazio, então equivale ao que a unidade já tem) |
| E-4 | Alias do CLI × mocks do teste do CLI | O alias delega ao `installSectorKitCli`; no teste **só os mocks mudam** (asserções intactas). O caminho do CLI segue sem instalar plano e sem abrir período |
| E-5 | Passo 3 sem linha de `AccountingScopeSettings`/`FiscalProfile` | Settings ausente ⇒ cria a linha só com as contas. `FiscalProfile` ausente **e** kit com `roleDefaults.fiscalProfile` ⇒ **pré-check bloqueia sem escrita**, `KIT_FISCAL_PROFILE_REQUIRED`. O cálculo automático do perfil a partir dos dados da empresa fica como lacuna para um nó próprio |
| E-6 | Qual entrada do `referential[]` instalar | `regime` da empresa **e** `mappingVersion == ano` exato |
| E-7 | Compile que termina `Draft` (sem exceção) | `status = FAILED`, `steps` no passo anterior, `kit.install_failed {step}`; a resposta é o `Draft` de hoje (versão + bloqueantes do validador), sem `KIT_INSTALL_STEP_FAILED`; uma nova chamada recompila |
