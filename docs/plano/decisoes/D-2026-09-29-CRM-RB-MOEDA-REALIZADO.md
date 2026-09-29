---
id: "D-2026-09-29-CRM-RB-MOEDA-REALIZADO"
tipo: "decisao"
dominio: "plataforma"
titulo: "CRM-RB × moeda, 2ª rodada: simulado no CRM-RB, realizado + monitor de câmbio via ADR de moeda no Contas a Receber; achado Won-USD registrado"
estado: "decided"
autorizacao: "dono, 2026-09-29, em sessão (questionário de 3 perguntas sobre a emenda do BRIEF CRM-RB, PR #448): \"ADR moeda no A Receber e ainda um monitor que avisa quando vale a pena fazer esse câmbio\" + \"Registrar; corrige no ADR\"; antes, em chat: \"8a é a simulação do cambio do momento da simulação e depois calcular se foi feito o cambio mesmo com os dados do cambio real\""
atualizado: "2026-09-29"
---
# D-2026-09-29-CRM-RB-MOEDA-REALIZADO — simulado × realizado no câmbio do CRM

**Estado:** `decided`
**Autorização:** dono, 2026-09-29, em sessão, sobre a emenda do BRIEF [[CRM-RB]] (PR #448). A 1ª rodada é a decisão 14 de
`D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE` (PR #440). **Não é "executa".**

## Decisões

| # | Tema | Decisão | Palavras |
|---|---|---|---|
| 1 | F-RB8a — data da taxa | **Dois números.** O **simulado** é a PTAX do momento da consulta e fica no CRM-RB. O **realizado** é o câmbio de fato, que vem do recebimento no Contas a Receber por um **ADR de moeda** (reabre a [[R-multimoeda]]). | *"8a é a simulação do cambio do momento da simulação e depois calcular se foi feito o cambio mesmo com os dados do cambio real"* + *"ADR moeda no A Receber"* |
| 2 | Monitor de câmbio (novo) | **Entra no escopo do ADR de moeda:** um monitor que avisa quando vale a pena fazer o câmbio | *"e ainda um monitor que avisa quando vale a pena fazer esse câmbio"* |
| 3 | F-RB8f — colisão com a R-multimoeda | **Resolvido pela #1.** A tabela `PtaxRate` do CRM-RB é exibição e não colide. A parte contábil vai explicitamente para o ADR | decorre da #1 |
| 4 | Achado: Won em USD/EUR vira título a receber em R$ nominal | **Registrar no GAP-MAP `[ABERTO]`** (Nível 3); o conserto vai para o ADR de moeda | *"Registrar; corrige no ADR"* |
| 5 | F-RB8b, 8c, 8d, 8e, `avg`, fontes `leadPipelines`/`leadStages` | **Fechados pela sessão por regra** (um só caminho razoável). O dono foi avisado ("fecho por regra, se você não vetar") e não vetou | — |

**Esta nota só documenta a direção.** A autorização do que for executado (inclusive redigir o ADR de moeda) é decidida em
outra sessão; nada aqui autoriza trabalho novo (dono, 29/09: *"Aqui vamos apenas documentar, quem vai autorizar oque, é em
outra sessão"*). O nó do ADR só nasce em `nos/` depois de PRE-ADR ratificado (`docs/plano/README.md`).

## Perguntas que o ADR de moeda herda (não decididas)

- **Realizado:** o título guarda moeda e valor de origem e a baixa guarda o R$ creditado (`ReceivableReceipt`,
  `schema.prisma:1068`). Isso gera a diferença contra o simulado e, na contabilidade, a variação cambial. O tratamento
  contábil da variação é **pendente de validação externa** (contador).
- **Monitor — "vale a pena":** qual referência comparar com a PTAX do dia (a taxa simulada no ganho, a do título, uma
  média de N dias) e com qual limiar. Recomendação a levar ao ADR: **limiar configurado pelo usuário**. O sistema avisa
  quando o limiar é cruzado e não prevê câmbio.
- **Monitor — sobre qual posição:** títulos em moeda ainda não recebidos, ou moeda já recebida e ainda não convertida. A
  segunda só existe se o ADR aceitar saldo em moeda estrangeira.
- **Monitor — canal e cadência:** aviso no app ou e-mail. A cadência de 1×/dia depois da PTAX reusa o job do CRM-RB.
- A `PtaxRate` nasce num módulo neutro (`server/src/features/fx/`), não em `features/crm`, porque o ADR e o monitor vão
  reusá-la.

## Pendente (dono)

- **Valor de pipeline** (BRIEF CRM-RB §4.2). O dono perguntou *"Qual a real diferença entre leads e oportunidades?"*; a
  resposta factual está no §4.2. A decisão continua pendente e não bloqueia o CRM-RB.
