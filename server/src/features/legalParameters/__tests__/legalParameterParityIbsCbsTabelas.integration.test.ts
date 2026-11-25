/**
 * Onda 3.2 fatia 5 (dono, 24/11/2026: tabelas NT CST/cClassTrib/cCredPres viram LegalParameter) — PARIDADE: o banco semeado
 * pela migração (→ serviço → fotografia) devolve as MESMAS 204 linhas que `prisma/data/legal_parameters_ibs_cbs_tabelas_v1.sql`
 * e a leitura delas (`tabelasIbsCbsDe`) é a tabela que a const `ibsCbsTabelas.ts` carregava (a prova de que a const pôde sair).
 */
import { pushTestSchema, resetDb, disconnectDb } from '@test/helpers';
import { LEGAL_PARAMS_SEED_FILE_IBS_CBS_TABELAS, legalParamsSeedRows } from '@test/helpers/legalParams';
import { getFactory } from '@/lib/factory';
import { erroDeFormato } from '../models/formatoLinha';
import type { LegalParameterTabela, LinhaLegal } from '../models/legalParameter';
import { TABELAS_IBS_CBS, buscarCClassTrib, buscarCst, tabelasIbsCbsDe } from '@/features/accounting/models/ibsCbsTabelas';

let fot: LinhaLegal[];

describe('Onda 3.2 fatia 5 — paridade das tabelas do IBS/CBS: semente × banco migrado', () => {
  beforeAll(() => pushTestSchema());
  beforeAll(async () => {
    await resetDb();
    fot = await getFactory().getLegalParameterService().fotografia([...TABELAS_IBS_CBS]);
  });
  afterAll(() => disconnectDb());

  it('o banco tem exatamente as linhas da semente (id, chave, valor, fonte, vigência, status)', () => {
    const semente = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_IBS_CBS_TABELAS);
    const pick = (l: LinhaLegal) => ({ id: l.id, tabela: l.tabela, chave: l.chave, discriminador: l.discriminador, valorJson: l.valorJson, fonte: l.fonte, vigenteDesde: l.vigenteDesde, vigenteAte: l.vigenteAte, status: l.status });
    expect(fot.map(pick).sort((a, b) => a.id.localeCompare(b.id))).toEqual(semente.map(pick).sort((a, b) => a.id.localeCompare(b.id)));
    expect(fot).toHaveLength(204);
  });

  it('toda linha do banco passa no formato por tabela e tem fonte', () => {
    for (const l of fot) {
      expect(l.fonte.trim()).not.toBe('');
      expect(erroDeFormato({ tabela: l.tabela as LegalParameterTabela, chave: l.chave, discriminador: l.discriminador, valorJson: l.valorJson ? JSON.parse(l.valorJson) : undefined })).toBeNull();
    }
  });

  it('a leitura do banco dá as mesmas tabelas da leitura da semente, com os casos de referência da transcrição', () => {
    const doBanco = tabelasIbsCbsDe(fot, '2026-11-24');
    expect(doBanco).toEqual(tabelasIbsCbsDe(legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_IBS_CBS_TABELAS), '2026-11-24'));
    expect([doBanco.cst.length, doBanco.cClassTrib.length, doBanco.cCredPres.length]).toEqual([18, 173, 13]);
    expect(buscarCst(doBanco, '222')?.ind_RedutorBC).toBe(1);
    expect(buscarCClassTrib(doBanco, '000001')).toMatchObject({ cst: '000', dIniVig: '2026-01-01', dFimVig: null, indNFe: 1, indNFCe: 1 });
  });
});
