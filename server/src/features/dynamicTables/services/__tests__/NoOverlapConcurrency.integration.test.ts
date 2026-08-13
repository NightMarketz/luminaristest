/**
 * TOCTOU do `noOverlap` sob escritores CONCORRENTES — SQLite real, sem mock de prisma.
 *
 * Fase 3 do GAP-MAP (nível 4 · corrida de concorrência). O que este arquivo expõe:
 * `enforceNoOverlap` decide por um SCAN read-then-write — `repo.countOverlaps` roda na
 * validação (DynamicTableService.ts:534), **fora** da transação do insert (:549). Não há
 * constraint de banco que expresse "intervalos não se sobrepõem" (exclusion-constraint não
 * existe no SQLite), então N pedidos cujas leituras aconteçam antes do primeiro commit leem
 * todos count=0 e TODOS persistem. O caso de produto é o double-booking de agendamento
 * (AppointmentsModule declara `noOverlap`).
 *
 * POR QUE HÁ UMA BARREIRA NO HARNESS, dito sem eufemismo: com `Promise.allSettled` puro o
 * entrelaçamento é sorteio — medimos AMBOS os desfechos em execuções consecutivas (5/5
 * persistidos numa, 1/5 na outra), e um `it.failing` que flake é CI vermelho aleatório. A
 * subclasse `BarrierRepo` segura cada `countOverlaps` até os N terem LIDO, e só então libera
 * os inserts. Ela NÃO cria a janela — a janela está em :534→:549; ela só remove o dado do
 * escalonador, fixando o entrelaçamento que duas requisições HTTP reais podem produzir a
 * qualquer momento. Todo o resto (serviço, validação, tx, SQLite) é o caminho real.
 *
 * CONSERTADO — o `it.failing` cumpriu o papel e virou `it`: o gate autoritativo do padrão da casa
 * (`authoritative-gate-inside-tx`) foi acrescentado em `writeCreate`/`writeUpdate`, re-contando com o
 * `TransactionalDynamicTableRepository` que o serviço constrói internamente — que este harness NÃO
 * intercepta, de propósito. A re-contagem in-tx roda sem barreira, rejeita os perdedores, o corpo do
 * teste passou a passar e o marcador REPROVOU ("passing test marked as failing"), obrigando a removê-lo.
 * Daqui em diante este caso é barreira de regressão permanente: se alguém devolver a decisão para a
 * fase de validação (fora da tx), ele volta a ficar vermelho.
 *
 * A suíte serial existente (`DynamicTableService.integration.test.ts §Governance: noOverlap`)
 * prova o caminho SEQUENCIAL; o CONTROLE abaixo o reprova aqui também, para que o desfecho do
 * caso concorrente não seja confundível com "regra nunca avaliada".
 */
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import prisma from '@/lib/prisma';
import { DynamicTableRepository } from '@/features/dynamicTables/repositories/DynamicTableRepository';
import { DynamicTablePolicy } from '@/features/dynamicTables/policies/DynamicTablePolicy';
import { DynamicTableService } from '@/features/dynamicTables/services/DynamicTableService';
import { Role } from '@/features/users/models/User.model';
import { ValidationError } from '@/lib/errors';
import type { UserContext } from '@/lib/authUtils';

const SERVER_DIR = path.resolve(__dirname, '../../../../..');
const N = 5; // escritores simultâneos disputando o MESMO horário da MESMA sala

/**
 * Repositório real com UM ponto de sincronização: `countOverlaps` devolve o resultado só
 * depois de todos os N terem lido. Determiniza o entrelaçamento adversarial (todas as
 * leituras antes de qualquer escrita) que o mundo real produz por azar de timing.
 */
class BarrierRepo extends DynamicTableRepository {
  private arrived = 0;
  private waiters: Array<() => void> = [];
  constructor(private readonly expected: number) {
    super();
  }
  async countOverlaps(
    tableId: string,
    startField: string,
    endField: string,
    startValue: string,
    endValue: string,
    scope: Array<{ field: string; value: string }>,
    excludeId?: string,
  ): Promise<number> {
    const result = await super.countOverlaps(tableId, startField, endField, startValue, endValue, scope, excludeId);
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
    { name: 'room', label: 'Room', type: 'string', required: true },
    { name: 'startAt', label: 'Start', type: 'datetime', required: true },
    { name: 'endAt', label: 'End', type: 'datetime', required: true },
  ],
  noOverlap: [{ startField: 'startAt', endField: 'endAt', scopeFields: ['room'] }],
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
  await prisma.dynamicTableData.deleteMany();
  await prisma.dynamicTable.deleteMany();
  // Escopado aos donos que ESTA suíte criou ('u-seq', 'u-conc') — nunca um deleteMany()
  // global. O beforeAll acima apaga o arquivo do banco antes de rodar, então hoje isto é
  // sempre seguro por construção; mesmo assim, um deleteMany() sem where é a MESMA classe de
  // bug fechada em NoOverlapUpdateConcurrency.integration.test.ts (FK Restrict de
  // Receivable.revenueAccountId → Account, sob deleteMany global de outra suíte) — escopar
  // aqui também é defesa em profundidade caso o wipe-no-beforeAll seja removido depois.
  await prisma.user.deleteMany({ where: { id: { in: ['u-seq', 'u-conc'] } } });
  await prisma.$disconnect();
});

describe('noOverlap sob concorrência (TOCTOU)', () => {
  // CONTROLE do harness: o caminho SEQUENCIAL rejeita — prova que a regra está ligada e o
  // schema é o certo, inclusive ATRAVÉS do BarrierRepo (expected=1 → barreira transparente).
  it('CONTROLE sequencial: o segundo pedido do mesmo slot é rejeitado', async () => {
    const service = new DynamicTableService(new BarrierRepo(1), new DynamicTablePolicy());
    await prisma.user.create({ data: { id: 'u-seq', username: 'u-seq', email: 'u-seq@test.co', password: 'x', role: Role.USER } });
    const t = await service.createTableAsSystem('u-seq', {
      name: 'Agenda', category: 'people', internalName: 'noov_seq_tbl', schema: SCHEMA,
    } as never);
    await service.createTableData(ctxFor('u-seq'), t.id, {
      data: { room: 'A', startAt: '2026-01-01T10:00:00Z', endAt: '2026-01-01T11:00:00Z' },
    } as never);
    await expect(
      service.createTableData(ctxFor('u-seq'), t.id, {
        data: { room: 'A', startAt: '2026-01-01T10:30:00Z', endAt: '2026-01-01T11:30:00Z' },
      } as never),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  // O BUG: com as N leituras entrelaçadas antes do primeiro commit, todos persistem.
  it(`${N} pedidos SIMULTÂNEOS do mesmo slot: no máximo um persiste`, async () => {
    const service = new DynamicTableService(new BarrierRepo(N), new DynamicTablePolicy());
    await prisma.user.create({ data: { id: 'u-conc', username: 'u-conc', email: 'u-conc@test.co', password: 'x', role: Role.USER } });
    const t = await service.createTableAsSystem('u-conc', {
      name: 'Agenda', category: 'people', internalName: 'noov_conc_tbl', schema: SCHEMA,
    } as never);

    const results = await Promise.allSettled(
      Array.from({ length: N }, () =>
        service.createTableData(ctxFor('u-conc'), t.id, {
          data: { room: 'A', startAt: '2026-02-01T10:00:00Z', endAt: '2026-02-01T11:00:00Z' },
        } as never),
      ),
    );

    // Perdedores legítimos só podem perder por ValidationError (a regra mordendo) — qualquer
    // outra rejeição é defeito do harness, não corrida.
    for (const r of results) {
      if (r.status === 'rejected') expect(r.reason).toBeInstanceOf(ValidationError);
    }

    const persisted = await prisma.dynamicTableData.count({ where: { dynamicTableId: t.id } });
    // O comportamento CORRETO: exatamente 1 sobrevive. Hoje: os N persistem (double-booking).
    expect(persisted).toBe(1);
  }, 30000);
});
