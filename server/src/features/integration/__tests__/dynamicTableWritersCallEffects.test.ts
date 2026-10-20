/**
 * BE-INCR-DT-NO-CONSUMER-CALLS, T2 (varredura): o motor não chama mais o cache de KPI nem o grafo, então
 * TODO arquivo de produção que escreve pelo motor tem de chamar o efeito pós-commit. O gate de dependência
 * (B7) vê import, não chamada — esta varredura pega o escritor novo que esqueceu o efeito.
 *
 * Granularidade é o arquivo (não a chamada): o CRM agrupa várias escritas numa tx e chama o efeito uma vez,
 * depois do commit. A ordem pós-commit é provada nos testes de cada serviço (ex.: CrmPipelineService.test).
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../../..');

const WRITE_CALL = /\.(createTableData|updateTableData|deleteTableData|deleteTableDataBatch|installPresetAsSystem|createTableAsSystem|updateTableAsSystem|updateTableSchemaAsSystem|deleteTableAsSystem|installTableFromPreset|syncInstalledTableFromPreset|installModule|restoreRowVersion)\(/;
const EFFECT_CALL = /\.(afterDataWrite|afterStructureWrite)\(/;

/** Escritores que não precisam do efeito, com o porquê. */
const EXEMPT: Record<string, string> = {
  // CLI de manutenção: outro processo — o cache de KPI é em memória do servidor e não é compartilhado.
  'jobs/rekeyLegacyUnitCli.ts': 'processo separado',
  // Interface de porta (só assinatura, nenhuma chamada real).
  'features/accounting/ports/OriginPorts.ts': 'interface',
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'generated' || entry.name === 'node_modules') continue;
      walk(full, out);
    } else if (/\.ts$/.test(entry.name) && !/\.(test|spec)\.ts$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

const rel = (f: string) => path.relative(SRC, f).split(path.sep).join('/');
const files = walk(SRC);

describe('escritores do motor DynamicTable chamam o efeito pós-commit', () => {
  it('a varredura enxerga os escritores conhecidos (sonda de vida)', () => {
    const writers = files.filter((f) => WRITE_CALL.test(fs.readFileSync(f, 'utf8'))).map(rel);
    expect(writers).toEqual(expect.arrayContaining([
      'controllers/dynamicTablesController.ts',
      'features/crm/services/CrmPipelineService.ts',
      'features/sales/services/RegisterPaymentService.ts',
    ]));
  });

  it('todo escritor fora do motor chama afterDataWrite/afterStructureWrite (ou está isento com motivo)', () => {
    const missing = files
      .filter((f) => !rel(f).startsWith('features/dynamicTables/'))
      .filter((f) => !(rel(f) in EXEMPT))
      .filter((f) => {
        const src = fs.readFileSync(f, 'utf8');
        return WRITE_CALL.test(src) && !EFFECT_CALL.test(src);
      })
      .map(rel);
    expect(missing).toEqual([]);
  });

  it('o motor não nomeia o cache de KPI nem o grafo (Contrato §2.1: o motor nunca chama o consumidor)', () => {
    const offenders = files
      .filter((f) => rel(f).startsWith('features/dynamicTables/'))
      .filter((f) => /kpiCacheService|KpiCacheService|KnowledgeGraphService|syncGraph\(/.test(fs.readFileSync(f, 'utf8')))
      .map(rel);
    expect(offenders).toEqual([]);
  });
});
