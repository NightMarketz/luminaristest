---
id: "D-2026-11-07-REGUA-DENOMINADOR"
tipo: "decisao"
dominio: "plataforma"
titulo: "Régua: C9 e X6 fora do denominador, régua fecha contra adaptador falso (prova real no BYOK), F6 adiado — 55/60"
estado: "decided"
autorizacao: "dono, chat, 2026-11-07: \"1. Tirar C9 e X6 do denominador, o que dá 55/61 (90%) em vez de 55/63. 2. Redefinir X10a, X10i e X11 como 'completos contra adaptadores falsos, prova real no BYOK', ou movê-los para diferidos. 3. Reabrir ou adiar o F6. Decide por mim\" — decisão delegada ao agente; não é `executa`"
atualizado: "2026-11-07"
---
# D-2026-11-07-REGUA-DENOMINADOR

**Estado:** `decided`. **Autorização:** dono, chat, 07/11/2026, "Decide por mim" sobre as três perguntas (citação no
frontmatter). As três foram decididas pelo agente por delegação. **Não é `executa`** (ORCH-006): nenhum código de
produto muda; X10a e X11 seguem pedindo `executa` próprio.

**Efeito na régua:** de 55/63 (87%) para **55/60 (92%)**. Abertos: [[F5]], [[X10a]], [[X11]], [[X7]], [[X9]].

## 1. C9 e X6 saem do denominador

- **Fato:** os dois estão `done` com `fecha_regua: false`. O script contava os dois no total e nunca no fechado. Eram
  2 dos 8 "abertos" da régua sem ter nada aberto.
- [[C9]]: o dono já decidira em 25/09 (D-3 do [[DUVIDAS-INVENTARIO]]) que ele "não conta, absorvido no C8". A nota de
  origem dizia "sem ele o contábil teria 21 linhas". O script ficou com 22.
- [[X6]]: a leitura ratificada (fold 22/09, §M5.1) o trata como crescimento do nó NF-e, não como linha. A D-1 ficou
  aberta, mas as duas leituras dão a mesma conclusão: se X6 é linha, está fechado (56/63); se não é, sai (55/61). 55/63
  não sai de nenhuma das duas. Fica a leitura ratificada.
- **Mudança:** `scripts/plano-vault.mjs` tira `fecha_regua: false` do numerador e do denominador. O teste
  `scripts/plano-vault.test.mjs` antes fixava o contrário ("fica no denominador"). Ele foi escrito em 23/09, com a D-1 e
  a D-3 abertas. Agora fixa a regra nova e reprova o script antigo (conferido: 9/10 no código de `main`).

## 2. Régua fecha contra adaptador falso; a prova real fica no X10i

- **Regra:** nó de régua de emissão fecha com o código e os testes em `main` contra o adaptador falso canônico (SEFAZ
  falsa, assinador falso, `NullEmissor`). A 1ª emissão real com o certificado do cliente (BYOK, pelo assinador local) é
  **prova**, guardada no subnó [[X10i]], fora da régua.
- **Por que não "diferido":** a NFC-e é obrigação atual do 1º cliente (SP, com IE; SAT vedado desde 01/01/2026). Tirar
  X10a e X11 do denominador esconderia uma obrigação legal que ainda tem código por fazer.
- **Precedente:** a escrituração já funciona assim. Os nós de ECD e ECF fecharam no código, e o PVA é prova do gate
  [[H1]] ("o H1 prova a régua, não esse cliente").
- **Aplicada hoje, a regra não fecha nenhum dos dois.** Os dois têm código ratificado ainda não feito:
  - [[X10a]] → `ready` (era `blocked` por [[D5]], bloqueio que caducou com [[D-2026-10-30-D5-SEM-CONTRATACAO-BYOK]]).
    Falta a EMENDA-4 do assinador local (AL-PR-0..6, [[D-2026-10-30-X10A-EMENDA-4-FORKS]]) e o FE do assinador
    ([[D-2026-10-31-FE-NFCE-ASSINADOR-FORKS]]). O `depende_de` perde o D5.
  - [[X11]] → `ready`. Fecha com o PR-2 do `BE-INCR-DFE-EVENTOS` contra o `NullEmissor`, como o BRIEF já desenha.
    Supera o F-EVT-7 (a) só no trecho "PR-2 espera o X10i". O `depende_de` perde o X10i.
  - [[X10i]] continua `subno` e `blocked`. Ganha o papel de guardar a prova real dos dois.

## 3. F6 adiado e fora da régua

- **Fato** (fold de 28/10, doc oficial lida): o Payouts do MP só debita a conta de quem integra, e a chave Ed25519
  passa pelo time de Integrações do MP. Não há operação em nome de terceiro documentada.
- **Por que não reabrir:** o ramo (i), cliente como integrador, obrigaria cada salão a pedir aprovação ao MP; não é
  autosserviço. O ramo (ii), banco do cliente, depende do [[D6]], que só volta com cliente com CNAB. Pix de saída não é
  obrigação legal e não tem cliente antes do go-live de 2027.
- **Mudança:** [[F6]] vira `tipo: subno`, `estado: deferred`. **Reabre se:** (a) o MP documentar Payouts em nome de
  terceiro (OAuth), ou (b) um cliente pedir Pix de saída pelo banco dele.
- Reverter é uma linha (`tipo: regua`) e a régua volta a 55/61.

## O que esta decisão não faz

- Não dá `executa` para a EMENDA-4, o FE do assinador ou o PR-2 do X11.
- Não muda nenhum fork ratificado, exceto o trecho do F-EVT-7 citado no item 2.
