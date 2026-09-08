/**
 * BE-INCR-P2-VERTICAL-CLINICA — comportamento 5 ("o binding do vertical 2 cobre TODOS os eventos
 * que a operação dele emite — e a ausência de cobertura é detectada por gate, não por leitura de
 * log"). Espelha o harness de `BindingCompileService.integration.test.ts` (SQLite real, repositório
 * real, `StubValidationService` para isolar o gate de cobertura das 9 checagens estruturais do
 * validador — aquelas já têm suíte própria).
 *
 * Teste-guarda literal do BRIEF §3: "fixture de clínica com um `eventBinding` deliberadamente
 * removido → o gate reprova."
 */
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { AccountingBindingRepository } from '@/features/accountingBinding/repositories/AccountingBindingRepository';
import { resolveBindingScope } from '@/features/accountingBinding/repositories/IAccountingBindingRepository';
import type { BindingScope } from '@/features/accountingBinding/repositories/IAccountingBindingRepository';
import { AccountingBindingPolicy } from '@/features/accountingBinding/policies/AccountingBindingPolicy';
import {
  BindingCompileService,
  computeEventCoverage,
  type CompileBindingInput,
  type IBindingAuditPort,
  type IBindingValidationService,
} from '@/features/accountingBinding/services/BindingCompileService';
import type { AccountingBindingV1 } from '@/features/accountingBinding/dtos/AccountingBindingDto';
import type { BindingValidationResult } from '@/features/accountingBinding/models/validationResult';
import { CLINIC_BINDING_V1, CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT } from '@/features/accountingBinding/fixtures/clinicBinding';

const UNIT = 'unit-coverage';
const DONO_A = 'u-coverage-a';

const escopo = (userId: string = DONO_A, unitId: string = UNIT): BindingScope =>
  resolveBindingScope({ userId }, unitId);

class StubValidationService implements IBindingValidationService {
  constructor(private readonly outcome: BindingValidationResult) {}
  async validate(_binding: AccountingBindingV1): Promise<BindingValidationResult> {
    return this.outcome;
  }
}

class RecordingAuditPort implements IBindingAuditPort {
  public readonly events: Parameters<IBindingAuditPort['append']>[2][] = [];
  async append(
    _tx: unknown,
    _scope: BindingScope,
    event: Parameters<IBindingAuditPort['append']>[2],
  ): Promise<void> {
    this.events.push(event);
  }
}

const OK: BindingValidationResult = { ok: true, blocking: [], warnings: [] };

const repo = new AccountingBindingRepository();
const policy = new AccountingBindingPolicy();
const buildService = (auditPort: IBindingAuditPort = new RecordingAuditPort()) =>
  new BindingCompileService(repo, policy, new StubValidationService(OK), auditPort);

const clinicInput = (overrides: Partial<CompileBindingInput> = {}): CompileBindingInput => ({
  sectorKey: CLINIC_BINDING_V1.sectorKey,
  operationalSchema: CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT,
  chart: [
    { code: '1.1.1', nature: 'Asset', acceptsEntries: true },
    { code: '1.1.2', nature: 'Asset', acceptsEntries: true },
    { code: '1.1.3', nature: 'Asset', acceptsEntries: true },
    { code: '1.1.4', nature: 'Asset', acceptsEntries: true },
    { code: '1.1.6', nature: 'Asset', acceptsEntries: true },
    { code: '2.1.1', nature: 'Liability', acceptsEntries: true },
    { code: '3.1', nature: 'Revenue', acceptsEntries: true },
    { code: '3.2', nature: 'Revenue', acceptsEntries: true },
    { code: '3.3', nature: 'Revenue', acceptsEntries: true },
    { code: '4.2', nature: 'Expense', acceptsEntries: true },
  ],
  eventBindings: CLINIC_BINDING_V1.eventBindings,
  ...overrides,
});

describe('computeEventCoverage — função pura', () => {
  it('missing vazio quando todo emitível está vinculado (binding completo da clínica)', () => {
    const report = computeEventCoverage(UNIT, 'aestheticClinic', CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT, CLINIC_BINDING_V1.eventBindings);
    expect(report.missing).toEqual([]);
    expect(report.emittableEventKeys.sort()).toEqual(report.boundEventKeys.sort());
  });

  it('detecta um eventBinding deliberadamente removido (teste-guarda literal do BRIEF)', () => {
    const semCogs = CLINIC_BINDING_V1.eventBindings.filter((eb) => eb.eventKey !== 'sale.cogs');
    const report = computeEventCoverage(UNIT, 'aestheticClinic', CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT, semCogs);
    expect(report.missing).toEqual(['sale.cogs']);
  });

  it('orphan (bound sem schema correspondente) NÃO entra em missing — informativo, não bloqueante', () => {
    const schemaReduzido = { 'sale.finalized': CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT['sale.finalized'] };
    const report = computeEventCoverage(UNIT, 'aestheticClinic', schemaReduzido, CLINIC_BINDING_V1.eventBindings);
    expect(report.missing).toEqual([]);
    expect(report.orphan.sort()).toEqual(['sale.cogs', 'sale.package.sold', 'sale.returned', 'sale.settled']);
  });
});

describe('BindingCompileService.compile() — gate de cobertura em SQLite real', () => {
  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({
      data: { id: DONO_A, name: DONO_A, username: DONO_A, email: `${DONO_A}@test.local`, password: 'x', role: 'USER' },
    });
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('binding COMPLETO da clínica (5/5 eventos) → auto-ativa, coverage.missing vazio', async () => {
    const service = buildService();
    const result = await service.compile(escopo(), clinicInput({ sectorKey: 'setor-cobertura-completa' }));

    expect(result.status).toBe('Active');
    expect(result.coverage.missing).toEqual([]);
    expect(result.coverage.boundEventKeys.sort()).toEqual(
      ['sale.cogs', 'sale.finalized', 'sale.package.sold', 'sale.returned', 'sale.settled'].sort(),
    );
  });

  it('binding INCOMPLETO (falta sale.cogs) → NUNCA vira Active, mesmo com o validador estrutural OK', async () => {
    const auditPort = new RecordingAuditPort();
    const service = buildService(auditPort);
    const eventBindingsSemCogs = CLINIC_BINDING_V1.eventBindings.filter((eb) => eb.eventKey !== 'sale.cogs');

    const result = await service.compile(
      escopo(),
      clinicInput({ sectorKey: 'setor-cobertura-incompleta', eventBindings: eventBindingsSemCogs }),
    );

    // O validador estrutural (stub OK) não acusaria nada — é EXCLUSIVAMENTE o gate de cobertura
    // que reprova. Sem este gate, este binding viraria Active e a ECD sairia sem CMV, em silêncio.
    expect(result.status).toBe('Draft');
    expect(result.coverage.missing).toEqual(['sale.cogs']);
    expect(result.binding.status).toBe('Draft');

    // Audit reflete a reprovação — blockingCount conta o `missing`, mesmo com validation.ok=true.
    const failedEvent = auditPort.events.find((e) => e.eventType === 'binding.validation_failed');
    expect(failedEvent).toBeDefined();
    expect(failedEvent!.payload).toMatchObject({ blockingCount: 1 });
    expect(auditPort.events.some((e) => e.eventType === 'binding.activated')).toBe(false);
  });

  it('binding com evento ÓRFÃO (referencia mais do que a operação emite) NÃO bloqueia — orphan é informativo', async () => {
    const schemaReduzido = { 'sale.finalized': CLINIC_OPERATIONAL_SCHEMA_SNAPSHOT['sale.finalized'] };
    const service = buildService();

    const result = await service.compile(
      escopo(),
      clinicInput({ sectorKey: 'setor-orphan', operationalSchema: schemaReduzido }),
    );

    expect(result.status).toBe('Active');
    expect(result.coverage.missing).toEqual([]);
    expect(result.coverage.orphan.length).toBeGreaterThan(0);
  });
});
