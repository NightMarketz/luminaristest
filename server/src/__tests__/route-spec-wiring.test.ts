/**
 * Wiring guard: TABELA DE ROTAS DO EXPRESS × OpenAPI spec.
 *
 * Fecha a classe que `openapi-paths.test.ts` **não consegue** ver. Aquele arquivo é um **piso**
 * (`pathCount >= BASELINE`) sobre paths **já documentados** — uma rota registrada que nunca teve
 * bloco `@openapi` nunca entrou na contagem, então nunca faz a contagem cair. Os outros dois guards
 * de lá (junk keys, `$ref` pendurado) só inspecionam o que a spec **já contém**. Resultado medido:
 * `POST /api/analytics/custom-kpis` nasceu em `54b1839` sem doc e passou ~2 meses invisível para
 * todo gate, até a **segunda** auditoria reencontrá-lo. Registrado em
 * `docs/adr/ADR-ANALYTICS-DEFS-write-unblock.md` F-AD6.6 item 4 — este arquivo é esse item.
 *
 * A direção que importa é *rota → spec*: o código é a verdade, a doc é o que atrasa.
 */
/* eslint-disable @typescript-eslint/no-var-requires */
const swaggerJSDoc = require('swagger-jsdoc');
const { options } = require('../../scripts/generate-openapi');
/* eslint-enable @typescript-eslint/no-var-requires */
import { createApp } from '@/app';

/**
 * Lacunas conhecidas — **baseline que só encolhe**. Não é perdão permanente: é a dívida existente,
 * tornada visível para que a próxima rota sem doc falhe em vez de se esconder no meio dela.
 * Documentou uma? **Remova a linha** — o terceiro teste falha se uma entrada daqui deixar de ser
 * lacuna, então a lista não apodrece.
 */
const KNOWN_UNDOCUMENTED = [
  // Infra do próprio /api — não são endpoints de domínio.
  'GET /api',
  'GET /api/docs/openapi.json',
  // Dívida de doc real, por incremento. Documentar quando o incremento for tocado.
  'GET /api/counterparties',
  'POST /api/counterparties',
  'GET /api/counterparties/{id}',
  'POST /api/counterparties/{id}/archive',
  'GET /api/package-balances',
  'PATCH /api/accounting/accounts/{id}/requires-dimension',
  'POST /api/dashboard/ai/ChatInterview',
];

/**
 * Piso de sanidade do próprio walker. Sem isto, um Express que mude a forma do `_router.stack`
 * (ou um `decodeMount` que pare de casar) devolveria lista vazia e os dois primeiros testes
 * passariam **vacuamente** — verdes por não terem olhado nada. É a checagem que falha se o
 * mecanismo do gate quebrar, e não o app.
 */
const MIN_ROUTES = 160;

type Route = { method: string; path: string };

/**
 * Express 4 não guarda a string de montagem — só o regexp derivado dela. Para `app.use('/api/x', r)`
 * o `regexp.source` é `^\/api\/x\/?(?=\/|$)`; desmontamos de volta. `fast_slash` marca a montagem
 * em `/` (prefixo vazio). Um regexp que não casar vira marcador `«UNPARSED»`, que o teste de
 * sanidade transforma em falha — nunca em silêncio.
 */
function decodeMount(re: { source: string; fast_slash?: boolean } | undefined): string {
  if (!re || re.fast_slash) return '';
  const m = /^\^\\\/(.*?)\\\/\?\(\?=\\\/\|\$\)/.exec(re.source);
  if (!m) return `«UNPARSED:${re.source}»`;
  return '/' + m[1].replace(/\\\//g, '/');
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function collectRoutes(stack: any[], prefix: string, out: Route[]): void {
  for (const layer of stack) {
    if (layer.route) {
      const path = prefix + layer.route.path;
      for (const method of Object.keys(layer.route.methods)) {
        if (layer.route.methods[method]) out.push({ method: method.toUpperCase(), path });
      }
    } else if (layer.name === 'router' && layer.handle?.stack) {
      collectRoutes(layer.handle.stack, prefix + decodeMount(layer.regexp), out);
    }
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Express `/x/:id` → OpenAPI `/x/{id}`; barra final some (`app.use('/api/users')` + `.get('/')`). */
function toSpecPath(expressPath: string): string {
  return expressPath.replace(/:([A-Za-z0-9_]+)/g, '{$1}').replace(/\/+$/, '') || '/';
}

function apiRoutes(): Route[] {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const app = createApp() as any;
  const all: Route[] = [];
  collectRoutes(app._router.stack, '', all);
  return all.filter((r) => r.path.startsWith('/api'));
}

/** `"POST /api/x/{id}"` — a chave usada tanto na allowlist quanto nas mensagens de falha. */
const keyOf = (r: Route) => `${r.method} ${toSpecPath(r.path)}`;

describe('wiring — tabela de rotas × OpenAPI', () => {
  const routes = apiRoutes();
  const spec = swaggerJSDoc(options) as { paths?: Record<string, Record<string, unknown>> };
  const specPaths = spec.paths || {};

  it('o walker enxerga a tabela de rotas (guarda contra passar vacuamente)', () => {
    expect(routes.filter((r) => r.path.includes('«UNPARSED')).map((r) => r.path)).toEqual([]);
    expect(routes.length).toBeGreaterThanOrEqual(MIN_ROUTES);
  });

  it('nenhuma rota registrada fica fora da spec', () => {
    const allowed = new Set(KNOWN_UNDOCUMENTED);
    const undocumented = routes
      .filter((r) => !specPaths[toSpecPath(r.path)]?.[r.method.toLowerCase()])
      .map(keyOf)
      .filter((k) => !allowed.has(k));

    expect([...new Set(undocumented)].sort()).toEqual([]);
  });

  it('nenhum path da spec aponta para rota que não existe (doc morta)', () => {
    const registered = new Set(routes.map((r) => toSpecPath(r.path)));
    const stale = Object.keys(specPaths).filter((p) => !registered.has(p));

    expect(stale.sort()).toEqual([]);
  });

  it('a allowlist não apodrece — toda entrada dela ainda é uma lacuna real', () => {
    const stillMissing = new Set(
      routes.filter((r) => !specPaths[toSpecPath(r.path)]?.[r.method.toLowerCase()]).map(keyOf)
    );
    const obsolete = KNOWN_UNDOCUMENTED.filter((k) => !stillMissing.has(k));

    // Falhou aqui? A rota foi documentada (ou removida): apague a linha de KNOWN_UNDOCUMENTED.
    expect(obsolete).toEqual([]);
  });
});
