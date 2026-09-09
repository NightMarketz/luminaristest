# Contrato de retorno de subagente

> **Isto é tráfego entre agentes, não reporte humano.** Denso de propósito. A metade humana do que um
> subagente descobre é outro artefato — `REPORTE-HUMANO-FORMAT.md`.

## O problema que ele fecha

As regras de retorno deste repo já existiam e **nenhuma era verificável**:

| Regra | Onde | Por que não era checável |
|---|---|---|
| **IMPL-004** — handoff carrega arquivos + checks com **exit codes reais** | `luminaris-implementer/SKILL.md:195` | o handoff é texto de sessão |
| **REV-003** — sem evidência do check, o veredicto é BLOCKED, **nunca PASS** | `luminaris-reviewer/SKILL.md` | idem |
| **OPS-001 gates 3 e 4** — caso adversarial tentado + checagem que teria falhado | `_OPERATING-GATES.md` | o revisor reprova "por forma" **se lembrar** |

O retorno de subagente **nascia e morria na sessão**. Nenhuma guarda alcançava ele — e o achado P4 do
teste de sistema de 2026-07-07 já tinha medido a consequência: o check por artefatos avulsos era
satisfazível implicitamente. A correção é de mecanismo, não de mais uma regra: **o retorno vira
arquivo**, e aí uma guarda pode olhar.

## O formato

Todo subagente encerra devolvendo isto — e **gravando o mesmo texto** em
`.claude/retornos/<slug-da-tarefa>.md`:

```
# RETORNO — <título curto>

tarefa: <o que foi pedido, uma linha>
agente: <qual persona/skill, e onde rodou — worktree própria?>
veredicto: PASS | FAIL | BLOCKED

### Arquivos
- <path> (NEW|EDIT|—) · ou "nenhum"

### Checks executados
- `<comando exato>` → exit <n>   ← o valor é produzido por máquina, não descrito
- `<comando>` → PASS (762/762)

### Gates de envio OPS-001
- Caso adversarial tentado: <qual caso e o que aconteceu>
- Checagem que teria falhado se errado: <teste vermelho→verde / comando / fixture assimétrica>
- Risco principal remanescente: <uma frase>

### Aberto
- <o que ficou; ou "nada">
```

### A metade humana, quando existe

Retorno que carrega **decisão do dono** (review, integração, planejamento) sai em **dois arquivos**:
o de máquina acima e, derivado dele, `<mesmo-nome>.dono.md` — no formato de
`REPORTE-HUMANO-FORMAT.md`. O humano **referencia** o de máquina; não recopia achado.

```
---
reporte-humano: v1
destinatario: dono — quem decide mergear e o que aceita como dívida
momento: derivado do retorno de máquina; escrito depois dele, nunca durante o trabalho
estado: em-branco
derivado-de:
  - .claude/retornos/<tarefa>.md
proibido-ao-agente:
  - ratificação
  - assinatura
---

# VEREDICTO PARA O DONO — <alvo>

**Recomendação:** APROVADO | REPROVADO — <uma frase>
**O que você aceita se mergear:** <a dívida/limite nº 1, em uma frase>
**Decisões que são suas e eu NÃO tomei:** <fork aberto, aceite de dívida, sign-off — ou "nenhuma">

Achados por arquivo e exit codes: `.claude/retornos/<tarefa>.md`.
```

**Três estados, não dois.** `BLOCKED` é saída honesta — sem ele o binário convida a forçar um PASS.
É o mesmo desenho do desfecho de runbook (`RUNBOOK-FORMAT.md`), pelo mesmo motivo.

## A captura

`.claude/retornos/` é **gitignored** (`.gitignore:32`): o retorno é efêmero e pode conter conteúdo
colado — transcript, saída de comando, trecho de arquivo do usuário. O artefato real do trabalho já
está no commit.

Dois caminhos, e **hoje só o segundo está ativo**:

| Caminho | Grava onde | Estado | O que falta |
|---|---|---|---|
| **Mecanismo** — hook `SubagentStop` → `.claude/hooks/capture-subagent-return.mjs` | `.claude/retornos/_hook/` | ⛔ **não registrado** | o bloco `hooks` no settings. O script existe e está provado contra transcrição real e contra o esquema de payload do binário 2.1.260. Duas travas independentes impedem o agente de registrá-lo: o `deny` de `Edit/Write(.claude/settings.json)` (`.claude/settings.json:14`) e o classificador do harness, que barra escrita de configuração de hook mesmo em `settings.local.json`. **É uma edição do dono.** |
| **Convenção** — o prompt de despacho manda o subagente gravar como último passo | `.claude/retornos/*.md` | ✅ ativo | nada; mas é convenção: subagente que ignora não deixa rastro |

**Os dois capturam coisas DIFERENTES, e isso é desenho, não acidente.** O hook grava a última
**mensagem de chat** do subagente — um resumo. O contrato é o arquivo que o subagente escreve ele
mesmo. Medido no mesmo despacho: **2.837 bytes** de mensagem final × **11.058 bytes** de retorno de
contrato, e `retorno-check` reprova o primeiro com 4 achados (sem cabeçalho, sem seção OPS-001). Se
dividissem o mesmo diretório, a guarda ficaria vermelha em todo despacho e alguém a desligaria —
que é como um gate morre. Por isso `_hook/` é subdiretório e fica fora da varredura.

**O que o hook resolve é o DENOMINADOR.** Sem ele, "capturados / despachados" sai da contagem de
quem despachou, que é alegação. Com ele, `retorno-check` compara os dois lados e **reprova** quando
há despacho sem retorno de contrato.

### O campo certo — corrigido por review adversarial

> **⚠️ Correção de 2026-09-09.** A versão anterior deste doc afirmava que o campo era
> `payload.transcript_path`, "verificado no `cli.js`". **A afirmação era falsa e a evidência era
> código morto:** o `cli.js` auditado vinha do cache `_npx/` e era a **v1.0.128 (out/2025)**; o
> binário em execução é o **2.1.260**. Classe `stale-dev-server-serves-old-code` — auditar o
> artefato errado dá uma resposta com toda a cara de verificada. Achado pelo revisor independente;
> reconferido por leitura direta do binário que roda.

Esquema real do `SubagentStop` no **2.1.260**, lido de `claude.exe`:

```
hook_event_name:"SubagentStop", stop_hook_active, agent_id, agent_transcript_path,
agent_type, last_assistant_message?, transcript_path, cwd, …
```

- **`transcript_path` é o da SESSÃO-MÃE.** Ler dele faria *todo* despacho cair na guarda de
  sidechain, e o denominador que o hook existe para produzir seria **zero para sempre**.
- **`agent_transcript_path`** é o do subagente. É o que o script lê, com `transcript_path` só como
  reserva para harness antigo (e a reserva é marcada em `campoUsado`).
- **`last_assistant_message`** é o texto final segundo o próprio harness — fonte preferida quando
  vem, e resolve de graça o defeito abaixo.

**O outro achado do review, medido:** **79 de 550** transcrições reais (14,4%) terminam num evento
só-`tool_use`; reparsear "último texto de assistente" ali pega **preâmbulo** (mediana 116 B). Com
`last_assistant_message` isso não acontece; sem ele, o meta marca `retorno_pode_ser_preambulo`.

**Reserva do nome:** `.meta.json` irmão falta em **34/550** e vem sem `description` em **103/550** —
por isso o nome sai de `agent_type`/`agent_id` do payload, com o meta e o 1º prompt como reserva.

O modo de falha perigoso continua sendo a transcrição da **sessão-mãe** entrar como se fosse do
subagente: aí a última mensagem de assistente é a do orquestrador, e a captura sai plausível e
errada — arquivo do tamanho certo, no lugar certo, com o texto errado.

Discriminador **medido** neste repo em 2026-09-09, não suposto:

| Arquivo | `isSidechain: true` | `agentId` |
|---|---|---|
| `subagents/agent-<id>.jsonl` (subagente) | **550 / 550** transcrições, 100% dos eventos | em todos |
| `<session-id>.jsonl` (sessão-mãe) | **0 / 209** | ausente em todas |

Esta é a única parte da afirmação original que **resistiu ao ataque**: o revisor varreu 772
transcrições em 100 projetos, incluindo `spawnDepth` 2 e 3 (8/8 e 2/2, todas 100% sidechain), e não
achou contra-exemplo em nenhuma direção.

O script aborta com `_transcript-nao-e-de-subagente-<ts>.erro.json` quando não há **nenhum** evento
`isSidechain: true`. Captura errada silenciosa vira captura ausente visível.

### Atribuição — qual contrato é de qual despacho

O hook grava `contrato_encontrado` no `.meta.json` de cada captura, decidido pela **janela de tempo**
do próprio despacho (1º ao último evento da transcrição, ±2 min). Casar por nome seria frágil: o slug
que o subagente escolhe raramente bate com o `description` do despacho (`"Dívida zinc no my-app"` ×
`divida-zinc.md`).

**A janela sozinha não atribui, e isso está medido.** Com 5 subagentes concorrentes, a janela de cada
um contém os 5 contratos — contar par-a-par diria "todos cobertos" mesmo se só 3 tivessem escrito.
Por isso a cobertura fecha pela **união**: *n* despachos exigem *n* contratos **distintos** na união
das janelas. Provado nos dois sentidos:

```
5 despacho(s) capturado(s) · 5 retorno(s) distintos na união — cobertura completa.   exit 0
5 despacho(s) capturado(s) · 3 retorno(s) distintos na união
  DÉFICIT de 2 … com despachos concorrentes não dá para dizer QUAL ficou sem.        exit 1
```

O que ela **não** faz: apontar o culpado sob concorrência. Diz que faltou, não de quem.

### Custo e retenção — medidos, não estimados

| Medida | Valor |
|---|---|
| Tempo de parede, 7 transcrições reais (284–516 KB), 5 rodadas cada | mediana **58–61 ms**, máx **68 ms** |
| Pior caso sintético (transcrição inflada a **5 MB**) | mediana **80 ms**, máx **85 ms** |
| `timeout` do bloco | **5 s** — 59× o pior caso medido (era `15`, chute) |

Retenção: **14 dias**, o mesmo número já usado pelo sink NDJSON de erros do server
(`npm run logs:errors`) — reusar a convenção existente evita inventar política nova. Roda a cada
captura, conta em `podados_por_retencao`, e desliga com
`LUMINARIS_RETORNOS_RETENCAO_DIAS=0`. Medido: 3 arquivos de 30 dias removidos, o recente preservado.

## A guarda

```bash
node scripts/retorno-check.mjs            # modo diretório — uma linha por retorno, exit 1 se algum reprova
node scripts/retorno-check.mjs --path <f>
node scripts/retorno-check.mjs --self-test
```

Regras, todas com nome no relatório: `SEM-CABECALHO` · `VEREDICTO-INVALIDO` · `SEM-OPS001` ·
`OPS001-INCOMPLETO` · `OPS001-VAZIO` (molde preenchido com o próprio molde) · `CHECK-SEM-EVIDENCIA` ·
`PASS-SEM-CHECK`.

**Não vai para o CI, e isso é decisão, não esquecimento.** `.claude/retornos/` não é versionado — um
job de CI olharia para um diretório sempre vazio e ficaria verde para sempre. Isso é decoração, não
cobertura. A guarda roda na máquina que despachou.

## Baseline — 2026-09-08, primeiro lote real

Sem isto, "instalado" é alegação. 5 despachos (`general-purpose`, tarefas read-only reais neste repo),
prompt de despacho exatamente como as skills passaram a prescrever:

| Medida | Valor |
|---|---|
| Capturados / despachados | **5 / 5** — a convenção pegou em todos, sem lembrete extra |
| Reprovam (guarda corrigida) | **0 / 5** |
| Reprovam (guarda como escrita primeiro) | **1 / 5** — e os **3 achados eram defeito da guarda**, não do retorno |
| Linhas: mín · mediana · máx | 59 · **68** · 101 |

**O número que importa não é o 5/5 — é o 3/3 de falso positivo.** O primeiro lote real reprovou um
retorno **bom** por três motivos, todos meus: veredicto `FAIL — <razão>` (forma boa) lido como
inválido; rótulo do gate 4 escrito "…se eu estivesse errado" em vez de "…se errado"; e `**negrito**`
no início de linha contado como bullet de check. Os três viraram conserto com o caso que os
falsifica no mesmo commit.

**Um quarto defeito o lote NÃO achou** — só quebrar a guarda contra um artefato **real** achou:
`reporte-humano-check` era **cego em CRLF**. Em JS `.` não casa `\r`, então todo detector terminado
em `(.*)$` casava zero nos runbooks (Windows, autocrlf) — um runbook com assinatura forjada passava
**verde**. As fixtures eram LF e não reproduziam o formato do dado real: classe
`sintetico-nao-cobre-formato-de-dado-real`. O self-test agora roda a fixture ruim **nas duas
convenções de linha** e falha se o veredicto mudar.

Lição operável: **lote real calibra a guarda contra o que os agentes de fato escrevem; quebrar contra
artefato real acha o que o lote não alcança.** Os dois são necessários, e nenhum dos dois é a fixture.

## Review adversarial independente — 2026-09-09

Um agente separado recebeu uma instrução só: **derrubar** as duas guardas, medindo o lado que o autor
nunca mediu. Resultado: **16 ataques construídos, 16 passaram.**

**Achado de classe, e é o que importa:** os 4 afrouxamentos anteriores — todos feitos para matar falso
positivo — moveram cada regra do eixo *"tem de exibir saída de máquina"* para o eixo *"tem de ser
texto não-vazio e não-molde"*. **Texto é o único recurso que quem forja tem de graça.** Não foi troca
na mesma moeda: cada correção alargou a aceitação exatamente na dimensão que o mentiroso controla.
Segunda classe: as duas guardas conferiam campo **autodeclarado por quem elas restringem**
(`estado:`, `veredicto:`), e ambos **desligavam** checagens.

Os cinco piores, reproduzidos com fixture própria antes de consertar:

| # | O que passava | Causa raiz | Conserto |
|---|---|---|---|
| **H9** | agente troca `estado` para `assinado` e assina "em nome do dono" — a guarda imprimia *"nenhum campo proibido preenchido pelo agente"* | o ramo `assinado` conferia **presença**, nunca **autoria** | autoria vale nos dois estados: assinatura com cara de agente é achado sempre |
| **H1** | lista `proibido-ao-agente` **curta** desligava os detectores do núcleo | a lista **substituía** o núcleo; declarar `- ratificação` era mais barato que omitir a lista | **união**: a lista estende o núcleo, nunca subtrai |
| **R6** | `veredicto: PASS` com `- PASS` como único check | a palavra do veredicto servia de evidência do veredicto | check exige **comando + resultado**, não só resultado |
| **R3** | `Caso adversarial tentado: nenhum — não tive tempo` | reprovava quem **esqueceu** e aprovava quem **declarou que não fez** | regra `OPS001-CONFISSAO` |
| **H6** | evidência colada em **bloco cercado** sob o rótulo (a forma canônica de colar log) lida como vazia | detector lia só o resto da **mesma linha** | lookahead que enxerga bloco cercado, parando em `>` (orientação, não saída) |

### Os outros 11, reproduzidos e fechados (2026-09-09)

Reproduzi um a um com fixture própria, contra as guardas já corrigidas. **Dois já tinham fechado de
carona** (R2 `0/0` e R1 prosa-com-número, pelo aperto "comando + resultado"); **oito estavam abertos**;
o nono, de cobertura, foi medido à parte. Consertos por causa raiz:

| # | O que passava | Conserto |
|---|---|---|
| **R9** | molde colado em cerca de código lido como cabeçalho; o veredicto real (`aprovado com ressalvas`) nunca era validado | campo extraído fora de cercas **e de comentários HTML** |
| **R5** | `veredicto: FAIL` — que bloqueia merge alheio — afirmando defeito grave com zero comando | `VEREDICTO-SEM-CHECK` vale para PASS **e** FAIL (`BLOCKED` fica de fora: REV-003 o legitima) |
| **R4** | 8 alegações movidas para `### Achados (verificados)`, fora do alcance | escopo passou a ser o **documento inteiro**, não a seção de nome canônico |
| **H2** | assinatura de verdade dentro de colchete (`[agente Claude…]`) caía do lado "molde" | autoria checada na linha **crua**, não só nas "preenchidas" |
| **H3** | `assinado` + lista curta não exigia assinatura nenhuma | `assinado` exige **âncora de autoria**: assinatura **ou** `ratificado-por:` |
| **H4** | `derivado-de` escalar pulava a checagem de existência | escalar conta como lista de um |
| **H5** | `momento` declarava a violação da Fixação 2 e passava | denylist de confissão, **com lookbehind de negação** |
| **H7** | denylist de 7 plateias não pegava "os interessados / a diretoria" | virou **allowlist de papéis** — papel novo se acrescenta deliberadamente |
| **#9** | **6 artefatos podres plantados, a varredura viu "1 de 14"** | varre o repo inteiro (menos `IGNORAR` e fixtures), entra em `.claude/`, tolera BOM/linha em branco antes do frontmatter |

**O único que continua aberto é o R4 na sua forma forte** — 1 check real e 8 afirmações não provadas.
A guarda agora enxerga a seção renomeada, mas **a relação entre o comando e o claim não é
text-checkable**: é o problema da invenção com outra roupa. Declarado, não maquiado.

**Efeitos colaterais que os consertos causaram, e foram consertados também:** o lookahead de evidência
reprovou 5 blockquotes de *orientação* em 3 runbooks reais; a exigência de comando reprovou 2 linhas
de *totalização*; o detector de `momento` reprovou o painel por causa de "**nunca** durante o loop";
a varredura ampliada reprovou as próprias fixtures; e `assinado` sem exceção reprovou as 4 cédulas —
que **não tinham âncora de autoria nenhuma**, achado real da minha própria metadata, fechado com
`ratificado-por:` transcrito do que cada arquivo já afirma no corpo.

**Os 14 viraram fixture permanente** em `scripts/fixtures/ataques/` (5 da 1ª rodada + 9 desta), e cada uma declara
`ESPERA: <motivo>`. Isso não foi de graça: a primeira versão assertava só `n > 0` e **era falsificador
fraco** — revertendo o conserto H1, a fixture continuava reprovando (por outro achado) e o self-test
ficava **verde com o buraco aberto**. Classe `comentario-de-teste-afirma-o-que-nao-assere`. Sonda que
prova a correção:

```
SONDA: reverto o conserto H1
    humano-H1-lista-curta.md   1 problema(s) · motivo esperado ✗ AUSENTE
::error::self-test FALHOU: não reprovou pelo motivo que documenta. O buraco foi reaberto.
```

**O que continua passando, declarado:** prosa **inventada**. `"Caso adversarial tentado: tentei o caso
X e passou"` é indistinguível de verdade para qualquer leitor de texto. A guarda pega o molde, a
confissão e a forma; **não pega a mentira bem escrita** — para isso só serve rodar o comando de novo.

## O que ele não alcança

- **Mérito.** Seção preenchida não é caso adversarial bom.
- **Veracidade do exit code.** O retorno é texto; a evidência dura é rodar o comando de novo.
- **Despacho não capturado.** A guarda só vê o que chegou ao disco. Diretório vazio depois de um lote
  significa **captura desligada**, e o script diz isso em vez de sair verde — é o único jeito de a
  ausência não passar por sucesso.

## Lacuna registrada, não resolvida — revisor independente sobre os 11 consertos (2026-09-09)

Os 5 primeiros consertos (H9/H1/R6/R3/H6) tiveram revisor independente. Os 11 seguintes (R9, R5, R4,
H2, H3, H4, H5, H7, #9, e as correções de falso-positivo que eles causaram) foram conferidos só pelo
mesmo agente que os escreveu — sem terceiro. **Não abro rodada de revisor para fechar isto agora**:
o `CLAUDE.md` §⛔ proíbe montar aparato de auditoria novo (gate, rodada ou revisor) enquanto o Bloco A
do `ACCOUNTING-MASTER-MAP.md` tiver oráculo externo aberto há mais de 14 dias — hoje ainda **4 de 4**
(confirmado em `ACCOUNTING-MASTER-MAP.md:640`, 2026-09-09). Uma rodada de revisão sobre a guarda de
evidência-fabricada É essa classe de aparato, ainda que o motivo pareça bom. Decisão do dono, mesma
data: respeitar a moratória. Reabre quando o Bloco A fechar — não antes, e não por iniciativa própria
do agente.
