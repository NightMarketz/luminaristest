# BE-INCR-IBS-CBS-2027 — BRIEF (nó IBS-CBS-2027, promove M5-ibs-cbs)

> **Sessão:** `sessao-planejamento` (agente). Saída = este documento + fold da nota do nó. **Sem código, sem `executa`, sem merge.**
> **Base:** `origin/claude/forks-ibs-cbs-2027` (PR #792, ainda fora de `main`) — de onde vêm a cédula
> `D-2026-10-21-FORKS-IBS-CBS-2027` e o ADR `ADR-INCR-IBS-CBS-2027` (D1–D13, §8, §9, §10).

## TLDR (2 linhas)

Cinco PRs fecham IBS/CBS no regime regular para 01/01/2027: **PR-1** (tabela de vigência + `cClassTrib` por serviço + parser) e **PR-2** (apuração mensal com débito por documento, CAS e provisão) cabem antes do prazo; PR-3 (crédito + antecipação), PR-4 (split no F7) e PR-5 (matriz + superfície) seguem.
**Risco principal:** em 01/2027 a apuração da CBS responde **400 nomeado** até a resolução do Senado (linha `DRAFT`); a provisão do PR-2 usa a classe contábil **provisória** (dedução da receita, F-IBS-8) até a P-IBS-4; e o início em 2027 (F-IBS-7 b) **volta ao dono** se o contador não confirmar a P-IBS-1 antes de 01/01/2027.

---

## 0. Formulário (sessao-planejamento)

- **Item a planejar:** nó `IBS-CBS-2027` — `docs/plano/nos/IBS-CBS-2027.md` (régua F, seção F1; âncora SDD §M5).
- **Autorização:** dono, chat, 2026-10-21 (relayed pela sessão de origem): *"escreve o BRIEF do IBS-CBS-2027"*. Limite: o BRIEF;
  sem código, sem `executa`, sem merge.
  - **Passo 1 (cobertura):** cobre exatamente o BRIEF deste nó. Divergência registrada: o campo `autorizacao` da nota ainda
    cita só a Q2 (a) de 20/10 ("BRIEF e código exigem pedido próprio") — **este é o pedido próprio**; o fold (§9) acrescenta a
    citação de 21/10 ao `estado_detalhe` sem trocar o campo `autorizacao` (que segue não autorizando código).
- **Insumos (fato consumado):** `docs/adr/ADR-INCR-IBS-CBS-2027.md`; `docs/plano/decisoes/D-2026-10-21-FORKS-IBS-CBS-2027.md`;
  nota do nó (`write_set`, `registros`); dossiê `pesquisas-legais/verif-2026-10-20-f1-retencoes-reinf-ibscbs/relatorio.md`
  (LC 214 compilada no Planalto [D08], Decreto 12.955 no acervo [D10]); `.claude/skills/_ARCHITECTURE-CONTRACT.md` §2, §2.1, §2.3;
  `docs/adr/ADR-PERSISTENCE-BOUNDARY-user-designed-vs-law-designed.md`.
- **Nós vizinhos:** consome X7 (`TaxAssessment`, molde CAS/provisão), LEGAL-PARAMS (`LegalParameter`, `SemLinhaVigenteError`,
  job de recálculo), F7 (`BankSettlementItem`/`BankSettlementChargePart`), X6 (`Payable.recoverableTaxLines`), parser NF-e
  (`lib/nfe.ts`); é consumido por NFE-DANFE-IBSCBS (totais) e ISS-TRANSICAO-IBS (2029+). X9 **não** muda (F-IBS-2 a).

**Verificação legal:** sem pesquisa nova. O dossiê de 20/10 tem 1 dia, a LC 214 foi lida no Planalto compilado (o acervo estava
em republicação — alerta já resolvido lá) e não surgiu evidência de texto mais novo. Os únicos textos ausentes continuam ausentes
(§6 Insumos ausentes). Cada item com regra legal cita o artigo e a [Dnn] do dossiê.

**Fronteira (STOP do CLAUDE.md):** lei desenha igual para todos + agregação mensal em volume + imutabilidade por CAS ⇒
**Prisma first-class** (ADR-PERSISTENCE-BOUNDARY; ADR D4; F-IBS-2 a). Nada aqui toca `DynamicTableService`, `RuleContext` ou
plugin. Toda integração (F7, Payable, eventos de venda) é por serviço nomeado.

## 1. Forks ratificados que este BRIEF aplica (D-2026-10-21-FORKS-IBS-CBS-2027)

| Fork | Ratificado | Efeito no checklist |
|---|---|---|
| F-IBS-1 | (a) completo | itens 1–24 |
| F-IBS-2 | (a) `ConsumptionTaxAssessment` | item 8; `TaxAssessment` intocado |
| F-IBS-3 | (a) débito = documento autorizado | itens 6–7; recálculo só aviso |
| F-IBS-4 | (a) `PENDENTE → APROPRIADO` | itens 14–16 |
| F-IBS-5 | (a) antecipar já | itens 17–18 |
| F-IBS-6 | (a) split digitado no confirm do F7 | itens 19–20; leitura do evento 110300 = emenda futura |
| F-IBS-7 | **(b) começar em 2027** (contra a recomendação) | item 10 — **condicionado à P-IBS-1** (ver §5) |
| F-IBS-8 | **provisório (a)** dedução da receita — fora do questionário, do contador | item 12 — marcado `PROVISORIO_P_IBS_4` |
| F-IBS-9 | (a) 5 PRs | §2 |
| F-IBS-10 | (a) por serviço | item 3 |

**Consequência de F-IBS-7 (b) sobre o ADR:** D9 (apuração de 2026 com `dispensaArt348`) **não é implementado**. Sai do contrato o
campo `dispensaArt348`, a linha de memória `DISPENSA_ART348`, a `COMPENSACAO_PIS_COFINS_ART348` e a invariante 5 do ADR §13.
A matriz (item 21) **não** ganha linha `CONDICIONAL` de 2026 — vale a leitura "extracontábil" do M5 de 23/09.

## 2. Fatiamento (F-IBS-9 a) — cada PR com `executa` próprio

| PR | Conteúdo | Itens | Antes de 01/01/2027? | Depende de |
|---|---|---|---|---|
| **PR-1** dado e leitura | tabela `IBS_CBS` (CBS 2027 em `DRAFT`), `cClassTrib` por serviço, parser `IBSCBS` | 1–5 | **sim** — sem fork nem contador aberto | — |
| **PR-2** apuração | competência por documento, `ConsumptionTaxAssessment`, prévia/confirmação CAS, memória, provisão 2 commits, rotas, 400 de Simples/2026 | 6–13 | **sim** — provisão com classe provisória (F-IBS-8) | PR-1 |
| **PR-3** crédito e antecipação | crédito `PENDENTE/APROPRIADO`, lista de uso/consumo, antecipação do pacote | 14–18 | desejável; a lista de uso/consumo nasce `DRAFT` até P-IBS-2 | PR-2 |
| **PR-4** split no F7 | `SPLIT_IBS_CBS` como parte do encargo | 19–20 | desejável | PR-2 |
| **PR-5** matriz e superfície | matriz de obrigações, resumo com vencimento, porta de envio, export do contador, job de recálculo | 21–24 | não bloqueia 01/2027 | PR-2 (PR-3/4 para a memória completa) |

**Linha `DRAFT` da CBS:** a linha `CBS/ALIQUOTA` com `vigenteDesde = 2027-01-01` nasce `DRAFT`, `valorInt = null`, `fonte =
"LC 214 art. 347 + Res. SF nº ___"`. Enquanto não houver linha `PUBLISHED`, qualquer apuração/conferência de CBS com data ≥
2027-01-01 que precise da alíquota ⇒ **400 nomeado**. Publicar a linha é ato do operador da plataforma (fluxo LEGAL-PARAMS
existente), não PR deste nó. Como o débito vem do documento (F-IBS-3), o 400 só atinge o que **precisa** da alíquota
(conferência do item 7 e antecipação do item 17) — F-IBS-11 (a): conferência pulada com aviso.

## 3. Checklist numerado (cada item = ≥ 1 teste)

Caminhos relativos a `server/`. Padrão de camada obrigatório (Contrato §2/§3): Route → Controller → Service → Repository →
Prisma + Policy, Factory, DTO Zod `.strict()`, soft-delete, rota em 2 toques.

### PR-1 — dado e leitura

1. **Tabela `IBS_CBS` em `legal_parameters`** (migração de dado, prólogo defensivo — SQLite não é transacional): linhas
   `CBS/ALIQUOTA` 2026-01-01→2026-12-31 = 90 bp `PUBLISHED` (art. 346 [D08]); `CBS/ALIQUOTA` 2027-01-01→null `DRAFT` sem valor
   (arts. 347, 349 I [D08]); `IBS/ALIQUOTA_UF` e `IBS/ALIQUOTA_MUN` 2027-01-01→2028-12-31 = 5 bp `PUBLISHED` (art. 344 [D08]).
   As linhas de 2026 do IBS (art. 343, 0,1%) entram `PUBLISHED` por completude da tabela, mas nenhum caminho do nó as lê
   (F-IBS-7 b). `fonte` não vazia e `fonteSha256` = sha do [D08]. Teste: leitura por data devolve a linha certa em cada faixa.
2. **`models/ibsCbsParams.ts`** (molde `pisCofinsParams.ts`): `tabelaIbsCbsDe`, `parametroIbsCbsVigente`; sem linha
   `PUBLISHED` vigente ⇒ `SemLinhaVigenteError` com mensagem nomeada ("alíquota de referência da CBS de 2027 ainda não
   publicada (LC 214 art. 349 I)"). Teste: 2027-01-15 com só `DRAFT` ⇒ erro; após inserir `PUBLISHED` ⇒ valor da linha
   (invariante ADR §13.1).
3. **`ServiceFiscalProfile.cClassTrib String?`** (migração aditiva) + DTO com a regra E0959 (6 dígitos, prefixo = CST) reusada
   do `FiscalProfileDto`; `FiscalDocumentEmissionService` monta `gIBSCBS.cClassTrib` com o do serviço e cai no
   `FiscalProfile.ibsCbsClassTrib` quando nulo (F-IBS-10 a). Teste: serviço com valor ⇒ DPS leva o do serviço; sem ⇒ do perfil;
   valor inválido ⇒ 400. Os **valores** são do contador (P-IBS-2): nenhum seed preenche `cClassTrib`.
4. **Parser `lib/nfe.ts` lê `IBSCBS`** por item (`cst`, `cClassTrib`, `vBC`, `vIBS`, `vCBS` em centavos `bigint`) e
   `IBSCBSTot`/`vNFTot` no total (ADR D10). Nota sem o grupo ⇒ `ibsCbs = undefined`, sem erro. Teste com **fixture de formato
   real** (memória "sintético ≠ formato real"); se nenhuma NF-e real com o grupo estiver no repo ⇒ Insumo ausente 5 (§6), o
   teste usa o leiaute da NT 2025.002 e o PR-1 declara isso.
5. **Gates do PR-1:** snapshot de shape do `ServiceFiscalProfileDto` (inserir só a entrada nova — memória "UPDATE do snapshot
   reordena"); `tsc` server limpo; `check:arch` sem violação nova.

### PR-2 — apuração (débito por documento)

6. **`models/ibsCbsCompetencia.ts`** (função pura, molde `issCompetencia.ts`): recebe `IbsCbsDocumento[]`, agrupa por
   competência `YYYY-MM` × tributo, soma `ibsCents`/`cbsCents` **do documento** (art. 60 § 1º [D08]; F-IBS-3 a). Só
   `AUTHORIZED`/`AUTHORIZED_DIVERGENT` vivos; cancelados fora; documento sem grupo soma 0 e incrementa
   `documentosSemGrupo` (invariante ADR §13.2). Competência = dia **escrito** do documento (memória "Date ISO UTC → scopeDay −1";
   teste com ISO real às 00:30 −03:00).
7. **Conferência** pela tabela (base × alíquota vigente) gera aviso `DIVERGENCIA_DOC_n` na memória, **nunca** muda o débito.
   Venda liquidada sem documento fiscal no mês ⇒ aviso `VENDA_SEM_DOCUMENTO` (ADR F-IBS-3). Conferência sem alíquota publicada ⇒
   pulada com aviso `CONFERENCIA_SEM_ALIQUOTA` (F-IBS-11 a, ratificado 21/10).
8. **Model `ConsumptionTaxAssessment`** (contrato §4.1) + migração aditiva + `ConsumptionTaxAssessmentRepository` (seam de tx:
   `runInTransaction`/`withTransaction`, memória "serviço não instancia tx-repo") + policy reusando `canManageTaxAssessment` +
   factory. `@@index([userId, anoCalendario, mes, tributo])`; `resetDb` (`test/helpers/db.ts`) limpa a tabela nova.
9. **`IbsCbsAssessmentService.preview/confirm`** (molde X7 Fase A): saldo = débitos − créditos `APROPRIADO` (art. 45 [D08]); no
   PR-2 créditos = 0 com linha de memória `CREDITOS_NAO_IMPLEMENTADOS_PR3` (declarado, não mudo). Confirmação com
   `expectedSupersedesId` divergente ⇒ 409; substituir mês M re-abre M+1.. em cascata (invariante §13.4). Gate de CAS **dentro
   da tx** (memória "gate autoritativo dentro da tx"). `parametrosIds/Sha256` + `entradaInformada` como no PR-4 do LEGAL-PARAMS.
10. **Bloqueios de escopo (400 nomeado em todas as rotas):** regime `SIMPLES`/`MEI` (ADR D1; art. 41 § 1º [D08]);
    `anoCalendario < 2027` ("apuração de IBS/CBS começa em 01/2027 — F-IBS-7 (b), dispensa do art. 348 § 1º"). Teste por rota.
    **Condição:** se a P-IBS-1 voltar "não basta" (§5), este item é reaberto pelo dono antes do `executa` do PR-2.
11. **Memória** (`MemoriaLinha[]`, schema do X7): `DEBITO_DOC_n`, `DIVERGENCIA_DOC_n`, `VENDA_SEM_DOCUMENTO`,
    `DOCUMENTOS_SEM_GRUPO`, `SALDO`; IBS guarda os dois bp (UF/mun) na memória e um só saldo (ADR D4).
12. **Provisão em 2 commits** (Contrato §2.3, cabeçalho `atomicUntil` com os 3 testes): commit 1 `postEntry(sourceType=
    'ibs_cbs_assessment', sourceId)`: D dedução da receita IBS/CBS / C IBS a recolher · C CBS a recolher; commit 2 CAS no
    assessment (`provisaoEntryId`); `reconcileIbsCbsProvisao()` read-first idempotente (assere a 2ª chamada). Contas vêm do
    mapeamento no perfil fiscal. **Classe provisória (F-IBS-8 a):** a memória e o histórico do lançamento levam
    `PROVISORIO_P_IBS_4`; trocar a classe depois da resposta do contador é substituição (CAS), não migração de razão.
    *Ponto aberto:* quais contas do referencial — Insumo ausente 6 / P-IBS-4.
13. **Rotas + gates do PR-2:** `POST /api/accounting/ibs-cbs-assessments/preview`, `POST /api/accounting/ibs-cbs-assessments`,
    `GET /api/accounting/ibs-cbs-assessments?anoCalendario=` (2 toques: `routes/accounting.ts` + factory); doc
    `routes/docs/accounting.ibs-cbs-assessments.paths.ts` + `docs.paths.ts` + `public/openapi.json` (guard de path-count);
    `auditCanonical.ts` ganha `tax.ibs_cbs_assessment.confirmed` / `.superseded` (ids, ano, mês, tributo, saldo — **sem PII**,
    memória "allowlist de auditoria"); snapshot de shape dos DTOs; paridade i18n pt/en para os textos de erro novos.

### PR-3 — crédito e antecipação

14. **Crédito candidato na entrada** (art. 47 [D08]; Dec. 12.955 art. 26 [D10]): `Payable.recoverableTaxLines` aceita
    `{ tributo: 'IBS'|'CBS', amountCents, status: 'PENDENTE' }` vindo do `IBSCBS` da NF-e de entrada (item 4), só regime
    regular. Formato antigo (`{accountId, amountCents}`) continua válido (união discriminada, não reescrita).
15. **Lista de uso/consumo pessoal** (art. 57 [D08]; Dec. 12.955 art. 27 [D10]) em `legal_parameters` tabela
    `IBS_CBS_USO_CONSUMO`, versionada; item da lista ⇒ crédito **não** candidato, linha `USO_CONSUMO_PESSOAL_n`. Conteúdo é do
    contador (P-IBS-2): a tabela nasce **vazia ou `DRAFT`**; teste prova o mecanismo com linha de fixture.
16. **`PENDENTE → APROPRIADO`** (F-IBS-4 a): por (i) split informado (item 19 do lado do fornecedor não existe — aqui é o
    comprovante do evento de vinculação quando houver) ou (ii) declaração do operador com `SourceDocument` (comprovante)
    obrigatório; CAS no status. Apuração soma só `APROPRIADO`; `PENDENTE` vira linha `CREDITO_NAO_APROPRIADO_n` e **nunca**
    entra em `creditosCents` (invariante §13.3). Rota própria `POST /api/accounting/payables/:id/ibs-cbs-credits/apropriar` (F-IBS-12 a, ratificado 21/10).
17. **Antecipação do pacote** (art. 10 § 4º [D08]; Dec. 12.955 art. 11 § 5º [D10]; F-IBS-5 a): venda de pacote no mês M ⇒ linha
    `ANTECIPACAO_ART10_n` na apuração de M, base = parcela paga, alíquota da data do documento ou do pagamento (o que vier
    primeiro). Lê os eventos já mapeados (`sale.package.sold`/`SaleSettled`) por serviço nomeado — o razão **não** muda (V7).
    Hipótese dos 5 dias (§ 7º) **não** aplicada.
18. **Acerto no consumo:** consumo em M+k ⇒ base = total do fornecimento; diferença a maior = débito em M+k; a menor ⇒ aviso
    `PAGAMENTO_INDEVIDO_ART38` sem automatizar restituição; cancelamento ⇒ aviso (regras do cancelamento, art. 57 do decreto),
    sem lançamento (invariante §13.6). A leitura para o salão é P-IBS-3 — a regra é da lei, o enquadramento é do contador.

### PR-4 — split payment no F7

19. **`BANK_CHARGE_KINDS` ganha `SPLIT_IBS_CBS`** (arts. 31–33 [D08]; F-IBS-6 a): parte digitada no confirm do
    `BankSettlementItem`; mapper `bank.charge` lança **D IBS/CBS a recolher / C cliente**, nunca `feeCents`; sem parte ⇒ baixa
    idêntica à de hoje (invariante §13.7). `@@unique([itemId, kind])` já garante uma parte.
20. **Split entra na apuração** do mês como extinção parcial do débito (Dec. 12.955 art. 27 [D10]) — linha
    `SPLIT_EXTINCAO_n` na memória; o saldo a recolher do item 22 desconta. Leitura automática do evento 110300 = emenda
    futura (NT 2026.006 não lida; P-IBS-7).

### PR-5 — matriz e superfície

21. **Matriz `OBRIGACAO_REGIME`** ganha `IBS_CBS_APURACAO`: REAL/PRESUMIDO `OBRIGATORIA` desde 2027-01-01 (arts. 41 § 1º, 43,
    45 § 6º [D08]); SIMPLES/MEI `NAO_SE_APLICA`. Sem linha de 2026 (F-IBS-7 b). `ObrigacaoSped` cresce.
22. **`GET /api/accounting/ibs-cbs-assessments/:id/resumo`**: saldo a recolher por tributo, vencimento de
    `IBS_CBS/VENCIMENTO` (linha `DRAFT` sem valor até P-IBS-5 ⇒ campo `vencimento: null` + aviso, não 400), memória.
23. **Porta `EnvioApuracaoIbsCbs`** (tipo + função pura em `lib/ibsCbsApuracao.ts`), adaptador nenhum (R5).
24. **Export do contador** `EXPORT_IBS_CBS_MEMO` (molde `EXPORT_TAX_ASSESSMENT_MEMO`) e **job de recálculo** do LEGAL-PARAMS
    cobre a família nova (parâmetro publicado depois da confirmação ⇒ `avisoParametroLegal`; invariante §13.10).

## 4. Contratos esboçados

### 4.1 Prisma (PR-2)

```prisma
model ConsumptionTaxAssessment {
  id                  String    @id @default(cuid())
  userId              String
  user                User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  unitId              String
  anoCalendario       Int       // >= 2027 (F-IBS-7 b)
  mes                 Int       // 1..12 (art. 43)
  tributo             String    // IBS | CBS
  regime              String    // PRESUMIDO | REAL
  debitosCents        BigInt
  creditosCents       BigInt    // só APROPRIADO
  saldoCents          BigInt    // débitos − créditos; negativo = saldo credor
  classeProvisoria    Boolean   @default(true) // F-IBS-8 até P-IBS-4
  memoria             Json
  parametrosIds       Json
  parametrosSha256    String
  entradaInformada    Json?
  avisoParametroLegal String?
  status              String    // CONFIRMED | SUPERSEDED
  supersedesId        String?
  provisaoEntryId     String?
  confirmedById       String
  confirmedAt         DateTime
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  deletedAt           DateTime?
  @@index([userId, anoCalendario, mes, tributo])
  @@map("consumption_tax_assessments")
}
// sem dispensaArt348 (D9 não implementado — F-IBS-7 b)
```

### 4.2 Zod / TS

```ts
// PR-1 — models/ibsCbsParams.ts
export type TributoConsumo = 'IBS' | 'CBS';
export interface ParametroIbsCbs { tributo: TributoConsumo; chave: 'ALIQUOTA' | 'ALIQUOTA_UF' | 'ALIQUOTA_MUN'; aliquotaBp: number; fonte: string; vigenteDesde: string; vigenteAte: string | null }
export function tabelaIbsCbsDe(linhas: readonly LinhaLegal[]): readonly ParametroIbsCbs[];        // só PUBLISHED
export function parametroIbsCbsVigente(t: readonly ParametroIbsCbs[], tributo: TributoConsumo, chave: ParametroIbsCbs['chave'], data: string): ParametroIbsCbs; // throws SemLinhaVigenteError

// PR-1 — dtos/ServiceFiscalProfileDto.ts (campo novo)
cClassTrib: z.string().regex(/^\d{6}$/).nullable().optional(), // + refine E0959 reusado

// PR-1 — lib/nfe.ts
type ParsedNfeItemIbsCbs = { cst: string; cClassTrib: string; vBCCents: bigint | null; vIBSCents: bigint | null; vCBSCents: bigint | null };
type ParsedNfeTotIbsCbs  = { vIBSCents: bigint | null; vCBSCents: bigint | null; vNFTotCents: bigint | null };

// PR-2 — models/ibsCbsCompetencia.ts
export const IbsCbsDocumentoSchema = z.object({
  fiscalDocumentId: z.string(),
  dataEmissaoLocal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),   // dia escrito, não ISO UTC
  status: z.enum(['AUTHORIZED', 'AUTHORIZED_DIVERGENT']),
  ibsCents: z.bigint().nullable(),
  cbsCents: z.bigint().nullable(),
  baseCents: z.bigint().nullable(),
  cClassTrib: z.string().regex(/^\d{6}$/).nullable(),
}).strict();

// PR-2 — dtos/IbsCbsAssessmentDto.ts
export const IbsCbsAssessmentPreviewSchema = z.object({
  anoCalendario: z.number().int().min(2027),         // F-IBS-7 b; < 2027 ⇒ 400 nomeado no serviço também
  mes: z.number().int().min(1).max(12),
  tributo: z.enum(['IBS', 'CBS']),
}).strict();
export const IbsCbsAssessmentConfirmSchema = IbsCbsAssessmentPreviewSchema.extend({
  expectedSupersedesId: z.string().nullable(),
}).strict();
export const IbsCbsAssessmentListQuerySchema = z.object({ anoCalendario: z.coerce.number().int().min(2027) }).strict();

export const MemoriaLinhaIbsCbsKind = z.enum([
  'DEBITO_DOC', 'DIVERGENCIA_DOC', 'VENDA_SEM_DOCUMENTO', 'DOCUMENTOS_SEM_GRUPO',
  'CREDITOS_NAO_IMPLEMENTADOS_PR3', 'CONFERENCIA_SEM_ALIQUOTA',                                        // some no PR-3
  'CREDITO_ENTRADA', 'CREDITO_NAO_APROPRIADO', 'USO_CONSUMO_PESSOAL',       // PR-3
  'ANTECIPACAO_ART10', 'ACERTO_ART10', 'PAGAMENTO_INDEVIDO_ART38',          // PR-3
  'SPLIT_EXTINCAO',                                                         // PR-4
  'CLASSE_PROVISORIA_P_IBS_4', 'SALDO',
]);

// PR-3 — Payable.recoverableTaxLines (união; formato X6 preservado)
export const RecoverableTaxLineSchema = z.union([
  z.object({ accountId: z.string(), amountCents: z.bigint() }).strict(),                   // X6
  z.object({ tributo: z.enum(['IBS', 'CBS']), amountCents: z.bigint(),
             status: z.enum(['PENDENTE', 'APROPRIADO']), sourceDocumentId: z.string().nullable() }).strict(),
]);
export const ApropriarCreditoSchema = z.object({
  payableId: z.string(), tributo: z.enum(['IBS', 'CBS']),
  sourceDocumentId: z.string(),                       // comprovante obrigatório (F-IBS-4 a)
  expectedStatus: z.literal('PENDENTE'),              // CAS
}).strict();

// PR-4 — F7
export const BANK_CHARGE_KINDS = [/* existentes */, 'SPLIT_IBS_CBS'] as const;

// PR-5 — resumo
export const IbsCbsResumoSchema = z.object({
  id: z.string(), tributo: z.enum(['IBS', 'CBS']), anoCalendario: z.number(), mes: z.number(),
  saldoARecolherCents: z.bigint(), vencimento: z.string().nullable(), avisos: z.array(z.string()),
}).strict();
```

### 4.3 Rotas

| Rota | PR | Policy |
|---|---|---|
| `POST /api/accounting/ibs-cbs-assessments/preview` | 2 | `canManageTaxAssessment` |
| `POST /api/accounting/ibs-cbs-assessments` | 2 | idem |
| `GET /api/accounting/ibs-cbs-assessments?anoCalendario=` | 2 | idem (leitura) |
| `POST /api/accounting/payables/:id/ibs-cbs-credits/apropriar` (F-IBS-12 a) | 3 | `canManageData` de AP |
| `GET /api/accounting/ibs-cbs-assessments/:id/resumo` | 5 | idem |

## 5. Forks do BRIEF — **RATIFICADOS 21/10** ([[D-2026-10-21-FORKS-IBS-CBS-2027-BRIEF]]): F-IBS-11 (a), F-IBS-12 (a), F-IBS-13 (a)

| Fork | Caminhos | Recomendação | Custo de errar |
|---|---|---|---|
| **F-IBS-11** Conferência sem alíquota publicada (item 7) em 01/2027 | (a) a conferência é **pulada** com aviso `CONFERENCIA_SEM_ALIQUOTA` e a apuração confirma pelo débito do documento · (b) a apuração inteira da CBS responde 400 até a linha `PUBLISHED` | **(a).** O débito é a confissão do documento (art. 60 § 1º, F-IBS-3 a); a alíquota só serve para conferir. (b) bloqueia a apuração de janeiro por um dado que ela não usa. A antecipação do pacote (item 17) **precisa** da alíquota — lá o 400 nomeado continua | médio em (b): janeiro sem apuração |
| **F-IBS-12** Onde mora a apropriação do crédito (item 16) | (a) rota própria `POST /api/accounting/payables/:id/ibs-cbs-credits/apropriar` no serviço de AP · (b) campo `creditosApropriados[]` dentro da prévia/confirmação da apuração (esboço do ADR §7) | **(a).** O status pertence ao crédito do `Payable`, não à apuração do mês; (b) faz a apuração escrever em outro agregado e mistura dois CAS na mesma chamada | médio em (b) |
| **F-IBS-13** Reabertura se P-IBS-1 voltar negativa | (a) volta ao dono como o F-IBS-7 manda e o PR-2 só recebe `executa` depois · (b) o PR-2 sai assim mesmo e 2026 vira emenda | **(a)** — é o texto da cédula ("se não for, o fork volta ao dono"); listado só para que o `executa` do PR-2 cite o estado da P-IBS-1 | baixo |

## 6. Pendente de validação externa (contador / fonte oficial — não são forks)

| # | Pergunta | Trava | Quem |
|---|---|---|---|
| **P-IBS-1** (urgente, prazo 01/01/2027) | 2026: as NFS-e/NF-e com `gIBSCBS` bastam para a dispensa do art. 348 § 1º? | condição do F-IBS-7 b (item 10) | contador |
| **P-IBS-2** | `cClassTrib`/`cst` do salão e da clínica; lista de uso/consumo pessoal (art. 57) | valores dos itens 3 e 15 | contador |
| **P-IBS-3** | o art. 10 § 4º se aplica ao pacote de sessões? há hipótese dos 5 dias? | enquadramento dos itens 17–18 | contador |
| **P-IBS-4** | classe contábil do IBS/CBS (dedução × fora do resultado) e contas do referencial | item 12 (hoje provisório a) | contador |
| **P-IBS-5** | alíquota de referência da CBS 2027 (Res. SF) e vencimento do saldo mensal | linha `DRAFT` (item 1) e item 22 | fonte oficial |
| **P-IBS-6** | apuração assistida RFB/CG-IBS do 1º mês real | oráculo do número | runbook humano |
| **P-IBS-7** | o Mercado Pago faz o split nas vendas do salão? como aparece no extrato? | item 19–20 na prática | dono + doc do MP |

## 7. Insumos ausentes

1. Resolução do Senado (CBS 2027) — mitigada pela linha `DRAFT`.
2. NT 2026.006 e tabela oficial de `cClassTrib` — não lidas em fonte oficial.
3. Regulamento do IBS (CG-IBS) e hipótese dos 5 dias.
4. Texto dos arts. 44–45 do Decreto 12.955 (prazos/vencimento) — o dossiê cita, não extrai.
5. **NF-e real com grupo `IBSCBS`** para a fixture do item 4 — não verificado se há uma no repo (não varrido, regra 2).
6. Contas do referencial para a provisão (item 12) — dependem da P-IBS-4.

## 8. Achados fora de escopo (não planejados)

1. Texto do 400 do X8 em 2027 deveria apontar para este nó (ADR §11.1).
2. Cancelamento/devolução de pacote contabiliza errado (GAP-MAP N5) — afeta o acerto do item 18.
3. `ProductFiscalProfile` (F4) com `cClassTrib` por NCM.
4. DeRE fora (P2).
5. O ADR §5 D9 e §13.5 descrevem a apuração de 2026; com o F-IBS-7 (b) ratificado eles ficam obsoletos — emenda do ADR é do
   fold que o tornar `Accepted`, não deste BRIEF.

## 9. Fold desta sessão

`docs/plano/nos/IBS-CBS-2027.md`: `estado` continua `planned`; `estado_detalhe` ganha a entrada de 21/10 (BRIEF escrito, PR deste
BRIEF, forks F-IBS-11..13 ratificados em 21/10, próximo = `executa` do PR-1); "Docs" aponta para este arquivo. `autorizacao` não muda.

## 10. Invariantes (cada uma vira teste; herdadas do ADR §13 com a 5 trocada)

1. Data ≥ 2027-01-01 sem linha CBS `PUBLISHED` ⇒ 400 nomeado onde a alíquota é necessária (a conferência é pulada com aviso — F-IBS-11 a).
2. Só documentos `AUTHORIZED`/`AUTHORIZED_DIVERGENT` vivos; sem grupo soma 0 e conta.
3. `saldoCents = debitosCents − creditosCents`; `PENDENTE` nunca soma.
4. CAS divergente ⇒ 409; substituição em cascata.
5. **`anoCalendario < 2027` ⇒ 400 nomeado** (F-IBS-7 b).
6. Antecipação em M com base = parcela; acerto em M+k.
7. `SPLIT_IBS_CBS` ⇒ D a recolher / C cliente, nunca tarifa.
8. Parser com/sem grupo.
9. Simples/MEI ⇒ 400 em toda rota.
10. Auditoria sem PII; job de recálculo preenche `avisoParametroLegal`.
