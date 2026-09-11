#!/usr/bin/env node
// Baixa o corpus de normas/manuais oficiais que sustentam os BRIEFs de contabilidade
// (ECD/ECF, NFS-e, DCTFWeb/MIT, EFD-Contribuicoes, CNAB, depreciacao, ISS).
//
// Os binarios NAO vao pro git (ver .gitignore de docs/accounting/fontes-oficiais);
// o que vai e o MANIFEST.md gerado aqui, com tamanho + sha256 de cada arquivo. E ele
// que denuncia reedicao silenciosa: rodar de novo e comparar o hash.
//
// Uso:
//   node scripts/baixar-fontes-oficiais.mjs            # baixa o que falta
//   node scripts/baixar-fontes-oficiais.mjs --forcar   # rebaixa tudo (checar reedicao)
//   node scripts/baixar-fontes-oficiais.mjs --so=<id>
//
// ponytail: fetch + writeFile, sem lib de download nem cache. Host que passar a exigir
// cookie/JS aparece como FALHOU no manifesto e o dono baixa pelo navegador.

import { createHash } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DESTINO = path.join(process.cwd(), 'docs', 'accounting', 'fontes-oficiais');
const NFSE = 'https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual';

// `assunto` = o que no projeto depende deste documento.
// `tipo`: 'arquivo' (baixa direto) | 'rfb-ato' (API do Normas + anexos) | 'indice' (pagina de navegacao).
const FONTES = [
  // ---- Imobilizado / depreciacao -------------------------------------------------
  {
    id: 'in-1700-2017',
    assunto: 'Imobilizado — taxas de depreciacao (Anexo III)',
    titulo: 'IN RFB 1.700/2017 (texto multivigente + 14 anexos)',
    tipo: 'rfb-ato',
    idAto: 81268,
    arquivo: 'IN-RFB-1700-2017.json',
  },
  // ---- Retificacao ---------------------------------------------------------------
  {
    id: 'in-2003-2021',
    assunto: 'Retificacao da ECD',
    titulo: 'IN RFB 2.003/2021',
    tipo: 'rfb-ato',
    idAto: 114965,
    arquivo: 'IN-RFB-2003-2021-ECD.json',
  },
  {
    id: 'in-2004-2021',
    assunto: 'Retificacao da ECF',
    titulo: 'IN RFB 2.004/2021',
    tipo: 'rfb-ato',
    idAto: 114966,
    arquivo: 'IN-RFB-2004-2021-ECF.json',
  },
  // ---- SPED ----------------------------------------------------------------------
  {
    id: 'manual-ecf-l12',
    assunto: 'ECF Fase 3 — blocos L/M/N, e-Lalur',
    titulo: 'Manual de Orientacao do Leiaute 12 da ECF (ADE Cofis 02/2026)',
    tipo: 'arquivo',
    url: 'http://sped.rfb.gov.br/arquivo/download/8003',
    arquivo: 'Manual-ECF-Leiaute-12.pdf',
  },
  {
    id: 'manual-ecd-l9',
    assunto: 'ECD / J930 — o campo que trava o PVA (D8)',
    titulo: 'Manual de Orientacao do Leiaute 9 da ECD (ADE Cofis 01/2026)',
    tipo: 'arquivo',
    url: 'http://sped.rfb.gov.br/arquivo/download/7990',
    arquivo: 'Manual-ECD-Leiaute-9.pdf',
  },
  {
    id: 'tabelas-dinamicas-ecf',
    assunto: 'X2 (plano referencial) + linhas de L/M/N/P (TIPO e FORMULA)',
    titulo: 'Tabelas Dinamicas e Planos Referenciais da ECF, Leiaute 12 (28/05/2026)',
    tipo: 'arquivo',
    url: 'http://sped.rfb.gov.br/arquivo/download/8002',
    arquivo: 'RFB-Tabelas-Dinamicas-ECF-Leiaute-12.xlsx',
  },
  {
    id: 'guia-efd-contrib',
    assunto: 'EFD-Contribuicoes',
    titulo: 'Guia Pratico da EFD-Contribuicoes v1.35',
    tipo: 'arquivo',
    url: 'http://sped.rfb.gov.br/arquivo/download/5836',
    arquivo: 'Guia-Pratico-EFD-Contribuicoes-v1.35.pdf',
  },
  {
    id: 'indice-sped',
    assunto: 'PVA e manuais — indice',
    titulo: 'Indice de manuais e validadores do SPED',
    tipo: 'indice',
    url: 'http://sped.rfb.gov.br/pasta/show/1644',
    arquivo: 'SPED-indice-manuais.html',
  },
  {
    id: 'indice-efd-manuais',
    assunto: 'EFD-Contribuicoes — indice de versoes do guia',
    titulo: 'Pasta de manuais da EFD-Contribuicoes (todas as versoes)',
    tipo: 'indice',
    url: 'http://sped.rfb.gov.br/pasta/show/1989',
    arquivo: 'EFD-Contribuicoes-indice-manuais.html',
  },
  // ---- NFS-e nacional ------------------------------------------------------------
  // O "manual" e um guia de 6 paginas; o leiaute e as regras de negocio estao nos
  // anexos XLSX e no pacote de XSD. Sem eles nao da pra implementar emissao.
  {
    id: 'nfse-manual-emissor',
    assunto: 'Emissao NFS-e — API do Emissor Publico Nacional',
    titulo: 'Manual dos Contribuintes — Emissor Publico, API (6 pg, aponta pro Anexo I)',
    tipo: 'arquivo',
    url: `${NFSE}/manual-contribuintes-emissor-publico-api-sistema-nacional-nfs-e-v1-2-out2025.pdf`,
    arquivo: 'NFSe-manual-contribuintes-emissor-publico-API.pdf',
  },
  {
    id: 'nfse-manual-adn',
    assunto: 'Emissao NFS-e — APIs do ADN (distribuicao)',
    titulo: 'Manual dos Contribuintes — Guia de Utilizacao das APIs do ADN',
    tipo: 'arquivo',
    url: `${NFSE}/manual-contribuintes-apis-adn-sistema-nacional-nfse.pdf`,
    arquivo: 'NFSe-manual-contribuintes-APIs-ADN.pdf',
  },
  {
    id: 'nfse-manual-judicial',
    assunto: 'Emissao NFS-e — decisao administrativa/judicial',
    titulo: 'Manual dos Contribuintes — Emissao por Decisao Administrativa ou Judicial',
    tipo: 'arquivo',
    url: `${NFSE}/manual-contribuintes-emissor-publico-api-emissao-decisao-administrativa-e-judicial.pdf`,
    arquivo: 'NFSe-manual-emissao-decisao-judicial.pdf',
  },
  {
    id: 'nfse-xsd',
    assunto: 'Emissao NFS-e — esquemas XSD (DPS, NFS-e, eventos)',
    titulo: 'NFSe-ESQUEMAS_XSD v1.01 (09/02/2026)',
    tipo: 'arquivo',
    url: `${NFSE}/nfse-esquemas_xsd-v1-01-20260209.zip`,
    arquivo: 'NFSe-ESQUEMAS_XSD-v1.01.zip',
  },
  {
    id: 'nfse-anexo-i',
    assunto: 'Emissao NFS-e — leiaute e regras de negocio da DPS/NFS-e',
    titulo: 'ANEXO I — SEFIN/ADN, DPS e NFS-e, v1.01 (09/02/2026)',
    tipo: 'arquivo',
    url: `${NFSE}/anexo_i-sefin_adn-dps_nfse-snnfse-v1-01-20260209.xlsx`,
    arquivo: 'NFSe-ANEXO-I-leiaute-DPS-NFSe-v1.01.xlsx',
  },
  {
    id: 'nfse-anexo-ii',
    assunto: 'Emissao NFS-e — eventos (cancelamento, substituicao)',
    titulo: 'ANEXO II — Pedido de Registro de Evento e Eventos, v1.01 (22/01/2026)',
    tipo: 'arquivo',
    url: `${NFSE}/anexo_ii-sefin_adn-pedregevt_evt-snnfse-v1-01-20260122.xlsx`,
    arquivo: 'NFSe-ANEXO-II-eventos-v1.01.xlsx',
  },
  {
    id: 'nfse-anexo-a',
    assunto: 'Emissao NFS-e — municipio IBGE / pais ISO2',
    titulo: 'ANEXO A — Municipio IBGE e Paises ISO2, v1.00 (10/12/2025)',
    tipo: 'arquivo',
    url: `${NFSE}/anexo_a-municipio_ibge-paises_iso2-v1-00-snnfse-20251210.xlsx`,
    arquivo: 'NFSe-ANEXO-A-municipios-paises-v1.00.xlsx',
  },
  {
    id: 'nfse-anexo-b',
    assunto: 'ISS — lista de servico nacional / NBS (casa com a LC 116)',
    titulo: 'ANEXO B — NBS2 e Lista de Servico Nacional, v1.01 (22/01/2026)',
    tipo: 'arquivo',
    url: `${NFSE}/anexo_b-nbs2-lista_servico_nacional-snnfse-v1-01-20260122.xlsx`,
    arquivo: 'NFSe-ANEXO-B-lista-servico-nacional-v1.01.xlsx',
  },
  {
    id: 'nfse-anexo-c',
    assunto: 'Reforma tributaria — indicadores de operacao IBS/CBS na NFS-e',
    titulo: 'ANEXO C — INDOP IBS/CBS, v1.01',
    tipo: 'arquivo',
    url: `${NFSE}/anexo-c-indop-ibscbs-snnfse-v1-01.xlsx`,
    arquivo: 'NFSe-ANEXO-C-INDOP-IBS-CBS-v1.01.xlsx',
  },
  {
    id: 'lc-116-2003',
    assunto: 'ISS — lista de servicos e local da prestacao',
    titulo: 'Lei Complementar 116/2003',
    tipo: 'arquivo',
    url: 'http://www.planalto.gov.br/ccivil_03/leis/lcp/lcp116.htm',
    arquivo: 'LC-116-2003.html',
  },
  // ---- DCTFWeb / MIT -------------------------------------------------------------
  {
    id: 'manual-mit',
    assunto: 'DCTFWeb — apuracao e confissao de tributos',
    titulo: 'Manual de Orientacao do MIT 1.0.14.02 (jan/2025)',
    tipo: 'arquivo',
    url: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/DCTFWeb/arquivos/manual-mit-1-0-14-02.pdf',
    arquivo: 'Manual-MIT-1.0.14.02.pdf',
  },
  {
    id: 'apis-mit',
    assunto: 'D4 — o MIT tem API (decide contratar Integra Contador)',
    titulo: 'Anuncio das APIs do MIT no Integra Contador (abr/2025)',
    tipo: 'arquivo',
    url: 'https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2025/abril/disponibilizadas-novas-apis-que-simplificam-e-facilitam-o-preenchimento-e-transmissao-da-dctfweb',
    arquivo: 'RFB-noticia-APIs-MIT-2025-04.html',
  },
  // ---- Remessa / retorno bancario ------------------------------------------------
  {
    id: 'cnab240',
    assunto: 'Remessa e retorno — CNAB 240',
    titulo: 'FEBRABAN Layout Padrao 240 posicoes, versao 10.11 (31/07/2023)',
    tipo: 'arquivo',
    url: 'https://cmsarquivos.febraban.org.br/Arquivos/documentos/PDF/Layout%20padrao%20CNAB240%20V%2010%2011%20-%2021_08_2023.pdf',
    arquivo: 'FEBRABAN-CNAB240-v10.11.pdf',
  },
  {
    id: 'febraban-portal',
    assunto: 'Remessa e retorno — indice de versoes',
    titulo: 'Portal FEBRABAN — layout 240',
    tipo: 'indice',
    url: 'https://portal.febraban.org.br/pagina/3053/33/pt-br/layout-240',
    arquivo: 'FEBRABAN-portal-layout-240.html',
  },
];

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// O SPA do Normas da RFB (normas.receita.../link.action) devolve so um shell de
// redirect. O texto vem desta API — e o path SEM /visao/... responde 403 ate no
// navegador, entao a visao e obrigatoria.
const rfbAtoUrl = (idAto) =>
  `https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/${idAto}/visao/multivigente`;
const rfbAnexoUrl = (idAto, idAnexo) =>
  `https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/${idAto}/anexo/${idAnexo}`;

const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

async function buscar(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return { buf: Buffer.from(await res.arrayBuffer()), tipo: res.headers.get('content-type') || '' };
}

// Um PDF/XLSX/ZIP que volta como HTML e pagina de erro ou de consentimento, nao o documento.
const MAGIC = { '.pdf': '%PDF', '.xlsx': 'PK', '.zip': 'PK' };
function conferirMagic(arquivo, buf) {
  const esperado = MAGIC[path.extname(arquivo)];
  if (!esperado) return null;
  const inicio = buf.subarray(0, esperado.length).toString('latin1');
  return inicio === esperado ? null : `conteudo nao e ${esperado} (veio "${inicio}")`;
}

// Converte o JSON de segmentos do ato em texto corrido grepavel.
function atoParaTexto(ato) {
  const linhas = [`${ato.epigrafeCompleta || ato.epigrafe?.numeroAto || ''}`, ''];
  const segmentos = [...(ato.outrosSegmentos || [])].sort(
    (a, b) => a.ordemSegmentoAto - b.ordemSegmentoAto,
  );
  for (const s of segmentos) {
    if (s.omitir) continue;
    const texto = String(s.textoIntegra || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&aacute;/g, 'á')
      .replace(/&amp;/g, '&')
      .trim();
    if (!texto) continue;
    // tachado = revogado/alterado; some do texto legivel se nao for marcado.
    linhas.push(s.tachado ? `[REVOGADO] ${texto}` : texto);
    if (s.arquivoBinario) {
      linhas.push(
        `    >> anexo binario: ${s.arquivoBinario.nomeArquivoBinario} (id ${s.arquivoBinario.idArquivoBinario}) — ver subpasta de anexos`,
      );
    }
  }
  return linhas.join('\n\n') + '\n';
}

async function baixarArquivo(fonte, forcar) {
  const destino = path.join(DESTINO, fonte.arquivo);
  if (existsSync(destino) && !forcar) {
    const buf = await readFile(destino);
    return { bytes: buf.length, sha256: sha(buf), estado: 'ja-existia' };
  }
  const { buf, tipo } = await buscar(fonte.url);
  const erro = conferirMagic(fonte.arquivo, buf);
  if (erro) return { bytes: buf.length, tipo, estado: `FALHOU ${erro}` };
  await writeFile(destino, buf);
  return { bytes: buf.length, tipo, sha256: sha(buf), estado: 'ok' };
}

async function baixarAto(fonte, forcar) {
  const destinoJson = path.join(DESTINO, fonte.arquivo);
  const base = fonte.arquivo.replace(/\.json$/, '');
  let buf;
  if (existsSync(destinoJson) && !forcar) {
    buf = await readFile(destinoJson);
  } else {
    ({ buf } = await buscar(rfbAtoUrl(fonte.idAto)));
    await writeFile(destinoJson, buf);
  }
  const ato = JSON.parse(buf.toString('utf8'));
  await writeFile(path.join(DESTINO, `${base}.txt`), atoParaTexto(ato), 'utf8');

  const anexos = (ato.outrosSegmentos || []).filter((s) => s.arquivoBinario).map((s) => s.arquivoBinario);
  const pastaAnexos = path.join(DESTINO, `${base}-anexos`);
  const baixados = [];
  if (anexos.length) await mkdir(pastaAnexos, { recursive: true });
  for (const a of anexos) {
    // nomeArquivoBinario repete ("Anexo I.pdf" x2), entao prefixa o id.
    const nome = `${a.idArquivoBinario}-${a.nomeArquivoBinario}`.replace(/[\\/:*?"<>|]/g, '_');
    const alvo = path.join(pastaAnexos, nome);
    let b;
    if (existsSync(alvo) && !forcar) {
      b = await readFile(alvo);
    } else {
      ({ buf: b } = await buscar(rfbAnexoUrl(fonte.idAto, a.idArquivoBinario)));
      await writeFile(alvo, b);
    }
    baixados.push({ arquivo: path.join(`${base}-anexos`, nome), bytes: b.length, sha256: sha(b) });
  }
  return {
    bytes: buf.length,
    sha256: sha(buf),
    estado: 'ok',
    segmentos: (ato.outrosSegmentos || []).length,
    anexos: baixados,
  };
}

function manifesto(resultados, quando) {
  const l = [
    '# Fontes oficiais — manifesto',
    '',
    `Gerado por \`node scripts/baixar-fontes-oficiais.mjs\` em **${quando}**.`,
    '',
    'Os arquivos desta pasta **não vão pro git** (só este manifesto vai). Para repor:',
    'rode o script. Para saber se o órgão reeditou algum documento sem trocar a URL:',
    'rode com `--forcar` e compare o sha256 — hash diferente = documento novo, e o BRIEF',
    'que citava o antigo precisa ser reconferido.',
    '',
    '| id | assunto | documento | arquivo | bytes | sha256 (12) |',
    '|---|---|---|---|--:|---|',
  ];
  for (const r of resultados) {
    const hash = r.sha256 ? r.sha256.slice(0, 12) : '—';
    const bytes = r.bytes ? r.bytes.toLocaleString('pt-BR') : '—';
    const nome = r.estado.startsWith('FALHOU') ? `**${r.estado}**` : `\`${r.arquivo}\``;
    l.push(`| ${r.id} | ${r.assunto} | ${r.titulo} | ${nome} | ${bytes} | \`${hash}\` |`);
  }
  l.push('', '## URLs de origem', '');
  for (const r of resultados) {
    l.push(`- **${r.id}** — <${r.url || rfbAtoUrl(r.idAto)}>`);
  }
  const comAnexos = resultados.filter((r) => r.anexos?.length);
  if (comAnexos.length) {
    l.push('', '## Anexos binários dos atos da RFB', '');
    l.push('| ato | anexo | bytes | sha256 (12) |', '|---|---|--:|---|');
    for (const r of comAnexos) {
      for (const a of r.anexos) {
        l.push(
          `| ${r.id} | \`${a.arquivo.replace(/\\/g, '/')}\` | ${a.bytes.toLocaleString('pt-BR')} | \`${a.sha256.slice(0, 12)}\` |`,
        );
      }
    }
  }
  return l.join('\n') + '\n';
}

async function main() {
  const args = process.argv.slice(2);
  const forcar = args.includes('--forcar');
  const soArg = args.find((a) => a.startsWith('--so='));
  const alvo = soArg ? FONTES.filter((f) => f.id === soArg.slice(5)) : FONTES;

  await mkdir(DESTINO, { recursive: true });
  const resultados = [];
  for (const fonte of alvo) {
    process.stdout.write(`${fonte.id.padEnd(22)} ... `);
    try {
      const r =
        fonte.tipo === 'rfb-ato'
          ? await baixarAto(fonte, forcar)
          : await baixarArquivo(fonte, forcar);
      resultados.push({ ...fonte, ...r });
      const extra = r.anexos?.length ? ` +${r.anexos.length} anexos` : '';
      console.log(`${r.estado} (${kb(r.bytes)})${extra}`);
    } catch (err) {
      resultados.push({ ...fonte, estado: `FALHOU ${err.message}` });
      console.log(`FALHOU ${err.message}`);
    }
  }

  const quando = new Date().toISOString().slice(0, 10);
  await writeFile(path.join(DESTINO, 'MANIFEST.md'), manifesto(resultados, quando), 'utf8');

  const falhas = resultados.filter((r) => r.estado.startsWith('FALHOU'));
  console.log(`\n${resultados.length - falhas.length}/${resultados.length} ok — MANIFEST.md gerado`);
  for (const f of falhas) console.log(`  FALHOU ${f.id}: ${f.estado} -> ${f.url || f.idAto}`);
  process.exitCode = falhas.length ? 1 : 0;
}

main();
