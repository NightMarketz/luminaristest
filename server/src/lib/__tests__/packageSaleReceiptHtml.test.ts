import { packageSaleReceiptHtml, type PackageSaleReceiptData } from '../packageSaleReceiptHtml';

/**
 * FE-INCR-PACOTE-VALIDADE (BRIEF item 13) — o serializador puro do comprovante. O que pode estar errado (escape,
 * data, valor, cláusula, marca de "sem aceite", 12pt) mora aqui e é testado; o puppeteer é só um invólucro.
 */
const CLAUSE = 'VALIDADE DO PACOTE: este pacote vale por 30 dias corridos. Último dia para usar: 26/12/2026.';

const base = (over: Partial<PackageSaleReceiptData> = {}): PackageSaleReceiptData => ({
  unitName: 'Matriz',
  customerName: 'Ana Souza',
  packageName: 'Pacote 10 escovas',
  amountCents: 123456,
  saleDate: '2026-11-25',
  clause: CLAUSE,
  acceptance: { acceptedByLabel: 'Bia (recepção)', acceptedAt: new Date('2026-11-25T15:30:00.000Z'), textVersion: 'v1' },
  ...over,
});

describe('packageSaleReceiptHtml', () => {
  it('imprime unidade, cliente, pacote, valor, data da venda (sem day-shift) e a cláusula', () => {
    const html = packageSaleReceiptHtml(base());
    expect(html).toContain('Matriz');
    expect(html).toContain('Ana Souza');
    expect(html).toContain('Pacote 10 escovas');
    expect(html).toContain('R$ 1.234,56');
    expect(html).toContain('25/11/2026');
    expect(html).toContain(CLAUSE);
  });

  it('a cláusula fica numa caixa com borda, em negrito e font-size: 12pt (corpo 12, CDC 54 § 3º)', () => {
    const html = packageSaleReceiptHtml(base());
    const css = /\.clause\s*\{([^}]*)\}/.exec(html);
    expect(css).not.toBeNull();
    expect(css![1]).toMatch(/font-size:\s*12pt/);
    expect(css![1]).toMatch(/font-weight:\s*bold/);
    expect(css![1]).toMatch(/border:\s*2px solid/);
    expect(html).toContain(`<div class="clause">${CLAUSE}</div>`);
  });

  it('com aceite: quem, quando (horário de Brasília) e versão; sem a marca de ausência', () => {
    const html = packageSaleReceiptHtml(base());
    expect(html).toContain('Bia (recepção)');
    expect(html).toContain('25/11/2026 12:30 (Brasília)'); // 15:30Z = 12:30 BRT
    expect(html).toContain('v1');
    expect(html).not.toContain('ACEITE NÃO REGISTRADO');
  });

  it('sem aceite: carimba ACEITE NÃO REGISTRADO e não inventa quem/quando', () => {
    const html = packageSaleReceiptHtml(base({ acceptance: null }));
    expect(html).toContain('ACEITE NÃO REGISTRADO');
    expect(html).not.toContain('Aceite registrado por');
  });

  it('tem a linha de assinatura do cliente', () => {
    expect(packageSaleReceiptHtml(base())).toContain('Assinatura do cliente: Ana Souza');
  });

  it('escapa HTML em todo texto de usuário (nome do cliente, do pacote, da unidade, cláusula, quem aceitou)', () => {
    const evil = '<script>alert(1)</script>';
    const html = packageSaleReceiptHtml(
      base({
        unitName: evil,
        customerName: evil,
        packageName: evil,
        clause: evil,
        acceptance: { acceptedByLabel: evil, acceptedAt: new Date(), textVersion: 'v1' },
      }),
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('a hora do aceite vira o dia seguinte em UTC sem mudar o dia em Brasília (02:00Z = 23:00 BRT do dia anterior)', () => {
    const html = packageSaleReceiptHtml(
      base({ acceptance: { acceptedByLabel: 'x', acceptedAt: new Date('2026-11-26T02:00:00.000Z'), textVersion: 'v1' } }),
    );
    expect(html).toContain('25/11/2026 23:00 (Brasília)');
  });
});
