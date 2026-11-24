# BRIEF — BE-INCR-PAIS-NA-BORDA-F1: o razão deixa de conhecer o e-Lalur e a regra de níveis da ECD

> Nó [`PAIS-NA-BORDA`](../plano/nos/PAIS-NA-BORDA.md), fatia **F1** do [`ADR-PAIS-NA-BORDA`](../adr/ADR-PAIS-NA-BORDA.md) §5
> (Accepted 24/11/2026; cédula [`D-2026-11-24-ADR-PAIS-NA-BORDA-FORKS`](../plano/decisoes/D-2026-11-24-ADR-PAIS-NA-BORDA-FORKS.md)).
> Escrito pela `sessao-planejamento` em 2026-11-24, contra `claude/adr-pais-na-borda-emendas` `fa2b8e35e` (PR #1338, aberto),
> que tem `origin/main` `6a2fc5a6b` sem diferença nos arquivos de código lidos. **Prazo ratificado: 18/12/2026** (F-PBA-6 a).
> Graus: **V** = lido nesta sessão no código ou no documento; **I** = inferido; **L** = localizado por grep, corpo não lido.

## TLDR (2 linhas)

A F1 tira o Brasil do `PostingService` em dois PRs: o **PR-A** inverte a dependência (três portas no centro, três adaptadores
em `paises/br/adapters/`, `PostingService` sem `lalurRepo` nem `assertNivelDoPlano`) e o **PR-B** faz o `git mv` do Lalur para
`features/accounting/paises/br/**`, estende o `LEGADO_BR` e prova a guarda.
**Risco principal:** o ADR contou 9 importadores do `ILalurRepository`, mas o `Lalur.model.ts` tem **17 importadores de
produção fora dos 7 arquivos movidos** (V, grep de 24/11). Depois do `git mv`, cada um que for centro dá `P1`. O PR-B depende
de 3 forks novos (F-PBF1-1..3) e da guarda F0 estar mergeada, e ela é o item 0 do PR-0 do montador único, que ainda não abriu.

---

## 0. Formulário (sessao-planejamento)

- **Item a planejar:** fatia F1 do ADR-PAIS-NA-BORDA §5, linha "F1 — Razão × fiscal BR em `features/accounting`"; nó
  `docs/plano/nos/PAIS-NA-BORDA.md`, tabela "Fatias", linha F1 ("sem BRIEF").
- **Autorização (citação):** frontmatter `autorizacao` do nó: *"dono, chat, 2026-11-24, questionário (AskUserQuestion) a pedido
  dele: ratifica o ADR-PAIS-NA-BORDA e os prazos e o dono das fatias (F-PBA-6 a: o nó nasce neste fold) — não é executa de
  nenhuma fatia"*. ADR §5: *"Cada fatia tem BRIEF próprio (sessão de planejamento), `executa` próprio e prazo."*
  **Cobertura:** a autorização cobre **este BRIEF** e nada de código. Os PR-A e PR-B pedem `executa` do dono para a F1. Não há
  divergência de escopo, só um acréscimo, que vai como fork: a terceira porta (F-PBF1-4) e a regra `P3` (F-PBF1-10).
- **Insumos lidos (V):** ADR §1, §3, §3.1, §5, §6; cédula de 24/11; nó; lacunas `L-20261115-013829-41b5` e
  `L-20261114-222632-0a7b`; `PostingService.ts` (imports, construtor, `assertNivelDoPlano`, `createAccount`, `deleteAccount`);
  `Lalur.model.ts` (exports); `IFixedAssetReader.ts`; os trechos `lalur` dos 9 importadores do `ILalurRepository`;
  `.dependency-cruiser.cjs` (regras L1–X3); `core-boundary.test.ts`; `atomicUntil.boundary.test.ts`; `jest.config.js`
  (`testMatch`); `eslint.config.mjs` (globs); `lib/factory.ts` (montagem do `PostingService`, do `LalurService` e do
  `FixedAssetParteBReader`); o cabeçalho do `dtoShapeSnapshot.test.ts`; `scripts/ecf-tabelas-dinamicas-to-catalog.mjs:29`.
- **Nós vizinhos:**
  - A guarda **F0** (`P1`, `P2`, G1–G5) é o item 0 do PR-0 do montador único ([[EFICIENCIA-FISCAL]],
    `BE-INCR-EFICIENCIA-FISCAL-EMENDA-MONTADOR-UNICO-brief.md`). O PR-B depende dela (§2).
  - Os PRs abertos **#1333** (`fiscalYearOf`) e **#1335** (conta canônica pela identidade) editam o `PostingService.ts`: o import
    da linha 5 e o bloco do `deleteAccount` vizinho ao guarda do e-Lalur (V, `gh pr diff`). O PR-A rebaseia depois deles.
  - A F5 é quem esvazia o `LEGADO_BR` que este BRIEF faz crescer, e a F6 move a coluna `depreciationParteBAccountId` para o
    satélite (ADR §1, ponto iv).

## 1. Decisões ratificadas que este BRIEF aplica (não rediscutir)

| Decisão | O que impõe aqui |
|---|---|
| R3 (ADR §1) | o centro declara porta em `features/accounting/ports/`, o adaptador mora em `paises/br/adapters/`, e a ligação é só no `lib/factory.ts`; o gate continua dentro da tx |
| F-PBA-1 (a) | identificador **novo** do centro em inglês: as portas, os tipos delas e o `monthBounds` (F-PBF1-1) |
| F-PBA-2 (a) | a borda usa o termo da lei, e o `git mv` não renomeia (`LalurService` continua `LalurService`) |
| F-PBA-5 (a) | legado BR que fica fora da pasta e consome a borda entra no `LEGADO_BR` **por emenda datada do ADR, com sinal do dono** (R7). Centro nunca entra: usa porta |
| ADR §3 | a guarda e os ajustes G1–G5 são da F0, não desta fatia |
| Contrato §2 | gate autoritativo dentro da tx (o guarda de exclusão continua onde está); camadas `L1`–`L6` valem dentro de `paises/br/` por subcaminho |

## 2. Fatiamento e dependência

| PR | Conteúdo | Depende de | Classe de risco (I) |
|---|---|---|---|
| **PR-A** inversão | itens 1–13: portas, adaptadores, `PostingService` e os dois serviços de configuração sem o Lalur, `monthBounds` | #1333 e #1335 mergeados ou rebaseados; **não** depende do F0 (sem `P1` ninguém reprova o adaptador em `paises/br/adapters/`, e o `testMatch` do jest e os globs do ESLint já alcançam a pasta, V) | vermelho (toca `PostingService`) → revisor-independente |
| **PR-B** movimento | itens 14–24: `git mv`, `LEGADO_BR`, snapshot e `.gen.ts`, prova, `P3` | **F0 mergeado na `main`** (a prova precisa da `P1`; o `LalurDto` movido só fica no snapshot com o G2); PR-A mergeado; F-PBF1-1..3 e 10 respondidos | vermelho |

PR-A e PR-B vão direto para a `main` (não há irmãos de tema para uma `integration/<slug>`; PR-B é filho do PR-A, que entra
antes). Se o F0 não estiver na `main` quando o PR-B ficar pronto, vale o F-PBF1-9.

## 3. Classificação dos importadores (passo 5 da F1)

Todo arquivo de produção de `src/features/**` fora de `paises/` que importa um dos arquivos que a F1 move. Teste não conta
(`TEST` = `(__tests__|\.test\.ts$)` sai da `P1`). `lib/factory.ts`, `controllers/` e `routes/` também não contam: a `from` da `P1`
é `^src/features/`. Grep de 24/11 sobre `from '…/<arquivo>'` (V). Coluna "Classe" pelas três perguntas do ADR §1.

| Importador | O que importa | Classe | Destino na F1 |
|---|---|---|---|
| `services/PostingService.ts` | `ILalurRepository` (`countLiveEntriesByAccount`) | **centro** (razão) | porta `AccountDeletionGuard` (item 2) |
| `services/AccountingScopeSettingsService.ts` | `ILalurRepository.findParteBById` (valida `depreciationParteBAccountId` na tx, `:160`) | **centro** (configuração do escopo) | porta `TaxBookAccountLookup` (item 4, F-PBF1-4) |
| `services/AccountingPolicyVersionService.ts` | `ILalurRepository.findParteBById` (rótulo da conta, `:247`) | **centro** (política versionada) | idem |
| `services/CompanyFiscalProfileService.ts` | `ILalurRepository.countByOwnerYearPeriods`; `LALUR_MESES`, `LALUR_QUARTERS` | BR (regime e forma do IRPJ) | `LEGADO_BR`, **já está no ADR §3.1** (sai na F6) |
| `services/TaxAssessmentService.ts` | `ILalurRepository`; `isLalurMes`, `mesBounds`, `periodoBounds`, `LalurMes` | BR (IRPJ/CSLL) | `LEGADO_BR`, **já no §3.1** (F5) |
| `services/TaxAssessmentPeriodosService.ts` | `LALUR_MESES` | BR | `LEGADO_BR`, **já no §3.1** (F5) |
| `services/SimplesApuracaoService.ts`, `TaxSimulationService.ts`, `PisCofinsAssessmentService.ts`, `IbsCbsAssessmentService.ts` | só `mesBounds` | BR | saem da lista com o F-PBF1-1 (a); no ramo (c), usam a entrada que já têm no §3.1 |
| `services/ReceitaFiscalService.ts` | só `mesBounds` | BR (receita bruta por NCM e tomador) | sai da lista com o F-PBF1-1 (a); no ramo (c), **entrada nova** |
| `services/InterestOnEquityService.ts` | `ILalurRepository`, `deletedLalurCodigo` (`LalurService`), `linhasDoLivro`, `vigenteNoAno` | BR (JCP: Lei 9.249/1995 art. 9º, IN 1.700 art. 75, citados no próprio arquivo) | **entrada nova** no `LEGADO_BR` (F-PBF1-3), F5 |
| `services/SpedEcfRealGenerationService.ts` | `ILalurRepository`, `LalurService`, `lalurParteBBalances`, 8 símbolos do `Lalur.model` | BR (ECF) | **entrada nova** (F-PBF1-3), F5 |
| `services/IFixedAssetReader.ts`, `services/FixedAssetParteBReader.ts` | tipo `LalurPeriodo` | BR (leitor do imobilizado para a Parte B; o único consumidor é o `LalurService` e o `lalurBlocoF`, mais a factory, V) | movem com a F1 (F-PBF1-2 a) ou entrada nova |
| `models/taxAssessmentCalc.ts`, `taxAssessmentCalcAnual.ts`, `taxAssessmentEcfLinhas.ts`, `taxAssessmentMemoExport.ts` | `findLinha`, `LALUR_MESES`, `periodoBounds`, `isLalurMes`, `isLalurQuarter`, `LalurPeriodo` | BR (cálculo puro do IRPJ/CSLL) | **entradas novas** (F-PBF1-3), F5 |
| `dtos/TaxAssessmentDto.ts` | `LALUR_MESES` | BR | **entrada nova** (F-PBF1-3), F5 |

**Resultado no ramo recomendado:** três centros por porta (`PostingService` e os dois serviços de configuração); sete entradas
novas no `LEGADO_BR`; três que já estão no §3.1 e passam a ser usadas; cinco consumidores do `mesBounds` resolvidos pela
extração.

**`AccountingReportService.ts` e `IServiceFiscalProfileRepository.ts`** aparecem no grep por `lalur` só em comentário (V
para o primeiro, `:180`, `:414`, `:418`; L para o segundo) e não importam nada movido.

## 4. Checklist numerado (cada item = ≥ 1 teste ou uma checagem de diff)

### PR-A — inversão (sem mover arquivo do Lalur)

1. **Caracterização antes de mexer (1º commit, verde no código de hoje).** Hoje nenhum teste prova o 409 do e-Lalur: o
   `PostingService.test.ts:158` injeta `countLiveEntriesByAccount: async () => 0` (V). Novo caso no `describe('deleteAccount')`:
   conta de usuário sem partidas e com 1 ajuste vivo ⇒ `AppError` 409 `CONFLICT`, mensagem *"Arquive os ajustes do
   e-Lalur/e-Lacs relacionados a esta conta antes de excluí-la."*, `softDelete` e `auditService.append` não chamados, e a
   contagem recebida com o `tx` da transação. O mesmo caso continua passando depois do item 8, agora pelo adaptador.
2. **Porta `features/accounting/ports/AccountDeletionGuard.ts`**, com tipos só do centro (§5.1). Checagem: o arquivo não
   importa `paises/`, `Lalur*` nem `generated/prisma` além do `Prisma.TransactionClient`.
3. **Porta `features/accounting/ports/AccountCreationRule.ts`** (§5.2).
4. **Porta `features/accounting/ports/TaxBookAccountLookup.ts`** (§5.3; F-PBF1-4).
5. **Adaptador `features/accounting/paises/br/adapters/LalurAccountDeletionGuard.ts`.** Recebe
   `Pick<ILalurRepository, 'countLiveEntriesByAccount'>` e devolve o bloqueio com a mensagem de hoje quando a contagem é > 0.
   No PR-A ele importa o repositório do lugar atual (`../../../repositories/ILalurRepository`); a borda pode importar o centro.
   Teste unitário em `paises/br/adapters/__tests__/`: com 0 ⇒ `null`; com 2 ⇒ bloqueio; o `tx` repassado.
6. **Adaptador `features/accounting/paises/br/adapters/EcdAccountLevelRule.ts`.** Leva o corpo do `assertNivelDoPlano`
   (`PostingService.ts:955-985`) sem mudar regra nem mensagem: analítica patrimonial com menos de
   `NIVEL_MINIMO_ANALITICA_PATRIMONIAL` segmentos ⇒ `ValidationError`; superior inexistente ou analítica ⇒ `ValidationError`
   (I050.COD_CTA_SUP). Origem da regra: Manual da ECD, leiaute 9, maio/2026, p. 120, `REGRA_VALIDA_NIVEL_CONTAS`, como citado no
   comentário de hoje e no BRIEF `BE-INCR-PLANO-4-NIVEIS` (L8, item 6). A constante vai para onde o F-PBF1-7 decidir. Recebe
   `Pick<IAccountRepository, 'findByCode'>`. Os três casos do `describe('createAccount — nível do plano (L8)')`
   (`PostingService.test.ts:851-895`) ganham par no teste do adaptador, e o do `PostingService` continua, com a regra injetada.
7. **Adaptador `features/accounting/paises/br/adapters/LalurParteBAccountLookup.ts`** (F-PBF1-4): `findParteBById` ⇒
   `{ id, label: '<codCtaB> — <descricao>', deleted: !!deletedAt }`. Teste unitário dos dois campos.
8. **`PostingService` sem o Brasil.** O construtor troca `lalurRepo` por `accountDeletionGuards: readonly AccountDeletionGuard[]`
   e acrescenta `accountCreationRules: readonly AccountCreationRule[]` (forma no F-PBF1-5). O `deleteAccount` chama cada guarda
   **dentro da tx, no mesmo ponto** (depois do teste de partidas, antes do `softDelete`). O primeiro bloqueio vira
   `AppError(message, 409, 'CONFLICT')`. O `createAccount` chama as regras no lugar do `assertNivelDoPlano` (antes da tx, F-PBF1-6).
   Saem o método `assertNivelDoPlano` e os imports de `ILalurRepository`, `NIVEL_MINIMO_ANALITICA_PATRIMONIAL` e
   `PATRIMONIAL_NATURES`. Checagem de diff: `grep -n -i -E "lalur|I050|REGRA_VALIDA|NIVEL_MINIMO|Manual da ECD" PostingService.ts`
   devolve 0 linhas. Os testes do item 1 e do item 6 passam.
9. **`AccountingScopeSettingsService` e `AccountingPolicyVersionService` sem o Lalur.** O `lalurRepo: ILalurRepository` vira
   `taxBookAccounts: TaxBookAccountLookup`. A validação na tx (`:160`) continua com a mesma mensagem (*"Conta da Parte B '…' não
   existe neste escopo."*) para `null` ou `deleted`. O rótulo (`:247`) passa a ser o `label` da porta. Checagem:
   `grep -n "ILalurRepository" <os dois>` devolve 0. Os testes existentes (`AccountingPolicyVersionService.test.ts`, que importa o
   `ILalurRepository`, L) passam com o mock da porta.
10. **`monthBounds` no centro** (F-PBF1-1 a). `mesBounds` sai do `Lalur.model.ts` para `features/accounting/models/dates.ts`
    como `monthBounds(year, month)`, com o mesmo corpo (UTC, `to` às 23:59:59.999Z). Os 6 consumidores (`TaxAssessmentService`,
    `SimplesApuracaoService`, `TaxSimulationService`, `PisCofinsAssessmentService`, `IbsCbsAssessmentService`,
    `ReceitaFiscalService`) passam a importar de `dates.ts`, e o `periodoBounds` do `Lalur.model.ts` também (usa em `:81` e
    `:83`, V). O `Lalur.model.ts` não reexporta. Teste: `dates.test.ts` (ou o teste de `dates` que existir) cobre janeiro, fevereiro de ano bissexto e dezembro.
11. **Composição em `lib/factory.ts`.** `new PostingService(…, [new LalurAccountDeletionGuard(this.repositories.lalur)],
    [new EcdAccountLevelRule(this.repositories.account)], …)`; `new LalurParteBAccountLookup(this.repositories.lalur)` nos dois
    serviços de configuração. Nenhuma outra montagem muda.
12. **Os três outros sites que constroem `PostingService`** (`PostingService.test.ts`,
    `PostingServiceValidateOnly.characterization.test.ts`, `ProvenanceAttachIdempotency.integration.test.ts`, V por grep) passam
    a injetar as portas: lista vazia onde o teste não exercita a regra; o adaptador real onde exercita (item 6).
13. **Gates do PR-A:** `cd server && npx tsc --noEmit` limpo; `npm run check:arch` exit 0 com "27 known violations"; jest com
    escopo (`npx jest src/features/accounting/services/__tests__/PostingService.test.ts src/features/accounting/paises
    --selectProjects unit`, mais os testes dos dois serviços de configuração e de `dates`); a integração
    `ProvenanceAttachIdempotency.integration.test.ts` sozinha com `--runInBand`. `atomicUntil.boundary.test.ts` sem mudança
    (os adaptadores não chamam `postEntry`).

### PR-B — `git mv` do Lalur para a borda (depois do F0)

14. **`git mv`, sem renomear (F-PBA-2 a).** Destinos (subpasta de camada igual à de hoje, para as regras `L*` continuarem
    valendo, ADR R2):

    | Hoje (`features/accounting/`) | Depois (`features/accounting/paises/br/`) |
    |---|---|
    | `models/Lalur.model.ts` | `models/Lalur.model.ts` |
    | `models/lalurBlocoF.ts` | `models/lalurBlocoF.ts` |
    | `repositories/ILalurRepository.ts` | `repositories/ILalurRepository.ts` |
    | `repositories/LalurRepository.ts` | `repositories/LalurRepository.ts` |
    | `services/LalurService.ts` | `services/LalurService.ts` |
    | `services/lalurParteBBalances.ts` | `services/lalurParteBBalances.ts` |
    | `dtos/LalurDto.ts` | `dtos/LalurDto.ts` |
    | `services/IFixedAssetReader.ts`, `services/FixedAssetParteBReader.ts` (F-PBF1-2 a) | `services/` |
    | `fixtures/ecf-l12-linhas.json` (F-PBF1-8 a) | `fixtures/ecf-l12-linhas.json` |

    Os testes vão junto, para `paises/br/<camada>/__tests__/`: `lalurBlocoF.test.ts`, `lalurCatalog.test.ts`,
    `LalurService.parteB.test.ts`, `lalurParteBBalances.test.ts`, `LalurDto.test.ts`. O `testMatch` (`**/__tests__/**/*.test.ts`,
    V) já os acha. Checagem: `git diff -M --stat` mostra `R100` ou `R9x` em cada arquivo movido (rename detectado).
15. **Imports atualizados** em todo importador da §3, nos adaptadores do PR-A, em `controllers/lalurController.ts:19`, em
    `lib/factory.ts` (`:107`, `:251`, `:255`, `:437`) e nos testes que importam os movidos (`ecfReal.test.ts`,
    `AccountingPolicyVersionService.test.ts`, `SpedEcfRealGenerationService.test.ts`, os 3 de `models/__tests__/taxAssessment*`
    (`CalcAnual`, `EcfLinhas`, `Rastreio`), `ProvenanceAttachIdempotency.integration.test.ts`). Checagem: `tsc` limpo **e**
    `git grep -n -E "(models/Lalur\.model|models/lalurBlocoF|repositories/I?LalurRepository|services/(LalurService|lalurParteBBalances|IFixedAssetReader|FixedAssetParteBReader)|dtos/LalurDto|fixtures/ecf-l12-linhas)" -- server/src scripts my-app`
    devolve só linhas com `paises/br/`. Isso pega `jest.mock(`, `path.join(` e `import()`, que o `tsc` não vê.
16. **Caminho do catálogo** (F-PBF1-8 a): `scripts/ecf-tabelas-dinamicas-to-catalog.mjs:29` (`OUT_PATH`) e o `FIXTURE` do
    `lalurCatalog.test.ts:22` apontam para `paises/br/fixtures/`. O `lalurCatalog.test.ts` passa, com as contagens da
    reconferência.
17. **`LEGADO_BR` estendido** (F-PBF1-3 a, depois do sinal do dono). A regex do `.dependency-cruiser.cjs` ganha as 7 entradas
    novas da §3 e as 3 que já estão no §3.1 e que o item 0 do F0 talvez não tenha posto na regex (`CompanyFiscalProfileService`,
    `TaxAssessmentService`, `TaxAssessmentPeriodosService`; conferir a regex do F0 no dia). No mesmo PR, a **emenda datada** do
    ADR §3.1: uma linha por entrada nova, com "por que é BR", "quem a faz consumir a borda" = `F1 (git mv do Lalur)` e "sai na
    fatia" = F5. Texto em §5.4.
18. **Snapshot de shape e contrato do FE** (G2 do F0). A chave do `LalurDto` no `features/accounting/dtos/__tests__/__dto-shapes__.json`
    passa a `paises/br/LalurDto`. A edição é à mão: o `UPDATE_DTO_SNAPSHOT=1` reordena o arquivo inteiro no Windows, então rode,
    reverta e aplique só a troca de chave. `my-app/types/contracts/accounting/LalurDto.gen.ts` vai para
    `my-app/types/contracts/accounting/paises/br/LalurDto.gen.ts`, e o import de `my-app/lib/services/lalur.service.ts` (o único
    consumidor, V) muda junto. Checagem: `dtoShapeSnapshot.test.ts` verde (sem órfão), `cd my-app && npx tsc --noEmit` e
    `npm run test:types` limpos. A forma do contrato não muda: o diff do JSON é só a chave.
19. **Prova da `41b5` por plantio (o `comoProvar` da lacuna, redação do ADR §5), com a saída colada no corpo do PR:**
    1. Com o `git mv` e os imports do item 15 feitos, **sem** a extensão do item 17: `npm run check:arch` dá exit 1, e a lista de
       `P1-center-not-country` é **exatamente** a das 7 entradas novas mais as que o F0 não pôs na regex. Se aparecer um arquivo
       fora da §3, a classificação estava incompleta: pare e reclassifique.
    2. Com o item 17 feito e o `PostingService.ts` voltando, num plantio local, a importar
       `../paises/br/repositories/ILalurRepository` (o import de antes do PR-A): exit 1 com `error P1-center-not-country:
       src/features/accounting/services/PostingService.ts → src/features/accounting/paises/br/repositories/ILalurRepository.ts`.
    3. O mesmo para `AccountingScopeSettingsService.ts`: exit 1. Isso prova que centro não entrou no `LEGADO_BR`.
    4. Sem os plantios: exit 0, "27 known violations ignored" (ou o número que o F0 deixou, citado). Os plantios são revertidos
       antes do commit, e o `git diff` confirma.
20. **Regra `P3` do núcleo do razão** (F-PBF1-10 b). Uma regra nova no `.dependency-cruiser.cjs` fecha a `0a7b`:
    `PostingService.ts`, `PeriodService.ts`, `AuditService.ts` e `PostingRepository.ts` não importam `paises/`, nem arquivo do
    `LEGADO_BR`, nem a `FISCAL_LIB`. Esboço em §5.5. Prova por plantio: (i) `PostingService.ts` importando `TaxAssessmentService`
    (legado BR, que a `P1` não vê) ⇒ exit 1 com `P3`; (ii) `PeriodService.ts` importando `FiscalDocumentEmissionService`
    (legado BR fora do `LEGADO_BR`, pego só pelo padrão de nome) ⇒ exit 1; sem os plantios, exit 0.
21. **`atomicUntil.boundary.test.ts`:** continua verde. O `LalurService` não chama `.postEntry(` (V), então o G3 não muda a
    população. Checagem: a contagem de população no log do teste é igual antes e depois.
22. **`core-boundary.test.ts` e `auditAllowlistCoverage.test.ts`:** continuam verdes e enxergam os movidos. O primeiro lê
    `features/accounting` inteiro (`CORE_DIRS`, V), e o segundo varre `features/accounting` recursivamente (`walkTsFiles`,
    V), então os `eventType` `lalur.*` do `Lalur.model.ts` seguem cobertos. O baseline
    `.dependency-cruiser-known-violations.json` não cita nenhum dos arquivos movidos (V, grep de 24/11), então o `git mv` não
    transforma violação conhecida em nova.
23. **Docs no mesmo PR:** ADR §3.1 (item 17); ADR §5, linha F1: "BRIEF em `BE-INCR-PAIS-NA-BORDA-F1-brief.md`". O `estado` do nó
    fica com o fold.
24. **Gates do PR-B:** os do item 13; `npm run check:arch` (item 19.4); os testes movidos rodando do lugar novo
    (`npx jest src/features/accounting/paises --selectProjects unit`); os testes dos importadores que ficam no lugar
    (`npm run test:changed`, unit e front); as 3 integrações do `lalurController` uma por vez com
    `--runInBand`; `my-app` `tsc` e `test:types`; `node scripts/classe-risco.mjs pr <n>`.

## 5. Contratos esboçados (no ramo recomendado dos forks da §6)

### 5.1 `features/accounting/ports/AccountDeletionGuard.ts`

```ts
import type { Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

/** Why an account cannot be soft-deleted. The ledger turns it into a 409 CONFLICT with this message. */
export interface AccountDeletionBlock {
  message: string;
}

/**
 * Something outside the ledger core that still references a chart-of-accounts account
 * (ADR-PAIS-NA-BORDA R3). Runs INSIDE the deletion transaction (authoritative gate), after the
 * core's own checks (canonical account, postings) and before the soft-delete.
 */
export interface AccountDeletionGuard {
  findBlock(
    scope: AccountingScope,
    account: { id: string; code: string },
    tx: Prisma.TransactionClient,
  ): Promise<AccountDeletionBlock | null>;
}
```

### 5.2 `features/accounting/ports/AccountCreationRule.ts`

```ts
import type { Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';
import type { CreateAccountInput } from '../dtos/PostingDto';

/**
 * A rule a user-defined account must satisfy before it is created (ADR-PAIS-NA-BORDA R3).
 * Throws `ValidationError` (lib/errors) when the account is not acceptable. `tx` is optional:
 * today the ledger calls it before the transaction, as `assertNivelDoPlano` did (F-PBF1-6).
 */
export interface AccountCreationRule {
  assertAcceptable(
    scope: AccountingScope,
    account: Pick<CreateAccountInput, 'code' | 'nature' | 'acceptsEntries'>,
    tx?: Prisma.TransactionClient,
  ): Promise<void>;
}
```

### 5.3 `features/accounting/ports/TaxBookAccountLookup.ts` (F-PBF1-4 a)

```ts
import type { Prisma } from 'generated/prisma';
import type { AccountingScope } from '../scope/AccountingScope';

/** An account kept in a country's tax book, outside the chart of accounts (BR: Parte B of e-Lalur). */
export interface TaxBookAccountRef {
  id: string;
  /** Human label, `<code> — <description>`. */
  label: string;
  deleted: boolean;
}

export interface TaxBookAccountLookup {
  findById(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<TaxBookAccountRef | null>;
}
```

O nome final é o do PR (ADR §2). A coluna `depreciationParteBAccountId` continua no `AccountingScopeSettings` até a F6: a porta
tira o import, não a coluna (ADR §1, ponto iv, que a `P1` não enxerga).

### 5.4 Emenda datada do ADR §3.1 (texto para o sinal do dono, F-PBF1-3)

| Arquivo | Por que é BR | Quem o faz consumir a borda | Sai na fatia |
|---|---|---|---|
| `features/accounting/services/InterestOnEquityService.ts` | JCP (Lei 9.249/1995 art. 9º; ajuste da Parte A no e-Lalur) | F1 (`git mv` do Lalur) | F5 |
| `features/accounting/services/SpedEcfRealGenerationService.ts` | geração da ECF (blocos M/N) | F1 | F5 |
| `features/accounting/models/taxAssessmentCalc.ts` | cálculo do IRPJ/CSLL | F1 | F5 |
| `features/accounting/models/taxAssessmentCalcAnual.ts` | idem, forma anual | F1 | F5 |
| `features/accounting/models/taxAssessmentEcfLinhas.ts` | linhas da ECF por passo | F1 | F5 |
| `features/accounting/models/taxAssessmentMemoExport.ts` | memória do IRPJ/CSLL | F1 | F5 |
| `features/accounting/dtos/TaxAssessmentDto.ts` | contrato do IRPJ/CSLL | F1 | F5 |

Regex (acrescenta ao `LEGADO_BR` do F0, mesma forma):
`services/(InterestOnEquityService|SpedEcfRealGenerationService)|models/taxAssessment(Calc|CalcAnual|EcfLinhas|MemoExport)|dtos/TaxAssessmentDto`.

### 5.5 Regra `P3` (F-PBF1-10 b)

```js
const LEDGER_CORE = '^src/features/accounting/(services/(PostingService|PeriodService|AuditService)|repositories/PostingRepository)\\.ts$';
{
  name: 'P3-ledger-core-not-fiscal',
  severity: 'error',
  comment: 'ADR-PAIS-NA-BORDA F1 (lacuna 0a7b): o núcleo do razão não importa país, legado BR nem lib fiscal. ' +
    'Precisa? Porta em features/accounting/ports/ ligada no lib/factory.ts.',
  from: { path: LEDGER_CORE },
  to: { path: `(${PAIS}|${LEGADO_BR}|${FISCAL_LIB}|${COMPLIANCE_BY_NAME})` },
},
// Padrão de nome da lacuna 0a7b (o grep de 14/11): pega o legado BR que ainda não consome borda e por isso não está no LEGADO_BR.
const COMPLIANCE_BY_NAME =
  '^src/features/[^/]+/(dfe/|.*/[^/]*([Ss]ped|[Ee]cf|[Ee]cd|[Rr]eferential|[Cc]nab|[Nn]fs?e|[Rr]einf|[Ss]imples|[Ll]alur|TaxAssessment|Fiscal)[^/]*\\.ts$)|^src/features/(dp|legalParameters)/';
```

Nasce com 0 violação (a conferir no plantio do item 20). O padrão de nome é heurístico: um legado BR com nome neutro, como o
`InterestOnEquityService`, só fica coberto quando entra no `LEGADO_BR` ou quando a F5 o move para `paises/br/`. O `Fiscal` é
com maiúscula de propósito: `fiscalYear*` (o ano fiscal do razão, PR #1333) não casa.
Por isso a F1 fecha a `0a7b` pelo que o razão importa hoje e pelo que tem nome de compliance; o resto fecha com o `LEGADO_BR`
vazio (fim da convivência, 31/12/2027). Os quatro arquivos existem com esses caminhos (V, `ls` de 24/11).

## 6. FORKS NOVOS — RATIFICAÇÃO PENDENTE

Recomendação = a estrutural (D-2026-11-21-RECOMENDAR-SOLUCAO-ESTRUTURAL). A última coluna diz o que cada um trava.

| Fork | Evidência | Caminhos | Recomendação | Trava |
|---|---|---|---|---|
| **F-PBF1-1** `mesBounds` | conceito universal (janela de um mês, UTC) morando no `Lalur.model.ts:68` (V); 6 consumidores fora dos movidos, todos BR (V) | (a) extrair para o centro, `models/dates.ts`, como `monthBounds` (nome novo em inglês, F-PBA-1 a), no PR-A; (b) extrair com o nome `mesBounds`; (c) deixar no `Lalur.model.ts`, e os consumidores entram no `LEGADO_BR` (5 já estão no §3.1; o `ReceitaFiscalService` é entrada nova) | **(a).** Janela de mês existe em qualquer país (R5); a fatia paga a dívida de nome do que toca; (c) amarra cinco serviços à borda por um utilitário de data | item 10; o tamanho do item 17 |
| **F-PBF1-2** `IFixedAssetReader` e `FixedAssetParteBReader` | leitor do imobilizado para a Parte B; consumidos só pelo `LalurService`, pelo `lalurBlocoF` e pela factory (V) | (a) movem com a F1 para `paises/br/services/`, sem renomear; (b) ficam e entram no `LEGADO_BR` (F5) | **(a).** São o lado BR da leitura do imobilizado, e mover não arrasta cascata. Custo: a F1 move 9 arquivos, não 7 | item 14 |
| **F-PBF1-3** Emenda do `LEGADO_BR` (R7) | as 7 entradas da §5.4 importam `Lalur.model`, `ILalurRepository` ou `LalurService` (V); a R7 exige emenda datada com sinal do dono | (a) emenda com as 7 entradas, saem na F5; (b) mover os 7 junto na F1, com a cascata (o `TaxAssessment*` tem importadores em controller, serviço e teste, não medidos); (c) porta do centro para cada aresta | **(a), como etapa declarada da (b),** que é a F5. A (c) tipa como centro o que é do Brasil (o vazamento ao contrário, ADR F-PBA-5) | item 17; PR-B inteiro |
| **F-PBF1-4** Terceira porta | os dois serviços de configuração são centro e só usam `findParteBById` (V); o ADR §5 nomeia só duas portas, mas o passo (5) manda centro usar porta | (a) porta `TaxBookAccountLookup` (§5.3) com o adaptador `LalurParteBAccountLookup`; (b) tipo estrutural no construtor, sem arquivo de porta (como o `canonicalReferential` de hoje) | **(a).** A (b) esconde a borda num tipo que a `P1` não enxerga, o mesmo defeito que a F1 corrige | itens 4, 7 e 9 |
| **F-PBF1-5** Forma do guarda de exclusão | hoje um ponto, com `AppError` 409 escrito no centro (V) | (a) lista `readonly AccountDeletionGuard[]`, e cada guarda devolve `AccountDeletionBlock \| null`; o centro lança o 409; (b) um guarda só, e ele lança o erro | **(a).** O centro mantém o código HTTP e a forma do erro; a lista não cria motor (composição fixa na factory, ADR-DOMAIN-MOTOR-rejected §3) | itens 2, 5 e 8 |
| **F-PBF1-6** Onde a regra de criação roda | o `assertNivelDoPlano` roda **antes** da tx (V, `:993`); a conta superior pode sumir entre a leitura e o `create` | (a) continua antes da tx, comportamento igual; a porta já aceita `tx?`; a janela vai para a caixa (§8); (b) passa para dentro da tx neste PR | **(a).** O PR-A é inversão sem mudança de comportamento, e a mudança de ponto pede teste de concorrência próprio. A lacuna registrada é a etapa declarada da (b) | item 8 |
| **F-PBF1-7** Constante `NIVEL_MINIMO_ANALITICA_PATRIMONIAL` | definida no `ChartOfAccountsFixture.ts:219`; usada pelo `PostingService`, pelo `jobs/migratePlano4NiveisCli.ts:41` e pelo teste `ChartOfAccountsFixture.plano4niveis.test.ts` (V) | (a) vai para `paises/br/models/ecdPlanoDeContas.ts` (folha pura, `L6`), e o adaptador, o job e o teste importam de lá; `PATRIMONIAL_NATURES` fica no centro (é conceito universal); (b) fica no fixture | **(a).** É número do Manual da ECD; o job está fora de `features/`, e a `P1` não o alcança | itens 6 e 8 |
| **F-PBF1-8** `ecf-l12-linhas.json` | importado só pelo `Lalur.model.ts:1`; o script de geração e o `lalurCatalog.test.ts` fixam o caminho (V) | (a) move para `paises/br/fixtures/`, com o `OUT_PATH` do script e o teste; (b) fica, e só o import relativo muda | **(a).** É catálogo da RFB; ficar deixa dado do país no centro, que é o ponto (iii) do ADR §1 | itens 14 e 16 |
| **F-PBF1-9** F0 atrasado | o F0 é o item 0 do PR-0 do montador único, que ainda não abriu (24/11, V: nenhum PR aberto toca `server/.dependency-cruiser.cjs`, conferido arquivo a arquivo com `gh pr view --json files`); o PR-B precisa da `P1` | (a) o PR-B espera o F0; se o F0 não estiver na `main` em **11/12**, o maestro leva ao lote do dono; (b) o PR-B carrega o item 0 do F0, e o BRIEF do montador perde o seu (emenda dos dois BRIEFs, sinal do dono) | **(a).** O F0 tem dono e `executa`; carregar o item 0 em dois lugares cria conflito de write-set no `.dependency-cruiser.cjs`. O PR-A não espera, então o prazo de 18/12 só depende do PR-B | PR-B |
| **F-PBF1-10** Fechar a `0a7b` | a `0a7b` pede "o núcleo do razão nunca importa de compliance" com guarda mecânica (V). A `P1` só vê `paises/`: o `PostingService` importando `TaxAssessmentService` (legado BR) ou `lib/sped.ts` passaria | (a) a F1 fecha só a `41b5`; a `0a7b` fica aberta até a F5 e a F8 esvaziarem o legado; (b) regra `P3` (§5.5) no PR-B, dentro da exceção do `check:arch` de 13/10 (gate estático): `paises/`, `LEGADO_BR`, `FISCAL_LIB` e o padrão de nome da própria `0a7b` | **(b).** É o `comoProvar` da própria `0a7b`, e o ADR §5 diz que a F1 fecha as duas lacunas. Custo: uma regra e dois plantios. Limite declarado: legado BR de nome neutro fora do `LEGADO_BR` passa até a F5 (§5.5) | item 20 |

## 7. Pendente de validação externa

Nenhuma. A F1 move regra sem mudá-la. A origem legal das duas regras que mudam de lugar fica citada no adaptador:
Manual da ECD, leiaute 9, p. 120 (`REGRA_VALIDA_NIVEL_CONTAS`, I050), e BRIEF 3C item 19 (ajuste vivo da Parte A ⇒ M310/M360).

## 8. Insumos ausentes

- A regex `LEGADO_BR` que o item 0 do F0 vai fixar. O ADR §3 tem só um esboço (`SimplesApuracaoService|TaxSimulationService|dfe/…`).
  O item 17 confere no dia.
- Os importadores do `TaxAssessment*` (pesa no ramo (b) do F-PBF1-3, que não foi recomendado). Não foram medidos.
- `AccountingPolicyVersionService.test.ts` e `SpedEcfRealGenerationService.test.ts`: localizados (L), corpo não lido; o item 9 e o
  item 15 dependem deles.

## 9. Achados fora de escopo (na caixa)

Registrados em 24/11 com `--no PAIS-NA-BORDA --pai L-20261115-013829-41b5`:

| Id | Onde | O quê |
|---|---|---|
| `L-20261124-043444-71c6` | `PostingService.ts:99` | o razão ainda conhece o plano referencial da RFB pelo tipo estrutural `canonicalReferential` (sem import: a `P1` não vê, e a F1 não cobre) |
| `L-20261124-043445-565b` | `ChartOfAccountsFixture.ts` | o plano de contas padrão é instância brasileira no centro, e nenhuma fatia F0–F8 o cita |
| `L-20261124-043447-79a9` | `PostingService.ts:993` | a regra de níveis lê a conta superior fora da tx (a janela que o F-PBF1-6 mantém) |
| `L-20261124-043448-a8c7` | `lib/factory.ts:582` | `createAccountIfAbsent` do kit cria conta sem a regra de níveis da ECD (a conferir) |

Vizinha, já na caixa e fora desta fatia: `L-20261124-043353-c1b9`, o teste de partidas do `deleteAccount` fora da tx. O item 8
põe o guarda depois desse teste, como hoje, e não o move.

## 10. Write-set

**PR-A**
- criar: `server/src/features/accounting/ports/{AccountDeletionGuard,AccountCreationRule,TaxBookAccountLookup}.ts`;
  `server/src/features/accounting/paises/br/adapters/{LalurAccountDeletionGuard,EcdAccountLevelRule,LalurParteBAccountLookup}.ts`
  e `__tests__/`; `server/src/features/accounting/paises/br/models/ecdPlanoDeContas.ts` (F-PBF1-7).
- editar: `server/src/features/accounting/services/{PostingService,AccountingScopeSettingsService,AccountingPolicyVersionService,TaxAssessmentService,SimplesApuracaoService,TaxSimulationService,PisCofinsAssessmentService,IbsCbsAssessmentService,ReceitaFiscalService}.ts`;
  `server/src/features/accounting/models/{Lalur.model,dates}.ts`; `server/src/features/accounting/fixtures/ChartOfAccountsFixture.ts`;
  `server/src/jobs/migratePlano4NiveisCli.ts`; os testes de `services/__tests__/` (`PostingService`, `PostingServiceValidateOnly.characterization`,
  `ProvenanceAttachIdempotency.integration`, `AccountingPolicyVersionService`) e de `fixtures/__tests__/ChartOfAccountsFixture.plano4niveis`.

**PR-B**
- mover: os 9 arquivos e o JSON da tabela do item 14, mais os 5 testes deles → `server/src/features/accounting/paises/br/**`.
- editar: os importadores da §3; `server/src/controllers/lalurController.ts`; `server/.dependency-cruiser.cjs`;
  `server/src/features/accounting/dtos/__tests__/__dto-shapes__.json`; `my-app/types/contracts/accounting/LalurDto.gen.ts` →
  `my-app/types/contracts/accounting/paises/br/LalurDto.gen.ts`; `my-app/lib/services/lalur.service.ts`;
  `scripts/ecf-tabelas-dinamicas-to-catalog.mjs`; `server/src/lib/__tests__/ecfReal.test.ts` e os testes de `models/__tests__/taxAssessment*`;
  `docs/adr/ADR-PAIS-NA-BORDA.md`.

**Choke points (PAR-001):** `server/src/lib/factory.ts` (PR-A e PR-B); `server/.dependency-cruiser.cjs` (PR-B, o mesmo arquivo do
item 0 do F0: o PR-B entra depois dele); `__dto-shapes__.json` (PR-B). Sem `schema.prisma`, sem `docs.paths.ts`, sem rota nova,
sem `eventType` novo.
