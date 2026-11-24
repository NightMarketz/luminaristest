import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * L-20261113-152226-5774: /documents estourava 95 px na horizontal a 375 px (abas com space-x-8 e chips de status em
 * linha única). jsdom não mede layout; a guarda trava o que causava: abas e chips precisam quebrar linha.
 */
const src = fs.readFileSync(path.resolve(__dirname, '../pages/documents/index.tsx'), 'utf8');

describe('documents/index — layout a 375 px', () => {
  it('as abas quebram linha em vez de empurrar a página', () => {
    const nav = src.match(/<nav[^>]*className="([^"]*)"/)?.[1] ?? '';
    expect(nav).toMatch(/\bflex-wrap\b/);
    expect(nav).not.toMatch(/space-x-8/);
  });

  it('os chips de status quebram linha', () => {
    const idx = src.indexOf('Status:</span>');
    const opening = src.slice(src.lastIndexOf('<div', idx), idx);
    expect(opening).toMatch(/\bflex-wrap\b/);
  });
});
