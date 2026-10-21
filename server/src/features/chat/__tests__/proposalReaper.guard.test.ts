/**
 * Guarda FIX-CHAT-AGENTE §3.3 #7 (ACHADOS-2026-10-19): propostas de ação nunca expiram porque
 * `deleteOldProposals` não tem chamador em produção — o comentário de `LuminarisAgentService` promete que
 * "stale proposals are reaped by deleteOldProposals". Varre a fonte (fora de testes, do repositório e da
 * interface que o declaram) e exige ao menos um chamador.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '../../..');
const DECLARERS = new Set(['ActionProposalRepository.ts', 'IActionProposalRepository.ts']);

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== '__tests__' && e.name !== 'node_modules') walk(p, out);
    } else if (/\.ts$/.test(e.name) && !/\.(test|spec)\.ts$/.test(e.name) && !DECLARERS.has(e.name)) {
      out.push(p);
    }
  }
  return out;
}

describe('ActionProposal — reaper de propostas velhas (FIX-CHAT-AGENTE #7)', () => {
  it('deleteOldProposals tem ao menos um chamador em código de produção', () => {
    const callers = walk(SRC)
      .filter((f) => /\.deleteOldProposals\s*\(/.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(SRC, f));
    expect(callers).not.toEqual([]);
  });
});
