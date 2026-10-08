---
id: "D-2026-10-07-NUCLEO-KIT-DE-SETOR"
tipo: "decisao"
dominio: "governanca"
titulo: "Núcleo contábil/fiscal universal + estrutura por setor importada por select — decisões do dono no chat de 07/10"
estado: "decided"
autorizacao: "dono, chat, 2026-10-07: \"Esta autorizado\" (transformar a ideia em trabalho) + \"Pode passar esse plano na frente de tudo\" — PRE-ADR; sem 'executa'"
atualizado: "2026-10-07"
---
# D-2026-10-07-NUCLEO-KIT-DE-SETOR — decisões do dono (chat, 07/10/2026)

**Estado:** `decided`. As decisões abaixo foram dadas pelo dono no chat de 07/10, durante a maturação da ideia.
Documento de proposta: [`PRE-ADR-NUCLEO-KIT-DE-SETOR.md`](../../adr/PRE-ADR-NUCLEO-KIT-DE-SETOR.md) (forks F-KS-* **pendentes**).
**Não é "executa"** (ORCH-006). Nenhum nó em `nos/` antes de o PRE-ADR ser ratificado (`docs/plano/README.md`).

> Terminologia: no chat a estrutura importada foi chamada de "pacote". Nos documentos ela se chama **kit de setor**, para
> não colidir com o *pacote pré-pago* do salão ([[PACOTE-VALIDADE]], conta 2.1.1). O nome é o fork F-KS-1.

## Reenquadramento do parceiro fiscal (afeta [[D5]])

| # | Fala literal do dono | Efeito |
|---|---|---|
| 0a | *"Não é pra ter conta focus, é pra usar a api deles para aprender e fazer a nossa"* | A Focus NFe é referência de desenho, não fornecedor ([`FOCUS-API-ESTUDO-2026-10-07.md`](../../accounting/FOCUS-API-ESTUDO-2026-10-07.md)) |
| 0b | *"sim, atualiza o D5 para emissor próprio no ADN"* | [[D5]] reescrito (fold 07/10) |

## Tese e decisões

| # | Fala literal do dono | Decisão |
|---|---|---|
| T1 | *"estou pensando que banco e livro de contas são universais as regras, elas mudam por regime fiscal só"* | O núcleo (razão + invariantes) é universal; o regime é uma estratégia |
| T2 | *"o que é mutável de empresa pra empresa precisa estar isolado aqui tbm já que somos um erp/crm builder"* | O que varia por empresa fica isolado da lógica |
| T3 | *"Escolha da empresa deve ser através de um select e isso importa a estrutura pronta."* | A escolha importa uma estrutura pronta (o kit) |
| T4 | *"O dynamic table é o que os outros projetos substituem com verticais rigidos e reais"* | A origem dos fatos é trocável: DynamicTable aqui, vertical rígido nos outros projetos do dono |
| 1 | *"Select é guiado pelo wizard em formato de chat com a IA, já está documentado isso"* | O select é o wizard/entrevista (`sectorKey` → `activate-default`) |
| 2 | *"Sim, quem tinha a versão 1 ganha a versão 2 por atualização."* | O kit se atualiza nos tenants (não é cópia congelada) |
| 3 | *"Aqui é decisão arquitetural, acho que deveriam existir ambos os eventos, assim ganhamos mais controle"* | Evento de negócio **e** fato contábil, ligados (rastro evento → fato → lançamento) |
| 4 | *"Perfeito"* (troca de regime: o plano fica, e mudam a estratégia e o referencial do ano, só acrescentando) | Ratificado |
| 5 | *"Sim tbm entra no pacote"* | Os padrões fiscais por serviço entram no kit |
| 6 | *"Sua sugestão esta correta"* (a IA escolhe o kit e propõe ajustes; o contador valida) | Ratificado |
| 7 | *"Concordo com esses 3 níveis"* | Atualização: (a) o que só acrescenta entra sozinho; (b) regra alterada vale daqui para frente; (c) colisão com ajuste do contador ou com conta já usada → pendência do contador, e a empresa segue na regra antiga até ele decidir |
| 8 | Questionário: *"Código no pacote (Recommended)"* | Mantém o trilho [[T10]]; a rejeitada [[R-motor-regras]] **não** é reaberta. A leitura dessa resposta à luz do P1 é o fork F-KS-2 |
| 9 | *"Pode passar esse plano na frente de tudo, pq não faz sentido criar nem corrigir nada se não estiver na estrutura correta"* | Prioridade 1 da fila. O alcance sobre o que já está `inflight` é o fork F-KS-0 |
