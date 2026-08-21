import type { AccountingBindingV1 } from '../dtos/AccountingBindingDto';
import { AccountingBindingV1Schema } from '../dtos/AccountingBindingDto';
import type { ChartAccountSnapshot } from '../dtos/CompileBindingDto';
import { computeCompiledFromHash } from '../services/BindingCompileService';

/**
 * A Prensa (BE-INCR-BINDING-PRESS, Fase P1) — o binding do salão RE-EXPRESSO como
 * `AccountingBindingV1` (dado), Corpo C, item 10 do BRIEF. Cobre os **5 sourceTypes classe-1**
 * (postEntry direto) — a classe 2 (`CrmReceivableBridge`, comando de subrazão) fica de fora por
 * decorrência de F-P1-1(a) (ver `docs/adr/ADR-P1-binding-press.md` §6, cabeçalho: "F-P1-1→(b)"
 * ratifica a UNION de tipo com os dois membros, mas o CORPUS v1 do salão — o que este arquivo
 * re-expressa — continua sendo só os 5 mappers `postEntry`; a criação de título AR do salão é
 * outro pipeline, `CrmReceivableBridge`, fora do escopo do item 10).
 *
 * Todo `accountCode` abaixo é citação literal dos mappers de produção (não invenção) —
 * `arquivo:linha` no comentário de cada `roleSlots`. Este é o insumo do golden test do Corpo D
 * (item 12 do BRIEF) e do swap da Fase B (item 14): o intérprete + este binding devem produzir os
 * MESMOS `PostEntryInput` que os 5 mappers hoje, byte-idênticos.
 *
 * `bindingVersion`/`compiledAt`/`compiledFromHash` são um placeholder de FIXTURE — não a saída de
 * uma chamada real a `BindingCompileService.compile()` (não há preset/chart reais carregados
 * aqui). O hash usa a MESMA função do compilador (`computeCompiledFromHash`) sobre um snapshot
 * mínimo, mas representativo, do schema operacional (os `sourceField`s realmente referenciados
 * pelos `fieldSlots` abaixo) e do plano de contas (`ChartOfAccountsFixture.ts`, códigos usados)
 * — determinístico, então dois `require` deste módulo produzem o mesmo hash.
 *
 * SLOT `dimension` EM TODO `eventBinding` — os 5 arquétipos de código (Corpo A,
 * `archetypes/*.ts`) declaram um slot `dimension` (emenda 2, ADR §11: nenhuma conta do salão tem
 * `requiresDimension=true` hoje, mas o slot precisa EXISTIR para o intérprete não travar num
 * vertical novo que tenha). O intérprete (`interpret.ts`, `resolveSlotValues`) exige um
 * `fieldSlot` para TODO slot declarado no arquétipo, sem exceção pela documentação de
 * "opcional" — então cada `eventBinding` abaixo carrega `{ slotName: 'dimension', sourceField:
 * 'event.dimension', transform: 'identity' }`; nenhum evento do salão hoje tem essa propriedade
 * (resolve para `undefined`, inofensivo — nenhuma `ArchetypeLine` consome este slot ainda).
 */

/** Snapshot dos códigos do `ChartOfAccountsFixture.ts` efetivamente usados pelos 5 arquétipos do
 *  salão — natureza/`acceptsEntries` citados de lá, não reinventados. */
const SALON_CHART_SNAPSHOT: ChartAccountSnapshot[] = [
  { code: '1.1.1', nature: 'Asset', acceptsEntries: true }, // Banco
  { code: '1.1.2', nature: 'Asset', acceptsEntries: true }, // A Receber
  { code: '1.1.3', nature: 'Asset', acceptsEntries: true }, // Caixa
  { code: '1.1.4', nature: 'Asset', acceptsEntries: true }, // A Receber Cartão / Adquirente
  { code: '1.1.6', nature: 'Asset', acceptsEntries: true }, // Estoques
  { code: '2.1.1', nature: 'Liability', acceptsEntries: true }, // Pacotes Pré-pagos
  { code: '3.1', nature: 'Revenue', acceptsEntries: true }, // Receita de Serviços
  { code: '3.2', nature: 'Revenue', acceptsEntries: true }, // Devoluções de Vendas (contra-receita)
  { code: '3.3', nature: 'Revenue', acceptsEntries: true }, // Receita de Revenda de Mercadorias
  { code: '4.2', nature: 'Expense', acceptsEntries: true }, // Custo das Mercadorias Vendidas
];

/** Schema operacional representativo — só os campos que algum `fieldSlot` abaixo referencia
 *  (`event.*`, mesmo caminho que os mappers leem de `AccountingEvent`). */
const SALON_OPERATIONAL_SCHEMA_SNAPSHOT: Record<string, unknown> = {
  'salon.sale.finalized': ['amount', 'revenueByNature', 'dimension'],
  'salon.sale.settled': ['amount', 'paymentMethod', 'dimension'],
  'salon.sale.returned': ['amount', 'dimension'],
  'salon.package.sold': ['amount', 'dimension'],
  'salon.sale.cogs': ['costCents', 'dimension'],
};

const BINDING_VERSION = 1;
const COMPILED_AT = '2026-08-21T00:00:00.000Z';

const candidate: AccountingBindingV1 = {
  sectorKey: 'beautySalon',
  bindingVersion: BINDING_VERSION,
  compiledAt: COMPILED_AT,
  compiledFromHash: computeCompiledFromHash(SALON_OPERATIONAL_SCHEMA_SNAPSHOT, SALON_CHART_SNAPSHOT),
  eventBindings: [
    // 2.1 Reconhecimento de Receita — SalonSaleFinalizedMapper.ts
    {
      eventKey: 'salon.sale.finalized',
      archetypeKey: 'revenue_recognition',
      // Achado do golden Fase 1 (item 12 do BRIEF) — texto citado de SalonSaleFinalizedMapper.ts:56.
      descriptionTemplate: 'Receita salão — Venda {sourceId}',
      fieldSlots: [
        { slotName: 'amount', sourceField: 'event.amount', transform: 'cents_from_reais' },
        { slotName: 'revenueByNature', sourceField: 'event.revenueByNature', transform: 'identity' },
        { slotName: 'dimension', sourceField: 'event.dimension', transform: 'identity' },
      ],
      roleSlots: [
        // D 1.1.2 (A Receber) — SalonSaleFinalizedMapper.ts:22
        { role: 'controle-recebível', accountCode: '1.1.2' },
        // C 3.1 (Receita de Serviços) — revenueSplit.ts:22 (SERVICE_REVENUE_ACCOUNT)
        { role: 'receita-serviço', accountCode: '3.1' },
        // C 3.3 (Receita de Revenda), condicional/omitida se zero — revenueSplit.ts:23 (RESALE_REVENUE_ACCOUNT)
        { role: 'receita-revenda', accountCode: '3.3' },
      ],
    },
    // 2.2 Liquidação — SalonSaleSettledMapper.ts (D <método>-role = total · C controle-recebível)
    {
      eventKey: 'salon.sale.settled',
      archetypeKey: 'settlement',
      // Achado do golden Fase 1 (item 12 do BRIEF) — texto citado de SalonSaleSettledMapper.ts:94.
      descriptionTemplate: 'Liquidação salão — Venda {sourceId}',
      fieldSlots: [
        { slotName: 'amount', sourceField: 'event.amount', transform: 'cents_from_reais' },
        { slotName: 'paymentMethod', sourceField: 'event.paymentMethod', transform: 'identity' },
        { slotName: 'dimension', sourceField: 'event.dimension', transform: 'identity' },
      ],
      roleSlots: [
        // D <método>-role — DEBIT_ACCOUNT_BY_METHOD, SalonSaleSettledMapper.ts:36-42. `caixa-por-metodo`
        // resolve por SUB-CHAVE (o `paymentMethod` do evento) — o shape `{role,accountCode}` já
        // commitado pela Fase 0 (`AccountingBindingDto.ts`) só carrega 1 código por entrada, então a
        // sub-chave entra embutida no próprio `role` como `"caixa-por-metodo:<paymentMethod>"` (convenção
        // deste módulo, documentada em `dtos/CompileBindingDto.ts` — não um fork do ADR, é o encaixe do
        // dado dentro do contrato já fechado).
        { role: 'caixa-por-metodo:Cash', accountCode: '1.1.3' }, // Caixa
        { role: 'caixa-por-metodo:Pix', accountCode: '1.1.1' }, // Banco
        { role: 'caixa-por-metodo:Debit Card', accountCode: '1.1.4' }, // A Receber Cartão / Adquirente
        { role: 'caixa-por-metodo:Credit Card', accountCode: '1.1.4' }, // A Receber Cartão / Adquirente
        { role: 'caixa-por-metodo:Package Balance', accountCode: '2.1.1' }, // Pacotes Pré-pagos — NUNCA cash (D1-Q10)
        // C 1.1.2 (A Receber) — SalonSaleSettledMapper.ts:27 (CREDIT_ACCOUNT)
        { role: 'controle-recebível', accountCode: '1.1.2' },
      ],
    },
    // 2.3 Estorno de Origem (devolução, NÃO é reversedById — emenda 1 do ADR §11) — SalonSaleReturnedMapper.ts
    {
      eventKey: 'salon.sale.returned',
      archetypeKey: 'reversal',
      // Achado do golden Fase 1 (item 12 do BRIEF) — texto citado de SalonSaleReturnedMapper.ts:52.
      descriptionTemplate: 'Devolução salão — Venda {sourceId}',
      fieldSlots: [
        { slotName: 'amount', sourceField: 'event.amount', transform: 'cents_from_reais' },
        { slotName: 'dimension', sourceField: 'event.dimension', transform: 'identity' },
      ],
      roleSlots: [
        // D 3.2 (Devoluções de Vendas) — SalonSaleReturnedMapper.ts:21
        { role: 'contra-receita', accountCode: '3.2' },
        // C 1.1.2 (A Receber) — SalonSaleReturnedMapper.ts:22
        { role: 'controle-recebível', accountCode: '1.1.2' },
      ],
    },
    // 2.4 Passivo de Performance (pacote pré-pago) — SalonPackageSoldMapper.ts
    {
      eventKey: 'salon.package.sold',
      archetypeKey: 'performance_liability',
      // Achado do golden Fase 1 (item 12 do BRIEF) — texto citado de SalonPackageSoldMapper.ts:48.
      descriptionTemplate: 'Origem de pacote pré-pago — Venda {sourceId}',
      fieldSlots: [
        { slotName: 'amount', sourceField: 'event.amount', transform: 'cents_from_reais' },
        { slotName: 'dimension', sourceField: 'event.dimension', transform: 'identity' },
      ],
      roleSlots: [
        // D 1.1.2 (A Receber) — SalonPackageSoldMapper.ts:21
        { role: 'controle-recebível', accountCode: '1.1.2' },
        // C 2.1.1 (Pacotes Pré-pagos) — SalonPackageSoldMapper.ts:22
        { role: 'passivo-diferido', accountCode: '2.1.1' },
      ],
    },
    // 2.5 CMV — SalonSaleCogsMapper.ts (custo JÁ em centavos exatos — moneyCentsExact, sem conversão)
    {
      eventKey: 'salon.sale.cogs',
      archetypeKey: 'cogs',
      // Achado do golden Fase 1 (item 12 do BRIEF) — texto citado de SalonSaleCogsMapper.ts:56.
      descriptionTemplate: 'CMV salão — Venda {sourceId}',
      fieldSlots: [
        { slotName: 'costCents', sourceField: 'event.costCents', transform: 'identity' },
        { slotName: 'dimension', sourceField: 'event.dimension', transform: 'identity' },
      ],
      roleSlots: [
        // D 4.2 (Custo das Mercadorias Vendidas) — SalonSaleCogsMapper.ts:29
        { role: 'custo-mercadoria-vendida', accountCode: '4.2' },
        // C 1.1.6 (Estoques) — SalonSaleCogsMapper.ts:30
        { role: 'estoque', accountCode: '1.1.6' },
      ],
    },
  ],
};

// Falha alto no import se algum dia divergir do shape que a própria Fase 0 fechou — este módulo é
// insumo de golden test; um fixture inválido não pode passar silenciosamente para o Corpo D.
export const SALON_BINDING_V1: AccountingBindingV1 = AccountingBindingV1Schema.parse(candidate);
