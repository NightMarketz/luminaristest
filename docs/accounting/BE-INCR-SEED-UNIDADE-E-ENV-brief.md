# BE-INCR-SEED-UNIDADE-E-ENV — achados do teste de ponta a ponta de 28/09

## 0. Cabeçalho

- **Nó do vault:** `docs/plano/nos/SEED-UNITS.md` (onda 2 da ordem em `docs/plano/decisoes/D-2026-09-28-CRC-CFC-SEED-UNIDADE-E-ORDEM.md`).

- **Item a planejar:** os achados fora de escopo do teste de ponta a ponta (build de produção, banco
  local do worktree `busy-curran-1c0f23`, 28/09/2026) que **não** estão com outra sessão:
  (S1) tenants do seed contábil sem unidade selecionável na tela; (S2) `npm run db:seed` não lê o
  `server/.env`; (S3) BOM no `server/.env.example`.
- **Fora deste BRIEF (já em execução, sessões abertas pelo dono em 28/09):** seletor de unidade que
  escolhe `productUnits` (`useAccountingData.ts:45-47`) e mensagens de 400 do Zod escondidas pelo
  `resolveError`. Não planejar aqui — colidiria com elas.
- **Autorização:** dono, chat 28/09/2026 — *"Prepare planos para os achados fora do escopo"*. Autoriza o
  plano; **não** autoriza código. Forks PENDENTES.
- **Sessão executora depois da ratificação:** S1 e S2 são lacunas → `sessao-instrumentacao` →
  `sessao-correcao` (entram no GAP-MAP com a ratificação).

## 1. Fatos (grau: verificado = executado nesta sessão · lido = leitura de código/doc)

| # | Fato | Evidência | Grau |
|---|---|---|---|
| E1 | Depois de `db:seed:accounting --years 2025,2026` + ativação dos bindings, o tenant `seed-real` tem **0** tabelas dinâmicas; `seed-presumido` só ganhou as 27 depois de eu rodar o onboarding pela tela | `select userId,count(*) from dynamic_tables group by userId` no banco local → só `seed-presumido` (27) | verificado |
| E2 | O razão dos seeds está sob `unitId` **literal** `seed-unit-presumido` / `seed-unit-real` (357 lançamentos e 24 períodos cada); nenhuma linha de `units` tem esse id | mesma consulta em `journal_entries`/`accounting_periods` | verificado |
| E3 | A tela de Contabilidade só oferece unidades que são **linhas da tabela dinâmica `units`** (`value` = id da linha) | `useAccountingData.ts:39-66` | lido |
| E4 | Consequência: logado como `seed-presumido`, a tela mostrou "Nenhuma unidade" e **nenhuma aba abre dados do seed**. O onboarding cria uma unidade nova (id cuid, ex. `cmulojh3a…`) **sem** o razão do seed. O passo do runbook H1 "Contabilidade → aba Compliance; escolha a unidade no seletor" (`RUNBOOK-H1-PVA.md:151`) não é executável nos tenants que o próprio runbook manda usar (`:98-106`); o mesmo vale para o H2 (`RUNBOOK-H2-BROWSER-SIGNOFF.md:28`) | teste de browser 28/09 | verificado |
| E5 | O caminho normal de escrita de `units` (`DynamicTableService.createTableData`, `:546`) **gera o id** — não aceita id fixo; o repositório (`DynamicTableRepository.createData`, `:91-99`) também não | leitura | lido |
| E6 | O onboarding cria `units` + 1ª linha pelo caminho normal para os plugins de `units` rodarem (pipeline de CRM, estoque por unidade) — `dashboardController.ts:113-128` | leitura | lido |
| E7 | `npm run db:seed` (`ts-node prisma/seed.ts`) **não carrega o `server/.env`**: com `SEED_ADMIN_*` exportados e `DATABASE_URL` só no `.env`, falhou com *"Environment variable not found: DATABASE_URL"*; passou só com `DATABASE_URL` exportado. `seed.ts` não importa `src/config/env` nem `dotenv` | execução 28/09 + `grep` | verificado |
| E8 | O README (Quick Start, `README.md:14-20`) manda `cp .env.example .env` → … → `npm run db:seed` — o caminho documentado cai no E7 | leitura | lido |
| E9 | `server/.env.example` começa com BOM UTF-8 (`ef bb bf`) desde o 1º commit (`132847b8`, 11/06). `dotenv` 16.6.1 remove o BOM (`parse` devolve `DATABASE_URL`), o `prisma migrate deploy` passou, e o loader do app casa `^\s*` (o `\s` do JS inclui U+FEFF). **Mas `set -a; . .env` no bash apaga em silêncio a 1ª linha** — justamente `DATABASE_URL` (`line 1: <BOM>DATABASE_URL=…: No such file or directory`; a variável fica vazia) | `od` + execução (dotenv, bash) 28/09 | verificado |
| E10 | `src/config/env.ts:16` carrega o `.env` com `override: NODE_ENV !== 'test'` — fora de teste o `.env` **vence** o ambiente. Reusar esse loader no seed faria um `DATABASE_URL` exportado (ensaio sobre cópia) ser trocado em silêncio pelo do `.env`, e o seed faz upsert da senha do admin no banco errado. Já mordeu o `activate-salon-binding --db` (memória `env-override-defeats-db-flag`, 12/09). `require('dotenv').config()` **sem** override manteve o valor exportado | leitura + execução 28/09 | verificado |
| E11 | O `dev.db` real tem o mesmo problema: a única linha real de `units` tem 7 lançamentos; os 714 dos tenants do seed estão sob `seed-unit-presumido`/`seed-unit-real`, que não são linha de `units` | consulta read-only ao `server/prisma/prisma/dev.db` 28/09 | verificado |
| E12 | **Já previsto no plano:** o ADR-INCR-UNIT-REKEY (#392, `529c7463`, 28/09, 12 forks PENDENTES) tem o F-RK-2 (tenants do seed: recomenda excluí-los do re-key; "o seed passa a nascer com `units` em frente própria, antes de I6") e o §9 ("Seed CLI sem `units` … com I6 ativo, `seed-unit-*` recebem 400"). A razão do ADR para não mexer agora — "re-chavear no meio do H1 invalida o texto dos runbooks" — esbarra no E4: esse texto já não é executável | `docs/adr/ADR-INCR-UNIT-REKEY-migration.md:354-360, 430-431` | lido |
| E13 | A montagem do sistema no onboarding (mescla de preset + módulos, `installPresetAsSystem`, 1ª unidade com compensação, perfil fiscal) mora **no controller** (`dashboardController.ts:355-400`, `handleQuickCreation`); não há serviço reutilizável por um CLI | leitura | lido |
| E14 | H2 passos 6–11 são vendas **na tela do salão** (serviço, pacote, produto) conferidas no razão, nos mesmos tenants do seed (`RUNBOOK-H2:28, 103-120`). Venda com produto depende das linhas de estoque por unidade que o `UnitAutoStockPlugin` só cria quando a unidade nasce pelo `createTableData`; o `LeadsSeedOnUnitPlugin` cria o funil de CRM da unidade | leitura dos plugins + runbook | lido |
| E15 | `features/dynamicTables/__tests__/no-accounting-imports.boundary.test.ts` reprova **qualquer** arquivo sob `features/dynamicTables` que importe `features/accounting` — um serviço que chama o `CompanyFiscalProfileService` não pode morar lá | leitura do teste | lido |
| E16 | Já existem os donos canônicos das tabelas da purga: `features/chat/repositories/ActionProposalRepository.ts` e `KnowledgeGraphRepository.ts`, registrados na factory (`repositories.actionProposal/knowledgeGraph`) — mas **sem** método de apagar por usuário (têm `delete(id)`, `deleteOldProposals`, `upsert`). A purga hoje usa `prisma.*` direto no controller e serve **dois** chamadores: a compensação do onboarding e o "Resetar sistema" (`DELETE /dashboard/system`, `deleteUserSystem`) | `grep` + leitura | lido |
| E17 | O nó I7 (reset consistente, F-I7-1 PENDENTE, recomendação: **recusar** o reset com 409 quando houver contabilidade) vai separar as duas intenções da purga — a compensação nunca tem contabilidade; o reset pode ter | `ONBOARDING-WIZARD-plano-grafo-brief.md` §I7 | lido |
| E18 | Os 3 caminhos de onboarding do FE passam pelo mesmo `POST /dashboard/create`: Rápido e Controle Total (`setup.service.ts:83-86`) e a entrevista com IA (`useAiInterview.ts:104`, modo rápido). O Controle Total devolve `...result` do `installPresetAsSystem` na resposta; o Rápido não. A montagem do preset do Controle Total (remoções, campos extras, relações quebradas) só tem esse chamador | `grep` + leitura `dashboardController.ts:200-335` | lido |
| E19 | Criar unidade fora do HTTP é seguro: a sincronização contábil só é chamada pelas pontes de **venda** (`Sale*Bridge` → `getAccountingSyncService().sync`), e os plugins de `units` só escrevem em tabelas dinâmicas (funil de CRM; estoque por unidade quando há produtos) — não exigem binding ativo nem boot | `grep` + leitura dos plugins | lido |
| E20 | Bindings: unicidade por `(userId, unitId, sectorKey, bindingVersion)`; `Superseded` só ao recompilar a **mesma** unidade (`BindingCompileService.ts:157`); **não existe CLI de desativação**. A chave do registro de mappers é `${unitId}:${sourceType}` (`AccountingSyncService.ts:81`) — bindings antigos (`seed-unit-*`) e novos do mesmo dono **não colidem** | `schema.prisma:1282-1298` + leitura | lido |
| E21 | A consistência unidade × empresa (`FiscalProfileService.ts:157`) compara só o regime (`regimeUnidadeEsperado`: PRESUMIDO→PRESUMIDO, REAL→REAL) — o `FiscalProfile` que o seed grava continua válido com o perfil da empresa criado antes. O prefill do SPED só completa chaves que o corpo não trouxe (o corpo vence, `spedPerfilPrefill.ts:6-9`); a trava de regime vale só no ano do perfil (`recusaDeRegime`, `:119-137`) | leitura | lido |
| E22 | O ADR-INCR-UNIT-REKEY define `EXCLUDED_TENANT` como "dono **sem** `dynamic_tables.internalName = 'units'`" (item 6, `:216-217`). Re-semear sobre os **mesmos** usuários (o `ensureUser` reaproveita) dá `units` a esses donos → o `--plan` do I1b passaria a classificar `seed-unit-*` como `LEGACY` (candidato a re-key), não mais excluído. **Este BRIEF muda uma premissa do F-RK-2** | leitura do ADR + `seedAccountingFixtureCli.ts:225-231` | lido |
| E23 | Custo medido: instalar o salão + criar a unidade + plugins leva **75–333 ms** por criação (suíte `dashboardCreate.firstUnit`, 5 testes); o teste do seed hoje leva 16,5 s para os 2 tenants → o salão inteiro acrescenta < 1 s | execução 28/09 (`--verbose`) | verificado |
| E24 | A ratificação F-I1-1 → (b) ("no controller, após a instalação, via `createTableData`, dois passos + compensação") pesou (a) *dentro da tx do `installPresetAsSystem`* × (b) *depois da instalação, pelo caminho normal de escrita*; o motivo foi o anti-padrão do Contrato §2.1 (plugins dentro da tx do schema). O F-S1 → (a1) de 28/09 muda só o **local** (controller → serviço de integração, nível que o Contrato §2.1 equipara ao controller); todas as propriedades ratificadas continuam | `ONBOARDING-WIZARD-plano-grafo-brief.md:136-141` | lido |
| E25 | O modelo de feature exige autorização por **policy** nos métodos públicos (`FEATURE_TEMPLATE.md` §3), e a guarda one-shot (403 "Setup já foi concluído") está inline no controller. O teste só assere o status 403 e "sem 2ª unidade"; o FE trata qualquer 403 igual (`setup.tsx:36`) | leitura | lido |

## 2. Checklist (detalhado após F-S1 → a1 e F-P1..F-P7 decididos)

Leitura que fundamenta o detalhamento (lido 28/09): `dashboardController.ts:47-100` (entrada, guarda
one-shot 403), `:113-148` (`createFirstUnitOrRollback`), `:150-188` (`createCompanyFiscalProfileOrRollback`),
`:190-…` (`handleCustomCreation`), `:338-420` (`handleQuickCreation`), `:106-110` (`purgeUserSystem`, com
`prisma.*` direto no controller); `seedAccountingFixtureCli.ts:86-130, 225-275, 365-370, 393-415`;
testes `dashboardCreate.firstUnit/fiscal/dashboardModules.integration.test.ts` e
`seedAccountingFixtureCli.integration.test.ts` (injeção de falha por `jest.spyOn(<Service>.prototype, …)`
— continua valendo com a lógica movida para um serviço).

### Parte A — serviço de provisionamento (refatoração SEM mudança de comportamento HTTP)

1. **Feature nova `server/src/features/onboarding/`** (F-P1 → a): `services/SystemProvisioningService.ts`,
   `policies/ISystemProvisioningPolicy.ts` + `SystemProvisioningPolicy.ts`, `README.md` (formato do
   `FEATURE_TEMPLATE.md` §8). Precedente de feature só com serviço: `reports`, `sales`. Nada em
   `features/dynamicTables` é criado ou editado (E15; AC-2.1-B4).
2. **`provision(ctx, { preset, unit, fiscal })`** (F-P2 → a, serve Rápido e Controle Total): em ordem,
   (i) `policy.canProvision(ctx, tabelasExistentes)` — a guarda one-shot vira policy (F-P7 → a);
   (ii) `installPresetAsSystem`; (iii) 1ª linha de `units` pelo `createTableData` (plugins pelo caminho
   normal — propriedade ratificada do F-I1-1); (iv) perfil fiscal da empresa do ano corrente quando
   `fiscal.regime ∉ {NAO_SEI, ausente}`; devolve `{ installResult, unitId, fiscal }` (`installResult`
   porque o Controle Total o espalha na resposta — E18). Falha em (iii) ou (iv) ⇒ purga e lança
   `OnboardingRolledBackError` (ou `OnboardingRollbackFailedError` se a purga falhar). O serviço não
   escreve `res`.
3. **`buildQuickPreset(suiteKey, modules, selectOverrides)`** — função pura extraída de
   `handleQuickCreation` (suíte → módulos → mescla Core + módulos + suíte → overrides → validação de
   analytics). A montagem do Controle Total **fica no controller** (E18: um só chamador; extrair sem
   segundo chamador é especulação).
4. **Purga pelos donos canônicos das tabelas** (F-P3 → c): `deleteByUserId(userId)` em
   `IActionProposalRepository`/`ActionProposalRepository` e `IKnowledgeGraphRepository`/`KnowledgeGraphRepository`
   (`features/chat`, E16) + `DynamicTableService.deleteAllTablesForUser` (já existe). O serviço expõe
   `purgeUserSystem(userId)`; o `deleteUserSystem` (reset) passa a chamá-lo — comportamento idêntico ao de
   hoje. **Nó vizinho I7** (E17) separa depois a política do reset; esta mudança não a antecipa.
5. **Controller:** `createDashboard` monta o preset (Rápido via `buildQuickPreset`, Controle Total como
   hoje) e chama `provision`; mapeia os erros para **exatamente** os status/corpos atuais — 404 suíte,
   400 analytics/relação/config vazia, **403 com o mesmo corpo** (`{ success:false, error:'Forbidden',
   message:'Setup já foi concluído. Este usuário já possui tabelas.' }`), 500 `ONBOARDING_ROLLED_BACK` /
   `ONBOARDING_ROLLBACK_FAILED` com as mesmas mensagens, 201 com os mesmos campos. **Aceite:** as suítes
   `dashboardCreate.firstUnit`, `dashboardCreate.fiscal` e `dashboardModules` passam **sem nenhuma
   edição** (a injeção de falha por `jest.spyOn(<Service>.prototype, …)` continua valendo).
6. **Factory:** `getSystemProvisioningService()`; dependências por interface (DynamicTableService,
   CompanyFiscalProfileService, os 2 repositórios, a policy).
7. **Testes do serviço** (unit, fakes das interfaces): ordem (i)→(iv); `canProvision` falso ⇒
   `ForbiddenError` e **nada** instalado; compensação em falha de (iii) e (iv); `NAO_SEI` → `pendente`;
   purga que falha → `OnboardingRollbackFailedError`. Testes dos 2 `deleteByUserId` (só apagam o dono
   pedido).
8. **Emenda documental do F-I1-1** (E24): nota datada no `BE-INCR-ONBOARDING-FIRST-UNIT-brief.md` —
   "local controller → `SystemProvisioningService` por F-S1 (a1) 28/09; propriedades ratificadas
   intactas (após a instalação, via `createTableData`, dois passos + compensação, fora da tx do schema)".

### Parte B — seed contábil usa o serviço

9. **Unidade do tenant pelo serviço.** Em `seedTenant`, antes de qualquer lançamento: se o usuário do
   tenant tem **0** tabelas dinâmicas → `provision(ctx, { preset: buildQuickPreset('beautySalon', [], undefined).preset,
   unit: { name: <nome da unidade> }, fiscal: { regime: t.regime } })` (F-P4 → a; E21: o `FiscalProfile` da
   unidade que o seed grava depois continua consistente) e usa o `unitId` devolvido em TODO o resto
   (chart, períodos, lançamentos, AP/AR, `FiscalProfile`, relatório). Suíte do salão inteiro = F-S1b (b).
10. **Idempotência (item 2 do BRIEF SEED-MY preservado):** se o usuário **já tem** tabelas → acha a linha
   de `units` cujo `data.name` = nome da unidade e reusa o id; se não achar → **recusa** com mensagem
   nomeada (não instala uma 2ª vez — mesmo espírito da guarda one-shot).
11. **Nome da unidade:** `--unit-id` passa a significar o **nome** (`seed-unit` → `seed-unit-presumido` /
   `seed-unit-real`); o id real sai no relatório e no "próximo passo" do `activate-salon-binding`
   (formato da linha inalterado).
12. **`UserContext` do tenant** montado a partir da linha `User` (role `USER`) — os plugins de `units` e o
    serviço de perfil fiscal rodam com ele.
13. **Testes do seed (ERRATA nas 5 asserções que citam `seed-unit-*` literal):** depois do seed, cada
    tenant tem `units` com **1** linha cujo `id` = `report.unitId` = `unitId` dos lançamentos; o funil
    padrão de CRM existe (prova de que o plugin rodou); a 2ª execução não cria 2ª unidade nem tabelas; o
    teste "boot real … sem colisão de unidade" continua verde.

### Parte C — ambiente

14. **`prisma/seed.ts` lê o `.env`** com `import 'dotenv/config'` na 1ª linha (F-S2 → a). Teste de
    integração por processo filho, com `cwd` temporário contendo um `.env` e banco temporário: (i) sem
    `DATABASE_URL` no ambiente, o seed usa o do `.env` e imprime `Admin user created/updated`; (ii) com
    `DATABASE_URL` exportado para outro banco, **o exportado vence** (a linha vai para ele, não para o do
    `.env`). Nunca aponta para o `dev.db`.
15. **BOM:** remover os 3 bytes do `server/.env.example` (F-S3 → a) + asserção barata num teste existente
    de config/ambiente: o arquivo não começa com `EF BB BF`.

### Parte D — docs (preparação; sem evidência/desfecho/assinatura)

16. `RUNBOOK-H1-PVA.md:98-106, 151` e `RUNBOOK-H2-BROWSER-SIGNOFF.md:28`: o id literal vira "o `unitId`
    impresso pelo seed; na tela, escolha a unidade `seed-unit-presumido`"; o P0 ganha o passo de
    re-semear (F-S1c → a) depois do backup.
17. `SEED-MULTI-EXERCICIO-brief.md:108`: nota ERRATA datada (o `--unit-id` virou nome).
18. `ADR-INCR-UNIT-REKEY-migration.md`: **nota datada de FATO NOVO, sem ratificar nada** (F-P6 → b) no
    F-RK-2 e no item 6 — "depois do BE-INCR-SEED-UNIDADE-E-ENV + re-semeadura, os donos `seed-*` TÊM
    `units`; `seed-unit-presumido`/`seed-unit-real` deixam de cair em `EXCLUDED_TENANT` pelo critério do
    item 6 e o `--plan` os marca `LEGACY`. Se o dono ratificar o F-RK-2 (a), a exclusão precisa ser por
    lista explícita desses 2 `unitId` (ou pelo e-mail `@seed.local`), não por ausência de `units`" (E22).
### Parte E — operação humana (não é código; o agente prepara, o dono executa)

19. Re-semear o `dev.db` real: `npm run db:backup` → `db:seed:accounting … --i-have-a-backup` →
    `activate-salon-binding.mjs` com o **novo** `unitId` de cada tenant (o seed imprime). Os lançamentos e os
    bindings antigos sob `seed-unit-*` **ficam** (F-P5 → a; E20: não colidem, nada manda evento para eles;
    apagar trilha contábil é proibido).

**Gates:** `tsc` (server e my-app), suíte unit, integrações do onboarding e do seed **uma a uma**
(Windows: EBUSY em lote), openapi inalterado (nenhuma rota nova), snapshot de DTO inalterado,
allowlist de auditoria inalterada (o perfil fiscal já emite o mesmo evento de hoje).

## 3. Contratos (esboço)

```ts
// server/src/lib/errors.ts (padrão dos erros com errorCode, ex. NoActiveAccountingBindingsError)
export class OnboardingRolledBackError extends AppError { errorCode = 'ONBOARDING_ROLLED_BACK'; statusCode = 500 }
export class OnboardingRollbackFailedError extends AppError { errorCode = 'ONBOARDING_ROLLBACK_FAILED'; statusCode = 500 }

// server/src/features/onboarding/policies/ISystemProvisioningPolicy.ts
export interface ISystemProvisioningPolicy {
  /** Setup é one-shot: só quem ainda não tem tabela dinâmica nenhuma (a guarda 403 de hoje). */
  canProvision(ctx: UserContext, existingTableCount: number): boolean;
}

// server/src/features/onboarding/services/SystemProvisioningService.ts
export interface ProvisionInput {
  preset: { tables: Record<string, PresetTableDefinition> };   // já montado (Rápido ou Controle Total)
  unit: UnitInput;                                             // UnitInputSchema (.strict), reuso
  fiscal?: OnboardingFiscalInput;                              // OnboardingFiscalSchema, reuso
}
export interface ProvisionResult {
  installResult: Awaited<ReturnType<DynamicTableService['installPresetAsSystem']>>; // o Controle Total espalha na resposta
  unitId: string;                                              // id da linha de `units`
  fiscal: { status: 'criado' | 'pendente'; ano: number; obrigacoes?: ObrigacaoResolvida[] };
}
export interface ISystemProvisioningService {
  provision(ctx: UserContext, input: ProvisionInput): Promise<ProvisionResult>;  // ForbiddenError | OnboardingRolledBackError | OnboardingRollbackFailedError
  purgeUserSystem(userId: string): Promise<void>;                                // compensação + reset (I7 separa depois)
}
export function buildQuickPreset(
  suiteKey: string, modules: ModuleSelector[], selectOverrides?: Record<string, Record<string, string[]>>,
): { preset: ProvisionInput['preset']; installedModules: string[] };   // NotFoundError | ValidationError

// features/chat (donos canônicos — F-P3 → c)
interface IActionProposalRepository { deleteByUserId(userId: string): Promise<void> }  // + existentes
interface IKnowledgeGraphRepository  { deleteByUserId(userId: string): Promise<void> }  // + existentes

// seedAccountingFixtureCli.ts, por tenant, ANTES dos lançamentos:
//   0 tabelas → const { unitId } = await provisioning.provision(ctxDoTenant,
//                 { preset: buildQuickPreset('beautySalon', []).preset, unit: { name: nomeDaUnidade }, fiscal: { regime: t.regime } });
//   já tem tabelas → unitId = linha de `units` com data.name === nomeDaUnidade, senão recusa nomeada.

// prisma/seed.ts, 1ª linha (sem override: o ambiente exportado vence o .env — E10):
import 'dotenv/config';
```

## 4. Forks — todos decididos em 28/09 (F-S* pelo dono; F-P* por delegação do dono)

> **[RATIFICAÇÃO 2026-09-28 — dono, questionário]** F-S1b → **(b)** salão inteiro · F-S1c → **(a)**
> re-semear (implica o F-RK-2 (a) do ADR-INCR-UNIT-REKEY — registrar lá no fold) · F-S2 → **(a)** ·
> F-S3 → **(a)**. **F-S1 → (a1)** (dono, chat 28/09: *"Pode seguir planejando de acordo com a
> recomendação a"*, depois da resposta do agente sobre o ideal). Forks novos do detalhamento: §4.1.
>
> **[DECISÃO 2026-09-28 — por DELEGAÇÃO EXPLÍCITA do dono]** Chat 28/09: *"Pesquise e decida as
> pendentes, mas pesquise a fundo as consequencias e o melhor a se fazer aqui"*. F-P1..F-P7 (§4.1)
> decididos pelo agente depois da pesquisa E15–E25. **Registro de viés (T8):** as decisões pendem para a
> pureza do contrato (policy, repositório, serviço) — aumentam o diff; o dono prefere completude a MVP
> (memória `dono-quer-completude-nao-mvp`), mas o viés existe. Nada disto ratifica fork de OUTRO
> documento (ver F-P6).

| Ref | Pergunta | (a) | (b) | (c) | Recomendação |
|---|---|---|---|---|---|
| **F-S1** | Como dar unidade selecionável ao tenant do seed | (a1) Extrair a criação de sistema do controller para um serviço (E13); o seed chama esse serviço; `unitId` = id gerado | (a2) O seed chama `installPresetAsSystem` + `createTableData` direto, sem extrair (repete a mescla de preset do controller) | (b) O seed grava a linha de `units` direto no Prisma com id **fixo** `seed-unit-presumido` | **(a1)**. É a prática recomendada para dado com regra de negócio (seed pelo serviço, não INSERT direto, para os efeitos em cascata acontecerem) e é o que o E14 exige: sem os plugins, o H2 fica sem estoque por unidade e sem funil. (a2) cria um 2º dono da mesma mescla de preset (o critério de reuso da casa proíbe). (b) passaria no I6 futuro, mas gera um tenant de seed diferente do real justamente no que H1/H2 querem provar. Custo de (a1): mexer no onboarding (os testes de integração do HTTP cobrem) e trocar o literal `seed-unit-*` nos 2 runbooks, 1 teste e no BRIEF do SEED-MY por "o id impresso pelo seed" |
| **F-S1b** | Preset instalado no tenant do seed | Só `units` (Core) | O preset do salão inteiro, como o onboarding | — | **(b)**: o E14 mostra que o H2 (passos 6–11) roda nas telas do salão sobre esses tenants; só com `units`, o H2 continua inexecutável. Custo: seed mais lento (27 tabelas por tenant, não medido) |
| **F-S1c** | O que fazer com os tenants do seed que **já existem** no `dev.db` real (E11) | Re-semear depois do backup (o `dev.db` é seed de testes — decisão do dono 12/09) | Re-chavear pelo CLI do I1b (F-RK-2 → b) | Deixar como estão | **(a)**, alinhado ao F-RK-2 (a) do ADR: re-key de tenant de seed é trabalho que o seed novo já resolve. **Decidir junto com o F-RK-2** para os dois não divergirem |
| **F-S2** | Como o seed lê o `.env` | `import 'dotenv/config'` no `seed.ts` (sem override; `dotenv` já é dependência) | Importar o loader do app `src/config/env` | Só documentar o `export` no README | **(a)** — **recomendação mudou** após a pesquisa: (b) herda o `override: true` do app (E10) e faria o seed gravar no banco do `.env` mesmo com outro `DATABASE_URL` exportado. O padrão do `dotenv` (sem override) é o recomendado para scripts: o ambiente explícito vence o arquivo |
| **F-S3** | BOM no `.env.example` | Remover (3 bytes) | Deixar | — | **(a)** — **recomendação mudou**: o dano existe (E9) para quem carrega o `.env` pelo shell, que perde o `DATABASE_URL` em silêncio; custo zero |

### 4.1 Forks do detalhamento — DECIDIDOS 2026-09-28 por delegação explícita do dono (ver cabeçalho do §4)

| Ref | Pergunta | Caminhos considerados | Decisão | Por quê (evidência) · consequência aceita |
|---|---|---|---|---|
| **F-P1** | Onde mora o serviço | (a) feature nova `features/onboarding/` · (b) `features/dynamicTables/services/` · (c) `features/interview/` | **(a)** | (b) **quebraria** o `no-accounting-imports.boundary.test.ts` (E15) — o serviço chama o perfil fiscal da empresa. (c) prende a regra a 1 dos 3 caminhos (E18). Precedente de feature só com serviço: `reports`, `sales`. Nó vizinho futuro que cai aqui: I2 (marco T0 `onboardingCompletedAt`, "na mesma tx do `installPresetAsSystem`"). · Consequência: 1 pasta nova com README |
| **F-P2** | Escopo da extração | (a) `provision` serve Rápido e Controle Total · (b) só o Rápido | **(a)**, com a montagem do preset do Controle Total ficando no controller | A cauda (instalar → unidade → perfil → compensação) é idêntica nos dois modos; extrair só um deixaria 2 donos da mesma compensação. A montagem do Controle Total só tem 1 chamador (E18) — extraí-la seria especulação. `provision` devolve `installResult` porque o Controle Total o espalha na resposta · Consequência: o controller fica com a validação de config do Controle Total |
| **F-P3** | A purga usa `prisma.*` no controller | (a) repositório novo `ISystemPurgeRepository` · (b) callback · **(c) `deleteByUserId` nos repositórios que já são donos dessas tabelas** | **(c)** — caminho novo, achado na pesquisa | (a) criaria um 2º escritor das mesmas tabelas que o `features/chat` já possui (critério de reuso: mesmo objeto de domínio, vivo dos dois lados — E16). (b) mantém `prisma` fora de repositório. O reset (`deleteUserSystem`) passa a usar o mesmo método **sem mudar comportamento**; o I7 (E17) separa a política depois · Consequência: 2 métodos novos em repositórios do `chat` |
| **F-P4** | O seed passa o regime | (a) sim — nasce o perfil da empresa do ano corrente · (b) não | **(a)** | Espelha o cliente real; a consistência unidade × empresa continua passando; o prefill nunca sobrescreve o que o dono digita; a trava de regime vale só em 2026 e com o par certo (E21). O H1 roda sobre 2025 (sem perfil — igual a hoje) · Consequência aceita: gerar ECF de **2026** na rota errada passa a dar `REGIME_DIVERGENTE` (é o comportamento correto) |
| **F-P5** | Dado antigo do seed no `dev.db` real | (a) fica, órfão e documentado · (b) desativar os bindings antigos | **(a)** | Não colidem (chave de mapper por unidade, E20); nada manda evento para essas unidades; **não existe** CLI de desativação — (b) seria frente nova; apagar lançamento é proibido · Consequência: 2 bindings `Active` a mais carregados no boot, sem efeito |
| **F-P6** | O F-S1c do dono ratifica o F-RK-2 (a) do ADR do re-key? | (a) sim · (b) não — nota de fato novo no ADR | **(b)** | E22: este BRIEF **muda a premissa** do F-RK-2 (os donos passam a ter `units`) e o critério do `EXCLUDED_TENANT`. Ratificar com a premissa velha seria ratificar outra coisa. A delegação do dono é para os forks DESTE documento · Consequência: F-RK-2 segue PENDENTE, agora com o fato novo escrito no ADR (item 18) |
| **F-P7** (novo) | Onde fica a guarda one-shot (403) | (a) policy do serviço (`canProvision`), controller mantém o corpo de hoje · (b) segue inline no controller | **(a)** | O modelo de feature exige policy (E25); o seed é um 2º chamador e o I2/wizard serão outros — a regra "setup só uma vez" passa a valer para todos. HTTP inalterado (status e corpo) · Limite conhecido e NÃO tratado: a janela de corrida de dois creates simultâneos (já declarada no BRIEF do I1) |

## 5. Pendente de validação externa

- Nenhum item depende de regra contábil/fiscal. F-S1b depende do escopo do H2 (decisão do dono, não de
  oráculo externo).

## 6. Insumos ausentes

- ~~Tempo do seed com o salão inteiro~~ — medido (E23): < 1 s a mais.
- ~~CLI de desativação de binding~~ — não existe (E20).

- Não medi se o `seedAccountingFixtureCli` roda em tx única nem quanto tempo a instalação do preset
  acrescenta ao seed.

## 7. Achados fora de escopo

- O `.env` gerado por `cp .env.example .env` deixa `SEED_ADMIN_PASSWORD`/`SEED_ACCOUNTING_PASSWORD`
  para o usuário preencher — correto (credencial não se commita); só registrar no README junto do F-S2.
- O banco local do worktree `busy-curran-1c0f23` ficou com a tabela `productUnits` renomeada para
  "Estoque por Local" (contorno do teste) — não é artefato versionado; descartar com o worktree.

## Fontes (pesquisa 28/09)

- Seed pelo serviço × INSERT direto — https://www.sqlserverscience.com/tools/database-seeding-when-to-hit-the-table-vs-when-to-hit-the-api/ ; https://seedfa.st/blog/database-seeding
- `dotenv` e `override` — https://github.com/motdotla/dotenv ; https://dotenvx.com/docs/dotenv
