import { selectDfeEmissor } from '../selectDfeEmissor';
import { NullEmissor } from '../NullEmissor';
import { FileEmissor } from '../FileEmissor';
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

  it("DFE_PARTNER='file' + DFE_PARTNER_ENV válido => FileEmissor habilitado", () => {
    const s = selectDfeEmissor({ DFE_PARTNER: 'file', DFE_PARTNER_ENV: 'producao', DFE_FILE_DIR: './tmp-dfe' });
    expect(s.enabled).toBe(true);
    expect(s.port).toBeInstanceOf(FileEmissor);
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

describe('FileEmissor — item 12', () => {
  it('cancelar NUNCA devolve CANCELLED sem prova', async () => {
    const emissor = new FileEmissor('./tmp-dfe-test');
    const r = await emissor.cancelar('ref-1', { cMotivo: 1, xMotivo: 'x' });
    expect(r.status).not.toBe('CANCELLED');
  });

  it('consultar sem arquivo-resposta continua PROCESSING', async () => {
    const emissor = new FileEmissor('./tmp-dfe-test-empty');
    const r = await emissor.consultar('ref-inexistente-' + Date.now());
    expect(r.status).toBe('PROCESSING');
  });
});
