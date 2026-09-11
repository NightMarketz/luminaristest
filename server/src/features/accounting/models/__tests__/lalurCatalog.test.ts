/**
 * Catálogo das Tabelas Dinâmicas (BE-INCR-SPED-ECF-FASE3B item 10) — o fixture `ecf-l12-linhas.json` é
 * DERIVADO do XLSX oficial por `scripts/ecf-tabelas-dinamicas-to-catalog.mjs`; nenhum código é digitado.
 *
 * Dois gates:
 *  1. Contagens batem com a reconferência (`RECONFERENCIA-ECF-FASE3-2026-09-10.md` / transcrição do
 *     Passo A): M300A 374 `E` · N630A 15 `CNA` / 26 `E` · N670 26 `E` — roda sempre (CI inclusa).
 *  2. Rodar o script contra o XLSX do corpus reproduz o fixture byte-a-byte (após normalizar CRLF do
 *     checkout Windows) — roda SÓ quando o XLSX existe localmente (é gitignored: corpus local, sha256 no
 *     MANIFEST). Sem o corpus o teste é pulado explicitamente, não passa em vácuo.
 */
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ECF_L12_CATALOG, ECF_L12_CODIGOS_DUPLICADOS, findLinha, findParteBPadrao, linhasDoLivro, vigenteNoAno } from '../Lalur.model';
import { LalurService } from '../../services/LalurService';
import { ValidationError } from '../../../../lib/errors';

const REPO_ROOT = path.resolve(__dirname, '../../../../../..');
const XLSX = path.join(REPO_ROOT, 'docs/accounting/fontes-oficiais/RFB-Tabelas-Dinamicas-ECF-Leiaute-12.xlsx');
const FIXTURE = path.join(REPO_ROOT, 'server/src/features/accounting/fixtures/ecf-l12-linhas.json');

const count = (aba: 'M300A' | 'M350A' | 'N500' | 'N630A' | 'N670', tipo: string) =>
  ECF_L12_CATALOG.abas[aba].filter((r) => r.tipo === tipo).length;

describe('ecf-l12-linhas.json — contagens da reconferência', () => {
  it('M300A 374 E · M350A 342 E · N500 1 E/1 CNA · N630A 26 E/15 CNA · N670 26 E/5 CNA', () => {
    expect(count('M300A', 'E')).toBe(374);
    expect(count('M350A', 'E')).toBe(342);
    expect(count('N500', 'E')).toBe(1);
    expect(count('N500', 'CNA')).toBe(1);
    expect(count('N630A', 'E')).toBe(26);
    expect(count('N630A', 'CNA')).toBe(15);
    expect(count('N670', 'E')).toBe(26);
    expect(count('N670', 'CNA')).toBe(5);
  });
  it('cabeçalho: leiaute 0012 + sha256 do XLSX de origem (MANIFEST.md)', () => {
    expect(ECF_L12_CATALOG.leiaute).toBe('0012');
    expect(ECF_L12_CATALOG.sha256).toBe('366b8d9030a04e9f6203b6ae29ace49d3ffa3fa0c1f5a7a18b0c967b9a5a3cac');
  });
  it('tipoLanc das linhas E de M300A/M350A ⊂ {A,E,P,L} (lacuna 1, p.245); PARTEB_PADRAO tributo ⊂ {I,C,A}', () => {
    for (const aba of ['M300A', 'M350A'] as const) {
      for (const r of ECF_L12_CATALOG.abas[aba]) if (r.tipo === 'E') expect(['A', 'E', 'P', 'L']).toContain(r.tipoLanc);
    }
    expect(ECF_L12_CATALOG.abas.PARTEB_PADRAO.length).toBeGreaterThan(100);
    for (const r of ECF_L12_CATALOG.abas.PARTEB_PADRAO) expect(['I', 'C', 'A']).toContain(r.tributo);
    expect(findParteBPadrao('1000')?.tributo).toBe('I'); // Prejuízo Fiscal Operacional
  });
  it('anomalia da planilha oficial: só M350A/13 é código duplicado; lookup = 1ª ocorrência (= texto de M300A/13)', () => {
    expect(ECF_L12_CODIGOS_DUPLICADOS).toEqual(['M350A/13']);
    expect(findLinha('lacs', '13')?.descricao).toBe(findLinha('lalur', '13')?.descricao);
  });
  it('findLinha: código 7 de lalur = "Custos não dedutíveis", E, tipoLanc A (item 8)', () => {
    expect(findLinha('lalur', '7')).toMatchObject({ descricao: 'Custos não dedutíveis', tipo: 'E', tipoLanc: 'A' });
    expect(findLinha('lalur', '2')?.tipo).toBe('CNA'); // Lucro Líquido Antes do IRPJ
    expect(findLinha('n630', '99999')).toBeUndefined();
  });
  it('vigenteNoAno: DT_INI posterior ao ano ou DT_FIM anterior excluem', () => {
    expect(vigenteNoAno({ dtIni: '2026-01-01', dtFim: null }, 2025)).toBe(false);
    expect(vigenteNoAno({ dtIni: '2015-01-01', dtFim: '2024-12-31' }, 2025)).toBe(false);
    expect(vigenteNoAno({ dtIni: '2015-01-01', dtFim: null }, 2025)).toBe(true);
  });
});

describe('LalurService.resolveLinha — item 9: 400 com código e motivo, nunca drop', () => {
  it("codigo='2' (CNA, Lucro Líquido Antes do IRPJ) é 400 citando o tipo", () => {
    expect(() => LalurService.resolveLinha('lalur', '2', 2025)).toThrow(ValidationError);
    expect(() => LalurService.resolveLinha('lalur', '2', 2025)).toThrow(/'2'.*CNA/);
  });
  it("codigo='6.1' de n630 (DT_INI 01012026, CNA) é 400 para year=2025", () => {
    expect(() => LalurService.resolveLinha('n630', '6.1', 2025)).toThrow(/6\.1/);
  });
  it("vigência isolada: linha E 'M300A/8.1101' (DT_INI 2026-01-01) é 400 em 2025 citando DT_INI, e passa em 2026", () => {
    const row = findLinha('lalur', '8.1101')!;
    expect(row).toMatchObject({ tipo: 'E', dtIni: '2026-01-01' });
    expect(() => LalurService.resolveLinha('lalur', '8.1101', 2025)).toThrow(/8\.1101.*não vigora em 2025.*DT_INI 2026-01-01/);
    expect(LalurService.resolveLinha('lalur', '8.1101', 2026).codigo).toBe('8.1101');
  });
  it('código inexistente é 400 nomeando o código e o livro', () => {
    expect(() => LalurService.resolveLinha('lacs', 'nao-existe', 2025)).toThrow(/'nao-existe'.*lacs/);
  });
  it('toda linha CNA/CA/R de todo livro é recusada; toda linha E vigente em 2025 passa (tabela-dirigido)', () => {
    for (const livro of ['lalur', 'lacs', 'n500', 'n630', 'n670'] as const) {
      for (const r of linhasDoLivro(livro)) {
        if (r.tipo !== 'E') expect(() => LalurService.resolveLinha(livro, r.codigo, 2025)).toThrow(ValidationError);
        else if (vigenteNoAno(r, 2025)) expect(LalurService.resolveLinha(livro, r.codigo, 2025).codigo).toBe(r.codigo);
        else expect(() => LalurService.resolveLinha(livro, r.codigo, 2025)).toThrow(/não vigora em 2025/);
      }
    }
  });
});

const hasCorpus = existsSync(XLSX);
(hasCorpus ? describe : describe.skip)('script × fixture — reprodução byte-a-byte (corpus local presente)', () => {
  it('node scripts/ecf-tabelas-dinamicas-to-catalog.mjs --stdout === fixture commitado', () => {
    const out = execFileSync('node', ['scripts/ecf-tabelas-dinamicas-to-catalog.mjs', '--stdout'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    const norm = (s: string) => s.replace(/\r\n/g, '\n');
    const sha = (s: string) => createHash('sha256').update(s).digest('hex');
    expect(sha(norm(out))).toBe(sha(norm(readFileSync(FIXTURE, 'utf8'))));
  }, 120000);
});
