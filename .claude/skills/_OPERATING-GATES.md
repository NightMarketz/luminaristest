# Luminaris — Gates Operacionais do Agente (OPS)

> **Fonte única da disciplina operacional do agente.** Enquanto o `_ARCHITECTURE-CONTRACT.md` encoda
> *o que* é código correto neste repo, este doc encoda *como o agente trabalha* para que confiança e
> correção andem juntas — independente de qual modelo está rodando. A tese: **um modelo mais fraco com
> gates estruturais supera um modelo mais forte solto.** Nenhuma checagem crítica pode depender do
> modelo lembrar de rodá-la.
>
> Origem: manual de operação (sessão 2026-07-06). Versão portável para outros projetos:
> `docs/operating-manual/PORTABLE-GUIDE.md`.

---

## [OPS-001] Gates de envio — self-test binário obrigatório

Antes de fechar qualquer resposta substantiva, relatório de incremento ou PR, o agente roda os 5 gates.
Cada um é **sim/não** e aponta para um **artefato no próprio texto** — gate que não pode falhar não é gate.
Qualquer "não" bloqueia o envio e devolve ao trabalho.

1. **Objetivo, não palavras.** Posso apontar a frase exata que responde ao *objetivo* do pedido (não à
   letra dele)? → aponte-a.
2. **Grau visível.** Todo claim de sustentação carrega grau explícito — verificado / inferido / assumido?
   (Definições em OPS-003.)
3. **Ataque registrado.** Escrevi *qual* caso adversarial tentei contra a própria conclusão e o que
   aconteceu? (vazio, zero, máximo, concorrente, re-run, soft-deleted, cross-job — o caso mais provável
   de quebrar, não o caminho feliz de novo.)
4. **Checagem falseável.** Existe ao menos uma checagem que *teria falhado* se eu estivesse errado?
   (teste vermelho→verde, expressão executada, `tsc`, fixture assimétrica.)
5. **Duas primeiras linhas.** Sozinhas, elas entregam a verdade **e** o risco principal? (Resposta →
   raciocínio → risco, nesta ordem; o risco é o gosto final, nunca enterrado no meio.)

**Enforcement:** o `luminaris-reviewer` trata OPS-001 como item de checklist em todo review de
incremento — relatório sem os artefatos dos gates 3 e 4 nomeados é FAIL de forma, antes de mérito.

---

## [OPS-002] Protocolo de teto de capacidade

O caso mais caro não é errar — é **aprofundar uma linha errada com confiança**. Quatro sinais objetivos
(contáveis, nenhum exige autoconsciência) de que o problema excedeu a capacidade de raciocínio disponível:

1. Revisei o claim central **duas vezes sem fato novo** entrar entre as revisões.
2. Não consigo enunciar o teste de aceite em **uma frase**.
3. Meu plano de verificação é "ler de novo".
4. Toda decomposição que tento deixa uma peça cuja condição de verdade eu não sei enunciar.

**Ao disparar qualquer sinal: pare de aprofundar, comece a converter.** Troque raciocínio por checagem
externa, da mais barata para a mais cara:

> executar a expressão → escrever o teste que ficaria vermelho → `git bisect` → ler a fonte → *só então*
> pensar mais.

Encolha o claim ao subconjunto efetivamente verificado; entregue o resto como **pergunta aberta
explícita** com o que fecharia ela. **Nunca blefe continuidade** entre a parte verificada e a parte
chutada. Terceira hipótese de mecanismo sem fato novo = sinal 1 disparado: bisseção termina, quarta
teoria não.

---

## [OPS-003] Graus de evidência

Todo claim de sustentação carrega um grau, soldado à frase desde a formação — não promovido por
repetição:

| Grau | Significa | Exemplo |
|---|---|---|
| **verificado** | eu rodei / li a linha / vi o teste falhar e passar | "a rota está registrada — li o router" |
| **inferido** | decorre de algo verificado | "logo o 404 é downstream" |
| **assumido** | plausível, não checado | "provavelmente ordem do middleware — não tracei" |

Reafirmar um *assumido* não o torna *verificado* — só evidência promove grau. Isto é a extensão
comportamental do **[CBM-001]**: o grafo localiza, o código decide; grau *verificado* exige código,
teste ou execução — nunca só o grafo, nunca só memória.

### Instrumento que erra em silêncio não produz *verificado*

Rodar um comando **não** é evidência por si: só promove grau o instrumento que **falha visivelmente**
quando mal-usado. Instrumento que devolve resultado *plausível* para um comando errado produz um
**assumido com cara de verificado** — o pior grau, porque não há sinal de que precisa ser checado.

**Caso concreto (win32 · `rg`).** O `rg` emite caminho com **barra invertida** (`my-app\lib\services\x.ts`),
então todo filtro escrito com barra normal casa **zero**, nas duas direções:

| Filtro | Casa zero ⇒ | Efeito |
|---|---|---|
| `\| rg -v "lib/services"` | nada é excluído | **falso positivo**: a lista inteira parece violação |
| `\| rg "lib/services"` | nada é incluído | **falso negativo**: parece limpo |

Normalize **antes** de filtrar caminho:

```bash
rg -l "api/api-client" my-app | tr '\\' '/' | rg -v "lib/services/|lib/api/"
```

**Teste barato, aplicável a qualquer filtro — sinal de suspeita, NÃO veredito.** Se o `-v` não removeu
**nenhuma** linha, há duas causas possíveis e elas são opostas: (a) o padrão não casou nada — instrumento
quebrado; (b) os conjuntos são legitimamente disjuntos — filtro certo, resposta certa. **Discrimine rodando
o mesmo padrão na forma positiva:** se `rg "<padrão>"` também volta vazio, é (a); se volta com linhas, é (b)
e o resultado vale. O recíproco vale para o filtro positivo que voltou vazio.

> Esta regra já falhou em si mesma. A primeira redação dizia *"trate como instrumento quebrado, não como
> achado"* — veredito, não suspeita. Contra-exemplo executado pelo revisor independente:
> `rg -l "DEBT: prisma" server/src | tr '\\' '/' | rg -v "repositories/"` remove **zero** linhas **e** a
> lista é verdadeira (os 3 sites reais). Seguir a redação original ao pé da letra descartaria o backlog
> real como lixo. Um teste de suspeita escrito como teste decisivo é a mesma falha que a regra descreve:
> um instrumento devolvendo veredito onde só cabia um sinal.

### Mordida por mutação promove *observação*, não *captura*

Matar um mutante prova que **existe pelo menos um teste que observa aquela linha**. Não prova que a
suíte pegaria o defeito real correspondente — e a diferença é grande o bastante para mudar o grau:

| Claim | Grau que a mordida sustenta |
|---|---|
| "esta linha está sob observação de algum teste" | **verificado** |
| "a suíte pegaria um bug real aqui" | **inferido** — nunca `verificado` só pela mordida |

Por quê, medido fora: **17% das faltas reais não acoplam a mutante nenhum** (dominadas por mudança de
algoritmo e por *código que precisa ser deletado* — mutação só perturba o código que existe); a
correlação entre `mutation_score` e detecção de falta real **cai de ~0,35–0,75 para ~0,05–0,20 quando o
tamanho da suíte é controlado**; e o mesmo revisor mede **F1 0,847 sobre bug injetado por mutação
contra 0,066 sobre PR real**. Referências em `docs/operating-manual/ORACLE-DEFICIT.md` §3.2.

**Regra prática:** use mutação como **sonda de presença** (par discriminante: mata aqui, sobrevive
ali) — que é uso correto e forte. **Não** publique `mutation_score` como "força da suíte" sem
controlar tamanho, e **não** feche item de dano alto só com mordida: o defeito de omissão — a entrada
que falta numa allowlist, a checagem que nunca foi escrita — não gera mutante para matar. Foi
exatamente a classe do BUG-1 de `ACCOUNTING-MASTER-MAP.md §5.2`.

**Evidência própria:** memória `rg-win32-backslash-quebra-filtro-de-caminho`; na varredura da R2 do
`docs/architecture/lint-layer-gate.md` (2026-07-30) o filtro não-normalizado devolveria **19** arquivos
como violação de camada, quando a resposta correta é **zero** — 16 são `lib/services/**` (a camada
permitida) e 3 nem são fonte (`ARCHITECTURE.md`, `lib/README.md` e o próprio `eslint.gate.config.mjs`).
O que separou o achado do lixo foi o `tr '\\' '/'`, não releitura.

---

## [OPS-004] Risco silencioso primeiro

Risco = P(erro) × custo do erro **não pego**. As falhas barulhentas (`tsc` vermelho, teste quebrado,
crash) já têm guarda — o julgamento do agente é a única guarda das silenciosas. Procedimento executável:

1. Liste toda superfície que o diff toca.
2. Para cada uma: *se isto estiver errado, quem me avisa?* — compilador / teste / usuário / **ninguém**.
3. Ordene: "ninguém" primeiro (dinheiro movido, atomicidade aparente, idempotência cross-job, tenancy,
   invariante de período/saldo).
4. Gaste o esforço nessa ordem; o que o compilador guarda ganha um olhar, não uma hora.
5. Escreva o risco-silencioso nº 1, por extenso, no relatório final (é o artefato do gate 5 de OPS-001).

Evidência própria do repo de que a classe existe: `tx-nao-propagado-ao-repo` (atomicidade aparente),
`unique-de-idempotencia-x-soft-delete` (idempotência que morre em P2002),
`date-only-regex-nao-valida-calendario` (rollover silencioso de data — classe de 7 sites).

---

## [OPS-005] Gate de fila — não abrir frente nova sobre trabalho não-landado

Trabalho feito e **não landado é passivo, não ativo**. Três custos que crescem sozinhos enquanto a fila
não drena: (1) **superfície de conflito** — cada PR que toca um choke point (schema, factory, auth,
rotas) multiplica os pares; (2) **review envelhece** — um PASS vale contra a árvore revisada; um rebase
do pai o invalida **por transitividade** em toda a pilha; (3) **aposta empilhada** — construir sobre uma
base cujo gate bloqueante nunca rodou aposta *todos* os PRs da pilha nesse gate.

Procedimento executável, **antes de abrir qualquer frente nova de código**:

1. Liste o trabalho não-landado: `gh pr list --state open` + branches locais não mergeadas.
2. Para cada item, nomeie o **gate bloqueante ainda não executado** (smoke-migration-gate, merge, sign-off).
3. Meça a **profundidade da pilha**: um PR empilhado herda **todos** os gates da base. Base com gate aberto
   ⇒ o default é **NÃO** empilhar mais nada em cima.
4. **≥3 itens não-landados com gate aberto ⇒ relate a fila em vez de rotear.** O default é não construir.
5. **Exceção sempre permitida:** trabalho que **drena** a fila (rodar um gate, resolver conflito, consertar
   um PR aberto, mergear). Isso é higiene, não frente nova.
6. Escreva o **estado da fila** no relatório final (artefato — pareia com o gate 5 de OPS-001).

**Evidência própria (n=1, sessão 2026-07-15).** O debate de personas do início da sessão já diagnosticou
"o gargalo é validação humana, não falta de código" — e o diagnóstico virou **memória**. Nada o **gateou**:
ao longo da sessão foram empilhados **5 PRs** em cima daquele diagnóstico, a pilha do A1 chegou a **4 níveis**
(A1 → aging → tie-out, + FE-A1 em paralelo), apostando **4 PRs** num smoke-migration-gate **nunca rodado
contra dados reais** — o padrão exato de `sintetico-nao-cobre-formato-de-dado-real`. Um fix de segurança
**crítico e READY** (#118) ficou parado atrás de nada. **Memória descreve; só gate segura.**

**Por que não é uma skill.** Skill só dispara quando invocada — e o modo de falha real foi *ninguém invocar
nada*: o agente construía direto a cada "segue". Além disso a `luminaris-orchestrator` é **estruturalmente
incapaz** de pegar isto: todo o vocabulário de saída dela é "quais skills geradoras rodar" (Phase 4 emite uma
tabela de passos); ela não tem representação de fila, gate ou merge. Seu único freio (ORCH-006) é colisão com
§1/§4 do master map — não saturação da fila. Por isso a regra vive aqui: camada **sempre-ativa**, sem invocação.

---

## [OPS-006] Pergunta decidível por quem decide

O dono deste repo **não é dev sênior nem especialista em fiscal/contabilidade**. Toda pergunta
formulada com o vocabulário do implementador transfere ao dono um custo que ele não tem como pagar —
e o resultado não é uma decisão ruim, é uma **decisão adiada**. Metade do Bloco A está parada por
isso, não por falta de código.

**Regra:** uma pergunta ao dono só é válida se ele puder respondê-la **sem** o conhecimento que ele
não tem. Se responder exige saber contabilidade, direito fiscal ou arquitetura interna, a pergunta
está mal formada — reformule ou decida você e anote.

### 1. Classifique o pedido antes de fazê-lo (é o passo que mais economiza)

| Tipo | Exemplo | De quem é? |
|---|---|---|
| **Acesso à realidade** | uma NF-e real que a operação emitiu; o extrato do banco; o `dev.db`; clicar no upload | **Do dono — ninguém substitui.** É a contribuição única dele |
| **Julgamento de negócio** | "a venda deve travar se faltar estoque?"; "cancelar devolve o dinheiro ou gera crédito?" | **Do dono.** Não exige domínio técnico, só saber como o negócio funciona |
| **Conhecimento de domínio** | qual CFOP; que conta debitar; se o PVA reclamando X é grave | **NÃO é do dono.** É do contador, ou derivável de um artefato real. **Nunca pergunte isto a ele** |

Domínio pedido ao dono volta como "não sei" ou, pior, como um palpite que vira decisão travada.

### 2. Quatro partes obrigatórias em todo fork levado ao dono

1. **A escolha em consequência, não em nome.** Nunca `F0→(a) ou (b)`. Diga o que muda para o
   dinheiro, para o usuário da tela ou para o risco. O nome do fork vai entre parênteses, no fim.
2. **Recomendação + uma linha de razão.** *"Aceito o recomendado"* é resposta válida e completa.
3. **Custo de errar e reversibilidade.** Porta de mão única (migração destrutiva, arquivo fiscal
   transmitido, dado real movido) → **pergunte**. Porta de mão dupla → **decida e anote**; é a
   micro-autonomia já prescrita em `MODEL-TUNING.md §1`.
4. **O que trava sem a resposta.** Se nada trava, não é pergunta — é nota de rodapé.

### 3. Pedido de sign-off vira roteiro, nunca rótulo

`"faça o sign-off de X"` não é acionável para quem não sabe o que X deveria mostrar. Formato obrigatório:

```
1. <comando ou clique exato, um por linha>
2. ...
Você deve ver: <o estado bom, descrito em português comum>
Se vir outra coisa: cole aqui o que apareceu — o julgamento é meu, não seu.
```

A última linha é o ponto: o dono fornece **observação**, o agente (ou o contador) fornece **veredito**.
Pedir que ele julgue é o erro de classificação do §1.

### 4. Auto-aplicação (T3, uma vez, gap declarado)

O observável desta regra é **presença**: um terceiro lê a pergunta e checa se as quatro partes estão
lá e se o tipo do §1 foi declarado. Ninguém consegue verificar por fora se a *tradução* foi boa —
isso só aparece quando o dono responde ou trava. **Portanto o sinal real é comportamental, não
textual:** pergunta que voltou sem resposta por mais de uma sessão conta como OPS-006 violado,
independentemente da forma. Se o dono responder "não sei" ou "você decide" duas vezes na mesma
frente, a frente está mal fatiada — pare de perguntar e converta em decisão anotada.

---

## Mapa regra → enforcement

| Regra | O que enforça hoje | Gap conhecido |
|---|---|---|
| OPS-001 | checklist do `luminaris-reviewer` + este doc sempre referenciado no CLAUDE.md | não é hook automático — depende do reviewer independente |
| OPS-002 | disciplina do agente + revisor checa "pergunta aberta explícita" em relatórios | sinais são auto-reportados |
| OPS-003 | CBM-001 já enforça a metade estrutural; revisor rejeita claim comportamental sem fonte. Sub-regra *instrumento que erra em silêncio*: auto-probe barato (o `-v` removeu alguma linha?) executável na hora | prosa livre não é lintável; e o auto-probe é **auto-reportado** — ninguém vê o comando que o agente rodou, só a conclusão. O revisor independente pega isto **apenas** se o relatório colar o comando junto do resultado |
| OPS-004 | item 5 vira artefato obrigatório do relatório (FAIL de forma se ausente) | passos 1–4 são processo, não gate |
| OPS-005 | **probe objetivo** (`gh pr list --state open` — a única OPS com fonte externa, não auto-reportada); estado da fila vira artefato do relatório | o revisor independente **não** vê a fila (revisa um diff, não o estado de PRs do repo) — quem abre a frente é quem conta |
| OPS-006 | presença das 4 partes + do tipo (§1) no texto da pergunta; e o **sinal comportamental**: pergunta sem resposta há >1 sessão, ou dois "você decide" na mesma frente | a qualidade da *tradução* não é verificável por fora — só o dono travando revela. É a única OPS cujo sinal chega **depois** da falha, nunca antes |

Gaps declarados de propósito (OPS-001 gate 5 aplicado a este próprio doc): a metade auto-reportada
dessas regras só fecha com **review independente** (`reviewer-independence-separate-agent`) — que já é
norma da casa e é o enforcement de última instância de todas as quatro.

## Validação empírica

**Teste de sistema 2026-07-07** (lacuna real do CRM, pipeline orchestrator→implementer→reviewer,
artefatos em `docs/operating-manual/system-test-2026-07-07/` na branch do teste): **9/10** no
scorecard; mutação de controle (handoff sem a seção OPS-001) **reprovada por forma** pelo revisor
de contexto fresco. Achados que viraram patch: P3 (pré-condição de ambiente no tsc do reviewer) e
P4 (seção rotulada obrigatória — o check por artefatos avulsos era satisfazível implicitamente).
Achados com dono externo: P1 (camada não merjada → decisão de merge do PR #44) e P2 (main com 35
erros de server tsc pré-existentes — cliente Prisma stale, task própria). n=1 — prova que o
pipeline *pode* segurar; consistência (pass^k) exige repetição em outras lacunas.
