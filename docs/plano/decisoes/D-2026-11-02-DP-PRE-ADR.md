---
id: "D-2026-11-02-DP-PRE-ADR"
tipo: "decisao"
dominio: "governanca"
titulo: "Departamento Pessoal (folha + eSocial): folha sai do diferido pelo módulo DP; PRE-ADR Accepted com F-DP-1..14 (fase 2 do F-PES-0, nó PES-4) — decisões do dono em 02/11"
estado: "decided"
autorizacao: "dono, chat, 2026-11-02: \"A folha estava diferida exatamente pra entrar nesse módulo aqui\" + \"Podemos seguir o pre-adr numa sessão, esperar, criar o nó no vault + brief em outra e o executa na terceira\" — PRE-ADR e forks; sem nó, sem BRIEF, sem 'executa'"
atualizado: "2026-11-02"
---
# D-2026-11-02-DP-PRE-ADR — Departamento Pessoal: decisões do dono (02/11/2026)

**Estado:** `decided`. **Autorização:** dono, chat, 02/11/2026 (citação no frontmatter). Escopo: o
[`PRE-ADR-DP-DEPARTAMENTO-PESSOAL`](../../adr/PRE-ADR-DP-DEPARTAMENTO-PESSOAL.md) e seus forks. **Não** cria nó, não
autoriza BRIEF nem código e não é `executa` (ORCH-006). O nó e o BRIEF são da sessão 2; o código, da sessão 3.

## Contexto

O dono recebeu a spec "Luminaris DP — Especificação Técnica do Módulo" (@Katz, 31/10/2026), copiada em
[`docs/dp/SPEC-DP-2026-10-31-katz.md`](../../dp/SPEC-DP-2026-10-31-katz.md) como insumo externo não ratificado, e
perguntou: *"Como fazer esse modulo de forma agnóstica em submodulos como estamos fazendo tudo o resto?"*.

## Decisões de chat (02/11)

1. **A folha sai do diferido pelo DP.** *"A folha estava diferida exatamente pra entrar nesse módulo aqui"*. O diferido
   [`M5-subrazoes-restantes`](../diferidos/M5-subrazoes-restantes.md) (master map §5 item 13, "só com demanda explícita")
   aponta para o DP a partir desta nota.
2. **Três sessões, em sequência.** *"Podemos seguir o pre-adr numa sessão, esperar, criar o nó no vault + brief em outra
   e o executa na terceira"*. Sessão 1 = PRE-ADR (esta); a sessão 2 começa depois da ratificação; a sessão 3 é o
   `executa` do BRIEF inteiro ([[D-2026-10-28-FLUXO-AUTONOMO]]).

## Forks do PRE-ADR

F-DP-1 e F-DP-4 decididos pela regra da casa (sem questionário). Os outros, pelo dono em quatro questionários
(AskUserQuestion) na mesma sessão. Respostas literais:

| Fork | Decisão | Fonte | Contra a recomendação? |
|---|---|---|---|
| F-DP-1 Trabalhador | (a) trabalhador e vínculo em Prisma, `employeeRef` para a `employees` do motor | casa: `ADR-PERSISTENCE-BOUNDARY`, `AC-2.1-B2`, [[D-2026-10-31-MODULOS-BASE-SUBMODULOS]] | não |
| F-DP-2 Empregador | (a) mantém [[R8]]: instância = raiz do CNPJ = empregador; unidade = estabelecimento | dono: *"Mantém R8"* | não |
| F-DP-3 eSocial v1 | (b) pipeline agnóstico de transporte com `Null`/`Manual` primeiro; transmissão pelo assinador local depois | dono: *"Pipeline + Manual"* | não |
| F-DP-4 Alfândega contábil | (a) `postEntry` direto, contas por papel novas no `AccountingScopeSettings` | casa: AP (F0 → a), C8 | não |
| F-DP-5 Fórmula de rubrica | ~~(a) árvore fechada~~ → **F-PES-9 (a): catálogo fechado em código + valores da CCT como dado (F-PES-8)** | dono, 1ª rodada: *"Árvore fechada"*; revisto no 4º questionário: *"Código + CCT como dado"* | não |
| F-DP-6 Núcleo e ativação | núcleo sempre ligado em toda instância; opcionais com registro no formato do `MODULE_REGISTRY` e ativação com vigência | dono: *"Deve ser um módulo grande assim como contabilidade, fiscal, vendas etc o mínimo é obrigatório pra qualquer empresa desde a menor possível"*; confirmação: *"Isso, núcleo sempre ligado"* | formulação do dono |
| F-DP-7 Gate de obrigação legal | (a) pendência bloqueante no fechamento; nunca liga sozinho | dono: *"Pendência bloqueante"* | não |
| F-DP-8 Vigência | **(b) só data de efeito** | dono: *"Só data de efeito"* | **sim** (recomendação era bitemporal) |
| F-DP-9 Posição na fila | (a) BRIEF de F0 + F1 já; código espera `executa`; [[FILA-ORDEM]] não muda | dono: *"BRIEF F0+F1 já"* | não |
| F-DP-10 Fronteira mecanizada | (a) regra no `check:arch`: núcleo do DP não importa submódulo opcional | dono: 1ª rodada *"Não entendi essa regra"*; refeita em palavras simples: *"Cria a trava"* | não |
| F-DP-11 Pró-labore | (a) o núcleo cobre o pró-labore do sócio (coincide com o F-PES-7) | dono: *"Sim, no núcleo"* | não |
| F-DP-12 Estratégia × F-PES-0 | (a) o DP é a "decisão do dono" que abre a fase 2 do F-PES-0 (c); tabelas com `origem`; importação (PES-1) fica como caminho de migração | dono: *"DP abre a fase 2"* | não |
| F-DP-13 SST × F-PES-3 | (a) SST no núcleo, BRIEF próprio da mesma fase | dono: *"SST no núcleo"* | não |
| F-DP-14 Nó × F-PES-1 | (a) o nó do DP é o **PES-4**; submódulos viram `PES-4-<nome>` | dono: *"Usa o PES-4"* | não |

## Reconciliação com as decisões de 12/10 (4º questionário)

Depois dos três primeiros questionários, a checagem antes do commit achou o
[`PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF`](../../accounting/PRE-ADR-PESSOAL-FOLHA-ESOCIAL-REINF.md), com F-PES-0..13
ratificados em lote pela recomendação em [[D-2026-10-12-QUESTIONARIO-DONO]], e o
[`PRE-ADR-FOLHA-CONTABILIZACAO`](../../adr/PRE-ADR-FOLHA-CONTABILIZACAO.md) (Proposed, F-FOL-0..9 pendentes). As quatro
colisões foram levadas ao dono (F-DP-5, F-DP-12, F-DP-13, F-DP-14); todas saíram pela recomendação. Sem colisão:
F-DP-1 × modelo do §7 de 10/10, F-DP-4 × F-PES-10, F-DP-11 × F-PES-7. O F-PES-4 (a), guarda do A1 do cliente, já
estava superado pela [[D-2026-10-30-D5-SEM-CONTRATACAO-BYOK]]. A fala de 02/11 responde o F-FOL-0 ("tirar a folha do
diferido agora") no sentido "agora, pelo DP"; os F-FOL-1..9 continuam pendentes.

## Consequências

- O PRE-ADR passa a **Accepted**. Das sete decisões da spec que batem em decisão fechada, nenhuma é reaberta (PRE-ADR §4):
  SQLite, `AccountingScope`, sem outbox (T11), centavos, BYOK (D5 de 30/10) e a fronteira de camadas continuam.
- **F-DP-8 contra a recomendação:** o cálculo antigo se reproduz pelo snapshot gravado inteiro na execução; correção de
  dado já registrado é alteração auditada; resultado, prova e XML continuam imutáveis.
- **F-DP-6 + F-DP-11:** o núcleo serve à empresa sem empregado CLT. O BRIEF confere no manual do eSocial e na lei de
  custeio como o pró-labore entra, antes de codificar.
- **F-DP-5 revisto:** não há intérprete de fórmula; a R-motor-regras não é tocada.
- **Próximo passo (do dono):** abrir a sessão 2 (nó `PES-4` + BRIEF de F0 e F1). Esta sessão não a abre.
