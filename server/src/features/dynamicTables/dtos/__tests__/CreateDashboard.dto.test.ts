/**
 * BE-INCR-CRM-MODULE-COMPOSITION (I8) — contrato Zod do `POST /dashboard/create` (comportamento 2, §3)
 * e do `POST /dashboard/modules/install` (comportamento 8). O snapshot de shape é o gate do comportamento 13:
 * mudança de forma aparece como diff legível no PR.
 */
import { z } from 'zod';
import { CustomCreationSchema, QuickCreationSchema } from '../CreateDashboard.dto';
import { InstallModuleResultSchema, InstallModuleSchema } from '../InstallModule.dto';

beforeEach(() => jest.clearAllMocks());

const unit = { name: 'Matriz' };

describe('CreateDashboard DTO — modules (F-CRM-9 → b)', () => {
  it('modules default [] e aceita lista plana de ModuleKey', () => {
    expect(QuickCreationSchema.parse({ suiteKey: 'beautySalon', unit }).modules).toEqual([]);
    expect(QuickCreationSchema.parse({ suiteKey: 'beautySalon', unit, modules: ['CRM-2'] }).modules).toEqual(['CRM-2']);
  });

  it('ModuleKey fora do registro → erro', () => {
    expect(QuickCreationSchema.safeParse({ suiteKey: 'x', unit, modules: ['CRM-9'] }).success).toBe(false);
  });

  it('.strict(): chave desconhecida → erro nos dois ramos', () => {
    expect(QuickCreationSchema.safeParse({ suiteKey: 'x', unit, foo: 1 }).success).toBe(false);
    expect(CustomCreationSchema.safeParse({ mode: 'custom', presetKey: 'x', unit, foo: 1 }).success).toBe(false);
  });

  it('InstallModule: moduleKey obrigatório, strict; resultado com status fechado', () => {
    expect(InstallModuleSchema.safeParse({ moduleKey: 'CRM-2' }).success).toBe(true);
    expect(InstallModuleSchema.safeParse({}).success).toBe(false);
    expect(InstallModuleSchema.safeParse({ moduleKey: 'CRM-2', x: 1 }).success).toBe(false);
    expect(InstallModuleResultSchema.safeParse({ status: 'installed', tables: [], synced: [] }).success).toBe(true);
    expect(InstallModuleResultSchema.safeParse({ status: 'removed', tables: [], synced: [] }).success).toBe(false);
  });

  it('shape snapshot (comportamento 13)', () => {
    const shape = (s: z.ZodType) => z.toJSONSchema(s, { io: 'input', unrepresentable: 'any' });
    expect({
      QuickCreationSchema: shape(QuickCreationSchema),
      CustomCreationSchema: shape(CustomCreationSchema),
      InstallModuleSchema: shape(InstallModuleSchema),
      InstallModuleResultSchema: shape(InstallModuleResultSchema),
    }).toMatchSnapshot();
  });
});
