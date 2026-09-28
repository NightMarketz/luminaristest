# Tuning por modelo — Opus 5.5 (ativo), Opus 4.8 e Fable 5 (referência)

> Complemento **modelo-específico** das três camadas portáveis (gates / guia / traços — que são
> agnósticas de modelo). Fonte: documentação oficial Anthropic (migration guide → "Migrating to
> Claude Opus 5", "Migrating to Claude Opus 5.5", "Migrating to Claude Fable 5"; guia de
> prompt-audit da skill `claude-api`). Grau: **verificado nas docs oficiais** (2026-09-26), não
> reproduzido em benchmark próprio.
>
> **O achado central — a direção da prescrição muda por geração:**
> - **Opus 5 / 5.5 (ativo):** *super*-alcança — delega a subagentes livremente, verifica o próprio
>   trabalho sem pedir, pode expandir escopo. Guidance "delegue mais / verifique no fim" escrita
>   para o 4.8 agora **causa** custo e over-verification. Contrato fica; empurrão sai.
> - **Opus 4.8 (histórico):** *sub*-alcançava capacidades de decisão explícita — precisava de
>   gatilhos "chame isto quando…". Gatilho em `description` de skill continua certo (skills ainda
>   sub-disparam); o que saiu foi o empurrão de delegação no corpo.
> - **Fable 5:** prescrição passo-a-passo *degrada* o output (ver seção própria).

## Opus 5.5 — o que vale neste repo (modelo ativo)

**1. Contrato ≠ empurrão.** Contratos deste repo (STOP DynamicTable×Prisma, cadeia de camadas,
gates binários OPS-001..004, review independente por agente separado, sessões com autorização
citável) **não entram em nenhuma dose** — restrição explícita com motivo não degrada modelo nenhum.
O que se ajusta por modelo é só o empurrão comportamental abaixo.

**2. Subagentes — delegar pouco, não mais** (inversão do 4.8). Delegue só trabalho grande,
genuinamente independente e paralelizável (investigação larga multi-arquivo); não para meia dúzia
de leituras/edições nem para "conferir o próprio trabalho". A exceção sancionada é o **revisor
independente** (`sessao-feature` regra de review, memória `reviewer-independence-separate-agent`):
é contrato de independência, não verificação de rotina — fica.

**3. Sem scaffolding de verificação genérico.** O modelo já verifica sozinho; "faça uma checagem
final", "re-verifique antes de responder", "use um subagente para verificar" causam
over-verification sem ganho — **delete, não reescreva**. Não confundir com os gates OPS-001 (que
pedem *artefato* no texto, não re-trabalho) nem com gate mecânico (`tsc`, `skill-audit`, CI).

**4. Escopo e acabamento** (snippet oficial, reduz expansão de escopo a ~0):

> Entregue o que foi pedido, no escopo pretendido. Resolva ambiguidade como um colega cuidadoso:
> faça as escolhas de rotina você mesmo e só pergunte quando leituras diferentes levariam a
> trabalho materialmente diferente. Se concluir que o pedido está errado ou há abordagem melhor,
> diga numa frase e siga com o pedido como feito. Termine a tarefa inteira; se algo não puder ser
> concluído, faça o resto e diga claramente o que falta e por quê.

Isto subsume a antiga "autonomia em micro-decisões" do 4.8 (mesma regra em `luminaris-implementer`).

**5. Guarda de recall em review — continua valendo.** "Só reporte high-severity" / "seja
conservador" é seguido literalmente e derruba recall. Reporte-tudo com confiança+severidade,
filtre downstream. `luminaris-reviewer` limpo do padrão (grep 2026-09-26) — manter limpo é regra.

**6. Nunca pedir reprodução do raciocínio interno** no texto da resposta ("mostre seu raciocínio",
seção obrigatória de raciocínio) — no Opus 5.5 pode ser recusado como `reasoning_extraction`
(sem retry em fallback). Pedir *evidência* (comando + saída, arquivo:linha) é outra coisa e fica.

**7. Pensamento é sempre ligado; `effort` é o controle** (default da API = `medium`). Não
escreva "pense mais/menos/passo a passo" em skill — ajuste `effort` na sessão. Regra "não pense"
não pode ser cumprida.

**8. Frontend:** "evite cara de IA genérica" só troca um default por outro; lista que **nomeia**
os padrões a evitar funciona (o `frontend-design-system` já faz isso com tokens `neutral-*`/`zinc-*`).

**9. Narração** — atualizações entre tool calls vêm como blocos de thinking; não adicione
supressores ("não narre", "segure os achados até o fim") nem cadência "resuma a cada N".

## Opus 4.8 — histórico (se o repo voltar a rodar nele)

Gatilhos explícitos por capacidade ("quando a tarefa se espalha por itens independentes, delegue
a subagentes"; "cheque a memória antes de tarefas longas"), autonomia em micro-decisões e guarda
de recall. **Não reaplicar o empurrão de delegação em Opus 5.x.**

## Fable 5 — referência (se este repo voltar a rodar nele)

Snippets oficiais completos em "Prompting Claude Fable 5" (docs.claude.com). Os que importam aqui:

- **Anti-overplanning:** "When you have enough information to act, act…" — Fable delibera demais
  em tarefa ambígua.
- **No-tidying em effort alto:** "Don't add features, refactor, or introduce abstractions beyond
  what the task requires…" (≈ ponytail oficial).
- **Claims auditados / verificador de contexto fresco / memória um-fato-por-arquivo /
  lead-with-outcome / fronteira assess-first:** já codificados como OPS-001..004 + T1–T8 + guia —
  a doc oficial **converge** com as três camadas; nada a adicionar, grau promovido.
- **Nunca** instruir o modelo a reproduzir o raciocínio interno no texto de resposta — dispara
  refusal `reasoning_extraction`. Auditar skills por instruções "mostre seu raciocínio" antes de
  migrar.
- **Escopo do A/B de des-prescrição** — "prescrição" tem duas espécies que se comportam diferente
  em Fable; só uma entra no A/B:

  | Espécie | Exemplo neste repo | Ao rodar em Fable |
  |---|---|---|
  | **Contrato** (o quê / never / invariante) | STOP DynamicTable×Prisma, cadeia de camadas, gates binários OPS-001..004 | **Fica intocado** — restrição explícita não degrada; a doc oficial manda nunca simplificar o pedido explícito |
  | **Scaffolding** (como / passo-a-passo) | generation contracts passo-a-passo, skills geradoras com steps numerados | **Entra no A/B** — é isto que degrada o output em Fable |

  Fonte: migration guide → "Migrating to Claude Fable 5" ("de-prescribe migrated prompts and
  skills") + política de nunca simplificar o explicitamente pedido. Grau: verificado nas docs
  oficiais (2026-07-08).
- Turnos longos por padrão (minutos): planejar timeouts/streaming/progresso antes de migrar.
- Refusals de classifier (cyber/bio) retornam HTTP 200 + `stop_reason: "refusal"` — código de API
  deve checar `stop_reason` antes de ler `content` e opt-in em `fallbacks` para `claude-opus-4-8`.

## Regra de manutenção

Item novo entra aqui só com fonte oficial ou medição própria; o que for agnóstico de modelo sobe
para o guia/gates/traços. Ao trocar o modelo ativo do repo, revisar esta página **antes** de
ajustar qualquer prompt.
