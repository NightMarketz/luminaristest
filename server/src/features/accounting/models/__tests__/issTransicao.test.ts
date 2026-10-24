/**
 * ISS-TRANSICAO-IBS PR-1 (BRIEF `docs/accounting/BE-INCR-ISS-TRANSICAO-IBS-brief.md` itens 1–6; invariantes §10.1, 10.2,
 * 10.4 e 10.7). Puro, sem banco: a semente é o mesmo texto da migração. Fontes (Planalto compilado em 24/10, dossiê
 * pesquisas-legais/iss-transicao-ibs-pr1 [D03]): LC 116 art. 8º-B I–IV (LC 214 art. 508), LC 214 arts. 361–364, 543 IV e
 * 544 V; LC 116 art. 8º II [D01].
 */
import fs from 'fs';
import path from 'path';
import { LEGAL_PARAMS_SEED_FILE_ISS_TRANSICAO, legalParamsSeedRows } from '@test/helpers/legalParams';
import { SemLinhaVigenteError, type LegalParameterTabela } from '../../../legalParameters/models/legalParameter';
import { erroDeFormato } from '../../../legalParameters/models/formatoLinha';
import { issAliquotaMaxBp } from '../issLimite';
import { fatorReducaoIssBp, IssExtintoError, issExtinto, ISS_EXTINTO_MENSAGEM } from '../issTransicao';
import { parametroIbsCbsVigente, tabelaIbsCbsDe } from '../ibsCbsParams';
import { apurarIbsCbsMes } from '../ibsCbsCompetencia';
import { agregarIssPorCompetencia, type IssDocInput } from '../issCompetencia';
import { UpsertFiscalProfileSchema } from '../../dtos/FiscalProfileDto';

const pr1 = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_ISS_TRANSICAO);
const todas = legalParamsSeedRows(); // todas as sementes: a lp2-iss-aliquota_max_bp original + a versão nova

describe('semente do PR-1', () => {
  it('a migração carrega o texto de prisma/data/legal_parameters_iss_transicao_v1.sql e só insere', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const mig = norm(fs.readFileSync(path.resolve(__dirname, '../../../../../prisma/migrations/20261024120000_legal_parameters_iss_transicao/migration.sql'), 'utf8'));
    expect(mig).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_ISS_TRANSICAO, 'utf8')).trimEnd());
    expect(mig.split('\n').filter((l) => l.trim() && !l.startsWith('--')).every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters" '))).toBe(true);
    expect(pr1).toHaveLength(13); // 1 ISS_LIMITE + 4 ISS_TRANSICAO + 8 IBS DRAFT
    expect(pr1.every((l) => l.fonte.trim().length > 0 && /^[0-9a-f]{64}$/.test(l.fonteSha256 ?? ''))).toBe(true);
  });

  it('as linhas PUBLISHED obedecem ao formato da tabela', () => {
    for (const l of pr1.filter((x) => x.status === 'PUBLISHED')) expect([l.id, erroDeFormato({ ...l, tabela: l.tabela as LegalParameterTabela })]).toEqual([l.id, null]);
  });
});

describe('item 1 — ISS_LIMITE/ALIQUOTA_MAX_BP termina em 2032-12-31 (LC 214 art. 543 IV)', () => {
  it('nova versão por supersessão, nunca UPDATE: mesmo valor 500 com fim', () => {
    const nova = pr1.find((l) => l.tabela === 'ISS_LIMITE');
    expect(nova).toMatchObject({ id: 'lp-iss-max-2025-2032', supersedesId: 'lp2-iss-aliquota_max_bp', valorInt: 500, vigenteDesde: '2025-01-01', vigenteAte: '2032-12-31', status: 'PUBLISHED' });
  });

  it('500 até 2032-12-31 (F-ISS-2 a); sem linha a partir de 2033-01-01', () => {
    expect(issAliquotaMaxBp(todas, '2026-10-24')).toBe(500);
    expect(issAliquotaMaxBp(todas, '2029-06-30')).toBe(500);
    expect(issAliquotaMaxBp(todas, '2032-12-31')).toBe(500);
    expect(() => issAliquotaMaxBp(todas, '2033-01-01')).toThrow(SemLinhaVigenteError);
  });
});

describe('item 2 — tabela ISS_TRANSICAO (LC 116 art. 8º-B I–IV)', () => {
  it('quatro linhas PUBLISHED, uma por ano, 1000/2000/3000/4000 bp', () => {
    const linhas = pr1.filter((l) => l.tabela === 'ISS_TRANSICAO').map((l) => [l.chave, l.vigenteDesde, l.vigenteAte, l.valorInt, l.status]);
    expect(linhas).toEqual([
      ['FATOR_REDUCAO_BP', '2029-01-01', '2029-12-31', 1000, 'PUBLISHED'],
      ['FATOR_REDUCAO_BP', '2030-01-01', '2030-12-31', 2000, 'PUBLISHED'],
      ['FATOR_REDUCAO_BP', '2031-01-01', '2031-12-31', 3000, 'PUBLISHED'],
      ['FATOR_REDUCAO_BP', '2032-01-01', '2032-12-31', 4000, 'PUBLISHED'],
    ]);
  });

  it('formato: outra chave, discriminador ou bp fora de 0..10000 ⇒ erro', () => {
    const base = { tabela: 'ISS_TRANSICAO' as const, chave: 'FATOR_REDUCAO_BP', discriminador: null, valorInt: 1000 };
    expect(erroDeFormato(base)).toBeNull();
    expect(erroDeFormato({ ...base, chave: 'FATOR' })).not.toBeNull();
    expect(erroDeFormato({ ...base, discriminador: 'X' })).not.toBeNull();
    expect(erroDeFormato({ ...base, valorInt: 10001 })).not.toBeNull();
    expect(erroDeFormato({ ...base, valorInt: null })).not.toBeNull();
  });
});

describe('item 3 — fatorReducaoIssBp e issExtinto', () => {
  it('0 antes de 2029; a linha de 2029 a 2032; IssExtintoError de 2033 em diante (invariante 10.2)', () => {
    expect(fatorReducaoIssBp(todas, '2028-12-31')).toBe(0);
    expect(fatorReducaoIssBp(todas, '2029-01-01')).toBe(1000);
    expect(fatorReducaoIssBp(todas, '2030-07-15')).toBe(2000);
    expect(fatorReducaoIssBp(todas, '2031-12-31')).toBe(3000);
    expect(fatorReducaoIssBp(todas, '2032-12-31')).toBe(4000);
    expect(() => fatorReducaoIssBp(todas, '2033-01-01')).toThrow(IssExtintoError);
    expect(() => fatorReducaoIssBp(todas, '2033-01-01')).toThrow(ISS_EXTINTO_MENSAGEM);
  });

  it('2029 sem a linha publicada ⇒ SemLinhaVigenteError, nunca 0', () => {
    const sem2029 = todas.filter((l) => l.id !== 'lp-iss-transicao-2029');
    expect(() => fatorReducaoIssBp(sem2029, '2029-03-10')).toThrow(SemLinhaVigenteError);
    const rascunho = todas.map((l) => (l.id === 'lp-iss-transicao-2029' ? { ...l, status: 'DRAFT' } : l));
    expect(() => fatorReducaoIssBp(rascunho, '2029-03-10')).toThrow(SemLinhaVigenteError);
  });

  it('issExtinto: falso em 2032-12-31, verdadeiro em 2033-01-01', () => {
    expect(issExtinto('2032-12-31')).toBe(false);
    expect(issExtinto('2033-01-01')).toBe(true);
  });
});

describe('item 4 — perfil fiscal a partir de 2033 (F-ISS-5 a)', () => {
  const perfil = { unitId: 'u1', regimeTributario: 'PRESUMIDO' as const, icmsContribuinte: false, pisCofinsRegime: 'CUMULATIVO' as const };
  const em = (iso: string) => jest.useFakeTimers({ now: new Date(iso), doNotFake: ['nextTick', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'hrtime', 'performance'] });
  afterEach(() => jest.useRealTimers());

  it('2033-01-01 (São Paulo) com valor ⇒ 400 com a mensagem nomeada, não o "Sem linha vigente" genérico; null passa', () => {
    em('2033-01-01T12:00:00-03:00');
    const r = UpsertFiscalProfileSchema.safeParse({ ...perfil, issAliquotaBp: 300 });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => [i.path.join('.'), i.message])).toEqual([['issAliquotaBp', ISS_EXTINTO_MENSAGEM]]);
    expect(UpsertFiscalProfileSchema.safeParse({ ...perfil, issAliquotaBp: null }).success).toBe(true);
    expect(UpsertFiscalProfileSchema.safeParse(perfil).success).toBe(true);
  });

  it('2032-12-31: o máximo de 500 ainda vale', () => {
    em('2032-12-31T12:00:00-03:00');
    expect(UpsertFiscalProfileSchema.safeParse({ ...perfil, issAliquotaBp: 500 }).success).toBe(true);
    expect(UpsertFiscalProfileSchema.safeParse({ ...perfil, issAliquotaBp: 501 }).success).toBe(false);
  });
});

describe('item 5 — IBS 2029–2032 em DRAFT (F-ISS-6 a; LC 214 arts. 361–364)', () => {
  it('oito linhas DRAFT sem valor: IBS UF e MUN × 2029..2032', () => {
    const ibs = pr1.filter((l) => l.tabela === 'IBS_CBS').map((l) => [l.chave, l.discriminador, l.vigenteDesde, l.vigenteAte, l.valorInt, l.status, l.fonte.slice(0, 20)]);
    expect(ibs).toEqual(
      [2029, 2030, 2031, 2032].flatMap((ano, i) => [
        ['IBS', 'ALIQUOTA_UF', `${ano}-01-01`, `${ano}-12-31`, null, 'DRAFT', `LC 214/2025 art. ${361 + i}`],
        ['IBS', 'ALIQUOTA_MUN', `${ano}-01-01`, `${ano}-12-31`, null, 'DRAFT', `LC 214/2025 art. ${361 + i}`],
      ]),
    );
  });

  it('sem linha PUBLISHED ⇒ SemLinhaVigenteError; a conferência cai em CONFERENCIA_SEM_ALIQUOTA (invariante 10.7)', () => {
    const tabela = tabelaIbsCbsDe(todas);
    expect(() => parametroIbsCbsVigente(tabela, 'IBS', 'ALIQUOTA_MUN', '2029-03-10')).toThrow(SemLinhaVigenteError);
    expect(() => parametroIbsCbsVigente(tabela, 'IBS', 'ALIQUOTA_UF', '2032-12-31')).toThrow('Sem linha vigente de IBS_CBS/IBS/ALIQUOTA_UF em 2032-12-31');
    const r = apurarIbsCbsMes({
      ano: 2029, mes: 3, tributo: 'IBS', tabela, vendasSemDocumento: [],
      documentos: [{ fiscalDocumentId: 'fd1', dataEmissaoLocal: '2029-03-10', status: 'AUTHORIZED', ibsCents: 1234n, cbsCents: 900n, baseCents: 10000n, cClassTrib: null, natureza: 'SERVICO' }],
    });
    expect(r.debitosCents).toBe(1234n);
    expect(r.memoria.map((l) => l.codigo)).toContain('CONFERENCIA_SEM_ALIQUOTA');
  });
});

describe('item 6 — relatório do X7 soma o vIss do documento em qualquer ano (invariante 10.4)', () => {
  const doc = (over: Partial<IssDocInput>): IssDocInput => ({ dCompet: '2029-01-15', municipioIbge: '3550308', tpRetISSQN: 1, vServCents: 10000n, baseIssCents: 10000n, vIssCents: 450n, divergente: false, ...over });

  it('2029-01 e 2032-12: a soma é a do documento, sem fator', () => {
    const r = agregarIssPorCompetencia([
      doc({ vIssCents: 450n }),
      doc({ vIssCents: 500n }), // documento com valor fora da escala: o relatório não corrige
      doc({ dCompet: '2032-12-20', vIssCents: 300n }),
    ]);
    expect(r.map((l) => [l.competencia, l.vIssCents, l.baseIssCents])).toEqual([
      ['2029-01', '950', '20000'],
      ['2032-12', '300', '10000'],
    ]);
  });
});
