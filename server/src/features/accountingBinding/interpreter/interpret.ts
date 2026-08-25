import { ValidationError } from '../../../lib/errors';
import type { PostEntryInput } from '../../accounting/dtos/PostingDto';
import type { IAccountingEventMapper } from '../../accounting/sync/mappers/IAccountingEventMapper';
import {
  RESALE_REVENUE_ACCOUNT,
  SERVICE_REVENUE_ACCOUNT,
  splitRevenueCredit,
} from '../../accounting/sync/mappers/revenueSplit';
import type { EventBinding, FieldSlot, RoleSlot } from '../dtos/AccountingBindingDto';
import type {
  AccountRole,
  Archetype,
  ArchetypeLine,
  ArchetypeSlotSpec,
  LancamentoArchetype,
  SubledgerCommandArchetype,
} from '../models/types';
import { assertCentsInRange, centsFromReais } from './money';

/**
 * `interpret()` — o intérprete fixo de runtime (P1-DOSSIER-interprete.md §a): `(archetype, binding,
 * event) → PostEntryInput | SubledgerCommand`. Substitui, estruturalmente, o corpo de
 * `IAccountingEventMapper.map()` — troca "código escrito à mão por evento" por "uma função fixa
 * parametrizada por dado" (binding). ZERO branch de decisão de negócio (invariante 5 do ADR-P1):
 * toda condicional aqui é LOOKUP por chave (slot.type, archetype.invariants, role) — nunca um `if`
 * sobre CONTEÚDO de evento. A lista de permitido/proibido é `P1-DOSSIER-interprete.md §a`.
 *
 * NOTA DE ESCOPO (Corpo D, item 11 do BRIEF) — este arquivo é infraestrutura GENÉRICA consumida por
 * arquétipos concretos que ainda não existem neste worktree (Corpo A, item 4/5 do BRIEF, paralelo).
 * Onde a forma exata de um slot não está fixada por nenhum dossiê/BRIEF (abaixo, marcado
 * "CONVENÇÃO"), a escolha é uma decisão de materialização de CÓDIGO (não um fork que precise de
 * ratificação do dono) — documentada aqui para o Corpo A programar contra, e listada com o mesmo
 * rótulo no relatório estruturado desta sessão.
 */

/** O mesmo `AccountingEvent` que `IAccountingEventMapper.map` recebe hoje — extraído por
 *  `Parameters<>` do próprio contrato público (não importado de `AccountingSyncPort`, que NÃO está
 *  na lista de contratos nomeados do item 13 do BRIEF: `IAccountingEventMapper`, `PostEntryInput`/
 *  `PostingDto`, `revenueSplit`, `models/money`). */
export type AccountingEventLike = Parameters<IAccountingEventMapper['map']>[0];

/**
 * Efeito de runtime da classe 2 (`kind: 'createSubledgerRecord'`). O intérprete PREENCHE os campos
 * pelo binding (fieldSlots/roleSlots) mas NUNCA implementa os 3 guards de idempotência do arquétipo
 * (chave por `documentNumber`, lookup tombstone-aware, cancelado nunca ressuscita) — esses ficam em
 * CÓDIGO do arquétipo classe-2 (ADR-P1 §11, registro da ratificação F-P1-1b; BRIEF item 5, Corpo A).
 * `SubledgerCommand` é só o DADO que o ciclo do subledger consome (fora de escopo desta fase — Fase
 * B / wiring); é um valor de retorno puro, não um efeito colateral, exatamente como `PostEntryInput`.
 */
export interface SubledgerCommand {
  readonly kind: 'subledgerCommand';
  readonly targetSubledger: SubledgerCommandArchetype['targetSubledger'];
  readonly idempotencyKey: string;
  readonly sourceType: string;
  readonly sourceId: string | undefined;
  readonly unitId: string;
  /** Campos preenchidos por `fieldSlots`/`roleSlots`, na forma bruta resolvida pelo slot — sem
   *  interpretação de negócio nenhuma; quem consome decide o que fazer com cada chave. */
  readonly fields: Readonly<Record<string, unknown>>;
}

function isSubledgerCommand(value: PostEntryInput | SubledgerCommand): value is SubledgerCommand {
  return (value as { kind?: string }).kind === 'subledgerCommand';
}

/** Ponto de entrada único do intérprete. Dispatch por `archetype.kind` — 2 efeitos, nenhum `if` de
 *  conteúdo de evento (BRIEF item 11: "dispatch por kind"). */
export function interpret(input: {
  archetype: Archetype;
  binding: EventBinding;
  event: AccountingEventLike;
}): PostEntryInput | SubledgerCommand {
  const { archetype, binding, event } = input;
  const contextLabel = `${archetype.name} (evento '${event.sourceId}')`;
  const slotValues = resolveSlotValues(archetype.slots, binding.fieldSlots, event, contextLabel);

  if (archetype.kind === 'postEntry') {
    return interpretPostEntry(archetype, binding, slotValues, event, contextLabel);
  }
  return interpretSubledgerCommand(archetype, slotValues, event);
}

// ---------------------------------------------------------------------------------------------
// Preenchimento de slots — comum às duas classes. Lookup determinístico (fieldSlots por nome de
// slot; guard de dinheiro por slot.type) — o padrão explicitamente PERMITIDO pelo dossiê §a
// ("Lookup determinístico em tabela de dados (Map/Record) por chave vinda do binding ou do evento").
// ---------------------------------------------------------------------------------------------

type SlotValueMap = Map<string, unknown>;

/** CONVENÇÃO: `fieldSlot.sourceField` nomeia a propriedade do `AccountingEvent` a ler, com um
 *  prefixo opcional `"event."` (assim como os exemplos de `AccountingBindingDto.test.ts`) — o
 *  prefixo é só rótulo de origem, não navegação; lido aqui como propriedade direta. */
function readSourceField(event: AccountingEventLike, sourceField: string): unknown {
  const key = sourceField.startsWith('event.') ? sourceField.slice('event.'.length) : sourceField;
  return (event as unknown as Record<string, unknown>)[key];
}

function resolveFieldSlotValue(
  slot: ArchetypeSlotSpec,
  fieldSlot: FieldSlot,
  event: AccountingEventLike,
  context: string,
): unknown {
  const raw = readSourceField(event, fieldSlot.sourceField);
  if (fieldSlot.transform === 'cents_from_reais') {
    return centsFromReais(raw, context);
  }
  // transform === 'identity': slot.type decide se ainda precisa de revalidação (moneyCentsExact) —
  // propriedade FIXA do arquétipo (F-P1-4a), nunca decisão sobre o conteúdo do evento.
  if (slot.type === 'moneyCentsExact') {
    return assertCentsInRange(raw, context);
  }
  return raw;
}

/**
 * Um slot SEM `fieldSlot` correspondente resolve a `undefined` — NÃO é erro por si (emenda 2: o
 * slot opcional de dimensão, presente em todo arquétipo classe-1 real do Corpo A, não tem
 * `fieldSlot` no binding do salão hoje — nenhum vertical usa `requiresDimension=true` ainda — e
 * "não pode travar o intérprete em runtime"). Quem EXIGE um valor concreto (uma linha monetária,
 * a chave de idempotência da classe 2) checa isso no ponto de uso, não aqui.
 */
function resolveSlotValues(
  slots: readonly ArchetypeSlotSpec[],
  fieldSlots: readonly FieldSlot[],
  event: AccountingEventLike,
  context: string,
): SlotValueMap {
  const fieldSlotsByName = new Map(fieldSlots.map((fs) => [fs.slotName, fs]));
  const values: SlotValueMap = new Map();
  for (const slot of slots) {
    const fieldSlot = fieldSlotsByName.get(slot.name);
    values.set(slot.name, fieldSlot ? resolveFieldSlotValue(slot, fieldSlot, event, context) : undefined);
  }
  return values;
}

/**
 * Slot de etiqueta de dimensão (emenda 2, ADR §11) — CONVENÇÃO: todo arquétipo classe-1 real
 * declara um slot `name: 'dimension', type: 'string'` (ver `archetypes/RevenueRecognitionArchetype.ts`
 * e irmãos, comentário: "wiring que cabe ao Corpo D"), deliberadamente sem `ArchetypeLine` própria
 * — não é o total de uma perna, é uma etiqueta que se aplica a TODAS as pernas do lançamento. Aceita
 * uma string única ou um array de strings; ausente/vazio ⇒ `dimensions` fica FORA da linha (mesmo
 * estado do corpus real hoje — nenhuma conta do salão tem `requiresDimension=true`).
 */
function resolveDimensions(archetype: LancamentoArchetype, slotValues: SlotValueMap): string[] | undefined {
  if (!archetype.slots.some((s) => s.name === 'dimension')) return undefined;
  const value = slotValues.get('dimension');
  if (typeof value === 'string') return value.length > 0 ? [value] : undefined;
  if (Array.isArray(value)) {
    const strings = value.filter((v): v is string => typeof v === 'string' && v.length > 0);
    return strings.length > 0 ? strings : undefined;
  }
  return undefined;
}

function indexRoleSlots(roleSlots: readonly RoleSlot[]): Map<string, string> {
  return new Map(roleSlots.map((r) => [r.role, r.accountCode]));
}

// ---------------------------------------------------------------------------------------------
// Classe 1 — postEntry
// ---------------------------------------------------------------------------------------------

/** CONVENÇÃO (papel `caixa-por-metodo`) — o papel documentado em `models/types.ts:26` como "resolve
 *  por sub-chave (paymentMethod) — não é 1 conta fixa": o binding carrega uma `roleSlot` por
 *  sub-chave, `role: "caixa-por-metodo:<método>"` (ex. `"caixa-por-metodo:Cash"` → `"1.1.3"`) — o
 *  `RoleSlotSchema.role` é `z.string().min(1)` livre na forma (não fechado a `AccountRole` no
 *  schema), então uma chave composta é uma string válida sem tocar o DTO da Fase 0. A sub-chave vem
 *  do valor já resolvido do slot `enumLookup` do arquétipo — lookup por dado, não decisão. */
function resolveLineAccountCode(
  line: ArchetypeLine,
  archetype: LancamentoArchetype,
  roleToAccount: Map<string, string>,
  slotValues: SlotValueMap,
  context: string,
): string {
  if (line.role === 'caixa-por-metodo') {
    const enumSlot = archetype.slots.find((s) => s.type === 'enumLookup');
    const methodValue = enumSlot ? slotValues.get(enumSlot.name) : undefined;
    if (typeof methodValue !== 'string' || methodValue.length === 0) {
      throw new ValidationError(`Papel 'caixa-por-metodo' exige um slot enumLookup resolvido (${context}).`);
    }
    const accountCode = roleToAccount.get(`caixa-por-metodo:${methodValue}`);
    if (!accountCode) {
      throw new ValidationError(`Forma de pagamento '${methodValue}' não mapeada para conta de débito (${context}).`);
    }
    return accountCode;
  }
  const accountCode = roleToAccount.get(line.role);
  if (!accountCode) {
    throw new ValidationError(`Binding sem conta para o papel '${line.role}' (${context}).`);
  }
  return accountCode;
}

/**
 * Grupo de `ArchetypeLine` (mesmo `side`, mesmo `amountSlot`) computadas JUNTAS via o splitter
 * canônico `splitRevenueCredit` (BRIEF item 11: "splitter canônico revenueSplit reusado por import
 * público"), nunca reimplementado aqui (a técnica não pode re-inlinar — classe
 * `reuse-criterion-blind-to-reinlined-technique`). CONVENÇÃO (achada lendo o catálogo real do Corpo
 * A, `archetypes/RevenueRecognitionArchetype.ts`): as 3 linhas do arquétipo `revenue_recognition`
 * (débito + 2 créditos) referenciam o MESMO `amountSlot: 'amount'` — o split não tem um `amountSlot`
 * próprio; o gatilho é "mais de uma linha do MESMO lado (credit) compartilha o mesmo `amountSlot`" —
 * só então o intérprete busca o slot `revenueByNatureReais` do arquétipo (por TIPO, lookup, não
 * decisão) e chama o splitter. O `accountCode` de cada linha vem do `roleSlot` do binding (F-P1-5a)
 * — o `accountCode` que o splitter devolve (`SERVICE_REVENUE_ACCOUNT`/`RESALE_REVENUE_ACCOUNT`) é
 * usado só para IDENTIFICAR qual papel cada linha do split representa, nunca como o código final
 * gravado.
 */
function buildRevenueSplitLines(
  group: readonly ArchetypeLine[],
  totalCents: number,
  revenueByNature: unknown,
  roleToAccount: Map<string, string>,
  context: string,
): PostEntryInput['lines'] {
  const splitLines = splitRevenueCredit(
    totalCents,
    revenueByNature as { serviceReais: number; productReais: number } | undefined,
  );
  const lines: PostEntryInput['lines'] = [];
  for (const splitLine of splitLines) {
    const role: AccountRole =
      splitLine.accountCode === SERVICE_REVENUE_ACCOUNT ? 'receita-serviço' : 'receita-revenda';
    if (splitLine.accountCode !== SERVICE_REVENUE_ACCOUNT && splitLine.accountCode !== RESALE_REVENUE_ACCOUNT) {
      // Defensivo: o splitter canônico só conhece estes 2 códigos hoje — se algum dia ganhar um
      // terceiro, falhar alto aqui é melhor que gravar um papel errado silenciosamente.
      throw new ValidationError(`Splitter de receita devolveu conta desconhecida '${splitLine.accountCode}' (${context}).`);
    }
    if (!group.some((l) => l.role === role)) {
      throw new ValidationError(`Splitter de receita produziu papel '${role}' não declarado no arquétipo (${context}).`);
    }
    const accountCode = roleToAccount.get(role);
    if (!accountCode) {
      throw new ValidationError(`Binding sem conta para o papel '${role}' (${context}).`);
    }
    lines.push({ accountCode, debitCents: splitLine.debitCents, creditCents: splitLine.creditCents });
  }
  return lines;
}

/** Constrói as linhas de UM lado (`debit` ou `credit`) — agrupadas por `amountSlot` compartilhado.
 *  Grupo de tamanho 1 = linha simples (valor direto do slot); grupo de tamanho >1 = split de
 *  receita por natureza (a única razão hoje para >1 linha do MESMO lado repartir o MESMO slot). */
function buildSideLines(
  sideLines: readonly ArchetypeLine[],
  archetype: LancamentoArchetype,
  roleToAccount: Map<string, string>,
  slotValues: SlotValueMap,
  context: string,
): PostEntryInput['lines'] {
  const bySlot = new Map<string, ArchetypeLine[]>();
  for (const line of sideLines) {
    const group = bySlot.get(line.amountSlot) ?? [];
    group.push(line);
    bySlot.set(line.amountSlot, group);
  }

  const lines: PostEntryInput['lines'] = [];
  for (const [amountSlot, group] of bySlot) {
    if (group.length === 1) {
      const [line] = group;
      const rawValue = slotValues.get(amountSlot);
      // CORREÇÃO (review independente, achado 1): a omissão de uma linha `optional` NUNCA pode
      // olhar o VALOR resolvido do evento (invariante 5 — "pular uma perna olhando um campo do
      // evento" é o padrão PROIBIDO do dossiê §a). A única omissão com semântica definida hoje é a
      // do splitter (grupo >1, `buildRevenueSplitLines`, que já decide por dado do próprio
      // splitter). Para um grupo de tamanho 1, a ÚNICA fonte de decisão permitida (dado do
      // binding/arquétipo, não do evento) é se o binding chegou a mapear um `fieldSlot` para este
      // slot — a mesma regra já usada pelo slot de dimensão (emenda 2, `resolveSlotValues`): sem
      // `fieldSlot`, o valor é `undefined` por construção do binding, não por conteúdo do evento.
      // Se o binding MAPEOU o slot, a linha É emitida sempre — mesmo quando o valor resolvido é 0 —
      // porque nesse caso a quantidade de pernas já não depende do conteúdo do evento, só de o
      // binding tê-la ligado ou não.
      if (line.optional === true && rawValue === undefined) continue;
      if (typeof rawValue !== 'number') {
        throw new ValidationError(`Slot '${amountSlot}' não resolveu a um valor monetário (${context}).`);
      }
      const accountCode = resolveLineAccountCode(line, archetype, roleToAccount, slotValues, context);
      lines.push({
        accountCode,
        debitCents: line.side === 'debit' ? rawValue : 0,
        creditCents: line.side === 'credit' ? rawValue : 0,
      });
      continue;
    }
    const totalCents = slotValues.get(amountSlot);
    if (typeof totalCents !== 'number') {
      throw new ValidationError(`Slot '${amountSlot}' não resolveu a um valor monetário (${context}).`);
    }
    const revenueSlot = archetype.slots.find((s) => s.type === 'revenueByNatureReais');
    if (!revenueSlot) {
      throw new ValidationError(
        `${group.length} linhas do mesmo lado compartilham o slot '${amountSlot}' sem o arquétipo declarar um slot revenueByNatureReais (${context}).`,
      );
    }
    lines.push(...buildRevenueSplitLines(group, totalCents, slotValues.get(revenueSlot.name), roleToAccount, context));
  }
  return lines;
}

function buildPostEntryLines(
  archetype: LancamentoArchetype,
  binding: EventBinding,
  slotValues: SlotValueMap,
  context: string,
): PostEntryInput['lines'] {
  const roleToAccount = indexRoleSlots(binding.roleSlots);
  const debitLines = archetype.lines.filter((l) => l.side === 'debit');
  const creditLines = archetype.lines.filter((l) => l.side === 'credit');
  // Débito primeiro, crédito(s) depois — mesma ordem que os 5 mappers à mão emitem hoje (dossiê §c,
  // golden Fase 0): `[linha de débito, ...linhas de crédito]`.
  return [
    ...buildSideLines(debitLines, archetype, roleToAccount, slotValues, context),
    ...buildSideLines(creditLines, archetype, roleToAccount, slotValues, context),
  ];
}

// ---------------------------------------------------------------------------------------------
// Guards defensivos nomeados — dispatch por TAG em `archetype.invariants` (lookup por chave,
// permitido pelo dossiê §a), nunca por conteúdo de evento livre.
// ---------------------------------------------------------------------------------------------

type DefensiveGuard = (
  archetype: LancamentoArchetype,
  slotValues: SlotValueMap,
  roleToAccount: Map<string, string>,
  context: string,
) => void;

/**
 * F-BP-5(a) — caso-fronteira permitido, guard EQUIVALENTE (não byte-a-byte) a
 * `SaleSettledMapper.ts:85-89` (P1-DOSSIER-interprete.md §a; ADR-P1 §11 emenda).
 *
 * CORREÇÃO DE RÓTULO (review independente, achado 2): o BRIEF (item 11, fork F-BP-5a) descreve esta
 * migração como "verbatim", mas não é literalmente — o original compara a conta resolvida contra
 * uma CONSTANTE hardcoded na classe (`SaleSettledMapper.PREPAID_LIABILITY_ACCOUNT = '2.1.1'`);
 * esta versão não tem acesso a constantes de conta do mapper (o intérprete nunca guarda código de
 * conta em código — só papel, F-P1-5a) e por isso compara contra o `roleSlot` `passivo-adiantamento`
 * do binding em vez da constante. A INTENÇÃO do guard original — "se `Package Balance` resolveu para
 * uma conta diferente da conta de passivo esperada, o dado está quebrado, falhe alto" — é preservada;
 * a FONTE do valor de comparação mudou de constante-em-código para dado-do-binding porque é a única
 * fonte disponível nesta arquitetura. NÃO decide qual conta usar — isso já aconteceu no lookup
 * papel→conta (`resolveLineAccountCode`, F-P1-5a) — é uma asserção defensiva de consistência interna
 * (defesa do invariante D1-Q10).
 *
 * GAP REGISTRADO (não inventado silenciosamente — ver notas de retorno desta sessão): o binding real
 * do salão (`fixtures/saleBinding.ts`, Corpo C) resolve `caixa-por-metodo:Package Balance`
 * DIRETAMENTE para `2.1.1`, sem declarar um `roleSlot` separado `passivo-adiantamento` como segunda
 * fonte de verdade — a checagem cruzada original (duas constantes independentes no mapper) não tem
 * hoje um segundo dado independente para comparar dentro do binding compilado. Este guard fica
 * defensivo em DUAS camadas: (1) se o binding não declara `passivo-adiantamento`, não há nada a
 * cruzar — não trava (não é regressão: o valor único já veio do lookup fixo, sem fallback silencioso
 * para caixa) — é NO-OP estrutural para o binding do salão como compilado hoje; (2) se o binding
 * declarar `passivo-adiantamento` (um vertical futuro pode optar por isso como defesa em
 * profundidade), a cruz roda de verdade.
 */
const assertPackageBalanceLiabilityGuard: DefensiveGuard = (archetype, slotValues, roleToAccount, context) => {
  const enumSlot = archetype.slots.find((s) => s.type === 'enumLookup');
  if (!enumSlot) return;
  const methodValue = slotValues.get(enumSlot.name);
  if (methodValue !== 'Package Balance') return;
  const liabilityAccount = roleToAccount.get('passivo-adiantamento');
  if (!liabilityAccount) return; // binding não declara o papel de referência — nada a cruzar (ver nota)
  const resolvedAccount = roleToAccount.get(`caixa-por-metodo:${methodValue}`);
  if (resolvedAccount !== liabilityAccount) {
    throw new ValidationError(
      `blocked_missing_prepaid_liability_account: liquidação de Package Balance exige a conta de passivo de adiantamento (${context}).`,
    );
  }
};

/** Tabela de guards nomeados — chave é a tag declarada em `archetype.invariants` pelo Corpo A
 *  (`SettlementArchetype.ts`: `'package-balance-never-cash'`). */
const DEFENSIVE_GUARDS: Readonly<Record<string, DefensiveGuard>> = {
  'package-balance-never-cash': assertPackageBalanceLiabilityGuard,
};

function runDefensiveGuards(
  archetype: LancamentoArchetype,
  slotValues: SlotValueMap,
  roleToAccount: Map<string, string>,
  context: string,
): void {
  for (const tag of archetype.invariants) {
    const guard = DEFENSIVE_GUARDS[tag];
    if (guard) guard(archetype, slotValues, roleToAccount, context);
  }
}

function interpretPostEntry(
  archetype: LancamentoArchetype,
  binding: EventBinding,
  slotValues: SlotValueMap,
  event: AccountingEventLike,
  context: string,
): PostEntryInput {
  const lines = buildPostEntryLines(archetype, binding, slotValues, context);
  runDefensiveGuards(archetype, slotValues, indexRoleSlots(binding.roleSlots), context);
  // `dimensions` (INCR-DIM, emenda 2 do ADR-P1 §11) — etiqueta de LANÇAMENTO, aplicada a TODA
  // linha por igual (o slot `dimension` não pertence a uma perna específica). Ausente quando o
  // binding não mapeia o slot (mesmo estado do corpus real hoje — dossiê P1-DOSSIER-golden-test.md
  // (a) lacuna 6, nenhuma conta do salão tem `requiresDimension=true`); presente quando um vertical
  // futuro o preencher — não trava (o requisito literal da emenda 2).
  const dimensions = resolveDimensions(archetype, slotValues);
  const linesWithDimensions = dimensions ? lines.map((l) => ({ ...l, dimensions })) : lines;
  return {
    // Passthrough puro (emenda 5 do ADR-P1 §11) — idempotência (sourceType/sourceId) nunca vira
    // dado de binding; o intérprete propaga a identidade do evento byte-idêntica, como os mappers
    // fazem hoje.
    unitId: event.unitId,
    date: event.occurredAt,
    description: resolveDescription(binding, event),
    sourceType: event.sourceType,
    sourceId: event.sourceId,
    lines: linesWithDimensions,
  };
}

/**
 * Achado do golden test Fase 1 (item 12 do BRIEF): os 5 mappers-à-mão NÃO usam `event.label` na
 * descrição — cada um monta um texto fixo próprio do arquétipo (setorial, ex.
 * `SaleSettledMapper.ts:94`). `binding.descriptionTemplate` (dado, `AccountingBindingDto.ts`)
 * carrega esse texto por evento, com o único placeholder suportado `{sourceId}` — substituição de
 * string por LOOKUP/troca de token, não decisão sobre conteúdo do evento (permitido pelo dossiê
 * §a). Binding sem `descriptionTemplate` (todo binding hoje exceto a fixture do salão corrigida
 * por este achado) cai para `event.label`, o comportamento anterior a esta correção.
 */
function resolveDescription(binding: EventBinding, event: AccountingEventLike): string {
  if (!binding.descriptionTemplate) return event.label;
  return binding.descriptionTemplate.replace('{sourceId}', event.sourceId ?? '');
}

// ---------------------------------------------------------------------------------------------
// Classe 2 — createSubledgerRecord
// ---------------------------------------------------------------------------------------------

function interpretSubledgerCommand(
  archetype: SubledgerCommandArchetype,
  slotValues: SlotValueMap,
  event: AccountingEventLike,
): SubledgerCommand {
  // CONVENÇÃO / GAP REGISTRADO (ver notas de retorno desta sessão): o `idempotencyKey` do arquétipo
  // real (`SubledgerCreateReceivableArchetype.ts`: `'documentNumber'`) nomeia uma chave DERIVADA
  // (`crmDocumentNumber(opportunityId)`, dossiê §3) — não um slot declarado (`slots` do arquétipo
  // real é `amount/occurredAt/label/accountRef/dimension`, sem `documentNumber`). A derivação em si
  // é código do arquétipo classe-2 (BRIEF item 5, Corpo A — "3 guards de idempotência ficam em
  // CÓDIGO do arquétipo"), fora do escopo genérico deste intérprete. Fallback: se o binding declarar
  // um slot com o nome de `idempotencyKey` (um vertical futuro pode optar por isso), usa o valor
  // resolvido; senão usa `event.sourceId` (a identidade do evento) como base — a fiação real da
  // Fase B substitui isto pela função de derivação do arquétipo quando ela existir.
  const slotValue = slotValues.get(archetype.idempotencyKey);
  const idempotencyValue = typeof slotValue === 'string' && slotValue.length > 0 ? slotValue : event.sourceId;
  if (typeof idempotencyValue !== 'string' || idempotencyValue.length === 0) {
    throw new ValidationError(
      `Chave de idempotência '${archetype.idempotencyKey}' não resolveu a uma string não-vazia (${archetype.name}).`,
    );
  }
  const fields: Record<string, unknown> = {};
  for (const [name, value] of slotValues) fields[name] = value;
  return {
    kind: 'subledgerCommand',
    targetSubledger: archetype.targetSubledger,
    idempotencyKey: idempotencyValue,
    // Passthrough puro (emenda 5) — mesma garantia da classe 1.
    sourceType: event.sourceType,
    sourceId: event.sourceId,
    unitId: event.unitId,
    fields,
  };
}

export { isSubledgerCommand };
