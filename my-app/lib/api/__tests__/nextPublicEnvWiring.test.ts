import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

/**
 * Barreira do achado `compose-injeta-next-public-api-url-nome-divergente`
 * (docs/audit/TRIAGEM-R1-R3.json item 3 · AV-R1 F1 · bloqueia_primeiro_cliente).
 *
 * O falsificador que provou o achado punha os dois nomes lado a lado:
 *   grep -n NEXT_PUBLIC docker-compose.yml my-app/next.config.js
 * → `NEXT_PUBLIC_API_URL` no compose contra `NEXT_PUBLIC_API_BASE_URL` no código. Isto é o
 * mesmo falsificador virado checagem permanente (AV-00 §5).
 *
 * SÃO DUAS CAMADAS, e a segunda é a que faz o conserto do nome sozinho ser vitória
 * declarada: NEXT_PUBLIC_* é inlinado no bundle em tempo de BUILD (next.config.js lê
 * process.env durante `next build`, que roda no estágio builder do Dockerfile), enquanto
 * a chave `environment:` do compose é RUNTIME. Nome certo no lugar errado continua sem
 * efeito. Por isso os dois casos abaixo, e não um.
 *
 * LIMITE DECLARADO: isto lê TEXTO do compose e do Dockerfile. Não constrói a imagem e não
 * prova que o valor chega ao bundle — `next build` de produção segue não rodado neste
 * repositório. O que ele impede é a regressão silenciosa da FIAÇÃO, que é como o achado
 * nasceu.
 */
const ROOT = join(__dirname, '../../..', '..');
const COMPOSE = readFileSync(join(ROOT, 'docker-compose.yml'), 'utf8');
const DOCKERFILE = readFileSync(join(ROOT, 'my-app/Dockerfile'), 'utf8');
const NEXT_CONFIG = readFileSync(join(ROOT, 'my-app/next.config.js'), 'utf8');

/**
 * Todo nome NEXT_PUBLIC_* DECLARADO no arquivo de implantação. Comentários são removidos
 * antes: o bloco de comentário deste próprio conserto cita o nome errado para explicá-lo,
 * e sem esta linha a barreira reprovaria a explicação em vez da declaração.
 */
const composeDeclarations = COMPOSE.split(/\r?\n/).filter((l) => !/^\s*#/.test(l)).join('\n');
const composeKeys = [...new Set(composeDeclarations.match(/NEXT_PUBLIC_[A-Z0-9_]+/g) ?? [])];

describe('fiação NEXT_PUBLIC_* entre docker-compose.yml e o bundle', () => {
  // Controle: sem isto, um regex que parasse de casar faria os dois casos abaixo passarem
  // por lista vazia — o modo silencioso de a barreira morrer.
  it('o compose cita ao menos uma chave NEXT_PUBLIC_*', () => {
    expect(composeKeys.length).toBeGreaterThan(0);
  });

  it('toda chave NEXT_PUBLIC_* do compose é lida por next.config.js', () => {
    const desconhecidas = composeKeys.filter((k) => !NEXT_CONFIG.includes(k));
    expect(desconhecidas).toEqual([]);
  });

  it('as chaves NEXT_PUBLIC_* chegam por build arg, não por environment de runtime', () => {
    for (const k of composeKeys) {
      // Declarada como argumento de build no compose…
      expect(composeDeclarations).toMatch(new RegExp(`args:[\\s\\S]*?${k}:`));
      // …e recebida pelo Dockerfile ANTES do build, senão o valor não entra no bundle.
      expect(DOCKERFILE).toMatch(new RegExp(`ARG ${k}\\b`));
      const argAt = DOCKERFILE.indexOf(`ARG ${k}`);
      const buildAt = DOCKERFILE.indexOf('npm run build');
      expect(argAt).toBeGreaterThan(-1);
      expect(argAt).toBeLessThan(buildAt);
    }
  });
});
