---
id: "D-2026-11-25-BRANCH-LONGA-E-TURNOS"
tipo: "decisao"
dominio: "processo"
titulo: "Branch longa com poucos PRs, revisão extensa à noite e maestro agendado: implementação de dia, um teste bem feito por PR"
estado: "decided"
autorizacao: "dono, chat, 2026-11-25: \"Não da pra só criar aqui os bots e colocar eles pra trabalhar?\" (maestro e classificador agendados); \"Agora cria a infraestrutura com implementador, com revisor etc, não seria interessante pegar uma branch pra trabalhar em implementações grandes por dia e fazer a revisão a noite?\"; \"Agora devemos trabalhar em branchs longas com poucos pr's para que tenhamos que testar pouco, mas testar de forma extensa e com qualidade. Para que 1 teste bem feito valha mais que 100 testes pequenos diários\"; questionário de 25/11: hora da revisão = '02:00', PR de regra = 'Sim, abre o PR'"
atualizado: "2026-11-25"
---
# D-2026-11-25-BRANCH-LONGA-E-TURNOS

**Estado:** `decided` nas três frases do dono citadas acima. Os pontos marcados **(leitura do agente)** são a forma que
o agente deu à diretriz; o dono os confirma ou corrige ao aprovar este PR no lote.

**Emenda:** a seção "Pilhas e tamanho de PR" do CLAUDE.md (08/11), a Regra 1.4 de
[D-2026-11-10-BRANCH-DE-INTEGRACAO-E-GAP-MAP-POR-FEATURE](D-2026-11-10-BRANCH-DE-INTEGRACAO-E-GAP-MAP-POR-FEATURE.md),
o passo 2 do maestro em [D-2026-10-28-FLUXO-AUTONOMO](D-2026-10-28-FLUXO-AUTONOMO.md) e o item 4 de
[D-2026-11-11-EXPERIMENTO-LOTE-DE-REVISAO](D-2026-11-11-EXPERIMENTO-LOTE-DE-REVISAO.md).

**Regra ⛔ da bancada:** não cria gate, não cria revisor e não aumenta o teto de 3 rodadas por PR. O agente é o mesmo
`revisor-independente`, nos mesmos PRs (vermelho de código). Muda quem o despacha (o turno da noite), a hora e o
tamanho do que ele recebe. A passagem de turno (§3) é um arquivo de texto que os dois turnos leem; nenhum script o
confere e ele não reprova nada. A passada integrada (§2.4) é despacho a mais do mesmo agente dentro da rodada 1 e fica
como exceção pedida ao dono neste PR.

## 1. Branch longa, poucos PRs

1. **A unidade de trabalho é a `integration/<slug>`**, que vive dias. Vale para nó com BRIEF, grupo da caixa e dreno
   de lacunas da mesma área. Trabalho de PR único, sem irmãos, segue direto na `main` (Regra 1.6 de 10/11).
2. **O PR é por fase que se testa junta, não por item.** PR-0 de contrato, quando o BRIEF tem, continua próprio e
   entra antes. Depois dele, o menor número de PRs que a dependência permitir. Cada item do BRIEF (ou cada lacuna)
   vira **um commit** dentro do PR da fase, com o id no título do commit. O rastro por item fica no commit.
3. **BRIEF já ratificado com PR-1..n pequenos (leitura do agente):** os PRs ainda não abertos podem ser juntados num
   PR de fase, na ordem do BRIEF e sem mudar escopo, um commit por PR-k. PR que já está aberto segue como está.
4. **O PR nasce em draft e fica em obra.** O CI roda a cada push (`ci.yml`, `pull_request`). O implementador tira o
   draft quando a fase fecha com CI verde. Só PR fora de draft entra na revisão da noite.
5. **Lacunas (leitura do agente):** as da meta que tocam a mesma área saem juntas numa integração de dreno, um PR por
   lote. P0 (prazo de 1 dia) e gatilho `vazamento` não esperam o lote: PR próprio, direto na `main`.
6. **A integração recebe a `main` por merge todo dia** (Regra 1.5 de 10/11), no começo do turno do dia. Conflito vai a
   uma `sessao-integracao`.
7. **A `main` recebe um PR `integration/<slug>` → `main` no fecho**, pela classe de risco. Branch longa quase sempre
   é vermelha, então vai ao lote do dono com o veredito da revisão extensa.
8. A profundidade 2 (`main` → integração → pilha) e o aviso de integração parada há mais de 14 dias continuam.

## 2. Turnos

1. **Dia: implementação.** O maestro roda às 08:00 por agendamento do T3. Mede, mergeia o verde, lê a passagem da
   noite, monta o lote vermelho e abre as sessões (`sessao-feature`, `sessao-correcao` e as outras). O implementador é
   a sessão que o maestro abre; não existe segundo despachante na mesma fila. **De dia o maestro não despacha o revisor.**
2. **Noite: revisão extensa.** O turno da noite roda às 02:00 (`.claude/prompts/revisor-noturno.md`). Revisa PR
   vermelho de código, fora de draft e com CI verde, **um revisor por vez**. Não mergeia, não corrige, não abre sessão.
3. **Fatias.** O PR grande é revisado em fatias por área, cada uma com até 4 commits de item. É o tamanho de lote que
   o experimento de 11/11 validou. O veredito é do PR: uma fatia com FAIL reprova o PR.
4. **Passada integrada.** Depois das fatias, um despacho sobre o diff inteiro do PR, só para o que cruza fatias:
   contrato entre camadas, migração, atomicidade e o que o BRIEF pede no conjunto. O experimento mostrou que lote
   grande serve para varredura; aqui ele é usado assim, e as fatias seguem como gate.
5. **Rodadas.** Rodada 1 = o PR inteiro (fatias + passada integrada). Rodadas 2 e 3 = só o diff novo e as linhas dos
   achados, como em `D-2026-11-06-REVISAO-CONVERGENCIA`. Sem PASS na 3ª, o PR vai ao lote como "repensar a abordagem".
6. **Dentro da integração**, o merge de PR vermelho de código espera o PASS da noite (a Regra 1.4 continua; muda a
   hora). O implementador segue empilhando por cima enquanto espera.
7. **Recuo.** Se a noite não deixou passagem (PC desligado, agendamento parado), o maestro despacha o revisor de dia,
   como antes, para a revisão não parar em silêncio.
8. **PRs do regime antigo** (pequenos, já abertos): a noite os revisa em lotes de até 4 da mesma área, um revisor por
   lote e veredito por PR (adoção de 11/11, que não estava escrita no prompt do maestro).

## 3. Passagem de turno

Pasta `<git-common-dir>/turno/`, ao lado da caixa de lacunas: visível de toda worktree, nunca versionada.

- `revisao-AAAA-MM-DD.md`, escrita pela noite. 1ª linha: `NOITE <data> · revisados <n> · PASS <a> · FAIL <b> ·
  BLOCKED <c> · ficaram <ids>`. Um bloco por PR: `## #<n> · <SHA de cabeça> · rodada <k> · <veredito>`, e abaixo os
  achados `A` e `P` no formato do revisor, com a reprodução.
- `maestro-AAAA-MM-DD.md`, escrita pelo maestro: cópia do resumo do dia.

Motivo: cada execução agendada abre um thread novo, sem o "resumo de ontem" que o maestro usava para saber a rodada, o
SHA anterior e os achados. Sem o arquivo, o mesmo SHA seria revisado de novo e o teto de 3 rodadas se perderia.

## 4. Agendamentos no T3 (criados em 25/11)

| Bot | Quando | Prompt |
|---|---|---|
| Maestro diário | 08:00 | `.claude/prompts/maestro.md` |
| Revisor noturno | 02:00 | `.claude/prompts/revisor-noturno.md` |
| Classificador da caixa | a cada 2 h, até zerar as sem matriz; depois se desliga | texto no agendamento |

O texto do agendamento cita a frase do dono e manda ler o arquivo. O arquivo é a fonte: mudou o arquivo, mudou o bot
na execução seguinte. O PC precisa estar ligado nas duas horas.

## 5. Custos conhecidos

- **Cada rodada de revisão leva um dia.** PR com FAIL só volta ao revisor na noite seguinte; três rodadas são três
  noites. O recuo do §2.7 não acelera isso. O dono pode pedir revisão de dia para um PR, por número.
- **Defeito aparece mais tarde.** Entre o commit e a revisão passam dias, não horas. O CI a cada push segura o que
  teste pega; o que só a leitura pega espera o fim da fase.
- **Experimento de 11/11:** nenhum tamanho de lote perdeu defeito plantado, mas os lotes grandes acharam menos
  problema fora do plantado. Por isso as fatias de até 4 continuam sendo o gate (§2.3) e o diff inteiro é só varredura.
- **Quase nada mais entra como verde.** O merge automático do maestro encolhe e o lote do dono passa a ter menos PRs,
  maiores.
- **Branch longa diverge da `main`.** O merge diário (§1.6) contém isso, com custo de conflito recorrente.
