/**
 * TESTE-GUARDA da lacuna L-20261126-205932-5235 (P0, defeito, fiscal G1) — sessao-instrumentacao, 26/11/2026.
 *
 * A lacuna: os consumidores da DRE não leem o `reportStatus`. Conta de resultado com saldo e SEM regra de mapeamento
 * (ex.: 3.7 Revenue "Outra Receita", fora dos prefixos 3.1–3.6) sai do `netResult` (`computeDreNet`,
 * `AccountingReportService.ts:295` 'if (!rule) continue'), a DRE vira `INVALID` (`buildDiagnostics` → `unmappedAccounts`),
 * e mesmo assim a geração da ECD (`SpedGenerationService.composeFile` → `buildJ150`) emite o arquivo com o J150
 * DRE_RESULTADO incompleto — divergente do I355, que fecha a conta pela natureza.
 *
 * Comportamento correto esperado (o que o guarda afirma): com a DRE do exercício `INVALID`, a geração da ECD é recusada
 * com erro de negócio (4xx, sem criar job/arquivo), em vez de emitir J150 com o resultado incompleto.
 *
 * Forma da recusa: síncrona no POST, como as recusas que `generateEcd` já faz antes de criar o job (ValidationError →
 * 400). O guarda pede só "4xx e nenhum job", sem fixar classe de erro nem texto — a escolha é da sessão de correção.
 *
 * O caso 2 é o vermelho; o caso 1 prova a pré-condição (a DRE é `INVALID` por causa da 3.7) e o caso 3 é o CONTROLE: o
 * mesmo exercício com a receita extra numa conta mapeada (3.1) gera a ECD (201) com J150 DRE_RESULTADO == Σ I355 — o
 * guarda não pode ficar verde recusando DRE válida, e o parser de J150/I355 fica validado no arquivo real.
 *
 * App Express REAL (supertest) + SQLite REAL; nada mockado no caminho razão → DRE → ECD.
 */
import request from 'supertest';
import prisma from '@/lib/prisma';
import { makeApp, pushTestSchema, authHeader, seedUnit } from '@test/helpers';
import { ApplicationFactory } from '@/lib/factory';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';

const app = makeApp();
const YEAR = 2025;
const VERSION = 'RFB-2025';
const BANCO = '1.1.1.01';
const RECEITA_SERVICOS = '3.1';
const DESPESA = '4.1';
/** Conta de receita do usuário FORA dos prefixos da DRE (3.1–3.6): sem regra, `findDreRule` devolve undefined. */
const OUTRA_RECEITA = '3.7';

const RECEITA_CENTS = 10_000_000; // R$ 100.000,00
const OUTRA_RECEITA_CENTS = 500_000; // R$ 5.000,00 — o que some do netResult
const DESPESA_CENTS = 3_000_000; // R$ 30.000,00

const UNIT_INVALID = 'unit-ecd-dre-invalid';
const UNIT_CONTROLE = 'unit-ecd-dre-controle';

const ecdBody = (unitId: string) => ({
  unitId,
  mappingVersion: VERSION,
  year: YEAR,
  declarant: {
    nome: 'EMPRESA DRE LTDA', cnpj: '11222333000181', uf: 'SP', codMun: '3550308',
    indSitIniPer: '0', indNire: '0', indFinEsc: '0', indGrandePorte: '0', tipEcd: '0',
    identMf: 'N', indEscCons: 'N', indCentralizada: '0', indMudancPc: '0', codPlanRef: '1',
  },
  book: { numOrd: '1', natLivr: 'DIARIO GERAL', dtExSocial: `${YEAR}-12-31` },
  signers: [
    { identNom: 'SOCIA', identCpfCnpj: '98765432100', codAssin: '205', indRespLegal: 'S' },
    { identNom: 'CONTADOR', identCpfCnpj: '11122233396', codAssin: '900', indCrc: 'SP-123456/O-1', ufCrc: 'SP', email: 'c@d.com', fone: '1133334444', indRespLegal: 'N' },
  ],
});

/** "78000000,00" → 7800000000 (centsToSpedDecimal: magnitude sem separador de milhar, vírgula decimal). */
const spedCents = (vl: string): number => parseInt(vl.replace(',', ''), 10);
/** Valor com sinal pelo indicador D/C (D = devedor ≥ 0, C = credor < 0 — `dcIndicator`). */
const signed = (vl: string, dc: string): number => (dc === 'C' ? -1 : 1) * spedCents(vl);

/**
 * Lê o arquivo por POSIÇÃO de campo (src/lib/sped.ts):
 *  J150: |J150|NU_ORDEM|COD_AGL|IND_COD_AGL|NIVEL_AGL|COD_AGL_SUP|DESCR|VL_INI|DC_INI|VL_FIN|DC_FIN|IND_GRP_DRE|NOTA|
 *  I355: |I355|COD_CTA|COD_CCUS|VL_CTA|IND_DC|
 * Devolve o J150 DRE_RESULTADO e a soma dos I355, ambos com sinal débito − crédito: são o mesmo número quando a DRE
 * cobre toda conta de resultado (o encerramento zera cada uma pela natureza).
 */
function resultadoJ150xI355(txt: string): { j150Resultado: number | null; i355Resultado: number; i355Contas: string[] } {
  const campos = txt.split(/\r?\n/).map((l) => l.split('|'));
  const j150 = campos.find((f) => f[1] === 'J150' && f[3] === 'DRE_RESULTADO');
  const i355 = campos.filter((f) => f[1] === 'I355');
  return {
    j150Resultado: j150 ? signed(j150[10], j150[11]) : null,
    i355Resultado: i355.reduce((s, f) => s + signed(f[4], f[5]), 0),
    i355Contas: i355.map((f) => f[2]),
  };
}

describe('L-20261126-205932-5235 — ECD não pode emitir J150 de DRE INVALID (conta de resultado sem regra)', () => {
  let dono: { id: string; username: string };
  const scopeOf = (unitId: string): AccountingScope => ({
    ownerUserId: dono.id, actorUserId: dono.id, unitId,
    ledgerCode: 'DEFAULT', baseCurrencyCode: 'BRL', timeZone: 'America/Sao_Paulo',
  });

  /** Plano padrão + (opcional) a 3.7 do usuário pela rota real + mapeamento referencial de TODA folha + períodos abertos. */
  async function prepararUnidade(unitId: string, comOutraReceita: boolean): Promise<void> {
    await seedUnit({ userId: dono.id, id: unitId });
    const scope = scopeOf(unitId);
    await ApplicationFactory.getInstance().getPostingService().ensureChartOfAccounts(scope);
    if (comOutraReceita) {
      const r = await request(app)
        .post('/api/accounting/accounts')
        .set(authHeader(dono))
        .send({ unitId, code: OUTRA_RECEITA, name: 'Outra Receita', nature: 'Revenue', acceptsEntries: true });
      expect({ status: r.status, body: r.status === 201 ? undefined : r.body }).toEqual({ status: 201, body: undefined });
    }
    // Mapeamento referencial de toda folha (inclusive a 3.7): a recusa esperada não pode vir de cobertura referencial.
    const folhas = await prisma.account.findMany({ where: { userId: dono.id, unitId, acceptsEntries: true } });
    for (const a of folhas) {
      await prisma.referentialMapping.create({
        data: { userId: dono.id, unitId, accountId: a.id, referentialCode: `1.01.${a.code}`, label: a.name, mappingVersion: VERSION },
      });
    }
    for (const month of [3, 12]) {
      await prisma.accountingPeriod.create({
        data: { userId: dono.id, unitId, year: YEAR, month, status: 'OPEN', openedAt: new Date() },
      });
    }

    // Lançamentos em MARÇO (o J150 lê a DRE em dtFin T00:00Z e o I355 até 31/12 23:59 — nada em 31/12 confunde a conta).
    const posting = ApplicationFactory.getInstance().getPostingService();
    const extra = comOutraReceita ? OUTRA_RECEITA : RECEITA_SERVICOS;
    await posting.postEntry(scope, {
      unitId, date: `${YEAR}-03-10`, sourceType: 'manual', description: 'Receita de serviços',
      lines: [
        { accountCode: BANCO, debitCents: RECEITA_CENTS, creditCents: 0 },
        { accountCode: RECEITA_SERVICOS, debitCents: 0, creditCents: RECEITA_CENTS },
      ],
    });
    await posting.postEntry(scope, {
      unitId, date: `${YEAR}-03-12`, sourceType: 'manual', description: 'Receita extra',
      lines: [
        { accountCode: BANCO, debitCents: OUTRA_RECEITA_CENTS, creditCents: 0 },
        { accountCode: extra, debitCents: 0, creditCents: OUTRA_RECEITA_CENTS },
      ],
    });
    await posting.postEntry(scope, {
      unitId, date: `${YEAR}-03-20`, sourceType: 'manual', description: 'Despesas operacionais',
      lines: [
        { accountCode: DESPESA, debitCents: DESPESA_CENTS, creditCents: 0 },
        { accountCode: BANCO, debitCents: 0, creditCents: DESPESA_CENTS },
      ],
    });
    // Exercício encerrado ⇒ a ECD traz I350/I355 (saldos de resultado antes do encerramento), o lado que fecha certo.
    await ApplicationFactory.getInstance().getExerciseClosingService().closeExercise(scope, YEAR);
  }

  const jobsEcd = (unitId: string) =>
    prisma.accountingDataExchangeJob.count({ where: { userId: dono.id, unitId, kind: 'EXPORT_SPED_ECD' } });

  async function baixar(unitId: string, jobId: string): Promise<string> {
    const r = await request(app).get(`/api/accounting/data-exchange/jobs/${jobId}/download`).query({ unitId }).set(authHeader(dono));
    return String(r.text);
  }

  beforeAll(async () => {
    pushTestSchema();
    dono = await prisma.user.create({
      data: { name: 'dre-invalid', username: 'ecd-dre-invalid', email: 'ecd-dre-invalid@test.local', password: 'x', role: 'USER' },
    });
    await prepararUnidade(UNIT_INVALID, true);
    await prepararUnidade(UNIT_CONTROLE, false);
  }, 180000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('PRÉ-CONDIÇÃO: a DRE do exercício (na data que a ECD lê) é INVALID e nomeia a 3.7 como conta sem regra', async () => {
    const dre = await ApplicationFactory.getInstance()
      .getAccountingReportService()
      .incomeStatement(scopeOf(UNIT_INVALID), new Date(`${YEAR}-12-31T00:00:00.000Z`));
    expect({
      reportStatus: dre.reportStatus,
      unmapped: dre.diagnostics.unmappedAccounts.map((u) => u.code),
      netResultCents: dre.netResult.amountCents,
    }).toEqual({
      reportStatus: 'INVALID',
      unmapped: [OUTRA_RECEITA],
      // A 3.7 ficou fora do líquido: 100.000 − 30.000, não 105.000 − 30.000.
      netResultCents: String(RECEITA_CENTS - DESPESA_CENTS),
    });
  });

  it('GUARDA: com a DRE INVALID, a geração da ECD é recusada (4xx, nenhum job) em vez de emitir J150 incompleto', async () => {
    const antes = await jobsEcd(UNIT_INVALID);
    const r = await request(app).post('/api/accounting/sped/ecd/generate').set(authHeader(dono)).send(ecdBody(UNIT_INVALID));
    const jobsCriados = (await jobsEcd(UNIT_INVALID)) - antes;

    // Evidência (fora do que precisa casar): quando a ECD sai, o J150 DRE_RESULTADO diverge do Σ I355.
    const evidencia = r.status === 201 ? resultadoJ150xI355(await baixar(UNIT_INVALID, r.body.data.id)) : undefined;

    // objectContaining (não toMatchObject): na falha o jest imprime o objeto recebido inteiro, com a evidência.
    expect({ status: r.status, recusou: r.status >= 400 && r.status < 500, jobsCriados, evidencia }).toEqual(
      expect.objectContaining({ recusou: true, jobsCriados: 0 }),
    );
  });

  it('CONTROLE: a mesma receita extra numa conta mapeada (3.1) — DRE OK, ECD 201 e J150 DRE_RESULTADO == Σ I355', async () => {
    const dre = await ApplicationFactory.getInstance()
      .getAccountingReportService()
      .incomeStatement(scopeOf(UNIT_CONTROLE), new Date(`${YEAR}-12-31T00:00:00.000Z`));
    expect(dre.reportStatus).not.toBe('INVALID');

    const r = await request(app).post('/api/accounting/sped/ecd/generate').set(authHeader(dono)).send(ecdBody(UNIT_CONTROLE));
    expect({ status: r.status, error: r.status === 201 ? undefined : r.body }).toEqual({ status: 201, error: undefined });

    const { j150Resultado, i355Resultado, i355Contas } = resultadoJ150xI355(await baixar(UNIT_CONTROLE, r.body.data.id));
    const lucro = RECEITA_CENTS + OUTRA_RECEITA_CENTS - DESPESA_CENTS;
    // Lucro ⇒ saldo credor: −7.500.000 nos dois lados.
    expect({ j150Resultado, i355Resultado, i355Contas }).toEqual({
      j150Resultado: -lucro,
      i355Resultado: -lucro,
      i355Contas: [RECEITA_SERVICOS, DESPESA],
    });
  });
});
