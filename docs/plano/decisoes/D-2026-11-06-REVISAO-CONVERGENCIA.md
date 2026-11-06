---
id: "D-2026-11-06-REVISAO-CONVERGENCIA"
tipo: "decisao"
dominio: "processo"
titulo: "Revisão do PR vermelho (06/11): revisor obrigatório só no vermelho de código, evidência lida, origem e classe por achado, pré-existente em trilho próprio, teto de 3 rodadas só no diff novo, destino de cada achado no lote"
estado: "decided"
autorizacao: "dono, chat, 2026-11-06, dois questionários. 1º: \"Ajustar o que existe (Recomendado)\" · \"Bloqueia igual\" · \"Teto de 3, só o diff novo (Recomendado)\" · \"Coluna no lote (Recomendado)\". 2º, depois da pesquisa com os dados do repo: \"Trilho próprio, como no #1079 (Recomendado)\" (substitui o \"Bloqueia igual\") · \"Só no vermelho de código (Recomendado)\""
atualizado: "2026-11-06"
---
# D-2026-11-06-REVISAO-CONVERGENCIA

**Estado:** `decided`. Emenda a resposta 3 da [D-2026-10-28-FLUXO-AUTONOMO](D-2026-10-28-FLUXO-AUTONOMO.md) (revisor
só no vermelho). Não cria revisor, gate nem rodada (regra ⛔ do CLAUDE.md): muda o formulário do agente
`revisor-independente`, o jeito como a maestro o despacha e acrescenta o campo `revisor` ao `scripts/classe-risco.mjs`
(a lista `VERMELHO` não muda).

## De onde vêm as lições, e por que não se copiam

Fonte: o texto de engenharia da equipe do Claude Code, "How the Claude Code team does code review" (claude.dev, 15/10/2026,
lido direto em 06/11), mais a doc pública do Code Review (code.claude.com/docs/en/code-review e
`.../code-review-customize`). O contexto deles é outro:

| | Anthropic (Claude Code) | Luminaris (medido em 06/11) |
|---|---|---|
| Volume | Monorepo de ~2.500 para mais de 30.000 mudanças/dia (maio → setembro) | 129 PRs mergeados de 28/10 a 06/11 (sem as 2 pilhas `chore(merge)`) |
| Quem corrige o achado | Um agente, na hora, sem humano: "another commit and another round of review" | Uma sessão de correção, depois de o dono decidir os achados (questionário do #1013, autorização do IMO-2) |
| Sinal de dano | Taxa de revert e incidente (o share revertido caiu mais de 40% de junho a setembro) | **0 reverts** em 1.882 commits da main; sem produção até 2027 |
| Revisor | Vários agentes acham, outro grupo vota, sobra o que tiver votos; não roda o código ("without building or running your code") | Um agente, em worktree isolado, que **roda** os gates e uma sabotagem, e entrega reprodução executável por achado |

Por isso entra só o que ataca um problema que existe aqui, e cada item abaixo cita o caso do repo que o justifica.
Nenhum número da Anthropic foi medido aqui.

## Respostas e o caso que justifica cada uma

| # | Regra | Resposta literal | Justificativa com dado do repo |
|---|---|---|---|
| 1 | **Onde mora:** no `revisor-independente.md`, no `maestro.md` e no campo `revisor` do `classe-risco.mjs` | "Ajustar o que existe (Recomendado)" | A regra ⛔ proíbe revisor novo enquanto o Bloco A tiver oráculo aberto há mais de 14 dias (hoje 4 de 4). O REVIEW.md da Anthropic não serve: o `/code-review` local "reads your CLAUDE.md files and not REVIEW.md", e o serviço exige plano Team/Enterprise |
| 2 | **Cobertura:** revisor obrigatório só quando o PR toca arquivo vermelho que **não** é `.md` (código, schema, CI, `.claude/settings.json`, o próprio `classe-risco`), ou é dependência major, ou veio sem lista de arquivos. Vermelho só de texto vai ao lote sem revisor | "Só no vermelho de código (Recomendado)" | Dos 129 PRs, **97 são vermelhos (75%)**, porque cédula, `docs/plano/**`, `docs/adr/**`, `.claude/**` e CLAUDE.md contam como vermelho. Com a regra nova, **62** exigem revisor e **35** são só texto. A regra de 28/10 (todo vermelho) não estava sendo cumprida: duas maestros (29/10 e 05/11) mandaram vermelho ao lote "sem revisor-independente", e só 17 dos 62 citam o revisor no corpo (citar não prova que ele rodou; o veredito fica no resumo da maestro, não no PR). A Anthropic separa pelo risco da mudança ("The change sets the tier, not the author"; doc vai sem revisão humana) e diz que várias rodadas "can be worthwhile on a risky change, but not on every PR" |
| 3 | **Pré-existente:** o revisor prova que o defeito é igual na main e propõe a linha `[ABERTO]` do GAP-MAP; o achado segue listado no lote, mas não segura o PR; a correção pede autorização própria | "Trilho próprio, como no #1079 (Recomendado)", que substitui o "Bloqueia igual" do 1º questionário | É o que já aconteceu: o revisor do #1079 achou o IMO-2 "igual na main, não é regressão"; o #1079 entrou, o IMO-2 virou linha do GAP-MAP e o PR #1084, com "Autorizo o IMO-2". Na Anthropic o rótulo Pre-existing serve "so a bug the PR didn't introduce doesn't look like the author's fault"; o texto não diz se ele bloqueia. A razão para não bloquear aqui é deles também: cerca de 59% do que o revisor deles repetia era código anterior à 1ª revisão, e rodada nova achava "a few more old ones each round" |
| 4 | **Convergência:** no máximo 3 rodadas por PR; a 2ª e a 3ª recebem a lista anterior, olham só `git diff <sha-anterior>..<sha-novo>` e não repetem achado; sem PASS na 3ª, o PR vai ao lote marcado "repensar a abordagem" | "Teto de 3, só o diff novo (Recomendado)" | Aqui o problema deles **ainda não apareceu**: nos PRs com veredito registrado, nenhum passou de 2 rodadas (#976 FAIL → `24c5b33e`; #1084 ressalva → `2fa88f3e4` → PASS; #1013 APROVA COM RESSALVAS → `644f8989`). O teto é seguro barato, não conserto: a correção aqui passa pelo dono, o que já freia o laço. A regra vale quando a maestro passar a re-despachar sozinha a cada SHA. Medido por eles: PR com 5 rodadas ou mais caiu de 8,9% para 1,5%; média de 2,08 para 1,32 revisões |
| 5 | **Destino de cada achado no lote:** corrigido · estava errado · era intencional · não importava (vazio enquanto não se sabe). Sem arquivo-ledger | "Coluna no lote (Recomendado)" | Contados à mão nos PRs com veredito (sem garantia de cobertura): #1013 A1 e A2 corrigidos, P3 intencional, A3 **estava errado** (a tabela `FERIADO_NACIONAL` é semeada pela migração `20261007160000_add_legal_parameters_v2`); #976, #1033 e #1084 corrigidos; #1051 com 3 achados de texto, 2 corrigidos depois do merge no #1058 e 1 que "não importava" (resolvido pela ordem de merge); #983 virou cédula (D-2026-10-29-F5-16B). Ruído baixo, mas hoje só dá para contar lendo PR por PR. As categorias são as da Anthropic |

## Também entra (extensão de regra que já existe)

- **Evidência lida.** Todo achado e todo "atendido" cita `arquivo:linha` que o revisor abriu. O falso positivo A3 do
  #1013 é dessa classe: a conclusão "tabela vazia" saiu sem ler a migração que a semeia. A doc pública diz o mesmo:
  "behavior claims need a `file:line` citation in the source, not an inference from naming".
- **Classe do bug.** Cada achado nomeia a classe, de preferência pelo nome da memória ou do GAP-MAP, e lista as
  outras ocorrências nos arquivos do diff. Caso: o achado do #1033 ("o valor era aceito e ignorado") é a classe
  `param-aceito-e-ignorado-e-bug` da memória. A Anthropic: "Flag the class of bug, so the author fixes every
  instance, not one line." As ~40 classes da memória são o nosso equivalente do conjunto de incidentes deles, usado
  de forma passiva.

## Segunda referência: CodeRabbit (doc oficial, docs.coderabbit.ai, lida em 06/11)

Revisor de PR com IA, instalado como app do GitHub. Serve de contraprova do que entrou acima e traz uma regra nova:

| Prática deles | O que a gente faz com ela |
|---|---|
| Re-revisão incremental por padrão ("focusing on the commits added since the last review"); a automática pausa depois de 5 commits revisados (`auto_pause_after_reviewed_commits: 5`); revisão inteira só por comando (`@coderabbitai full review`) | Confirma o item 4: duas ferramentas chegaram, separadas, a "só o diff novo + teto". Lá o teto pausa e volta por comando; aqui a 3ª sem PASS vai ao dono, que é quem decide se há revisão inteira de novo |
| Perfil `quiet` / `chill` (padrão) / `assertive` ("More feedback, which may feel nitpicky") | O nosso revisor já é o `quiet`: só corretude e requisito, sem estilo. Nada muda |
| Cinco gravidades (Critical, Major, Minor, Trivial, Info); nenhuma página diz que alguma bloqueia o merge. Bloqueio só com "request changes" ligado, que é desligado por padrão, e checagens novas começam em `warning` | Igual à Anthropic: gravidade informa, quem bloqueia é outra regra. Aqui quem bloqueia é o lote do dono. Não adotamos as cinco gravidades: a separação `A`/`P` é o que muda a ação |
| `track` acompanha um comentário do revisor de commit em commit | Confirma os ids `A1`, `A2`… que seguem entre rodadas |
| **Learnings**: preferências tiradas das respostas no chat, guardadas e aplicadas nas revisões seguintes, com o aviso "learnings can become stale" e a regra "Path instructions precede learnings" | **Entra:** a classe tirada da memória é pista, não prova. O revisor confirma no código e, se a nota brigar com regra escrita (contrato, CLAUDE.md, BRIEF), vale a regra escrita. Caso nosso da mesma classe: a memória `pr-aberto-mede-com-gh` (o #860 constou aberto 3 dias depois do merge) |

**Não adotamos a ferramenta**, por três motivos:
- Ela comenta no PR, e a regra daqui é sem comentário público em PR (o contexto vai no corpo do PR e no chat).
- Ela lê `**/CLAUDE.md` como critério de revisão. O nosso CLAUDE.md é quase todo processo de sessão, então viraria ruído.
- Ela não roda a suíte (as checagens dela não podem "Run your test suite"). O nosso revisor roda os gates e uma sabotagem.

O preço para repositório privado não foi conferido.

## O que **não** entra, e por quê

- **Vários agentes que votam no achado:** o nosso revisor dá reprodução executável por achado, que é prova mais forte
  que voto. Votar multiplicaria o custo por ~62 PRs.
- **Incidente vira teste do revisor, rodado todo dia:** a Anthropic monta o conjunto com reverts e incidentes; aqui há
  0 reverts e nenhuma produção. E seria aparato novo (regra ⛔).
- **Revisão noturna do código existente:** aparato novo (regra ⛔). O GAP-MAP e a `sessao-instrumentacao` cobrem.
- **Aprovação automática do verde sem humano:** já existe (maestro, D-2026-10-28).
- **Disjuntor que aperta a aprovação quando o revert sobe:** nem a Anthropic tem ("We don't yet have circuit
  breakers"), e aqui não há o sinal.

## Como conferir que a regra está viva

- `node --test scripts/classe-risco.test.mjs`: 10 de 10. Com o `SO_TEXTO` sabotado para não casar nada, 2 vermelhos;
  restaurado, sha idêntico e 10 de 10 de novo (06/11).
- No lote da maestro: cada PR vermelho traz `revisor: obrigatório` ou `não (só texto)`; obrigatório sem veredito
  aparece como **sem revisor**, não some.
