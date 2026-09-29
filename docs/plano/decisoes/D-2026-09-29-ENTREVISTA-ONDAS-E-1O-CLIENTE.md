---
id: "D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE"
tipo: "decisao"
dominio: "plataforma"
titulo: "Entrevista de 29/09: 1º cliente (Simples, SP capital, com IE), fila régua+cliente, D-2 do inventário, MP no F5, onda 3 começa pelo Simples, forks de I4/I5/GOV/FE-INCR-DFE e CRM-RB"
estado: "decided"
autorizacao: "dono, chat, 2026-09-29: \"Pesquisa a fundo para ancorar as decisões que vamos tomar antes de entrevistar\" + \"Pode começar a entrevista\" + 6 questionários (AskUserQuestion); delegação anterior \"pode decidir tudo\" (28/09) para os forks do BRIEF FE-INCR-DFE"
atualizado: "2026-09-29"
---
# D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE — decisões da entrevista de 29/09

**Estado:** `decided`
**Autorização:** dono, chat, 29/09/2026. Seis questionários com contexto (`AskUserQuestion`), depois da pesquisa pedida
com *"Pesquisa a fundo para ancorar as decisões que vamos tomar antes de entrevistar"*.
**Base de evidência:** [`DOSSIE-DECISOES-2026-09-29.md`](../../accounting/DOSSIE-DECISOES-2026-09-29.md). Ele tem fonte e
grau de cada fato: código lido em `origin/main` `7c050670` e fonte oficial lida em 29/09.
**Não é "executa"**, salvo onde a tabela diz. "Planejar" autoriza BRIEF/ADR; código continua exigindo "executa" (ORCH-006).

## Fatos do 1º cliente (dono, questionário 1)

| Pergunta | Resposta |
|---|---|
| Regime | **Simples Nacional** |
| Município | **São Paulo capital** |
| Inscrição estadual | **Tem IE e vende produto no balcão** |

Consequências registradas (fonte no dossiê §0):
- **NFS-e:** pelo Emissor Nacional (web/API), **obrigatório e exclusivo desde 01/11/2026** (Res. CGSN 191/2026). Os campos de IBS/CBS só a partir de 01/01/2027 (Ato Conjunto 4 § 1º). A tela [[FE-INCR-DFE]] (modo manual) passa a ser o caminho legal desse cliente.
- **NFC-e 65:** obrigação **atual**, porque o CF-e-SAT está vedado em SP desde 01/01/2026 (Portaria SRE 79/2024). O [[X10a]] sobe de prioridade.
- **Obrigações do Simples:** ECF não se aplica e a ECD é facultativa (`obrigacoesPorRegime.ts:80,91`). O H1/H1b provam a régua Presumido/Real, não esse cliente.

## Decisões

| # | Tema | Decisão | Palavras / origem |
|---|---|---|---|
| 1 | U1: opção do Simples pelo regime regular de IBS/CBS (janela até 30/09) | **Fica no DAS** (sem opção). Nova chance em mar/2027 | *"Deixar no DAS"* |
| 2 | Fila do agente | **Régua e cliente juntos.** [[FE-INCR-DFE]] entra logo depois do [[SEED-UNITS]]; o cálculo do Simples espera a onda 3 | *"Régua e cliente juntos"* |
| 3 | D-1: seletor de unidade (trabalho de 28/09 sem commit) | **Integrar e mergear**: PR #438 | *"Integrar e já mergear"* |
| 4 | D-2: CRM Porte/Papel (trabalho de 28/09 sem commit, 15 arquivos, com Generic* e `db.ts` fora do BRIEF) | **Integrar tudo junto** e mergear com a CI verde: PR #439 (auto-merge) | *"Integrar tudo junto"* + *"Mergear quando a CI ficar verde"* |
| 5 | `icmsContribuinte` forçado a `false` no Simples (`FiscalProfileDto.ts:64`) | **Registrar no GAP-MAP** `[ABERTO]`; o conserto entra no BRIEF do [[X10a]] | *"Registrar no GAP-MAP"* |
| 6 | Dúvida D-2 do inventário | **[[X10a]] e [[X11]] abertos; [[X12]] fecha** (materializado pelo X4/FE-LALUR) | *"X10a e X11 abertos, X12 fecha"* |
| 7 | [[F5]]/[[F6]] com o Mercado Pago | **F5 = "cobrança por provedor de pagamento"**: MP como 1º adaptador, CNAB depois. **F6 bloqueado** pela liberação do Payouts pelo MP (gate externo). O token por cliente exige cifra em repouso (M2). Autorização segue F-M3: só ADR | *"F5 = cobrança por provedor"* |
| 8 | Qual PRE-ADR da onda 3 primeiro | **Simples/MEI** (PGDAS-D/DAS/DEFIS, anexos, fator R); IBS/CBS 2027 em seguida. A NFC-e sai da onda 3 e vai para o X10a | *"Simples/MEI primeiro"* |
| 9 | F-X7-1 | **(a) reabrir o F-M8 no ADR**: as duas formas por cliente; implementação em fases (motor trimestral primeiro). A V4 fechou (DIRF extinta; X9 = DCTFWeb + MIT; sem GIA-SP). A aresta X7 → D1 sai (a tabela de obrigações chegou em 23/09) | *"Reabrir no ADR"* |
| 10 | Downloads de fonte oficial | **Autorizados os 4:** Guia do Emissor Web v1.2, Anexo IV do ADN, NT 2025.002 v1.51, NT 2026.006 e 2026.007 | questionário (seleção múltipla) |
| 11 | BRIEF da [[FE-INCR-DFE]] | **Abrir com os 5 forks decididos:** PR-0 com as telas de perfil fiscal (unidade + serviço); toque no BE para persistir a releitura e expor os ids de XML/PDF; botão no `SaleDetailPanel`; upload por `input file` (padrão `NfePanel`); ambiente derivado da view, com aviso se divergir do `/status` | *"Abrir com os 5 decididos"* |
| 12 | Wizard (9 nós fora do vault) | **Só criar os nós**: I2 e I3 → done; I6, I7, I11, W1–W7 como `planned`. O 404 do W6 vai para o GAP-MAP e fica sem decisão de correção | *"Só criar os nós"* |
| 13 | [[I4]]/[[I5]] | **Recomendações ratificadas:** F-I4-1 a · **F-I4-2 b** (o tenant nasce; resposta com contabilidade Draft + bloqueios) · F-I4-3 a · F-I5-1 a (`NO_MAPPER_FOR_UNIT`, muda o enum do contrato) · F-I5-2 b (linha visível na UI). **Planejar autorizado** | *"Ratificar as recomendações"* |
| 14 | [[CRM-RB]] × moeda (fork novo F-RB8) | **Soma por moeda** (nunca misturar) **e, à parte, uma visão convertida por câmbio**, com a **PTAX do BCB, taxa do dia**, guardada numa tabela de taxas e com a data exibida. Emenda do BRIEF, mais corrigir os nomes de campo (`leads.value` → `latestProposalAmount`, etc.) antes do "executa" | *"Soma por moeda e conversão a parte com cambio"* + *"PTAX do BCB, taxa do dia"* |
| 15 | [[GOV-CONTADOR]] | **Recomendações ratificadas:** F-GOV-2 a · 3 a · 4 a · 5 a · 6 b · F-V1 c · V2 a · V3 b · V4 a. Entram no escopo as 2 lacunas novas (`openPeriod` como 2º caminho de reabertura; configurações/imobilizado na mesma policy). **Planejar autorizado.** F-GOV-1 (consulta ao CRC-SP) fica com o dono | *"Ratificar recomendações"* |
| 16 | Fase 3 do plano pós-contador | **Planejar autorizado** para as 4 emendas: 3.1 [[ITEM-DESTINATION]] (a posição oficial da RFB sobre monofásico entra como fork, sem esperar o contador), 3.2 [[C8]] (R$1.200 por unidade funcional + benfeitoria + retomada do Bloco F), 3.3 [[F7]]/[[X4]] (4 classes de encargo + descontos), 3.4 [[C6b]] (inventário/ficha/aging agora; memória de cálculo depois do X7) | questionário (seleção múltipla: as 4) |
| 17 | E-1: cancelar/devolver venda de pacote contabiliza errado | **Só registrar** no GAP-MAP `[ABERTO]`; sem instrumentação por ora | *"Só registrar"* |
| 18 | E-2: pacote sem validade | **Validade por pacote**: o pacote ganha prazo, e o vencido vira receita por não uso. Nó novo [[PACOTE-VALIDADE]] (implementação, BRIEF próprio). O tratamento contábil do vencido é pendente de validação externa (contador) | *"Validade por pacote"* |
| 19 | Registro | PR de docs com auto-merge quando a CI ficar verde | *"PR e mergear na CI verde"* |

## Erratas registradas pela pesquisa (fonte no dossiê §9)
- A transcrição da LC 214 art. 10 no corpus usava o **§ 5º revogado** e omitia o § 6º. Corrigida neste PR.
- "MOC 7.0 fora do corpus" (PLANO-EMISSAO F.3) está errado: o manual está no MANIFEST desde 26/09. O que falta é a transcrição de saída.
- "NF-e antecipada para 01/12/2026" (D7/X10i) está errado: é o **início** da obrigação para quem não tem IE (Ato 4 § 4º).
- "Hoje só CSV" (triagem 23/09, 3.4) está errado: o XLSX existe (`exceljs`, `DataExchangeDto.ts:59`).
- A citação `PeriodService.ts:34` no PRE-ADR GOV aponta para o `seedYear`; a reabertura fica em `:137-142` e em `openPeriod` `:45-53`.
- Nota do MANIFEST "Planalto reeditou sem mudar o tamanho": provável falso positivo (o token antirrobô `f5_p` muda o sha).

## Errata e fatos novos da sessão do ADR do X7 (29/09, PR #446)

Fontes primárias lidas na sessão que escreveu o [`ADR-INCR-TAX-ASSESSMENT`](../../adr/ADR-INCR-TAX-ASSESSMENT.md)
(§3 e §15 do ADR, com link e sha de cada uma). **Nenhuma decisão acima muda.** Corrigem-se fatos citados na decisão 9
e no dossiê §4:

- **DCTFWeb:** o prazo (último dia útil do mês seguinte) está no **art. 6º** da IN RFB 2.237/2024. Os arts. 8º–9º
  são os tributos e o MIT; o § 1º I do art. 9º manda os **retidos na fonte** para a EFD-Reinf.
- **DIRF:** foi **substituída** para fatos a partir de 01/01/2025 (IN 2.181/2024 art. 1º, que dá nova redação ao
  art. 3º § 1º da IN 2.043/2021).
- **LC 224:**
  - o limite de R$ 5 mi está no art. 4º **§ 5º**, não no § 4º VII (este só traz o +10%);
  - a lei já traz o rateio, e a **IN RFB 2.305/2025** (redação da 2.306/2026) o detalha: R$ 1,25 mi por trimestre,
    sobra transportada e acerto no 4º trimestre;
  - **CSLL desde 01/04/2026**, IRPJ desde 01/01/2026 (art. 3º da IN);
  - a estimativa do Lucro Real **não** é atingida (§ 2º II a cita só os arts. 25–26 da Lei 9.430);
  - ADI 7936 e ADI 7944 no STF, **sem cautelar** até 29/09.
- **MIT:** importa arquivo **JSON** no leiaute oficial 1.0; o usuário encerra a apuração importada. Isso resolve a
  "pendência MIT: arquivo × HTTP" do X7/X9 (F-X7-9 → recomendação (b)).
- **Balancete de suspensão/redução:** tem de ser transcrito no Diário (Lei 8.981 art. 35 § 1º a); a transmissão da
  ECD supre essa transcrição (IN 2.003 art. 9º III).
- **Códigos de receita:** mudam se o Lucro Real é **obrigatório ou por opção** (IRPJ 0220 × 3373; 2362 × 5993;
  2430 × 2456).

## Adendo 29/09 (tarde) — pesquisa do PRE-ADR do Simples (decisão 8)

Adendo de **evidência**. Não altera nenhuma das 19 decisões acima. Origem:
[`PRE-ADR-SIMPLES-NACIONAL-CALCULO`](../../adr/PRE-ADR-SIMPLES-NACIONAL-CALCULO.md) (PR #452, Proposed, forks F-SN-0..13
pendentes). As fontes foram lidas no corpus, com o sha conferido no MANIFEST. As 6 novas foram baixadas com a autorização
do dono ("Pode Baixar").

**O que a pesquisa confirmou ou corrigiu nesta nota:**
- **Decisão 1 (fica no DAS).** Agora é V pela lei, não mais inferência: LC 123 art. 13 §§ 9º–10, na redação da LC 214
  art. 517, vigente em 01/01/2027. O regime regular de IBS/CBS é **facultativo** e escolhido **por semestre** (em setembro
  e em março), sem volta dentro do semestre. Sem opção, o IBS/CBS é cobrado no DAS. Isso fecha o ponto "não verificado"
  do dossiê §10 (U1).
- **Decisão 1, efeito no valor.** Nas faixas 1–5 dos Anexos I e III de 2027–2028 (LC 214, Anexos XVIII e XX), a soma
  CBS + IBS é igual à soma PIS + COFINS de hoje. Na venda de serviço, **o DAS total do cliente não muda em 2027**.
- **Fatos do 1º cliente, "com IE e vende no balcão".** **Perfumaria e higiene saíram da substituição tributária do ICMS
  em SP em 01/04/2026** (Portaria SRE 94/2025, arts. 1º e 4º). Na revenda de cosmético, o ICMS volta para dentro do DAS.
  Até 2026 sobra só o PIS/COFINS monofásico (NCM 3303–3307). A partir de 2027 ele acaba, porque a CBS não tem monofásico
  para cosmético (inferido).
- **Obrigações do Simples** (complementa a linha "ECF não se aplica, ECD facultativa"). Pela Res. CGSN 140:
  - o DAS e o PGDAS-D vencem no **dia 20** (art. 40);
  - a DEFIS é entregue até **31/03** (art. 72 § 1º);
  - o livro-caixa é **dispensado pela escrituração contábil** (art. 63 § 3º).

  A partir de 2027, a declaração passa a ser **mensal**, traz as informações socioeconômicas e ganha uma "declaração
  assistida" da Receita (LC 123 art. 25, redação 2027). Que a DEFIS anual acabe depois do ano-calendário 2026 é
  inferência.
- **Enquadramento dos serviços 6.01/6.02/6.03.** Os três caem no **Anexo III, sem fator R**, pela Res. 140 art. 25 § 1º
  III "m" (serviços que não são atividade intelectual). O único juízo que sobra é o do contador. O Anexo VI da Res. 140 é
  a lista de **CNAEs impeditivos** (o salão não está nela), e **não** uma tabela de atividade por anexo.
- **Janela do RBT12 muda em 2027.** A receita dos 12 meses que define a faixa passa a ser a dos "doze meses antecedentes
  ao mês anterior" (LC 214 art. 517). O cálculo precisa saber qual regra vale em cada período.
- **Profissional-parceiro (Lei 12.592 art. 1º-A).** A parte do profissional **não é receita bruta do salão**. O contrato
  precisa ser escrito e **homologado pelo sindicato**. A parte do salão tem natureza de aluguel de bem móvel e/ou gestão.
  Pode reduzir bastante o DAS, mas só se o cliente usar parceria formal (pergunta ao contador/cliente).
- **Res. CGSN 191/2026.** A obrigação da NFS-e nacional desde 01/11/2026 é V pela notícia oficial da Receita. O texto da
  resolução não foi lido: a versão consolidada da Res. 140 no portal de normas da Receita só vai até a Res. 183/2025.
- **Fronteira com o X7.** O `ADR-INCR-TAX-ASSESSMENT` (PR #446) exclui Simples e MEI (D12). A decisão 8 (PRE-ADR
  próprio) não colide com ele. O reuso do modelo de apuração ficou como fork (F-SN-13).

**Perguntas novas para o contador** (entram no próximo pedido pela `luminaris-contador-liaison`; quem envia é o dono):
1. Confirmar o enquadramento de 6.01, 6.02 e 6.03 no Anexo III.
2. Quais NCMs o salão vende, e se há estoque comprado com ST antes de 01/04/2026.
3. O cliente optou pelo regime de caixa em 2026?
4. Há contrato de parceria homologado, e qual é a cota-parte?
5. Extratos do PGDAS-D dos últimos 12 a 13 meses.
6. Quais contas usar para a provisão do DAS.

A lista completa, com 13 itens, está no §8 do PRE-ADR.
