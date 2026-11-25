import { parseCnab } from '../../../../../lib/cnab';
import { AppError, ValidationError } from '../../../../../lib/errors';
import { ExerciseClosingService } from '../../../services/ExerciseClosingService';
import { ecdChartStructureRule } from '../EcdChartStructureRule';
import { LalurAccountDeletionGuard } from '../LalurAccountDeletionGuard';
import { statementParserBr } from '../StatementParserBr';
import { TaxProvisionClosingGuard } from '../TaxProvisionClosingGuard';
import type { AccountingScope } from '../../../scope/AccountingScope';

/**
 * Onda 1.2: os adaptadores BR das portas do núcleo do razão (`ports/LedgerPorts.ts`). As regras que antes viviam DENTRO de
 * `PostingService`/`ExerciseClosingService`/`ReconciliationService` agora moram aqui; este arquivo prova que o comportamento
 * é o mesmo e que o núcleo de fato consulta a porta (um guarda que recusa impede o lançamento do encerramento).
 */

const scope = { ownerUserId: 'u1', unitId: 'unit-1', actorUserId: 'u1' } as unknown as AccountingScope;
const sintetica = async () => ({ acceptsEntries: false });
const folha = async () => ({ acceptsEntries: true });
const semConta = async () => null;

describe('ecdChartStructureRule (Manual da ECD, REGRA_VALIDA_NIVEL_CONTAS + I050.COD_CTA_SUP)', () => {
  it('recusa analítica patrimonial com menos de 4 níveis', async () => {
    await expect(
      ecdChartStructureRule.assertNewAccount({ code: '1.1.01', nature: 'Asset', acceptsEntries: true }, sintetica),
    ).rejects.toThrow(/no mínimo 4 níveis/);
    await expect(
      ecdChartStructureRule.assertNewAccount({ code: '2.1.1', nature: 'Liability', acceptsEntries: true }, sintetica),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('aceita analítica patrimonial de 4 níveis com superior sintética; resultado (Revenue) não tem o piso de nível', async () => {
    await expect(
      ecdChartStructureRule.assertNewAccount({ code: '1.1.1.01', nature: 'Asset', acceptsEntries: true }, sintetica),
    ).resolves.toBeUndefined();
    await expect(
      ecdChartStructureRule.assertNewAccount({ code: '3.1.01', nature: 'Revenue', acceptsEntries: true }, sintetica),
    ).resolves.toBeUndefined();
  });

  it('sintética patrimonial curta passa (o piso é da analítica); raiz (1 segmento) não pede superior', async () => {
    await expect(
      ecdChartStructureRule.assertNewAccount({ code: '1.9', nature: 'Asset', acceptsEntries: false }, sintetica),
    ).resolves.toBeUndefined();
    await expect(
      ecdChartStructureRule.assertNewAccount({ code: '9', nature: 'Asset', acceptsEntries: false }, semConta),
    ).resolves.toBeUndefined();
  });

  it('recusa conta cuja superior não existe ou é analítica (I050.COD_CTA_SUP)', async () => {
    await expect(
      ecdChartStructureRule.assertNewAccount({ code: '1.1.1.01', nature: 'Asset', acceptsEntries: true }, semConta),
    ).rejects.toThrow(/conta superior '1\.1\.1'/);
    await expect(
      ecdChartStructureRule.assertNewAccount({ code: '1.1.1.01', nature: 'Asset', acceptsEntries: true }, folha),
    ).rejects.toThrow(/sintética/);
  });
});

describe('LalurAccountDeletionGuard (ECF 3C item 19)', () => {
  it('trava o soft-delete com ajuste vivo do e-Lalur (409) e libera sem ele; o count roda com a tx recebida', async () => {
    const tx = { marker: 'tx' } as never;
    const count = jest.fn(async () => 2);
    const guard = new LalurAccountDeletionGuard({ countLiveEntriesByAccount: count });
    await expect(guard.assertAccountDeletable(scope, 'acc-1', tx)).rejects.toMatchObject({ statusCode: 409 });
    await expect(guard.assertAccountDeletable(scope, 'acc-1', tx)).rejects.toBeInstanceOf(AppError);
    expect(count).toHaveBeenCalledWith(scope, 'acc-1', tx);
    count.mockResolvedValue(0);
    await expect(guard.assertAccountDeletable(scope, 'acc-1', tx)).resolves.toBeUndefined();
  });
});

describe('TaxProvisionClosingGuard (X7 item 18 / X8 item 19)', () => {
  const linha = (over: Record<string, unknown>) => ({
    id: 'ta-1',
    status: 'CONFIRMED',
    provisaoEntryId: null,
    modo: 'PRESUMIDO',
    periodo: 'T01',
    devidoCents: 1000n,
    diferencaPostergadaCents: 0n,
    memoria: [],
    ...over,
  });
  const guardCom = (rows: unknown[]) => new TaxProvisionClosingGuard({ findConfirmedByYear: jest.fn(async () => rows) } as never);

  it('bloqueia o encerramento com provisão pendente, listando os ids', async () => {
    const guard = guardCom([linha({ id: 'ta-1' }), linha({ id: 'ta-2', provisaoEntryId: 'je-9' }), linha({ id: 'ta-3' })]);
    await expect(guard.assertCanClose(scope, 2026)).rejects.toMatchObject({ message: expect.stringContaining('ta-1, ta-3') });
    await expect(guard.assertCanClose(scope, 2026)).rejects.toBeInstanceOf(ValidationError);
  });

  it('libera quando tudo está provisionado ou sem valor a provisionar', async () => {
    await expect(guardCom([]).assertCanClose(scope, 2026)).resolves.toBeUndefined();
    await expect(
      guardCom([linha({ provisaoEntryId: 'je-1' }), linha({ devidoCents: 0n })]).assertCanClose(scope, 2026),
    ).resolves.toBeUndefined();
  });
});

describe('ExerciseClosingService consulta a porta ClosingGuard (o núcleo não conhece o fiscal)', () => {
  it('guarda que recusa impede a leitura do resultado e o lançamento do encerramento', async () => {
    const groupByAccount = jest.fn();
    const postEntry = jest.fn();
    const closingGuard = {
      assertCanClose: jest.fn(async () => {
        throw new ValidationError('pendente');
      }),
    };
    const service = new ExerciseClosingService(
      { findManyByUnit: jest.fn() } as never,
      { groupByAccount } as never,
      { postEntry } as never,
      { canPost: () => true } as never,
      closingGuard,
    );
    await expect(service.closeExercise(scope, 2026)).rejects.toThrow('pendente');
    expect(closingGuard.assertCanClose).toHaveBeenCalledWith(scope, 2026);
    expect(groupByAccount).not.toHaveBeenCalled();
    expect(postEntry).not.toHaveBeenCalled();
  });
});

describe('statementParserBr (OFX/CNAB)', () => {
  it('despacha pelo formato: OFX vira tabela date/amountCents; CNAB vai ao parser CNAB', () => {
    const ofx = [
      'OFXHEADER:100',
      '<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>',
      '<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260105<TRNAMT>12.34<FITID>F1<NAME>Pix</STMTTRN>',
      '</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>',
    ].join('\n');
    const table = statementParserBr.parse('ofx', Buffer.from(ofx));
    expect(table.headers).toEqual(['date', 'amountCents', 'description', 'externalRef']);
    expect(table.rows).toEqual([['2026-01-05', '1234', 'Pix', 'F1']]);
    const cnab = Buffer.from('não é cnab');
    expect(statementParserBr.parse('cnab', cnab)).toEqual(parseCnab(cnab)); // o formato cnab vai ao parser do CNAB, não ao do OFX
  });
});
