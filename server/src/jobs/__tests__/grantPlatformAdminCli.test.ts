/**
 * BE-INCR-LEGAL-PARAMS PR-1 (emenda §9 L-2) — o comando que concede PLATFORM_ADMIN, e a prova de que o DTO de usuário
 * (caminho da API) NÃO aceita esse papel.
 */
import { grantPlatformAdmin } from '../grantPlatformAdminCli';
import { CreateUserSchema, UpdateUserSchema } from '../../features/users/dtos/UserDto';

type U = { id: string; role: string };

function fakeRepo(users: Record<string, U>) {
  const updates: { id: string; role: unknown }[] = [];
  return {
    updates,
    repo: {
      getUserByEmail: jest.fn(async (email: string) => (users[email] ?? null) as never),
      updateUser: jest.fn(async (id: string, data: { role?: unknown }) => {
        updates.push({ id, role: data.role });
        return {} as never;
      }),
    },
  };
}

describe('grantPlatformAdminCli', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('sem --email ⇒ 2; e-mail inexistente ⇒ 1; nada gravado', async () => {
    const f = fakeRepo({});
    expect(await grantPlatformAdmin([], f.repo)).toBe(2);
    expect(await grantPlatformAdmin(['--email', 'x@y.z'], f.repo)).toBe(1);
    expect(f.updates).toEqual([]);
  });

  it('promove USER/ADMIN a PLATFORM_ADMIN; já PLATFORM_ADMIN ⇒ no-op (idempotente)', async () => {
    const f = fakeRepo({ 'a@x.z': { id: 'a', role: 'ADMIN' }, 'p@x.z': { id: 'p', role: 'PLATFORM_ADMIN' } });
    expect(await grantPlatformAdmin(['--email', 'a@x.z'], f.repo)).toBe(0);
    expect(await grantPlatformAdmin(['--email', 'p@x.z'], f.repo)).toBe(0);
    expect(f.updates).toEqual([{ id: 'a', role: 'PLATFORM_ADMIN' }]);
  });

  it('L-2 — o DTO de usuário (API) recusa role PLATFORM_ADMIN no create e no update', () => {
    expect(UpdateUserSchema.safeParse({ role: 'PLATFORM_ADMIN' }).success).toBe(false);
    expect(UpdateUserSchema.safeParse({ role: 'ADMIN' }).success).toBe(true);
    const create = CreateUserSchema.safeParse({ name: 'N', username: 'n1', email: 'n@x.z', password: 'Senha-forte-123', role: 'PLATFORM_ADMIN' });
    expect(create.success).toBe(false);
  });
});
