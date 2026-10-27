import fs from 'fs';
import path from 'path';
import { LEGAIS_SEMENTE, LEGAL_PARAMS_SEED_FILE_ICMS_ST_NCM_UF, legalParamsSeedRows } from '@test/helpers/legalParams';
import { erroDeFormato } from '../../../legalParameters/models/formatoLinha';
import type { LegalParameterTabela, LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { FIM_MONOFASICO_PIS_COFINS, icmsStDaNcm, segregacaoPorNcm } from '../segregacaoNcm';

/**
 * BE-INCR-EFICIENCIA-FISCAL PR-2 (nó EFICIENCIA-FISCAL, BRIEF itens 11–12; ADR D7, I-9) e as decisões do dono de 27/10
 * (D-2026-10-27-EFICIENCIA-FISCAL-PR2-EXECUCAO): ST só SP DRAFT até 31/03/2026; sem linha PUBLISHED não exclui ICMS;
 * monofásico ≥ 2027 tratado na função.
 */
const seedSt = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_ICMS_ST_NCM_UF) as LinhaLegal[];
const SP = '35';
const MG = '31';
const SHAMPOO = '33051000'; // Conv. ICMS 142/2018 Anexo XIX item 17.0; Lei 10.147 art. 1º I "b" (33.05)
const CREME = '33049910'; // item 14.0 — o da RC SEFAZ-SP 33677/2026
const TESOURA = '82130000'; // fora das duas tabelas

/** A mesma linha SP do shampoo, publicada — o que o operador da plataforma faria depois de ler o Anexo XI paulista. */
const publicada = (l: LinhaLegal): LinhaLegal => ({ ...l, id: `${l.id}-pub`, status: 'PUBLISHED' });
const stShampoo = seedSt.find((l) => l.chave === SHAMPOO)!;

describe('item 11 — semente ICMS_ST_NCM_UF', () => {
  it('a migração carrega o texto de prisma/data/legal_parameters_icms_st_ncm_uf_v1.sql e só insere', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const mig = norm(fs.readFileSync(path.resolve(__dirname, '../../../../../prisma/migrations/20261027120000_legal_parameters_icms_st_ncm_uf/migration.sql'), 'utf8'));
    expect(mig).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_ICMS_ST_NCM_UF, 'utf8')).trimEnd());
    expect(mig.split('\n').filter((l) => l.trim() && !l.startsWith('--')).every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters" '))).toBe(true);
  });

  it('só SP (IBGE 35), só 3303/3304/3305, DRAFT, de 2026-01-01 a 2026-03-31, no formato da tabela e com a fonte do Anexo XIX', () => {
    expect(seedSt).toHaveLength(13);
    for (const l of seedSt) {
      expect(l).toMatchObject({ tabela: 'ICMS_ST_NCM_UF', discriminador: SP, status: 'DRAFT', vigenteDesde: '2026-01-01', vigenteAte: '2026-03-31' });
      expect(l.chave).toMatch(/^330[345]\d{4}$/);
      expect([l.id, erroDeFormato({ ...l, tabela: l.tabela as LegalParameterTabela, valorJson: JSON.parse(l.valorJson!) })]).toEqual([l.id, null]);
      expect(l.fonte).toContain('Conv. ICMS 142/2018 Anexo XIX');
      expect(l.fonte).toContain('Portaria SRE 94/2025');
      expect((l as { fonteSha256?: string | null }).fonteSha256).toMatch(/^[0-9a-f]{64}$/);
    }
    // 3305.90.00 cobre os itens 20.0, 21.0 e 22.0 do anexo numa linha só.
    expect(JSON.parse(seedSt.find((l) => l.chave === '33059000')!.valorJson!)).toEqual({ anexo: 'XIX', itens: ['20.0', '21.0', '22.0'], cest: ['20.020.00', '20.021.00', '20.022.00'] });
  });

  it('formato: discriminador sem UF ou chave curta ⇒ erro na proposta', () => {
    const base = { tabela: 'ICMS_ST_NCM_UF' as const, valorJson: { anexo: 'XIX', itens: ['7.0'], cest: ['20.007.00'] } };
    expect(erroDeFormato({ ...base, chave: '33030010', discriminador: 'SP' })).not.toBeNull();
    expect(erroDeFormato({ ...base, chave: '330', discriminador: SP })).not.toBeNull();
    expect(erroDeFormato({ ...base, chave: '33030010', discriminador: SP })).toBeNull();
  });
});

describe('item 12 — segregacaoPorNcm (pura)', () => {
  const legais = [...LEGAIS_SEMENTE];

  it('cosmético de revenda em 2026 ⇒ monofásico (PIS/COFINS); a ST semeada é DRAFT e não exclui ICMS (decisão 2)', () => {
    expect(segregacaoPorNcm(SHAMPOO, SP, '2026-02-10', legais)).toEqual(['PIS', 'COFINS']);
    expect(segregacaoPorNcm('3305.10.00', SP, '2026-02-10', legais)).toEqual(['PIS', 'COFINS']); // NCM com pontos
    expect(icmsStDaNcm(SHAMPOO, SP, '2026-02-10', legais)).toBeNull();
  });

  it('linha de ST PUBLISHED na UF e na data ⇒ ICMS também sai; fora da vigência ou em outra UF, não', () => {
    const comSt = [...legais, publicada(stShampoo)];
    expect(segregacaoPorNcm(SHAMPOO, SP, '2026-03-31', comSt)).toEqual(['PIS', 'COFINS', 'ICMS']);
    expect(segregacaoPorNcm(SHAMPOO, SP, '2026-04-01', comSt)).toEqual(['PIS', 'COFINS']); // Portaria SRE 94/2025
    expect(segregacaoPorNcm(SHAMPOO, MG, '2026-03-10', comSt)).toEqual(['PIS', 'COFINS']);
    expect(segregacaoPorNcm(SHAMPOO, null, '2026-03-10', comSt)).toEqual(['PIS', 'COFINS']);
  });

  it(`I-9: a partir de ${FIM_MONOFASICO_PIS_COFINS} não há PIS/COFINS a excluir (LC 214 art. 542 XI), sem mexer nas linhas da tabela`, () => {
    expect(segregacaoPorNcm(CREME, SP, '2026-12-31', legais)).toEqual(['PIS', 'COFINS']);
    expect(segregacaoPorNcm(CREME, SP, '2027-01-01', legais)).toEqual([]);
    expect(legais.filter((l) => l.tabela === 'PIS_COFINS_MONOFASICO_NCM' && l.vigenteAte !== null)).toEqual([]);
  });

  it('NCM fora das tabelas, ausente ou inválida ⇒ []', () => {
    expect(segregacaoPorNcm(TESOURA, SP, '2026-02-10', legais)).toEqual([]);
    expect(segregacaoPorNcm(null, SP, '2026-02-10', legais)).toEqual([]);
    expect(segregacaoPorNcm('3305', SP, '2026-02-10', legais)).toEqual([]);
  });

  it('33.06 (higiene bucal) não é monofásico pela Lei 10.147 — a tabela não tem a posição', () => {
    expect(segregacaoPorNcm('33061000', SP, '2026-02-10', legais)).toEqual([]);
  });
});
