import { SEFAZ_DESABILITADAS, SEFAZ_ENDPOINTS, SEFAZ_SERVICOS, UFS, endpointSefaz } from '../sefazConfig';

/** BE-INCR-NFCE-EMENDA-2 item E-11 — cobertura da tabela das 27 UF e a propriedade "UF sem linha ⇒ erro, nunca outra UF". */
describe('SEFAZ_ENDPOINTS (E-11)', () => {
  it('toda linha tem URL https e fonte oficial com data', () => {
    for (const e of SEFAZ_ENDPOINTS) {
      expect(e.url).toMatch(/^https:\/\//);
      expect(e.fonte).toMatch(/\(\d{2}\/\d{2}\/\d{4}\)/);
    }
  });

  it('27 UF × {55, 65} × {homologação, produção} × 5 serviços: coberto ou desabilitado com motivo nomeado', () => {
    for (const uf of UFS) {
      for (const modelo of [55, 65] as const) {
        const desab = SEFAZ_DESABILITADAS.find((d) => d.uf === uf && d.modelo === modelo);
        for (const ambiente of ['homologacao', 'producao'] as const) {
          for (const servico of SEFAZ_SERVICOS) {
            const n = SEFAZ_ENDPOINTS.filter((e) => e.uf === uf && e.modelo === modelo && e.ambiente === ambiente && e.servico === servico).length;
            if (desab) expect(desab.motivo.length).toBeGreaterThan(0);
            else expect(n).toBe(1);
          }
        }
      }
    }
  });

  it('SP NFC-e homologação é a autorizadora da própria SEFAZ-SP', () => {
    expect(endpointSefaz('SP', 65, 'homologacao', 'NFeAutorizacao4')).toMatch(/^https:\/\/homologacao\.nfce\.fazenda\.sp\.gov\.br\/ws\/NFeAutorizacao4\.asmx$/i);
  });

  it('propriedade: UF/modelo sem linha ⇒ erro nomeado, nunca a URL de outra UF', () => {
    expect(() => endpointSefaz('XX', 65, 'producao', 'NFeAutorizacao4')).toThrow(/sefaz_endpoint_ausente: XX\/65/);
    for (const uf of UFS) {
      const url = (() => {
        try {
          return endpointSefaz(uf, 65, 'producao', 'NFeAutorizacao4');
        } catch {
          return null;
        }
      })();
      const linha = SEFAZ_ENDPOINTS.find((e) => e.uf === uf && e.modelo === 65 && e.ambiente === 'producao' && e.servico === 'NFeAutorizacao4');
      expect(url).toBe(linha?.url ?? null);
    }
  });
});
