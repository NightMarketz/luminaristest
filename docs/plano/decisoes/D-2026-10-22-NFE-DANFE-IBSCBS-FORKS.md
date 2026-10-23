---
id: "D-2026-10-22-NFE-DANFE-IBSCBS-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Forks F-DANFE-1..8 do BRIEF NFE-DANFE-IBSCBS ratificados por questionário; F-DANFE-4 = biblioteca nova (contra a recomendação)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-22: \"Dispara 1 pra ratificar os forks\" (sessão de ratificação aberta pela sessão de origem). Respostas no AskUserQuestion de 22/10, 2 rodadas. Decide forks; NÃO é 'executa' nem merge"
atualizado: "2026-10-22"
---
# D-2026-10-22-NFE-DANFE-IBSCBS-FORKS

**Estado:** `decided`. **Autorização:** dono, chat, 2026-10-22 — *"Dispara 1 pra ratificar os forks"*. Escopo: levar os forks
pendentes ao dono e registrar as respostas. As opções vieram de `docs/accounting/BE-INCR-NFE-DANFE-IBSCBS-brief.md` §5 (#845),
lidas no BRIEF inteiro antes de perguntar. Nó: [[NFE-DANFE-IBSCBS]]. Prazo legal: 01/12/2026 (NT 2026.010).

## Respostas do dono (literal = o rótulo escolhido no questionário)

| Fork | Resposta literal | Opção | Recomendação do BRIEF |
|---|---|---|---|
| F-DANFE-1 quem gera | "(a) Backend (Recomendado)" | (a) servidor: HTML + `htmlToPdf`, rota `GET /dfe/documents/:id/danfe` | (a) |
| F-DANFE-2 DANFE NFC-e | "(a) Fora (Recomendado)" | (a) fora; segue o F-NFCE-E1-6 (b) de 13/10 | (a) |
| F-DANFE-3 leitura do XML | "(b) Leitor próprio (Recomendado)" | (b) `readDanfeModel` sobre `readNfeTree`; `ParsedNfe` não muda | (b) |
| F-DANFE-4 código de barras | "(b) Biblioteca nova" | (b) **dependência nova** (ex. do BRIEF: `bwip-js`) | (a) — **escolha contra a recomendação** |
| F-DANFE-5 quando gerar | "(a) Sob demanda (Recomendado)" | (a) sob demanda, sem gravar | (a) |
| F-DANFE-6 orientação/canhoto | "(a) Retrato + canhoto (Recomendado)" | (a) só retrato, canhoto sempre | (a) |
| F-DANFE-7 um ou dois leiautes | "(a) Só o novo (Recomendado)" | (a) só o leiaute novo, **condicionado**: se o X10a PR-7 for à produção antes de 01/12/2026, o fork volta ao dono (P4) | (a) |
| F-DANFE-8 QR Code | "(b) Área vazia (Recomendado)" | (b) área vazia + aviso `QRCODE_NAO_RENDERIZADO` até a NT do QR | (b) |

## Efeito no BRIEF

- **F-DANFE-4 (b):** o item 13 e o contrato `lib/danfe/code128.ts` deixam de ser encoder próprio; o PR-2 nomeia o pacote
  (dependência de runtime no servidor, com o OK do dono dado por esta resposta) e a simbologia continua a que o MOC fixar no item 2.
  O teste do item 13 continua (vetor do MOC ou ida e volta das 44 posições; entrada inválida ⇒ erro).
- **F-DANFE-1 (a):** confirma o achado §9 item 1 (texto do ADR-DFE §3 D1 desatualizado); a emenda do ADR segue exigindo pedido próprio.

## O que NÃO decide

Não é `executa` de nenhum PR (PR-0..PR-3 continuam precisando do próprio), não é merge e não toca P1–P5 (validação externa).
