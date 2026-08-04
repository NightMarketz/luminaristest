import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Barreira do achado `qdrant-publicado-sem-chave-embora-codigo-suporte`
 * (docs/audit/TRIAGEM-R1-R3.json item 2 · AV-R1 F2 · bloqueia_deploy).
 *
 * O falsificador que provou o achado era estático e de uma linha:
 *   grep -A6 'qdrant:' docker-compose.yml | grep -qi 'api_key\|environment'
 * caía no ramo SEM CHAVE. Isto é o mesmo falsificador virado checagem permanente — a
 * diferença entre consertar e consertar com barreira (AV-00 §5).
 *
 * Por que o arquivo de implantação é medido daqui: `grep -rln docker-compose` em todo
 * .ts/.mjs/.js/.yml fora de node_modules devolvia VAZIO. Nenhum teste, script ou passo de
 * CI lia o arquivo — um defeito nele nascia invisível. A suíte `unit` do server já roda no
 * CI, e QDRANT_API_KEY é variável de configuração do server (src/config/env.ts:112,
 * src/lib/vector/qdrant.ts:6), então esta é a camada que a possui.
 *
 * LIMITE DECLARADO: isto lê TEXTO do compose. Não sobe a stack e não prova que o Qdrant
 * em execução recusa requisição sem chave — o falsificador dinâmico exigia Docker de pé,
 * acima do teto de 120s do AV-00 §6b. O que ele impede é a regressão silenciosa do
 * arquivo, que é como o achado nasceu.
 */
const COMPOSE = readFileSync(join(__dirname, '../../../../docker-compose.yml'), 'utf8');

/** Recorta um serviço do bloco `services:` — do `  nome:` até a próxima chave de 2 espaços. */
function serviceBlock(name: string): string {
  const lines = COMPOSE.split(/\r?\n/);
  const start = lines.findIndex((l) => l === `  ${name}:`);
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^ {2}\S/.test(l));
  return rest.slice(0, end === -1 ? rest.length : end).join('\n');
}

/** Remove linhas comentadas. Ver o comentário no caso da chave: um `#` desarmava a barreira. */
function semComentarios(bloco: string): string {
  return bloco.split(/\r?\n/).filter((l) => !/^\s*#/.test(l)).join('\n');
}

describe('docker-compose.yml · Qdrant não sobe sem chave', () => {
  // Controle: se este falhar, os dois abaixo não medem nada — um recorte vazio "passaria"
  // em qualquer asserção de ausência e falharia em toda de presença por motivo errado.
  it('os serviços qdrant e server existem e são recortados', () => {
    expect(serviceBlock('qdrant')).toContain('qdrant/qdrant');
    expect(serviceBlock('server')).toContain('QDRANT_URL');
  });

  it('o serviço qdrant recebe a chave de API, e a recusa de subir sem ela é obrigatória', () => {
    // COMENTÁRIO NÃO É DECLARAÇÃO. Sem esta linha a barreira era desarmável com um `#`:
    // comentar a chave no compose deixava o texto no arquivo, o regex continuava casando e
    // os três casos ficavam verdes enquanto o serviço voltava a subir sem autenticação.
    // Medido por revisão independente; a barreira irmã (nextPublicEnvWiring) já filtrava
    // comentários e esta não — mesma correção, duas datas.
    const qdrant = semComentarios(serviceBlock('qdrant'));
    // Publicar porta no host sem autenticação é o achado. Enquanto as portas estiverem
    // publicadas, a chave é obrigatória; se um dia deixarem de estar, esta guarda relaxa
    // sozinha em vez de virar cerimônia.
    if (!/^\s*ports:/m.test(qdrant)) return;
    expect(qdrant).toMatch(/QDRANT__SERVICE__API_KEY:\s*\$\{QDRANT_API_KEY:\?/);
  });

  it('o serviço server recebe QDRANT_API_KEY — o cliente monta com ela ou com undefined', () => {
    expect(serviceBlock('server')).toMatch(/^\s*QDRANT_API_KEY:\s*\$\{QDRANT_API_KEY/m);
  });
});
