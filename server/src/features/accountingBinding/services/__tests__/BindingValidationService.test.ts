/**
 * BindingValidationService — validador determinístico da Prensa (BE-INCR-BINDING-PRESS, F-P1-6,
 * Corpo B, item 6 do BRIEF). Um teste vermelho→verde por checagem (1-8), mais o controle (binding
 * bem-formado passa sem nenhum issue) — sem controle, os testes negativos seriam vazios (mesma
 * lição do `AccountingBindingDto.test.ts` da Fase 0).
 *
 * `ArchetypeCatalog`/`ChartLookupPort`/`PostingValidatePort` são FAKES locais que implementam as
 * interfaces de `../../models/types.ts` (contrato da Fase 0) — o catálogo REAL (Corpo A) e o
 * adaptador REAL do chart (Fase B) ainda não existem neste worktree; este teste programa contra o
 * CONTRATO, não contra uma implementação concreta de outro corpo (regra de posse de arquivo).
 */
import { BindingValidationService } from '../BindingValidationService';
import type { Archetype, ArchetypeCatalog, ChartAccountLookup, ChartLookupPort, PostingValidatePort } from '../../models/types';
import type { AccountingBindingV1 } from '../../dtos/AccountingBindingDto';
import { archetypeCatalog } from '../../archetypes/catalog';
import { SALE_BINDING_V1 } from '../../fixtures/saleBinding';

// ---------------------------------------------------------------------------------------------
// Arquétipo fixture — 1:1 com o "reconhecimento-receita" real (SaleFinalizedMapper): débito
// controle-recebível, crédito receita-serviço + receita-revenda opcional. Suficiente para exercitar
// TODAS as checagens sem depender do catálogo real do Corpo A (que ainda não existe neste worktree).
// ---------------------------------------------------------------------------------------------
const revenueRecognitionArchetype: Archetype = {
  kind: 'postEntry',
  name: 'reconhecimento-receita',
  sourceType: 'sale.finalized',
  slots: [
    { name: 'amountCents', type: 'moneyCentsExact', guards: ['isSafeInteger', 'gtZero'] },
  ],
  lines: [
    { role: 'controle-recebível', side: 'debit', amountSlot: 'amountCents' },
    { role: 'receita-serviço', side: 'credit', amountSlot: 'amountCents' },
  ],
  invariants: ['revenue-split-by-nature'],
};

const cogsArchetype: Archetype = {
  kind: 'postEntry',
  name: 'cmv',
  sourceType: 'sale.finalized',
  slots: [{ name: 'cogsCents', type: 'moneyCentsExact', guards: ['isSafeInteger', 'gtZero'] }],
  lines: [
    { role: 'custo-mercadoria-vendida', side: 'debit', amountSlot: 'cogsCents' },
    { role: 'estoque', side: 'credit', amountSlot: 'cogsCents' },
  ],
  invariants: ['already-cents'],
};

function buildCatalog(archetypes: Record<string, Archetype>): ArchetypeCatalog {
  return {
    get: (key: string) => archetypes[key],
    all: () => Object.values(archetypes),
  };
}

function buildChart(accounts: Record<string, ChartAccountLookup>): ChartLookupPort {
  return {
    findLeafAccountByCode: async (code: string) => accounts[code] ?? null,
  };
}

function fakePostingValidatePort(): PostingValidatePort {
  return { validateOnly: jest.fn(async () => undefined) };
}

const chartAccounts: Record<string, ChartAccountLookup> = {
  '1.1.2': { code: '1.1.2', nature: 'Asset', acceptsEntries: true }, // A Receber
  '3.1': { code: '3.1', nature: 'Revenue', acceptsEntries: true }, // Receita de Serviços
  '3.3': { code: '3.3', nature: 'Revenue', acceptsEntries: true }, // Receita de Revenda
  '4.2': { code: '4.2', nature: 'Expense', acceptsEntries: true }, // CMV
  '1.1.6': { code: '1.1.6', nature: 'Asset', acceptsEntries: true }, // Estoques
  '2.1.1': { code: '2.1.1', nature: 'Liability', acceptsEntries: true }, // Pacotes Pré-pagos
  '3': { code: '3', nature: 'Revenue', acceptsEntries: false }, // synthetic root — não é folha
};

function validBinding(over: Partial<AccountingBindingV1['eventBindings'][number]> = {}): AccountingBindingV1 {
  return {
    sectorKey: 'beautySalon',
    bindingVersion: 1,
    compiledAt: '2026-08-21T00:00:00.000Z',
    compiledFromHash: 'sha256:abc',
    eventBindings: [
      {
        eventKey: 'sale.finalized',
        archetypeKey: 'revenue_recognition',
        fieldSlots: [{ slotName: 'amountCents', sourceField: 'event.amount', transform: 'identity' }],
        roleSlots: [
          { role: 'controle-recebível', accountCode: '1.1.2' },
          { role: 'receita-serviço', accountCode: '3.1' },
        ],
        ...over,
      },
    ],
  };
}

function buildService(over: { catalog?: ArchetypeCatalog; chart?: ChartLookupPort } = {}) {
  const catalog = over.catalog ?? buildCatalog({ revenue_recognition: revenueRecognitionArchetype, cogs: cogsArchetype });
  const chart = over.chart ?? buildChart(chartAccounts);
  const svc = new BindingValidationService(catalog, chart, fakePostingValidatePort());
  return { svc, catalog, chart };
}

describe('BindingValidationService — CONTROLE (sem isto os negativos são vazios)', () => {
  it('binding bem-formado passa sem nenhum issue bloqueante nem aviso', async () => {
    const { svc } = buildService();
    const result = await svc.validate(validBinding());
    expect(result.ok).toBe(true);
    expect(result.blocking).toEqual([]);
  });
});

describe('Checagem #1 — arquétipo existe (ARCHETYPE_UNKNOWN)', () => {
  it('vermelho→verde: archetypeKey que o catálogo não reconhece bloqueia com ARCHETYPE_UNKNOWN', async () => {
    const { svc } = buildService({ catalog: buildCatalog({}) }); // catálogo vazio — nada resolve
    const result = await svc.validate(validBinding());
    expect(result.ok).toBe(false);
    expect(result.blocking).toContainEqual(
      expect.objectContaining({ code: 'ARCHETYPE_UNKNOWN' }),
    );
  });

  it('verde: archetypeKey presente no catálogo não gera ARCHETYPE_UNKNOWN', async () => {
    const { svc } = buildService();
    const result = await svc.validate(validBinding());
    expect(result.blocking.some((i) => i.code === 'ARCHETYPE_UNKNOWN')).toBe(false);
  });
});

describe('Checagem #2 — todo slot obrigatório do arquétipo está preenchido (SLOT_UNFILLED)', () => {
  it('vermelho→verde: fieldSlot obrigatório do arquétipo ausente no binding bloqueia com SLOT_UNFILLED', async () => {
    const { svc } = buildService();
    const missingFieldSlot = validBinding({ fieldSlots: [] as any });
    const result = await svc.validate(missingFieldSlot);
    expect(result.ok).toBe(false);
    expect(result.blocking).toContainEqual(
      expect.objectContaining({ code: 'SLOT_UNFILLED', slot: 'amountCents' }),
    );
  });

  it('vermelho→verde: papel exigido pela linha do arquétipo ausente entre os roleSlots bloqueia com SLOT_UNFILLED', async () => {
    const { svc } = buildService();
    const missingRole = validBinding({
      roleSlots: [{ role: 'controle-recebível', accountCode: '1.1.2' }], // falta receita-serviço
    });
    const result = await svc.validate(missingRole);
    expect(result.ok).toBe(false);
    expect(result.blocking).toContainEqual(
      expect.objectContaining({ code: 'SLOT_UNFILLED', slot: 'receita-serviço' }),
    );
  });
});

describe('Checagem #3 — conta existe (ACCOUNT_NOT_FOUND)', () => {
  it('vermelho→verde: accountCode que não resolve no chart bloqueia com ACCOUNT_NOT_FOUND', async () => {
    const { svc } = buildService();
    const unknownAccount = validBinding({
      roleSlots: [
        { role: 'controle-recebível', accountCode: '9.9.9' }, // não existe no chart fixture
        { role: 'receita-serviço', accountCode: '3.1' },
      ],
    });
    const result = await svc.validate(unknownAccount);
    expect(result.ok).toBe(false);
    expect(result.blocking).toContainEqual(
      expect.objectContaining({ code: 'ACCOUNT_NOT_FOUND', accountCode: '9.9.9' }),
    );
  });
});

describe('Checagem #4 — conta aceita lançamento / é folha (ACCOUNT_NOT_LEAF)', () => {
  it('vermelho→verde: conta sintética (acceptsEntries=false) bloqueia com ACCOUNT_NOT_LEAF', async () => {
    const { svc } = buildService();
    const syntheticAccount = validBinding({
      roleSlots: [
        { role: 'controle-recebível', accountCode: '1.1.2' },
        { role: 'receita-serviço', accountCode: '3' }, // raiz sintética, acceptsEntries=false
      ],
    });
    const result = await svc.validate(syntheticAccount);
    expect(result.ok).toBe(false);
    expect(result.blocking).toContainEqual(
      expect.objectContaining({ code: 'ACCOUNT_NOT_LEAF', accountCode: '3' }),
    );
  });
});

describe('Checagem #5 — conta ativa (colapsa em ACCOUNT_NOT_FOUND, dossiê §1)', () => {
  it('vermelho→verde: conta soft-deleted (o ChartLookupPort a devolve como null, mesmo padrão anti-enumeração) bloqueia com ACCOUNT_NOT_FOUND — NÃO com ACCOUNT_INACTIVE', async () => {
    // O ChartLookupPort documenta que uma conta soft-deleted "simplesmente não é encontrada" —
    // simulado aqui devolvendo null para o código de uma conta que EXISTIRIA se não tivesse sido
    // arquivada (mesmo comportamento observável de "não existe").
    const chartWithSoftDeleted = buildChart({
      '1.1.2': chartAccounts['1.1.2'],
      // '3.1' ausente do mapa == soft-deleted/inexistente, indistinguível por desenho
    });
    const { svc } = buildService({ chart: chartWithSoftDeleted });
    const result = await svc.validate(validBinding());
    expect(result.ok).toBe(false);
    const issue = result.blocking.find((i) => i.accountCode === '3.1');
    expect(issue?.code).toBe('ACCOUNT_NOT_FOUND'); // nunca ACCOUNT_INACTIVE — anti-enumeração
  });
});

describe('Checagem #6 — natureza compatível com o papel (NATURE_MISMATCH, o gap central)', () => {
  it('vermelho→verde: conta de natureza Liability num papel receita-serviço (exige Revenue) bloqueia com NATURE_MISMATCH', async () => {
    const { svc } = buildService();
    const wrongNature = validBinding({
      roleSlots: [
        { role: 'controle-recebível', accountCode: '1.1.2' },
        { role: 'receita-serviço', accountCode: '2.1.1' }, // Liability, não Revenue
      ],
    });
    const result = await svc.validate(wrongNature);
    expect(result.ok).toBe(false);
    expect(result.blocking).toContainEqual(
      expect.objectContaining({ code: 'NATURE_MISMATCH', accountCode: '2.1.1', slot: 'receita-serviço' }),
    );
  });

  it('verde: caixa-por-metodo aceita Asset E Liability (F-BP-5, guard do Package Balance preservado verbatim)', async () => {
    const catalog = buildCatalog({
      settlement: {
        kind: 'postEntry',
        name: 'liquidacao',
        sourceType: 'salon.sale.settled',
        slots: [{ name: 'amountCents', type: 'moneyCentsExact', guards: ['isSafeInteger'] }],
        lines: [
          { role: 'caixa-por-metodo', side: 'debit', amountSlot: 'amountCents' },
          { role: 'controle-recebível', side: 'credit', amountSlot: 'amountCents' },
        ],
        invariants: [],
      },
    });
    const { svc } = buildService({ catalog });
    const packageBalanceSettlement: AccountingBindingV1 = {
      sectorKey: 'beautySalon',
      bindingVersion: 1,
      compiledAt: '2026-08-21T00:00:00.000Z',
      compiledFromHash: 'sha256:abc',
      eventBindings: [
        {
          eventKey: 'salon.sale.settled',
          archetypeKey: 'settlement',
          fieldSlots: [{ slotName: 'amountCents', sourceField: 'event.amount', transform: 'identity' }],
          roleSlots: [
            { role: 'caixa-por-metodo', accountCode: '2.1.1' }, // Liability — Package Balance
            { role: 'controle-recebível', accountCode: '1.1.2' },
          ],
        },
      ],
    };
    const result = await svc.validate(packageBalanceSettlement);
    expect(result.blocking.some((i) => i.code === 'NATURE_MISMATCH')).toBe(false);
  });
});

describe('Checagem #7 — sem slot órfão (SLOT_ORPHAN)', () => {
  it('vermelho→verde: fieldSlot que o arquétipo não declara bloqueia com SLOT_ORPHAN', async () => {
    const { svc } = buildService();
    const orphanFieldSlot = validBinding({
      fieldSlots: [
        { slotName: 'amountCents', sourceField: 'event.amount', transform: 'identity' },
        { slotName: 'campoInventado', sourceField: 'event.x', transform: 'identity' },
      ],
    });
    const result = await svc.validate(orphanFieldSlot);
    expect(result.ok).toBe(false);
    expect(result.blocking).toContainEqual(
      expect.objectContaining({ code: 'SLOT_ORPHAN', slot: 'campoInventado' }),
    );
  });

  it('vermelho→verde: roleSlot com papel que o arquétipo não usa bloqueia com SLOT_ORPHAN', async () => {
    const { svc } = buildService();
    const orphanRole = validBinding({
      roleSlots: [
        { role: 'controle-recebível', accountCode: '1.1.2' },
        { role: 'receita-serviço', accountCode: '3.1' },
        { role: 'estoque', accountCode: '1.1.6' }, // arquétipo revenue_recognition não usa 'estoque'
      ],
    });
    const result = await svc.validate(orphanRole);
    expect(result.ok).toBe(false);
    expect(result.blocking).toContainEqual(
      expect.objectContaining({ code: 'SLOT_ORPHAN', slot: 'estoque' }),
    );
  });
});

describe('Checagem #8 — versão de binding íntegra (VERSION_INVALID)', () => {
  it('vermelho→verde: bindingVersion não-positivo bloqueia com VERSION_INVALID', async () => {
    const { svc } = buildService();
    const badVersion = { ...validBinding(), bindingVersion: 0 };
    const result = await svc.validate(badVersion);
    expect(result.ok).toBe(false);
    expect(result.blocking).toContainEqual(expect.objectContaining({ code: 'VERSION_INVALID' }));
  });

  it('vermelho→verde: bindingVersion fracionário bloqueia com VERSION_INVALID', async () => {
    const { svc } = buildService();
    const fractional = { ...validBinding(), bindingVersion: 1.5 };
    const result = await svc.validate(fractional);
    expect(result.ok).toBe(false);
    expect(result.blocking).toContainEqual(expect.objectContaining({ code: 'VERSION_INVALID' }));
  });
});

describe('createSubledgerRecord — arquétipo classe-2 não declara papéis exigidos', () => {
  it('roleSlot presente numa checagem sem lista de papéis exigidos não gera SLOT_ORPHAN nem SLOT_UNFILLED — apenas as checagens de conta (#3/#4/#6) ainda rodam', async () => {
    const subledgerArchetype: Archetype = {
      kind: 'createSubledgerRecord',
      name: 'criacao-titulo-receber',
      sourceType: 'crm.opportunity.won',
      targetSubledger: 'receivable',
      slots: [{ name: 'amountCents', type: 'moneyCentsExact', guards: ['isSafeInteger'] }],
      idempotencyKey: 'documentNumber',
      invariants: ['legacy-sourcetype-guard'],
    };
    const catalog = buildCatalog({ subledger_command: subledgerArchetype });
    const { svc } = buildService({ catalog });
    const binding: AccountingBindingV1 = {
      sectorKey: 'beautySalon',
      bindingVersion: 1,
      compiledAt: '2026-08-21T00:00:00.000Z',
      compiledFromHash: 'sha256:abc',
      eventBindings: [
        {
          eventKey: 'crm.opportunity.won',
          archetypeKey: 'subledger_command',
          fieldSlots: [{ slotName: 'amountCents', sourceField: 'event.amount', transform: 'identity' }],
          roleSlots: [{ role: 'controle-recebível', accountCode: '1.1.2' }],
        },
      ],
    };
    const result = await svc.validate(binding);
    expect(result.blocking.some((i) => i.code === 'SLOT_ORPHAN')).toBe(false);
    expect(result.blocking.some((i) => i.code === 'SLOT_UNFILLED' && i.slot === 'controle-recebível')).toBe(false);
    expect(result.ok).toBe(true);
  });

  it('mesmo sem papéis exigidos, uma conta inválida referenciada num roleSlot ainda bloqueia (checagem #3 roda independentemente do kind)', async () => {
    const subledgerArchetype: Archetype = {
      kind: 'createSubledgerRecord',
      name: 'criacao-titulo-receber',
      sourceType: 'crm.opportunity.won',
      targetSubledger: 'receivable',
      slots: [{ name: 'amountCents', type: 'moneyCentsExact', guards: ['isSafeInteger'] }],
      idempotencyKey: 'documentNumber',
      invariants: [],
    };
    const catalog = buildCatalog({ subledger_command: subledgerArchetype });
    const { svc } = buildService({ catalog });
    const binding: AccountingBindingV1 = {
      sectorKey: 'beautySalon',
      bindingVersion: 1,
      compiledAt: '2026-08-21T00:00:00.000Z',
      compiledFromHash: 'sha256:abc',
      eventBindings: [
        {
          eventKey: 'crm.opportunity.won',
          archetypeKey: 'subledger_command',
          fieldSlots: [{ slotName: 'amountCents', sourceField: 'event.amount', transform: 'identity' }],
          roleSlots: [{ role: 'controle-recebível', accountCode: '9.9.9' }],
        },
      ],
    };
    const result = await svc.validate(binding);
    expect(result.blocking).toContainEqual(expect.objectContaining({ code: 'ACCOUNT_NOT_FOUND', accountCode: '9.9.9' }));
  });
});

// -------------------------------------------------------------------------------------------
// CORREÇÃO (review independente, finding high) — o papel `caixa-por-metodo` é resolvido por
// sub-chave (`"caixa-por-metodo:<método>"`, convenção de `dtos/CompileBindingDto.ts` §header,
// espelhada por `interpreter/interpret.ts:166-171`). O binding real do salão
// (`fixtures/saleBinding.ts`) grava uma `roleSlot` por sub-chave — sem reconhecer o papel-base,
// o validador rejeitava o próprio binding de referência. Testes abaixo provam, com o arquétipo
// REAL (`settlementArchetype`, via `archetypeCatalog`) e — no último teste — o BINDING real
// (`SALE_BINDING_V1`), que isso não acontece mais.
// -------------------------------------------------------------------------------------------
describe('CORREÇÃO — papel com sub-chave caixa-por-metodo:<método> (finding high do review)', () => {
  function buildSettlementBinding(
    roleSlots: AccountingBindingV1['eventBindings'][number]['roleSlots'],
  ): AccountingBindingV1 {
    return {
      sectorKey: 'beautySalon',
      bindingVersion: 1,
      compiledAt: '2026-08-21T00:00:00.000Z',
      compiledFromHash: 'sha256:abc',
      eventBindings: [
        {
          eventKey: 'salon.sale.settled',
          archetypeKey: 'settlement',
          fieldSlots: [
            { slotName: 'amount', sourceField: 'event.amount', transform: 'cents_from_reais' },
            { slotName: 'paymentMethod', sourceField: 'event.paymentMethod', transform: 'identity' },
            { slotName: 'dimension', sourceField: 'event.dimension', transform: 'identity' },
          ],
          roleSlots,
        },
      ],
    };
  }

  it('vermelho→verde: roleSlots por sub-chave (caixa-por-metodo:Cash/Pix/...) contra o arquétipo REAL settlement não gera SLOT_UNFILLED nem SLOT_ORPHAN', async () => {
    const chart = buildChart({
      '1.1.3': { code: '1.1.3', nature: 'Asset', acceptsEntries: true }, // Caixa
      '1.1.1': { code: '1.1.1', nature: 'Asset', acceptsEntries: true }, // Banco
      '1.1.4': { code: '1.1.4', nature: 'Asset', acceptsEntries: true }, // Cartão/Adquirente
      '2.1.1': { code: '2.1.1', nature: 'Liability', acceptsEntries: true }, // Pacotes Pré-pagos
      '1.1.2': { code: '1.1.2', nature: 'Asset', acceptsEntries: true }, // A Receber
    });
    const svc = new BindingValidationService(archetypeCatalog, chart, fakePostingValidatePort());
    const binding = buildSettlementBinding([
      { role: 'caixa-por-metodo:Cash', accountCode: '1.1.3' },
      { role: 'caixa-por-metodo:Pix', accountCode: '1.1.1' },
      { role: 'caixa-por-metodo:Debit Card', accountCode: '1.1.4' },
      { role: 'caixa-por-metodo:Credit Card', accountCode: '1.1.4' },
      { role: 'caixa-por-metodo:Package Balance', accountCode: '2.1.1' },
      { role: 'controle-recebível', accountCode: '1.1.2' },
    ]);
    const result = await svc.validate(binding);
    expect(result.blocking.filter((i) => i.code === 'SLOT_UNFILLED')).toEqual([]);
    expect(result.blocking.filter((i) => i.code === 'SLOT_ORPHAN')).toEqual([]);
  });

  it('vermelho→verde: checagem #6 ainda dispara NATURE_MISMATCH para um roleSlot de sub-chave apontando pra conta de natureza incompatível', async () => {
    const chart = buildChart({
      '1.1.3': { code: '1.1.3', nature: 'Revenue', acceptsEntries: true }, // errado: Revenue, não Asset/Liability
      '1.1.2': { code: '1.1.2', nature: 'Asset', acceptsEntries: true },
    });
    const svc = new BindingValidationService(archetypeCatalog, chart, fakePostingValidatePort());
    const binding = buildSettlementBinding([
      { role: 'caixa-por-metodo:Cash', accountCode: '1.1.3' },
      { role: 'controle-recebível', accountCode: '1.1.2' },
    ]);
    const result = await svc.validate(binding);
    expect(result.blocking).toContainEqual(
      expect.objectContaining({ code: 'NATURE_MISMATCH', accountCode: '1.1.3', slot: 'caixa-por-metodo:Cash' }),
    );
  });

  it('verde: SALE_BINDING_V1 (fixture real, Corpo C) valida OK contra o catálogo REAL (Corpo A) com todas as contas presentes e corretas — reprodução exata do finding do review', async () => {
    const chart = buildChart({
      '1.1.1': { code: '1.1.1', nature: 'Asset', acceptsEntries: true },
      '1.1.2': { code: '1.1.2', nature: 'Asset', acceptsEntries: true },
      '1.1.3': { code: '1.1.3', nature: 'Asset', acceptsEntries: true },
      '1.1.4': { code: '1.1.4', nature: 'Asset', acceptsEntries: true },
      '1.1.6': { code: '1.1.6', nature: 'Asset', acceptsEntries: true },
      '2.1.1': { code: '2.1.1', nature: 'Liability', acceptsEntries: true },
      '3.1': { code: '3.1', nature: 'Revenue', acceptsEntries: true },
      '3.2': { code: '3.2', nature: 'Revenue', acceptsEntries: true },
      '3.3': { code: '3.3', nature: 'Revenue', acceptsEntries: true },
      '4.2': { code: '4.2', nature: 'Expense', acceptsEntries: true },
    });
    const svc = new BindingValidationService(archetypeCatalog, chart, fakePostingValidatePort());
    const result = await svc.validate(SALE_BINDING_V1);
    expect(result.blocking).toEqual([]);
    expect(result.ok).toBe(true);
  });
});

// -------------------------------------------------------------------------------------------
// CORREÇÃO (review independente, finding medium) — 'createSubledgerRecord' não declara `lines`,
// então a checagem de slot órfão (gated a 'postEntry') nunca via um `role` desconhecido; e a
// checagem #6 simplesmente não disparava (lookup `undefined` em `ROLE_ALLOWED_NATURES`). Um papel
// fora da union congelada (`AccountRole`, F-BP-3a) passava validação sem NENHUM bloqueio.
// -------------------------------------------------------------------------------------------
describe('CORREÇÃO — papel fora da union AccountRole em createSubledgerRecord (finding medium do review)', () => {
  const subledgerArchetype: Archetype = {
    kind: 'createSubledgerRecord',
    name: 'criacao-titulo-receber',
    sourceType: 'crm.opportunity.won',
    targetSubledger: 'receivable',
    slots: [{ name: 'amountCents', type: 'moneyCentsExact', guards: ['isSafeInteger'] }],
    idempotencyKey: 'documentNumber',
    invariants: [],
  };

  function buildSubledgerBinding(role: string): AccountingBindingV1 {
    return {
      sectorKey: 'beautySalon',
      bindingVersion: 1,
      compiledAt: '2026-08-21T00:00:00.000Z',
      compiledFromHash: 'sha256:abc',
      eventBindings: [
        {
          eventKey: 'crm.opportunity.won',
          archetypeKey: 'subledger_command',
          fieldSlots: [{ slotName: 'amountCents', sourceField: 'event.amount', transform: 'identity' }],
          roleSlots: [{ role, accountCode: '1.1.2' }],
        },
      ],
    };
  }

  it('vermelho→verde: role fora do catálogo (AccountRole) bloqueia com SLOT_ORPHAN mesmo sob createSubledgerRecord, onde não há lista de papéis exigidos', async () => {
    const catalog = buildCatalog({ subledger_command: subledgerArchetype });
    const { svc } = buildService({ catalog });
    const result = await svc.validate(buildSubledgerBinding('totally-bogus-role-not-in-union'));
    expect(result.ok).toBe(false);
    expect(result.blocking).toContainEqual(
      expect.objectContaining({ code: 'SLOT_ORPHAN', slot: 'totally-bogus-role-not-in-union' }),
    );
  });

  it('verde: role legítimo (membro de AccountRole) sob createSubledgerRecord continua sem SLOT_ORPHAN — controle não regride', async () => {
    const catalog = buildCatalog({ subledger_command: subledgerArchetype });
    const { svc } = buildService({ catalog });
    const result = await svc.validate(buildSubledgerBinding('controle-recebível'));
    expect(result.blocking.some((i) => i.code === 'SLOT_ORPHAN')).toBe(false);
  });
});

// -------------------------------------------------------------------------------------------
// DRY-RUN (F-P1-6b1, item 6/7 do BRIEF) — a `PostingValidatePort` deixa de ser "reservada, não
// acionada" e passa a rodar de fato: 1 lançamento sintético por eventBinding classe-1 limpo, via
// `interpret()` real, checado por `validateOnly`. Sob F-BP-2(b) este é o ÚNICO gate antes do
// caminho do dinheiro — os testes abaixo provam que o fio não está cortado.
// -------------------------------------------------------------------------------------------
describe('DRY-RUN (F-P1-6b1) — validate() aciona interpret() + PostingValidatePort.validateOnly', () => {
  it('vermelho→verde: binding válido aciona o dry-run (spy no port) e o resultado continua ok', async () => {
    const port: PostingValidatePort = { validateOnly: jest.fn(async () => undefined) };
    const catalog = buildCatalog({ revenue_recognition: revenueRecognitionArchetype });
    const chart = buildChart(chartAccounts);
    const svc = new BindingValidationService(catalog, chart, port);

    const result = await svc.validate(validBinding());

    expect(result.ok).toBe(true);
    expect(result.blocking).toEqual([]);
    expect(port.validateOnly).toHaveBeenCalledTimes(1);
    // Prova que o dry-run passou o PostEntryInput REAL do interpret() (não um placeholder vazio) —
    // as 2 linhas do arquétipo, com os accountCode literais do binding.
    const simulatedInput = (port.validateOnly as jest.Mock).mock.calls[0][0];
    expect(simulatedInput).toMatchObject({
      lines: expect.arrayContaining([
        expect.objectContaining({ accountCode: '1.1.2' }),
        expect.objectContaining({ accountCode: '3.1' }),
      ]),
    });
  });

  it('vermelho→verde: PostingValidatePort.validateOnly rejeitando vira DRY_RUN_FAILED bloqueante — binding NÃO passa', async () => {
    const port: PostingValidatePort = {
      validateOnly: jest.fn(async () => {
        throw new Error('período contábil fechado (simulado)');
      }),
    };
    const catalog = buildCatalog({ revenue_recognition: revenueRecognitionArchetype });
    const chart = buildChart(chartAccounts);
    const svc = new BindingValidationService(catalog, chart, port);

    const result = await svc.validate(validBinding());

    expect(result.ok).toBe(false);
    expect(result.blocking).toContainEqual(
      expect.objectContaining({ code: 'DRY_RUN_FAILED', message: expect.stringContaining('período contábil fechado') }),
    );
    expect(port.validateOnly).toHaveBeenCalledTimes(1);
  });

  it('dry-run NÃO roda para um eventBinding que já tem bloqueante estrutural (ACCOUNT_NOT_FOUND) — o port nunca é chamado', async () => {
    const port: PostingValidatePort = { validateOnly: jest.fn(async () => undefined) };
    const catalog = buildCatalog({ revenue_recognition: revenueRecognitionArchetype });
    const chart = buildChart(chartAccounts);
    const svc = new BindingValidationService(catalog, chart, port);
    const unknownAccount = validBinding({
      roleSlots: [
        { role: 'controle-recebível', accountCode: '9.9.9' }, // não existe no chart fixture
        { role: 'receita-serviço', accountCode: '3.1' },
      ],
    });

    const result = await svc.validate(unknownAccount);

    expect(result.ok).toBe(false);
    expect(result.blocking.some((i) => i.code === 'ACCOUNT_NOT_FOUND')).toBe(true);
    expect(result.blocking.some((i) => i.code === 'DRY_RUN_FAILED')).toBe(false);
    expect(port.validateOnly).not.toHaveBeenCalled();
  });

  it('interpret() rejeitando (papel caixa-por-metodo sem sub-chave mapeada) também vira DRY_RUN_FAILED — o catch cobre os 2 pontos de falha', async () => {
    const settlementArchetype: Archetype = {
      kind: 'postEntry',
      name: 'liquidacao',
      sourceType: 'salon.sale.settled',
      slots: [
        { name: 'amountCents', type: 'moneyCentsExact', guards: ['isSafeInteger'] },
        { name: 'paymentMethod', type: 'enumLookup', guards: [] },
      ],
      lines: [
        { role: 'caixa-por-metodo', side: 'debit', amountSlot: 'amountCents' },
        { role: 'controle-recebível', side: 'credit', amountSlot: 'amountCents' },
      ],
      invariants: [],
    };
    const port: PostingValidatePort = { validateOnly: jest.fn(async () => undefined) };
    const catalog = buildCatalog({ settlement: settlementArchetype });
    // Chart tem a conta, mas o binding NUNCA declara uma roleSlot 'caixa-por-metodo:<método>' —
    // sem sub-chave o synthetic enumLookup value fica vazio e `resolveLineAccountCode` (interpret.ts)
    // lança antes mesmo do dry-run chegar a chamar o port.
    const chart = buildChart({
      '1.1.2': { code: '1.1.2', nature: 'Asset', acceptsEntries: true },
    });
    const svc = new BindingValidationService(catalog, chart, port);
    const binding: AccountingBindingV1 = {
      sectorKey: 'beautySalon',
      bindingVersion: 1,
      compiledAt: '2026-08-21T00:00:00.000Z',
      compiledFromHash: 'sha256:abc',
      eventBindings: [
        {
          eventKey: 'salon.sale.settled',
          archetypeKey: 'settlement',
          fieldSlots: [
            { slotName: 'amountCents', sourceField: 'event.amount', transform: 'identity' },
            { slotName: 'paymentMethod', sourceField: 'event.paymentMethod', transform: 'identity' },
          ],
          // única roleSlot exigida pelo arquétipo (papel-base 'caixa-por-metodo', sem sub-chave) —
          // válida para as checagens #1-#7 (baseRole cobre isso), mas insuficiente pro interpret()
          // resolver a conta em runtime (que exige a sub-chave completa).
          roleSlots: [
            { role: 'caixa-por-metodo', accountCode: '1.1.2' },
            { role: 'controle-recebível', accountCode: '1.1.2' },
          ],
        },
      ],
    };

    const result = await svc.validate(binding);

    expect(result.blocking.filter((i) => i.code === 'SLOT_UNFILLED' || i.code === 'SLOT_ORPHAN')).toEqual([]);
    expect(result.ok).toBe(false);
    expect(result.blocking).toContainEqual(expect.objectContaining({ code: 'DRY_RUN_FAILED' }));
    expect(port.validateOnly).not.toHaveBeenCalled(); // interpret() já falhou antes de chegar no port
  });

  it('classe-2 (createSubledgerRecord) fica fora do dry-run — o port nunca é chamado mesmo para um binding limpo', async () => {
    const port: PostingValidatePort = { validateOnly: jest.fn(async () => undefined) };
    const subledgerArchetype: Archetype = {
      kind: 'createSubledgerRecord',
      name: 'criacao-titulo-receber',
      sourceType: 'crm.opportunity.won',
      targetSubledger: 'receivable',
      slots: [{ name: 'amountCents', type: 'moneyCentsExact', guards: ['isSafeInteger'] }],
      idempotencyKey: 'documentNumber',
      invariants: [],
    };
    const catalog = buildCatalog({ subledger_command: subledgerArchetype });
    const chart = buildChart({ '1.1.2': { code: '1.1.2', nature: 'Asset', acceptsEntries: true } });
    const svc = new BindingValidationService(catalog, chart, port);
    const binding: AccountingBindingV1 = {
      sectorKey: 'beautySalon',
      bindingVersion: 1,
      compiledAt: '2026-08-21T00:00:00.000Z',
      compiledFromHash: 'sha256:abc',
      eventBindings: [
        {
          eventKey: 'crm.opportunity.won',
          archetypeKey: 'subledger_command',
          fieldSlots: [{ slotName: 'amountCents', sourceField: 'event.amount', transform: 'identity' }],
          roleSlots: [{ role: 'controle-recebível', accountCode: '1.1.2' }],
        },
      ],
    };

    const result = await svc.validate(binding);

    expect(result.ok).toBe(true);
    expect(port.validateOnly).not.toHaveBeenCalled();
  });
});
