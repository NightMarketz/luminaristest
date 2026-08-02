# Continuação da bancada — estado em `e0dccad`

Documento de retomada. Escrito ao fim da sessão que produziu o PR #164 e atualizado na
sessão seguinte, que fechou os itens 1 e 2 da fila.

---

## O que existe no disco

| Artefato | Estado |
|---|---|
| `docs/audit/AV-R1.md` + `.json` | rodada 1 · 4 achados · AV-16 a AV-19 |
| `docs/audit/AV-R2-COBERTURA-AUSENTE.md` + `AV-R2.json` | rodada 2 · 110 obrigações de teste · AV-20 |
| `docs/audit/AV-R3-FORCA-DA-SUITE.md` + `.json` | rodada 3 · `mutation_score` 2/7 · AV-03 |
| `scripts/bancada-gate.mjs` | gate de 9 checagens · **passa** · as 9 com mordida provada |
| `docs/audit/bancada.html` | **v4/v4.1 reconstruída** · 29 itens · 15 blocos |

## O que foi perdido, e como (histórico — já resolvido)

Numa sessão anterior, `git checkout -- docs/audit/bancada.html` foi usado para reverter uma
mutação de teste. O arquivo é rastreado e as edições v4/v4.1 estavam **sem commit** — o
comando restaurou o `HEAD` e apagou tudo.

A reconstrução (`e0dccad`) foi autoria guiada pelos três relatórios e pelo gate, não
recuperação: não havia cópia no disco nem no git. Ficaram no lugar `t-av00` (v4 integral),
`t-av03`, `t-av16`, `t-av17`, `t-av18`, `t-av19`, `t-av20`, `t-v4patch`, as emendas v4.1 em
`t-v3`, `t-contrato` e `t-padrao`, e a fiação JS (catálogo, `CAT`, aplicabilidade, `gateMap`,
badge v4, projeção de `conventions[]`/`inquiry[]`/`demonstration`/`reduced_capabilities`).

Os três erros B3 fecharam **porque a bancada voltou a declarar os tipos**. Nenhuma linha do
gate foi afrouxada para isso — o commit da reconstrução não toca `scripts/bancada-gate.mjs`.

---

## Fila de trabalho, em ordem

### 1 · Reconstruir `bancada.html` até o gate passar — FEITO (`e0dccad`)

```
OK: 29 itens no catálogo (17 literais, com 15 srcId prontos; 12 derivados de CAT,
sem srcId e fora de B1/B9), 15 blocos, 4 relatório(s) auditoria/1.1,
4 tipo(s) de peça central em uso, 19 aviso(s).
```

Os 19 avisos são todos `[B3] tipo declarado e ainda não usado` (12 tipos de `auditoria/1.1`
+ 4 da v4 cujos instrumentos ainda não rodaram) e `[B10] rodada sem revisão independente`
nos três relatórios. Aviso não bloqueia, e nenhum deles é dívida nova.

Verificação além do gate: a página foi exercitada num DOM stub (o script carrega, os três
passos renderizam, os sete payloads saem não vazios, sem código duplicado no catálogo).
**Não foi aberta em navegador de verdade** — ver "o que continua em aberto".

### 2 · Fechar o defeito B1 do gate — FEITO

O que estava errado, medido e não suposto: o parser de itens usava
`/\{code:"…",\s*fam:"…",\s*ver:"…"[\s\S]*?\}/g`, e o `[\s\S]*?\}` parava no **primeiro** `}`.
Item com objeto aninhado perdia tudo depois dele — inclusive `srcId` e `v4patch`. Como B1
(`if (it.srcId && …)`) e B9 (`if (… || !it.srcId) continue`) **pulam** item sem `srcId`, o
efeito não era erro: era silêncio.

Correção: varredura por chaves balanceadas e ciente de string, mais uma **guarda de
cobertura** — todo `srcId:"…"` do arquivo tem de estar preso a um item que o parser leu.

Mordida provada por quatro mutações (todas revertidas de `.bak`, `git diff --numstat`
conferido em cada uma):

| Mutação | Gate antigo | Gate corrigido |
|---|---|---|
| A · `srcId` aponta para bloco inexistente | reprova `[B1]` | reprova `[B1]` |
| B · idem, **atrás de objeto aninhado** | **B1 mudo** (só `[B2]` por sorte) | reprova `[B1]` |
| C · `srcId` correto atrás de aninhado + 4b removido do bloco | **B9 mudo** | reprova `[B9]` no item certo |
| D · item que o parser não enxerga, `srcId` intacto | mudo | `[B1] parser cego: … fora do alcance: t-av20` |

Contagem, que era a pista: o parser reconhecia **17** itens; o catálogo tem **29** em tempo
de execução. Os 12 que faltavam são os empurrados por `ITEMS.push(...)` com chave abreviada
(`fam` em vez de `fam:"…"`) — nenhum tem `srcId`, então B1/B9 nunca se aplicaram a eles,
mas a linha final subcontava o catálogo em mais de um terço. Agora o total é derivado de
`CAT` menos a lista de exclusão, e bate com `ITEMS.length` medido em execução.

### 3 · Triar o que já foi medido (AV-00 bloco 9)
Nada foi triado. Emitir `triagem/1.0`, que nunca foi exercitado uma vez:
- 4 achados do R1, 3 do R3 — verificar falsificador, atribuir portão, dono e data.
- 110 obrigações do R2 — não são achados; decidir se viram fila de trabalho ou aceite.

O bloco 9 proíbe corrigir achado não triado. **Nenhuma correção de código antes disto.**

### 4 · Os achados de maior dano, se e quando triados
- **R3 F1 (dano 4)** — o caminho de escrita do razão não tem cobertura de integração. Nenhum teste de integração instancia `PostingService`; `PostingDimension.integration.test.ts:76` define um helper local `postEntry` que grava direto via `db.posting.create`.
- **R1 F1 e F2 (dano 3)** — os dois no mesmo `docker-compose.yml`: nome de variável divergente e Qdrant sem chave.

---

## Armadilhas medidas — não repita

1. **`git checkout -- <arquivo rastreado>` destrói trabalho não commitado.** Foi assim que a
   bancada v4 sumiu. Para reverter mutação de teste: copie para `.bak` e restaure de lá, ou
   commite antes.
2. **Regex montada por concatenação perde o escape.** `new RegExp("\\b"+nome+"\\b")` virou
   busca por caractere backspace e nunca casou: classificou 454 de 476 unidades como sem
   teste quando o real era 110. Use literal ou `includes`, e **confirme com um caso de
   sanidade conhecido** antes de acreditar no total.
3. **Contagem tirada de saída truncada não é contagem.** Um `head -5` virou "5 revisões
   independentes"; o total era 8.
4. **`perl -0pi` reescreve CRLF do arquivo inteiro.** Uma mutação de uma linha vira diff de
   79. Confira `git diff --numstat` por mutação antes de rodar a suíte.
5. **Suíte que não roda parece mutação morta.** Um `throw` inserido quebrou o narrowing de
   tipo num `catch` 24 linhas adiante e derrubou 20 suítes ao *carregar*. A leitura correta:
   `Test Suites: falhou` com `Tests: 0 failed` = resultado **inválido**, não morte.
6. **Fan-in cego a alias.** Contar só `./` e `../` perde os imports via `@/` — eram 181, e
   zeravam o fan-in de todos os controllers.
7. **`\n\n` nunca casa em arquivo CRLF.** O `bancada.html` é CRLF. O parser de tipos do gate
   para em `(?=\n[a-z]|\n\n|$)`; a alternativa `\n\n` é letra morta ali, então a varredura
   corre até achar linha começando com minúscula ASCII. Medido: com a seção de prosa depois
   das linhas `centerpiece.type ganhou`, **35 palavras de texto corrido viraram "tipo
   declarado"**. Por isso as duas linhas `ganhou` são as últimas do `t-contrato`. Antes de
   confiar num regex de fronteira de linha, confira o line ending do arquivo.
8. **`String.replace` com string troca só a PRIMEIRA ocorrência.** Os seis instrumentos v4
   têm o mesmo cabeçalho `## 4b · conventions[]`. Uma mutação que pretendia atingir o
   `t-av20` caiu no `t-av03`, e o gate reprovou — corretamente — o item errado. Escope a
   mutação ao bloco (índice de `id="t-xxx"` até o `</script>`) antes de concluir qualquer
   coisa sobre qual checagem mordeu.

## Ambiente

- `server`: `npm ci` feito nesta sessão (781 pacotes). `npx jest --selectProjects unit` ~42 s;
  `--selectProjects integration --runInBand` ~167 s, exige `OPENAI_API_KEY=ci-dummy-openai-key`.
- `my-app`: **sem `npm ci`** — vitest nunca rodou, força da suíte do frontend desconhecida.
- Grafo `codebase-memory` indexado como `C-Users-smurf-Downloads-Luminaris` (10.841 nós).
  Use-o para localizar, confirme sempre no código (CBM-001). `in_degree` de `Class` vem ~0
  por desenho — nunca ranqueie classe por ele.

## Limite honesto

Nenhuma das três rodadas foi revisada por agente separado, o que o próprio AV-00 §9.4
rejeita. Os achados são candidatos verificados por execução, não triados nem revisados.

## O que continua em aberto — sem arredondar

1. **A bancada não foi aberta em navegador de verdade.** O que existe é um smoke em DOM
   stub: prova que o script carrega, que os três passos renderizam e que os payloads saem
   não vazios. Não prova layout, CSS, foco, nem o comportamento de clique real. O painel de
   preview desta sessão renderiza arquivo fora do projeto como snapshot estático, sem
   executar JS — então o console ficou **inacessível**, e "abre sem erro de console" está
   verificado só no que um stub alcança. Abrir no navegador continua pendente.
2. **A reconstrução é autoria, não a v4 original.** O texto perdido não volta. Os blocos
   novos são fiéis ao que os três relatórios descrevem e satisfazem o gate, mas quem
   comparar com a v4 anterior vai achar diferenças de redação — não há como medir quantas.
3. **Os itens 3 e 4 da fila não foram tocados.** Nada foi triado; `triagem/1.0` continua sem
   ter sido exercitado uma única vez. Nenhum achado de código foi corrigido, e isso é
   deliberado: o AV-00 bloco 9 proíbe corrigir o não triado.
4. **B10 continua aviso, não erro.** As três rodadas seguem sem revisão independente. O gate
   avisa e não bloqueia — decisão anterior, mantida, mas é a lacuna que o próprio §9.4 chama
   de rejeitável.
5. **`my-app` segue sem `npm ci`.** A força da suíte do frontend continua desconhecida.
