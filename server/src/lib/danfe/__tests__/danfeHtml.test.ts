/**
 * NFE-DANFE-IBSCBS PR-2, itens 11, 12, 14 e 15, e a paginação decidida pelo dono em 26/10 ("Paginação no HTML"). O model
 * de base sai do fixture SINTÉTICO de leiaute completo pelo `readDanfeModel` (PR-1); os casos variam o model direto, já que
 * o render é função pura do model.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { readDanfeModel, type DanfeItem, type DanfeModel } from '../danfeModel';
import {
  DANFE_BARRAS_MM,
  DANFE_MARGEM_CLARA_MM,
  DANFE_PDF_MARGIN,
  DANFE_QUADRO_CHAVE_MM,
  alturaDoItem,
  chaveMascarada,
  fmtCents,
  linhasDoItem,
  paginar,
  renderDanfeHtml,
} from '../danfeHtml';
import { LEGAIS_SEMENTE } from '@test/helpers/legalParams';
import { ValidationError } from '../../errors';

const FULL = readFileSync(join(__dirname, '..', '..', '__tests__', 'fixtures', 'nfe', 'purchase-full-layout.SYNTHETIC.xml'), 'utf8');
const BASE: DanfeModel = readDanfeModel(FULL, LEGAIS_SEMENTE);
const com = (patch: Partial<DanfeModel>): DanfeModel => ({ ...BASE, ...patch });
const ocorrencias = (s: string, sub: string) => s.split(sub).length - 1;
/** Trecho do HTML entre o título de um bloco e o próximo título de bloco. */
function blocoHtml(html: string, titulo: string): string {
  const ini = html.indexOf(`<div class="t">${titulo}</div>`);
  expect(ini).toBeGreaterThan(-1);
  const fim = html.indexOf('<div class="t">', ini + 10);
  return html.slice(ini, fim === -1 ? undefined : fim);
}
/** Linha (<tr>) do item pelo código do produto. */
function linhaHtml(html: string, cProd: string): string {
  const ini = html.indexOf(`<td class="cod">${cProd}</td>`);
  expect(ini).toBeGreaterThan(-1);
  return html.slice(ini, html.indexOf('</tr>', ini));
}
const ZERO_FORMATADO = /(?<![\d.])0,00(?!\d)/;

describe('renderDanfeHtml — item 11', () => {
  const comIssqn = com({ issqn: { im: '123', vServ: 5000n, vBC: 5000n, vISS: 250n } });

  it('Total do ICMS/IPI < Total do IBS/CBS/IS < Cálculo do ISSQN (NT 2026.010 p. 8)', () => {
    const html = renderDanfeHtml(comIssqn);
    const a = html.indexOf('TOTAL DO ICMS / IPI');
    const b = html.indexOf('TOTAL DO IBS / CBS / IS');
    const c = html.indexOf('CÁLCULO DO ISSQN');
    expect(a).toBeGreaterThan(-1);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });

  it('mesmo model ⇒ mesmo HTML, byte a byte (I5)', () => {
    expect(renderDanfeHtml(comIssqn)).toBe(renderDanfeHtml(comIssqn));
  });

  it('texto do XML sai escapado (I7): produto, emitente (canhoto e cabeçalho), transporte e informações complementares', () => {
    const X = '<script>x</script>';
    const itens = [{ ...BASE.itens[0], xProd: X, infAdProd: X }, ...BASE.itens.slice(1)];
    const html = renderDanfeHtml(
      com({
        itens,
        emit: { ...BASE.emit, xNome: X },
        transp: { ...BASE.transp!, transportadora: { ...BASE.transp!.transportadora!, xNome: X, xEnder: X } },
        dest: { ...BASE.dest, xNome: X },
        infCpl: X,
        infAdFisco: X,
      }),
    );
    expect(html).not.toContain('<script>');
    // produto ×2, canhoto, cabeçalho, transportadora ×2, destinatário, infAdFisco + infCpl
    expect(ocorrencias(html, '&lt;script&gt;x&lt;/script&gt;')).toBe(9);
  });

  it('campo de consulta com o texto do modelo da NT 2026.010 (L-DANFE-PR0-3, dono 26/10)', () => {
    expect(renderDanfeHtml(BASE)).toContain(
      'Consulte a autenticidade no portal nacional da NF-e www.nfe.fazenda.gov.br/portal ou no site da SEFAZ autorizadora',
    );
  });

  it('chave em 11 blocos de 4, protocolo com data e hora por reslice, CRT com descrição', () => {
    const html = renderDanfeHtml(BASE);
    expect(chaveMascarada(BASE.chave)).toBe('3526 0911 2223 3300 0181 5500 1000 0123 4514 8213 5790');
    expect(html).toContain('3526 0911 2223 3300 0181 5500 1000 0123 4514 8213 5790');
    expect(html).toContain('135260000123456 – 15/09/2026 10:12:51');
    expect(html).toContain('3 - REGIME NORMAL');
  });

  it('sem fatura e sem ISSQN no XML ⇒ quadros suprimidos ([MOC-DANFE-SUPR-*])', () => {
    const html = renderDanfeHtml(com({ fatura: null, issqn: null }));
    expect(html).not.toContain('FATURA / DUPLICATAS');
    expect(html).not.toContain('CÁLCULO DO ISSQN');
  });

  it('dinheiro: milhar com ponto e centavos com vírgula; ausente ⇒ vazio', () => {
    expect(fmtCents(123456789n)).toBe('1.234.567,89');
    expect(fmtCents(5n)).toBe('0,05');
    expect(fmtCents(null)).toBe('');
  });
});

describe('renderDanfeHtml — item 12 (linha do item com IBS/CBS/IS)', () => {
  const ibsCbsComGredNaCbs: DanfeItem['ibsCbs'] = {
    cClassTrib: '000001',
    vBC: 21600n,
    ibsUf: { aliq: { aliquota: '0.1000', origem: 'VIGENTE' }, valor: 9n },
    ibsMun: { aliq: { aliquota: '0.0500', origem: 'VIGENTE' }, valor: 4n },
    cbs: { aliq: { aliquota: '0.3600', origem: 'EFETIVA' }, valor: 78n },
  };

  it('item com gRed imprime a alíquota efetiva (pAliqEfet) e a linha [NCM][cClassTrib]', () => {
    const itens = [{ ...BASE.itens[0], ibsCbs: ibsCbsComGredNaCbs }, ...BASE.itens.slice(1)];
    const linha = linhaHtml(renderDanfeHtml(com({ itens })), 'SHAMP-1L');
    expect(linha).toContain('0,3600%');
    expect(linha).toContain('[NCM 33051000] [cClassTrib 000001]');
  });

  it('item sem UB12 não tem "0,00" nas colunas (I2)', () => {
    const linha = linhaHtml(renderDanfeHtml(BASE), 'LUVA-NIT-M');
    expect(BASE.itens[2].ibsCbs).toBeNull();
    expect(linha).not.toMatch(ZERO_FORMATADO);
  });

  it('IPI com base, alíquota e valor (IPITrib)', () => {
    const linha = linhaHtml(renderDanfeHtml(BASE), 'TOALHA-70');
    expect(linha).toContain('199,00');
    expect(linha).toContain('5,00%');
    expect(linha).toContain('9,95');
  });
});

describe('código de barras no cabeçalho (`[MOC-DANFE-C128-DIM]`, NT Conjunta 2025.001 §6)', () => {
  it('115 mm de barras (mínimo do híbrido) cabem no quadro da chave com a margem clara dos dois lados', () => {
    expect(DANFE_BARRAS_MM).toBeGreaterThanOrEqual(115);
    expect(DANFE_QUADRO_CHAVE_MM - 1.4 - 2 * DANFE_MARGEM_CLARA_MM).toBeGreaterThanOrEqual(DANFE_BARRAS_MM);
    const html = renderDanfeHtml(BASE);
    expect(html).toContain(`width: ${DANFE_BARRAS_MM}mm`);
    expect(html).toMatch(/<div class="cx chave" style="width:63%">/);
  });
});

describe('altura do item considera todas as colunas', () => {
  const pequeno = BASE.itens[1];
  const grande: DanfeItem = {
    ...pequeno,
    vProd: 123456789n,
    icms: { vBC: 123456789n, pICMS: '18.0000', vICMS: 22222222n },
    ipi: { vBC: 123456789n, pIPI: '5.0000', vIPI: 6172839n },
    ibsCbs: {
      cClassTrib: '000001', vBC: 123456789n,
      ibsUf: { aliq: { aliquota: '0.1000', origem: 'VIGENTE' }, valor: 123456n },
      ibsMun: { aliq: { aliquota: '0.0500', origem: 'VIGENTE' }, valor: 61728n },
      cbs: { aliq: { aliquota: '0.9000', origem: 'VIGENTE' }, valor: 1111111n },
    },
  };

  it('valores grandes nas colunas de tributos fazem o item ocupar mais linhas, mesmo com a descrição curta', () => {
    expect(linhasDoItem(grande)).toBeGreaterThan(linhasDoItem(pequeno));
  });

  it('nota com 40 itens de valores grandes pede mais folhas que a mesma nota com valores pequenos', () => {
    const n = (item: DanfeItem) => paginar(com({ itens: Array.from({ length: 40 }, (_, k) => ({ ...item, nItem: k + 1 })) })).folhas.length;
    expect(n(grande)).toBeGreaterThan(n(pequeno));
  });
});

describe('renderDanfeHtml — totais IBS/CBS/IS (I2)', () => {
  it('sem os grupos no XML ⇒ bloco presente, sem "0,00"', () => {
    const bloco = blocoHtml(renderDanfeHtml(BASE), 'TOTAL DO IBS / CBS / IS');
    expect(bloco).toContain('VALOR DA CBS');
    expect(bloco).not.toMatch(ZERO_FORMATADO);
    expect(bloco).not.toContain('MONOFÁSIC'); // facultativos condicionados (`[NT10-FACULT]`) somem
  });

  it('com monofasia ⇒ os quatro campos facultativos aparecem', () => {
    const totaisIbsCbsIs = { ...BASE.totaisIbsCbsIs, vCBS: 130n, vIBSMono: 111n, vCBSMono: 222n, vIBSMonoReten: 333n, vCBSMonoReten: 444n };
    const bloco = blocoHtml(renderDanfeHtml(com({ totaisIbsCbsIs })), 'TOTAL DO IBS / CBS / IS');
    expect(bloco).toContain('VALOR DO IBS MONOFÁSICO POR RETENÇÃO');
    expect(bloco).toContain('4,44');
    expect(bloco).toContain('1,30');
  });
});

describe('renderDanfeHtml — item 14 (homologação)', () => {
  it('tpAmb=2 ⇒ "SEM VALOR FISCAL" em marca d\'água E em Informações Complementares', () => {
    const html = renderDanfeHtml(com({ ambiente: 'homologacao' }));
    expect(html).toContain('<div class="marca">SEM VALOR FISCAL</div>');
    expect(blocoHtml(html, 'DADOS ADICIONAIS')).toMatch(/INFORMAÇÕES COMPLEMENTARES<\/span><span class="v">SEM VALOR FISCAL /);
    expect(ocorrencias(html, 'SEM VALOR FISCAL')).toBe(2);
  });

  it('tpAmb=1 ⇒ nenhuma ocorrência', () => {
    expect(renderDanfeHtml(BASE)).not.toContain('SEM VALOR FISCAL');
  });
});

describe('item 15 — QR Code (F-DANFE-8 b)', () => {
  const QR = 'https://www.homologacao.nfce.fazenda.sp.gov.br/qrcode?p=35260911222333000181550010000123451482135790|2|1|1|ABC';
  // infNFeSupl fica fora do <infNFe> assinado (entre ele e a <Signature>): não precisa re-assinar
  const comSupl = FULL.replace('</infNFe>', `</infNFe><infNFeSupl><qrCode><![CDATA[${QR}]]></qrCode><urlChave>www.exemplo</urlChave></infNFeSupl>`);

  it('infNFeSupl/qrCode no XML ⇒ aviso no model e área QR CODE vazia, sem o conteúdo no HTML', () => {
    const m = readDanfeModel(comSupl, LEGAIS_SEMENTE);
    expect(m.avisos).toEqual(['QRCODE_NAO_RENDERIZADO']);
    const html = renderDanfeHtml(m);
    expect(html).toContain('<div class="c qr" style="width:15%"><span class="r">QR CODE</span></div>');
    expect(html).not.toContain('qrcode?p=');
    expect(html).not.toContain('QRCODE_NAO_RENDERIZADO');
  });

  it('sem infNFeSupl ⇒ sem aviso', () => {
    expect(BASE.avisos).toEqual([]);
  });
});

describe('paginação (dono, 26/10: "Paginação no HTML"; [MOC-DANFE-FOLHAS])', () => {
  const muitos = (n: number): DanfeItem[] =>
    Array.from({ length: n }, (_, k) => ({ ...BASE.itens[k % 3], nItem: k + 1, cProd: `P${String(k + 1).padStart(4, '0')}` }));

  it('nota pequena ⇒ FOLHA 1/1', () => {
    const html = renderDanfeHtml(BASE);
    expect(ocorrencias(html, '<section class="folha">')).toBe(1);
    expect(html).toContain('FOLHA 1/1');
  });

  it('nota com 150 itens ⇒ N folhas, cabeçalho em todas, FOLHA k/N, itens na ordem e nenhuma folha acima da capacidade', () => {
    const m = com({ itens: muitos(150) });
    const pag = paginar(m);
    const n = pag.folhas.length;
    expect(n).toBeGreaterThan(2);
    const html = renderDanfeHtml(m);
    expect(ocorrencias(html, '<section class="folha">')).toBe(n);
    for (let k = 1; k <= n; k++) expect(html).toContain(`FOLHA ${k}/${n}`);
    expect(ocorrencias(html, chaveMascarada(m.chave))).toBe(n); // cabeçalho repetido
    expect(ocorrencias(html, 'RECEBEMOS DE')).toBe(1); // canhoto só na 1ª
    expect(ocorrencias(html, 'CONTINUA NA PRÓXIMA FOLHA')).toBe(n - 1);
    const ordem = [...html.matchAll(/<td class="cod">(P\d{4})<\/td>/g)].map((x) => x[1]);
    expect(ordem).toEqual(m.itens.map((i) => i.cProd));
    pag.folhas.forEach((itens, idx) => {
      const cap = idx === 0 ? pag.capacidade.folha1 : pag.capacidade.adicionais;
      expect(itens.reduce((s, i) => s + alturaDoItem(i), 0)).toBeLessThanOrEqual(cap);
    });
  });

  const comDups = (n: number, patch: Partial<DanfeModel> = {}) =>
    com({ fatura: { nFat: '1', dup: Array.from({ length: n }, (_, k) => ({ nDup: String(k + 1).padStart(3, '0'), dVenc: '2026-12-01', vDup: 100n })) }, ...patch });

  it('sem espaço para um item na 1ª folha ⇒ a 1ª folha sai sem itens e eles começam na 2ª', () => {
    // o menor número de duplicatas que tira todo o espaço de item da 1ª folha sem estourar a folha
    const n = Array.from({ length: 120 }, (_, k) => k + 1).find((k) => {
      try {
        return paginar(comDups(k)).folhas[0].length === 0;
      } catch {
        return false;
      }
    });
    expect(n).toBeDefined();
    const m = comDups(n!);
    const pag = paginar(m);
    expect(pag.capacidade.folha1).toBeLessThan(alturaDoItem(m.itens[0]));
    expect(pag.folhas[0]).toEqual([]);
    expect(pag.folhas.slice(1).flat().map((i) => i.cProd)).toEqual(m.itens.map((i) => i.cProd));
    const html = renderDanfeHtml(m);
    expect(html).toContain('FOLHA 2/2');
    expect(ocorrencias(html, 'CONTINUA NA PRÓXIMA FOLHA')).toBe(1);
  });

  it('quadros da 1ª folha maiores que a folha (120 duplicatas e transporte com 3 volumes) ⇒ erro nomeado, não PDF cortado', () => {
    const vols = BASE.transp!.volumes;
    const m = comDups(120, { transp: { ...BASE.transp!, volumes: [...vols, ...vols, ...vols] } });
    expect.assertions(2);
    try {
      renderDanfeHtml(m);
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).errorCode).toBe('DANFE_FOLHA1_EXCEDE');
    }
  });

  it('informações complementares longas continuam na última folha, sem perder texto', () => {
    const palavras = Array.from({ length: 400 }, (_, k) => `TEXTO${k}`);
    const m = com({ infCpl: palavras.join(' ') });
    const html = renderDanfeHtml(m);
    expect(html).toContain('(CONTINUA NA ÚLTIMA FOLHA)');
    expect(html).toContain('INFORMAÇÕES COMPLEMENTARES (CONTINUAÇÃO)');
    expect(ocorrencias(html, '<section class="folha">')).toBe(2);
    for (const p of [palavras[0], palavras[200], palavras[399]]) expect(html).toContain(`${p} `.trimEnd());
    const textos = [...html.matchAll(/TEXTO\d+/g)].map((x) => x[0]);
    expect(textos).toEqual(palavras);
  });
});

describe('item 16 — margem do DANFE', () => {
  it('dentro de 0,2–0,8 cm em cada lado ([MOC-DANFE-MARGEM])', () => {
    for (const v of Object.values(DANFE_PDF_MARGIN)) {
      const mm = Number(v.replace('mm', ''));
      expect(mm).toBeGreaterThanOrEqual(2);
      expect(mm).toBeLessThanOrEqual(8);
    }
  });
});
