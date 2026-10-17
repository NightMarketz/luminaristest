/**
 * Verificação legal de 17/10 (dossiê pesquisas-legais/verif-2026-10-17-lgpd-cdc-obrigacoes §1, 4º ponto; §4.4) — o
 * `PurgeDeletedRecords` apaga de vez a linha de DynamicTable soft-deletada há 90 dias. CTN art. 195 p.ú. [D16] manda
 * guardar os comprovantes dos lançamentos "até que ocorra a prescrição"; a LGPD art. 16 I [D01] permite a guarda.
 *
 * Pergunta do dossiê: uma VENDA já lançada no razão pode ser soft-deletada (e então expurgada)? Resposta lida no código:
 * não. O razão só lança venda `Finalized` (os bridges abaixo); dela a venda só sai, por transição de sistema, para
 * `Cancelled`/`Returned`; e os três estados estão numa regra `immutableAfter` `scope: 'all'`, que o delete individual,
 * o lote e o CASCADE recusam (GAP-MAP 8, `DynamicTableService.immutableAfter.test.ts`). Sem soft-delete, o purge não
 * a alcança (`where: { deletedAt: { lt } }`).
 *
 * Este guarda prende as duas pontas ao CÓDIGO REAL (sem mock): se um bridge passar a lançar outro estado, ou o preset
 * perder um desses estados da regra de imutabilidade total, a venda lançada volta a poder sumir antes da prescrição.
 */
import fs from 'fs';
import path from 'path';
import { salesModule } from '../../features/dynamicTables/presets/modules/finance/SalesModule';

const BRIDGES = path.resolve(__dirname, '../../features/accounting/sync/bridges');
const LANCADA_DEPOIS = ['Cancelled', 'Returned']; // SaleReversalBridge: a venda lançada que sai de Finalized

function estadosImutaveisParaDelete(): string[] {
  const regras = (salesModule.schema.immutableAfter ?? []) as { condition: { field: string; op: string; value: unknown }; scope: unknown }[];
  return regras
    .filter((r) => r.scope === 'all' && r.condition.field === 'status')
    .flatMap((r) => (r.condition.op === 'eq' ? [String(r.condition.value)] : (r.condition.value as string[])));
}

describe('purge de 90 dias × venda lançada no razão (CTN 195 p.ú.)', () => {
  it('todo estado em que o bridge lança a venda está na regra immutableAfter scope:all do preset', () => {
    const gates = fs
      .readdirSync(BRIDGES)
      .filter((f) => f.startsWith('Sale') && f.endsWith('.ts'))
      .flatMap((f) => [...fs.readFileSync(path.join(BRIDGES, f), 'utf8').matchAll(/data\.status !== '(\w+)'/g)].map((m) => m[1]));
    expect(gates.length).toBeGreaterThan(0);
    const imutaveis = estadosImutaveisParaDelete();
    expect([...new Set([...gates, ...LANCADA_DEPOIS])].filter((s) => !imutaveis.includes(s))).toEqual([]);
  });
});
