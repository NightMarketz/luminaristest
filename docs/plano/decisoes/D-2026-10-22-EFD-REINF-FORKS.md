---
id: "D-2026-10-22-EFD-REINF-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Forks F-REINF-6..13 do BRIEF EFD-REINF ratificados por questionário, todos pela recomendação (a); devDependency xmllint-wasm aprovada"
estado: "decided"
autorizacao: "dono, chat, 2026-10-22: \"Dispara 1 pra ratificar os forks\" (sessão de ratificação aberta pela sessão de origem). Respostas no AskUserQuestion de 22/10, 3 rodadas (a 1ª em par com F-RET-16/18). Decide forks; NÃO é 'executa' nem merge"
atualizado: "2026-10-22"
---
# D-2026-10-22-EFD-REINF-FORKS

**Estado:** `decided`. **Autorização:** dono, chat, 2026-10-22 — *"Dispara 1 pra ratificar os forks"*. As opções vieram de
`docs/accounting/BE-INCR-EFD-REINF-brief.md` §6 (#848), lido inteiro. Nó: [[EFD-REINF]]. F-REINF-8 e F-REINF-9 foram
perguntados junto de F-RET-16 e F-RET-18 ([[D-2026-10-22-RETENCOES-FONTE-FORKS]]).

## Respostas do dono (literal = o rótulo escolhido no questionário)

| Fork | Resposta literal | Opção | O que fica decidido |
|---|---|---|---|
| F-REINF-6 assinatura × XSD | "(a) Teste assina (Recomendado)" | (a) | download da fase 1 sem assinatura; o teste assina com a chave de teste e valida no XSD oficial inalterado |
| F-REINF-7 validador XSD | "(a) xmllint-wasm (Recomendado)" | (a) | devDependency `xmllint-wasm`, só nos testes (OK do dono à dependência nova) |
| F-REINF-8 CSRF no R-4020 | "(a) Pelo código da linha (Recomendado)" | (a) | código agregado ⇒ `vlrAgreg` (2026: as 3 linhas chegam com 5952-07); código separado ⇒ separada; 2027 só CSLL |
| F-REINF-9 R-4010 de PF por serviço | "(a) Declara, condicionado (Recomendado)" | (a) | declara (natureza 10002), condicionado a P-REINF-8 e ao cadastro de dependentes do nó de pessoal; até lá, aviso `PF_SERVICO_FORA_DA_REINF` |
| F-REINF-10 reabertura | "(a) Entra no PR-4 (Recomendado)" | (a) | R-4099 de reabertura e R-2098 no PR-4; fase 1 marca `REABRIR_ANTES` |
| F-REINF-11 estabelecimento | "(a) Centralizado (Recomendado)" | (a) | `nrInscEstab` = CNPJ da matriz para todas as unidades |
| F-REINF-12 campos opcionais | "(a) Só se cadastrado (Recomendado)" | (a) | `softHouse` e `ideRespInf` só com dado cadastrado |
| F-REINF-13 certificado (PR-4) | "(a) O da unidade (Recomendado)" | (a) | `FiscalCertificate` da unidade escolhida, raiz do CNPJ = raiz do contribuinte |

Nenhuma escolha contra a recomendação.

## Efeito

O BRIEF fica sem fork pendente. O PR-1 continua dependendo do PR-1 e do PR-2 do RETENCOES-FONTE em `main` (§3 do BRIEF) e do
próprio `executa`. O PR-4 segue condicionado ao F-REINF-2 (a).

## O que NÃO decide

Não é `executa`, não é merge e não responde nenhuma P-REINF.
