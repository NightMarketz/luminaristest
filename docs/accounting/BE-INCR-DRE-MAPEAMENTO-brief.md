# BE-INCR-DRE-MAPEAMENTO — BRIEF do grupo `StatementMappingFixture.ts` da caixa de lacunas

**Tipo:** BRIEF de grupo de lacunas da caixa (não é BRIEF de nó do plano). **Data:** 26/11/2026. **Sessão:** planejamento,
worktree `unruffled-mcnulty-17caaf`. **Estado:** **com fork**. A execução espera a resposta do dono (ver "Forks pendentes").

## Contexto fixo

- **Item a planejar:** o grupo da caixa ligado pelo arquivo `server/src/features/accounting/services/StatementMappingFixture.ts`.
  `lacunas.mjs list --grupos` em 26/11 mostra um grupo de 2, só estas duas:
  - `L-20261126-194050-9b46` (defeito, P1, G3·E1·silencioso·verificado). `matchesByTable` casa `codePrefix` com
    `code.startsWith(prefix)` sem fronteira de ponto (`StatementMappingFixture.ts:57`; a lacuna cita `:60`, a linha de antes
    do #1337). `'4.3'` captura `'4.30'`, `'3.1'` captura `'3.10'`. Estado: `em-sessao`, destino "planejamento do grupo dre-prefixo".
  - `L-20261124-035944-618f` (fork, `com-dono`, **geração 4**, destino "repensar a abordagem (a cadeia não está convergindo)").
    Uma receita do usuário num código de folha do plano padrão (3.1–3.4) segue o prefixo na DRE. Não há regra genérica de
    `Revenue`. A seção de uma receita sem regra pede o contador. Fica `com-dono` e entra aqui como fork.
- **Autorização:**
  - Planejar o grupo: `docs/plano/decisoes/D-2026-11-11-LACUNA-VAI-AO-MAESTRO.md`, emenda de 21/11, item 6 ("Grupo vai a
    planejamento macro": *"Planeja como resolver tudo no macro em vez de vários remendos"*).
  - Executar: a mesma emenda, item 6 (dono, chat, 21/11: "Sim, executa"), vale **só** para BRIEF sem fork **e** sem lacuna
    `com-dono`. Este BRIEF falha nas duas condições: a 618f é `com-dono` e há forks abaixo. **Nenhuma `sessao-feature` abre
    antes da resposta do dono.**
- **Insumos (fato consumado):**
  - `docs/adr/ADR-INCR4-bp-dre.md`. Q4 ratificou o mapeamento por regras declarativas com a ordem *"accountId → codePrefix →
    nature → fallback"*. Q4.1: mudança de mapeamento exige bump de versão. Q7: conta com saldo sem mapeamento deixa o
    relatório `INVALID`, *"nunca ignorada silenciosamente"*.
  - `D-2026-11-21-DRE-INSUMO-PELO-PAPEL`, PR #1318 (038d): o papel `insumoExpenseAccountId` vence o prefixo. Emenda f974: a
    DRE lê o papel da **versão de política vigente em `asOf`**.
  - `D-2026-11-21-FORKS-DA-CAIXA` (13dd: *"Identificar pelo papel/natureza, não só pelo código"*), PR #1300 (ad40:
    *"Nome/natureza + recusar"*), BRIEF irmão `docs/accounting/BE-INCR-CONTA-CANONICA-PAPEL-brief.md` e PR #1337 (13dd parte
    DRE): `findDreRule` com a identidade da folha, **só para `Expense`**. `STATEMENT_MAPPING_VERSION` = `statement-mapping.v8`.
  - Precedente de atributo por conta com rota própria: `requiresDimension` (`SetAccountRequiresDimensionSchema`,
    `PostingDto.ts:230`, atrás de `canManage`, com evento de auditoria a cada troca).
  - Técnica de prefixo com fronteira já em uso, copiada à mão: `CashFlowReportService.ts:42`,
    `ProfitDistributionService.ts:395` e `ChartOfAccountsFixture.plano4niveis.test.ts:66` (`code === p || code.startsWith(p + '.')`).
- **Nós vizinhos:**
  - `ITEM-DESTINATION`, o nó da 618f e da cadeia de origem.
  - PR #1427 (aberto, sessão `item-28-da-ponte-contas` trabalhando). Ele edita `ChartOfAccountsFixture.ts` (contas de pessoal,
    a 4.10 que a 9b46 cita). Todo item deste BRIEF que tocar o fixture vai **depois** do merge dele.
  - PR #1146: aparece em `gh pr list` com diff em `StatementMappingFixture.ts` e `AccountingReportService.ts`. É a base
    `integration/x10a` atrás da `main`. `git diff --stat origin/main origin/claude/x10a-al-pr3-fila-tarefas -- <os dois>`
    sai vazio (verificado em 26/11), então **nenhum PR aberto muda de fato os arquivos deste grupo**.
  - Leitores da DRE (a regra muda para todos de uma vez):
    - por `findDreRule`, dentro de `AccountingReportService`: `computeDreNet` (:294), `buildSection` (:325), o diagnóstico
      (:356–363) e o LAIR (:801);
    - por `incomeStatement`: J150 (`SpedGenerationService.ts:518`), LALUR (`LalurService.ts:946`), Simples
      (`SimplesDeclaracaoService.ts:108`), DFC (`CashFlowReportService.ts:239`), exportação (`DataExchangeExportService.ts:284`)
      e perfil fiscal (`CompanyFiscalProfileService.ts:291`);
    - por `resultadoAntesIrpjCsll*`: `TaxAssessmentService` e `TaxSimulationService`.

## Por que a cadeia não converge (a causa comum)

**O código da conta carrega o papel dela na demonstração.** O código é um endereço que o usuário escolhe livremente. A seção
da DRE é um fato contábil (Lei 6.404 art. 187). A tabela `STATEMENT_MAPPING_RULES` deriva o segundo do primeiro por prefixo
textual. Cada lacuna da cadeia é um caso em que endereço e papel se separam, e cada correção acrescentou mais uma exceção ao
`findDreRule`:

| Lacuna | Onde o código e o papel se separaram | Remendo aplicado |
|---|---|---|
| 35d3 (20/11) | o custo do serviço não tinha código | regra nova `4.7` |
| 051e/038d (21/11) | o insumo numa folha fora de 4.2/4.7 (4.1.9) | o papel vence o prefixo, só para o insumo |
| ad40/13dd (21–24/11) | a conta do usuário ocupa o código canônico 4.7 | identidade (nome + natureza) no código exato, só para `Expense` |
| **618f** (24/11) | o mesmo da 13dd, em `Revenue` | nenhum: sem regra genérica de `Revenue` a seguir, a conta sairia da DRE |
| **9b46** (26/11) | o prefixo textual sem fronteira (`4.30` "está em" `4.3`) | — |

O histórico do fixture mostra o mesmo padrão: toda folha nova do plano padrão (3.3, 3.4, 3.5.x, 3.6, 4.3, 4.7) exigiu uma
regra nova, com o comentário *"sem regra, a conta sumiria da DRE em silêncio"* (`StatementMappingFixture.ts:22-32`).

**O fato que liga as duas lacunas** (verificado, `StatementMappingFixture.ts:115-121` e `AccountingReportService.ts:293-311`):
todas as regras da DRE dão `−rawBalance` (`credit_positive` e `debit_negative` são a mesma conta). Por isso **a seção não
muda o resultado líquido; só a ausência de regra muda.** Conta sem regra sai do `computeDreNet`, e com ela saem:

- o resultado da DRE;
- a linha de resultado do BP;
- o LAIR do X7;
- o J150, que passa a divergir do I355, porque o encerramento fecha por natureza.

Daí:
- **Seção errada** (9b46 e 618f hoje) é erro de apresentação: o líquido está certo e a DRE está errada por linha.
- **Sem regra** (receita fora dos prefixos) é erro de valor. Hoje o relatório fica `INVALID`, mas **nenhum consumidor além do
  `CompanyFiscalProfileService` lê o `reportStatus`** (grep de 26/11): o J150, o LALUR e o Simples seguem com o líquido
  incompleto (achado 1).
- **A fronteira de ponto sozinha transforma o primeiro erro no segundo para `Revenue`.** Uma receita do usuário em `3.10`, hoje
  receita bruta, ficaria sem regra. Para `Expense` não há esse efeito, porque `dre.expenses` pega tudo. É por isso que a 9b46
  se divide em duas metades abaixo.

**ADR-INCR4 já previa a camada que falta.** A ordem ratificada em Q4 começa por `accountId`, e essa camada nunca foi
construída. O papel do insumo (#1318) é uma instância dela, para um papel só. Cada lacuna posterior da cadeia pediu a mesma
camada, para outro caso.

## Conceito novo no centro? (D-2026-11-24 §6, "país na borda")

- **Caminho A (recomendado):** sim, um conceito. A **seção da demonstração** passa a ser um atributo da conta. Ele é universal:
  receita, dedução, custo, resultado financeiro e despesa existem em qualquer DRE, IFRS ou BR GAAP. O nome segue em inglês
  (`statementSection`, F-PB-4 b), e os valores são os ids de seção que já existem (`grossRevenue`, `revenueDeductions`,
  `costOfGoodsSold`, `financialResult`, `expenses`). Nada de país entra no centro.
- **Caminho B:** usaria o referencial RFB, que é borda, como fonte do centro. É contra o §6 (ver F-DRM-1).
- **Caminho C:** nenhum conceito novo. Mantém o código como portador do papel.

## Checklist numerado

Os itens marcados **[direto]** não dependem de fork. Os outros dizem de qual fork e de qual caminho dependem. Os itens de um
caminho não escolhido somem quando o dono responder.

### Itens comuns a todos os caminhos

1. **[direto] Prefixo com fronteira, função canônica.** Função pura `isCodeUnder(code: string, prefix: string): boolean`
   (`code === prefix || code.startsWith(prefix + '.')`). Mora ao lado de `isCodigoDoPlanoPadrao`, em `ChartOfAccountsFixture.ts`.
   `matchesByTable` (`StatementMappingFixture.ts:57`), `CashFlowReportService.ts:42` e `ProfitDistributionService.ts:395` passam
   a chamá-la; as cópias inline saem. Pelo critério de reuso, é o mesmo objeto (mesma forma, mesma derivação, os dois lados
   vivos); uma quarta cópia seria a técnica re-inlinada que a memória "Critério reuso × divergência" registra.
2. **[direto] 9b46, metade `Expense`.** Com o item 1, uma despesa em `4.30` sai de `financialResult` e cai em `expenses` (regra
   por natureza). Unitário: `findMappingRule('Expense', '4.30', 'DRE')?.id === 'dre.expenses'`; `'4.3.3'` continua em
   `financialResult`; `'4.20'` continua fora de `costOfGoodsSold`. O resultado líquido não muda (mesmo sinal).
3. **9b46, metade `Revenue` (depende de F-DRM-3).** Com o item 1, uma receita do usuário em `3.10`/`3.20`/`3.60` deixa de
   casar `3.1`/`3.2`/`3.6` e fica **sem regra**. Por isso a fronteira para `Revenue` só entra junto com a resposta da F-DRM-3:
   - F-DRM-3 (a): cai na regra genérica de receita bruta. Não perde o líquido.
   - F-DRM-3 (b): cai na seção nova de outras receitas. Não perde o líquido.
   - F-DRM-3 (c): fica `INVALID`, com o diagnóstico acionável do item 13 e a guarda do item 5.

   Até lá, `isCodeUnder` vale para as regras de `Expense` e as de `Revenue` seguem `startsWith` (o comportamento de hoje),
   com um teste que fixa o limite.
4. **[direto] `STATEMENT_MAPPING_VERSION` → `statement-mapping.v9`** no PR dos itens 1–2 (ADR-INCR4 Q4.1; precedentes #1296,
   #1318, #1337). Os testes que fixam `v8` sobem junto (`emenda33.financialResult.test.ts:112-113` ganha a linha do v9).
5. **[direto] Guarda de totalidade da DRE** (teste, sem código de aplicação). Em `AccountingReportService.bp-dre.test.ts`,
   uma fixture **com naturezas misturadas** (memória "Teste BP/DRE mistura naturezas"):
   - um Ativo com saldo;
   - receitas em 3.1, 3.5.1 e num código do usuário fora da tabela;
   - despesas em 4.2, 4.3.1 e 4.30.

   Afirma que Σ das seções da DRE + Σ do `unmappedAccounts` = Σ dos saldos `Revenue`/`Expense` (a base do I355), e que
   `reportStatus` é `INVALID` se, e só se, alguma conta de resultado com saldo ficar sem seção. É o invariante que a 618f e a
   metade `Revenue` da 9b46 não podem quebrar, qualquer que seja o caminho.

### Caminho A — seção da demonstração como atributo da conta (versão incremental)

Cada passo deixa a DRE idêntica à de hoje até o dono ou o usuário classificar. A tabela por prefixo vira **fallback legado**
(passo A2) e depois só **sugestão** na criação (passo A5).

6. **A0. PR-0 de contrato** (depende de F-DRM-1 = A). Contém:
   - `StatementSectionSchema = z.enum([...5 seções de DRE])` e a coluna `Account.statementSection String?`, nula, migração
     `ADD COLUMN` com prólogo defensivo (memória "Migração SQLite sem transação");
   - `SetAccountStatementSectionSchema` (`.strict()`, `{ unitId, statementSection: StatementSection | null }`) e
     `PATCH /api/accounting/accounts/:id/statement-section`, no molde de `requiresDimension`, na cadeia Route → Controller →
     `PostingService.setAccountStatementSection` → `AccountRepository` → Prisma;
   - `canManage`, e 409 se a seção não pertence à natureza (`Revenue` → `grossRevenue|revenueDeductions|financialResult`;
     `Expense` → `costOfGoodsSold|financialResult|expenses`);
   - evento `account.statement_section_set` na allowlist do `auditCanonical.ts`, com payload `{ accountId, code, from, to }` e
     sem PII;
   - snapshot de shape dos DTOs, `openapi.json` com guarda de path-count, paridade i18n pt/en das mensagens;
   - emenda ao ADR-INCR4 Q4: a camada `accountId` ganha forma (atributo persistido) e ordem (item 7).
7. **A1. Ordem única da regra da DRE** (`findDreRule`):
   1. o papel do insumo (038d, versão vigente em `asOf`);
   2. o `statementSection` explícito da conta, conforme F-DRM-2;
   3. a tabela legada (prefixo com `isCodeUnder` e identidade da folha, como no v8);
   4. a natureza (`Expense` → `expenses`).

   `TrialBalanceRow` passa a trazer `statementSection`. A regra devolvida para o passo 2 é a regra sintética da seção (mesmo
   `sign` da regra de tabela da seção). Bump para `v10`.
8. **A2. Plano padrão declara a seção.** `CanonicalAccount` ganha `statementSection?` em toda folha `Revenue`/`Expense`.
   `ensureChartOfAccounts` grava a seção **só na linha que ele cria ou restaura como canônica**; a conta alheia nunca a recebe,
   o que respeita o 13dd e o ad40 sem reabri-los. Teste zero-diff: para cada folha de resultado do fixture,
   `statementSection === findMappingRule(nature, code, 'DRE').section`. Toca `ChartOfAccountsFixture.ts`, então vai depois do
   #1427.
9. **A3. Retroatividade** (depende de F-DRM-2):
   - (a) a troca do item 6 é recusada (409 nomeado) quando a conta tem partida em período fechado. O gate é o mesmo do
     `assertPeriodOpenTx` (`EntryApprovalService.ts:493`, `PostingService.ts:131`), re-checado dentro da tx;
   - (b) a classificação é versionada com vigência, e a DRE lê a vigente em `asOf` (molde f974);
   - (c) nenhuma guarda.
10. **A4. Kits.** A instalação de kit (publicado, não se edita) grava `statementSection` pela tabela (sugestão) na conta que
    cria. Teste: kit v3 instalado → as contas 3.6.x e 4.5.x têm a seção que a tabela dá hoje.
11. **A5. Backfill e aposentadoria do fallback.** Um CLI idempotente (molde `jobs/migratePlano4NiveisCli.ts`, não migração SQL:
    memória "Smoke-gate S6 × migração de dado"):
    - grava em toda conta de resultado sem seção a que o `findDreRule` v10 dá hoje (zero-diff);
    - imprime as que ficam nulas: receita sem regra e receita alheia em código de folha, as duas pela F-DRM-3.

    Depois do backfill rodado (gate humano: o dono roda e cola a saída), o passo 3 da ordem do item 7 sai da DRE e a tabela
    fica só como sugestão de criação (item 12). Bump para `v11`. **Fecha a classe:** o código deixa de carregar o papel.
12. **A6. Criação de conta.** `CreateAccountSchema` aceita `statementSection` opcional; ausente, o serviço grava a sugestão da
    tabela. Para `Revenue` sem sugestão, a regra depende de F-DRM-3:
    - (a): grava `grossRevenue`;
    - (b): grava a seção nova;
    - (c): 400 `STATEMENT_SECTION_REQUIRED`.

    O FE (seletor da seção no cadastro de conta) é nó vizinho, `FE-INCR-*`, fora deste BRIEF.
13. **A7. Diagnóstico acionável.** `unmappedAccounts[]` ganha `reason: 'NO_STATEMENT_SECTION'` e a rota do item 6 vira a ação
    sugerida. Shape novo no DTO de resposta, com snapshot.

### Caminho B — seção derivada do referencial RFB (se o dono escolher B em F-DRM-1)

14. **B1.** Uma tabela de grupo referencial → seção, por leiaute e versão: L300A para o Real, P150A para o Presumido; por
    exemplo `3.01.01.03` → custo. `findDreRule` lê o `ReferentialMapping` da versão do ano de `asOf`; sem mapeamento, cai na
    tabela por prefixo. É **pendente de validação externa** (a tabela de grupos exige o catálogo oficial carregado e o
    contador), e para o Simples ver "Insumos ausentes".

### Caminho C — manter o prefixo e remendar (se o dono escolher C em F-DRM-1)

15. **C1.** Os itens 1–5, com a metade `Revenue` pela F-DRM-3.
16. **C2.** A identidade da folha estendida a `Revenue`: a conta alheia num código de folha 3.1–3.4 cai na regra genérica de
    `Revenue` da F-DRM-3 (a) ou (b), ou fica `INVALID` na (c).
17. **C3.** A regra genérica `dre.revenue_other` por natureza, ao fim das regras de `Revenue`, na seção da F-DRM-3.

**O que o C deixa aberto:**
- toda folha nova do plano padrão ou de kit exige uma regra nova;
- uma conta do usuário fora da tabela continua recebendo a seção por adivinhação;
- renomear uma folha no fixture (achado 3 do BRIEF irmão) muda a DRE de todo escopo existente;
- o papel do insumo continua sendo a única camada `accountId`, e a próxima lacuna da cadeia (geração 5) é previsível.

## Contratos

Comuns a todos os caminhos (itens 1–5). Nenhum contrato HTTP muda:

```ts
// ChartOfAccountsFixture.ts
export function isCodeUnder(code: string, prefix: string): boolean; // code === prefix || code.startsWith(`${prefix}.`)
// StatementMappingFixture.ts
export const STATEMENT_MAPPING_VERSION = 'statement-mapping.v9';
```

Caminho A (itens 6–13):

```ts
// dtos/PostingDto.ts
export const StatementSectionSchema = z.enum(['grossRevenue', 'revenueDeductions', 'costOfGoodsSold', 'financialResult', 'expenses']);
export type StatementSection = z.infer<typeof StatementSectionSchema>;
export const SECTIONS_BY_NATURE: Record<'Revenue' | 'Expense', readonly StatementSection[]> = {
  Revenue: ['grossRevenue', 'revenueDeductions', 'financialResult'],
  Expense: ['costOfGoodsSold', 'financialResult', 'expenses'],
};
export const SetAccountStatementSectionSchema = z
  .object({ unitId: z.string().min(1), statementSection: StatementSectionSchema.nullable() })
  .strict();
// CreateAccountSchema += statementSection: StatementSectionSchema.optional()

// schema.prisma — model Account
statementSection String? // seção da DRE (StatementSection); null = sem classificação (fallback legado até o A5)

// StatementMappingFixture.ts
interface DreRow { accountId: string; code: string; name: string; nature: string; statementSection: StatementSection | null }
findDreRule(row: DreRow, custoServicosAccountIds: ReadonlySet<string>): StatementMappingRule | undefined
// ordem: papel → statementSection → tabela legada (até o A5) → natureza (Expense)

// AuditEvent (allowlist auditCanonical.ts)
'account.statement_section_set': { accountId: string; code: string; from: StatementSection | null; to: StatementSection | null }

// Resposta da DRE (diagnostics)
unmappedAccounts[i].reason?: 'NO_STATEMENT_SECTION'

// HTTP
PATCH /api/accounting/accounts/:id/statement-section  → 200 Account | 403 | 404 | 409 SECTION_NATURE_MISMATCH | 409 PERIOD_CLOSED (F-DRM-2 a)
```

Caminho A com F-DRM-2 (b), em vez da coluna:

```ts
model AccountStatementClassification { id; userId; unitId; accountId; statementSection; validFrom DateTime; createdById; createdAt; deletedAt
  @@unique([userId, unitId, accountId, validFrom]) }
```

## Forks pendentes de ratificação

### F-DRM-1 — onde mora a seção da DRE de uma conta (a 618f "repensar a abordagem") — RATIFICAÇÃO PENDENTE

- **(A) Atributo da conta, persistido** (`Account.statementSection`). O plano padrão e os kits o declaram, e o usuário ou o
  contador o define por conta. A tabela por prefixo vira fallback legado e depois só sugestão. Fecha a classe inteira, porque
  o código deixa de carregar o papel. Materializa a camada `accountId` que o ADR-INCR4 Q4 já ratificou. **Não reabre**
  "Nome/natureza" (ad40/13dd): a identidade da conta canônica continua derivada para o papel fiscal, o referencial e o delete,
  e só a DRE passa a ler um atributo gravado. Efeito lateral favorável: renomear uma folha no fixture deixa de mudar a DRE.
  É o modelo dos ERPs de referência (Odoo `account.account.account_type`; grau **inferido**, de memória de treino, não lido
  nesta sessão).
- **(B) Derivar do referencial RFB** (`ReferentialMapping`). É a única classificação por conta já gravada, versionada por ano
  e desenhada pela lei. Contra:
  - é borda de país usada como fonte do centro (§6);
  - é opcional por conta (`coverage().unmappedAccounts`) e por versão, com catálogo que pode estar vazio
    (`ReferentialMappingService.ts:214-217`);
  - depende do regime (L300A × P150A);
  - para o Simples, ver "Insumos ausentes".

  Serve bem como **validação de coerência** (seção × grupo referencial → aviso), que fica como achado 2.
- **(C) Manter o prefixo e remendar** (itens 15–17). Menor diff; deixa aberto o que a seção "O que o C deixa aberto" lista.

**Recomendação: (A), na versão incremental A0 → A5**, com os itens 1–5 como etapa de contenção declarada. A0–A4 são opt-in e
zero-diff; o A5 aposenta o fallback depois do backfill.

### F-DRM-2 — a troca da seção reclassifica período fechado? (só se F-DRM-1 = A ou B) — RATIFICAÇÃO PENDENTE

- **(a) Atributo único; a troca é recusada se a conta tem partida em período fechado** (o gate de período fechado que o
  lançamento já usa). Mudar período fechado passa a exigir a reabertura formal, que é o caminho que a escrituração já tem para
  alterar período fechado. A ECD transmitida não muda por baixo.
- **(b) Versionado com vigência; a DRE lê a classificação vigente em `asOf`.** É o precedente do f974 (o papel do insumo é
  lido da versão de política vigente). Permite reclassificar dali em diante sem reabrir. Custo: tabela nova e leitura por
  janela em todo leitor (o LAIR lê por trimestre).
- **(c) Atributo único, retroativo, sem guarda.** O líquido não muda, mas o J150 de um exercício transmitido sairia diferente
  se regerado.

**Recomendação: (a).** É mais simples que (b), não muda período entregue e usa o gate que já existe. (b) é a opção coerente com
o f974, se o dono preferir a mesma regra para os dois papéis.

### F-DRM-3 — a seção de uma receita sem classificação (a decisão de conteúdo da 618f) — RATIFICAÇÃO PENDENTE

Vale para a receita do usuário fora dos prefixos, para a receita alheia num código de folha (3.1–3.4) e para a metade
`Revenue` da 9b46 (`3.10`).

- **(a) Receita bruta** (`grossRevenue`). Mantém o líquido. Pode inflar a receita bruta, que é a base do Simples e da
  presunção.
- **(b) Seção nova "outras receitas e outras despesas"** (Lei 6.404 art. 187 IV). Mantém o líquido, mas pede seção nova no
  relatório, no J150 e no FE, e a definição do contador (ver "Pendente de validação externa" 1 e 2).
- **(c) Nenhuma por adivinhação.** A conta fica sem seção e o relatório fica `INVALID` (Q7, como hoje), agora com caminho:
  diagnóstico acionável (item 13), criação exige a seção (item 12) e a guarda de totalidade (item 5).

**Recomendação: (c).** Não decide pelo contador o que é dele; a decisão vira, por conta, do usuário que conhece a receita. O
risco de (c) é o `INVALID` não ser lido por quem consome a DRE; ele fica coberto pelo achado 1, que deve entrar antes ou
junto.

### Pergunta ao dono sobre o que não depende de fork

Os itens 1, 2, 4 e 5 (metade `Expense` da 9b46, a função `isCodeUnder`, o bump e a guarda de totalidade) valem em A, B e C.
A regra do item 6 da emenda de 21/11 é binária, então este BRIEF não os libera sozinho. **Pergunta:** liberar esses quatro
itens já, como PR-1 de contenção, antes de responder F-DRM-1..3?

## Pendente de validação externa

1. **A seção da receita sem classificação.** Se o dono escolher F-DRM-3 (a) ou (b), a escolha é do contador: base da receita
   bruta para o Simples e para a presunção, e o J150 × I355. Com (c), o contador classifica conta a conta.
2. **A DRE não tem a linha "outras receitas e outras despesas".** A Lei 6.404 art. 187 IV (*"o lucro ou prejuízo operacional,
   as outras receitas e as outras despesas"*, redação da Lei 11.941/2009) a discrimina; o enum de seções de hoje não. Acervo:
   [lei-6404-1976-12-15.md](https://github.com/ctresb/leis/blob/main/federal/leis-ordinarias/1976/lei-6404-1976-12-15.md),
   `versao_texto` "compilada (texto vigente)", `baixado_em` 2026-10-13; fonte:
   https://normas.leg.br/?urn=urn:lex:br:federal:lei:1976-12-15;6404. A 3.4 (receita de pacotes não utilizados) já espera essa
   resposta (PE-1 do BRIEF PACOTE-VALIDADE: receita bruta ou outras receitas operacionais). A seção nova é frente adjacente
   (achado 3), não item deste BRIEF.
3. **Caminho B:** a tabela de grupo referencial → seção (L300A/P150A) exige o catálogo oficial e o contador.

## Insumos ausentes

1. **Simples × referencial (só para o caminho B).** Não li a norma que diz se a empresa do Simples entrega ECF e, portanto, se
   mantém mapeamento referencial. Grau: **assumido** que não entrega. Se o dono considerar o B, confirmar no acervo antes.
2. **Gate de período fechado (só para F-DRM-2 a).** Localizei `assertPeriodOpenTx` (`EntryApprovalService.ts:493`) e o comentário
   do `PostingService.ts:131`; não li a assinatura nem se ele responde "a conta tem partida em período fechado" (ele responde
   "esta data está fechada"). A sessão de feature confirma, ou o item ganha uma consulta de repositório nova.

## Achados fora de escopo (vão à caixa)

1. **Os consumidores da DRE não leem o `reportStatus`.** J150 (`SpedGenerationService.ts:516-522`), LALUR, Simples, DFC,
   exportação, LAIR: conta de resultado sem regra sai do líquido e o arquivo é gerado assim. Só o
   `CompanyFiscalProfileService.ts:292` recusa `INVALID`. → caixa (`L-20261126-205932-5235`, P0: G1·E2·silencioso·inferido).
   Vizinha no mesmo arquivo: `L-20261125-110220-8862` (rótulo `DRE_CMV` do J150).
2. **Coerência seção × referencial RFB.** Conta classificada numa seção cujo grupo referencial diz outra (ex.: seção `expenses`
   com referencial `3.01.01.03.*` de custo) → aviso na cobertura do referencial. Só faz sentido com F-DRM-1 = A; fica descrito
   aqui, sem entrada na caixa (depende do fork).
3. **Seção "outras receitas e outras despesas" (art. 187 IV) ausente na DRE e no J150.** → caixa (`L-20261126-205940-3411`).
   Por estar no mesmo arquivo, ela entra no grupo deste BRIEF. Se o dono responder F-DRM-3 (b), esta lacuna vira item do
   BRIEF; com (a) ou (c), segue isolada, à espera do contador.
4. **Identidade derivada do nome do fixture** (achado 3 do BRIEF irmão, já descrito na 618f): o caminho A a torna irrelevante
   para a DRE, mas não para o papel fiscal, o referencial e o delete. Citado, não absorvido.

## Prova por lacuna

| Lacuna | Itens | Comando que prova |
|---|---|---|
| 9b46, metade `Expense` | 1, 2, 4 | `npx jest src/features/accounting/services/__tests__/emenda33.financialResult.test.ts src/features/accounting/fixtures/__tests__/ChartOfAccountsFixture.custoServicos.test.ts --selectProjects unit` (`'4.30'` → `dre.expenses`; v9) |
| 9b46, metade `Revenue` | 3 (+ item da F-DRM-3) | **condicional:** o mesmo comando, com `'3.10'` `Revenue` → a seção da F-DRM-3 (a/b) ou `INVALID` com `reason` (c) |
| guarda de totalidade | 5 | `npx jest src/features/accounting/services/__tests__/AccountingReportService.bp-dre.test.ts --selectProjects unit -t totalidade` |
| 618f | **condicional à F-DRM-1/3** — A: 6–13; C: 15–17 | A: `npx jest src/controllers/__tests__/dreSecaoDaConta.integration.test.ts --runInBand` (receita do usuário em `3.2` "Outra Receita": sem seção → `INVALID` com `reason`; com `PATCH … grossRevenue` → em `grossRevenue`, fora de `revenueDeductions`). C: `npx jest …custoServicos.test.ts --selectProjects unit -t Revenue` (a conta alheia em `3.2` não cai em `dre.deductions`) |

## Write-set

| PR | Arquivos |
|---|---|
| PR-1 (itens 1, 2, 4, 5; contenção) | `server/src/features/accounting/fixtures/ChartOfAccountsFixture.ts` (só `isCodeUnder`), `server/src/features/accounting/services/StatementMappingFixture.ts`, `server/src/features/accounting/services/CashFlowReportService.ts` (:42), `server/src/features/accounting/services/ProfitDistributionService.ts` (:395), `server/src/features/accounting/services/__tests__/{emenda33.financialResult,AccountingReportService.bp-dre}.test.ts`, `server/src/features/accounting/fixtures/__tests__/ChartOfAccountsFixture.custoServicos.test.ts` |
| A0 (item 6) | `server/prisma/schema.prisma` + migração nova, `server/src/features/accounting/dtos/PostingDto.ts`, rota/controller/serviço/repositório de conta (`PostingService.ts`, `IAccountRepository.ts`, `AccountRepository.ts`), `auditCanonical.ts`, `dtoShapeSnapshot`, `public/openapi.json`, `docs.paths.ts`, `docs/adr/ADR-INCR4-bp-dre.md` (emenda), locales pt/en |
| A1–A2 (itens 7–8) | `StatementMappingFixture.ts`, `AccountingReportService.ts` (`TrialBalanceRow`, leitores), `ChartOfAccountsFixture.ts` (`statementSection` nas folhas; **depois do #1427**), `PostingService.ts` (`ensureChartOfAccounts`), testes |
| A3 (item 9) | `PostingService.ts`, repositório de conta; com F-DRM-2 (b), também `schema.prisma` + modelo novo |
| A4 (item 10) | o instalador de kit (`SectorKit*`), testes |
| A5–A7 (itens 11–13) | `server/src/jobs/` (CLI novo), `StatementMappingFixture.ts`, `AccountingReportService.ts`, `PostingDto.ts`, snapshot |

Choke points da PAR-001: `schema.prisma` (A0, A3 b), `docs.paths.ts` e `openapi.json` (A0), `ChartOfAccountsFixture.ts`
(PR-1 e A2, em conflito com o #1427). Com 2+ PRs nos mesmos arquivos, o grupo vai para `integration/dre-mapeamento`
(`D-2026-11-10-BRANCH-DE-INTEGRACAO-E-GAP-MAP-POR-FEATURE`), com o PR-1 primeiro. O grupo não tem nota de nó própria, então o
write-set fica aqui.
