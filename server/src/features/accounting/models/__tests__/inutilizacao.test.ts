import fs from 'fs';
import path from 'path';
import { LEGAL_PARAMS_SEED_FILE_INUT_NAO_SE_APLICA, legalParamsSeedRows } from '@test/helpers/legalParams';
import { erroDeFormato } from '../../../legalParameters/models/formatoLinha';
import type { LegalParameterTabela, LinhaLegal } from '../../../legalParameters/models/legalParameter';
import { NFCE_PRESUNCAO, avisoDeInutilizacao, guardaDaFaixa, lacunasDeNumeracao } from '../inutilizacao';

/**
 * BE-INCR-NFCE (nó X10a, PR-4) — itens 24 (guardas `[NFE-INUT-REGRAS]`), 25 (lacunas) e EMENDA-3 E3-2 (a) (aviso por UF a
 * partir de 01/11/2026, presunção só na NFC-e). Decisões do dono de 26/10 por questionário: REJECTED não bloqueia, só número
 * já consumido, todos os ambientes, data = hoje no fuso do escopo.
 */
const seed = legalParamsSeedRows(LEGAL_PARAMS_SEED_FILE_INUT_NAO_SE_APLICA) as LinhaLegal[];
const SP = '35';
const MG = '31';

describe('semente INUT_NAO_SE_APLICA (EMENDA-3 E3-2 a)', () => {
  it('a migração carrega o texto de prisma/data/legal_parameters_inut_nao_se_aplica_v1.sql e só insere', () => {
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const mig = norm(
      fs.readFileSync(path.resolve(__dirname, '../../../../../prisma/migrations/20261026141000_legal_parameters_inut_nao_se_aplica/migration.sql'), 'utf8'),
    );
    expect(mig).toContain(norm(fs.readFileSync(LEGAL_PARAMS_SEED_FILE_INUT_NAO_SE_APLICA, 'utf8')).trimEnd());
    expect(mig.split('\n').filter((l) => l.trim() && !l.startsWith('--')).every((l) => l.startsWith('INSERT OR IGNORE INTO "legal_parameters" '))).toBe(true);
  });

  it('3 UF (AC 12, BA 29, SP 35) × 2 tipos, vigentes desde 2026-11-01, com fonte e SHA-256, no formato da tabela', () => {
    expect(seed.map((l) => `${l.chave}/${l.discriminador}`).sort()).toEqual(['NFCE/12', 'NFCE/29', 'NFCE/35', 'NFE/12', 'NFE/29', 'NFE/35']);
    for (const l of seed) {
      expect(l).toMatchObject({ tabela: 'INUT_NAO_SE_APLICA', vigenteDesde: '2026-11-01', vigenteAte: null, status: 'PUBLISHED' });
      expect([l.id, erroDeFormato({ ...l, tabela: l.tabela as LegalParameterTabela })]).toEqual([l.id, null]);
      expect((l as { fonteSha256?: string | null }).fonteSha256).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(seed.find((l) => l.chave === 'NFE')?.fonte).toContain('Ajuste SINIEF 40/26');
    expect(seed.find((l) => l.chave === 'NFCE')?.fonte).toContain('Ajuste SINIEF 38/26');
  });
});

describe('item 24 — guardas da faixa (MOC VG Tabela 5-12), uma por caso', () => {
  const base = { nIni: 3n, nFin: 4n, ano: 2026, anoAtual: 2026, last: 10n };
  it('faixa válida ⇒ sem guarda', () => expect(guardaDaFaixa(base)).toBeNull());
  it('rej. 453: ano posterior ao atual', () => expect(guardaDaFaixa({ ...base, ano: 2027 })?.code).toBe('inut_ano_futuro'));
  it('rej. 224: nIni > nFin', () => expect(guardaDaFaixa({ ...base, nIni: 5n, nFin: 4n })?.code).toBe('inut_faixa_invertida'));
  it('rej. 201: mais de 10.000 números (10.000 exatos passam)', () => {
    expect(guardaDaFaixa({ ...base, nIni: 1n, nFin: 10_000n, last: 20_000n })).toBeNull();
    expect(guardaDaFaixa({ ...base, nIni: 1n, nFin: 10_001n, last: 20_000n })?.code).toBe('inut_faixa_excede_10000');
  });
  it('dono 26/10: número acima do último consumido ⇒ recusa (o último passa)', () => {
    expect(guardaDaFaixa({ ...base, nIni: 10n, nFin: 10n })).toBeNull();
    expect(guardaDaFaixa({ ...base, nIni: 8n, nFin: 11n })?.code).toBe('inut_acima_do_ultimo');
    expect(guardaDaFaixa({ ...base, last: 0n })?.code).toBe('inut_acima_do_ultimo'); // sequência inexistente
  });
});

describe('item 25 — lacunas de numeração', () => {
  const doc = (n: bigint, status: 'AUTHORIZED' | 'REJECTED' | 'CANCELLED' | 'SENT', ambiente = 'homologacao', serie = 1) => ({
    id: `doc-${ambiente}-${serie}-${n}`,
    ambiente,
    serie,
    numero: n,
    status,
  });
  const semAviso = { avisos: [] };

  it('sequência 1..5 com o 3 rejeitado e abandonado ⇒ pendência [3], com o documento rejeitado', () => {
    const lacunas = lacunasDeNumeracao({
      sequencias: [{ ambiente: 'homologacao', serie: 1, last: 5n }],
      documentos: [doc(1n, 'AUTHORIZED'), doc(2n, 'CANCELLED'), doc(3n, 'REJECTED'), doc(4n, 'SENT'), doc(5n, 'AUTHORIZED')],
      homologadas: [],
      aviso: semAviso,
    });
    expect(lacunas).toEqual([{ ambiente: 'homologacao', serie: 1, numero: '3', documentId: 'doc-homologacao-1-3', status: 'REJECTED', avisos: [] }]);
  });

  it('faixa homologada tira o número; pedido não homologado não é passado aqui (o serviço só manda HOMOLOGATED)', () => {
    const lacunas = lacunasDeNumeracao({
      sequencias: [{ ambiente: 'homologacao', serie: 1, last: 5n }],
      documentos: [doc(1n, 'AUTHORIZED'), doc(3n, 'REJECTED'), doc(5n, 'AUTHORIZED')],
      homologadas: [{ ambiente: 'homologacao', serie: 1, nIni: 3n, nFin: 4n }],
      aviso: semAviso,
    });
    expect(lacunas.map((l) => l.numero)).toEqual(['2']);
  });

  it('dono 26/10: todos os ambientes e séries, cada lacuna com o seu (a faixa de um não tira a do outro)', () => {
    const lacunas = lacunasDeNumeracao({
      sequencias: [
        { ambiente: 'homologacao', serie: 1, last: 2n },
        { ambiente: 'producao', serie: 1, last: 2n },
        { ambiente: 'producao', serie: 2, last: 1n },
      ],
      documentos: [doc(1n, 'AUTHORIZED', 'homologacao'), doc(2n, 'AUTHORIZED', 'producao')],
      homologadas: [{ ambiente: 'homologacao', serie: 1, nIni: 1n, nFin: 2n }],
      aviso: semAviso,
    });
    expect(lacunas.map((l) => `${l.ambiente}/${l.serie}/${l.numero}`)).toEqual(['producao/1/1', 'producao/2/1']);
  });
});

describe('EMENDA-3 E3-2 (a) — aviso da UF com data ≥ 01/11/2026 (parâmetro legal) e presunção só na NFC-e', () => {
  it('SP em 31/10/2026 ⇒ sem aviso (NF-e e NFC-e)', () => {
    expect(avisoDeInutilizacao(seed, 'NFE', SP, '2026-10-31')).toEqual({ avisos: [] });
    expect(avisoDeInutilizacao(seed, 'NFCE', SP, '2026-10-31')).toEqual({ avisos: [] });
  });

  it('SP em 01/11/2026: NF-e com o aviso do Aj. 40/26 e SEM presunção; NFC-e com o do Aj. 38/26 e COM a presunção', () => {
    const nfe = avisoDeInutilizacao(seed, 'NFE', SP, '2026-11-01');
    expect(nfe.avisos).toEqual([expect.stringContaining('Aj. SINIEF 40/26')]);
    expect(nfe.avisos[0]).toContain('a SEFAZ decide; ver com o contador');
    expect(nfe).not.toHaveProperty('presuncao');
    const nfce = avisoDeInutilizacao(seed, 'NFCE', SP, '2026-11-01');
    expect(nfce.avisos).toEqual([expect.stringContaining('Aj. SINIEF 38/26')]);
    expect(nfce.presuncao).toBe(NFCE_PRESUNCAO);
    expect(NFCE_PRESUNCAO).toContain('documentos emitidos em contingência e não transmitidos');
  });

  it('AC e BA também; MG (fora da lista) e unidade sem codMun ⇒ sem aviso', () => {
    expect(avisoDeInutilizacao(seed, 'NFE', '12', '2026-11-01').avisos).toHaveLength(1);
    expect(avisoDeInutilizacao(seed, 'NFCE', '29', '2026-12-15').avisos).toHaveLength(1);
    expect(avisoDeInutilizacao(seed, 'NFCE', MG, '2026-11-01')).toEqual({ avisos: [] });
    expect(avisoDeInutilizacao(seed, 'NFCE', null, '2026-11-01')).toEqual({ avisos: [] });
  });

  it('a lacuna carrega o aviso e a presunção que recebeu', () => {
    const aviso = avisoDeInutilizacao(seed, 'NFCE', SP, '2026-11-01');
    const [l] = lacunasDeNumeracao({ sequencias: [{ ambiente: 'producao', serie: 1, last: 1n }], documentos: [], homologadas: [], aviso });
    expect(l).toMatchObject({ numero: '1', documentId: null, status: null, avisos: aviso.avisos, presuncao: NFCE_PRESUNCAO });
  });
});
