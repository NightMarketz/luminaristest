/**
 * BE-INCR-PLANO-4-NIVEIS refeito sobre o kit v5 (dono, 15/10): a versão vigente de cada kit, somada ao canônico, cumpre a
 * REGRA_VALIDA_NIVEL_CONTAS do Manual da ECD L9 p. 120 (analítica de ativo/passivo/PL no nível ≥ 4) e todo prefixo de
 * código existe como sintética (I050.COD_CTA_SUP; a natureza é por conta no I050, o PL fica sob o grupo `2`). Cobre as contas fiscais (F-L8-10 a) e as
 * sintéticas 3.6/4.5 (F-L8-11 a). Varre o plano; não é uma lista fixa.
 */
import { CANONICAL_ACCOUNTS } from '@/features/accounting/fixtures/ChartOfAccountsFixture';
import { KIT_REGISTRY, latestKit } from '@/features/sectorKits/registry';

// A fronteira do sectorKits só importa o plano canônico; a regra do Manual vai literal (COD_NAT 01/02/03, nível 4).
const PATRIMONIAL = ['Asset', 'Liability', 'Equity'];
const NIVEL_MINIMO = 4;

describe.each(Object.keys(KIT_REGISTRY))('kit vigente %s — plano de 4 níveis', (kitKey) => {
  const kit = latestKit(kitKey)!;
  const plano = [...CANONICAL_ACCOUNTS, ...kit.chartExtension];
  const porCodigo = new Map(plano.map((a) => [a.code, a]));

  it('é a v6', () => {
    expect(kit.kitVersion).toBe(6);
  });

  it('toda analítica patrimonial tem nível ≥ 4', () => {
    const rasas = plano
      .filter((a) => a.acceptsEntries && PATRIMONIAL.includes(a.nature) && a.code.split('.').length < NIVEL_MINIMO)
      .map((a) => a.code);
    expect(rasas).toEqual([]);
  });

  it('todo prefixo existe como sintética', () => {
    const faltas: string[] = [];
    for (const a of plano) {
      const segs = a.code.split('.');
      for (let i = 1; i < segs.length; i++) {
        const pai = porCodigo.get(segs.slice(0, i).join('.'));
        if (!pai || pai.acceptsEntries) faltas.push(`${a.code} → ${segs.slice(0, i).join('.')}`);
      }
    }
    expect(faltas).toEqual([]);
  });

  it('a extensão cria a sintética antes das filhas (a instalação segue a ordem do array)', () => {
    kit.chartExtension.forEach((a, i) => {
      const pai = a.code.split('.').slice(0, -1).join('.');
      const idxPai = kit.chartExtension.findIndex((p) => p.code === pai);
      if (idxPai !== -1) expect(idxPai).toBeLessThan(i);
    });
  });
});
