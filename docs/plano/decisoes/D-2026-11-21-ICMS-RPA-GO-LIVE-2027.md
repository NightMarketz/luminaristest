---
id: "D-2026-11-21-ICMS-RPA-GO-LIVE-2027"
tipo: "decisao"
dominio: "fiscal"
titulo: "ICMS da revenda fora do Simples entra no go-live de 2027: nasce o nó ICMS-EFD (gatilho g3 do F-ICMS-0)"
estado: "decided"
autorizacao: "dono, chat, 2026-11-21: \"Executa tudo pra liberar e poder rodar em xhigh até terminar\" + questionário do mesmo dia: \"Entra, planejar já\""
atualizado: "2026-11-21"
---
# D-2026-11-21 — ICMS da revenda fora do Simples entra no go-live de 2027 (nó ICMS-EFD)

## Cédula

- **Origem:** sessão de medição do gap fiscal e contábil de 21/11/2026 (handoff
  `2026-11-21-gap-fiscal-contabil.md`, §6b, não versionado). A citação foi repassada pela sessão que abriu o cartão de
  planejamento, e o dono confirma ao iniciá-lo.
- **Chat:** *"Executa tudo pra liberar e poder rodar em xhigh até terminar"*.
- **Questionário do mesmo dia:** à pergunta *"Fork do ICMS: … Isso entra no escopo do go-live de 2027?"*, a resposta
  foi *"Entra, planejar já"*.

## Efeito

1. O gatilho g3 do F-ICMS-0 (c) do [`PRE-ADR-ICMS-IPI-EFD`](../../accounting/PRE-ADR-ICMS-IPI-EFD.md) disparou, e
   nasce o nó [[ICMS-EFD]] (F-ICMS-1 a) com o BRIEF
   [`BE-INCR-ICMS-RPA-brief.md`](../../accounting/BE-INCR-ICMS-RPA-brief.md).
2. Os demais F-ICMS seguem ratificados, salvo os reabertos no BRIEF: F-ICMS-3 → F-ICR-5 e F-ICMS-1 (parte EFD) →
   F-ICR-10.
3. **Escopo:** planejamento (nota, BRIEF, forks). Sem "executa". O BRIEF da EFD ICMS/IPI exige autorização própria.

## Forks do BRIEF (F-ICR-1..10)

O dono ratificou os dez no questionário (AskUserQuestion) de 21/11, na sessão de planejamento do nó, em três rodadas.
As perguntas tinham o contexto de cada fork.

## Respostas

| Fork | Resposta literal | Efeito |
|---|---|---|
| F-ICR-1 | "Inclui o Simples impedido (Recomendado)" | RPA = Presumido/Real com IE + Simples impedido pelo sublimite; `icmsApuracao` derivado |
| F-ICR-2 | "Livro de saída + XML externo (Recomendado)" | Débito pelas notas de saída (emitidas e importadas); venda sem nota → alerta |
| F-ICR-3 | "Model novo IcmsApuracao (Recomendado)" | Tabela própria com o quadro do RICMS/SP art. 87 III e o saldo credor transportado |
| F-ICR-4 | "Um lançamento por nota" — **contra a recomendação (a)** | Débito no razão nota a nota (`sourceType='icms_saida'`); a apuração lança só ajustes e compensação (BRIEF itens 23 e 23b, invariante 5) |
| F-ICR-5 | "Planejar já, atrás de chave (Recomendado)" | ST de substituto no PR-6, atrás de `icmsStSubstituto`, só com IVA-ST `PUBLISHED`. Supera o F-ICMS-3 (b) |
| F-ICR-6 | "Calcular, com trava de fonte (Recomendado)" | Antecipação calculada (ou alerta sem IVA-ST); complemento e ressarcimento só com a CAT 42/2018 transcrita |
| F-ICR-7 | "Automático pelo estoque (Recomendado)" | Crédito médio por unidade no estoque; perda gera estorno |
| F-ICR-8 | "Pilha em integration/icms-rpa (Recomendado)" | 9 PRs empilhados em `integration/icms-rpa` |
| F-ICR-9 | "Política do contador, padrão 'fora' (Recomendado)" | `icmsBaseIncluiIbsCbs` na política versionada, padrão `false`, com aviso; a pergunta vai ao tributarista |
| F-ICR-10 | "Absorver neste nó, BRIEF próprio (Recomendado)" | A EFD ICMS/IPI é a fase final do ICMS-EFD, com BRIEF e autorização próprios; lacuna `3b81` (metade ICMS/IPI) aponta para cá |

**Ressalva do F-ICR-9 (conferida depois da resposta):** a pergunta dizia que o leiaute destaca o IBS/CBS "por fora".
A NT 2025.002 v1.52 apoia isso só em parte. O total `vNFTot` (W60, "com IBS / CBS / IS") é separado do `vNF`, e a
UB16-10 subtrai o `vICMS` da base do IBS/CBS. Mas nenhuma regra diz o que entra no `vBC` do ICMS (BRIEF §8 item 10,
grau **inferido**). A resposta vale, condicionada à pergunta ao tributarista (§8 item 8). Se a fonte contrariar, o padrão
da política volta ao dono e não é trocado em silêncio.

**Não é "executa".** Cada PR do BRIEF precisa de pedido próprio do dono.
