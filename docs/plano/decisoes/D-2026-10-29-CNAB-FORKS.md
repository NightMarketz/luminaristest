---
id: "D-2026-10-29-CNAB-FORKS"
tipo: "decisao"
dominio: "financeiro"
titulo: "Ratificação por questionário: forks F-CNAB-1..9 do BRIEF do adaptador CNAB 240 de cobrança (F5)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-29 (AskUserQuestion, sessao-planejamento do BE-INCR-CNAB-COLLECTION), sob o executa de 29/10 (D-2026-10-29-EMISSAO-SIMPLES-E-FINANCEIRO §2 item 3, PR #971)"
atualizado: "2026-10-29"
---
# D-2026-10-29-CNAB-FORKS — forks do adaptador CNAB 240 de cobrança

**Estado:** `decided` (F-CNAB 9/9). **8 na recomendação; F-CNAB-8 → (b), contra a recomendação.**
**Nó:** [[F5]]. **BRIEF:** [`BE-INCR-CNAB-COLLECTION-brief.md`](../../accounting/BE-INCR-CNAB-COLLECTION-brief.md) §5.
**Autorização de origem:** a cédula `D-2026-10-29-EMISSAO-SIMPLES-E-FINANCEIRO` (PR #971, aberto quando esta nota foi
escrita) manda que *"os forks novos voltam ao dono antes do código"*. Esta nota registra a volta.

| Fork | Pergunta (resumo) | Resposta do dono | Recomendação |
|---|---|---|---|
| F-CNAB-1 | O P-IA bloqueia o adaptador genérico? | **Não bloqueia**: perfil de banco declarativo no repo; o P-IA, quando existir, só propõe perfis | a mesma |
| F-CNAB-2 | Versão do leiaute FEBRABAN (a 11.0 de 11/09/2026 se declara preliminar) | **10.11 + CNPJ alfanumérico em Q/T**; o retorno tolera segmentos X/Y; split fica para a 11.x final | a mesma |
| F-CNAB-3 | Caminho do dinheiro do retorno até a baixa | **Conta transitória**: extrato da `PaymentAccount BANK_CNAB` → item F7 `CNAB_RETURN` → confirm humano | a mesma |
| F-CNAB-4 | Data da baixa | **Data da ocorrência** (pagamento); se vier vazia, a do crédito | a mesma |
| F-CNAB-5 | Quem emite e numera o boleto | **Banco emite, distribui e numera**; o Luminaris casa pelo G072 (`charge.id`) | a mesma |
| F-CNAB-6 | Instruções de remessa | **Completo + protesto**: 01, 02, 06 e, no PR-4, protesto (09/10/11) e abatimento (04/05) | a mesma |
| F-CNAB-7 | Escolha da conta com MP e banco ativos | **`paymentAccountId` opcional**, 400 `payment_account_required` se ambíguo | a mesma |
| F-CNAB-8 | Limite de multa e juros | **Sem teto, só aviso na tela** | (a) multa ≤ 2% recusada acima |
| F-CNAB-9 | Ativação de conta sem credencial | **`PATCH DRAFT → ACTIVE` só para `BANK_CNAB`** (config e perfil validados) | a mesma |

## Consequências registradas

- **F-CNAB-8 (b):** o backend valida só o formato dos termos (bps de 1 a 10000). O aviso de multa acima de 2% é da
  tela (FE). A pergunta ao advogado P-CNAB-5 continua aberta e passa a definir o **texto** do aviso, não um bloqueio.
- **F-CNAB-1 (a):** a aresta pontilhada `F5 → P-IA` passa a significar "o P-IA alimenta o perfil do banco", não "a
  remessa espera o P-IA". Mover a aresta no vault é fold posterior.
- **F-CNAB-9 (a):** emenda a regra de 03/10 ("ao pé da letra", `PATCH` só `ACTIVE ↔ DISABLED`) **apenas** para
  provedor sem credencial; para o Mercado Pago, nada muda.
- Pendências que não se decidem aqui: contador P-CNAB-1..4 (conta transitória, data, tarifa, juros recebidos) e
  advogado P-CNAB-5/6 (BRIEF §6).
