/**
 * Onda 3.2 fatia 4 (dono, 24/11/2026: tabela `MARCO_LEGAL`) — PARIDADE: o banco semeado pela migração (→ serviço →
 * fotografia) devolve a MESMA linha que `prisma/data/legal_parameters_marco_legal_v1.sql`, e o marco que o cálculo lê dele
 * é o que o literal `INICIO_LC214 = '2027-01'` valia (a prova de que o literal pôde sair). Sem consumidor lendo o literal
 * de novo: o cálculo recusa sem a linha (fail-closed).
 */
import { pushTestSchema, resetDb, disconnectDb } from '@test/helpers';
import { LEGAL_PARAMS_SEED_FILE_MARCO_LEGAL, LEGAL_PARAMS_SEED_FILE_MARCO_LEGAL_V2, legalParamsSeedRows } from '@test/helpers/legalParams';
import { getFactory } from '@/lib/factory';
import { erroDeFormato } from '../models/formatoLinha';
import { ParametroLegalAusenteError, type LinhaLegal } from '../models/legalParameter';
import { dataDoMarco, inicioLc214Competencia } from '@/features/accounting/models/marcoLegal';

/** O valor que o literal `INICIO_LC214` tinha em `simplesCalc.ts` antes desta fatia (origin/main d3f3a201c). */
const LITERAL_ANTIGO_INICIO_LC214 = '2027-01';

let fot: LinhaLegal[];

describe('Onda 3.2 fatia 4 — paridade MARCO_LEGAL: semente × banco migrado', () => {
  beforeAll(() => pushTestSchema());
  beforeAll(async () => {
    await resetDb();
    fot = await getFactory().getLegalParameterService().fotografia(['MARCO_LEGAL']);
  });
  afterAll(() => disconnectDb());

  it('o banco tem exatamente as linhas da semente (id, chave, valor, fonte, vigência, status)', () => {
    const semente = legalParamsSeedRows([LEGAL_PARAMS_SEED_FILE_MARCO_LEGAL, LEGAL_PARAMS_SEED_FILE_MARCO_LEGAL_V2]); // v1 (RBT12) + v2 (ressalva #1363: opção IBS/CBS no DAS, fim do caixa, IBS municipal)
    const pick = (l: LinhaLegal) => ({ id: l.id, tabela: l.tabela, chave: l.chave, discriminador: l.discriminador, valorTexto: l.valorTexto, fonte: l.fonte, vigenteDesde: l.vigenteDesde, vigenteAte: l.vigenteAte, status: l.status });
    expect(fot.map(pick).sort((a, b) => a.id.localeCompare(b.id))).toEqual(semente.map(pick).sort((a, b) => a.id.localeCompare(b.id)));
    expect(fot.length).toBe(4);
    expect(dataDoMarco(fot, 'INICIO_OPCAO_IBS_CBS_DAS', '2026-06-01')).toBe('2027-01-01');
    expect(dataDoMarco(fot, 'FIM_REGIME_CAIXA_SIMPLES', '2026-06-01')).toBe('2027-01-01');
    expect(dataDoMarco(fot, 'INICIO_IBS_MUNICIPAL', '2026-06-01')).toBe('2027-01-01');
  });

  it('o marco lido do banco é o do literal antigo (2027-01) e toda linha passa no formato e tem fonte', () => {
    expect(inicioLc214Competencia(fot, '2027-03-01')).toBe(LITERAL_ANTIGO_INICIO_LC214);
    expect(dataDoMarco(fot, 'INICIO_LC214_RBT12', '2026-06-01')).toBe('2027-01-01');
    for (const l of fot) {
      expect(l.fonte.trim()).not.toBe('');
      expect(erroDeFormato({ tabela: 'MARCO_LEGAL', chave: l.chave, discriminador: l.discriminador, valorTexto: l.valorTexto })).toBeNull();
    }
  });

  it('o lookup não depende da data do fato: um PA de 2025 e um de 2030 leem o mesmo marco', () => {
    expect(dataDoMarco(fot, 'INICIO_LC214_RBT12', '2025-01-01')).toBe(dataDoMarco(fot, 'INICIO_LC214_RBT12', '2030-12-01'));
  });

  it('sem linha em vigor o marco recusa (PARAMETRO_LEGAL_AUSENTE), não devolve o literal antigo', () => {
    expect(() => dataDoMarco([], 'INICIO_LC214_RBT12', '2027-03-01')).toThrow(ParametroLegalAusenteError);
  });
});
