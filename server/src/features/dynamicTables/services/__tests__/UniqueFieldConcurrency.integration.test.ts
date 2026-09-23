/**
 * TOCTOU do `compositeUnique` sob escritores CONCORRENTES — SQLite real, sem mock de prisma.
 *
 * GAP-MAP Nível 4, lacuna "`unique`/`compositeUnique` de preset sem gate in-tx" (fila de triagem, item 7).
 * Gêmeo de `NoOverlapConcurrency.integration.test.ts`, que expôs e depois fechou a mesma classe para
 * `noOverlap`. O que este arquivo expõe: `validateAdvancedRules` decide a unicidade composta lendo
 * `repo.findAllDataByTableId` na validação (DynamicTableService.ts:567 → :1238), **fora** da transação
 * do insert; dentro de `writeCreate` só `enforceNoOverlap` é re-checado (:582), e o lock de
 * `runSerializedIfNoOverlap` (:1134) só arma quando a tabela declara `noOverlap`. N pedidos cujas
 * leituras aconteçam antes do primeiro commit leem todos "sem duplicata" e TODOS persistem.
 *
 * A barreira (`BarrierRepo`) tem o mesmo papel da do molde: segura cada `findAllDataByTableId` até os N
 * terem LIDO. Ela não cria a janela — só fixa o entrelaçamento adversarial que duas requisições HTTP reais
 * podem produzir por azar de timing, para o caso não flakear. Serviço, validação, tx e SQLite são o
 * caminho real. Como todas as leituras precedem todas as escritas, o desfecho não depende de o SO
 * serializar o SQLite.
 *
 * `it.failing` enquanto a lacuna estiver aberta: o corpo afirma o comportamento CORRETO. Quando o gate
 * in-tx existir, o corpo passa, o marcador reprova ("passing test marked as failing") e deve virar `it`.
 */
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import prisma from '@/lib/prisma';
import { DynamicTableRepository } from '@/features/dynamicTables/repositories/DynamicTableRepository';
import { DynamicTablePolicy } from '@/features/dynamicTables/policies/DynamicTablePolicy';
import { DynamicTableService } from '@/features/dynamicTables/services/DynamicTableService';
import type { IDynamicTableData } from '@/features/dynamicTables/models/DynamicTable.model';
import { Role } from '@/features/users/models/User.model';
import { ValidationError } from '@/lib/errors';
import type { UserContext } from '@/lib/authUtils';

const SERVER_DIR = path.resolve(__dirname, '../../../../..');
const N = 8; // escritores simultâneos com a MESMA combinação (email, tenant)
const OWNERS = ['u-cu-seq', 'u-cu-conc'];

class BarrierRepo extends DynamicTableRepository {
  private arrived = 0;
  private waiters: Array<() => void> = [];
  constructor(private readonly expected: number) {
    super();
  }
  async findAllDataByTableId(tableId: string): Promise<IDynamicTableData[]> {
    const result = await super.findAllDataByTableId(tableId);
    this.arrived += 1;
    if (this.arrived >= this.expected) {
      for (const release of this.waiters) release();
      this.waiters = [];
    } else {
      await new Promise<void>((release) => this.waiters.push(release));
    }
    return result;
  }
}

const SCHEMA = {
  fields: [
    { name: 'email', label: 'Email', type: 'string', required: true },
    { name: 'tenant', label: 'Tenant', type: 'string', required: true },
  ],
  compositeUnique: [{ fields: ['email', 'tenant'] }],
};

function ctxFor(userId: string): UserContext {
  return {
    id: userId, userId, name: 'u', username: userId, email: `${userId}@test.co`,
    userEmail: `${userId}@test.co`, role: Role.USER, userRole: Role.USER,
    createdAt: new Date(), updatedAt: new Date(),
  };
}

beforeAll(() => {
  const dbFile = path.join(SERVER_DIR, 'prisma', 'test-integration.db');
  for (const f of [dbFile, `${dbFile}-journal`]) if (fs.existsSync(f)) fs.rmSync(f);
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: SERVER_DIR,
    env: { ...process.env, DATABASE_URL: 'file:./test-integration.db' },
    stdio: 'inherit',
  });
}, 120000);

afterAll(async () => {
  await prisma.dynamicTableData.deleteMany({ where: { dynamicTable: { userId: { in: OWNERS } } } });
  await prisma.dynamicTable.deleteMany({ where: { userId: { in: OWNERS } } });
  await prisma.user.deleteMany({ where: { id: { in: OWNERS } } });
  await prisma.$disconnect();
});

describe('compositeUnique sob concorrência (TOCTOU)', () => {
  // CONTROLE do harness: o caminho SEQUENCIAL rejeita — prova que a regra está ligada e o schema é o
  // certo, inclusive ATRAVÉS do BarrierRepo (expected=1 → barreira transparente).
  it('CONTROLE sequencial: o segundo pedido com a mesma (email, tenant) é rejeitado', async () => {
    const service = new DynamicTableService(new BarrierRepo(1), new DynamicTablePolicy());
    await prisma.user.create({ data: { id: 'u-cu-seq', username: 'u-cu-seq', email: 'u-cu-seq@test.co', password: 'x', role: Role.USER } });
    const t = await service.createTableAsSystem('u-cu-seq', {
      name: 'Clientes', category: 'people', internalName: 'cu_seq_tbl', schema: SCHEMA,
    } as never);
    await service.createTableData(ctxFor('u-cu-seq'), t.id, { data: { email: 'a@x.co', tenant: 'T1' } } as never);
    await expect(
      service.createTableData(ctxFor('u-cu-seq'), t.id, { data: { email: 'a@x.co', tenant: 'T1' } } as never),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  // A LACUNA: com as N leituras entrelaçadas antes do primeiro commit, todas persistem.
  it(`${N} pedidos SIMULTÂNEOS com a mesma (email, tenant): exatamente um persiste`, async () => {
    const service = new DynamicTableService(new BarrierRepo(N), new DynamicTablePolicy());
    await prisma.user.create({ data: { id: 'u-cu-conc', username: 'u-cu-conc', email: 'u-cu-conc@test.co', password: 'x', role: Role.USER } });
    const t = await service.createTableAsSystem('u-cu-conc', {
      name: 'Clientes', category: 'people', internalName: 'cu_conc_tbl', schema: SCHEMA,
    } as never);

    const results = await Promise.allSettled(
      Array.from({ length: N }, () =>
        service.createTableData(ctxFor('u-cu-conc'), t.id, { data: { email: 'b@x.co', tenant: 'T1' } } as never),
      ),
    );

    // Perdedores legítimos só podem perder por ValidationError (a regra mordendo) — qualquer outra
    // rejeição é defeito do harness, não corrida.
    for (const r of results) {
      if (r.status === 'rejected') expect(r.reason).toBeInstanceOf(ValidationError);
    }

    const persisted = await prisma.dynamicTableData.count({ where: { dynamicTableId: t.id } });
    // O comportamento CORRETO: exatamente 1 sobrevive. Hoje: os N persistem (duplicata).
    expect(persisted).toBe(1);
  }, 30000);
});
