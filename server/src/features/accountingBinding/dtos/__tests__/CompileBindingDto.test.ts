import {
  ChartAccountSnapshotSchema,
  CompileBindingRequestSchema,
  ListBindingsQuerySchema,
  ValidateBindingRequestSchema,
} from '../CompileBindingDto';

const validEventBinding = {
  eventKey: 'salon.sale.finalized',
  archetypeKey: 'revenue_recognition',
  fieldSlots: [{ slotName: 'amount', sourceField: 'event.amount', transform: 'cents_from_reais' }],
  roleSlots: [{ role: 'controle-recebível', accountCode: '1.1.2' }],
};

const validChart = [{ code: '1.1.2', nature: 'Asset', acceptsEntries: true }];

const validRequest = {
  unitId: 'unit-1',
  sectorKey: 'beautySalon',
  operationalSchema: { 'salon.sale.finalized': ['amount'] },
  chart: validChart,
  eventBindings: [validEventBinding],
};

describe('CompileBindingRequestSchema — CONTROLE (sem isto os negativos são vazios)', () => {
  it('accepts um corpo bem-formado', () => {
    expect(CompileBindingRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it('/validate reaproveita EXATAMENTE o mesmo shape de /compile', () => {
    expect(ValidateBindingRequestSchema.safeParse(validRequest).success).toBe(true);
  });
});

describe('CompileBindingRequestSchema — campos obrigatórios', () => {
  it('rejects sem unitId', () => {
    const { unitId, ...semUnitId } = validRequest;
    expect(CompileBindingRequestSchema.safeParse(semUnitId).success).toBe(false);
  });

  it('rejects sem sectorKey', () => {
    const { sectorKey, ...semSectorKey } = validRequest;
    expect(CompileBindingRequestSchema.safeParse(semSectorKey).success).toBe(false);
  });

  it('rejects chart vazio (min 1)', () => {
    expect(CompileBindingRequestSchema.safeParse({ ...validRequest, chart: [] }).success).toBe(false);
  });

  it('rejects eventBindings vazio (min 1)', () => {
    expect(CompileBindingRequestSchema.safeParse({ ...validRequest, eventBindings: [] }).success).toBe(false);
  });

  it('rejects roleSlot SEM accountCode dentro de eventBindings — reaproveita RoleSlotSchema da Fase 0 (F-P1-5a)', () => {
    const broken = {
      ...validRequest,
      eventBindings: [{ ...validEventBinding, roleSlots: [{ role: 'controle-recebível' }] }],
    };
    expect(CompileBindingRequestSchema.safeParse(broken).success).toBe(false);
  });
});

describe('CompileBindingRequestSchema — `.strict()`', () => {
  it('rejects chave desconhecida no topo', () => {
    expect(CompileBindingRequestSchema.safeParse({ ...validRequest, extra: 1 }).success).toBe(false);
  });
});

describe('ChartAccountSnapshotSchema', () => {
  it('accepts code+nature+acceptsEntries (CONTROLE)', () => {
    expect(ChartAccountSnapshotSchema.safeParse(validChart[0]).success).toBe(true);
  });

  it('rejects code vazio', () => {
    expect(ChartAccountSnapshotSchema.safeParse({ ...validChart[0], code: '' }).success).toBe(false);
  });

  it('rejects chave desconhecida', () => {
    expect(ChartAccountSnapshotSchema.safeParse({ ...validChart[0], extra: 1 }).success).toBe(false);
  });
});

describe('ListBindingsQuerySchema', () => {
  it('accepts só unitId (sectorKey/status opcionais) — CONTROLE', () => {
    expect(ListBindingsQuerySchema.safeParse({ unitId: 'unit-1' }).success).toBe(true);
  });

  it('accepts com sectorKey e status válidos', () => {
    expect(
      ListBindingsQuerySchema.safeParse({ unitId: 'unit-1', sectorKey: 'beautySalon', status: 'Active' }).success,
    ).toBe(true);
  });

  it('rejects sem unitId', () => {
    expect(ListBindingsQuerySchema.safeParse({}).success).toBe(false);
  });

  it('rejects status fora do enum fechado', () => {
    expect(ListBindingsQuerySchema.safeParse({ unitId: 'unit-1', status: 'Pendente' }).success).toBe(false);
  });
});
