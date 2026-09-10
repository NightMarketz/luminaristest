/**
 * Guarda do gate `tsc -p tsconfig.test.json` (achado de 2026-09-10, auditoria de guardas
 * lista-vs-descoberta).
 *
 * O defeito: `tsconfig.test.json` estende `tsconfig.json` e o `extends` do TypeScript NÃO mescla
 * campos — ele COPIA os que o filho não redeclara. Como o filho declarava só `include`, o `exclude`
 * do pai (`__tests__`, `*.test.ts`, `*.spec.ts`) era herdado e filtrava de volta tudo o que o
 * `include` tinha acabado de trazer. Resultado: o passo da CI que existe para type-checkar os
 * TESTES rodava sobre zero arquivo de teste — verde vacuoso, exatamente a classe que o gate
 * pretendia evitar. Par vermelho→verde medido no PR: um erro deliberado num `.test.ts` é pego com
 * o `exclude` próprio declarado, e passa com 0 erros sem ele.
 *
 * A guarda usa o PARSER DO PRÓPRIO TYPESCRIPT (`parseJsonConfigFileContent`), que resolve `extends`
 * e devolve a lista final de arquivos — então ela afirma sobre o conjunto REAL que o compilador
 * receberia, não sobre o texto do arquivo de config.
 */
import { join } from 'path';
import * as ts from 'typescript';

const SERVER_ROOT = join(__dirname, '..', '..');

/** Resolve um tsconfig como o `tsc -p` faria (com `extends` aplicado) e devolve os arquivos. */
function arquivosResolvidos(nomeConfig: string): string[] {
  const caminho = join(SERVER_ROOT, nomeConfig);
  const lido = ts.readConfigFile(caminho, ts.sys.readFile);
  expect(lido.error).toBeUndefined();
  const parsed = ts.parseJsonConfigFileContent(lido.config, ts.sys, SERVER_ROOT);
  expect(parsed.errors.filter((e) => e.category === ts.DiagnosticCategory.Error)).toEqual([]);
  return parsed.fileNames;
}

const ehArquivoDeTeste = (caminho: string): boolean =>
  /__tests__|\.test\.tsx?$|\.spec\.tsx?$/.test(caminho);

describe('tsconfig.test.json — o gate de tipos dos testes precisa VER os testes', () => {
  it('resolve uma quantidade substancial de arquivos de teste (hoje >200)', () => {
    const testes = arquivosResolvidos('tsconfig.test.json').filter(ehArquivoDeTeste);
    // Piso, não número exato: a suíte cresce. O que a guarda barra é a volta do ZERO.
    expect(testes.length).toBeGreaterThan(200);
  });

  it('inclui, nominalmente, um teste de cada subárvore que já foi invisível ao gate', () => {
    const resolvidos = new Set(
      arquivosResolvidos('tsconfig.test.json').map((caminho) => caminho.replace(/\\/g, '/')),
    );
    // Arquivos de LONGA data em subárvores diferentes, de propósito: a guarda não pode depender de
    // teste introduzido junto com ela (nem de nenhuma frente em revisão), senão fica verde ou
    // vermelha por motivo alheio ao que ela guarda.
    const deveEstar = [
      'src/features/accounting/audit/__tests__/auditCanonical.test.ts',
      'src/features/accounting/services/__tests__/AuditService.test.ts',
      'src/__tests__/openapi-paths.test.ts',
    ];
    const ausentes = deveEstar.filter(
      (alvo) => ![...resolvidos].some((caminho) => caminho.endsWith(alvo)),
    );
    expect(ausentes).toEqual([]);
  });

  it('o config de PRODUÇÃO segue sem os testes — é a premissa que torna a herança perigosa', () => {
    // Se um dia o tsconfig.json de produção parar de excluir teste, esta guarda perde o motivo de
    // existir (e o `dist/` passaria a carregar teste). Melhor descobrir por vermelho.
    const resolvidos = arquivosResolvidos('tsconfig.json');
    // Sem este piso, o caso ficaria verde se o parser devolvesse lista VAZIA por qualquer motivo —
    // verde pelo motivo errado, que é exatamente a classe que esta suíte inteira guarda.
    expect(resolvidos.length).toBeGreaterThan(0);
    expect(resolvidos.filter(ehArquivoDeTeste)).toEqual([]);
  });
});
