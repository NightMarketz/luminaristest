# CLAUDE.md raiz — detalhe movido (2026-10-07)

> Texto movido **sem alteração de regra** do `CLAUDE.md` raiz para reduzir o contexto sempre-ativo
> (item 3 de `CERIMONIA-POR-RISCO-brief.md`, F-3.2 ratificado: raiz ≤ 120 linhas). O raiz mantém uma
> linha de índice para cada seção abaixo. Em conflito, as duas versões dizem o mesmo; se divergirem, vale esta.

## Codebase-memory — consulta antes de escrever código

**Pergunte ao codebase-memory se o canônico já existe.** Isto é o degrau "reuse antes de recriar"
(Contrato §0) e a Etapa 1 do critério de reuso feitos por evidência, não por chute:

| Pergunta | Ferramenta cbm |
|---|---|
| Já existe algo com esse nome/forma? | `search_graph` (name/label/file_pattern) |
| Existe um quase-clone (ilha) que eu deveria reusar? | `semantic_query` + edges `SIMILAR_TO` / `SEMANTICALLY_RELATED` |
| O outro lado está vivo ou é legacy? (Etapa 2) | `trace_path` (in-degree) + `change_count` / `last_modified` |
| Qual o blast radius do meu diff antes de fechar? | `detect_changes` |

> **[CBM-001] Papel do cbm — localizador estrutural, NÃO fonte de verdade.** O grafo reduz o espaço de busca
> (símbolos, dependências, call paths, blast radius, arquitetura); a evidência final é **sempre código/teste/git**.
> Regra dura: **nenhuma conclusão comportamental se sustenta só no grafo** — todo resultado do cbm que vira
> afirmação sobre o que o código *faz* tem de ser confirmado lendo o arquivo (e o teste, quando aplicável).
> Use **cbm-primeiro para localizar** ("quem chama X?", "onde isto é implementado?", "o que quebra se eu mudar Y?",
> "qual a arquitetura deste domínio?"); use **`Read`/`Grep`/teste direto para confirmar** (condição exata,
> string/config, o que um teste afirma, contexto integral do arquivo, geração dinâmica/reflexão). Isto **refina**
> o hook de SessionStart ("cbm FIRST for ANY exploration"): cbm-first vale para *localização estrutural*, não para
> busca exaustiva de call sites nem leitura de contexto integral — aí a leitura nativa ganha (evidência própria:
> `cbm-indegree-underreports-frontend`, composição JSX não é aresta `CALLS`). `manage_adr`/`delete_project` ficam
> fora do uso do agente; ADR/incidente são editados direto no vault de governança.

Projeto indexado como `C-Users-smurf-Downloads-Luminaris`.

## Ponytail × este projeto

O ponytail (modo lazy, sempre ativo) e este projeto **concordam** no núcleo — menos código, reuse antes de
recriar, YAGNI — e o codebase-memory é o que torna esse instinto fundamentado. Mas com uma fronteira clara:

- **Padrões de camada NÃO são over-engineering.** A cadeia `Route → Controller → Service → Repository → Prisma`
  (+ Policy), injeção via **Factory**, **DTO Zod**, **soft-delete** e **registro de rota em 2 toques** (`index.ts` + `docs.paths.ts`; auth é deny-by-default no middleware) são
  *requisitos do projeto* (Contrato §2/§3). Caem na própria regra do ponytail de "nunca simplificar o que foi
  explicitamente pedido / segurança". **Não** inline uma policy, **não** pule um DTO, **não** corte o factory
  "pra ser enxuto".
- O ponytail morde no **código solto** (um helper, um fix pontual) — aí sim, seja mínimo.
- Em dúvida entre enxugar e seguir o padrão da camada → **o contrato prevalece**.

## skill-audit — predicado de ambiente

Desde o PR #203 o SG-005 pergunta o destino (`GITHUB_REF_NAME`/`GITHUB_BASE_REF` = main na CI, além do
checkout local em `main`) — a CI de PR morde; 0 findings **local** fora dessas condições segue não provando
o push com skill `draft`. Classe geral: gate cujo predicado lê ambiente (branch, worktree, modo de sessão,
fuso, SO) se prova **na condição que falha**, ou declara-se "o push/CI é o teste" — nunca trate verde fora
da condição como evidência.

## Bancada de auditoria — a medida que fundamenta a regra ⛔

Removidos em 2026-08-09: `scripts/bancada-gate.mjs`, `scripts/review-ledger-check.mjs`, todo o `docs/audit/`
(34 arquivos) e os dois passos do `ci.yml`. Recuperáveis em `b617d8f1`. A medida: 5 rodadas, 31 itens
triados, **17 sobre o próprio instrumento**, **0 linha de código de aplicação alterada** — contra 28 linhas
de uma única sessão de navegador contra o `dev.db` real. O gargalo é PVA / NF-e real / contador / implantar,
e nenhum deles se resolve com mais processo.

## Política de raciocínio T1–T8

O texto integral está em `docs/operating-manual/REASONING-TRAITS.md`. A lista curta que estava no raiz:

1. Nomeie o **objetivo sob a letra** do pedido; se divergem, responda ao objetivo e avise.
2. Claim inverificável → converta em artefato checável por fora, ou declare inverificável.
3. Regra que você criar **se aplica primeiro a você**; declare onde falha em si mesma.
4. Decisão que vai se repetir: formule a regra na 1ª vez, **cite-a** nas seguintes.
5. Input que só confirma o existente não vira texto novo — registre "confirma" e siga.
6. Sobre trabalho já ~certo: **patches no que falha, nunca rewrite**.
7. Instrução que alguém vai rodar = passos numerados; aforismo só como índice.
8. O risco final da entrega **inclui seus próprios vieses**, nomeados.
