#!/usr/bin/env node
/**
 * Onda 3.2 fatia 5 (auditoria fiscal de 24/11/2026; dono, chat, 24/11: "as tabelas NT CST/cClassTrib viram LegalParameter") —
 * GERA o seed das três tabelas do IT 2025.002 v1.70 (CST_IBS_CBS, CCLASSTRIB_IBS_CBS, CCREDPRES_IBS_CBS) a partir da TSV
 * da transcrição `docs/accounting/fontes-oficiais/TRANSCRICAO-IT2025002-v170-tabelas-IBSCBS-2026-10-27.md`, nunca à mão.
 *
 * GUARDA DE sha256 (mantida da const que esta fatia substitui): antes de emitir qualquer linha, o script calcula o sha256
 * de cada bloco TSV e exige o hash que o navegador calculou na leitura de 27/10/2026 (os três do cabeçalho da transcrição).
 * Um dígito trocado na transcrição aborta a geração. O teste `ibsCbsTabelas.test.ts` repete a conta sobre o SEED (linhas →
 * TSV reserializada → mesmo sha256), de modo que a guarda sobrevive à const.
 *
 * Uso (a partir de server/):  node scripts/gerar-carga-ibs-cbs-tabelas.mjs
 * Escreve prisma/data/legal_parameters_ibs_cbs_tabelas_v1.sql e o migration.sql com o MESMO texto dos INSERTs
 * (o teste-guarda confere a igualdade).
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TRANSCRICAO = path.resolve(SERVER, '../docs/accounting/fontes-oficiais/TRANSCRICAO-IT2025002-v170-tabelas-IBSCBS-2026-10-27.md');
const SEED = path.join(SERVER, 'prisma/data/legal_parameters_ibs_cbs_tabelas_v1.sql');
const MIGRACAO = path.join(SERVER, 'prisma/migrations/20261124140000_legal_parameters_ibs_cbs_tabelas/migration.sql');

const HASH_BLOCO = {
  cst: '805c43302b46576952fe02ccfc4fd2fc40e995dfb0a1772ad75ff8c59e5fce86',
  cclass: '1694f4aa04bdd4b91560fcf38a27d5c9cea25fb78cf35a41763882c155fde186',
  credpres: 'd9befc11300061b773831eda19b497779c2b261fc3b6e8da1839897fb92f93cf',
};
const SHA_XLSX = {
  cst: 'bee3e106d24c06257d31105658679e97e2544dcc3ac61467fbe0ca4f78c6e850',
  cclass: 'bee3e106d24c06257d31105658679e97e2544dcc3ac61467fbe0ca4f78c6e850',
  credpres: '5afee01483e532b342700f8c2786f95ba6cf91a4e23ceccfbeb34bf1afef9ee1',
};
const URL_XLSX = {
  cst: 'https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=Cd5xq2ZVuEg=',
  cclass: 'https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=Cd5xq2ZVuEg=',
  credpres: 'https://www.nfe.fazenda.gov.br/portal/exibirArquivo.aspx?conteudo=2fJ9V18v0U8=',
};
const ABA = {
  cst: 'IT 2025.002 v.1.70 - cClassTrib.xlsx, aba "CST 2026-09-01"',
  cclass: 'IT 2025.002 v.1.70 - cClassTrib.xlsx, aba "cClass 2026-09-01"',
  credpres: 'IT 2025.002 v.1.70 - cCredPres.xlsx, aba "cCredPres"',
};
const MOTIVO =
  'Onda 3.2 fatia 5 (auditoria fiscal de 24/11/2026; dono, chat, 24/11: tabelas NT CST/cClassTrib viram LegalParameter); ' +
  'gerado de docs/accounting/fontes-oficiais/TRANSCRICAO-IT2025002-v170-tabelas-IBSCBS-2026-10-27.md por server/scripts/gerar-carga-ibs-cbs-tabelas.mjs';
// A planilha de CST não tem coluna de vigência: vigenteDesde = a 1ª dIniVig da tabela de cClassTrib (CST é pré-requisito do
// cClassTrib, UB14-20). Nenhum consumidor filtra CST por data — a consulta é por código, como a const que esta linha substitui.
const VIGENTE_DESDE_CST = '2026-01-01';

const texto = readFileSync(TRANSCRICAO, 'utf8').replace(/\r\n/g, '\n');
const blocos = [...texto.matchAll(/```text\n([\s\S]*?)```/g)].map((m) => m[1]);
if (blocos.length !== 3) throw new Error(`esperava 3 blocos TSV na transcrição, achei ${blocos.length}`);
const [cstTsv, cclassTsv, credpresTsv] = blocos;
for (const [nome, tsv] of [['cst', cstTsv], ['cclass', cclassTsv], ['credpres', credpresTsv]]) {
  const h = createHash('sha256').update(tsv, 'utf8').digest('hex');
  if (h !== HASH_BLOCO[nome]) throw new Error(`sha256 do bloco ${nome} difere da guarda (${h} ≠ ${HASH_BLOCO[nome]}) — a transcrição foi alterada`);
}

const linhasDe = (tsv) => tsv.split('\n').filter((l) => l !== '').slice(1).map((l) => l.split('\t'));
const dataDe = (serial) => (serial === '' ? null : new Date(Date.UTC(1899, 11, 30) + Number(serial) * 86_400_000).toISOString().slice(0, 10));
const ind = (v) => (v === '' ? null : Number(v));
const q = (s) => (s === null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);

const COLS = '"id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt"';
const insert = ({ id, tabela, chave, json, nome, desde, ate }) =>
  `INSERT OR IGNORE INTO "legal_parameters" (${COLS}) VALUES (${[
    q(id), q(tabela), q(chave), 'NULL', 'NULL', 'NULL', q(JSON.stringify(json)),
    q(`IT 2025.002 v1.70 (Portal NF-e, publicada em 01/10/2026) — ${ABA[nome]}`), q(URL_XLSX[nome]), q(SHA_XLSX[nome]),
    q(desde), q(ate), q('PUBLISHED'), 'NULL', q(MOTIVO), q('migracao:ONDA3-2-F5'), q('migracao:ONDA3-2-F5'), 'CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP',
  ].join(', ')});`;

const saida = [];

// CST: CST, descrição, 8 indicadores. `ordem` = posição na aba (a guarda de sha256 depende da ordem da planilha).
linhasDe(cstTsv).forEach((c, i) => {
  if (c.length !== 10) throw new Error(`CST: linha ${i + 2} com ${c.length} colunas`);
  saida.push(insert({
    id: `ibscbs-cst-${c[0]}`, tabela: 'CST_IBS_CBS', chave: c[0], nome: 'cst', desde: VIGENTE_DESDE_CST, ate: null,
    json: { ordem: i + 1, descricao: c[1], ind_gIBSCBS: ind(c[2]), ind_gIBSCBSMono: ind(c[3]), ind_gRed: ind(c[4]), ind_gDif: ind(c[5]), ind_gTransfCred: ind(c[6]), ind_gCredPresIBSZFM: ind(c[7]), ind_gAjusteCompet: ind(c[8]), ind_RedutorBC: ind(c[9]) },
  }));
});

// cClassTrib: vigência da planilha = vigenteDesde/vigenteAte da linha (dFimVig é inclusivo nas duas pontas).
const vistos = new Set();
linhasDe(cclassTsv).forEach((c, i) => {
  if (c.length !== 18) throw new Error(`cClassTrib: linha ${i + 2} com ${c.length} colunas`);
  if (vistos.has(c[1])) throw new Error(`cClassTrib ${c[1]} repetido`);
  vistos.add(c[1]);
  saida.push(insert({
    id: `ibscbs-cclass-${c[1]}`, tabela: 'CCLASSTRIB_IBS_CBS', chave: c[1], nome: 'cclass', desde: dataDe(c[14]), ate: dataDe(c[15]),
    json: {
      ordem: i + 1, cst: c[0], tipoAliquota: c[2], pRedIBS: Number(c[3]), pRedCBS: Number(c[4]), ind_gTribRegular: ind(c[5]), ind_gCredPresOper: ind(c[6]),
      ind_gMonoPadrao: ind(c[7]), ind_gMonoReten: ind(c[8]), ind_gMonoRet: ind(c[9]), ind_gpBioDiferenca: ind(c[10]), ind_gEstornoCred: ind(c[11]),
      tpRBSN: Number(c[12]), tpDoacao: Number(c[13]), indNFe: ind(c[16]), indNFCe: ind(c[17]),
    },
  }));
});

// cCredPres: duas vigências (CBS e IBS) ficam no JSON; a linha vale desde a primeira das duas. Nenhuma tem fim hoje.
linhasDe(credpresTsv).forEach((c, i) => {
  if (c.length !== 13) throw new Error(`cCredPres: linha ${i + 2} com ${c.length} colunas`);
  const [iniCbs, fimCbs, iniIbs, fimIbs] = [dataDe(c[7]), dataDe(c[8]), dataDe(c[9]), dataDe(c[10])];
  if (fimCbs !== null || fimIbs !== null) throw new Error(`cCredPres ${c[0]}: tem dFimVig — decidir o vigenteAte antes de gerar`);
  const desde = [iniCbs, iniIbs].filter((d) => d !== null).sort()[0];
  if (!desde) throw new Error(`cCredPres ${c[0]}: sem nenhuma dIniVig`);
  saida.push(insert({
    id: `ibscbs-credpres-${c[0]}`, tabela: 'CCREDPRES_IBS_CBS', chave: c[0], nome: 'credpres', desde, ate: null,
    json: {
      ordem: i + 1, apropriaViaNf: ind(c[1]), apropriaViaEvento: ind(c[2]), indDeduzCredPres: ind(c[3]), ind_gCBSCredPres: ind(c[4]), ind_gIBSCredPres: ind(c[5]),
      cClassTribNotaReferenciada: c[6], dIniVigCBS: iniCbs, dFimVigCBS: fimCbs, dIniVigIBS: iniIbs, dFimVigIBS: fimIbs, indNFe: ind(c[11]), indNFCe: ind(c[12]),
    },
  }));
});

writeFileSync(SEED, `${saida.join('\n')}\n`, 'utf8');
const cabecalho = `-- Onda 3.2 fatia 5 (auditoria fiscal de 24/11/2026; dono, chat, 24/11/2026: as tabelas NT CST/cClassTrib/cCredPres do IT 2025.002
-- v1.70 viram LegalParameter, antes const em models/ibsCbsTabelas.ts). So dado: a coluna \`tabela\` e texto livre (o enum e do
-- TypeScript), entao nao ha DDL. ${saida.length} linhas: 18 CST_IBS_CBS, 173 CCLASSTRIB_IBS_CBS e 13 CCREDPRES_IBS_CBS, geradas da TSV da
-- transcricao por server/scripts/gerar-carga-ibs-cbs-tabelas.mjs (sha256 dos tres blocos conferido antes de emitir).
-- Prologo defensivo (memoria migracao-sqlite-nao-e-transacional): o \`migrate deploy\` nao envolve o arquivo numa transacao no
-- SQLite, e um abort no meio deixa so parte das linhas. Como nao ha DDL, o prologo e o proprio comando: cada linha e um
-- INSERT OR IGNORE com id fixo, sem assercao nem tabela-sonda, entao retomar e reaplicar o arquivo — o que ja entrou e
-- ignorado, o que faltou entra. Nenhuma outra tabela e tocada.
-- Os INSERTs sao o texto de prisma/data/legal_parameters_ibs_cbs_tabelas_v1.sql (teste-guarda de igualdade).
`;
mkdirSync(path.dirname(MIGRACAO), { recursive: true });
writeFileSync(MIGRACAO, `${cabecalho}${saida.join('\n')}\n`, 'utf8');
console.log(`${saida.length} linhas -> ${path.relative(SERVER, SEED)} e ${path.relative(SERVER, MIGRACAO)}`);
