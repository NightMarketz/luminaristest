---
id: "D-2026-10-17-AMBIGUIDADES-A1-A10"
tipo: "decisao"
dominio: "fiscal"
titulo: "Ratificação por questionário: ambiguidades A1–A10 da verificação legal de 17/10 (A9 reabre o F-NFCE-7; A4 fica em 19%)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-17: respostas ao AskUserQuestion da sessão (A9, A4, pacote externo) — sem 'executa'"
atualizado: "2026-10-17"
---
# D-2026-10-17-AMBIGUIDADES-A1-A10 — cédulas das ambiguidades do consolidado

**Estado:** `decided`
**Autorização:** dono, chat, 17/10/2026, respostas ao AskUserQuestion. O agente apresentou cada item com contexto e
recomendação, e o dono decidiu.
**Não é "executa"** (ORCH-006): nenhum nó ganha autorização de código com esta nota.

Origem: [`VERIFICACAO-2026-10-17-CONSOLIDADO.md`](../../../pesquisas-legais/VERIFICACAO-2026-10-17-CONSOLIDADO.md),
seção "Ambíguo".

## Decididas pelo dono

| # | Pergunta (resumo) | Recomendação | Resposta do dono | Contra? |
|---|---|---|---|---|
| A9 | Reabrir o F-NFCE-7 (b) "sem CPF, sem nota"? | permitir NFC-e sem CPF abaixo de R$ 10 mil | *"Permitir sem CPF (Recommended)"* | não |
| A4 | Anexo I, 6ª faixa, 2029+: 19% (LC 214) × 18,9% (Res. CGSN 190) | 19% + alerta | *"19% + alerta (Recommended)"* | não |
| A2, A3, A5–A8 | Adotar a leitura mais segura e montar o pacote externo? | sim | *"Sim, monta o pacote (Recommended)"* | não |

- **A9 → reabre e substitui o F-NFCE-7 (b)** de [[D-2026-10-02-X10A-NFCE-FORKS]]. Passa a valer a (a): NFC-e sem
  CPF/CNPJ é permitida abaixo de R$ 10.000 em venda presencial (Aj. SINIEF 19/16 cl. 4ª VII "a"/"b", segundo o dossiê
  [`verif-2026-10-17-nfe-nfce-dfe`](../../../pesquisas-legais/verif-2026-10-17-nfe-nfce-dfe/relatorio.md) item 2 —
  **inferido do dossiê, não relido nesta sessão**). A partir de R$ 10.000, a emissão é recusada com o motivo nomeado.
  O F-DFE-7 (b) continua valendo para a NF-e 55. O BRIEF do [[X10a]] precisa de emenda, que não foi feita aqui.
- **A4 → mantém os 19%** que o projeto já usa (a lei complementar prevalece sobre a resolução) e **acrescenta um
  alerta**: quando a apuração cair na 6ª faixa do Anexo I a partir de 2029, ela avisa que o PGDAS-D pode calcular
  18,9% (Res. 190 Anexo I). O alerta é comportamento novo. Não há código, e ele entra no nó do Simples quando houver
  autorização.

## Leitura provisória até a resposta externa (pacote no PEDIDO-CONTADOR-2026-10-17)

| # | Leitura provisória adotada | Quem responde |
|---|---|---|
| A2 | Declarar na memória da apuração de 2026 a premissa de dispensa da CBS/IBS (LC 214 art. 348 §1º) | contador |
| A3 | Informação socioeconômica de 2026: prazo 31/03/2027, citando o art. 72 (revogado em 01/01/2027) e o art. 38-B da Res. 190 | contador |
| A5 | Nenhuma (o consolidado não indica leitura); a apuração segue como está | contador |
| A6 | Contar os meses em atividade (já aplicado no #760) | contador |
| A7 | Manter "exatamente 1" J930 com IND_RESP_LEGAL=S até o teste no PVA do [[H1]] | contador / PVA |
| A8 | Manter o teto de 2% para consumidor PF | advogado |

Pacote: [`PEDIDO-CONTADOR-2026-10-17-AMBIGUIDADES.md`](../../accounting/PEDIDO-CONTADOR-2026-10-17-AMBIGUIDADES.md).
**O dono envia** (CTD-001), e não há registro de envio.

## Sem decisão nova

- **A1** (o que substitui a inutilização em SP): já tratada em [[D-2026-10-17-X10A-INUTILIZACAO-SP]]. A pergunta ao
  Fale Conosco da SEFAZ-SP está pronta no relatório `sp-inutilizacao-nfe-nfce-2026-11` §4. Quem envia é o dono.
- **A10** (clínica, item 4 × 6.02): segue aberta no dossiê `ctribnac-salao-clinica`.
