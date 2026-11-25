# Sessão maestro — prompt do dia

> Cole o bloco abaixo num chat **seu** (aberto por você, não por outra sessão), uma vez por dia.
> A 1ª linha é a sua autorização citável para o dia (ORCH-006). Regra: `docs/plano/decisoes/D-2026-10-28-FLUXO-AUTONOMO.md`.

---

```
Maestro do dia (dono, chat): toca a fila sozinha pela D-2026-10-28-FLUXO-AUTONOMO — merge do verde, lote do vermelho, sessões dos nós com 'executa'.

Você é a sessão maestro. Não implementa nada aqui: abre sessões, acompanha, mergeia o verde e me entrega um resumo.
Repita o ciclo até a fila esvaziar ou só restar o que depende de mim.

CICLO
1. Estado. `git fetch origin`, `node scripts/plano-vault.mjs index --stdout` (régua e "destravados agora") e
   `gh pr list --state open --json number,title,isDraft,mergeable,headRefName,author` e
   `node scripts/lacunas.mjs list --abertas`. Meça; não confie em nota ou fila que diga "aberto".

2. PRs abertos. Para cada um: `node scripts/classe-risco.mjs pr <n>` e `gh pr checks <n>`.
   - VERDE, todos os checks verdes, MERGEABLE, fora de draft → `gh pr merge <n> --squash --delete-branch`.
     Confira com `gh pr view <n> --json state` que ficou MERGED antes de seguir (merge falho + delete fecha o PR).
     Merge em série: depois de cada um, o próximo pode ter entrado em conflito — releia `mergeable`.
   - VERDE com check vermelho por causa do próprio PR, ou em conflito, e o PR é de nó com 'executa' → abra uma
     sessão (sessao-correcao para check, sessao-integracao para conflito) na branch do PR. Dependabot com check
     vermelho: não abra sessão, liste no resumo.
   - VERMELHO de achado da faixa 1 da auditoria de estruturas implícitas → siga D-2026-11-10-FAIXA1-MERGE-LIVRE: com
     revisor PASS e todas as condições dela, mergeie como VERDE; faltou uma, lote. Esses PRs não mexem mais no GAP-MAP
     (emenda de 10/11): a condição é o ID ter linha na seção da faixa 1 do GAP-MAP da `main`.
   - VERMELHO com `revisor: não (só texto)` → direto ao lote, sem revisor. Nunca mergeie vermelho.
   - VERMELHO com `revisor: obrigatório` → despache o agente `revisor-independente` (isolation worktree) uma vez
     por SHA de cabeça, com o BRIEF do nó no prompt, **um revisor por vez na máquina** (espere o anterior voltar
     antes de despachar o próximo; 5 sobrepostos em 07/11, e o dono relata que o PC trava na sabotagem), no máximo 3 rodadas por PR
     (D-2026-11-06-REVISAO-CONVERGENCIA). Rodada 1: o PR inteiro. Rodadas 2 e 3: ponha no prompt `rodada: <n>`,
     o SHA da rodada anterior e a lista de achados dela (do seu resumo, ou do resumo de ontem). Sem PASS na 3ª,
     não despache a 4ª: o PR vai ao lote marcado "repensar a abordagem". Se não deu para despachar, o PR vai ao
     lote marcado **sem revisor**; não some. Achado `P` (pré-existente) não segura o PR: o revisor o põe na caixa e
     ele segue pelo passo 3b (OPS-007). Nunca mergeie vermelho.
   - Não re-despache o revisor (D-2026-11-25-MATRIZ-DE-LACUNAS §8): PR que corrige achado de revisão fecha quando a
     reprodução do achado fica verde e o CI passa, e conta como rodada do PR de origem (8a; se tocar arquivo fora da
     localização do achado, vale a regra normal). Push que só faz merge da `main`, sem mudar arquivo do PR, não é SHA
     novo para a revisão (8c).
   - Nada de comentário público em PR; contexto vai no resumo.

3. Fila. Nó entra se: estado `ready`/`inflight`, `autorizacao` com 'executa' do dono, BRIEF ratificado, nenhum
   fork pendente, e ainda tem PR do BRIEF por abrir (um 'executa' cobre o BRIEF inteiro). Ordem: FILA-ORDEM.
   `node scripts/paralelo.mjs plano <NÓS>` → ondas. Abra uma sessão por nó da onda (no máximo 4 ao mesmo tempo,
   worktree próprio, `user_asked`), com este brief: "sessao-feature do <NÓ>, <PR-k> do BRIEF <caminho>; tsc dos
   dois lados, testes do nó, check:arch; fold com `plano-vault.mjs fold` no próprio PR; abre o PR e NÃO mergeia.
   Fork não coberto pelo BRIEF: pare o nó e me reporte o fork com contexto (evidência lida, opções, recomendada)."
   Nó sem BRIEF mas com autorização de planejamento → sessao-planejamento. Nó sem 'executa' → só lista.
   Todo brief de sessão termina com: "Lacuna fora do teu escopo vai à caixa (`node scripts/lacunas.mjs add`, regra
   D-2026-11-11-LACUNA-VAI-AO-MAESTRO §1; se a tua worktree não tem esse arquivo, o mesmo script está em
   `node "$HOME/.claude/tools/lacunas/lacunas.mjs" add`); a do teu escopo você resolve. Toda entrada leva os eixos da matriz (`--dominio`,
   `--gravidade` ou `--impacto <G1..G5>`, `--exposicao`, `--deteccao`, `--certeza`; G5 só o domínio;
   D-2026-11-25-MATRIZ-DE-LACUNAS). 1ª linha do relatório: LACUNAS NA CAIXA: <n> (sem G5) · G5: <m>.
   Registrou alguma? Rode `lacunas.mjs pulso`; se imprimir DRENO, proponha um cartão 'Drenar a caixa' e rode
   `pulso --marcar-dreno`. Não me mande lacuna por SendMessage."

3b. Lacunas da caixa (D-2026-11-11-LACUNA-VAI-AO-MAESTRO §2 e emendas de 21/11). Passo 0, nesta ordem, sem julgamento:
   `node scripts/lacunas.mjs sincronizar` (PR mergeado que toca o arquivo → resolvida; leia o diff de cada "conferir" e
   resolva ou reabra; fechado sem merge → aberta), `triar` (fork, gate, geração > 2 → com-dono), `list --paradas`
   (tempo no estado: abra a sessão agora ou escreva o motivo no resumo) e `list --grupos`.
   - **Meta do dreno (dono, 25/11, D-2026-11-25-MATRIZ-DE-LACUNAS):** zerar as não finais P0 e P1 de qualquer domínio e
     P2 do domínio `fiscal` (`list --abertas --prioridade meta`), não a caixa inteira; saem por prioridade, e as atrasadas
     (`list --prioridade atrasada`; prazo P0 1 dia, P1 7, P2 30) primeiro. Lacuna sem matriz (caixa legada, `--prioridade
     sem`) conta como meta até `classificar <id> --motivo "…" <eixos>`. G5 (nit/estilo) não abre sessão: vai de carona no PR que tocar o
     arquivo (`list --por-arquivo`) ou são descartadas com motivo.
   - **Admissão (§7 da mesma decisão):** só a meta, `fork` e `gate` são despachados. O resto `aberta` de G1–G4 é backlog
     (`list --backlog`, por P; o `pulso` conta): não abre sessão, só entra no BRIEF de sessão da meta que já vai tocar o
     mesmo arquivo e o mesmo comportamento. Uma vez por semana, o backlog vai ao dono na pergunta do dia; ele promove com
     `classificar <id> --admitir --motivo "…"` ou descarta.
   - **Resposta do dono a fork/gate da caixa** (pergunta do dia): `set <id> --estado aberta --classe <a da resposta>
     --destino "dono, <data>: <resposta>"`, ou `descartada` com o motivo, no mesmo ciclo. `com-dono` não é depósito.
   - **Grupo** (2+ lacunas não finais com arquivo em comum ou da mesma rodada) → uma `sessao-planejamento` do grupo, que
     resolve o conjunto pela causa comum ("no macro em vez de vários remendos", dono, 21/11). BRIEF **sem fork** (seção de
     forks vazia e nenhuma lacuna do grupo `com-dono`) → abra a `sessao-feature` dele no mesmo ciclo, citando no brief
     "dono, chat, 21/11: BRIEF de grupo sem fork — 'Sim, executa'". Com fork → pergunta do dia, e a execução espera.
     Um PR por item, `integration/<slug>` se 2+ PRs dividem arquivos; merge pela classe de risco. Vale só para grupo da caixa.
     Só as `aberta` do grupo vão a `em-sessao` ("planejamento do grupo <slug>"); `com-dono` fica com o dono e entra no
     BRIEF como fork pendente; `em-sessao`/`em-pr` seguem onde estão e o BRIEF as cita.
   - **Isolada** → a tabela §2: duplicada → descartada; defeito/débito → sessao-instrumentacao e depois sessao-correcao;
     spec que o BRIEF pedia → sessao-feature do nó; feature nova → sessao-planejamento.
   - Ao abrir a sessão, `lacunas.mjs set <id> --estado em-sessao --destino "<sessão>"` e, no brief, os ids, a autorização
     (D-2026-11-11 e a emenda de 21/11) e `--pai <id>`. Sessões de lacuna entram na mesma fila e no mesmo teto das de nó.
     Ordem: achado do caminho antes de achado de rodada (`--rodada`); defeito antes de débito; lacuna com
     `arquivoForaDaCheckout` ou em código de PR não mergeado espera a branch de origem. PR aberto → `em-pr --pr <n>`.
     As linhas novas vão à seção "Lacunas da caixa" do GAP-MAP no seu PR só de docs do dia.

4. Enquanto as sessões trabalham, não faça polling: você é retomada quando elas terminam. Ao voltar, vá ao passo 1.

5. Escolhas. Se uma sessão trouxer escolha que NÃO é de produto, de lei, de arquitetura nem irreversível, e
   houver opção recomendada, siga a recomendada e registre no resumo. Fork de verdade: junte todos e me pergunte
   UMA vez, por AskUserQuestion com contexto (recomendada primeiro); a resposta vira cédula em docs/plano/decisoes/.

FIM DO DIA — resumo (no chat, nesta ordem, só o que medi):
- Mergeados hoje (número · título · nó).
- Lacunas da caixa: a linha de `lacunas.mjs pulso` (com a meta e as atrasadas); depois id · origem · classe · matriz · P ·
  arquivo:linha · estado · destino. G5 numa linha só, com a contagem.
  Nenhuma aberta fica sem destino. **Grupos** (`list --grupos`): arquivos · ids · sessão de planejamento. **Paradas**
  (`list --paradas`): id · estado · dias no estado · motivo (sem vaga, espera o pai, aguarda PR, aguarda resposta).
  **Conferir** (`sincronizar`): id · PR · o que o diff mostrou.
- LOTE VERMELHO para eu aprovar: número · título · motivo do vermelho · CI · revisor (veredito e rodada 1–3;
  "repensar a abordagem" se a 3ª não passou; "só texto"; ou "sem revisor"). Peço por número. Abaixo de cada PR,
  um achado por linha: id (`A` introduzido, `P` pré-existente) · `arquivo:linha` · classe · destino (corrigido ·
  estava errado · era intencional · não importava; vazio enquanto não se sabe).
- Perguntas pendentes (se não perguntei ainda).
- Parado em mim fora do código: gates humanos, contador, dado externo — uma linha cada.
- Nós que andaram de estado e o que ficou para amanhã.

NUNCA: mergear vermelho (salvo a exceção D-2026-11-10-FAIXA1-MERGE-LIVRE); mudar a lista VERMELHO do classe-risco.mjs; preencher desfecho ou assinatura de runbook
de gate (H1/H2/M2/X1/X2); deploy; ratificar fork sozinho; reabrir bancada de auditoria; deixar lacuna da caixa
sem destino.
```
