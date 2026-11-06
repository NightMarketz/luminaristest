/**
 * FIX-AUTH-CONTA §3.4 #10 e #11 — testes-guarda (sessao-instrumentacao). Decisão do dono, questionário de 06/11
 * (`docs/plano/decisoes/D-2026-11-06-PARADOS-NO-DONO.md` §2):
 *
 * - #10 "Allowlist": todo model com `deletedAt` tem uma classe em `PURGE_CLASS` — `operacional` (a purga apaga em 90
 *   dias) ou `contabil-fiscal` (a purga nunca apaga; guarda até a prescrição, CTN art. 195 p.ú.). Model novo com
 *   `deletedAt` e sem classe reprova aqui. A fonte é o `schema.prisma`, não uma lista copiada.
 * - #11 "Arquivo vai na purga": o `CrmAttachment` é operacional, e a purga apaga a linha E o binário em disco.
 *
 * O prisma é um Proxy que registra toda chamada: o teste não depende de quais delegates a purga usa.
 */
import fs from 'fs';
import path from 'path';

type Call = { model: string; op: string; args: unknown };
const calls: Call[] = [];
let findManyRows: Record<string, unknown[]> = {};

jest.mock('../../lib/prisma', () => {
  const delegate = (model: string) =>
    new Proxy(
      {},
      {
        get: (_t, op: string) => async (args: unknown) => {
          calls.push({ model, op, args });
          if (op === 'findMany') return findManyRows[model] ?? [];
          return { count: 0 };
        },
      },
    );
  return { __esModule: true, default: new Proxy({}, { get: (_t, model: string) => delegate(model) }) };
});

const deleteFile = jest.fn().mockResolvedValue(undefined);
jest.mock('../../lib/attachmentStorage', () => ({ deleteFile: (...a: unknown[]) => deleteFile(...a) }));

import * as job from '../PurgeDeletedRecords';

const SCHEMA = path.resolve(__dirname, '../../../prisma/schema.prisma');
const DIA = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-11-06T12:00:00.000Z').getTime();

/** Models do schema com um campo `deletedAt` (lido do arquivo, sem lista à mão). */
function modelsComDeletedAt(): string[] {
  const src = fs.readFileSync(SCHEMA, 'utf8');
  const out: string[] = [];
  for (const m of src.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    if (/^\s*deletedAt\s+DateTime/m.test(m[2])) out.push(m[1]);
  }
  return out.sort();
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function classes(): Record<string, string> {
  return ((job as Record<string, unknown>).PURGE_CLASS ?? {}) as Record<string, string>;
}

beforeEach(() => {
  calls.length = 0;
  findManyRows = {};
  deleteFile.mockClear();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});
afterEach(() => jest.restoreAllMocks());

describe('§3.4 #10 — allowlist da purga cobre todo model com deletedAt', () => {
  it('o schema tem models com deletedAt (sanidade do parser)', () => {
    expect(modelsComDeletedAt().length).toBeGreaterThan(40);
  });

  it('todo model com deletedAt tem classe operacional ou contabil-fiscal', () => {
    const c = classes();
    const semClasse = modelsComDeletedAt().filter((m) => c[m] !== 'operacional' && c[m] !== 'contabil-fiscal');
    expect(semClasse).toEqual([]);
  });

  it('a allowlist não declara model que não existe (ou que perdeu o deletedAt)', () => {
    const existentes = new Set(modelsComDeletedAt());
    expect(Object.keys(classes()).filter((m) => !existentes.has(m))).toEqual([]);
  });

  it('a purga nunca escreve em model contabil-fiscal e apaga todo model operacional', async () => {
    await job.purgeOldDeletedRecords();
    const c = classes();
    const escritos = new Set(calls.filter((x) => x.op.startsWith('delete')).map((x) => x.model));
    const fiscaisTocados = Object.keys(c).filter((m) => c[m] === 'contabil-fiscal' && escritos.has(lowerFirst(m)));
    const operacionaisIntactos = Object.keys(c).filter((m) => c[m] === 'operacional' && !escritos.has(lowerFirst(m)));
    expect(fiscaisTocados).toEqual([]);
    expect(operacionaisIntactos).toEqual([]);
  });
});

describe('§3.4 #11 — o binário do anexo do CRM vai na purga, junto com a linha', () => {
  it('CrmAttachment é operacional', () => {
    expect(classes().CrmAttachment).toBe('operacional');
  });

  it('anexo apagado há mais de 90 dias: apaga o arquivo e a linha', async () => {
    findManyRows.crmAttachment = [{ id: 'att-old', storageKey: 'u1/lead/l1/abcd1234_doc.pdf' }];

    await job.purgeOldDeletedRecords();

    expect(deleteFile).toHaveBeenCalledWith('u1/lead/l1/abcd1234_doc.pdf');
    const find = calls.find((x) => x.model === 'crmAttachment' && x.op === 'findMany');
    expect(JSON.stringify(find?.args)).toContain(new Date(NOW - 90 * DIA).toISOString());
    const rowDelete = calls.filter((x) => x.model === 'crmAttachment' && x.op.startsWith('delete'));
    expect(JSON.stringify(rowDelete.map((x) => x.args))).toContain('att-old');
  });
});
