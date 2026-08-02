# AV-R1 · Primeira rodada da bancada v4

**O `docker-compose.yml` entrega o frontend apontando para o lugar errado e o banco vetorial
publicado sem chave — dois defeitos de configuração no mesmo arquivo, nenhum deles visível
para `tsc`, teste ou lint.** O resto do que foi medido está sólido: trava íntegra nos dois
roots, nenhum `.env` versionado em toda a história do repositório, 180 arquivos de teste sem
um único sem asserção.

> **Modo reduzido.** Nenhum dos três roots tem `node_modules`. Tipos, build, jest e vitest
> saíram **não executáveis**. Nenhum número de runtime sustenta este relatório.
>
> **Teto de confiança "media".** 94,1% dos commits do recorte são de agente
> (`agent_authored_ratio = 0.941`). Pelo AV-00 §2.2, acima de 0,70 nenhum achado desta
> rodada pode sair como "verificado por revisão" — todos os quatro foram verificados por
> **execução de comando**, e é só isso que os sustenta.
>
> **Esta rodada não foi revisada.** O AV-00 §9.4 rejeita PASS emitido pela mesma sequência
> que implementou, e foi exatamente isso que aconteceu: quem escreveu os instrumentos rodou
> os instrumentos. Trate os achados como candidatos verificados, não como triados.

---

## Recorte

| | |
|---|---|
| Commit | `643d2eb` · branch `claude/bancada-medicion-vs-opinion-b47dce` |
| Incluído | `server/src`, `server/prisma`, `my-app`, artefatos de implantação, `.claude/` |
| Excluído | `node_modules`, `server/generated`, `my-app/.next` |
| Instrumentos | AV-03, AV-16, AV-17, AV-18, AV-19 (os cinco escritos na v4) |
| Não rodados | AV-01, AV-02, AV-04 a AV-15, AV-L1 — sem texto próprio ou fora do escopo desta rodada |
| Perfil do dono | nunca implantado · zero usuários · rigor estrito · audiência dupla |
| Pendentes | `irreversible`, `paid`, `regulated`, `humanGate`, `fpTol` — seguem nulos |

---

## Peça central · Origem do código (AV-00 §2.1)

| Medida | Valor | Método |
|---|---|---|
| Commits no recorte (sem merge) | 238 | `git log --no-merges -- <recorte>` |
| Commits de agente | 224 | trailer `Co-authored-by` contendo "Claude" |
| **`agent_authored_ratio`** | **0,941** | 224 / 238 |
| Jun/2026 → Jul/2026 | 0,885 → 0,978 | por mês |
| Linhas adicionadas por agente | 51,5% | `--numstat` agregado |
| **Idem, excluindo o commit-baseline** | **97,7%** | `0db3961` sozinho trouxe 93.662 linhas |

**Checagem adversarial que enfraqueceu o número bruto e o tornou mais forte:** por linha, o
agente responde por "só" 51,5% — porque um único commit humano, o baseline do template
(`0db3961`), despejou 93.662 linhas de uma vez. Removido esse commit, os outros treze commits
humanos somam 2.430 linhas e a proporção sobe para 97,7%. Os dois números são verdadeiros e
dizem coisas diferentes: **quase todo o código que este projeto escreveu — em oposição ao que
ele herdou — é de agente.**

---

## Achados

### F1 · O `docker-compose.yml` injeta uma variável que o código não lê
**Dano 3 · exposição após-deploy · confiança alta (execução) · reversível · AV-18 D1**

`docker-compose.yml:27` define `NEXT_PUBLIC_API_URL: http://server:3001`. O código lê
`NEXT_PUBLIC_API_BASE_URL` — 30 ocorrências em 19 arquivos, incluindo
`my-app/next.config.js:23`, que estabelece o default. O nome usado pelo compose aparece
**zero vezes** no código.

Consequência: o container do frontend cai no default `http://localhost:3001/api`. Dentro de
um container, `localhost` é o próprio container do frontend — onde não há servidor. Toda
chamada de API falha.

**Segunda camada, mesmo achado:** `NEXT_PUBLIC_*` no Next.js é embutido em tempo de **build**.
A chave `environment:` do compose é **runtime**. Mesmo corrigindo o nome, o valor não
chegaria — teria de entrar como build-arg. O `env:` block do `next.config.js` confirma: ele
lê `process.env` durante o build.

**Impacto:** o produto conteinerizado sobe e não funciona; o frontend não fala com o backend.

**Falsificador estático — executado, confirmou:**
```bash
cd my-app && echo "BASE_URL=$(rg -c -N -I NEXT_PUBLIC_API_BASE_URL -g '*.{ts,tsx,js}' . | wc -l) API_URL=$(rg -c -N -I NEXT_PUBLIC_API_URL -g '*.{ts,tsx,js}' . 2>/dev/null | wc -l)"
```
Saída: `BASE_URL=19 API_URL=0`.

**Demonstração (12 s):** `grep -n NEXT_PUBLIC docker-compose.yml my-app/next.config.js` — os
dois nomes lado a lado, diferentes.

**Barreira proposta:** `teste_de_fronteira` — teste que falha se o conjunto de chaves
`NEXT_PUBLIC_*` do compose não for subconjunto das lidas no código.

---

### F2 · O banco vetorial é publicado sem chave, embora o código já saiba usar uma
**Dano 3 (rebaixado de 4) · exposição após-deploy · confiança alta (execução) · reversível · AV-18 D2**

`docker-compose.yml:34-37` publica as portas `6333` e `6334` do Qdrant no host. O serviço
`qdrant` não recebe nenhuma variável de ambiente — nem chave de API, nem configuração de
acesso. O serviço `server` também não recebe `QDRANT_API_KEY`.

O que torna isto um defeito de configuração e não uma limitação: **o código já suporta a
chave.** `server/src/lib/vector/qdrant.ts:6` faz `apiKey: process.env.QDRANT_API_KEY!` — com
asserção de não-nulo sobre um valor que o `server/.env.example:8` documenta vazio. A
capacidade existe e a implantação não a usa.

**Impacto:** quem alcança o host lê e escreve o índice vetorial, que contém o conteúdo dos
documentos processados dos clientes.

**Rebaixamento registrado (AV-00 §6b):** o dano pretendido era 4. A demonstração exigiria
subir a stack com Docker — acima dos 120 s. Sem demonstração executável, o teto é 3.

**Falsificador estático — executado, confirmou:**
```bash
grep -A6 "qdrant:" docker-compose.yml | grep -qi "api_key\|environment" && echo "tem config" || echo "SEM CHAVE"
```

**Barreira proposta:** `teste_de_fronteira` sobre o arquivo de implantação — reprova se o
serviço `qdrant` publicar porta sem exigir chave.

---

### F3 · Três dependências são importadas sem estarem declaradas
**Dano 2 · exposição apenas teórica com gatilho · confiança alta (execução) · reversível · AV-19 D3**

| Pacote | Importado em | Declarado? | Na trava? |
|---|---|---|---|
| `dotenv` | `server/src/config/env` | não | sim, como transitivo |
| `@dnd-kit/utilities` | 3 componentes de `my-app` | não (só `core` e `sortable`) | sim, como transitivo |
| `@fullcalendar/core` | locales, 3 arquivos | não (só `react`, `daygrid`, `timegrid`, `list`, `interaction`) | sim, como transitivo |

Os três resolvem hoje porque o npm achata a árvore. Deixam de resolver no dia em que o pacote
pai que os traz mudar de versão — sem nenhuma alteração no manifesto que avise.

**Três candidatos derrubados na checagem adversarial**, e vale registrar porque dois deles
teriam virado achado num relatório menos cuidadoso:
- `generated/prisma` → alias em `server/tsconfig.json:27`. Derrubado.
- `@test/helpers` → alias em `server/tsconfig.test.json:11` **e** `jest.config.js:14`. Derrubado.
- `assistant` → não é import: era a frase `Messages from 'assistant' or 'system'` num
  comentário, casada pelo meu próprio padrão. Derrubado — e é defeito do comando 2.f do AV-19,
  não do código.

**Gatilho de revisão:** próxima regeneração de `package-lock.json` em qualquer root.

**Falsificador estático — executado, confirmou:** o comando 2.f do AV-19 confrontado com os
dois manifestos devolve exatamente estes três nomes após filtrar builtins e aliases.

**Barreira proposta:** `teste_de_fronteira` — reprova import de pacote ausente do manifesto
do próprio root.

---

### F4 · A revisão independente é a barreira declarada e não deixa artefato auditável
**Dano 3 · exposição já exposta · confiança alta (execução) · reversível · AV-17 R1**

O AV-00 §9.4 declara: revisão vem de agente separado, e PASS emitido pela própria sequência
que implementou é rejeitado. É a barreira central do método deste repositório.

Medido no histórico: **37 commits mencionam revisão; 8 nomeiam uma revisão independente
específica**, contra **207 merges** ("fecha N2 e N4 da revisão independente do PR 157"). Não existe artefato por
merge — nem arquivo, nem registro estruturado. O único traço durável é a mensagem de commit
da correção, quando a revisão encontrou algo. Revisão que não encontrou nada não deixa traço
nenhum.

Consequência direta na medição: para a esmagadora maioria dos merges, o campo R1 sai
**"não medido"** — e o instrumento proíbe explicitamente converter isso em "não houve". A
diferença importa: não estou dizendo que a revisão não aconteceu. Estou dizendo que **a
barreira declarada do método não é reexecutável nem verificável por ninguém de fora.**

Contexto medido nos 24 merges de PR da amostra: o intervalo entre o primeiro commit do ramo e
o merge vai de 0 a 1747 minutos, mediana 10 minutos. Esse intervalo **contém a autoria** —
logo o tempo de revisão é sempre menor que ele. O PR #139 fechou 220 arquivos e 12.187 linhas
inseridas em 8 minutos de intervalo total.

Não converto isso em achado de "revisão insuficiente", e a razão é o bloco 4b: qualquer
limiar de leitura que eu aplicasse viria de literatura, não de medição deste repositório. O
achado é a **ausência de artefato**, que é medida. O intervalo é sinal, não veredito.

**Falsificador estático — executado, confirmou:**
```bash
git ls-files | grep -icE "review|revisao" ; git log --format=%s | grep -icE "revisao independente|review independente"
```

**Barreira proposta:** `alerta` / registro — um artefato de revisão por PR no repositório,
com o que foi checado e o que sobreviveu. Sem isso, o AV-17 não tem o que medir na próxima
rodada e o §9.4 continua sendo uma regra sem gate.

---

## Não medido

| Medição | Motivo | Consequência |
|---|---|---|
| **`mutation_score` (AV-03)** | nenhum root tem `node_modules`; jest e vitest não executáveis | **A força da suíte deste projeto é desconhecida.** A estrutura é boa (180 arquivos, 3.798 asserções, zero testes sem asserção, zero `skip`/`todo`, 1,2% de asserções fracas) — mas estrutura não é garantia. Nenhuma das 7 mutações do AV-03 foi aplicada. Placar do AV-03 travado no nível 1. |
| Tipos e build | mesma causa | Nenhum achado desta rodada foi confrontado com o compilador. |
| Bundle de produção do frontend | mesma causa | F1 foi medido na fonte; um segredo que entrasse no bundle por outro caminho passaria. |
| Configuração do ambiente real | nunca implantado | Tudo em AV-18 é a configuração **declarada**; o que rodaria pode divergir. |
| `npm audit` (AV-19) | exige rede | Vulnerabilidade conhecida em dependência: zero informação. Nenhuma foi estimada. |
| R1 por merge (AV-17) | ver F4 | O próprio achado. |
| Hooks e MCP locais (AV-19 D5) | `.claude/settings.json` não é versionado | 235 arquivos de instrução de agente estão versionados e auditáveis; a configuração que executa comandos não está. Não é achado: é um limite da medição. |

---

## Convenções · não são achados

| Alegação | Fonte | Por que não é achado | Vira achado se… |
|---|---|---|---|
| "Todo workflow deve declarar `permissions:`" | prática corrente de CI | `.github/workflows/ci.yml` tem **zero** ocorrências de `permissions:`, mas a consequência depende do default do `GITHUB_TOKEN` na organização, que não é legível daqui | …o default da org for medido e for read-write |
| "`legacy-peer-deps=true` enfraquece a resolução" | prática corrente de npm | `server/.npmrc` tem a linha; nenhuma divergência de peer real foi medida na árvore | …uma incompatibilidade de peer real for medida na árvore instalada |

---

## Placar

| Instrumento | Dimensão | Nível | Teto | Por que o teto |
|---|---|---|---|---|
| AV-03 | Força da suíte | **1** | 1 | sem dependências, nada executa |
| AV-16 | Dívida de compreensão | 2 | 3 | rastro existe em commit; nunca implantado |
| AV-17 | Revisão real | **1** | 3 | artefato ausente (F4) |
| AV-18 | Configuração de deploy | 2 | 3 | mede o repositório, não o ambiente |
| AV-19 | Cadeia de suprimento | **3** | 3 | trava íntegra, registro único, declarado × travado sem divergência |

Escala: 0 ausente · 1 nominal · 2 correta por convenção · 3 correta e verificável · 4 barrada
por gate que lê o artefato.

---

## AV-16 · Dívida de compreensão — nenhum achado, e a razão importa

Os três maiores candidatos foram abertos e **todos tinham rastro**:

| Módulo | Linhas | Comentário | Commits | Rastro encontrado |
|---|---|---|---|---|
| `ReconciliationPanel.tsx` | 955 | 20 | 4 | commit `feat(fe-incr7)` nomeia o incremento |
| `lib/factory.ts` | 715 | 35 | 51 | 51 toques: módulo vivo e conhecido |
| `AnalyticsResolver.ts` | 851 | 93 | 6 | veio do baseline; cabeçalho diz o quê, não o porquê |

O terceiro é o único caso de intenção não recuperável, e não virou achado porque **nenhuma
consequência foi nomeada** — o instrumento proíbe emitir por incômodo.

A coluna que decide este instrumento — *"alguém sabe explicar?"* — sai **vazia, pendente de
você**. Não é omissão: é a regra do AV-16. Preenchê-la sozinho seria inventar a única
informação que só o dono tem.

---

## Três movimentos mais baratos

1. **Corrigir `docker-compose.yml`** — fecha F1 e F2 no mesmo arquivo, e F1 é o maior dano da
   rodada. Renomear a variável (e movê-la para build-arg), e fechar o Qdrant com chave.
2. **Declarar as três dependências fantasma** — duas linhas em dois manifestos, e some uma
   classe inteira de quebra silenciosa de build.
3. **Registrar o artefato de revisão por PR** — é o que dá ao AV-17 o que medir na próxima
   rodada, e o que transforma o §9.4 de regra em barreira.

---

## Inquérito · três perguntas que você deveria saber responder

1. **Quando o `docker-compose.yml` subiu funcionando pela última vez?** Se a resposta for
   "nunca foi testado inteiro", F1 e F2 não são regressões — são o estado original, e o
   arquivo é documentação de uma intenção que nunca rodou.
   *Onde a resposta existiria: em nenhum lugar do repositório.*
2. **Se a suíte inteira ficasse verde com o filtro de inquilino removido de uma consulta,
   você saberia?** Hoje ninguém sabe: a mutação nunca foi aplicada porque nada roda neste
   worktree. *Onde existiria: num `npm ci` seguido do AV-03 completo.*
3. **Das 8 revisões independentes que deixaram traço, quantas houve de fato?** A diferença
   entre 8 e 207 é a diferença entre um método praticado e um método declarado.
   *Onde existiria: em nenhum lugar — é exatamente o F4.*

---

## Auto-verificação desta rodada

| Checagem | Resultado |
|---|---|
| Achado sem falsificador estático executado? | Nenhum. Rigor estrito respeitado nos 4. |
| Achado justificado por citação? | Nenhum. Duas alegações foram para `conventions[]`. |
| Dano 4+ sem demonstração? | Um — F2, rebaixado para 3 e registrado. |
| Achado marcado `intent_unknown` chamado de "decisão errada"? | Nenhum; os 4 têm `intent_source`. |
| Confiança acima do teto derivado de §2.1? | Nenhuma. Os 4 são "verificado por execução". |
| Candidato derrubado na checagem adversarial? | Três, todos em F3 — e um era defeito do meu próprio comando. |
| Revisão independente desta rodada? | **Ausente.** Declarado no topo. |

### Dois buracos que a própria bancada mostrou

- O enum `exposure` não tem valor para "latente até a próxima atualização de dependência"
  (F3). Usei `apenas_teorico` com gatilho nomeado, que dá o portão certo pela razão errada.
- O mapeamento de portão para *nunca implantado* não cobre `ja_exposto` (F4). Atribuí
  `bloqueia_primeiro_cliente` por leitura mais próxima. Os dois casos são emenda para a v4.1,
  não erro desta rodada.
