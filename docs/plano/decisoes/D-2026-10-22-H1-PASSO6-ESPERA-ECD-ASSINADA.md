---
id: "D-2026-10-22-H1-PASSO6-ESPERA-ECD-ASSINADA"
tipo: "decisao"
dominio: "gate"
titulo: "H1: o passo 6 (validação da ECF) fica pausado até haver ECD assinada (M2 ou 1º cliente); o L11 (Y600) segue para planejamento"
estado: "decided"
autorizacao: "dono, chat, 2026-10-22: \"Pausa o passo 6 do H1 até haver ECD assinada (M2 ou 1º cliente) e registra isso; segue para o L11 em planejamento.\" Decide a pausa do passo 6 e o trilho do L11 (planejamento, só BRIEF); não autoriza código do L11 nem muda o estado do H1"
atualizado: "2026-10-22"
---
# D-2026-10-22-H1-PASSO6-ESPERA-ECD-ASSINADA: passo 6 do H1 espera ECD assinada

**Estado:** `decided`.
**Autorização:** dono, chat, 22/10/2026 (citação no frontmatter).

## Contexto

Na tentativa 3 do [`RUNBOOK-H1-PVA`](../../accounting/RUNBOOK-H1-PVA.md), com o P6 de dados públicos
([`H1-P6-DADOS-PUBLICOS-2026-10-13`](../../accounting/H1-P6-DADOS-PUBLICOS-2026-10-13.md)):

- a ECD importou e validou no PVA com 0 erros (13 advertências não impeditivas);
- a ECF importou depois da correção do L10 (#837), e a presunção de IRPJ/CSLL que o PVA calcula fechou com a receita do
  Luminaris nos 4 trimestres;
- a validação da ECF deu 19 erros. 18 vêm da ECD não recuperada (`0010.TIP_ESC_PRE = 'C'`), e o PVA da ECF recusa
  recuperá-la: *"Esta ECD não pode ser recuperada por não estar assinada."* O outro é o Y600 ausente (L11).

Com o P6 de dados públicos não há assinatura possível: o CNPJ é real e de terceiro, e os signatários são fictícios.

## Decisão

1. **O passo 6 do H1 fica pausado até haver uma ECD assinada**, no M2 ou com o 1º cliente. Não se assina nem se
   transmite nada com o CNPJ do P6 de dados públicos.
2. **O L11 (Y600, identificação dos sócios) vai para planejamento** (`sessao-planejamento`, só BRIEF). Ele não depende
   da assinatura e deve aparecer em qualquer validação da ECF.
3. O estado do [[H1]] continua `human-open`. O DESFECHO e a ASSINATURA do runbook seguem só do dono, e a assinatura já
   estava diferida ao M2 (dono, 13/10).

## Consequências

- Na retomada: gerar a ECD com os dados do tenant real, assinar no PVA da ECD (dono), recuperar no PVA da ECF e validar
  (passo 6). Antes de reimportar, excluir a escrituração anterior da base de cada PVA (lição do L3b).
- O que já foi provado pelo PVA nesta passada não precisa ser refeito para fechar o passo 6. A ECD do cliente real passa de
  novo pelo passo 4 de qualquer forma.
