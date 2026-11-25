---
id: "D-2026-11-25-CRITERIO-DE-ENTRADA-DA-CAIXA"
tipo: "decisao"
dominio: "processo"
titulo: "Toda lacuna entra com gravidade; só bug, gate e risco fiscal são a meta do dreno, e nit e estilo ficam fora da contagem"
estado: "decided"
autorizacao: "dono, chat, 2026-11-25: \"definir um critério de entrada. Só vira lacuna o que é bug, quebra de gate ou risco fiscal. Nit e estilo vão no texto do PR, sem entrar na contagem. Para a drenagem, a meta passa a ser zerar os itens de bug e de gate, não a caixa inteira.\" Refinado no mesmo chat (questionário): \"Vamos dividir melhor, bug seria defeito? nit e estilo devem tbm ganhar categoria\"; nit e estilo \"Na caixa, fora da conta\"; \"quebra de gate\" = \"Os dois\" (gate automático e gate humano); risco fiscal \"entra na meta\"; débito real, spec, feature e fork sem risco \"como melhoria\"; a sessão de fechamento classifica a caixa atual \"depois do merge\"."
atualizado: "2026-11-25"
---
# D-2026-11-25-CRITERIO-DE-ENTRADA-DA-CAIXA

**Estado:** `decided`. Emenda a [D-2026-11-11-LACUNA-VAI-AO-MAESTRO](D-2026-11-11-LACUNA-VAI-AO-MAESTRO.md) (§1 item 2,
§2 e §3), o OPS-007 de `.claude/skills/_OPERATING-GATES.md` e o passo 3b do `.claude/prompts/maestro.md`.

**Por quê:** a caixa recebia tudo com o mesmo peso. Nit de revisão, estilo e débito miúdo contavam igual a defeito, a
linha `LACUNAS NA CAIXA: <n>` inflava e o dreno tinha como meta esvaziar a caixa inteira, o que nunca fecha.

## Regra

### 1. Dois eixos: classe e gravidade

A **classe** continua dizendo qual sessão resolve (tabela §2 da D-2026-11-11: `defeito` → instrumentação e correção,
`fork` → pergunta do dia…). A **gravidade** é nova, obrigatória no `add`, e diz se a lacuna conta e se é meta do dreno:

| Gravidade | O que é | Conta em `LACUNAS NA CAIXA` | Meta do dreno (zerar) |
|---|---|---|---|
| `bug` | comportamento errado (é a classe `defeito`) | sim | sim |
| `gate` | gate quebrado: automático (tsc, `check:arch`, lint, teste vermelho, CI) **ou** humano/dado externo (PVA, NF-e, RFB, contador, deploy) | sim | sim |
| `fiscal` | risco fiscal, legal ou regulatório (cálculo, obrigação acessória, prazo, multa) | sim | sim |
| `melhoria` | débito real (código morto, duplicação, `atalho:` vencido, tipo frouxo), spec não entregue, feature nova, fork sem risco | sim | não |
| `nit` | detalhe sem efeito de comportamento (nome, comentário, ordem, mensagem) | **não** | não |
| `estilo` | formatação, convenção visual, preferência | **não** | não |

Coerência que o script impõe: `bug` só com classe `defeito`; classe `defeito` só com `bug`, `gate` ou `fiscal`; classe
`gate` só com gravidade `gate`. Gravidade `gate` aceita qualquer classe (quebra de `check:arch` costuma ser `debito`).

### 2. Na sessão que acha

- `node scripts/lacunas.mjs add … --gravidade <bug|gate|fiscal|melhoria|nit|estilo>`. Sem `--gravidade` o script recusa.
- **nit e estilo entram na caixa**, com a categoria, para não se perderem, e continuam listados no corpo do PR. Não entram
  na 1ª linha: `LACUNAS NA CAIXA: <n> (<ids>)` conta só bug, gate, fiscal e melhoria; nit e estilo vão ao lado, como
  `· nit/estilo: <m>`.

### 3. No maestro

- **Meta do dreno:** zerar as lacunas não finais de gravidade `bug`, `gate` e `fiscal`, não a caixa inteira. O `pulso`
  imprime a meta (`meta bug/gate/fiscal <n>`) e só pede o cartão `DRENO` quando há meta aberta ou lacuna sem gravidade.
  Gate humano conta na meta mesmo `com-dono`: a meta só zera quando o dono responde.
- **nit e estilo não abrem sessão:** vão de carona no PR que tocar o mesmo arquivo (`list --por-arquivo`). Não contam
  como paradas nem formam grupo. Ficam `aberta` até um PR as resolver ou o maestro descartá-las com motivo.
- **melhoria** segue a tabela §2 pela classe, depois da meta: bug, gate e fiscal saem primeiro.

### 4. Caixa legada

Lacuna gravada antes desta decisão não tem gravidade. Ela conta como meta até ser classificada (sem gravidade não dá para
saber se é bug), e o `pulso` mostra `sem gravidade <n>`. A classificação é trabalho da sessão de fechamento, depois do
merge deste PR: `node scripts/lacunas.mjs list --abertas --gravidade sem` e, para cada uma,
`node scripts/lacunas.mjs classificar <id> --gravidade <g> --motivo "<por quê>"`. `classificar` não muda o estado nem
zera o relógio das paradas.

## O que **não** muda

- O que é da tarefa a sessão termina (OPS-007 item 1); a gravidade é só do que fica fora do escopo.
- A tabela §2 da D-2026-11-11, os estados, `triar`, `sincronizar` e a autorização das sessões de lacuna.
- A moratória de aparato de auditoria: gravidade é campo de fila, não rodada nem revisor novo.
