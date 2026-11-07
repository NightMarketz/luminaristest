---
id: "D-2026-11-07-REGUA-REDEFINICAO"
tipo: "decisao"
dominio: "governanca"
titulo: "Régua v2: C9 e X6 saem do total, X10a fecha contra adaptadores falsos (prova real no D5/BYOK), F6 vira diferido"
estado: "decided"
autorizacao: "dono, chat, 2026-11-07: \"Recomendado em todas\" — respondendo Q1 (a), Q2 (a) e Q3 (a) de PROPOSTA-REGUA-REDEFINICAO-2026-11-07, que o agente redigiu a pedido (\"Sim, redija\"). Decide a contagem da régua e o estado de X10a e F6; não fecha nenhum gate do Bloco A, não autoriza código além do filtro do índice e do teste dele."
atualizado: "2026-11-07"
---
# D-2026-11-07-REGUA-REDEFINICAO

**Estado:** `decided`. **Autorização:** dono, chat, 07/11/2026 (citação no frontmatter).
**Base:** [[PROPOSTA-REGUA-REDEFINICAO-2026-11-07]] (medição de 07/11, graus V/I/A lá).

## Decisão

1. **Q1 (a).** Nó com `fecha_regua: false` **sai do denominador**, além de não contar como fechado. C9 (D-3, 25/09) e
   X6 (D-1 de [[DUVIDAS-INVENTARIO]]) deixam de ser pendentes impossíveis. Supera a regra "fica no denominador" que o
   teste de `scripts/plano-vault.test.mjs` fixava.
2. **Q2 (a).** [[X10a]] passa a `done` com a definição: adaptador SEFAZ da NF-e/NFC-e, QR Code v3/CSC e contingência
   off-line implementados e testados contra SEFAZ/PSC falsos. **Prova real pendente: [[D5]] (BYOK), que segue
   `human-open`**; a dependência dele passa a pontilhada. Reverte em parte a D-2 de 29/09
   ([[D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE]], decisão 6). **[[X11]] segue aberto** (a proposta não verificou
   que o resíduo dele é só de emissão real).
3. **Q3 (a).** [[F6]] vira **diferido** (sai do total). Condição de reabertura: o cliente como integrador (BYOK,
   F-PP-1 b) ou Pix pelo banco do cliente ([[D6]]).

## Efeito (medido no índice regenerado em 07/11)

Régua v2: **56/60** (contábil 21/21 · financeiro 17/18 · fiscal 18/21). Abertos: [[F5]], [[X7]], [[X9]], [[X11]].
A régua v1 (63 nós) fica como histórico: 55/63 até 07/11.

## O que não muda

- Nenhum gate do Bloco A fecha por esta decisão (H1, H2, M2, D5 seguem `human-open`).
- A régua F (22 nós, [[D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS]]) segue fora do total; placar próprio.
- Nada de aparato de auditoria novo: mudou um filtro do índice gerado e o teste dele.
