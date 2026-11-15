import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * L-20261113-152225-8615: tabelas da contabilidade ficavam em wrapper `overflow-hidden` sem rolagem horizontal; em 375 px
 * as colunas da direita (valores, Ações) ficavam cortadas e inalcançáveis. Guarda estática: nenhum arquivo de componente
 * pode ter `<table` dentro de wrapper `overflow-hidden rounded-2xl` — o wrapper de tabela é `overflow-x-auto`.
 */
const dir = path.resolve(__dirname, '..');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.tsx'));

describe('tabelas da contabilidade rolam na horizontal', () => {
  it('nenhum wrapper de tabela usa overflow-hidden', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const lines = fs.readFileSync(path.join(dir, f), 'utf8').split('\n');
      lines.forEach((l, i) => {
        if (!/className="overflow-hidden rounded-2xl border/.test(l)) return;
        if (lines.slice(i, i + 60).some((x) => x.includes('<table'))) offenders.push(`${f}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it('todo arquivo com <table> tem um wrapper overflow-x-auto', () => {
    const missing = files.filter((f) => {
      const s = fs.readFileSync(path.join(dir, f), 'utf8');
      return s.includes('<table') && !s.includes('overflow-x-auto');
    });
    expect(missing).toEqual([]);
  });
});
