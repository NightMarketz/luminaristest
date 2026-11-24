import { LEGAL_PARAMS_SEED_FILE_IBS_CBS_TABELAS, legalParamsSeedRows } from '@test/helpers/legalParams';
import type { LegalParameter } from 'generated/prisma';
import { ParametroLegalAusenteError } from '../../../legalParameters/models/legalParameter';
import { storePublished } from '../../../legalParameters/services/legalParameterCache';
import { regrasIbsCbs, type NfeIbsCbs, type NotaParaRegrasIbsCbs } from '../NfeIbsCbsDto';

/**
 * Onda 3.2 fatia 5 (dono, 24/11/2026) — VIRADA SÓ POR LINHAS: as regras do grupo UB (CST/cClassTrib/cCredPres do IT 2025.002)
 * mudam de resultado quando mudam as LINHAS de LegalParameter, sem tocar código. O DTO Zod estático lê o cache síncrono (emenda
 * §9 L-8), então cada caso troca o cache e confere a rejeição que o `regrasIbsCbs` dá — a mesma nota, outra linha.
 * Este arquivo só usa API que já existia antes da fatia (`regrasIbsCbs`, o cache, o seed): é o teste que fica VERMELHO contra a
 * const e VERDE contra as linhas.
 */
const TABELAS = ['CST_IBS_CBS', 'CCLASSTRIB_IBS_CBS', 'CCREDPRES_IBS_CBS'] as const;
const seed = (): LegalParameter[] => legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_IBS_CBS_TABELAS) as unknown as LegalParameter[];
const publicar = (linhas: LegalParameter[]) => {
  for (const t of TABELAS) storePublished(t, linhas.filter((l) => l.tabela === t));
};
/** Troca o valorJson de uma linha do seed (só o que o caso muda) e republica as três tabelas no cache. */
const comLinha = (id: string, muda: (l: LegalParameter) => LegalParameter, extras: LegalParameter[] = []) =>
  publicar([...seed().map((l) => (l.id === id ? muda(l) : l)), ...extras]);
const json = (l: LegalParameter, patch: Record<string, unknown>): LegalParameter => ({ ...l, valorJson: JSON.stringify({ ...JSON.parse(l.valorJson ?? '{}'), ...patch }) });

const g: NfeIbsCbs = {
  CST: '000',
  cClassTrib: '000001',
  gIBSCBS: { vBC: '100.00', gIBSUF: { pIBSUF: '0.1000', vIBSUF: '0.10' }, gIBSMun: { pIBSMun: '0.0000', vIBSMun: '0.00' }, vIBS: '0.10', gCBS: { pCBS: '0.9000', vCBS: '0.90' } },
};
const nota = (mod: 55 | 65, dhEmi: string): NotaParaRegrasIbsCbs => ({
  ide: { mod, dhEmi, tpAmb: 1, finNFe: 1 },
  emit: { CRT: 3, enderEmit: { cMun: '3550308' } },
  det: [{ prod: { NCM: '33051000', vProd: '100.00' }, imposto: { IBSCBS: g } }],
  total: {},
});
const rejeicoes = (n: NotaParaRegrasIbsCbs): string => {
  const out: string[] = [];
  regrasIbsCbs(n, (m) => out.push(m));
  return out.join(' | ');
};

afterEach(() => publicar(seed())); // o setup do Jest aquece o cache com o seed; cada caso devolve o estado dele

describe('virada só por linhas — NfeIbsCbsDto.regrasIbsCbs', () => {
  it('linha do seed: 000001 vale na NFC-e (indNFCe = 1), então não há rej. 1025 nem 1023/1024', () => {
    publicar(seed());
    const m = rejeicoes(nota(65, '2026-10-27T10:00:00-03:00'));
    expect(m).not.toContain('rej. 1025');
    expect(m).not.toContain('rej. 1023');
    expect(m).not.toContain('rej. 1024');
  });

  it('só trocar indNFCe da linha do cClassTrib para 0 ⇒ rej. 1025 (não permitido no modelo 65), sem tocar código', () => {
    comLinha('ibscbs-cclass-000001', (l) => json(l, { indNFCe: 0 }));
    expect(rejeicoes(nota(65, '2026-10-27T10:00:00-03:00'))).toContain('rej. 1025');
  });

  it('só trocar o CST da linha do cClassTrib ⇒ rej. 1024 (incompatível com o CST informado)', () => {
    comLinha('ibscbs-cclass-000001', (l) => json(l, { cst: '010' }));
    expect(rejeicoes(nota(65, '2026-10-27T10:00:00-03:00'))).toContain('rej. 1024');
  });

  it('VIRADA: uma 2ª versão do mesmo cClassTrib a partir de 2027 muda a regra na data, e a nota de 2026 segue valendo', () => {
    const antiga = seed().find((l) => l.id === 'ibscbs-cclass-000001')!;
    const nova: LegalParameter = { ...json(antiga, { indNFe: 0 }), id: 'virada-000001-2027', vigenteDesde: '2027-01-01', vigenteAte: null };
    comLinha('ibscbs-cclass-000001', (l) => ({ ...l, vigenteAte: '2026-12-31' }), [nova]);
    expect(rejeicoes(nota(55, '2026-10-27T10:00:00-03:00'))).not.toContain('rej. 1025');
    expect(rejeicoes(nota(55, '2027-02-01T10:00:00-03:00'))).toContain('rej. 1025');
  });

  it('sem NENHUMA linha de uma das tabelas ⇒ PARAMETRO_LEGAL_AUSENTE (fail-closed), não "tudo inexistente"', () => {
    publicar(seed().filter((l) => l.tabela !== 'CST_IBS_CBS'));
    expect(() => rejeicoes(nota(65, '2026-10-27T10:00:00-03:00'))).toThrow(ParametroLegalAusenteError);
  });

  it('nota sem item com IBSCBS não lê as tabelas (UB12-10 e W03 seguem sem elas)', () => {
    publicar([]);
    const semGrupo: NotaParaRegrasIbsCbs = { ...nota(65, '2026-10-27T10:00:00-03:00'), det: [{ prod: { NCM: '33051000', vProd: '100.00' }, imposto: {} }] };
    expect(rejeicoes(semGrupo)).toContain('rej. 1115'); // exigido desde 03/08/2026 (CRT 3) e ausente
  });
});
