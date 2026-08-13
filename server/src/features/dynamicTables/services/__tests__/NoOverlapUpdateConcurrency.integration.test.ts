/**
 * TOCTOU do `noOverlap` no caminho de UPDATE (reagendamento concorrente) — SQLite real.
 *
 * Irmão de `NoOverlapConcurrency.integration.test.ts`, que cobre o CREATE. Existe porque o
 * gate autoritativo in-tx foi acrescentado nos DOIS caminhos (`writeCreate` e `writeUpdate`) e,
 * medido por mutação, só o do create tinha oráculo: apagar a re-checagem de `writeUpdate` deixava
 * as 39 suítes / 408 testes VERDES. Um gate que nenhum teste morde é um gate que a próxima
 * refatoração remove em silêncio.
 *
 * O caso de produto: N reagendamentos simultâneos arrastando compromissos distintos para o MESMO
 * horário da mesma sala. Na fase de validação (fora da tx) cada um conta 0 sobreposições — o slot
 * alvo ainda está vazio no instante da leitura —, e sem a re-checagem dentro da tx todos gravam.
 *
 * A `BarrierRepo` é a mesma técnica do arquivo irmão: segura cada `countOverlaps` até os N terem
 * lido, determinizando o entrelaçamento adversarial. Ela intercepta só o repositório INJETADO
 * (o preflight); o `TransactionalDynamicTableRepository` que o serviço constrói dentro da tx passa
 * ao largo dela, de propósito — é ele que rejeita os perdedores.
 */
import { execSync } from 'child_process';
import path from 'path';
import prisma from '@/lib/prisma';
import { DynamicTableRepository } from '@/features/dynamicTables/repositories/DynamicTableRepository';
import { DynamicTablePolicy } from '@/features/dynamicTables/policies/DynamicTablePolicy';
import { DynamicTableService } from '@/features/dynamicTables/services/DynamicTableService';
import { Role } from '@/features/users/models/User.model';
import { ValidationError } from '@/lib/errors';
import type { UserContext } from '@/lib/authUtils';

const SERVER_DIR = path.resolve(__dirname, '../../../../..');
const N = 5; // reagendamentos simultâneos disputando o MESMO horário da MESMA sala
const TARGET_START = '2026-03-01T10:00:00.000Z';
const TARGET_END = '2026-03-01T11:00:00.000Z';

/** Repositório real com UM ponto de sincronização: `countOverlaps` só devolve após os N lerem. */
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
  // `db push` idempotente e SEM apagar o arquivo: a suíte irmã recria o mesmo
  // test-integration.db no seu próprio beforeAll e as duas rodam em --runInBand.
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    cwd: SERVER_DIR,
    env: { ...process.env, DATABASE_URL: 'file:./test-integration.db' },
    stdio: 'inherit',
  });
}, 120000);

afterAll(async () => {
  await prisma.dynamicTableData.deleteMany();
  await prisma.dynamicTable.deleteMany();
  // Escopado ao 'u-upd' que ESTA suíte criou — nunca um deleteMany() global. Esta suíte
  // NÃO apaga o arquivo no beforeAll (de propósito, ver comentário acima), então corre em
  // QUALQUER ponto da fila --runInBand e herda o que outras suítes já tiverem escrito no
  // mesmo test-integration.db. Um deleteMany() sem where tenta apagar TODO usuário
  // existente; se alguma suíte de contabilidade (ex.: SubledgerFilters.integration.test.ts)
  // já tiver semeado Account+Receivable (revenueAccountId é FK obrigatória, Restrict por
  // padrão) e não limpou os próprios donos — o que é o padrão estabelecido no módulo de
  // contabilidade, ver EntryApprovalDimensionRoundTrip.integration.test.ts —, o cascade de
  // User apaga a Account antes da Receivable que ainda a referencia e a query inteira morre
  // em "Foreign key constraint violated" (reproduzido: rode esta suíte depois de
  // SubledgerFilters no mesmo processo). Apagar só o próprio dono nunca esbarra em FK que
  // não é seu.
  await prisma.user.deleteMany({ where: { id: 'u-upd' } });
  await prisma.$disconnect();
});

describe('noOverlap sob concorrência no UPDATE (TOCTOU de reagendamento)', () => {
  it(`${N} reagendamentos SIMULTÂNEOS para o mesmo slot: no máximo um chega lá`, async () => {
    // Semeadura com serviço SEM barreira: com a barreira (expected=N) o primeiro create
    // sequencial ficaria esperando N leituras que nunca chegam.
    const seeder = new DynamicTableService(new DynamicTableRepository(), new DynamicTablePolicy());
    await prisma.user.create({ data: { id: 'u-upd', username: 'u-upd', email: 'u-upd@test.co', password: 'x', role: Role.USER } });
    const t = await seeder.createTableAsSystem('u-upd', {
      name: 'Agenda', category: 'people', internalName: 'noov_upd_tbl', schema: SCHEMA,
    } as never);

    // N compromissos em slots DISJUNTOS (dias diferentes) — nenhum conflita ao nascer.
    const seeded = [];
    for (let day = 1; day <= N; day++) {
      const dd = String(day).padStart(2, '0');
      seeded.push(await seeder.createTableData(ctxFor('u-upd'), t.id, {
        data: { room: 'A', startAt: `2026-04-${dd}T10:00:00.000Z`, endAt: `2026-04-${dd}T11:00:00.000Z` },
      } as never));
    }

    // Todos arrastados para o MESMO slot ao mesmo tempo. Na leitura de validação o alvo está
    // vazio para os N (cada um se exclui via excludeId), então o preflight libera todos.
    const service = new DynamicTableService(new BarrierRepo(N), new DynamicTablePolicy());
    const results = await Promise.allSettled(
      seeded.map((row) =>
        service.updateTableData(ctxFor('u-upd'), row.id, {
          data: { room: 'A', startAt: TARGET_START, endAt: TARGET_END },
        } as never),
      ),
    );

    // Perdedor legítimo só perde por ValidationError (a regra mordendo); qualquer outra
    // rejeição é defeito do harness, não corrida.
    for (const r of results) {
      if (r.status === 'rejected') expect(r.reason).toBeInstanceOf(ValidationError);
    }

    const rows = await prisma.dynamicTableData.findMany({ where: { dynamicTableId: t.id } });
    const atTarget = rows.filter((r) => (r.data as Record<string, unknown>)?.startAt === TARGET_START);
    expect(atTarget).toHaveLength(1);
    // Os perdedores continuam nos seus slots originais — a rejeição não pode ter corrompido nada.
    expect(rows).toHaveLength(N);
  }, 30000);
});
