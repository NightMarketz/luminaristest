/**
 * BARREIRA — a escrita em `analyticsDefinitions` é 403 POR DESENHO, não por bug.
 *
 * Decisão: `docs/adr/ADR-ANALYTICS-DEFS-write-unblock.md`, fork **F-AD0 → (c) manter congelado**
 * (ratificado 2026-08-01). Este arquivo é a fatia inteira dessa decisão: se alguém afrouxar o
 * travamento sem passar pelo ADR, um destes casos fica vermelho.
 *
 * Por que este teste existe se `DynamicTablePolicy.spec.ts` já cobre `presentation: 'system'`:
 * aquele spec prova a REGRA sobre um objeto de tabela fabricado à mão. Ele continua verde se
 * alguém (a) tirar `ui.presentation` do preset `analyticsDefinitions` ou (b) mover a consulta a
 * `canManageData` para depois de outra guarda no service. Os dois elos que faltavam são exatamente
 * o que quebra aqui:
 *
 *   elo 1 — o preset REAL (importado, não copiado) carrega `ui.presentation === 'system'`;
 *   elo 2 — as três escritas do service consultam `canManageData` ANTES de validar o payload,
 *           com a policy REAL (não um mock que devolve `true`).
 *
 * A armadilha que este arquivo fixa em concreto: **`options.isSystem` NÃO destrava.**
 * `canManageData(user, table)` nem recebe o parâmetro (`DynamicTableService.ts:514`) e `isSystem`
 * só é derivado 15 linhas depois (`:529`), a serviço de `enforceNoOverlap`/`runRules`/`readOnly` —
 * nunca de autorização. Quem tentar "destravar via isSystem" descobre aqui, não em produção.
 *
 * Sem DB, sem HTTP, sem factory: o caminho HTTP não alcança a policy neste ambiente — `getFactory()`
 * constrói OpenAIService e estoura sem a chave, o que faz o POST responder 500 antes da policy (já
 * documentado em `controllers/__tests__/analyticsDefinitions.routes.integration.test.ts:161-177`).
 * Por isso a barreira mora na camada de service, com repositório falso e policy de verdade.
 *
 * Roda no projeto `unit` (`npm run test:unit`).
 */
import { DynamicTableService } from '../DynamicTableService';
import { DynamicTablePolicy } from '../../policies/DynamicTablePolicy';
import { CoreSystemPreset } from '../../presets/systems/CoreSystemPreset';
import type { IDynamicTable, ITableSchema } from '../../models/DynamicTable.model';
import type { IDynamicTableRepository } from '../../repositories/IDynamicTableRepository';
import { Role } from '../../../users/models/User.model';
import type { UserContext } from '@/lib/authUtils';
import { ForbiddenError, ValidationError } from '../../../../lib/errors';

const OWNER_ID = 'owner-1';
const TABLE_ID = 'tbl-analytics-defs';
const DATA_ID = 'def-1';

/** O schema REAL do preset — importado, para o elo 1 quebrar se o preset mudar. */
const presetSchema = CoreSystemPreset.tables.analyticsDefinitions.schema as ITableSchema;

const actor = (role: Role, userId: string): UserContext => ({
  id: userId,
  userId,
  name: 'n',
  username: 'u',
  email: 'u@test.co',
  userEmail: 'u@test.co',
  role,
  userRole: role,
  createdAt: new Date(),
  updatedAt: new Date(),
});

/** O dono da tabela. É o caso que o achado N1 descreve: 403 até para quem é dono. */
const owner = actor(Role.USER, OWNER_ID);
/** O dono COM papel ADMIN — a manchete do achado ("403 para todos, inclusive ADMIN dono"). */
const adminOwner = actor(Role.ADMIN, OWNER_ID);

const tableWith = (schema: ITableSchema): IDynamicTable =>
  ({
    id: TABLE_ID,
    userId: OWNER_ID,
    name: 'Analytics Definitions',
    internalName: 'analyticsDefinitions',
    category: 'operations',
    schema,
    createdAt: new Date(),
    updatedAt: new Date(),
  }) as IDynamicTable;

/**
 * Service com repositório falso e **policy real**. O falso responde só o que as três escritas
 * consultam antes da barreira: `findTableById` (create) e `findTableByDataId` (update/delete).
 */
function buildService(schema: ITableSchema = presetSchema) {
  const table = tableWith(schema);
  const repository = {
    findTableById: jest.fn(async () => table),
    findTableByDataId: jest.fn(async () => table),
    findDataById: jest.fn(async () => ({ id: DATA_ID, dynamicTableId: TABLE_ID, data: {} })),
  } as unknown as IDynamicTableRepository;

  return new DynamicTableService(repository, new DynamicTablePolicy());
}

/**
 * Payload deliberadamente INVÁLIDO (faltam `key`/`title`/`chartType`/`pipeline`, que são
 * `required` sem `defaultValue`). Nos casos travados ele é irrelevante — a policy responde antes.
 * No CONTROLE ele é o discriminador: sem o flag de sistema, o mesmo corpo morre em
 * `ValidationError`, provando que o 403 vem do `presentation`, e não de um falso mal montado.
 */
const INVALID_PAYLOAD = { data: {} };

describe('elo 1 — o preset analyticsDefinitions é `presentation: "system"`', () => {
  it('carrega o flag no preset REAL (não numa cópia de teste)', () => {
    expect(presetSchema.ui?.presentation).toBe('system');
  });
});

describe('elo 2 — as três escritas recusam o DONO da tabela de sistema', () => {
  it('createTableData → ForbiddenError', async () => {
    await expect(
      buildService().createTableData(owner, TABLE_ID, INVALID_PAYLOAD),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('updateTableData → ForbiddenError', async () => {
    await expect(
      buildService().updateTableData(owner, DATA_ID, INVALID_PAYLOAD),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('deleteTableData → ForbiddenError', async () => {
    await expect(buildService().deleteTableData(owner, DATA_ID)).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('o dono com papel ADMIN também é recusado — o flag vence o papel', async () => {
    await expect(
      buildService().createTableData(adminOwner, TABLE_ID, INVALID_PAYLOAD),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('armadilha — `options.isSystem` NÃO é uma válvula de autorização', () => {
  it('createTableData com isSystem: true continua ForbiddenError', async () => {
    await expect(
      buildService().createTableData(owner, TABLE_ID, INVALID_PAYLOAD, { isSystem: true }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('updateTableData com isSystem: true continua ForbiddenError', async () => {
    await expect(
      buildService().updateTableData(owner, DATA_ID, INVALID_PAYLOAD, { isSystem: true }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('CONTROLE — sem o flag, o mesmo corpo passa da policy e morre na validação', () => {
  it('ValidationError (não ForbiddenError) quando `ui.presentation` não é "system"', async () => {
    // Mesmos campos do preset, só sem o bloco `ui`. Prova as DUAS coisas de uma vez: o 403 vem do
    // flag (e não do repositório falso), e a policy roda ANTES da validação de payload — se a ordem
    // do service inverter, este caso vira ForbiddenError e fica vermelho.
    const { ui: _ui, ...withoutUi } = presetSchema;
    const error = await buildService(withoutUi as ITableSchema)
      .createTableData(owner, TABLE_ID, INVALID_PAYLOAD)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error).not.toBeInstanceOf(ForbiddenError);
  });
});
