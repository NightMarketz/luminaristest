# BRIEF — Merge por risco (faixas verde / amarela / vermelha)

**Estado:** 2026-10-24 — F-MRG-1..7 ratificados pelo dono (§6). A execução (§7) ainda precisa de autorização
própria.
**Muda:** a seção "Merge só com PR nomeado" do `CLAUDE.md` e o costume de pôr "não mergear sem OK" no título.
**Não muda:** a autorização citável (ORCH-006), o OPS-006 (cerimônia por risco no *trabalho*), o CI, a regra ⛔ da
bancada. O classificador proposto lê caminhos do diff, como o `check:arch` lê imports; não é revisor nem rodada.

## 1. Diagnóstico medido (150 PRs mergeados, 15/10 → 24/10/2026)

Medição: `gh pr list --state merged --limit 150` + cálculo `mergedAt − createdAt`. Grau: **verificado** (números),
**inferido** (onde está escrito).

| Fato | Número |
|---|---|
| Vazão | 150 merges em 9 dias (~17/dia) |
| Tempo até merge, mediana geral | 1,9 h (p75 6,0 h) |
| CI de um PR (relógio) | 7–9 min, já em shards paralelos |
| PRs empilhados (base ≠ main) | mediana 5,8 h (p75 9,1 h, máx. 20 h) — os mais lentos |
| PRs só de docs | 61 de 150 (41 %), mediana 1,3 h |
| Título com "não mergear sem OK" | **142 de 150** |
| Runs de CI canceladas (últimas 100) | 30 % (push novo cancela a run anterior; pilha reinicia em cascata) |

Leituras:

1. **O CI não é o gargalo.** ~8 min de CI contra ~1,9 h de mediana: ~90 % do tempo é espera pela confirmação
   humana (inferido: diferença entre as duas medidas).
2. **O aviso no título não discrimina nada.** Está em 95 % dos PRs, então não diz ao dono qual PR pede atenção.
3. **Todo PR espera igual.** Simulando as faixas do §3 sobre os 150 PRs, as medianas atuais são quase iguais
   (verde 1,3 h · amarela 1,9 h · vermelha 2,0 h): hoje um PR de teste espera tanto quanto uma migração Prisma.
4. **"Docs fora da fila" sozinho é perigoso aqui.** Dos 61 PRs só de docs, 25 tocam `docs/plano/decisoes/`,
   23 `pesquisas-legais/` e 13 `docs/adr/` — são registro de decisão do dono e conclusão legal, não texto neutro.
   A regra precisa separar *docs neutro* de *docs que registra decisão*.
5. **Pilha é o pior caso.** Cada nível espera o de baixo, e cada push embaixo cancela e reinicia o CI de cima.
   O #882 (17 commits de 7 PRs num só) mostrou o custo: 1 conflito real, 1 CI, 1 OK.

## 2. O que o mercado faz (pesquisa, 24/10/2026)

| Prática | Fonte | O que diz | Serve aqui? |
|---|---|---|---|
| **Ship / Show / Ask** | [Rouan Wilsenach, martinfowler.com (2021)](https://martinfowler.com/articles/ship-show-ask.html) | Cada mudança se classifica: *Ship* (merge sem PR), *Show* (PR aberto e mergeado com o CI verde; revisão depois), *Ask* (espera a conversa). Quem gateia o merge é o CI, não a aprovação humana. | **Sim, é a base.** Adaptado: o agente nunca faz *Ship* direto na main; *Show* e *Ask* por predicado de caminho. |
| **Revisão rápida, PR pequeno** | [Google eng-practices — speed](https://google.github.io/eng-practices/review/reviewer/speed.html) | Responder a um pedido de revisão em no máximo um dia útil; "LGTM com comentários" quando o resto é menor. Revisão lenta derruba a vazão do time inteiro. | Sim: a confirmação em lote (amarela) e o LGTM com ressalva cabem aqui. |
| **Trunk-based, branch curta** | [DORA — trunk-based development](https://dora.dev/capabilities/trunk-based-development/) | Branch de horas a um ou dois dias, merge frequente na trunk, correlação com alta performance de entrega. | Sim: argumento contra pilhas fundas. |
| **CODEOWNERS por caminho** | [GitHub — code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) | Com "require review from code owners", só caminho com dono exige a aprovação do dono; caminho sem dono, não. | É a forma nativa da faixa vermelha. Mas o dono aqui é uma pessoa só e o agente abre os PRs com a mesma conta — o GitHub não deixa o autor aprovar o próprio PR. Ver F-MRG-5. |
| **Merge queue** | [GitHub — merge queue](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue) | Fila que testa o PR contra a main atualizada; exige o gatilho `merge_group` no workflow. | **Ainda não.** Só paga quando "require up to date" trava merges seguidos; não consegui ler a proteção (403). Ver F-MRG-6. |
| **Pilha com ferramenta** | [Graphite — merge stacks](https://graphite.com/docs/merge-stack-prs-github) | Merge de baixo para cima com restack automático; à mão no GitHub, cada squash obriga a rebasear o resto. | Ferramenta nova não; a regra de profundidade máxima resolve. |
| **Pular CI em PR de docs** | [GitHub — troubleshooting required checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks) · [discussão #44490](https://github.com/orgs/community/discussions/44490) | Check obrigatório pulado por filtro de caminho fica *pendente* e trava o merge; a saída é o job agregador sempre reportar. | Opcional (F-MRG-4). O agregador `server` já existe; dá para fazer os jobs pesados sairem cedo em PR só de docs. |

Prática mais usada, em uma frase: **o CI gateia o merge; a revisão humana bloqueante fica para o que tem risco, e
o resto é revisado depois do merge** (Ship/Show/Ask + CODEOWNERS por caminho). Times pequenos sem segundo revisor
costumam usar auto-merge com o CI verde para a faixa baixa.

## 3. Proposta: três faixas por predicado de caminho

A faixa sai do diff (`git diff --name-only origin/main...HEAD`), não da opinião do agente. Vence a faixa mais alta
que algum arquivo acionar.

| Faixa | Predicado (qualquer arquivo em…) | Como entra |
|---|---|---|
| **🔴 vermelha — Ask** | `server/prisma/**` · `server/src/features/accounting/**` · `server/src/features/accountingBinding/**` · `server/src/middleware/auth.ts` · código de `legal-params` · `pesquisas-legais/**` · `CLAUDE.md` (qualquer nível) · `.claude/skills/**` · `.github/**` · `scripts/**` de gate · `package*.json` | Como hoje: o dono confirma **por número**, um a um. |
| **🟡 amarela — Show em lote** | Código de aplicação fora da vermelha (`server/src/**`, `my-app/**` que não seja teste) · `docs/adr/**` · `docs/plano/decisoes/**` | O agente lista os PRs amarelos verdes do dia numa linha; o dono confirma **o lote por números** ("mergeia 881, 883, 886"). Continua sendo PR nomeado. |
| **🟢 verde — Show** | Só arquivos de teste (`__tests__`, `*.test.*`, `*.spec.*`) · `docs/**` fora de `adr/` e `decisoes/` · notas de nó do vault (`docs/plano/nos/**`) | O agente liga o **auto-merge** do GitHub; entra sozinho quando o CI fica verde. O dono lê depois (revisão pós-merge); reverter é um `git revert`. |

Simulação sobre os 150 PRs mergeados (predicado do rascunho, grau *inferido* — o predicado final muda o número):
vermelha 103 (69 %), amarela 31 (21 %), verde 16 (11 %). Se F-MRG-2 mover `decisoes/` e `adr/` para a amarela, a
fila vermelha perde a maior parte dos 25 + 13 PRs de docs de decisão.

O ganho principal não é a verde (11 %): é a **amarela em lote** — 1 mensagem do dono por dia em vez de 1 por PR —
e a vermelha ficar visível como exceção.

### Título e rótulo

- Sai do título: "não mergear sem OK". Entra um rótulo do GitHub `merge:verde`, `merge:amarela` ou `merge:vermelha`,
  posto pelo classificador. O dono filtra a fila por rótulo.
- "Empilhado no #N" continua no título enquanto houver pilha.

## 4. Regras de pilha

1. **Profundidade máxima 2** (PR na main + 1 filho). O terceiro nível vira commit no PR de cima ou espera.
2. Fases do mesmo nó vão num PR só quando nenhuma precisa de revisão separada do dono; fatiar é para o revisor,
   não para o CI.
3. Pilha que passar de 2 níveis → PR de integração único (como o #882), não merge degrau a degrau.
4. Merge de pilha por *merge commit*, não squash (squash obriga a rebasear o filho; memória
   `squash-merge-quebra-prs-empilhados`).

## 5. Arquivos que conflitam

O conflito do #882 foi em `docs/plano/nos/OBS.md`: dois PRs da mesma pilha reescreveram o `estado_detalhe`
inteiro. Regra: **o fold de um PR acrescenta uma entrada no topo do `estado_detalhe` e não reescreve as
anteriores** — git resolve inserção no topo de forma mais previsível que duas reescritas da mesma linha. Vale também a
memória `valor-derivado-calcula-na-main`: número agregado que todo PR escreveria é calculado na main.

## 6. Forks para o dono ratificar

| Fork | Pergunta | Opções | Recomendada |
|---|---|---|---|
| **F-MRG-1** | Adotar as três faixas? | (a) sim, como no §3 · (b) só a verde · (c) não | **(a)** — sem a amarela em lote o ganho é pequeno (11 %). |
| **F-MRG-2** | Onde ficam `docs/plano/decisoes/` e `docs/adr/`? | (a) amarela: registram decisão já tomada no chat, com citação literal · (b) vermelha | **(a)** — a decisão já foi sua no chat; o PR só transcreve, e a citação é checável. ADR que *propõe* (Proposed) segue na vermelha. |
| **F-MRG-3** | O agente pode ligar auto-merge na verde sem confirmação por número? | (a) sim, com o rótulo `merge:verde` e o predicado do §3 · (b) não, a verde também espera o lote | **(a)** — é o "Show" da prática; reverter é barato. |
| **F-MRG-4** | Pular os jobs pesados em PR só de docs? | (a) sim, com os jobs saindo cedo e o agregador sempre reportando · (b) não | **(a)**, mas depois de conferir a proteção da main (a regra de check obrigatório decide se o pulo trava o merge). |
| **F-MRG-5** | Usar CODEOWNERS para impor a vermelha? | (a) sim, com uma conta de bot para os PRs do agente · (b) não, o rótulo e a regra no `CLAUDE.md` bastam | **(b)** por ora — com uma conta só, o autor não pode aprovar o próprio PR e o CODEOWNERS travaria tudo. |
| **F-MRG-6** | Ligar merge queue? | (a) sim · (b) não por ora | **(b)** — reavaliar se "require up to date" estiver ligado e os merges em lote começarem a se invalidar. |

### Ratificação (dono, questionário no chat, 2026-10-24)

| Fork | Resposta |
|---|---|
| F-MRG-1 | **(a)** as 3 faixas |
| F-MRG-2 | **(a)** `decisoes/` e `adr/` na amarela (ADR Proposed segue na vermelha) |
| F-MRG-3 | **(a)** auto-merge na verde, com o rótulo `merge:verde` e o predicado do §3 |
| F-MRG-4 | **(a)** pular os jobs pesados em PR só de docs, **depois** de o dono conferir a proteção da main |
| F-MRG-5 | **(a)** conta de bot (machine user) para os PRs do agente + CODEOWNERS na faixa vermelha. Setup da conta, do token e da proteção é do dono; o comportamento com 0 aprovações obrigatórias se prova num PR verde e num vermelho de teste antes de valer |
| F-MRG-6 | **(b)** sem merge queue por ora; reavaliar na medição de 2 semanas |
| F-MRG-7 | **(b)** CodeRabbit como **2ª exceção à regra ⛔**, restrita: só PRs com rótulo `merge:vermelha`, só `server/` e `my-app/`, **consultivo** (não é check obrigatório, não bloqueia merge), e o Auto-fix não responde aos comentários dele. Pergunta feita com o contexto da regra ⛔ e do ORACLE-DEFICIT (~88 % da classe inquilino/acesso escapa de revisão de código); a recomendada era (a) não por ora |

**F-MRG-7 — medida e rascunho.** Com F-MRG-2 aplicado, a vermelha seria 72 de 150 PRs (48 %); os que tocam
`server/` ou `my-app/` são 44 (29 %, ~5 por dia) — é o que o CodeRabbit revisaria. Grátis com recursos Pro+ para
repositório público ([CodeRabbit — plans](https://docs.coderabbit.ai/management/plans)); os comentários ficam
**públicos** no PR. Rascunho do `.coderabbit.yaml` (conferir o schema em
[auto-review](https://docs.coderabbit.ai/configuration/auto-review) antes de commitar):

```yaml
reviews:
  auto_review:
    enabled: true
    drafts: false
    labels: ["merge:vermelha"]
  path_filters:
    - "server/**"
    - "my-app/**"
    - "!**/*.md"
```

Linha a acrescentar no `CLAUDE.md`, abaixo da exceção do `check:arch`: *"Exceção ratificada (dono, 2026-10-24):
CodeRabbit consultivo, só em PR `merge:vermelha` que toca `server/` ou `my-app/`. Não é check obrigatório, não é
revisor que aprova, e comentário dele não vira item do Auto-fix; o dono lê ou ignora."* Reavaliar quando o Bloco
A fechar ou na medição de 2 semanas: se nenhum comentário dele tiver mudado um PR, desinstalar.

## 7. Execução depois da ratificação (1 PR, faixa vermelha)

1. `scripts/merge-faixa.mjs`: lê o diff, devolve a faixa e o motivo (arquivo + regra), com teste que prova as três
   saídas e o caso "verde + 1 arquivo vermelho = vermelha".
2. `CLAUDE.md` §"Merge só com PR nomeado": reescrita com as faixas, mantendo "autorização genérica não autoriza
   merge" para amarela e vermelha.
3. Rótulos `merge:*` criados no repositório; o agente aplica ao abrir o PR.
4. Se F-MRG-4 (a): ajuste no `ci.yml` para os jobs pesados saírem cedo em PR só de docs.
4b. F-MRG-5: `.github/CODEOWNERS` com os caminhos vermelhos → `@web3br1`; PR verde e PR vermelho de teste provam o
    ruleset (o verde entra sem aprovação; o vermelho trava até o dono aprovar).
4c. F-MRG-7: `.coderabbit.yaml` do rascunho acima + a linha de exceção no `CLAUDE.md`. O dono instala o app
    CodeRabbit na organização NightMarketz, só no repositório `luminaristest`.
5. Medir de novo em 2 semanas com o mesmo cálculo do §1 (mediana por faixa).

## 8. O que não foi verificado

- Regras de proteção da `main` e rulesets: a API devolveu 403 ao token. O que se sabe: repositório público,
  auto-merge permitido, `delete_branch_on_merge` desligado, sem `CODEOWNERS`, sem gatilho `merge_group`.
- A classificação de "docs" nos números do §1 foi pelo prefixo do título; a simulação do §3 foi pelos caminhos.
- Os 30 % de runs canceladas incluem cancelamentos legítimos (push que corrige algo); não separei.
