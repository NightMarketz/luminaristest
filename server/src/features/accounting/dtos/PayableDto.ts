import { z } from 'zod';
import { MAX_CENTS } from '../models/money';
import { isValidDateOnly } from '../models/dates';
import { PAYABLE_STATUSES, PAYMENT_METHODS } from '../models/Payable.model';
import { queryBoolean } from './queryPrimitives';
import { TRIBUTOS_RETENCAO } from '../models/retencaoParams';
import { FIXED_ASSET_TREATMENTS } from '../models/fixedAssetLimits';

/**
 * PayableDto — Contas a Pagar (INCR-AP) request schemas. Money is INTEGER CENTS guarded by
 * `MAX_CENTS` (the policy ceiling shared with the ledger — persistence is BigInt since
 * BE-INCR-MONEY-BIGINT, F-W2B-1/2a; ACC-014); dates are
 * date-only validated by `isValidDateOnly` (regex + round-trip — `new Date('2026-02-30')`
 * silently rolls to 03-02, class-fix `date-only-regex-nao-valida-calendario`). Every schema is
 * `.strict()` so a typo'd field fails loud instead of being silently dropped.
 */

const cents = z
  .number()
  .int()
  .positive()
  .max(MAX_CENTS, { message: `amountCents excede o limite suportado (máx ${MAX_CENTS}).` });

const dateOnly = (field: string) =>
  z.string().refine(isValidDateOnly, `${field} deve ser uma data real YYYY-MM-DD`);

/** @openapi
 * components:
 *   schemas:
 *     CreatePayableInput:
 *       type: object
 *       required: [unitId, supplierName, description, issueDate, dueDate, amountCents]
 *       properties:
 *         unitId:              { type: string }
 *         supplierName:        { type: string, description: "Snapshot do nome do fornecedor (F1)" }
 *         supplierRef:         { type: string, description: "Ref escopada a uma linha de fornecedor em DynamicTable (F1 rota c) — não é FK" }
 *         counterpartyId:      { type: string, description: "FK a uma Counterparty(SUPPLIER) desta unidade (INCR-COUNTERPARTY / A1); re-escopada no service (SEC-A1-1). OPCIONAL no corpo, NOT NULL na linha (SEC-A1-5): omitir faz o service achar-ou-cunhar a contraparte pelo supplierName" }
 *         documentNumber:      { type: string, description: "Nº da NF/documento; parte da chave de negócio" }
 *         description:         { type: string }
 *         issueDate:           { type: string, description: "Data-only YYYY-MM-DD — competência do reconhecimento" }
 *         dueDate:             { type: string, description: "Data-only YYYY-MM-DD — vencimento" }
 *         amountCents:         { type: integer, minimum: 1, maximum: 2147483647, description: "Valor em centavos inteiros. Teto de POLÍTICA (não de persistência — a coluna é BigInt desde BE-INCR-MONEY-BIGINT): acima disso a API responde 400. Guarda contra erro de digitação/ordem de grandeza, não limite técnico." }
 *         expenseAccountId:    { type: string, description: "Id de uma conta-folha nature=Expense (contrapartida do reconhecimento). XOR com inventoryProductRef+inventoryQty (INCR-INVENTORY D3(b))." }
 *         inventoryProductRef: { type: string, description: "Compra de estoque (INCR-INVENTORY D3(b)): ref DynamicTable do produto; débito vai a 1.1.6 Estoques + emite StockMovement INBOUND. Exige inventoryQty; XOR com expenseAccountId." }
 *         inventoryQty:        { type: integer, minimum: 1, description: "Unidades recebidas nesta compra de estoque; pareado com inventoryProductRef. amountCents é o valor TOTAL (evita arredondamento por-unidade)." }
 *         withholdings:
 *           type: array
 *           description: "RETENCOES-FONTE PR-2 (item 12): sobrescrita da retenção calculada, SÓ PARA MENOS e com motivo (ADR D5); para mais ou tributo sem linha calculada → 400. Só em título de despesa de serviço."
 *           items:
 *             type: object
 *             required: [tributo, amountCents, motivo]
 *             properties:
 *               tributo:     { type: string, enum: [IRRF, CSLL, COFINS, PIS, INSS, ISS] }
 *               amountCents: { type: integer, minimum: 0, maximum: 2147483647 }
 *               motivo:      { type: string, minLength: 3, maxLength: 140 }
 *         pfDeducoes:
 *           type: object
 *           description: "RETENCOES-FONTE PR-2 (item 11): deduções do IRRF de PF (Lei 9.250 art. 4º). Ausente com contraparte PF → 0 dependentes e desconto simplificado."
 *           properties:
 *             dependentes:      { type: integer, minimum: 0, maximum: 30 }
 *             previdenciaCents: { type: integer, minimum: 0 }
 *             pensaoCents:      { type: integer, minimum: 0 }
 *         documentoSerie:      { type: string, description: "Série da NF (R-2010 serie) — RETENCOES-FONTE PR-2" }
 *         fixedAssetItems:
 *           type: array
 *           description: "BE-INCR-FIXED-ASSETS PR-5: itens de imobilizado da NF-e (declarados pelo classId do operador — ITEM-DESTINATION emenda 29/09) — combinável SÓ com inventoryMultiItem/inventoryItems (nota mista, 2 débitos). Debita class.costAccountId; NUNCA StockMovement."
 *           items:
 *             type: object
 *             required: [cProd, costCents]
 *             properties:
 *               treatment: { type: string, enum: [CAPITALIZE, EXPENSE], description: "C8 emenda 3.2 (IN RFB 1.700 art. 120): ausente = CAPITALIZE (ativar). EXPENSE = direto na despesa — unitário ≤ R$ 1.200 ou vida útil ≤ 1 ano declarada; escolha irreversível" }
 *               classId:   { type: string, description: "Obrigatório com CAPITALIZE; proibido com EXPENSE" }
 *               expenseAccountId: { type: string, description: "Obrigatório com EXPENSE — folha de despesa do escopo" }
 *               setDeclared: { type: boolean, description: "Faz parte de um conjunto (art. 120 § 1º) — exige CAPITALIZE" }
 *               usefulLifeUpToOneYear: { type: boolean, description: "Vida útil ≤ 1 ano (2ª hipótese do art. 120) — só com EXPENSE; libera acima do limite" }
 *               cProd:     { type: string }
 *               costCents: { type: integer, minimum: 1, maximum: 2147483647 }
 *               ncm:       { type: string, description: "Exigido para o casamento da taxa pelo Anexo III — ausente ou sem correspondência única → 400 ANTES de qualquer escrita" }
 *               qty:       { type: integer, minimum: 1, default: 1 }
 *               nItem:     { type: integer, minimum: 1, description: "Posição da linha na NF-e — chave do rascunho; ausente numa criação manual usa o índice no array" }
 *         insumoItems:
 *           type: array
 *           description: "ITEM-DESTINATION (F-ID-3 a): itens de NF-e usados como insumo do serviço — combinável SÓ com inventoryMultiItem. Debitam accountId (conta de insumo do perfil fiscal, Expense folha); NUNCA StockMovement nem estoque físico."
 *           items:
 *             type: object
 *             required: [accountId, productRef, cProd, nItem, costCents]
 *             properties:
 *               accountId:   { type: string }
 *               productRef:  { type: string }
 *               cProd:       { type: string }
 *               nItem:       { type: integer, minimum: 1 }
 *               costCents:   { type: integer, minimum: 1, maximum: 2147483647 }
 *               description: { type: string }
 *         attachmentId:        { type: string, description: "Id de um DocumentAttachment já enviado, anexado ao lançamento de reconhecimento (F4)" }
 */
/** One received SKU of a multi-item NF-e purchase (BE-INCR-NFE A2). `valueCents` is the item's SHARE
 *  of the note's acquisition cost after the header rateio (D3); Σ over items === amountCents (the DTO
 *  re-checks this tie-out below, ACC-014/T4). Guarded by MAX_CENTS like every money field. */
/** X6 F-X6-8 (a): crédito a recuperar reconhecido NO MESMO entry da nota (D conta 1.1.x a recuperar). */
const recoverableTaxLine = z
  .object({
    accountId: z.string().min(1),
    amountCents: cents,
    kind: z.enum(['ICMS', 'PIS_COFINS']),
    // X8 item 5 (F-X8-7 a): na linha PIS_COFINS, a base e as duas parcelas (pisCents + cofinsCents = amountCents).
    baseCents: z.number().int().min(0).max(MAX_CENTS).optional(),
    pisCents: z.number().int().min(0).max(MAX_CENTS).optional(),
    cofinsCents: z.number().int().min(0).max(MAX_CENTS).optional(),
  })
  .strict()
  .superRefine((l, ctx) => {
    const split = [l.baseCents, l.pisCents, l.cofinsCents].some((v) => v !== undefined);
    if (split && l.kind !== 'PIS_COFINS') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'baseCents/pisCents/cofinsCents só cabem na linha PIS_COFINS.', path: ['kind'] });
    }
    if ((l.pisCents === undefined) !== (l.cofinsCents === undefined)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'pisCents e cofinsCents vêm juntos.', path: ['pisCents'] });
    } else if (l.pisCents !== undefined && l.pisCents + l.cofinsCents! !== l.amountCents) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `pisCents (${l.pisCents}) + cofinsCents (${l.cofinsCents}) deve igualar amountCents (${l.amountCents}).`, path: ['pisCents'] });
    }
  });

/**
 * IBS-CBS-2027 PR-3 (BRIEF item 14; F-IBS-4 a; dono 21/10 "razão completo"): crédito de IBS/CBS da NF-e de entrada — D conta
 * de IBS/CBS a recuperar no MESMO entry, nasce `PENDENTE` (a apropriação, item 16, tem rota própria — F-IBS-12 a). Só no
 * regime regular, desde 2027 (LC 214 art. 47). `amountCents` = 0 com `usoConsumoCents` > 0 quando todo o IBS/CBS da nota é
 * de uso/consumo pessoal (art. 57, item 15): a linha só guarda a memória e não vira lançamento.
 */
export const IbsCbsCreditLineSchema = z
  .object({
    tributo: z.enum(['IBS', 'CBS']),
    accountId: z.string().min(1).nullable(),
    amountCents: z.number().int().min(0).max(MAX_CENTS),
    status: z.literal('PENDENTE'),
    sourceDocumentId: z.null(),
    usoConsumoCents: z.number().int().min(0).max(MAX_CENTS).optional(),
  })
  .strict()
  .superRefine((l, ctx) => {
    if (l.amountCents > 0 && l.accountId === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `crédito de ${l.tributo} > 0 exige a conta de ${l.tributo} a recuperar.`, path: ['accountId'] });
    }
    if (l.amountCents === 0 && !l.usoConsumoCents) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `linha de ${l.tributo} sem crédito nem uso/consumo — omita a linha.`, path: ['amountCents'] });
    }
  });

/** X6 (linha por `kind`) ∪ IBS/CBS (linha por `tributo`) — união, o formato X6 não muda (BRIEF §4.2). */
const recoverableTaxLineUnion = z.union([recoverableTaxLine, IbsCbsCreditLineSchema]);
export type RecoverableTaxLineInput = z.infer<typeof recoverableTaxLineUnion>;
export const isIbsCbsCreditLine = (l: RecoverableTaxLineInput): l is z.infer<typeof IbsCbsCreditLineSchema> => 'tributo' in l;

const inventoryItem = z
  .object({
    productRef: z.string().min(1),
    qty: z.number().int().positive(),
    valueCents: cents,
    description: z.string().min(1).optional(),
  })
  .strict();

/** One CFOP 1551/2551 item of a multi-item NF-e purchase (BE-INCR-FIXED-ASSETS PR-5, F-FA12 → a):
 *  debits `class.costAccountId` (1.2.x) — NEVER a StockMovement. `qty` feeds the eventual
 *  `FixedAsset.quantity` (item 22); optional/default 1 for a direct (non-NF-e) mode-4 payable, where
 *  there is no `qCom` to derive it from. */
const fixedAssetItem = z
  .object({
    // C8 emenda 3.2 (E3, F-EM-1 → a): escolha EXPLÍCITA por item no lançamento da aquisição (PN CST 100/78 item 13);
    // ausente = CAPITALIZE (padrão ativar; `.optional()` em vez de `.default()` para o JSON legado e os chamadores
    // internos lerem o mesmo "ausente = ativar"). EXPENSE = IN RFB 1.700 art. 120 — o limite (E4) é regra de SERVIÇO.
    treatment: z.enum(FIXED_ASSET_TREATMENTS).optional(),
    classId: z.string().min(1).optional(), // obrigatório se CAPITALIZE
    expenseAccountId: z.string().min(1).optional(), // obrigatório se EXPENSE (folha de despesa do escopo)
    setDeclared: z.boolean().optional(), // F-EM-4 → e (E7): "faz parte de um conjunto" (art. 120 § 1º) — força CAPITALIZE
    usefulLifeUpToOneYear: z.boolean().optional(), // F-EM-3 → b (E4b): libera EXPENSE acima do limite (2ª hipótese do art. 120)
    cProd: z.string().min(1),
    costCents: cents,
    ncm: z.string().min(1).optional(),
    qty: z.number().int().positive().optional(),
    // BE-INCR-FIXED-ASSETS PR-5 (review #366, achado 3): posição da linha na NF-e — a chave real
    // do sourceItemRef do rascunho (nunca cProd, que pode repetir em 2 linhas de imobilizado
    // distintas). Ausente numa criação MANUAL (fora de NF-e) → o service usa o índice no array.
    nItem: z.number().int().positive().optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    const expense = v.treatment === 'EXPENSE';
    const issue = (path: string, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (!expense && !v.classId) issue('classId', 'classId obrigatório para CAPITALIZE (ativar o bem).');
    if (expense && !v.expenseAccountId) issue('expenseAccountId', 'expenseAccountId obrigatório para EXPENSE (IN RFB 1.700 art. 120).');
    if (expense && v.classId) issue('classId', 'EXPENSE não leva classId — o bem não vai ao ativo.');
    if (!expense && v.expenseAccountId) issue('expenseAccountId', 'expenseAccountId só cabe em EXPENSE.');
    if (expense && v.setDeclared) issue('setDeclared', 'conjunto declarado exige CAPITALIZE (IN RFB 1.700 art. 120 § 1º).');
    if (v.usefulLifeUpToOneYear && !expense) issue('usefulLifeUpToOneYear', 'vida útil ≤ 1 ano só se aplica a EXPENSE (IN RFB 1.700 art. 120).');
  });

/** ITEM-DESTINATION (BRIEF item 3 / F-ID-3 a): item de NF-e usado como INSUMO do serviço — despesa na
 *  entrada (D `accountId`, a conta de insumo do perfil fiscal, resolvida pelo `NfeImportService`), NUNCA
 *  StockMovement nem estoque físico. Só no modo 3, como `fixedAssetItems`. `productRef`/`cProd`/`nItem` são
 *  rastreio (descrição da linha), não roteamento. */
const insumoItem = z
  .object({
    accountId: z.string().min(1),
    productRef: z.string().min(1),
    cProd: z.string().min(1),
    nItem: z.number().int().positive(),
    costCents: cents,
    description: z.string().min(1).optional(),
  })
  .strict();

/**
 * BE-INCR-RETENCOES-FONTE PR-2 (item 12, §5.3) — sobrescrita de uma retenção calculada, SÓ PARA MENOS, com motivo (ADR D5).
 * Para mais que o calculado ⇒ 400 no serviço (o cálculo é o que a lei manda; reter a mais exige outro fundamento).
 */
export const WithholdingOverrideSchema = z
  .object({
    tributo: z.enum(TRIBUTOS_RETENCAO),
    amountCents: z.number().int().min(0).max(MAX_CENTS),
    motivo: z.string().trim().min(3).max(140),
  })
  .strict();
export type WithholdingOverrideInput = z.infer<typeof WithholdingOverrideSchema>;

/**
 * Item 11 (F-RET-17 a) — deduções do IRRF de PF informadas no pagamento (Lei 9.250 art. 4º): dependentes (quantidade),
 * previdência e pensão. Sem `.partial()` (memória Zod 4). Ausente com contraparte PF ⇒ 0 dependentes e desconto simplificado.
 */
export const PfDeducoesSchema = z
  .object({
    dependentes: z.number().int().min(0).max(30),
    previdenciaCents: z.number().int().min(0).max(MAX_CENTS).default(0),
    pensaoCents: z.number().int().min(0).max(MAX_CENTS).default(0),
  })
  .strict();
export type PfDeducoesInput = z.infer<typeof PfDeducoesSchema>;

export const CreatePayableSchema = z
  .object({
    unitId: z.string().min(1),
    supplierName: z.string().min(1),
    supplierRef: z.string().min(1).optional(),
    counterpartyId: z.string().min(1).optional(),
    documentNumber: z.string().min(1).optional(),
    description: z.string().min(1),
    issueDate: dateOnly('issueDate'),
    dueDate: dateOnly('dueDate'),
    amountCents: cents,
    expenseAccountId: z.string().min(1).optional(),
    inventoryProductRef: z.string().min(1).optional(),
    inventoryQty: z.number().int().positive().optional(),
    // BE-INCR-NFE F0-1b (F-NFE7→a): multi-item NF-e purchase. `inventoryMultiItem` is the discriminator
    // that routes the recognition debit to 1.1.6 Estoques WITHOUT a single-SKU pair; `inventoryItems`
    // carries the per-SKU breakdown the create path drives as N StockMovement INBOUND (sourceId=payableId).
    inventoryMultiItem: z.boolean().optional(),
    inventoryItems: z.array(inventoryItem).optional(),
    // BE-INCR-FIXED-ASSETS PR-5 (F-FA12 → a): modo 4, combinável SÓ com o modo 3 (inventoryMultiItem).
    // Uma nota mista tem AMBOS inventoryItems e fixedAssetItems não-vazios; uma nota 100% CFOP
    // 1551/2551 tem inventoryItems=[]/ausente — o gate abaixo exige ao menos um dos dois.
    fixedAssetItems: z.array(fixedAssetItem).optional(),
    // ITEM-DESTINATION (F-ID-3 a): insumo do serviço → despesa na entrada; só no modo 3.
    insumoItems: z.array(insumoItem).optional(),
    // X6 F-X6-8 (a): só com inventoryMultiItem; `amountCents` (o que se deve ao fornecedor) = Σ itens (estoque
    // líquido) + Σ fixedAssetItems (imobilizado) + Σ recoverableTaxLines (créditos). Ausente = comportamento
    // anterior (Σ itens === amountCents).
    // IBS-CBS-2027 PR-3 (item 14): até 2 linhas X6 (ICMS, PIS_COFINS) + 1 por tributo de IBS/CBS.
    recoverableTaxLines: z.array(recoverableTaxLineUnion).max(4).optional(),
    attachmentId: z.string().min(1).optional(),
    // BE-INCR-RETENCOES-FONTE PR-2 (item 12): sobrescritas para menos, deduções de PF e a série da NF (R-2010 serie, C9).
    withholdings: z.array(WithholdingOverrideSchema).max(6).optional(),
    pfDeducoes: PfDeducoesSchema.optional(),
    documentoSerie: z.string().trim().min(1).max(5).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    const tributos = (val.withholdings ?? []).map((w) => w.tributo);
    if (new Set(tributos).size !== tributos.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'withholdings: no máximo uma sobrescrita por tributo.', path: ['withholdings'] });
    }
  })
  // 3-mode gate (INCR-INVENTORY D3(b) + BE-INCR-NFE F0-1b / param-aceito-e-ignorado-e-bug): a Payable is
  // EXACTLY ONE of — (1) an ordinary EXPENSE (expenseAccountId, debit a 4.x leaf); (2) a SINGLE-SKU
  // inventory purchase (inventoryProductRef AND inventoryQty, debit 1.1.6); (3) a MULTI-ITEM NF-e
  // purchase (inventoryMultiItem=true + inventoryItems[], debit 1.1.6, SKUs live outside the row).
  // Mixing modes is ambiguous; a mode with no debit account is rejected loud. A half-supplied single-SKU
  // pair is rejected too, so inventoryQty can never be silently dropped.
  .superRefine((val, ctx) => {
    const hasExpense = val.expenseAccountId != null;
    const hasProductRef = val.inventoryProductRef != null;
    const hasQty = val.inventoryQty != null;
    const hasInventory = hasProductRef && hasQty;
    const isMultiItem = val.inventoryMultiItem === true;
    const hasItems = val.inventoryItems != null && val.inventoryItems.length > 0;
    const hasFixedAssetItems = val.fixedAssetItems != null && val.fixedAssetItems.length > 0;
    const hasInsumoItems = val.insumoItems != null && val.insumoItems.length > 0;

    // IBS-CBS-2027 PR-3 (item 14): no máximo uma linha por kind X6 e uma por tributo.
    const lineKeys = (val.recoverableTaxLines ?? []).map((l) => (isIbsCbsCreditLine(l) ? `tributo:${l.tributo}` : `kind:${l.kind}`));
    if (new Set(lineKeys).size !== lineKeys.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'recoverableTaxLines: linha repetida (um kind X6 ou um tributo IBS/CBS por linha).', path: ['recoverableTaxLines'] });
      return;
    }
    // Mode 3 — multi-item NF-e purchase: the flag is set; items required; NO expense / single-SKU fields.
    if (!isMultiItem && val.recoverableTaxLines && val.recoverableTaxLines.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'recoverableTaxLines só cabe em compra multi-item (NF-e, inventoryMultiItem).',
        path: ['recoverableTaxLines'],
      });
      return;
    }
    // Mode 4 (fixedAssetItems) é combinável SÓ com o modo 3 (F-FA12 → a) — nunca sozinho fora dele.
    if (!isMultiItem && hasFixedAssetItems) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'fixedAssetItems só cabe em compra multi-item (NF-e, inventoryMultiItem).',
        path: ['fixedAssetItems'],
      });
      return;
    }
    if (!isMultiItem && hasInsumoItems) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'insumoItems só cabe em compra multi-item (NF-e, inventoryMultiItem).',
        path: ['insumoItems'],
      });
      return;
    }
    if (isMultiItem) {
      if (hasExpense || hasProductRef || hasQty) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Compra multi-item (NF-e) não aceita expenseAccountId nem inventoryProductRef/inventoryQty.',
          path: ['inventoryMultiItem'],
        });
        return;
      }
      if (!hasItems && !hasFixedAssetItems && !hasInsumoItems) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Compra multi-item (inventoryMultiItem) exige inventoryItems, fixedAssetItems e/ou insumoItems (ao menos 1 no total).',
          path: ['inventoryItems'],
        });
        return;
      }
      // Review #366 (re-review): `nItem` é opcional POR ITEM, mas nunca por metade do array — uma
      // mistura de item-com-nItem e item-sem-nItem faria o service resolver sourceItemRef por dois
      // esquemas diferentes no MESMO array (explícito × fallback por índice) e um dos dois podia
      // colidir com o outro em silêncio (achado do re-review: `[{nItem:1},{sem nItem}]` → os dois
      // acabavam em sourceItemRef "1"). Regra: `nItem` em TODOS os itens (e todos ÚNICOS) OU em
      // NENHUM (o service cai no fallback por índice, sem risco de colisão com um explícito).
      if (hasFixedAssetItems) {
        const withNItem = val.fixedAssetItems!.filter((it) => it.nItem != null).length;
        if (withNItem > 0 && withNItem < val.fixedAssetItems!.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'fixedAssetItems: nItem deve estar presente em TODOS os itens ou em NENHUM — nunca só em parte (risco de colisão com o fallback por índice).',
            path: ['fixedAssetItems'],
          });
          return;
        }
        if (withNItem === val.fixedAssetItems!.length) {
          const nItems = val.fixedAssetItems!.map((it) => it.nItem);
          if (new Set(nItems).size !== nItems.length) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'fixedAssetItems: nItem repetido entre itens — cada item precisa de um nItem único (a chave do rascunho).',
              path: ['fixedAssetItems'],
            });
            return;
          }
        }
      }
      // Tie-out (ACC-014/T4): the per-SKU + per-ativo shares must sum EXACTLY to the note total on the row.
      const itemsSum = (val.inventoryItems ?? []).reduce((acc, it) => acc + it.valueCents, 0);
      const fixedAssetSum = (val.fixedAssetItems ?? []).reduce((acc, it) => acc + it.costCents, 0);
      const insumoSum = (val.insumoItems ?? []).reduce((acc, it) => acc + it.costCents, 0);
      const recoverableSum = (val.recoverableTaxLines ?? []).reduce((acc, l) => acc + l.amountCents, 0);
      if (itemsSum + fixedAssetSum + insumoSum + recoverableSum !== val.amountCents) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Σ dos itens (${itemsSum}) + Σ itens de imobilizado (${fixedAssetSum}) + Σ itens de insumo (${insumoSum}) + Σ créditos a recuperar (${recoverableSum}) deve igualar amountCents (${val.amountCents}).`,
          path: ['inventoryItems'],
        });
      }
      return;
    }

    // inventoryItems only makes sense in multi-item mode.
    if (hasItems) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'inventoryItems só é válido com inventoryMultiItem=true.',
        path: ['inventoryItems'],
      });
      return;
    }

    if (hasExpense && (hasProductRef || hasQty)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Informe OU expenseAccountId (despesa) OU inventoryProductRef + inventoryQty (compra de estoque), nunca ambos.',
        path: ['expenseAccountId'],
      });
      return;
    }
    if (!hasExpense && !hasInventory) {
      if (hasProductRef !== hasQty) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Compra de estoque exige inventoryProductRef E inventoryQty juntos.',
          path: [hasProductRef ? 'inventoryQty' : 'inventoryProductRef'],
        });
      } else {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Informe expenseAccountId (despesa) ou inventoryProductRef + inventoryQty (compra de estoque).',
          path: ['expenseAccountId'],
        });
      }
    }
  });

/** @openapi
 * components:
 *   schemas:
 *     RegisterPaymentInput:
 *       type: object
 *       required: [unitId, method, paidAt, amountCents]
 *       properties:
 *         unitId:      { type: string }
 *         method:      { type: string, enum: [Cash, Pix, TED, Boleto] }
 *         paidAt:      { type: string, description: "Data-only YYYY-MM-DD — data EFETIVA do débito bancário (D9), não a data do clique" }
 *         amountCents: { type: integer, minimum: 1, maximum: 2147483647, description: "Valor DESTE pagamento: qualquer parte do saldo em aberto (amountCents − paidCents), nunca acima dele (BE-INCR-PARTIAL-SETTLEMENT). A checagem contra o saldo vive no serviço (sum-CAS atômico), não neste schema. Teto de POLÍTICA (não de persistência — BigInt desde BE-INCR-MONEY-BIGINT): acima disso a API responde 400." }
 */
// A regra "≤ saldo remanescente" NÃO cabe no DTO puro (precisa do registro): vive no serviço
// (`registerPayment`) e é autoritativa no sum-CAS do repositório. Mudança de "deve igualar" para
// "≤ saldo" é lógica fina, invisível ao snapshot de shape (dto-shape-snapshot-nao-cobre-logica-fina).
export const RegisterPaymentSchema = z
  .object({
    unitId: z.string().min(1),
    method: z.enum(PAYMENT_METHODS),
    paidAt: dateOnly('paidAt'),
    amountCents: cents,
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     CancelPayableInput:
 *       type: object
 *       required: [unitId, reversalDate]
 *       properties:
 *         unitId:       { type: string }
 *         reversalDate: { type: string, description: "Data-only YYYY-MM-DD do estorno do reconhecimento (gate de período na data do estorno, T5)" }
 *         reason:       { type: string }
 */
/**
 * IBS-CBS-2027 PR-3 (BRIEF item 16, §4.2 `ApropriarCreditoSchema`; F-IBS-4 a, F-IBS-12 a): `PENDENTE → APROPRIADO` do
 * crédito de IBS/CBS de uma nota, com o comprovante da extinção (`SourceDocument` do escopo) obrigatório e CAS no status.
 * `unitId` = escopo de escrita, como nos outros comandos de AP; `payableId` = o `:id` da rota (divergente ⇒ 400).
 */
export const ApropriarCreditoSchema = z
  .object({
    unitId: z.string().min(1),
    payableId: z.string().min(1),
    tributo: z.enum(['IBS', 'CBS']),
    sourceDocumentId: z.string().min(1),
    expectedStatus: z.literal('PENDENTE'),
  })
  .strict();
export type ApropriarCreditoInput = z.infer<typeof ApropriarCreditoSchema>;

export const CancelPayableSchema = z
  .object({
    unitId: z.string().min(1),
    reversalDate: dateOnly('reversalDate'),
    reason: z.string().min(1).optional(),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     CancelPaymentInput:
 *       type: object
 *       required: [unitId, reversalDate]
 *       properties:
 *         unitId:       { type: string }
 *         reversalDate: { type: string, description: "Data-only YYYY-MM-DD do estorno da liquidação" }
 *         reason:       { type: string }
 */
export const CancelPaymentSchema = z
  .object({
    unitId: z.string().min(1),
    reversalDate: dateOnly('reversalDate'),
    reason: z.string().min(1).optional(),
  })
  .strict();

/** @openapi
 * components:
 *   schemas:
 *     ListPayablesQuery:
 *       type: object
 *       required: [unitId]
 *       properties:
 *         unitId: { type: string }
 *         status: { type: string, enum: [OPEN, PARTIALLY_PAID, PAYING, PAID, CANCELLED] }
 *         counterpartyId: { type: string, description: "Filtra pela FK de contraparte (INCR-COUNTERPARTY)" }
 *         dueFrom: { type: string, description: "Data-only YYYY-MM-DD — início da faixa de vencimento (inclusivo)" }
 *         dueTo:   { type: string, description: "Data-only YYYY-MM-DD — fim da faixa de vencimento (inclusivo)" }
 *         q:      { type: string, description: "Substring em description OU documentNumber" }
 *         overdue: { type: boolean, description: "Vencidos: dueDate < hoje E status em aberto. Vencer hoje NÃO conta" }
 *         page:   { type: integer, minimum: 1 }
 *         limit:  { type: integer, minimum: 1, maximum: 200 }
 */
export const ListPayablesQuerySchema = z.object({
  unitId: z.string().min(1),
  status: z.enum(PAYABLE_STATUSES).optional(),
  // BE-INCR-SUBLEDGER-FILTERS §2. F3: só a FK — o supplierName snapshot NÃO é casado aqui.
  counterpartyId: z.string().min(1).optional(),
  // F4: faixa INCLUSIVA nos dois extremos. `isValidDateOnly` e round-trip, não regex: '2026-02-30'
  // rolaria para 03-02 em silêncio e distorceria a faixa.
  dueFrom: z.string().refine(isValidDateOnly, 'dueFrom deve ser uma data real no formato YYYY-MM-DD').optional(),
  dueTo: z.string().refine(isValidDateOnly, 'dueTo deve ser uma data real no formato YYYY-MM-DD').optional(),
  // F2: casa `description` OU `documentNumber`. LIMITE MEDIDO do LIKE do SQLite (o Prisma não
  // oferece `mode:'insensitive'` neste provider): dobra caixa em ASCII ('ALUGUEL' casa 'Aluguel'),
  // mas NÃO em acentuado ('MARÇO' não casa 'março'). `%` e `_` valem como curinga, não literal.
  q: z.string().min(1).optional(),
  // F1: vencido = `dueDate < hoje` E status em aberto. `queryBoolean()`, NUNCA
  // `z.coerce.boolean()`: em query-string todo valor chega string e `Boolean('false') === true`,
  // então `?overdue=false` ligaria o filtro. Ausente ⇒ `false` (não `undefined`).
  overdue: queryBoolean(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

/** Query DTO for GET /payables/:id and the reconcile pass — unitId required. */
export const PayableScopeQuerySchema = z.object({
  unitId: z.string().min(1),
});

export type CreatePayableInput = z.infer<typeof CreatePayableSchema>;
export type RegisterPaymentInput = z.infer<typeof RegisterPaymentSchema>;
export type CancelPayableInput = z.infer<typeof CancelPayableSchema>;
export type CancelPaymentInput = z.infer<typeof CancelPaymentSchema>;
export type ListPayablesQueryInput = z.infer<typeof ListPayablesQuerySchema>;
export type PayableScopeQueryInput = z.infer<typeof PayableScopeQuerySchema>;

/** Type guard for CreatePayableInput. */
export function isCreatePayableInput(obj: unknown): obj is CreatePayableInput {
  return CreatePayableSchema.safeParse(obj).success;
}
