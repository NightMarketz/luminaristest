# BE-INCR-FIXED-ASSETS — Emenda 3.2 (nó C8) — BRIEF

> Sessão: `sessao-planejamento` · 2026-09-29 · base `origin/main` `9dd690b3`. **Sem código.**
> Saída desta sessão = este documento + a linha em `docs/plano/nos/C8.md` §Docs. Nenhum fork é ratificado aqui.

## 0. Contexto fixo

- **Item:** Fase 3.2 de [`PLANO-POS-CONTADOR-2026-09-23.md:103`](PLANO-POS-CONTADOR-2026-09-23.md) — emenda do nó
  [`C8`](../plano/nos/C8.md) (`estado: done`; emenda aberta no `estado_detalhe`).
- **Autorização (citável):** decisão 16 de `docs/plano/decisoes/D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE.md`
  (PR #440, lida de `origin/claude/docs-decisoes-2026-09-29` — **ainda não está em `main`**): *"Planejar
  autorizado para as 4 emendas: … 3.2 [[C8]] (R$1.200 por unidade funcional + benfeitoria + retomada do Bloco F)"*.
  A linha 17 do mesmo doc limita: *"'Planejar' autoriza BRIEF/ADR; código continua exigindo 'executa'"*.
  **Cobertura:** exata — as três partes deste BRIEF são as três nomeadas na decisão. Execução: **não autorizada**.
- **Evidência:** `docs/accounting/DOSSIE-DECISOES-2026-09-29.md` §8, linha "3.2 C8" (mesmo PR #440).
- **Insumos consumados (fato, não rediscutir):** `ADR-INCR-FIXED-ASSETS.md`; `BE-INCR-FIXED-ASSETS-brief.md`
  (itens 1-37; Bloco F = itens 23-25); `BE-INCR-FIXED-ASSETS-execution-plan.md` (A3, A6, passo 15); PRs #354-#356,
  #366, #368; corpo do commit `0548d19a` (pausa do Bloco F).
- **Nós vizinhos:** consome [[D3b]] (Anexo III), X4/e-Lalur (`LalurService.closeParteB`, `:825`), NF-e modo 4
  (`NfeImportService`); é consumido por [[FE-INCR-FIXED-ASSETS]] (FE fora deste BRIEF — casa separa BE/FE).

## 1. Estado medido do código (V = lido nesta sessão)

| # | Fato | Onde | Grau |
|---|---|---|---|
| S1 | Todo item CFOP 1551/2551 vai para `fixedAssetItems`, sem limite de valor; sem `classId` → 400 | `NfeImportService.ts:64,267-297` | V |
| S2 | `fixedAssetItem` do DTO: `classId, cProd, costCents, ncm?, qty?, nItem?` — nenhum campo de "expensar" | `PayableDto.ts:84-96` | V |
| S3 | `costCents` do item é o custo da **linha** (rateio D3), não unitário; `qty` vem de `qCom` | `NfeImportService.ts:283-293` | V |
| S4 | `FixedAssetClass` não tem prazo/`leaseEndDate`/tipo de amortização | `schema.prisma:1621-1642` | V |
| S5 | `FixedAsset` idem; quota = cumulativa por `bookAnnualRateBp ?? annualRateBp` | `schema.prisma:1687-1733`; `DepreciationService.ts:177-180` | V |
| S6 | Uma única `depreciationExpenseAccountId` por escopo (amortização de benfeitoria cai na mesma conta) | `schema.prisma:1592` | V |
| S7 | `depreciationParteBAccountId` existe e é gravado/exposto por `AccountingScopeSettingsService.ts:53,90-97` (valida que a conta M010 existe), mas **nenhum consumidor de negócio o lê** (Lalur/Depreciation não o referenciam) | `schema.prisma:1598`; grep em `server/src` | V |
| S8 | Linhas do L12 já no catálogo: `86` (adição, lalur e lacs), `161` (exclusão), `91.01` (baixa/alienação) | `fixtures/ecf-l12-linhas.json:1593,1625,2817,4547` | V |
| S9 | `LalurEntry` é **única por `(escopo, ano, trimestre, livro, codigo)`**; tem `parteBId` (indRelacao 1/3) e `journalLinks` (M312, indRelacao 2/3) | `schema.prisma:1944-1971` | V |
| S10 | `LalurParteBMovement` não tem vínculo a lançamento contábil; `origem ∈ {user, system}` | `schema.prisma:2019-2041` | V |
| S11 | `closeParteB` já deriva movimentos `system` (PF/BC) dentro da tx e escolhe conta por `codPbRfb` | `LalurService.ts:825-870` | V |
| S12 | Nenhuma ocorrência de `1071`/`2210` no código contábil | grep | V |
| S13 | Nota multi-item **não aceita** `expenseAccountId` no topo (modos XOR); o modo 4 só combina com o modo 3 | `PayableDto.ts:129-166` | V |
| S14 | O detalhamento do modo 4 **não** mora no `Payable`: vai para `SourceDocument.rawJson` como `{fixedAssetItems}`; os débitos são agrupados por `accountCode` (`groupFixedAssetDebits`); `redriveMissingDrafts` relê esse JSON e cria rascunho para **todo** item nele | `PayableService.ts:1005-1045,1118-1130,1171` | V |
| S15 | `resolveFixedAssetLines` resolve, antes da tx, a conta da classe **e a taxa por NCM** de cada item | `PayableService.ts:182-187,1202-1244` | V |
| S16 | O mapeamento do import é por item: `productRef` XOR `classId`, e o CFOP 1551/2551 **exige** `classId` | `dtos/` do mapeamento NF-e, `:24-39` | V |

## 2. Checklist de comportamentos

Numeração `E` = emenda. Cada item é testável isolado. Itens com fork dependem da ratificação indicada.

### Parte 1 — bem de até R$1.200 direto na despesa

Artefato: RIR/2018 art. 313 § 1º I e § 2º; IN RFB 1.700/2017 art. 120 caput e § 1º
(`fontes-oficiais/IN-RFB-1700-2017.txt:2493-2495`); PN CST 100/1978 itens 13, 14, 20 (via dossiê §8).

- **E1.** Constante `FIXED_ASSET_EXPENSE_LIMIT_CENTS = 120000n` num único módulo (`models/fixedAssetLimits.ts`),
  com comentário citando art. 120. Teste: valor = 120000.
- **E2.** Critério = **valor unitário da utilidade funcional autônoma**: `unitCostCents = costCents / qty` da linha
  (arredondamento: F-EM-2). Nunca o total da nota nem o da linha. Teste: linha de 3 cadeiras × R$900 (total R$2.700)
  → elegível; 1 item × R$1.300 → inelegível; nota com 2 linhas somando R$2.000, cada uma ≤ R$1.200 → ambas elegíveis.
- **E3.** A escolha é **explícita por item, no lançamento da aquisição** (PN 100/78 item 13): o mapeamento do import
  e o `fixedAssetItem` ganham `treatment: 'CAPITALIZE' | 'EXPENSE'` (default e forma do mapeamento: F-EM-1).
  `EXPENSE` exige `expenseAccountId` **por item** (conta de resultado, analítica, ativa — mesmas guardas do
  `expenseAccountId` do payable) e **não** exige `classId`. A regra XOR de S13 no topo do DTO **não muda**: a conta
  mora no item, não no topo. Mudanças forçadas: (i) o gate de S16 passa a aceitar `classId` **ou**
  `{treatment:'EXPENSE', expenseAccountId}` para 1551/2551; (ii) `resolveFixedAssetLines` (S15) **pula** a resolução
  de taxa/classe de item EXPENSE (senão um NCM sem taxa derruba uma compra que nem vai ao ativo).
- **E4.** `EXPENSE` com `unitCostCents > limite` → `ValidationError` 400 citando art. 120. (A outra hipótese do caput —
  vida útil ≤ 1 ano — fica em F-EM-3.)
- **E5.** Item `EXPENSE` debita `expenseAccountId` no mesmo lançamento do payable (mesma tx, mesma fórmula D3 de custo
  líquido) e **não** cria `FixedAsset` nem rascunho. O débito entra pelo mesmo agrupamento por `accountCode` (S14).
  O `rawJson` guarda os itens EXPENSE **com** `treatment` (trilha da escolha, PN 100/78 item 13) e o
  `redriveMissingDrafts` **filtra** `treatment==='EXPENSE'` antes de `createDraftFromPayable` — hoje ele rascunha
  tudo que está no JSON (S14), então sem o filtro o reconcile ativaria o que o usuário expensou. Teste: payable com
  1 CAPITALIZE + 1 EXPENSE → reconcile cria 1 rascunho; 2º run cria 0. JSON legado sem `treatment` = CAPITALIZE.
- **E6.** Irreversibilidade (PN 100/78 item 20): **não existe** comando "expensar ativo existente". Teste negativo
  documental: nenhum endpoint novo sobre `FixedAsset` além dos do BRIEF-mãe (guard de path-count do openapi).
- **E7.** Exceção de conjunto (IN 1.700 art. 120 § 1º): o sistema **não decide** — é declaração do usuário. Forma: F-EM-4.
- **E8.** Trilha: o lançamento do payable registra no `AuditEvent` existente os itens `EXPENSE` com `unitCostCents`
  (sem eventType novo, se o payload do evento atual comporta — senão eventType novo entra na allowlist
  `auditCanonical.ts` na mesma mudança).

### Parte 2 — benfeitoria em imóvel de terceiro

Artefato: RIR/2018 art. 331 III, 333; art. 330 § 3º (via dossiê §8, grau V). A regra "min(prazo do contrato, vida
útil)" **não** foi verificada (PN CST 210/73 e 104/75 não lidos) → **não entra no checklist**; está em §5 e F-EM-5.

- **E9.** `FixedAssetClass.kind: 'DEPRECIATION' | 'AMORTIZATION_LEASEHOLD'` (default `DEPRECIATION`; linhas
  existentes migram para o default). Onde mora o prazo: F-EM-6.
- **E10.** Ativo de classe `AMORTIZATION_LEASEHOLD` exige `leaseEndDate` (date-only, validado de calendário — não só
  regex; memória `date-only-regex-nao-valida-calendario`) **>** `activatedAt`; ausente → 400.
- **E11.** Quota mensal linear pelo **prazo restante**: `n = meses de activatedAt a leaseEndDate` (inclusivo, mesma
  `monthsBetweenInclusive`); cumulativa `cumK = min(base × k / n, base)` com resíduo no último mês
  (cumulativa, como o item 12 do BRIEF-mãe — nunca soma de quotas arredondadas). `annualRateBp` fica como snapshot
  informativo; a quota ignora a taxa. Teste: base 12.000, contrato de 24 meses → 500/mês, Σ = 12.000 exato no mês 24;
  base 10.000 / 3 meses → 3.333, 3.333, 3.334.
- **E12.** Lançamento: D conta de amortização (F-EM-7) / C `accumulatedDepreciationAccountId` da classe (reuso do
  campo — conta "amortização acumulada" é escolha do plano de contas do cliente). `sourceType` igual ao da depreciação
  (reuso de idempotência `asset:yyyy-mm`).
- **E13.** Alteração de `leaseEndDate` depois de ativado (renovação/rescisão): F-EM-8. Até ratificar: **imutável**
  após `activate` (400).
- **E14.** Contrato encerrado com saldo (rescisão antecipada): baixa pelo `dispose` já existente (valor residual
  vira perda) — sem comando novo. Teste: dispose antes de `leaseEndDate` baixa o líquido.

### Parte 3 — retomada do Bloco F (itens 23-25 do BRIEF-mãe)

Artefato: BRIEF-mãe itens 23-25; Leiaute 12 linhas 86/161/91.01 (S8); planilha PARTEB_PADRAO L12 (dossiê §8/D-6):
`1071` contábil > fiscal, `2210` fiscal > contábil (RIR art. 321), `3130` petróleo/gás — **sentido = inferido**.

- **E15.** `IFixedAssetReader.listForParteB(scope, year, quarter)` (interface, execution-plan A6) injetada via factory
  no `LalurService`; devolve só ativos com `bookAnnualRateBp ≠ null` **ou** `residualValueCents > 0`, status
  `ACTIVE | FULLY_DEPRECIATED | DISPOSED-no-trimestre`, com quota contábil postada e quota fiscal teórica do trimestre.
- **E16.** Diferença trimestral por ativo = Σ(quota fiscal − quota contábil) — fórmula do item 23 inalterada;
  contábil > fiscal → **adição** (linha `86`); fiscal > contábil → **exclusão** (linha `161`); baixa/alienação com
  saldo → `91.01`. Fiscal acumulada atingiu `costCents` (art. 124 § 5) → adição do excedente e baixa do controle.
- **E17.** Registro: forma decidida em **F-EM-9** (o conflito M312 × Parte B que pausou o PR-3). Recomendação (a):
  `LalurEntry` Parte A `origem`-sistema com `indRelacao='1'` + `parteBId` **e** `LalurParteBMovement system` na
  mesma tx do `closeParteB`, substituídos a cada refechamento (padrão `:838`). Sem M312 nesta emenda.
- **E18.** Conta da Parte B escolhida por `codPbRfb` + `codTributo` (como o PF/BC em `LalurService.ts:~850`):
  diferença ≠ 0 sem conta → `ValidationError` nomeando o código esperado (`1071` ou `2210`) e o tributo. Forma da
  configuração: F-EM-10.
- **E19.** Guard: `codPbRfb = '3130'` nunca é escolhido automaticamente (teste: escopo só com conta 3130 → 400, não usa).
- **E20.** Default (sem override, residual 0, sem benfeitoria) → diferença **exatamente 0** → **0** `LalurEntry`/
  movimentos `system` novos (item 25 do BRIEF-mãe).
- **E21.** Benfeitoria (Parte 2) entra no Bloco F **só** se F-EM-11 disser que amortização contábil ≠ fiscal;
  até lá, `listForParteB` exclui `AMORTIZATION_LEASEHOLD` (diferença = 0 por construção).
- **E22.** Colisão com `@@unique(... livro, codigo)` (S9): se já existe `LalurEntry` **do usuário** com `86`/`161`
  no período → comportamento de F-EM-12. Até ratificar: 400 explicando a colisão.

### Gates da mudança (pertencem ao checklist)

- **E23.** Snapshot de shape dos DTOs Zod atualizado (`PayableDto`, `FixedAssetClassDto`, `FixedAssetDto`, settings).
- **E24.** Migração única (ver §3.3), colunas **no fim**, `smoke:migration` com abort simulado; `resetDb()` já cobre
  as tabelas (sem tabela nova).
- **E25.** Paridade i18n pt/en das mensagens novas; openapi `docs:generate` sem path novo (E6).
- **E26.** `tsc --noEmit` limpo; `npm run test:integration` para `closeParteB` com ativo override.

## 3. Contratos (esboço materializável)

### 3.1 `PayableDto.ts` — `fixedAssetItem`

```ts
const fixedAssetItem = z
  .object({
    treatment: z.enum(['CAPITALIZE', 'EXPENSE']).default('CAPITALIZE'), // F-EM-1
    classId: z.string().min(1).optional(),          // obrigatório se CAPITALIZE
    expenseAccountId: z.string().min(1).optional(), // obrigatório se EXPENSE
    setDeclared: z.boolean().optional(),            // F-EM-4 — "atividade exige conjunto" → força CAPITALIZE
    cProd: z.string().min(1),
    costCents: cents,
    ncm: z.string().min(1).optional(),
    qty: z.number().int().positive().optional(),
    nItem: z.number().int().positive().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.treatment === 'CAPITALIZE' && !v.classId) ctx.addIssue({ code: 'custom', path: ['classId'], message: 'classId obrigatório para CAPITALIZE' });
    if (v.treatment === 'EXPENSE' && !v.expenseAccountId) ctx.addIssue({ code: 'custom', path: ['expenseAccountId'], message: 'expenseAccountId obrigatório para EXPENSE' });
    if (v.treatment === 'EXPENSE' && v.classId) ctx.addIssue({ code: 'custom', path: ['classId'], message: 'EXPENSE não leva classId' });
    if (v.treatment === 'EXPENSE' && v.setDeclared) ctx.addIssue({ code: 'custom', path: ['setDeclared'], message: 'conjunto declarado exige CAPITALIZE (IN 1.700 art. 120 § 1º)' });
  });
// Limite (E4) é regra de SERVIÇO (precisa de qty resolvida do qCom), não do DTO.
```

> Zod 4: `.default()` dentro de `.partial()` reaplica o default (memória `zod4-partial-aplica-default-reseta-campo`)
> — este schema não é usado em update parcial; conferir na execução.

Mapeamento do import (NF-e): o mapa `cProd → classId` passa a aceitar `cProd → { treatment, classId? | expenseAccountId? }`
(forma exata do DTO de mapeamento depende de F-EM-1).

### 3.2 Classe / ativo / settings

```ts
// FixedAssetClassDto (create/update)
kind: z.enum(['DEPRECIATION', 'AMORTIZATION_LEASEHOLD']).default('DEPRECIATION'),
amortizationExpenseAccountId: z.string().min(1).optional(), // só se F-EM-7 → b

// FixedAssetDto (create) — só se F-EM-6 → a (prazo no ativo)
leaseEndDate: dateOnly('leaseEndDate').optional(), // obrigatório (serviço) quando class.kind = AMORTIZATION_LEASEHOLD

// AccountingScopeSettingsDto — F-EM-10 (b recomendado): nenhum campo novo; depreciationParteBAccountId
// é DEPRECADO de leitura (resolve por codPbRfb). Se F-EM-10 → a: 4 FKs {1071,2210} × {I,C}.
```

### 3.3 Migração (única, `YYYYMMDDhhmmss_c8_emenda_3_2`)

```sql
-- sem tabela nova; só colunas, no fim (SQLite ADD COLUMN não tem IF NOT EXISTS — memória migracao-sqlite-nao-e-transacional)
ALTER TABLE fixed_asset_classes ADD COLUMN kind TEXT NOT NULL DEFAULT 'DEPRECIATION';
ALTER TABLE fixed_assets        ADD COLUMN leaseEndDate DATETIME;           -- F-EM-6 a
-- condicional a F-EM-7 b:
ALTER TABLE fixed_asset_classes ADD COLUMN amortizationExpenseAccountId TEXT REFERENCES accounts(id) ON DELETE RESTRICT;
-- condicional a F-EM-9 a: coluna de origem em lalur_entries (hoje não existe — S9)
ALTER TABLE lalur_entries       ADD COLUMN origem TEXT NOT NULL DEFAULT 'user';
```

Payable: **nenhuma coluna** — o item EXPENSE vive no `SourceDocument.rawJson` junto com os de imobilizado (S14).

### 3.4 Leitor do Bloco F

```ts
export interface IFixedAssetReader {
  listForParteB(scope: AccountingScope, year: number, quarter: LalurQuarter): Promise<Array<{
    assetId: string;
    fiscalQuotaCents: bigint;   // cumulativa com annualRateBp, base = costCents
    bookQuotaCents: bigint;     // soma das quotas postadas no trimestre
    disposedInQuarter: boolean; // → 91.01
    fiscalAccumCents: bigint;   // p/ art. 124 § 5
  }>>;
}
```

## 4. Forks — todos RATIFICAÇÃO PENDENTE

| Fork | Pergunta | Caminhos | Recomendação |
|---|---|---|---|
| **F-EM-1** | Default do `treatment` e onde o usuário escolhe | (a) default `CAPITALIZE`; EXPENSE só explícito, por item, no mapeamento do import · (b) sugerir `EXPENSE` automaticamente quando unitário ≤ limite · (c) default `EXPENSE` abaixo do limite | **(a)** — PN 100/78 item 13 põe a escolha no lançamento; auto-sugestão (b) é FE, não muda o contrato; (c) decide pelo contribuinte |
| **F-EM-2** | `unitCostCents` quando `costCents` não divide por `qty` | (a) comparar `costCents ≤ limite × qty` (sem divisão) · (b) teto da divisão | **(a)** — exato em inteiros, sem arredondamento. **Base comparada = custo líquido do item** (rateio D3 com frete, sem os créditos recuperáveis — S3); que o "valor unitário" do art. 120 seja o custo de aquisição nesse sentido é **inferido** (RIR art. 301 não lido nesta sessão) → §5 item 5 |
| **F-EM-3** | Hipótese "vida útil ≤ 1 ano" (2ª do caput do art. 120) | (a) fora desta emenda · (b) flag `usefulLifeUpToOneYear` que libera EXPENSE acima do limite | **(a)** — a decisão 16 nomeia só o R$1.200; (b) vira achado fora de escopo |
| **F-EM-4** | Exceção de conjunto (§ 1º) | (a) só declarativa: `setDeclared` força CAPITALIZE, sem heurística · (b) heurística por NCM/qty · (c) ignorar | **(a)** — a lei fala da atividade, que o sistema não conhece |
| **F-EM-5** | Prazo da benfeitoria | (a) só prazo restante do contrato (V) · (b) min(contrato, vida útil) (NV) | **(a)** agora; (b) só após leitura do PN CST 210/73 e 104/75 (§5) |
| **F-EM-6** | Onde mora o prazo | (a) `leaseEndDate` no **ativo** · (b) na classe | **(a)** — contratos diferentes por imóvel; a classe diz só o *tipo* |
| **F-EM-7** | Conta de despesa da amortização | (a) reusa `depreciationExpenseAccountId` · (b) `amortizationExpenseAccountId` na classe | **(b)** — DRE/referencial separa depreciação de amortização; confirmar código referencial com o contador (§5) |
| **F-EM-8** | Renovação/rescisão do contrato | (a) imutável após ativação; rescisão = dispose · (b) comando `extendLease` com recálculo prospectivo | **(a)** nesta emenda; (b) quando o 1º cliente tiver contrato renovado |
| **F-EM-9** | Forma do registro Bloco F (a pausa do PR-3) | (a) `LalurEntry` Parte A (86/161/91.01, `indRelacao='1'`, `parteBId`) + `LalurParteBMovement system` · (b) só `LalurParteBMovement` · (c) (a) + M312 ligando os lançamentos de quota | **(a)** — Parte A é onde a adição/exclusão afeta a base; Parte B é o controle; M312 (c) não é exigido por indRelacao 1 (S9). **Inferido:** `indRelacao='1'` (só Parte B) × `'3'` (Parte B + conta contábil, exige `accountId`) não foi conferido no manual da ECF — o executor confere p.245-247 antes de fixar |
| **F-EM-10** | Configuração da conta Parte B | (a) 4 FKs em settings (`1071`/`2210` × IRPJ/CSLL) · (b) resolver por `codPbRfb`+`codTributo` nas contas M010 do exercício, como o PF/BC (S11) | **(b)** — reuso do padrão existente; a coluna S7 (já exposta na API de settings) fica deprecada — remoção = mudança de contrato, fold posterior |
| **F-EM-11** | Benfeitoria tem diferença contábil × fiscal? | (a) não — contábil = fiscal pelo prazo · (b) sim | **(a)** até o contador dizer o contrário |
| **F-EM-12** | Colisão com LalurEntry manual 86/161 | (a) 400 · (b) somar sistema ao manual numa linha só · (c) mudar a unique para incluir `origem` | **(a)** — explícito; (c) mexe em invariante do e-Lalur |
| **F-EM-13** | Fatiamento | (a) 1 PR · (b) 3 PRs seriais (P1 R$1.200 → P2 benfeitoria → P3 Bloco F), migração no P1 com todas as colunas | **(b)** — partes independentes; P3 depende da confirmação do contador (§5) |

## 5. Pendente de validação externa (não entra no checklist como decidido)

1. **Sentido dos códigos PARTEB_PADRAO** `1071` (contábil > fiscal) × `2210` (fiscal > contábil, RIR 321) — inferido
   da planilha L12; **confirmar com o contador** (alinhado ao follow-up 0.8a do plano pós-contador). Bloqueia P3.
2. **PN CST 210/1973 e 104/1975** — regra "min(contrato, vida útil)". Não lidos. Bloqueia F-EM-5 (b).
3. **Código do referencial** para despesa de amortização de benfeitoria (F-EM-7) — contador.
4. **CSLL**: a diferença de depreciação se aplica também ao e-Lacs (linha `86` existe no lacs, S8)? — inferido que sim;
   confirmar. Define se E16 gera 1 ou 2 linhas por ativo.
5. **Base do limite de R$1.200** = custo de aquisição líquido dos tributos recuperáveis, com frete rateado (F-EM-2) —
   inferido; contador confirma.

## 6. Insumos ausentes (pausados, não varridos — regra 2)

- Nenhum restante: os dois ausentes da 1ª versão (persistência dos itens; DTO do mapeamento) foram lidos na
  2ª passada → S14/S16.

## 7. Achados fora de escopo

- Hipótese "vida útil ≤ 1 ano" do art. 120 (F-EM-3 b) — frente própria se o dono quiser.
- Remoção da coluna `depreciationParteBAccountId` se F-EM-10 → (b) — fold posterior.
- FE (mapeamento com `treatment`, `leaseEndDate` no form do ativo) — nó [[FE-INCR-FIXED-ASSETS]].
