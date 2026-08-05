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

/**
 * Recorta UM serviço do compose. Sem isto, um regex com `[\s\S]*?` atravessa a fronteira
 * entre serviços e casa o que estiver no serviço seguinte — foi assim que a checagem de
 * build-arg passou a aceitar `args:` de um serviço e a chave de outro.
 *
 * Corte por INDENTAÇÃO, e não pela próxima chave de 2 espaços: parar só em `/^ {2}\S/` deixa
 * o bloco correr para fora do mapeamento `services:` quando o serviço é o último do arquivo.
 * `frontend` não é o último hoje, então aqui isto é preventivo — mas o defeito foi medido na
 * barreira irmã (dockerCompose.qdrant.test.ts) e é a MESMA linha, então é varredura de
 * classe, não conserto pontual.
 */
function frontendBlock(): string {
  const lines = composeDeclarations.split(/\r?\n/);
  const start = lines.findIndex((l) => l === '  frontend:');
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.trim() !== '' && l.search(/\S/) <= 2);
  return rest.slice(0, end === -1 ? rest.length : end).join('\n');
}

/**
 * O bloco `build.args` do frontend, e SÓ ele.
 *
 * Recortar o serviço não bastava: o casamento `args:[\s\S]*?<CHAVE>:` continuava
 * atravessando de `build.args` para `environment:` DENTRO do mesmo serviço, que é
 * precisamente o meio-conserto — chave declarada, e declarada em runtime. Medido: com a
 * chave movida para `environment:` do próprio frontend, a versão recortada-por-serviço
 * passava 4/4. O recorte tem de ser o bloco de argumentos.
 */
function frontendBuildArgs(): string {
  const lines = frontendBlock().split(/\r?\n/);
  const start = lines.findIndex((l) => /^\s*args:\s*$/.test(l));
  if (start === -1) return '';
  const indent = lines[start].search(/\S/);
  const out: string[] = [];
  for (const l of lines.slice(start + 1)) {
    if (l.trim() === '') continue;
    if (l.search(/\S/) <= indent) break;
    out.push(l);
  }
  return out.join('\n');
}

/**
 * O valor que o build recebe quando não há `.env` ao lado do compose — literal, ou o default
 * de `${VAR:-default}`, ou string vazia para `${VAR}` puro.
 *
 * É esse valor que `next build` inlina no bundle. `undefined`/vazio vira a string "undefined"
 * concatenada na URL, que é falha silenciosa em runtime, não erro de build.
 */
function valorEfetivo(chave: string): string | null {
  const linha = frontendBuildArgs().split(/\r?\n/).find((l) => new RegExp(`^\\s*${chave}:`).test(l));
  if (!linha) return null;
  const bruto = linha.slice(linha.indexOf(':') + 1).trim();
  const interp = bruto.match(/^\$\{[A-Z0-9_]+(?::-(.*))?\}$/);
  return interp ? (interp[1] ?? '') : bruto;
}

/** Nomes de serviço do compose — hosts que existem SÓ na rede interna do docker. */
function nomesDeServico(): string[] {
  const lines = composeDeclarations.split(/\r?\n/);
  const i = lines.findIndex((l) => /^services:\s*$/.test(l));
  if (i === -1) return [];
  return lines.slice(i + 1)
    .filter((l) => /^ {2}\S/.test(l))
    .map((l) => l.trim().replace(/:$/, ''));
}

/** O default que o próprio código declara — a origem canônica do valor. */
function defaultDoNextConfig(chave: string): string | null {
  const m = NEXT_CONFIG.match(new RegExp(`${chave}\\s*:\\s*process\\.env\\.${chave}\\s*\\|\\|\\s*['"\`]([^'"\`]+)['"\`]`));
  return m ? m[1] : null;
}

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

  // Controle do recorte: se o bloco do frontend deixar de ser encontrado, os casos abaixo
  // passariam por vacuidade — o mesmo modo silencioso de morte do controle acima.
  it('o serviço do frontend e o bloco build.args dele são recortados', () => {
    expect(frontendBlock()).toMatch(/build:/);
    expect(frontendBuildArgs()).not.toEqual('');
  });

  it('as chaves NEXT_PUBLIC_* chegam por build arg, não por environment de runtime', () => {
    // RECORTE POR SERVIÇO, e não sobre o documento inteiro. A versão anterior casava
    // `args:[\s\S]*?<CHAVE>:` sobre o compose todo, então um `build.args:` em QUALQUER
    // serviço acima fazia o `[\s\S]*?` atravessar a fronteira e casar com a chave dentro do
    // `environment:` do frontend — exatamente o meio-conserto que o bloco de comentário
    // deste arquivo nomeia como vitória declarada, passando verde. Medido por revisão
    // independente: `build.args` no `server` + chave no `environment:` do frontend → 3/3.
    const args = frontendBuildArgs();
    for (const k of composeKeys) {
      // Declarada DENTRO do bloco build.args do serviço que a consome — não em algum
      // `args:` do documento, e não num `environment:` do próprio serviço.
      expect(args).toMatch(new RegExp(`^\\s*${k}:`, 'm'));
      // …e recebida pelo Dockerfile ANTES do build, senão o valor não entra no bundle.
      expect(DOCKERFILE).toMatch(new RegExp(`ARG ${k}\\b`));
      const argAt = DOCKERFILE.indexOf(`ARG ${k}`);
      const buildAt = DOCKERFILE.indexOf('npm run build');
      expect(argAt).toBeGreaterThan(-1);
      expect(argAt).toBeLessThan(buildAt);
    }
  });

  // NOME E POSIÇÃO NÃO ERAM O ACHADO INTEIRO. Os casos acima conferem que a chave se chama
  // certo e chega em build-time, e nenhum deles olha o VALOR — então voltar a
  // `http://server:3001`, que é o valor exato que o §3c mediu como errado DUAS vezes,
  // deixava a barreira 4/4 verde. Medido por revisão independente.
  //
  // Os dois casos abaixo cobrem os dois erros que aquele valor tinha, e nenhum deles carrega
  // URL escrita à mão: o esperado é derivado do repositório, senão a barreira vira mais um
  // lugar para o valor errado morar.
  it('o valor do build arg é o mesmo default que next.config.js declara', () => {
    for (const k of composeKeys) {
      const canonico = defaultDoNextConfig(k);
      expect(canonico).not.toBeNull(); // o código tem de declarar o seu próprio default
      const efetivo = valorEfetivo(k);
      // Vazio é o caso perigoso: `next build` inlina a ausência e a URL vira "undefined/…".
      expect(efetivo).not.toEqual('');
      expect(efetivo).toEqual(canonico);
    }
  });

  it('o host do valor não é um nome de serviço do compose — quem executa o bundle é o navegador', () => {
    const servicos = nomesDeServico();
    expect(servicos).toContain('frontend'); // controle: sem isto o caso passaria por lista vazia
    for (const k of composeKeys) {
      const efetivo = valorEfetivo(k) ?? '';
      const host = (efetivo.match(/^[a-z]+:\/\/([^/:]+)/i) ?? [])[1];
      expect(host).toBeTruthy();
      // `http://server:3001` era alcançável pela rede do compose e por mais ninguém. O bundle
      // roda no navegador do usuário, fora dessa rede.
      expect(servicos).not.toContain(host);
    }
  });
});
