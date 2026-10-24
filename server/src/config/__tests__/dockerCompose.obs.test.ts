import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Nó OBS, Fase B — o que o compose de produção precisa para os itens 11/13 e 15 (PRE-ADR-OBSERVABILIDADE §5).
 *
 * - Item 15: `ALERT_WEBHOOK_URL` obrigatória (`:?`). Sem ela `lib/alertWebhook.ts` é no-op e falha de job some.
 * - Itens 11/13: o registro de acesso do Marco Civil precisa durar 6 meses (Lei 12.965/2014, art. 15). Sem
 *   `LOG_ACCESS_DIR`, `lib/accessLog.ts` grava em `/app/logs/access` (resolvido de `__dirname`), dentro da camada
 *   gravável do container — todo `docker compose up --build` apagava a guarda. Achado da revisão de 2026-10-24.
 *
 * LIMITE DECLARADO (molde de dockerCompose.qdrant.test.ts): lê o TEXTO do compose, não sobe a stack.
 */
const COMPOSE = readFileSync(join(__dirname, '../../../../docker-compose.yml'), 'utf8');

/** Corpo do serviço: do `  nome:` até a primeira linha não vazia com indentação <= 2. */
function serviceBlock(name: string): string {
  const lines = COMPOSE.split(/\r?\n/);
  const start = lines.findIndex((l) => l === `  ${name}:`);
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.trim() !== '' && l.search(/\S/) <= 2);
  return rest.slice(0, end === -1 ? rest.length : end).join('\n');
}

function semComentarios(bloco: string): string {
  return bloco.split(/\r?\n/).filter((l) => !/^\s*#/.test(l)).join('\n');
}

/** Bloco `volumes:` de raiz (indentação 0) — onde um volume nomeado precisa ser declarado. */
function rootVolumes(): string {
  const lines = COMPOSE.split(/\r?\n/);
  const start = lines.findIndex((l) => l === 'volumes:');
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.trim() !== '' && l.search(/\S/) === 0);
  return rest.slice(0, end === -1 ? rest.length : end).join('\n');
}

const server = semComentarios(serviceBlock('server'));

describe('docker-compose.yml · nó OBS, Fase B', () => {
  it('controle: o serviço server é recortado', () => {
    expect(server).toContain('dockerfile: Dockerfile');
  });

  it('item 15: ALERT_WEBHOOK_URL é obrigatória (`:?`), não só repassada', () => {
    expect(server).toMatch(/^\s+ALERT_WEBHOOK_URL: \$\{ALERT_WEBHOOK_URL:\?[^}]+\}\s*$/m);
  });

  it('itens 11/13: LOG_ACCESS_DIR aponta para um caminho montado em volume nomeado e declarado', () => {
    const dir = /^\s+LOG_ACCESS_DIR: (\S+)\s*$/m.exec(server)?.[1];
    expect(dir).toBeDefined();

    const mount = new RegExp(`^\\s+- (\\w+):${dir!.replace(/[/.]/g, '\\$&')}\\s*$`, 'm').exec(server);
    expect(mount).not.toBeNull();
    expect(semComentarios(rootVolumes())).toMatch(new RegExp(`^\\s+${mount![1]}:\\s*$`, 'm'));
  });
});
