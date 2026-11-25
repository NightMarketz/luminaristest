import { LEGAL_PARAMS_SEED_FILE_IBS_CBS_TABELAS, legalParamsSeedRows } from '@test/helpers/legalParams';
import { ParametroLegalAusenteError, type LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { tabelasIbsCbsDe } from '../../models/ibsCbsTabelas';
import { nfceNumerada } from '../../models/__tests__/nfeMontagem.fixture';
import { issuesIbsCbs, type NfeIbsCbs, type NotaParaRegrasIbsCbs } from '../NfeIbsCbsDto';
import { NfePayloadSchema, type NfePayload } from '../NfePayloadDto';

/**
 * Onda 3.2 fatia 5 (dono, 24/11/2026) — VIRADA SÓ POR LINHAS nas regras do UB: o `regrasIbsCbs` é puro e recebe as tabelas do
 * IT 2025.002 lidas da fotografia de LegalParameter (o serviço as monta; refine de DTO não lê linha). A mesma nota muda de
 * resultado quando mudam as LINHAS, sem tocar código. A prova "vermelho antes" contra a const está no teste de serviço
 * (`FiscalDocumentEmissionService.nfce.test.ts`, casos "virada só por linhas"), que só usa API que já existia.
 */
const seed = (): LinhaLegal[] => legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_IBS_CBS_TABELAS) as LinhaLegal[];
const comLinha = (id: string, muda: (l: LinhaLegal) => LinhaLegal, extras: LinhaLegal[] = []): LinhaLegal[] => [...seed().map((l) => (l.id === id ? muda(l) : l)), ...extras];
const json = (l: LinhaLegal, patch: Record<string, unknown>): LinhaLegal => ({ ...l, valorJson: JSON.stringify({ ...JSON.parse(l.valorJson ?? '{}'), ...patch }) });

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
const rejeicoes = (linhas: LinhaLegal[], mod: 55 | 65, dhEmi: string): string => issuesIbsCbs(nota(mod, dhEmi), tabelasIbsCbsDe(linhas, dhEmi.slice(0, 10))).join(' | ');

describe('virada só por linhas — regrasIbsCbs / issuesIbsCbs', () => {
  it('linha do seed: 000001 vale na NFC-e (indNFCe = 1), então não há rej. 1025 nem 1023/1024', () => {
    const m = rejeicoes(seed(), 65, '2026-10-27T10:00:00-03:00');
    expect(m).not.toContain('rej. 1025');
    expect(m).not.toContain('rej. 1023');
    expect(m).not.toContain('rej. 1024');
  });

  it('só trocar indNFCe da linha do cClassTrib para 0 ⇒ rej. 1025 (não permitido no modelo 65), no formato `caminho: mensagem` do 400', () => {
    const m = rejeicoes(comLinha('ibscbs-cclass-000001', (l) => json(l, { indNFCe: 0 })), 65, '2026-10-27T10:00:00-03:00');
    expect(m).toContain('infNFe.det.0.imposto.IBSCBS.cClassTrib: rej. 1025: cClassTrib 000001 não permitido no modelo 65 [nItem: 1] — UB14-25');
  });

  it('só trocar o CST da linha do cClassTrib ⇒ rej. 1024 (incompatível com o CST informado)', () => {
    expect(rejeicoes(comLinha('ibscbs-cclass-000001', (l) => json(l, { cst: '010' })), 65, '2026-10-27T10:00:00-03:00')).toContain('rej. 1024');
  });

  it('VIRADA: uma 2ª versão do mesmo cClassTrib a partir de 2027 muda a regra na data, e a nota de 2026 segue valendo', () => {
    const antiga = seed().find((l) => l.id === 'ibscbs-cclass-000001')!;
    const nova: LinhaLegal = { ...json(antiga, { indNFe: 0 }), id: 'virada-000001-2027', vigenteDesde: '2027-01-01', vigenteAte: null };
    const linhas = comLinha('ibscbs-cclass-000001', (l) => ({ ...l, vigenteAte: '2026-12-31' }), [nova]);
    expect(rejeicoes(linhas, 55, '2026-10-27T10:00:00-03:00')).not.toContain('rej. 1025');
    expect(rejeicoes(linhas, 55, '2027-02-01T10:00:00-03:00')).toContain('rej. 1025');
  });

  it('sem NENHUMA linha de uma das tabelas ⇒ PARAMETRO_LEGAL_AUSENTE (fail-closed), não "tudo inexistente"', () => {
    expect(() => rejeicoes(seed().filter((l) => l.tabela !== 'CST_IBS_CBS'), 65, '2026-10-27T10:00:00-03:00')).toThrow(ParametroLegalAusenteError);
  });

  it('nota sem item com IBSCBS não precisa das tabelas (UB12-10 e W03 seguem sem elas)', () => {
    const semGrupo: NotaParaRegrasIbsCbs = { ...nota(65, '2026-10-27T10:00:00-03:00'), det: [{ prod: { NCM: '33051000', vProd: '100.00' }, imposto: {} }] };
    expect(issuesIbsCbs(semGrupo).join(' | ')).toContain('rej. 1115'); // exigido desde 03/08/2026 (CRT 3) e ausente
  });

  it('o NfePayloadSchema é ESTRUTURAL: não consulta tabela alguma (nota com IBSCBS e cClassTrib que a tabela rejeitaria ainda parseia)', () => {
    const p = JSON.parse(JSON.stringify(nfceNumerada())) as NfePayload;
    p.infNFe.emit.CRT = 3;
    p.infNFe.det[0].imposto.ICMS = { ICMS00: { orig: 0, CST: '00', modBC: 3, vBC: '59.99', pICMS: '18.00', vICMS: '10.80' } };
    p.infNFe.det[0].imposto.IBSCBS = { CST: '000', cClassTrib: '999999', gIBSCBS: { vBC: '59.99', gIBSUF: { pIBSUF: '0.1000', vIBSUF: '0.06' }, gIBSMun: { pIBSMun: '0.0000', vIBSMun: '0.00' }, vIBS: '0.06', gCBS: { pCBS: '0.9000', vCBS: '0.54' } } };
    expect(NfePayloadSchema.safeParse(p).success).toBe(true);
    // e quem monta a nota (o serviço) é que a recusa, com as tabelas
    expect(issuesIbsCbs(p.infNFe, tabelasIbsCbsDe(seed(), '2026-10-27')).join(' | ')).toContain('rej. 1023');
  });
});
