import { selectDfeEmissor } from '../selectDfeEmissor';
import { NullEmissor } from '../NullEmissor';
import { ManualEmissor } from '../ManualEmissor';
import { resolveEmissorFor } from '../resolveEmissor';
import { DfeDisabledEmissor } from '../DfeDisabledEmissor';
import { ambienteFromTpAmb, tpAmbFor } from '../DfeEmissorPort';

describe('tpAmbFor / ambienteFromTpAmb — BE-INCR-DFE-TPAMB item 8 (Anexo I v1.01, LEIAUTE linha 103)', () => {
  it('producao → 1, homologacao → 2', () => {
    expect([tpAmbFor('producao'), tpAmbFor('homologacao')]).toEqual([1, 2]);
  });

  it('round-trip com a leitura da nota (guarda (v) do retorno manual, F-AMB-6 a): uma tabela só nas duas direções', () => {
    for (const ambiente of ['producao', 'homologacao'] as const) {
      expect(ambienteFromTpAmb(tpAmbFor(ambiente))).toBe(ambiente);
      expect(ambienteFromTpAmb(String(tpAmbFor(ambiente)) as '1' | '2')).toBe(ambiente);
    }
  });

  it('valor fora do domínio não cai em default silencioso', () => {
    expect(() => tpAmbFor('producao-restrita' as never)).toThrow(/dfe_ambiente_unknown/);
    expect(() => ambienteFromTpAmb('3' as never)).toThrow(/dfe_tpamb_unknown/);
  });
});

describe('selectDfeEmissor — BRIEF item 13 (3+ combinações de env)', () => {
  it('DFE_PARTNER ausente => desabilitada com motivo nomeado', () => {
    const s = selectDfeEmissor({}, 'NFSE');
    expect(s.enabled).toBe(false);
    expect(s.port).toBeInstanceOf(DfeDisabledEmissor);
    expect(s.reason).toMatch(/não configurado/);
  });

  it("DFE_PARTNER='null' + DFE_PARTNER_ENV válido => NullEmissor habilitado", () => {
    const s = selectDfeEmissor({ DFE_PARTNER: 'null', DFE_PARTNER_ENV: 'homologacao' }, 'NFSE');
    expect(s.enabled).toBe(true);
    expect(s.port).toBeInstanceOf(NullEmissor);
    expect(s.ambiente).toBe('homologacao');
  });

  it("DFE_PARTNER='manual' + DFE_PARTNER_ENV válido => ManualEmissor habilitado (F-MAN-3 a)", () => {
    const s = selectDfeEmissor({ DFE_PARTNER: 'manual', DFE_PARTNER_ENV: 'producao' }, 'NFSE');
    expect(s.enabled).toBe(true);
    expect(s.port).toBeInstanceOf(ManualEmissor);
    expect(s.ambiente).toBe('producao');
  });

  it('DFE_PARTNER_ENV ausente com parceiro conhecido => também desabilitada (obrigatório quando habilitado)', () => {
    const s = selectDfeEmissor({ DFE_PARTNER: 'null' }, 'NFSE');
    expect(s.enabled).toBe(false);
    expect(s.port).toBeInstanceOf(DfeDisabledEmissor);
    expect(s.reason).toMatch(/DFE_PARTNER_ENV/);
  });

  it("parceiro desconhecido => desabilitada nomeando o parceiro", () => {
    const s = selectDfeEmissor({ DFE_PARTNER: 'algum-parceiro-futuro', DFE_PARTNER_ENV: 'producao' }, 'NFSE');
    expect(s.enabled).toBe(false);
    expect(s.reason).toMatch(/algum-parceiro-futuro/);
  });
});

describe('NullEmissor — item 11', () => {
  const OLD_ENV = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = OLD_ENV;
  });

  it('recusa construir sob NODE_ENV=production', () => {
    process.env.NODE_ENV = 'production';
    expect(() => new NullEmissor()).toThrow(/production/);
  });

  it('emitir devolve AUTHORIZED sintético e determinístico', async () => {
    process.env.NODE_ENV = 'test';
    const emissor = new NullEmissor();
    const r1 = await emissor.emitir({ kind: 'NFSE', ref: 'doc1:1', ambiente: 'homologacao', cnpjEmitente: '11111111000191', partnerAccountRef: null, payload: { infDPS: { nDPS: 7 } } as never });
    const r2 = await emissor.emitir({ kind: 'NFSE', ref: 'doc1:1', ambiente: 'homologacao', cnpjEmitente: '11111111000191', partnerAccountRef: null, payload: { infDPS: { nDPS: 7 } } as never });
    expect(r1.status).toBe('AUTHORIZED');
    expect(r1.chaveOuCodigo).toBe(r2.chaveOuCodigo); // mesma ref -> mesma chave fake (determinístico)
  });

  it('cancelar devolve CANCELLED', async () => {
    const emissor = new NullEmissor();
    const r = await emissor.cancelar('ref-1', { kind: 'NFSE', cMotivo: 1, xMotivo: 'x' });
    expect(r.status).toBe('CANCELLED');
  });
});

describe('ManualEmissor — BE-INCR-DFE-MANUAL item 7', () => {
  it("'file' deixou de existir (F-MAN-3 a): vira parceiro sem adaptador => desabilitado", () => {
    const s = selectDfeEmissor({ DFE_PARTNER: 'file', DFE_PARTNER_ENV: 'producao' }, 'NFSE');
    expect(s.enabled).toBe(false);
  });

  it('capabilities: o portal numera (F-MAN-4 a) e não há consulta/cancelamento por máquina', () => {
    expect(new ManualEmissor().capabilities).toEqual({ kinds: ['NFSE'], numbersDps: true, consultar: false, cancelar: false, webhook: false, substituir: true, inutilizar: false, cce: false }); // + substituir (X11 item 16)
  });

  it('emitir devolve PROCESSING com partnerRef = ref e NÃO toca o disco', async () => {
    const fs = jest.requireActual<typeof import('fs')>('fs');
    const spies = [jest.spyOn(fs, 'writeFileSync'), jest.spyOn(fs.promises, 'writeFile'), jest.spyOn(fs.promises, 'mkdir')];
    const r = await new ManualEmissor().emitir({ kind: 'NFSE', ref: 'doc-1:1', ambiente: 'producao', cnpjEmitente: '11222333000181', partnerAccountRef: null, payload: {} as never });
    expect(r).toEqual({ status: 'PROCESSING', partnerRef: 'doc-1:1', errors: [] });
    for (const s of spies) expect(s).not.toHaveBeenCalled();
    spies.forEach((s) => s.mockRestore());
  });

  it('consultar/cancelar nunca inventam resultado: erro de código próprio dfe_manual', async () => {
    const m = new ManualEmissor();
    await expect(m.consultar('doc-1:1')).rejects.toThrow(/^dfe_manual:/);
    await expect(m.cancelar('doc-1:1')).rejects.toThrow(/^dfe_manual:/);
  });
});

describe('resolveEmissorFor — item 9 (adaptador do DOCUMENTO, não do env)', () => {
  it('documento manual com o env em null: resolve o ManualEmissor, nunca o NullEmissor do env', () => {
    const port = resolveEmissorFor('manual', 'NFSE', { DFE_PARTNER: 'null', DFE_PARTNER_ENV: 'homologacao', NODE_ENV: 'test' });
    expect(port).toBeInstanceOf(ManualEmissor);
  });

  it('documento do mesmo parceiro do env: devolve a instância do env', () => {
    const port = resolveEmissorFor('manual', 'NFSE', { DFE_PARTNER: 'manual', DFE_PARTNER_ENV: 'producao' });
    expect(port.name).toBe('manual');
  });

  it('parceiro sem adaptador (ex.: o antigo file) => dfe_adapter_unknown', () => {
    expect(() => resolveEmissorFor('file', 'NFSE', {})).toThrow(/^dfe_adapter_unknown:/);
  });
});

describe('capabilities.kinds — BE-INCR-NFCE item 4', () => {
  it('Manual só NFS-e; Null os três; desabilitado nenhum', () => {
    expect(new ManualEmissor().capabilities.kinds).toEqual(['NFSE']);
    expect(new NullEmissor().capabilities.kinds).toEqual(['NFSE', 'NFE', 'NFCE']);
    expect(new DfeDisabledEmissor('x').capabilities.kinds).toEqual([]);
  });
});

describe('selectDfeEmissor por tipo — BE-INCR-NFCE item 5 (F-NFCE-1 c)', () => {
  const ENV = { NODE_ENV: 'test', DFE_PARTNER: 'manual', DFE_PARTNER_ENV: 'producao', DFE_PARTNER_NFCE: 'null', DFE_PARTNER_ENV_NFCE: 'homologacao' };

  it('NFS-e pelo portal e NFC-e pelo Null habilitadas juntas, cada uma com o seu ambiente', () => {
    const nfse = selectDfeEmissor(ENV, 'NFSE');
    const nfce = selectDfeEmissor(ENV, 'NFCE');
    expect([nfse.enabled, nfse.port.name, nfse.ambiente]).toEqual([true, 'manual', 'producao']);
    expect([nfce.enabled, nfce.port.name, nfce.ambiente]).toEqual([true, 'null', 'homologacao']);
  });

  it('tipo sem variável própria cai no DFE_PARTNER — NF-e com DFE_PARTNER=manual fica desabilitada com o motivo', () => {
    const nfe = selectDfeEmissor(ENV, 'NFE');
    expect(nfe.enabled).toBe(false);
    expect(nfe.port).toBeInstanceOf(DfeDisabledEmissor);
    expect(nfe.reason).toBe("parceiro 'manual' não emite NFE");
  });

  it("NFC-e com DFE_PARTNER=manual (sem variável por tipo) => desabilitada: o portal não emite NFC-e", () => {
    const s = selectDfeEmissor({ DFE_PARTNER: 'manual', DFE_PARTNER_ENV: 'producao' }, 'NFCE');
    expect(s.enabled).toBe(false);
    expect(s.reason).toBe("parceiro 'manual' não emite NFCE");
  });

  it('ambiente por tipo cai no DFE_PARTNER_ENV quando ausente', () => {
    const s = selectDfeEmissor({ NODE_ENV: 'test', DFE_PARTNER_NFE: 'null', DFE_PARTNER_ENV: 'homologacao' }, 'NFE');
    expect([s.enabled, s.ambiente]).toEqual([true, 'homologacao']);
  });
});

describe('resolveEmissorFor por tipo — BE-INCR-NFCE item 6', () => {
  it('documento NFC-e de um adaptador que não declara o tipo => dfe_adapter_kind_unsupported (código próprio, skip no job)', () => {
    expect(() => resolveEmissorFor('manual', 'NFCE', { DFE_PARTNER: 'manual', DFE_PARTNER_ENV: 'producao' })).toThrow(
      /^dfe_adapter_kind_unsupported:/,
    );
  });

  it('documento NFC-e do Null resolve mesmo com o env em manual', () => {
    expect(resolveEmissorFor('null', 'NFCE', { NODE_ENV: 'test', DFE_PARTNER: 'manual', DFE_PARTNER_ENV: 'producao' })).toBeInstanceOf(NullEmissor);
  });
});
