# BE-INCR-CONTA-CANONICA-PAPEL — BRIEF do grupo `PostingService.ts` da caixa de lacunas

**Tipo:** BRIEF de grupo de lacunas da caixa (não é BRIEF de nó do plano). **Data:** 24/11/2026. **Sessão:** planejamento,
worktree `angry-nightingale-b777d6`.

## Contexto fixo

- **Item a planejar:** o grupo de lacunas da caixa ligado pelo arquivo `server/src/features/accounting/services/PostingService.ts`:
  - `L-20261121-040921-13dd` (defeito): escopo legado com conta do usuário num código canônico nunca recebe a conta canônica, e a
    regra da DRE por prefixo `4.7` puxa a conta alheia ("Perda na Baixa de Imobilizado C7") para o custo.
  - `L-20261121-034041-ad40` (defeito): `ensureChartOfAccounts` pula o código canônico já ocupado por outra conta.
  - `L-20261121-040919-4e1f` (defeito): `deleteAccount` trata como canônica toda conta cujo código está em `CANONICAL_ACCOUNTS`.
  - `L-20261114-223006-1fd7` (débito): a derivação do ano fiscal tem duas cópias privadas (`PostingService.fiscalYearFrom` e
    `EntryApprovalService.fiscalYearFrom`).
- **Autorização:**
  - Planejar o grupo: `docs/plano/decisoes/D-2026-11-11-LACUNA-VAI-AO-MAESTRO.md`, emenda de 21/11 (2), item 6 ("Grupo vai a
    planejamento macro").
  - Executar sem ratificação se não houver fork: a mesma emenda, item 6, resposta do dono no chat em 21/11 à pergunta "BRIEF de
    grupo sem fork pode executar sem a sua ratificação?": **"Sim, executa"**. "Sem fork" é binário: a seção de forks abaixo está
    vazia e nenhuma lacuna do grupo está `com-dono` (as quatro estavam `aberta` e passaram a `em-sessao` nesta sessão).
  - Direção do conteúdo: `D-2026-11-21-FORKS-DA-CAIXA` (no PR #1331, commit `406020a9e`, ainda fora da `main`), linha de 13dd:
    **"Identificar pelo papel/natureza, não só pelo código"**. Antes dela, o dono escolheu para a ad40, no chat em 21/11,
    **"Nome/natureza + recusar"** (corpo do PR #1300, mergeado). As duas respostas fixam o mecanismo: a conta é a do plano padrão
    quando código, natureza e nome (sem caixa, acento nem espaço extra) batem com a definição (`isContaDoPlanoPadrao`). Esta
    sessão não reabre essa escolha.
  - País na borda: `D-2026-11-24-FORKS-DA-CAIXA-E-PAIS-NA-BORDA` §6 (PR #1331). A correção é dentro de arquivos existentes e
    segue as fatias do F-PB-7 (a). Ver "Conceito novo no centro?" abaixo.
- **Insumos (fato consumado):**
  - PR #1300 (ad40, mergeado): `isContaDoPlanoPadrao` e `isCodigoDoPlanoPadrao` em `ChartOfAccountsFixture.ts`; o perfil fiscal
    (`FiscalProfileService.ensureCanonicalAccounts`) e o referencial (`ReferentialMappingService.ensureCanonicalMappings`) pulam
    a conta alheia com `logger.warn`; `createAccount` recusa código do plano padrão. Teste-guarda
    `contaCanonicaColisao.integration.test.ts` (4 casos).
  - PR #1296 (35d3, mergeado): folha `4.7` "Custo dos Serviços Prestados"; regra `dre.cogs_services` por prefixo `4.7`.
  - PR #1318 (038d, mergeado): `findDreRule` classifica pelo papel (`insumoExpenseAccountId` da versão vigente em `asOf`);
    `STATEMENT_MAPPING_VERSION` = `statement-mapping.v7`. É o modelo deste BRIEF.
  - Padrão de liberar chave única no soft-delete (rename-on-delete): `FiscalCertificateRepository.ts:9`,
    `PscCredentialRepository.ts:9` (`<valor>#deleted#<id>`); memória `unique-de-idempotencia-x-soft-delete`.
- **Nós vizinhos:** `ITEM-DESTINATION` (nó das lacunas de origem); `L-20261114-222614-b556` (primitivas de plataforma sobem
  para camada compartilhada) e `L-20261114-223006-d704` (slots do `AccountingScope`) ficam fora: este BRIEF não move
  `models/dates.ts` nem cria slot no escopo. `013829-41b5` e `013846-764a` não são tocados.

## O que a ad40 já fechou e o que sobra

O #1300 fechou três consumidores: papel do perfil fiscal, referencial RFB e criação manual (prova: os 4 casos de
`contaCanonicaColisao.integration.test.ts`). Sobra o próprio `ensureChartOfAccounts`, que tem dois furos:

1. **Conta alheia viva no código:** pula sem sinal. O escopo fica sem a canônica e ninguém sabe.
2. **Conta alheia apagada no código:** o `create` estoura P2002 (o `@@unique([userId, unitId, code])` cobre linhas
   soft-deletadas) e o ramo de P2002 chama `restoreByCode`, que **ressuscita a conta alheia** (nome e natureza dela). Isso já
   acontece hoje numa conta apagada antes de o código virar canônico. Com a 4e1f corrigida sozinha, aconteceria sempre: apagar
   a "Perda" 4.7 e listar o plano a traria de volta.

## Por que não há caminho de dado (renumerar / outro código)

A pergunta original de 13dd oferecia renumerar a conta do usuário, criar a canônica em outro código ou só sinalizar. A
resposta "pelo papel/natureza" torna os dois primeiros desnecessários:
- o papel que a 4.7 tem (insumo do serviço) é configurável em qualquer folha de despesa, e a DRE já o lê pelo papel (#1318);
- o perfil fiscal e o referencial já não confundem a conta alheia (#1300);
- com este BRIEF, a DRE e o `deleteAccount` também não confundem, e apagar a conta alheia (sem partidas) libera o código para a
  canônica nascer no próximo `ensureChartOfAccounts`.

Renumerar mexeria no código de conta já escriturado (I050 de ECD transmitida); criar a canônica em outro código exigiria
identidade persistida, que o dono não escolheu (ad40: "Nome/natureza"). Nenhum dos dois entra. O escopo com a conta alheia
**com partidas** segue sem a canônica 4.7, sinalizado; o insumo dele vai para a folha que o contador apontar.

## Conceito novo no centro? (D-2026-11-24 §6)

Não. Os itens 1 a 9 corrigem arquivos existentes. A única função nova, `fiscalYearOf` (item 10), consolida a regra que já
existe (ano fiscal = ano-calendário da data do lançamento, ADR-INCR3 Emenda 3), não cria conceito; o nome segue em inglês
(F-PB-4 b). Ela fica em `features/accounting/models/dates.ts`, ao lado de `scopeDay`; a mudança de casa é da b556.

## Checklist numerado

### PR-2 — conta canônica pela identidade (4e1f, ad40, 13dd parte "nunca recebe")

1. **`deleteAccount` decide "canônica" pela identidade.** A guarda passa de `CANONICAL_ACCOUNTS.some(c => c.code === account.code)`
   para `isContaDoPlanoPadrao(account)`. Conta canônica → 409 (mensagem atual). Conta alheia com código canônico → segue para as
   guardas de partidas e de e-Lalur (inalteradas). Fecha **4e1f**.
2. **Apagar a conta alheia libera o código.** Quando `isCodigoDoPlanoPadrao(account.code) && !isContaDoPlanoPadrao(account)`, o
   soft-delete grava, na mesma tx, `code = '<code>#deleted#<id>'` (padrão rename-on-delete). O `account.deleted` da trilha
   continua com `payload.code` = código original (já é assim). Conta do usuário com código livre: soft-delete como hoje, sem
   mexer no código.
3. **`ensureChartOfAccounts` só restaura linha da canônica.** No ramo de P2002, procura a linha apagada que segura o código:
   - se ela é a canônica (`isContaDoPlanoPadrao`) → restaura (comportamento atual);
   - se é alheia → libera o código dela (item 2) e cria a canônica; se o `create` perder corrida (P2002 de novo) e houver
     canônica viva, segue.
   Fecha o furo 2 da ad40.
4. **Sinal da conta alheia viva.** Código canônico ocupado por conta viva alheia: `logger.warn` com `unitId`, `code` e o nome da
   definição, **uma vez por processo** para cada `(userId, unitId, code)` (o método roda em todo lançamento). Nada é gravado.
   Fecha o furo 1 da ad40 e a parte "nunca recebe" de **13dd** (com o item 2 o usuário tem caminho).
5. **Repositório:** `IAccountRepository`/`AccountRepository` ganham `findDeletedByCode(scope, code, tx?)` e
   `softDeleteReleasingCode(scope, id, tx?)` (soft-delete + código tombado numa só escrita); `restoreByCode` não muda (o kit o usa
   para códigos de kit, que nunca são canônicos: `SectorKitDto.ts:123`).
6. **Testes do PR-2** (integração, arquivo novo `contaCanonicaIdentidade.integration.test.ts`, mesmo arranjo do
   `contaCanonicaColisao`):
   - conta Expense "Perda na Baixa" no código `4.7`, sem partidas → `DELETE /api/accounting/accounts/:id` = 200 → `GET
     /api/accounting/accounts` → a `4.7` viva é "Custo dos Serviços Prestados" e a "Perda" não volta (hoje: 409 no DELETE);
   - conta alheia apagada direto no banco antes do código virar canônico → `GET` → a `4.7` viva é a canônica e a linha alheia
     continua apagada, com o código tombado;
   - conta canônica `4.7` → DELETE = 409;
   - conta alheia com partida → DELETE = 409 de partidas (a guarda de partidas segue antes de liberar o código);
   - `account.deleted` da trilha traz `payload.code = '4.7'`.
   Unitário em `PostingService.test.ts`: o aviso do item 4 sai uma vez em duas chamadas seguidas.

### PR-3 — DRE pela identidade (13dd parte "DRE")

7. **Regra de folha canônica só casa a folha canônica.** Em `StatementMappingFixture.ts`, a regra cujo `codePrefix` é o código
   de uma folha analítica do plano padrão (hoje `dre.cogs` 4.2 e `dre.cogs_services` 4.7, entre as de `Expense`) casa só a conta
   que **é** essa folha: código igual (não `startsWith`, que hoje casaria `4.70`) e `isContaDoPlanoPadrao`. A conta alheia nesse
   código cai na regra seguinte da mesma natureza (`dre.expenses`). O conjunto de regras de folha é derivado do fixture
   (`CANONICAL_ACCOUNTS` com `acceptsEntries: true`), não listado à mão.
   **Limite:** vale só para `Expense`, a única natureza com regra genérica por natureza. Uma conta alheia de `Revenue` num código
   de folha (3.1–3.4) segue pelo prefixo: sem regra seguinte, sairia da DRE e o J150 divergiria do I355. Esse caso vai à caixa
   (achado 1).
8. **Uma função de regra para todos os leitores da DRE.** `findDreRule` passa a receber a linha (`{ accountId, code, name,
   nature }`) e o conjunto do papel; `computeDreNet` (`AccountingReportService.ts:294`), `buildSection` (:325), o diagnóstico
   da DRE (:356–363) e o resultado do período (:801) usam todos `findDreRule`. `findMappingRule` continua para o BP e para o
   aging (sem regra de prefixo). O papel (`insumoExpenseAccountId`) continua vencendo o prefixo, como no #1318.
9. **`STATEMENT_MAPPING_VERSION` → `statement-mapping.v8`** (ADR-INCR4 Q4.1; precedentes #1296, #1318). Testes que fixam `v7`
   sobem junto. **Teste-guarda** (integração, no arquivo do PR-2 ou próprio): escopo com `4.7` Expense "Perda na Baixa" com
   partida → `GET /api/accounting/income-statement` → a conta aparece em `expenses`, não em `costOfGoodsSold` (hoje: em
   `costOfGoodsSold`); escopo com a `4.7` canônica com partida → em `costOfGoodsSold` (sem regressão do #1296). Unitário de
   `findDreRule`: `4.70` Expense não casa `dre.cogs_services`; papel continua vencendo.

### PR-1 — ano fiscal num lugar só (1fd7)

10. **`fiscalYearOf(day: string | Date): number`** em `features/accounting/models/dates.ts`, com a regra atual (`getUTCFullYear`
    da data date-only; doc do ADR-INCR3 Emenda 3 movido de `PostingService.fiscalYearFrom`). `PostingService` (lançamento :398 e
    estorno :652) e `EntryApprovalService` (:289) chamam essa função; as duas cópias privadas saem.
    **Sem parâmetro de regra:** o escopo não tem regra de ano fiscal hoje, e parâmetro aceito e ignorado é defeito (memória
    `param-aceito-e-ignorado-e-bug`). Quando o escopo ganhar a regra (vizinho d704), a assinatura muda num lugar só.
11. **Teste (o `comoProvar` da 1fd7):** unitário que troca `fiscalYearOf` por um mock (`jest.mock` parcial de `models/dates`)
    e espera `nextEntryNumber` receber o ano do mock no `postEntry` e no `approve`; e caso de fronteira `'2026-01-01'` → 2026.

## Contratos

Nenhum contrato HTTP muda (rotas, DTOs Zod, `dtoShapeSnapshot` e `openapi.json` intactos). Contratos internos:

```ts
// ChartOfAccountsFixture.ts (já existem, #1300)
isCodigoDoPlanoPadrao(code: string): boolean
isContaDoPlanoPadrao(account: { code: string; name: string; nature: string }): boolean

// IAccountRepository (novos)
findDeletedByCode(scope: AccountingScope, code: string, tx?: Prisma.TransactionClient): Promise<Account | null>
softDeleteReleasingCode(scope: AccountingScope, id: string, tx?: Prisma.TransactionClient): Promise<Account>
//   efeito: { deletedAt: now, code: `${code}#deleted#${id}` }

// StatementMappingFixture.ts
type DreRow = { accountId: string; code: string; name: string; nature: string };
findDreRule(row: DreRow, custoServicosAccountIds: ReadonlySet<string>): StatementMappingRule | undefined
STATEMENT_MAPPING_VERSION = 'statement-mapping.v8'

// models/dates.ts
fiscalYearOf(day: string | Date): number
```

Sem migração de schema e sem migração de dado: o tombamento do código acontece no delete (item 2) e no `ensureChartOfAccounts`
(item 3), linha a linha, dentro de operação já existente.

## Prova por lacuna

| Lacuna | Itens | Comando que prova |
|---|---|---|
| 4e1f | 1, 2, 6 | `npx jest src/controllers/__tests__/contaCanonicaIdentidade.integration.test.ts --runInBand` (DELETE 200 e a "Perda" não volta) |
| ad40 | 3, 4, 5, 6 | o mesmo arquivo (linha apagada alheia não ressuscita) + `npx jest src/features/accounting/services/__tests__/PostingService.test.ts --selectProjects unit` (aviso uma vez) |
| 13dd | 2–4, 7–9 | o mesmo arquivo de integração (canônica nasce após o delete; "Perda" em `expenses` na DRE) + unitário do `StatementMappingFixture` |
| 1fd7 | 10, 11 | `npx jest <teste do item 11> --selectProjects unit` |

## Forks pendentes de ratificação

Nenhum. O mecanismo de identidade foi escolhido pelo dono (ad40 "Nome/natureza + recusar"; 13dd "pelo papel/natureza"); o
tratamento da colisão decorre dele (seção "Por que não há caminho de dado"); a extensão a `Revenue` e aos escritores
automáticos, que pediria decisão, ficou fora e vai à caixa.

## Pendente de validação externa

Nenhum item do checklist depende de regra contábil nova. A classificação de "Perda na Baixa de Imobilizado" em `expenses` é a
que a conta teria sem a colisão (regra por natureza já vigente); a regra do custo é a do #1296/#1318.

## Insumos ausentes

Nenhum.

## Achados fora de escopo (vão à caixa)

1. **Receita alheia em código de folha canônica (3.1–3.4)** segue pelo prefixo na DRE (ex.: conta do usuário em 3.2 vira dedução
   da receita). Decidir a seção de uma receita sem regra (bruta? outras receitas?) pede o contador e mexe no J150 × I355.
2. **Escritores automáticos lançam por código** (`PostingService.resolveLeafAccount`, pontes, NF-e, liquidação, encargos): num
   escopo com conta alheia num código canônico, o lançamento automático cai na conta alheia. Hoje nenhum escritor automático usa
   a 4.7 por código (só o papel do insumo, já guardado pela ad40), então não há caso vivo; mas a classe existe para todo código
   que entrou no plano depois do escopo nascer (3.4, 3.5.x, 4.3.x, 4.4.x, 4.6). Decisão do dono: recusar o lançamento automático
   nesse caso, ou lançar e sinalizar.
3. **Identidade derivada depende do nome do fixture:** renomear uma folha do plano padrão numa versão futura faria todo escopo
   existente perder a identidade dela (vira "alheia"). A opção estrutural é a identidade persistida na linha (coluna de chave
   canônica gravada pelo `ensureChartOfAccounts`, com backfill), que o dono não escolheu em 21/11; fica registrada como destino.

## Write-set

| PR | Arquivos |
|---|---|
| PR-1 | `server/src/features/accounting/models/dates.ts`, `server/src/features/accounting/services/PostingService.ts` (só `fiscalYearFrom` e as duas chamadas), `server/src/features/accounting/services/EntryApprovalService.ts`, teste unitário novo em `server/src/features/accounting/services/__tests__/` |
| PR-2 | `server/src/features/accounting/services/PostingService.ts` (`ensureChartOfAccounts`, `deleteAccount`), `server/src/features/accounting/repositories/{IAccountRepository,AccountRepository}.ts`, `server/src/controllers/__tests__/contaCanonicaIdentidade.integration.test.ts`, `server/src/features/accounting/services/__tests__/PostingService.test.ts` (e fakes de `IAccountRepository` que o `tsc` apontar) |
| PR-3 | `server/src/features/accounting/services/StatementMappingFixture.ts`, `server/src/features/accounting/services/AccountingReportService.ts`, testes que fixam `statement-mapping.v7`, teste de integração da DRE |

Choke points da PAR-001: nenhum (`factory.ts`, `docs.paths.ts`, `schema.prisma` intactos). Como PR-1 e PR-2 editam o
`PostingService.ts`, os três PRs vão para `integration/conta-canonica-papel` (`D-2026-11-10-BRANCH-DE-INTEGRACAO-E-GAP-MAP-POR-FEATURE`),
cada um com base nela; a `main` recebe um PR só quando os três entrarem. O grupo não tem nota de nó própria; o write-set fica aqui.
