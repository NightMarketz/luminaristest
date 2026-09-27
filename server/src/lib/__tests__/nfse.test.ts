/**
 * BE-INCR-DFE-MANUAL — PR-1: leitor da NFS-e autorizada (item 2), assinatura (item 4, F-MAN-1 a) e releitura (itens 3
 * e 5). Caminhos e regras: `docs/accounting/fontes-oficiais/TRANSCRICAO-NFSe-infNFSe-E0010-evento-v1.01-2026-09-27.md`.
 * A fixture é fictícia e assinada na hora com a chave de teste (F-SIG-4 b: nenhum bypass de verificação).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseNfseAutorizada } from '../nfse';
import { compareNfseWithDps, toReleituraJson, type DpsEnviada } from '../nfseReadback';
import { ValidationError } from '../errors';
import { signNfseForTest, NFSE_TEST_SIGNER_CNPJ } from '@test/helpers/nfeSignature';

const RAW = readFileSync(join(__dirname, 'fixtures', 'nfse', 'nfse-autorizada-web.SYNTHETIC.xml'), 'utf8');
const SIGNED = signNfseForTest(RAW);

/** A DPS que o Luminaris "enviou" (modo manual: sem id/serie/nDPS — F-MAN-4 a) e que a fixture autorizou igual. */
function enviada(): DpsEnviada {
  return {
    infDPS: {
      dCompet: '2026-09-15',
      prest: { CNPJ: '11222333000181' },
      toma: { CPF: '12345678909' },
      serv: { locPrest: { cLocPrestacao: '3550308' }, cServ: { cTribNac: '060101', cNBS: '126021000' } },
      valores: {
        vServPrest: { vServ: '150.00' },
        vDescCondIncond: { vDescIncond: '15.00' },
        trib: { tribMun: { tpRetISSQN: 1 } },
      },
    },
  };
}

describe('parseNfseAutorizada — item 2', () => {
  it('lê identidade, valores e a DPS embutida pelos caminhos da transcrição', () => {
    const n = parseNfseAutorizada(SIGNED);
    expect(n.chaveAcesso).toBe('35503082211222333000181000000000004226091234567890');
    expect(n.chaveAcesso).toHaveLength(50);
    expect(n).toMatchObject({ nNFSe: '42', ambGer: '2', procEmi: '2', cStat: '100', dhProc: '2026-09-15T14:32:10-03:00', emitDoc: '11222333000181' });
    expect(n.valores).toEqual({ baseIssCents: '13500', aliqIssBp: 500, vIssCents: '675', vLiqCents: '13500' });
    expect(n.dps).toEqual({
      serie: '70001',
      nDPS: '15',
      dCompet: '2026-09-15',
      prestCnpj: '11222333000181',
      toma: { tipo: 'CPF', valor: '12345678909' },
      cLocPrestacao: '3550308',
      cTribNac: '060101',
      cNBS: '126021000',
      vServCents: '15000',
      vDescIncondCents: '1500',
      vDescCondCents: undefined,
      tpRetISSQN: '1',
      pAliqBp: undefined,
    });
  });

  it('rejeita documento com DTD (XXE)', () => {
    expect(() => parseNfseAutorizada(`<!DOCTYPE x [<!ENTITY a "b">]>${SIGNED}`)).toThrow(/DTD/);
  });

  it('rejeita XML que não é NFS-e (sem <NFSe>)', () => {
    expect(() => parseNfseAutorizada('<?xml version="1.0"?><NFe/>')).toThrow(ValidationError);
  });
});

describe('verifyNfseSignature (via parseNfseAutorizada) — item 4, F-MAN-1 a', () => {
  it('nota sem assinatura é recusada (E1630)', () => {
    expect(() => parseNfseAutorizada(RAW)).toThrow(/nfse_assinatura_invalida: ausente/);
  });

  it('valor alterado DEPOIS de assinar é recusado (digest não confere)', () => {
    const adulterada = SIGNED.replace('<vServ>150.00</vServ>', '<vServ>1500.00</vServ>');
    expect(() => parseNfseAutorizada(adulterada)).toThrow(/não confere/);
  });

  it('o titular NÃO precisa ser o prestador — quem assina é o sistema gerador (transcrição §6)', () => {
    expect(NFSE_TEST_SIGNER_CNPJ).not.toBe('11222333000181');
    expect(() => parseNfseAutorizada(SIGNED)).not.toThrow();
  });

  it('certificado sem OtherName de CNPJ/CPF é recusado (E1634)', () => {
    const semTitular = signNfseForTest(RAW, { cnpj: undefined });
    expect(() => parseNfseAutorizada(semTitular)).toThrow(/E1634/);
  });

  it('certificado vencido no processamento é recusado (E1632, validade)', () => {
    const vencido = signNfseForTest(RAW, { notBefore: '2020-01-01', notAfter: '2025-12-31' });
    expect(() => parseNfseAutorizada(vencido)).toThrow(/E1632/);
  });
});

describe('compareNfseWithDps + toReleituraJson — itens 3 e 5', () => {
  const autorizada = parseNfseAutorizada(SIGNED);

  it('DPS igual à autorizada → nenhuma divergência, releitura IGUAL', () => {
    const d = compareNfseWithDps(enviada(), autorizada);
    expect(d).toEqual([]);
    expect(toReleituraJson(d).releitura.status).toBe('IGUAL');
  });

  const mutacoes: Array<[string, (e: ReturnType<typeof enviada>) => void, string]> = [
    ['prest.CNPJ', (e) => { e.infDPS.prest.CNPJ = '11444777000161'; }, 'identidade'],
    ['cTribNac', (e) => { e.infDPS.serv.cServ.cTribNac = '060201'; }, 'conteudo'],
    ['dCompet', (e) => { e.infDPS.dCompet = '2026-09-14'; }, 'conteudo'],
    ['vServ', (e) => { e.infDPS.valores.vServPrest.vServ = '150.01'; }, 'conteudo'],
    ['vDescIncond', (e) => { e.infDPS.valores.vDescCondIncond = { vDescIncond: '15.10' }; }, 'conteudo'],
    ['tpRetISSQN', (e) => { e.infDPS.valores.trib.tribMun.tpRetISSQN = 2; }, 'conteudo'],
    ['cLocPrestacao', (e) => { e.infDPS.serv.locPrest.cLocPrestacao = '3304557'; }, 'conteudo'],
    ['toma.doc', (e) => { e.infDPS.toma = { CPF: '98765432100' }; }, 'conteudo'],
  ];
  it.each(mutacoes)('um campo mutado (%s) → exatamente 1 divergência, do grupo certo', (campo, mutar, grupo) => {
    const e = enviada();
    mutar(e);
    const d = compareNfseWithDps(e, autorizada);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ campo, grupo, tipo: 'diferente' });
  });

  it('campo presente só de um lado (cNBS) → divergência "ausente", nunca silêncio', () => {
    const e = enviada();
    delete e.infDPS.serv.cServ.cNBS;
    expect(compareNfseWithDps(e, autorizada)).toEqual([
      { campo: 'cNBS', grupo: 'conteudo', tipo: 'ausente', enviado: null, autorizado: '126021000' },
    ]);
  });

  it('pAliq só é comparada quando o Luminaris a enviou', () => {
    const e = enviada();
    e.infDPS.valores.trib.tribMun.pAliq = '5.00'; // a DPS autorizada da fixture não tem pAliq (município conveniado)
    expect(compareNfseWithDps(e, autorizada)).toEqual([
      { campo: 'pAliq', grupo: 'conteudo', tipo: 'ausente', enviado: '500', autorizado: null },
    ]);
  });

  it('item 5 — divergência de CPF grava só o nome do campo: o CPF não aparece no resultJson', () => {
    const e = enviada();
    e.infDPS.toma = { CPF: '98765432100' };
    const json = JSON.stringify(toReleituraJson(compareNfseWithDps(e, autorizada)));
    expect(json).toContain('"toma.doc"');
    expect(json).toContain('DIVERGENTE');
    expect(json).not.toContain('98765432100');
    expect(json).not.toContain('12345678909');
  });
});
