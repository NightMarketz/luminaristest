/**
 * TESTE-GUARDA — ITG 2000 (R1) itens 32 e 36: o histórico da retificação e o do lançamento extemporâneo.
 *
 * Origem: triagem do parecer colado sobre a consulta CRC-SP v2 (F-GOV-1),
 * `docs/accounting/TRIAGEM-PARECER-IA-F-GOV-1-2026-10-26.md` §3. Autorização: dono, chat, 2026-10-26 —
 * "Autorizo a sessão de instrumentação das lacunas ITG 2000 itens 32 e 36 (histórico do estorno e do
 * lançamento extemporâneo): só teste-guarda vermelho, sem correção."
 *
 * Texto conferido no SRE do CFC (`pesquisas-legais/triagem-parecer-ia-crc-sp`, [D01] sha `6b4355f83fb7`):
 *   - item 32: "o histórico do lançamento deve precisar o motivo da retificação, a data e a localização do
 *     lançamento de origem";
 *   - item 36: "Os lançamentos realizados fora da época devida devem consignar, nos seus históricos, as datas
 *     efetivas das ocorrências e a razão do registro extemporâneo."
 *
 * Integração (SQLite real, serviço do factory) e não unit: a guarda tem de valer para todo caminho que estorna ou
 * lança, e o unit de PostingService mocka os repositórios — um teste ali amarraria o conserto a um mock.
 *
 * Cada negativo tem o seu CONTROLE: um teste que espera erro passa por qualquer erro, inclusive harness quebrado.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { getFactory } from '@/lib/factory';
import { resolveAccountingScopeInternal } from '@/features/accounting/scope/resolveAccountingScopeInternal';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';
import { ValidationError } from '@/lib/errors';

const UNIT = 'unit-itg2000-historico';
const DONO = 'u-itg2000-historico';
const ORIGEM = '2026-06-15';

const scope = (): AccountingScope => resolveAccountingScopeInternal({ userId: DONO }, UNIT);
const posting = () => getFactory().getPostingService();
const periods = () => getFactory().getPeriodService();

const lancamento = (descricao: string, data: string, centavos: number) => ({
  unitId: UNIT,
  date: data,
  description: descricao,
  sourceType: 'manual',
  lines: [
    { accountCode: '4.1', debitCents: centavos, creditCents: 0 },
    { accountCode: '1.1.1.01', debitCents: 0, creditCents: centavos },
  ],
});

async function abrirPeriodo(month: number): Promise<string> {
  const p = await prisma.accountingPeriod.create({
    data: { userId: DONO, unitId: UNIT, year: 2026, month, status: 'OPEN', openedAt: new Date(), openedById: DONO },
  });
  return p.id;
}

describe('ITG 2000 (R1) — histórico da retificação (item 32) e do extemporâneo (item 36)', () => {
  let junho: string;

  beforeAll(async () => {
    pushTestSchema();
    await prisma.user.create({
      data: { id: DONO, name: DONO, username: DONO, email: `${DONO}@test.local`, password: 'x', role: 'USER' },
    });
    junho = await abrirPeriodo(6);
    await abrirPeriodo(7);
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ------------------------------------------------------------------ item 32 · estorno
  describe('item 32 — estorno', () => {
    it('CONTROLE: estorno com motivo grava o lançamento inverso e leva o motivo ao histórico', async () => {
      const original = await posting().postEntry(scope(), lancamento('compra de material', ORIGEM, 5000));
      const { reversal } = await posting().reverseEntry(scope(), {
        unitId: UNIT,
        lancamentoId: original.id,
        reversalPostingDate: '2026-07-10',
        reason: 'valor lançado em duplicidade',
      });

      expect(reversal.id).not.toBe(original.id);
      expect(reversal.description).toContain('valor lançado em duplicidade');
      expect(reversal.description).toContain(original.id);
    });

    it('estorno SEM motivo é recusado e o original segue Posted ("deve precisar o motivo da retificação")', async () => {
      const original = await posting().postEntry(scope(), lancamento('serviço de limpeza', ORIGEM, 7000));

      await expect(
        posting().reverseEntry(scope(), {
          unitId: UNIT,
          lancamentoId: original.id,
          reversalPostingDate: '2026-07-10',
        }),
      ).rejects.toBeInstanceOf(ValidationError);

      const naBase = await prisma.journalEntry.findUnique({ where: { id: original.id } });
      expect(naBase?.status).toBe('Posted');
    });

    it('o histórico do estorno precisa a DATA do lançamento de origem ("a data e a localização do lançamento de origem")', async () => {
      const original = await posting().postEntry(scope(), lancamento('aluguel', ORIGEM, 9000));
      const { reversal } = await posting().reverseEntry(scope(), {
        unitId: UNIT,
        lancamentoId: original.id,
        reversalPostingDate: '2026-07-10',
        reason: 'conta de despesa errada',
      });

      // A data escrita (2026-06-15), em ISO ou em dd/mm/aaaa — nunca o dia recuado pelo UTC.
      expect(reversal.description).toMatch(/2026-06-15|15\/06\/2026/);
    });
  });

  // ------------------------------------------------------------------ item 36 · extemporâneo
  describe('item 36 — lançamento em período fechado e reaberto', () => {
    it('CONTROLE: lançamento em período aberto que nunca foi fechado não exige razão de extemporâneo', async () => {
      const entry = await posting().postEntry(scope(), lancamento('venda à vista', '2026-07-05', 3000));
      expect(entry.postings).toHaveLength(2);
    });

    it('lançamento SEM razão do registro extemporâneo, num período que foi fechado e reaberto, é recusado', async () => {
      await periods().softClosePeriod(scope(), junho, 'fechamento de junho');
      const reaberto = await periods().reopenPeriod(scope(), junho, 'ajuste após o fechamento');
      expect(reaberto.status).toBe('OPEN');

      const antes = await prisma.journalEntry.count({ where: { userId: DONO, unitId: UNIT } });
      await expect(
        posting().postEntry(scope(), lancamento('despesa esquecida de junho', '2026-06-20', 4000)),
      ).rejects.toBeInstanceOf(ValidationError);
      expect(await prisma.journalEntry.count({ where: { userId: DONO, unitId: UNIT } })).toBe(antes);
    });
  });
});
