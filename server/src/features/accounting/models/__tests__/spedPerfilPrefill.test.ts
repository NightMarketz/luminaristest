/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, PR-2, BRIEF itens 12–13, 18). Três casos pedidos no item 18 — corpo vazio,
 * corpo completo (nada sobrescrito além do que veio) e sobrescrita parcial — mais o gate de regime por rota.
 */
import { aplicarPerfilNoCorpo, recusaDeRegime } from '../spedPerfilPrefill';
import type { PerfilParaPrefill } from '../spedPerfilPrefill';

const PERFIL: PerfilParaPrefill = {
  regime: 'PRESUMIDO',
  grandePorte: false,
  declarante: { nome: 'Salao Bela LTDA', cnpj: '12345678000195', uf: 'SP', codMun: '3550308', codNat: '2062', cnaeFiscal: '9602501', endereco: 'Rua A', bairro: 'Centro', cep: '01001000', email: 'c@b.com' },
  ecdIndNire: '1',
  ecdNire: '35200000000',
  ecdNumOrd: '7',
  ecdNatLivr: 'DIARIO GERAL',
  ecfIndAliqCsll: '4',
  ecfIndRecReceita: '1',
  contadorContactId: 'contato-1',
  representante: { nome: 'Maria', cpf: '52998224725', qualifEcd: '205', qualifEcf: '203', email: 'm@x.com', fone: '11987654321' },
};

describe('aplicarPerfilNoCorpo (item 12)', () => {
  it('ECD, corpo só com unitId/year: preenche 0000 (+IND_NIRE, IND_GRANDE_PORTE), livro, responsável legal e contador', () => {
    const { body, sobrescritos } = aplicarPerfilNoCorpo({ unitId: 'u', year: 2026 }, PERFIL, 'ecd');
    expect(body.declarant).toEqual({ nome: 'Salao Bela LTDA', cnpj: '12345678000195', uf: 'SP', codMun: '3550308', indNire: '1', indGrandePorte: '0' });
    expect(body.book).toEqual({ numOrd: '7', natLivr: 'DIARIO GERAL', nire: '35200000000' });
    expect(body.signers).toEqual([{ identNom: 'Maria', identCpfCnpj: '52998224725', codAssin: '205', email: 'm@x.com', fone: '11987654321', indRespLegal: 'S' }]);
    expect(body.signerContactIds).toEqual(['contato-1']);
    expect(sobrescritos).toEqual([]);
  });

  it('ECF (Presumido e Real): 0000/0030 completos, CSLL/critério de receita, 0930 com a qualificação da ECF (≠ da ECD)', () => {
    for (const target of ['ecf', 'ecfReal'] as const) {
      const { body } = aplicarPerfilNoCorpo({ unitId: 'u', year: 2026, fiscal: { formaTrib: '1', formaTribPer: 'RRRR' } }, PERFIL, target);
      expect(body.declarant).toMatchObject({ codNat: '2062', cnaeFiscal: '9602501', endereco: 'Rua A', cep: '01001000', email: 'c@b.com' });
      expect(body.declarant).not.toHaveProperty('ie'); // chave do 0000 da ECD não vai para a ECF (o `.strict()` recusaria)
      expect(body.fiscal).toEqual({ formaTrib: '1', formaTribPer: 'RRRR', indAliqCsll: '4', indRecReceita: '1' });
      expect(body.signers).toEqual([{ identNom: 'Maria', identCpfCnpj: '52998224725', identQualif: '203', email: 'm@x.com', fone: '11987654321' }]);
    }
  });

  it('corpo completo: nada é trocado, e cada chave que o perfil tinha vai para sobrescritos', () => {
    const corpo = {
      unitId: 'u', year: 2026,
      declarant: { nome: 'Outro Nome', cnpj: '11222333000181', uf: 'RJ', codMun: '3304557', indNire: '0', indGrandePorte: '1' },
      book: { numOrd: '8', natLivr: 'X', nire: '1', dtExSocial: '2026-12-31' },
      signers: [{ identNom: 'Sócio', identCpfCnpj: '55566677720', codAssin: '309', indRespLegal: 'S' }],
    };
    const { body, sobrescritos } = aplicarPerfilNoCorpo(corpo, PERFIL, 'ecd');
    expect(body.declarant).toEqual(corpo.declarant);
    expect(body.book).toEqual(corpo.book);
    expect(body.signers).toEqual(corpo.signers);
    expect(body).not.toHaveProperty('signerContactIds'); // não injeta o contador ao lado de signers vindos do corpo
    expect(sobrescritos.sort()).toEqual(
      ['book.natLivr', 'book.nire', 'book.numOrd', 'declarant.cnpj', 'declarant.codMun', 'declarant.indGrandePorte', 'declarant.indNire', 'declarant.nome', 'declarant.uf', 'signers'].sort(),
    );
  });

  it('sobrescrita parcial: o corpo vence onde trouxe, o perfil completa o resto', () => {
    const { body, sobrescritos } = aplicarPerfilNoCorpo({ unitId: 'u', year: 2026, book: { numOrd: '9', dtExSocial: '2026-12-31' } }, PERFIL, 'ecd');
    expect(body.book).toEqual({ numOrd: '9', dtExSocial: '2026-12-31', natLivr: 'DIARIO GERAL', nire: '35200000000' });
    expect(sobrescritos).toEqual(['book.numOrd']);
  });

  it('perfil sem grande porte informado não inventa IND_GRANDE_PORTE; grupo com forma errada fica para o DTO recusar', () => {
    const { body } = aplicarPerfilNoCorpo({ unitId: 'u', year: 2026, book: 'x' }, { ...PERFIL, grandePorte: null }, 'ecd');
    expect(body.declarant).not.toHaveProperty('indGrandePorte');
    expect(body.book).toBe('x');
  });
});

describe('recusaDeRegime (item 13)', () => {
  it('ECD nunca é recusada por regime (IN 2.003 art. 3º §6º)', () => {
    for (const r of ['MEI', 'SIMPLES', 'PRESUMIDO', 'REAL'] as const) expect(recusaDeRegime('ecd', r, 2026)).toBeNull();
  });

  it('ECF de MEI/SIMPLES → OBRIGACAO_NAO_SE_APLICA citando IN 2.004 art. 1º §1º I, nas duas rotas', () => {
    for (const t of ['ecf', 'ecfReal'] as const) {
      for (const r of ['MEI', 'SIMPLES'] as const) {
        expect(recusaDeRegime(t, r, 2026)).toMatchObject({ code: 'OBRIGACAO_NAO_SE_APLICA', message: expect.stringMatching(/2\.004\/2021 art\. 1º §1º I/) });
      }
    }
  });

  it('rota do Presumido com empresa no Real (e vice-versa) → REGIME_DIVERGENTE; a rota certa passa', () => {
    expect(recusaDeRegime('ecf', 'REAL', 2026)?.code).toBe('REGIME_DIVERGENTE');
    expect(recusaDeRegime('ecfReal', 'PRESUMIDO', 2026)?.code).toBe('REGIME_DIVERGENTE');
    expect(recusaDeRegime('ecf', 'PRESUMIDO', 2026)).toBeNull();
    expect(recusaDeRegime('ecfReal', 'REAL', 2026)).toBeNull();
  });
});
