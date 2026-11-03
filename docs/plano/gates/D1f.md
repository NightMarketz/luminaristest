---
id: "D1f"
tipo: "dado-externo"
dominio: "externo"
titulo: "Itens 5a-5f do contador (item LC 116, alíquota ISS, cClassTrib)"
estado: "human-open"
estado_detalhe: "30/10 (triagem): nada do contador falta; o D1 também não espera mais assinatura; fechar é do dono · 28/10 (indOp): 030101 VERIFICADO no Anexo C v1.01 do gov.br/nfse (art. 11 III da LC 214, local = estabelecimento do fornecedor; mesmo hash da cópia do corpus de 10/09; em main desde o #348, indOp.ts); os 3 itens do D1f conferidos em fonte oficial; fechar o gate é do dono · 28/10 (fold da fila de pesquisa de 27/10): cClassTrib 000001 VERIFICADO na tabela oficial do SVRS (carga de 05/10/2026, com a v1.70) e na IT 2025.002 v1.70; clínica com NBS do Anexo III = 200029 (redução de 60%); os 3 itens do D1f têm resposta conferida, falta só o indOp 030101; fechar o gate é do dono · 15/10 (fold): alíquota DECIDIDA por delegação do contador — ISS SP 5% padrão, retenção configurável por nota (D-3 de D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO); ressalva INFERIDA, não verificada: no Simples o ISS vai no DAS pela faixa do Anexo III (LC 123), então os 5% valem fora do Simples — conferir por fonte oficial · cClassTrib: o contador respondeu 000001 ('tributadas integralmente pelo IBS e CBS') + indOp 030101 em 10/10 (TRIAGEM-RESPOSTA-CONTADOR-2026-10-10 I-1/II-1), grau secundário — falta conferir na tabela oficial (pesquisa do agente pelo método legal, não pergunta ao contador); cTribNac/NBS já conferidos em fonte oficial (pesquisas-legais/ctribnac-salao-clinica: 060101/060201/060301). O follow-up de 26/09 foi SUPERSEDIDO pelo pedido único de 10/10 (enviado e respondido) · 27/09: Item LC 116 recebido (6.01/6.02/6.03; ISS no prestador — triagem 23/09 5a); faltam alíquota (município) e cClassTrib; pedidos no follow-up de 26/09 (item 3), não enviado"
depende_de: ["[[D1]]"]
ancora_sdd: "§III.2"
atualizado: "2026-10-30"
prs: ["#936"]
---
# D1f — Itens 5a-5f do contador (item LC 116, alíquota ISS, cClassTrib)

**Estado:** `human-open` — 30/10 (triagem): nada do contador falta; o D1 também não espera mais assinatura; fechar é do dono · 28/10 (indOp): 030101 VERIFICADO no Anexo C v1.01 do gov.br/nfse (art. 11 III da LC 214, local = estabelecimento do fornecedor; mesmo hash da cópia do corpus de 10/09; em main desde o #348, indOp.ts); os 3 itens do D1f conferidos em fonte oficial; fechar o gate é do dono · 28/10 (fold da fila de pesquisa de 27/10): cClassTrib 000001 VERIFICADO na tabela oficial do SVRS (carga de 05/10/2026, com a v1.70) e na IT 2025.002 v1.70; clínica com NBS do Anexo III = 200029 (redução de 60%); os 3 itens do D1f têm resposta conferida, falta só o indOp 030101; fechar o gate é do dono · 15/10 (fold): alíquota DECIDIDA por delegação do contador — ISS SP 5% padrão, retenção configurável por nota (D-3 de D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO); ressalva INFERIDA, não verificada: no Simples o ISS vai no DAS pela faixa do Anexo III (LC 123), então os 5% valem fora do Simples — conferir por fonte oficial · cClassTrib: o contador respondeu 000001 ('tributadas integralmente pelo IBS e CBS') + indOp 030101 em 10/10 (TRIAGEM-RESPOSTA-CONTADOR-2026-10-10 I-1/II-1), grau secundário — falta conferir na tabela oficial (pesquisa do agente pelo método legal, não pergunta ao contador); cTribNac/NBS já conferidos em fonte oficial (pesquisas-legais/ctribnac-salao-clinica: 060101/060201/060301). O follow-up de 26/09 foi SUPERSEDIDO pelo pedido único de 10/10 (enviado e respondido) · 27/09: Item LC 116 recebido (6.01/6.02/6.03; ISS no prestador — triagem 23/09 5a); faltam alíquota (município) e cClassTrib; pedidos no follow-up de 26/09 (item 3), não enviado  
**Autorização:** **falta** — não roteia sem autorização citável do dono (ORCH-006)  
**Depende de:** [[D1]]  
**Desbloqueia:** [[X10b]]  
**Âncora no SDD consolidado:** §III.2

## Evidência

- `docs/SDD-LUMINARIS.md:1606` → D1f["D1f Itens 5a-5f do contador"]:::ext
- `docs/SDD-LUMINARIS.md:1685` → D1 --> D1f
- `docs/SDD-LUMINARIS.md:1753` → | **X10b → X10a → X10i → X11** | blocked | ~~D-NFSE~~ (✅ corpus 10/09, §0.4) · D1f · D5 · **M2 (agora aresta escrita: conta por unidade, R8)** — regra "não X10b/emissão" **inalterada** (só o dono reverte); D1f (item LC 116, alíquota ISS, `cClassTrib` do 1b) pode virar campo obrigatório do `FiscalProfile` (técnica X6 — dado configurável em vez de espera) — **decisão do dono** | cédula #318 §2 R8; fold 17/09 |

## Fold 25/09 (Fase 6 do PLANO-POS-CONTADOR)

- Fold 25/09 — [triagem 23/09](../../accounting/TRIAGEM-RESPOSTA-CONTADOR-2026-09-23.md) 5a: LC 116 **6.01** cabelo/manicure/barbearia, **6.02** estética/depilação, **6.03** massagem; ISS no estabelecimento prestador. **Faltam:** alíquota municipal e `cClassTrib` (não respondidos).

## Fold 15/10 — o que já chegou

- **Alíquota:** decidida por delegação em 10/10 — D-3 de [[D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO]]: ISS SP 5%
  padrão, retenção configurável por nota. Ressalva **inferida, não verificada**: para optante do Simples o ISS é
  recolhido no DAS pela faixa do Anexo III (LC 123); o 5% municipal vale fora do Simples. Conferir por fonte oficial.
- **cClassTrib:** resposta do contador em 10/10 = **000001** + indOp **030101**
  ([`TRIAGEM-RESPOSTA-CONTADOR-2026-10-10.md`](../../accounting/TRIAGEM-RESPOSTA-CONTADOR-2026-10-10.md) I-1/II-1),
  grau secundário. Falta conferir na tabela oficial — pesquisa do agente, não nova pergunta ao contador.
- **cTribNac/NBS:** conferidos em fonte oficial (Anexo B v1.01 + LC 116) no dossiê
  `pesquisas-legais/ctribnac-salao-clinica` — 060101 / 060201 / 060301.
- O follow-up de 26/09 (item 3) foi supersedido pelo pedido único de 10/10, que foi enviado e respondido.

## Fold 24/10 — pesquisa pelo método legal (dossiê `pesquisas-legais/gates-humanos-lei`)

- **Ressalva do Simples: agora VERIFICADA em fonte oficial** (era inferida). LC 123 art. 13 VIII inclui o ISS no DAS [D01], até 2032:
  a LC 214 só tira o ISS pelo art. 518, com efeitos de 01/01/2033 (art. 544 V [D10]); IBS/CBS entram em 2027 (arts. 516–517, 544 III [D10]).
  O 5% de SP vale **fora** do Simples: 6.01–6.03 não estão na lista de 2% do art. 16 I "a" (só o 6.04), e caem no art. 16 IV
  [D08, relida 24/10]. LC 116 art. 8º-A fixa piso de 2% [D03]. A LC 227/2026 (redação compilada no [D10]) não tira o ISS do art. 13:
  **fechado**. Relatório: [`relatorio.md`](../../../pesquisas-legais/gates-humanos-lei/relatorio.md) §1–§3.
- **cClassTrib 000001: continua SEM fonte oficial.** Li a IT 2025.002 **v1.31** [D07] (a tabela está no anexo); versões posteriores (1.50+) só
  apareceram em fonte secundária; não confirmei nenhuma em domínio oficial. Quem confere é o agente, na tabela da versão vigente, não o contador. Grau: o 000001 segue **secundário**.
- Estado e autorização **não mudam**.

## Fold 28/10 — cClassTrib conferido na tabela oficial (fila de pesquisa de 27/10)

- Resumo da fila: [[PESQUISA-FILA-2026-10-27]]. Dossiê: [`fila-2026-10-27-bloco5-cclasstrib`](../../../pesquisas-legais/fila-2026-10-27-bloco5-cclasstrib/relatorio.md).
- **000001 deixa de ser secundário: VERIFICADO.** A tabela oficial está no Portal da Conformidade Fácil, do SVRS, com a carga
  de 05/10/2026, que já inclui as linhas da v1.70 [D01]. O 000001 é "Situações tributadas integralmente pelo IBS e CBS.",
  CST 000, sem redução, aceito na NFS-e. Os serviços 6.01–6.03 (NBS 1.2602) não estão no Anexo III da LC 214, e a esteticista
  não está no art. 127 [D02].
- **Corroboração:** a IT 2025.002 v1.70, lida no Portal NF-e por outra sessão no mesmo dia, traz a mesma linha
  ([`TRANSCRICAO-IT2025002-v170-tabelas-IBSCBS-2026-10-27.md`](../../accounting/fontes-oficiais/TRANSCRICAO-IT2025002-v170-tabelas-IBSCBS-2026-10-27.md)).
- **Clínica:** consulta e procedimento médico com NBS do Anexo III (1.2301.21.00, 1.2301.22.00) levam **200029**, CST 200,
  redução de 60% (art. 130). Procedimento estético feito por médico só com NBS do Anexo III marcado pela clínica; a
  classificação é do cliente com o contador (ambiguidade no §4 do dossiê `ctribnac-salao-clinica`).
- **Não conferido:** o indOp 030101 que veio com o 000001 (é outra tabela).
- Os três itens do D1f (item LC 116, alíquota, cClassTrib) têm resposta conferida em fonte oficial; falta só o indOp.
  Fechar o gate é do dono.
- Estado e autorização **não mudam**.

## Fold 28/10 — indOp 030101 conferido (dossiê `fila-2026-10-28-d1f-indop`)

- Relatório: [`relatorio.md`](../../../pesquisas-legais/fila-2026-10-28-d1f-indop/relatorio.md).
- **030101 VERIFICADO.** No Anexo C (INDOP IBS/CBS) da NFS-e nacional, v1.01, a linha 5 é a do art. 11, III, da LC 214:
  "Serviço prestado fisicamente sobre a pessoa ou fruído presencialmente por pessoa física", com local do fornecimento
  "Estabelecimento do fornecedor" [D01].
- **Versão vigente:** a página "Documentação atual" do gov.br/nfse (atualizada em 15/08/2026) lista só a v1.01 [D02]. O arquivo
  baixado em 28/10 tem o mesmo SHA-256 (`f59f066c…`) da cópia do corpus de 10/09 (`fontes-oficiais/MANIFEST.md`, id `nfse-anexo-c`).
- **Já estava em `main`:** `server/src/features/accounting/models/indOp.ts` foi gerado desse arquivo no #348, com
  `IND_OP_DEFAULT_SALAO = '030101'`. O fold de 28/10 acima chamou o indOp de "não conferido" sem cruzar com essa transcrição.
- **Ressalva (desenho, não pergunta ao contador):** atendimento na casa da cliente leva 030102 (endereço do adquirente). O indOp
  fica no perfil de cada serviço (`ServiceFiscalProfile.cIndOp`, validado contra o Anexo C), e o pacote sem serviço usa o
  030101 fixo (decisão L8 do dono, 03/10). Não existe escolha por nota.
- Os três itens do D1f (item da LC 116, alíquota do ISS, cClassTrib + indOp) têm resposta conferida em fonte oficial.
  **Fechar o gate é do dono.**
- Estado e autorização **não mudam**.

## Fold 30/10 — triagem das perguntas ao contador

- Decisão: [[D-2026-10-30-TRIAGEM-CONTADOR]]. Dossiê: [`relatorio.md`](../../../pesquisas-legais/triagem-contador-2026-10-30/relatorio.md).
- Nenhum item do D1f espera o contador (os três estão conferidos desde 28/10). A assinatura das confirmações de 10/10 do
  [[D1]] também saiu do pedido.
- Estado e autorização **não mudam**. Fechar o gate é do dono.
