import { selectDfeEmissor } from '../selectDfeEmissor';
import { NullEmissor } from '../NullEmissor';
import { ManualEmissor } from '../ManualEmissor';
import { resolveEmissorFor } from '../resolveEmissor';
import { DfeDisabledEmissor } from '../DfeDisabledEmissor';

describe('selectDfeEmissor — BRIEF item 13 (3+ combinações de env)', () => {
  it('DFE_PARTNER ausente => desabilitada com motivo nomeado', () => {
    const s = selectDfeEmissor({});
    expect(s.enabled).toBe(false);
    expect(s.port).toBeInstanceOf(DfeDisabledEmissor);
    expect(s.reason).toMatch(/não configurado/);
  });

  it("DFE_PARTNER='null' + DFE_PARTNER_ENV válido => NullEmissor habilitado", () => {
    const s = selectDfeEmissor({ DFE_PARTNER: 'null', DFE_PARTNER_ENV: 'homologacao' });
    expect(s.enabled).toBe(true);
    expect(s.port).toBeInstanceOf(NullEmissor);
    expect(s.ambiente).toBe('homologacao');
  });

  it("DFE_PARTNER='manual' + DFE_PARTNER_ENV válido => ManualEmissor habilitado (F-MAN-3 a)", () => {
    const s = selectDfeEmissor({ DFE_PARTNER: 'manual', DFE_PARTNER_ENV: 'producao' });
    expect(s.enabled).toBe(true);
    expect(s.port).toBeInstanceOf(ManualEmissor);
    expect(s.ambiente).toBe('producao');
  });

  it('DFE_PARTNER_ENV ausente com parceiro conhecido => também desabilitada (obrigatório quando habilitado)', () => {
    const s = selectDfeEmissor({ DFE_PARTNER: 'null' });
    expect(s.enabled).toBe(false);
    expect(s.port).toBeInstanceOf(DfeDisabledEmissor);
    expect(s.reason).toMatch(/DFE_PARTNER_ENV/);
  });

  it("parceiro desconhecido => desabilitada nomeando o parceiro", () => {
    const s = selectDfeEmissor({ DFE_PARTNER: 'algum-parceiro-futuro', DFE_PARTNER_ENV: 'producao' });
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
    const r = await emissor.cancelar('ref-1', { cMotivo: 1, xMotivo: 'x' });
    expect(r.status).toBe('CANCELLED');
  });
});

describe('ManualEmissor — BE-INCR-DFE-MANUAL item 7', () => {
  it("'file' deixou de existir (F-MAN-3 a): vira parceiro sem adaptador => desabilitado", () => {
    const s = selectDfeEmissor({ DFE_PARTNER: 'file', DFE_PARTNER_ENV: 'producao' });
    expect(s.enabled).toBe(false);
  });

  it('capabilities: o portal numera (F-MAN-4 a) e não há consulta/cancelamento por máquina', () => {
    expect(new ManualEmissor().capabilities).toEqual({ numbersDps: true, consultar: false, cancelar: false, webhook: false });
  });

  it('emitir devolve PROCESSING com partnerRef = ref e NÃO toca o disco', async () => {
    const fs = jest.requireActual<typeof import('fs')>('fs');
    const spies = [jest.spyOn(fs, 'writeFileSync'), jest.spyOn(fs.promises, 'writeFile'), jest.spyOn(fs.promises, 'mkdir')];
    const r = await new ManualEmissor().emitir({ kind: 'NFSE', ref: 'doc-1:1', ambiente: 'producao', cnpjEmitente: '11222333000181', partnerAccountRef: null, payload: {} });
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
    const port = resolveEmissorFor('manual', { DFE_PARTNER: 'null', DFE_PARTNER_ENV: 'homologacao', NODE_ENV: 'test' });
    expect(port).toBeInstanceOf(ManualEmissor);
  });

  it('documento do mesmo parceiro do env: devolve a instância do env', () => {
    const port = resolveEmissorFor('manual', { DFE_PARTNER: 'manual', DFE_PARTNER_ENV: 'producao' });
    expect(port.name).toBe('manual');
  });

  it('parceiro sem adaptador (ex.: o antigo file) => dfe_adapter_unknown', () => {
    expect(() => resolveEmissorFor('file', {})).toThrow(/^dfe_adapter_unknown:/);
  });
});
