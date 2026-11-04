/**
 * FE-INCR-ECF-Y600 PR-0 (BRIEF itens 1–2a; F-FE-Y600-1 → b) — a seleção das vigências do ano, extraída do `montarY600`
 * para um lugar só (`selecionarVigenciasDoAno`), e a leitura `SpedEcfGenerationService.y600Vigencias` que a tela usa.
 * A paridade rota × gerador sobre o repositório real fica em `y600Vigencias.integration.test.ts`.
 */
import type { Partner } from 'generated/prisma';
import { ForbiddenError } from '../../../../lib/errors';
import type { AccountingScope } from '../../scope/AccountingScope';
import { selecionarVigenciasDoAno } from '../y600FromPartners';
import { SpedEcfGenerationService } from '../SpedEcfGenerationService';

function makePartner(over: Partial<Partner> = {}): Partner {
  return {
    id: 'p-1', userId: 'owner-1', nome: 'SOCIA UNICA', taxId: '52998224725', tipoPessoa: 'PF', residenteBrasil: true,
    participacaoBp: 10000, entradaEm: '2020-01-01', saidaEm: null, createdById: 'owner-1',
    createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'), deletedAt: null, ...over,
  } as Partner;
}

const scope = { ownerUserId: 'owner-1', actorUserId: 'owner-1', unitId: 'unit-1' } as unknown as AccountingScope;

describe('selecionarVigenciasDoAno (item 2a)', () => {
  it('vigência que sai no meio do ano entra, com dtFimSoc = saída de fato e vigenteNoFim = false', () => {
    const r = selecionarVigenciasDoAno([makePartner({ saidaEm: '2025-06-30' })], 2025);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ dtFimSoc: '2025-06-30', vigenteNoFim: false });
  });

  it('mudança de participação (saída + sucessora no dia seguinte) entra como duas vigências, sem dtFimSoc na primeira', () => {
    const antes = makePartner({ id: 'a', participacaoBp: 6000, saidaEm: '2025-03-31' });
    const depois = makePartner({ id: 'b', participacaoBp: 4000, entradaEm: '2025-04-01' });
    const r = selecionarVigenciasDoAno([antes, depois], 2025);
    expect(r.map((v) => [v.partner.id, v.dtFimSoc, v.vigenteNoFim])).toEqual([
      ['a', null, false],
      ['b', null, true],
    ]);
  });

  it('a sucessora só desfaz a saída quando é do MESMO taxId e começa no dia seguinte', () => {
    const saiu = makePartner({ id: 'a', saidaEm: '2025-03-31' });
    const outroSocio = makePartner({ id: 'b', taxId: '39053344705', entradaEm: '2025-04-01' });
    const doisDiasDepois = makePartner({ id: 'c', entradaEm: '2025-04-02' });
    const r = selecionarVigenciasDoAno([saiu, outroSocio, doisDiasDepois], 2025);
    expect(r.find((v) => v.partner.id === 'a')?.dtFimSoc).toBe('2025-03-31');
  });

  it('vigência de outro ano fica fora (entra depois de 31/12 ou sai antes de 01/01); as pontas entram', () => {
    const r = selecionarVigenciasDoAno(
      [
        makePartner({ id: 'depois', entradaEm: '2026-01-01' }),
        makePartner({ id: 'antes', saidaEm: '2024-12-31' }),
        makePartner({ id: 'entra-31-12', entradaEm: '2025-12-31' }),
        makePartner({ id: 'sai-01-01', saidaEm: '2025-01-01' }),
      ],
      2025,
    );
    expect(r.map((v) => v.partner.id).sort()).toEqual(['entra-31-12', 'sai-01-01']);
  });

  it('saída em 31/12 conta como vigente no fim e emite dtFimSoc (saiu no ano, sem sucessora)', () => {
    const [v] = selecionarVigenciasDoAno([makePartner({ saidaEm: '2025-12-31' })], 2025);
    expect(v).toMatchObject({ vigenteNoFim: true, dtFimSoc: '2025-12-31' });
  });
});

describe('SpedEcfGenerationService.y600Vigencias (item 1)', () => {
  const build = (partners: Partner[], canReadFiscalProfile = true) => {
    const list = jest.fn(async () => partners);
    const policy = { canRead: jest.fn(() => true), canReadFiscalProfile: jest.fn(() => canReadFiscalProfile) };
    const service = new SpedEcfGenerationService(
      {} as never, {} as never, policy as never, {} as never, {} as never, {} as never, {} as never, { list }, {} as never, {} as never, {} as never,
    );
    return { service, list, policy };
  };

  it('devolve as vigências do ano com o CPF/CNPJ só nos 4 últimos dígitos e a soma vigente em 31/12', async () => {
    const { service } = build([
      makePartner({ id: 'fica', participacaoBp: 6000 }),
      makePartner({ id: 'pj', nome: 'HOLDING', taxId: '11222333000181', tipoPessoa: 'PJ', participacaoBp: 4000 }),
      makePartner({ id: 'saiu', taxId: '39053344705', participacaoBp: 2000, saidaEm: '2025-05-10' }),
      makePartner({ id: 'futuro', taxId: '86288366757', entradaEm: '2026-02-01' }),
    ]);
    const view = await service.y600Vigencias(scope, 2025);
    expect(view.year).toBe(2025);
    expect(view.vigencias.map((v) => v.partnerId)).toEqual(['fica', 'pj', 'saiu']);
    expect(view.vigencias.find((v) => v.partnerId === 'pj')).toEqual({
      partnerId: 'pj', nome: 'HOLDING', taxIdFinal: '0181', tipoPessoa: 'PJ', residenteBrasil: true, participacaoBp: 4000,
      entradaEm: '2020-01-01', saidaEm: null, dtFimSoc: null, vigenteNoFim: true,
    });
    expect(view.vigencias.find((v) => v.partnerId === 'saiu')).toMatchObject({ dtFimSoc: '2025-05-10', vigenteNoFim: false });
    expect(view.somaParticipacaoFimBp).toBe(10000);
    expect(JSON.stringify(view)).not.toContain('52998224725');
    expect(JSON.stringify(view)).not.toContain('11222333000181');
  });

  it('policy de leitura do cadastro de sócios nega ⇒ ForbiddenError, sem ler o repositório', async () => {
    const { service, list } = build([makePartner()], false);
    await expect(service.y600Vigencias(scope, 2025)).rejects.toBeInstanceOf(ForbiddenError);
    expect(list).not.toHaveBeenCalled();
  });
});
