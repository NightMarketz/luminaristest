/**
 * X10a EMENDA-4 AL-PR-4 (AL-15) — os três alertas do assinador local contra SQLite REAL (dispositivos, vínculos e
 * `fiscal_documents` de verdade), com o relógio injetado: sem poll com nota pendente há mais de 15 min, certificado
 * vencendo em 30 dias e NFC-e em contingência com o assinador fora. Sem `jest.fn` no caminho da consulta.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers';
import { DfeSignerHealthRepository } from '@/features/accounting/repositories/DfeSignerHealthRepository';
import { DfeSignerHealthService } from '@/features/accounting/services/DfeSignerHealthService';

const NOW = new Date('2026-11-24T12:00:00.000Z');
const minAtras = (m: number) => new Date(NOW.getTime() - m * 60_000);
const LONGE = '2030-01-01';

let userId: string;
let seq = 0;
const service = new DfeSignerHealthService(new DfeSignerHealthRepository());

async function dispositivo(opts: { lastSeenAt: Date | null; certNotAfter?: string; units: string[]; revogado?: boolean }): Promise<string> {
  seq += 1;
  const d = await prisma.dfeSignerDevice.create({
    data: {
      userId, nome: `Caixa ${seq}`, tokenHash: `hash-${seq}-${'0'.repeat(50)}`, certCnpj: '11222333000181', certCnpjRaiz: '11222333',
      certThumbprint: 't'.repeat(64), certNotAfter: opts.certNotAfter ?? LONGE, ambiente: 'homologacao', versaoAssinador: '1.0.0',
      tokenPresente: true, lastSeenAt: opts.lastSeenAt, deletedAt: opts.revogado ? NOW : null,
      units: { create: opts.units.map((unitId) => ({ userId, unitId })) },
    },
  });
  return d.id;
}
async function nota(unitId: string, status: 'PENDING_SIGNATURE' | 'CONTINGENCY', atualizadaHa: number, over: { deletedAt?: Date } = {}) {
  seq += 1;
  await prisma.fiscalDocument.create({
    data: {
      userId, unitId, kind: 'NFCE', status, saleId: `sale-${seq}`, saleKey: `sale-${seq}`, anchorEntryId: `je-${seq}`, ambiente: 'homologacao',
      partner: 'sefaz', serie: 3, numero: BigInt(seq), dCompet: '2026-11-24', vServCents: 100n, updatedAt: minAtras(atualizadaHa), ...over,
    },
  });
}
const alertasDe = async () => (await service.verificar(NOW)).alertas;

describe('X10a EMENDA-4 AL-PR-4 — saúde do assinador local (AL-15)', () => {
  beforeAll(async () => {
    pushTestSchema();
    userId = (await prisma.user.create({ data: { name: 'al4', username: 'al4-dono', email: 'al4@test.local', password: 'x', role: 'USER' } })).id;
  }, 120000);
  afterAll(async () => {
    await prisma.$disconnect();
  });
  afterEach(async () => {
    await prisma.fiscalDocument.deleteMany();
    await prisma.dfeSignerDeviceUnit.deleteMany();
    await prisma.dfeSignerDevice.deleteMany();
  });

  it('(a) sem poll há 20 min com 2 notas PENDING_SIGNATURE há 30 min ⇒ alerta com as contagens e só as unidades afetadas', async () => {
    const id = await dispositivo({ lastSeenAt: minAtras(20), units: ['u-a1', 'u-a2'] });
    await nota('u-a1', 'PENDING_SIGNATURE', 30);
    await nota('u-a1', 'PENDING_SIGNATURE', 29);
    expect(await alertasDe()).toEqual([
      { evento: 'ASSINADOR_SEM_POLL_COM_PENDENTE', dispositivoId: id, unitIds: ['u-a1'], detalhe: { notasEmEspera: 2, minutosSemPoll: 20 } },
    ]);
  });

  it('(a) não alerta: nota pendente há menos de 15 min, assinador online, ou sem nota esperando', async () => {
    await dispositivo({ lastSeenAt: minAtras(20), units: ['u-b1'] });
    await nota('u-b1', 'PENDING_SIGNATURE', 5); // pendente há 5 min: ainda dentro da tolerância
    await dispositivo({ lastSeenAt: minAtras(1), units: ['u-b2'] });
    await nota('u-b2', 'PENDING_SIGNATURE', 10); // assinador vivo, pendente há 10 min: a retomada (AL-14) ainda está agindo
    await dispositivo({ lastSeenAt: minAtras(120), units: ['u-b3'] }); // fora, mas nada esperando
    expect(await alertasDe()).toEqual([]);
  });

  it('(d) assinador ONLINE com nota PENDING_SIGNATURE há mais de 15 min ⇒ alerta: a retomada (AL-14) tem teto e a nota está presa (L-…9d92)', async () => {
    const id = await dispositivo({ lastSeenAt: minAtras(1), units: ['u-h1', 'u-h2'] });
    await nota('u-h1', 'PENDING_SIGNATURE', 60); // o teto de retomadas (3 em 10 min) já cortou: a nota só sai pelo reenviar
    await nota('u-h1', 'PENDING_SIGNATURE', 20);
    await nota('u-h2', 'PENDING_SIGNATURE', 5); // recente: não conta como presa
    expect(await alertasDe()).toEqual([
      { evento: 'ASSINADOR_ONLINE_COM_PENDENTE_PRESA', dispositivoId: id, unitIds: ['u-h1'], detalhe: { notasEmEspera: 2, minutosPresa: 60 } },
    ]);
    // o mesmo dispositivo sem poll cai no caso (a), nunca nos dois
    await prisma.dfeSignerDevice.update({ where: { id }, data: { lastSeenAt: minAtras(20) } });
    expect((await alertasDe()).map((a) => a.evento)).toEqual(['ASSINADOR_SEM_POLL_COM_PENDENTE']);
  });

  it('(a) dispositivo que nunca fez poll conta como sem poll (minutosSemPoll = -1)', async () => {
    const id = await dispositivo({ lastSeenAt: null, units: ['u-c1'] });
    await nota('u-c1', 'PENDING_SIGNATURE', 45);
    expect(await alertasDe()).toEqual([
      { evento: 'ASSINADOR_SEM_POLL_COM_PENDENTE', dispositivoId: id, unitIds: ['u-c1'], detalhe: { notasEmEspera: 1, minutosSemPoll: -1 } },
    ]);
  });

  it('(b) certificado: 30 dias exatos alerta; 31 não; vencido alerta com dias negativos', async () => {
    const em30 = await dispositivo({ lastSeenAt: minAtras(1), units: ['u-d1'], certNotAfter: '2026-12-24' });
    await dispositivo({ lastSeenAt: minAtras(1), units: ['u-d2'], certNotAfter: '2026-12-25' });
    const vencido = await dispositivo({ lastSeenAt: minAtras(1), units: ['u-d3'], certNotAfter: '2026-11-20' });
    const porId = Object.fromEntries((await alertasDe()).map((a) => [a.dispositivoId, a]));
    expect(Object.keys(porId).sort()).toEqual([em30, vencido].sort());
    expect(porId[em30]).toMatchObject({ evento: 'CERTIFICADO_VENCENDO', detalhe: { diasParaVencer: 30 } });
    expect(porId[vencido]).toMatchObject({ evento: 'CERTIFICADO_VENCENDO', detalhe: { diasParaVencer: -4 } });
  });

  it('(c) NFC-e em CONTINGENCY com o assinador sem poll ⇒ alerta do motivo; com o assinador online, não', async () => {
    const fora = await dispositivo({ lastSeenAt: minAtras(40), units: ['u-e1'] });
    await nota('u-e1', 'CONTINGENCY', 2); // a contingência é recente: o motivo conta mesmo assim (o prazo é do PR-9)
    await dispositivo({ lastSeenAt: minAtras(1), units: ['u-e2'] });
    await nota('u-e2', 'CONTINGENCY', 600);
    expect(await alertasDe()).toEqual([
      { evento: 'CONTINGENCIA_COM_ASSINADOR_FORA', dispositivoId: fora, unitIds: ['u-e1'], detalhe: { notasEmContingencia: 1, minutosSemPoll: 40 } },
    ]);
  });

  it('dispositivo revogado e nota apagada (soft-delete) não geram alerta', async () => {
    await dispositivo({ lastSeenAt: minAtras(300), units: ['u-f1'], certNotAfter: '2026-11-01', revogado: true });
    await nota('u-f1', 'PENDING_SIGNATURE', 300);
    await dispositivo({ lastSeenAt: minAtras(300), units: ['u-f2'] });
    await nota('u-f2', 'PENDING_SIGNATURE', 300, { deletedAt: NOW });
    expect(await alertasDe()).toEqual([]);
  });

  it('o log do alerta não carrega PII: só dispositivo, evento e números', async () => {
    const warn = jest.spyOn(require('@/lib/logger').logger, 'event').mockImplementation(() => undefined);
    await dispositivo({ lastSeenAt: minAtras(20), units: ['u-g1'] });
    await nota('u-g1', 'PENDING_SIGNATURE', 30);
    await alertasDe();
    const campos = warn.mock.calls.map((c) => Object.keys((c[3] ?? {}) as object)).flat();
    expect(new Set(campos)).toEqual(new Set(['dispositivoId', 'evento', 'notasEmEspera', 'minutosSemPoll']));
    warn.mockRestore();
  });
});
