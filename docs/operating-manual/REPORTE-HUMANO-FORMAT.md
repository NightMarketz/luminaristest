# Reporte humano — as três fixações

> **Isto não é prompt e não deve ser colado em agente nenhum.** Está fora de `.claude/skills/` pelo
> mesmo motivo que o `RUNBOOK-FORMAT.md`: skill é a superfície que o agente enxerga, e este artefato
> não pertence a ela.

## O princípio

Na camada de tráfego entre agentes o recurso escasso é o **token** — daí a concisão do retorno de
subagente, o handoff denso, a célula de tabela de 900 caracteres com SHA e ratificação. Na camada de
reporte humano o recurso escasso é a **atenção do dono**. As duas economias são opostas, e o defeito
é o artefato que serve às duas: ele acaba com a densidade da primeira e a obrigação de completude da
segunda, e nenhum dos dois leitores consegue usá-lo.

Este documento generaliza o que o `RUNBOOK-FORMAT.md` já fixou para os cinco gates humanos. Lá a
regra vale para runbook; aqui vale para **qualquer** artefato de audiência humana produzido por
agente. O runbook continua sendo o caso mais duro (evidência colada + assinatura); os outros
herdam o mesmo esqueleto.

## As três fixações

Formato é livre. **Fronteira não.** Todo artefato de audiência humana fixa, no topo do arquivo:

### 1. DESTINATÁRIO NOMEADO

O **papel que decide**, não a plateia. `dono`, `contador`, `advogado`, `revisor`, `executor` — nunca
"o time", "a equipe", "quem for ler". Sem destinatário nomeado não há ninguém para quem o artefato
esteja completo, e "completo o bastante" vira opinião do autor.

### 2. MOMENTO — gerado por ÚLTIMO

O artefato humano é **derivado**: nasce de artefatos de máquina já prontos, depois que o trabalho
fechou. Nunca durante o loop. Um relatório escrito enquanto o trabalho corre é narrativa de
processo, e narrativa de processo é a classe de fraude que o `ORACLE-DEFICIT.md` descreve — ela
tem a forma de resultado sem ser resultado.

Consequência prática: **nenhum dado é duplicado**. O artefato humano **referencia** o de máquina
(`caminho:linha`); ele não recopia a célula da tabela, o SHA nem o corpo do teste. Se o de máquina
mudar, o humano é regerado, não editado.

### 3. PROIBIÇÕES — escritas no próprio arquivo

A lista do que o agente **não pode preencher**, dentro do arquivo, não num manual à parte. O núcleo
recorrente é:

| Campo proibido | Por que o agente não pode |
|---|---|
| **EVIDÊNCIA** | Artefato colado não se inventa; frase descrevendo sucesso, sim |
| **desfecho** | Marcar `PASSOU` é o ato que fecha o gate — pertence a quem executou |
| **assinatura** | É o campo que ancora responsabilidade num humano |
| **ratificação** | Fork é decisão do dono (ORCH-006); agente registra o fork, nunca a escolha |

Artefato sem essa lista é artefato onde qualquer campo é preenchível, e a fronteira volta a depender
de o agente lembrar dela.

## O cabeçalho verificável

As três fixações vivem num frontmatter YAML no topo. Ele existe para ser **checado por comando**, não
por leitura — a lição do `GAP-MAP.md` regra nº 1 vale aqui: declaração sem comando ao lado é opinião.

```yaml
---
reporte-humano: v1
destinatario: dono — quem executa o gate e assina
momento: derivado; gerado após <o quê>, nunca durante o loop
estado: em-branco            # em-branco | assinado
derivado-de:
  - docs/accounting/ACCOUNTING-MASTER-MAP.md
proibido-ao-agente:
  - EVIDÊNCIA
  - desfecho
  - assinatura
---
```

- `estado: em-branco` — o agente preparou e entregou. **Nenhum** campo proibido pode estar preenchido.
- `estado: assinado` — o humano executou. A assinatura **tem de** estar preenchida; artefato que se
  declara assinado com a linha de assinatura vazia é nulo (`RUNBOOK-FORMAT.md`).

Só o humano troca `em-branco` → `assinado`. O agente que fizer essa troca está assinando por
procuração, e é o caso que o verificador existe para reprovar.

## O verificador

```bash
node scripts/reporte-humano-check.mjs
```

Varre `docs/**` atrás do marcador `reporte-humano:` e reprova por:

1. destinatário ausente, placeholder (`[nome]`, `____`) ou coletivo (`o time`, `a equipe`);
2. `proibido-ao-agente` ausente ou vazio;
3. campo proibido **preenchido** num arquivo `em-branco`;
4. arquivo `assinado` com a assinatura em branco (o inverso: alega desfecho que não tem dono);
5. caminho de `derivado-de` que não existe em disco.

`--self-test` roda contra as duas fixtures de `scripts/fixtures/` (uma boa, uma ruim) e falha se a
boa reprovar ou a ruim passar. `--path <arquivo>` checa um arquivo só.

**Deliberadamente fora do CI.** A moratória do `CLAUDE.md` §⛔ proíbe montar aparato de auditoria novo
enquanto houver item do Bloco A com oráculo externo aberto — e há 4 de 4. Isto é um comando que se
roda ao fechar um artefato humano, não um gate a mais na fila. Ligar no `ci.yml` é decisão do dono,
depois que o Bloco A fechar.

## Duas coisas que o verificador aprendeu apanhando (2026-09-09)

Um review adversarial independente construiu 16 evasões e **as 16 passaram**. Duas mudaram o desenho,
não só o código:

1. **A lista do arquivo ESTENDE o núcleo; nunca subtrai.** A versão anterior usava a lista declarada
   *no lugar* do núcleo, e declarar `proibido-ao-agente: [ratificação]` desligava os detectores de
   evidência, desfecho e assinatura. A defesa contra **omitir** a lista tinha tornado a lista
   **curta** estritamente mais barata que a ausente.
2. **`estado:` não decide se a checagem roda.** Ele é autodeclarado por quem a guarda restringe —
   um agente que trocasse `em-branco` → `assinado` e assinasse "em nome do dono" era declarado
   limpo. Autoria passou a valer nos dois estados: **assinatura com cara de agente é achado sempre**.

Regra geral que sai disso, e vale para qualquer gate deste repo: **campo que o restringido preenche
não pode ser o predicado do gate**. Se o artefato diz de si mesmo que está em ordem, o gate confere
outra coisa.

## Duas lacunas do fecho de 2026-09-09 — uma verificada, uma aberta para o dono

1. **`PAPEIS` (linha ~186 do script) foi escrita pelo agente.** 14 papéis — `dono`, `contador`,
   `advogado`, `revisor`, `executor`, `implementador`, `orquestrador`, `arquiteto`, `auditor`,
   `responsável técnico`, `desenvolvedor`, `operador`, `cliente`. É allowlist deliberada (H7), mas
   quem a escreveu foi o mesmo restringido por ela. Troquei falso-negativo silencioso (denylist que
   deixa passar plateia nova) por falso-positivo ruidoso (papel legítimo fora da lista reprova até
   alguém acrescentar) — é a troca certa, mas a lista em si **não foi confirmada pelo dono**. Fica
   aberto até ele revisar se os 14 papéis são os certos.
2. **As 4 âncoras `ratificado-por:` das cédulas foram transcritas pelo agente** (achado H3/2026-09-09:
   as 4 cédulas `CEDULA-DECISAO-*.md` não tinham âncora de autoria nenhuma). **Verificado em
   2026-09-09** — não só declarado: reli as 4 e conferi cada `ratificado-por:` contra a citação
   literal do dono no corpo. As 3 de 09-03/09-07 batem palavra por palavra (contagem de decisões,
   método `AskUserQuestion`/delegação). A de 2026-08-31 parecia contradizer o próprio corpo ("O que
   não é: ratificação") até ler as seções B/C/EMENDA — que citam as mensagens literais do dono
   ("Ratifico o F-W2F-4 na opção 1…", "Ratifico os 5 F-AGING…") datadas de 08-31/09-01/09-03. As 4
   anchors se sustentam na leitura. Resíduo declarado: quem conferiu foi o mesmo agente que
   transcreveu — a confirmação é evidência de consistência interna, não substitui o dono lendo as 4.

## O que este formato NÃO garante

- **Não julga o conteúdo.** Destinatário nomeado e proibições presentes não tornam o artefato útil;
  tornam-no endereçado e delimitado. Densidade é julgamento humano.
- **Detector por campo é textual.** O verificador conhece a forma dos campos proibidos que este repo
  usa (`EVIDÊNCIA:`, `[ ] PASSOU`, `Assinatura do executor: ___`). Campo proibido escrito de outro
  jeito passa — e é por isso que a lista fica no arquivo, não no script: o script confere os que
  conhece, o leitor confere o resto.
- **Não impede a duplicação de dado**, só a torna visível: `derivado-de` diz de onde a afirmação veio;
  se o artefato humano recopiar em vez de referenciar, o verificador não acusa.
