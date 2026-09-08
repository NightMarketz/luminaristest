import type { AccountingBindingV1 } from '../dtos/AccountingBindingDto';
import { AccountingBindingV1Schema } from '../dtos/AccountingBindingDto';
import type { ChartAccountSnapshot } from '../dtos/CompileBindingDto';
import { computeCompiledFromHash } from '../services/BindingCompileService';

/**
 * BE-INCR-P2-VERTICAL-CLINICA — Bloco II, comportamento 4. O binding do SEGUNDO vertical
 * (`sectorKey: 'aestheticClinic'`, F-P2-1 → RATIFICADO), espelho literal de `fixtures/saleBinding.ts`
 * (o binding do vertical 1) — MESMO shape `AccountingBindingV1` (inalterado, F-P2-1 contrato §4.2),
 * MESMOS 5 `eventKey`/`archetypeKey`/`accountCode` (F-P2-6 → (b): o vocabulário `sale.*` já é
 * genérico — não é "engano de digitação" reusar o mesmo namespace, é o ponto: as pontes que emitem
 * esses `sourceType` vivem no perímetro zero-diff e não sabem — nem deveriam saber — qual vertical
 * as invocou). A ÚNICA diferença semântica intencional é `descriptionTemplate` (existe exatamente
 * para isso — comentário de campo em `AccountingBindingDto.ts`, citado no BRIEF §2): texto setorial
 * "clínica" no lugar de "salão".
 *
 * F-P2-8 → RATIFICADO (a): a clínica opera com os 3 módulos que fazem os 5 arquétipos dispararem
 * (serviço + revenda de cosmético com estoque + pacote pré-pago) — o MESMO plano de contas e os
 * MESMOS 10 códigos do vertical 1 bastam (nenhuma conta nova por papel foi necessária; ver
 * `docs/adr/ADR-P2-second-vertical.md` §6 passo 5 — parecer do arquiteto só é exigido quando o
 * preset esboçar contas novas, o que não aconteceu aqui).
 */
const CLINIC_CHART_SNAPSHOT: ChartAccountSnapshot[] = [
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

/**
 * Schema operacional da clínica — usado (a) como insumo do hash de staleness (`compiledFromHash`,
 * mesmo papel que no vertical 1) e (b) como o CONJUNTO DE `eventKey` QUE A OPERAÇÃO INSTALADA PODE
 * EMITIR (comportamento 5, `computeEventCoverage` em `BindingCompileService.ts`) — as MESMAS 5
 * chaves do vertical 1, porque a clínica reusa literalmente `salesModule`/`saleItemsMixedModule`/
 * `packageCatalogModule`/`stockMovementsModule` sob os mesmos `internalName` (comportamento 1,
 * `AestheticClinicPreset.ts`) — a superfície emitível não muda por o preset ser outro.
 */
export const CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT: Record<string, unknown> = {
  'sale.finalized': ['amount', 'revenueByNature', 'dimension'],
  'sale.settled': ['amount', 'paymentMethod', 'dimension'],
  'sale.returned': ['amount', 'dimension'],
  'sale.package.sold': ['amount', 'dimension'],
  'sale.cogs': ['costCents', 'dimension'],
};

const BINDING_VERSION = 1;
const COMPILED_AT = '2026-09-07T00:00:00.000Z';

const candidate: AccountingBindingV1 = {
  sectorKey: 'aestheticClinic',
  bindingVersion: BINDING_VERSION,
  compiledAt: COMPILED_AT,
  compiledFromHash: computeCompiledFromHash(CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT, CLINIC_CHART_SNAPSHOT),
  eventBindings: [
    // 2.1 Reconhecimento de Receita — SaleFinalizedMapper.ts (accountCodes citados de saleBinding.ts)
    {
      eventKey: 'sale.finalized',
      archetypeKey: 'revenue_recognition',
      descriptionTemplate: 'Receita clínica — Atendimento {sourceId}',
      fieldSlots: [
        { slotName: 'amount', sourceField: 'event.amount', transform: 'cents_from_reais' },
        { slotName: 'revenueByNature', sourceField: 'event.revenueByNature', transform: 'identity' },
        { slotName: 'dimension', sourceField: 'event.dimension', transform: 'identity' },
      ],
      roleSlots: [
        { role: 'controle-recebível', accountCode: '1.1.2' },
        { role: 'receita-serviço', accountCode: '3.1' },
        { role: 'receita-revenda', accountCode: '3.3' },
      ],
    },
    // 2.2 Liquidação — SaleSettledMapper.ts
    {
      eventKey: 'sale.settled',
      archetypeKey: 'settlement',
      descriptionTemplate: 'Liquidação clínica — Atendimento {sourceId}',
      fieldSlots: [
        { slotName: 'amount', sourceField: 'event.amount', transform: 'cents_from_reais' },
        { slotName: 'paymentMethod', sourceField: 'event.paymentMethod', transform: 'identity' },
        { slotName: 'dimension', sourceField: 'event.dimension', transform: 'identity' },
      ],
      roleSlots: [
        { role: 'caixa-por-metodo:Cash', accountCode: '1.1.3' },
        { role: 'caixa-por-metodo:Pix', accountCode: '1.1.1' },
        { role: 'caixa-por-metodo:Debit Card', accountCode: '1.1.4' },
        { role: 'caixa-por-metodo:Credit Card', accountCode: '1.1.4' },
        { role: 'caixa-por-metodo:Package Balance', accountCode: '2.1.1' }, // NUNCA cash (D1-Q10)
        { role: 'controle-recebível', accountCode: '1.1.2' },
      ],
    },
    // 2.3 Estorno de Origem — SaleReturnedMapper.ts
    {
      eventKey: 'sale.returned',
      archetypeKey: 'reversal',
      descriptionTemplate: 'Devolução clínica — Atendimento {sourceId}',
      fieldSlots: [
        { slotName: 'amount', sourceField: 'event.amount', transform: 'cents_from_reais' },
        { slotName: 'dimension', sourceField: 'event.dimension', transform: 'identity' },
      ],
      roleSlots: [
        { role: 'contra-receita', accountCode: '3.2' },
        { role: 'controle-recebível', accountCode: '1.1.2' },
      ],
    },
    // 2.4 Passivo de Performance (pacote pré-pago) — SalePackageSoldMapper.ts
    {
      eventKey: 'sale.package.sold',
      archetypeKey: 'performance_liability',
      descriptionTemplate: 'Origem de pacote pré-pago — Atendimento {sourceId}',
      fieldSlots: [
        { slotName: 'amount', sourceField: 'event.amount', transform: 'cents_from_reais' },
        { slotName: 'dimension', sourceField: 'event.dimension', transform: 'identity' },
      ],
      roleSlots: [
        { role: 'controle-recebível', accountCode: '1.1.2' },
        { role: 'passivo-diferido', accountCode: '2.1.1' },
      ],
    },
    // 2.5 CMV — SaleCogsMapper.ts (custo já em centavos exatos)
    {
      eventKey: 'sale.cogs',
      archetypeKey: 'cogs',
      descriptionTemplate: 'CMV clínica — Atendimento {sourceId}',
      fieldSlots: [
        { slotName: 'costCents', sourceField: 'event.costCents', transform: 'identity' },
        { slotName: 'dimension', sourceField: 'event.dimension', transform: 'identity' },
      ],
      roleSlots: [
        { role: 'custo-mercadoria-vendida', accountCode: '4.2' },
        { role: 'estoque', accountCode: '1.1.6' },
      ],
    },
  ],
};

// Falha alto no import se algum dia divergir do shape que a Fase 0 fechou (mesmo padrão de
// `saleBinding.ts`) — este módulo é insumo de teste e do CLI de ativação (F-P2-7).
export const CLINIC_BINDING_V1: AccountingBindingV1 = AccountingBindingV1Schema.parse(candidate);
