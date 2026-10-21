/**
 * IBS-CBS-2027 PR-1 (BRIEF `docs/accounting/BE-INCR-IBS-CBS-2027-brief.md` itens 1–2). Tabela `IBS_CBS` lida da semente
 * (o mesmo texto da migração) — LC 214/2025 arts. 343, 344, 346, 347, 349 I (Planalto compilado, dossiê
 * verif-2026-10-20-f1-retencoes-reinf-ibscbs [D08]).
 */
import fs from 'fs';
import path from 'path';
import { LEGAL_PARAMS_SEED_FILE_IBS_CBS, legalParamsSeedRows } from '@test/helpers/legalParams';
import { CBS_REFERENCIA_NAO_PUBLICADA, parametroIbsCbsVigente, tabelaIbsCbsDe } from '../ibsCbsParams';
import { LEGAL_PARAMETER_TABELAS, SemLinhaVigenteError } from '../../../legalParameters/models/legalParameter';

const linhas = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_IBS_CBS);
const tabela = tabelaIbsCbsDe(linhas);

describe('IBS_CBS — semente (item 1)', () => {
  it('a migração carrega o texto de prisma/data/legal_parameters_ibs_cbs_v1.sql e só insere', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const mig = norm(fs.readFileSync(path.resolve(__dirname, '../../../../../prisma/migrations/20261021120000_legal_parameters_ibs_cbs/migration.sql'), 'utf8'));
    expect(mig).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_IBS_CBS, 'utf8')).trimEnd());
    expect(mig.split('\n').filter((l) => l.trim() && !l.startsWith('--')).every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters" '))).toBe(true);
  });

  it('IBS_CBS está no catálogo; toda linha tem fonte não vazia e o sha da LC 214 lida', () => {
    expect(LEGAL_PARAMETER_TABELAS).toContain('IBS_CBS');
    expect(linhas).toHaveLength(5);
    expect(linhas.every((l) => l.tabela === 'IBS_CBS' && l.fonte.startsWith('LC 214/2025 art. 34') && l.fonteSha256 === 'e728c970927f55eabf0abc04c8cfbcf0f6485d2f77f6de46c8343fae6d6d86a6')).toBe(true);
  });

  it('a CBS de 2027–2028 nasce DRAFT e sem valor (art. 347 + resolução do Senado, art. 349 I)', () => {
    const cbs2027 = linhas.find((l) => l.id === 'ibscbs-cbs-2027');
    expect(cbs2027).toMatchObject({ status: 'DRAFT', valorInt: null, vigenteDesde: '2027-01-01', vigenteAte: '2028-12-31' });
    expect(tabela.some((p) => p.tributo === 'CBS' && p.vigenteDesde === '2027-01-01')).toBe(false);
  });
});

describe('parametroIbsCbsVigente (item 2)', () => {
  it.each([
    ['CBS', 'ALIQUOTA', '2026-06-30', 90], // art. 346
    ['IBS', 'ALIQUOTA_UF', '2026-12-31', 10], // art. 343
    ['IBS', 'ALIQUOTA_UF', '2027-01-01', 5], // art. 344
    ['IBS', 'ALIQUOTA_MUN', '2028-12-31', 5], // art. 344
  ] as const)('%s/%s em %s = %i bp', (tributo, chave, data, bp) => {
    expect(parametroIbsCbsVigente(tabela, tributo, chave, data).aliquotaBp).toBe(bp);
  });

  it('CBS em 2027 só com a linha DRAFT ⇒ SemLinhaVigenteError (400) com a mensagem nomeada', () => {
    let erro: unknown;
    try {
      parametroIbsCbsVigente(tabela, 'CBS', 'ALIQUOTA', '2027-01-15');
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(SemLinhaVigenteError);
    expect((erro as Error).message).toContain(CBS_REFERENCIA_NAO_PUBLICADA);
  });

  it('publicada a linha da CBS 2027, a data devolve o valor da linha', () => {
    const publicada = linhas.map((l) => (l.id === 'ibscbs-cbs-2027' ? { ...l, status: 'PUBLISHED', valorInt: 880 } : l));
    expect(parametroIbsCbsVigente(tabelaIbsCbsDe(publicada), 'CBS', 'ALIQUOTA', '2027-01-15').aliquotaBp).toBe(880);
  });

  it('IBS municipal em 2026 não existe (art. 343: só estadual) ⇒ SemLinhaVigenteError sem a mensagem da CBS', () => {
    expect(() => parametroIbsCbsVigente(tabela, 'IBS', 'ALIQUOTA_MUN', '2026-06-30')).toThrow(SemLinhaVigenteError);
    expect(() => parametroIbsCbsVigente(tabela, 'IBS', 'ALIQUOTA_MUN', '2026-06-30')).not.toThrow(CBS_REFERENCIA_NAO_PUBLICADA);
  });
});
