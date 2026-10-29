---
id: "D-2026-10-28-EFICIENCIA-FISCAL-PR5-EXECUCAO"
tipo: "decisao"
dominio: "fiscal"
titulo: "Executa do EFICIENCIA-FISCAL PR-5 (serviços S-1..S-6, itens 25–33) e quatro lacunas de spec decididas pelo dono: serviceRef na subrazão, 400 contra o 16 % com receita hospitalar, model de enquadramento da SUP por unidade, endpoint de avaliação dos serviços"
estado: "decided"
autorizacao: "dono, chat, 2026-10-28, na sessão que coordena o EFICIENCIA-FISCAL, depois de ouvir que PR-3..PR-5 eram o que restava sem 'executa': \"Pode disparar aqui os nós que ficaram abertos e só estão faltando o executa.\" — executa só do PR-5 (itens 25–33), sem merge. Decisões no AskUserQuestion do mesmo dia, as quatro na opção recomendada"
atualizado: "2026-10-28"
---
# D-2026-10-28-EFICIENCIA-FISCAL-PR5-EXECUCAO

**Estado:** `decided`. **Autorização:** dono, chat, 2026-10-28, na sessão coordenadora do nó: *"Pode disparar aqui os nós que
ficaram abertos e só estão faltando o executa."* A sessão coordenadora repassou o PR-5 (itens 25–33) a esta sessão, sem merge.
PR-3 e PR-4 rodam em sessões próprias. Nó: [[EFICIENCIA-FISCAL]]. Forks: [[D-2026-10-21-FORKS-EFICIENCIA-FISCAL]] (F-EF-10, 11, 12,
13 a), [[D-2026-10-22-EFICIENCIA-FISCAL-FORKS]] (F-EF-17 a). Insumo: Emenda 28/10 do BRIEF (fila de pesquisa de 27/10).

## Fatiamento (PRs empilhados)

| PR | Itens | Base |
|---|---|---|
| PR-5a | 25, 26, 27 (perfil do serviço e da empresa; 8 %/12 % por serviço no X7), 30, 31, 32 (avaliação dos serviços, NBS 2027) | `main` |
| PR-5b | 28, 29 (SUP: tabela, simulação, enquadramento e modo de apuração na Fase C) | PR-5a |
| PR-5c | 33 (parceria completa) | PR-4 (item 19), quando ele abrir |

## Decisões do dono (AskUserQuestion, 28/10)

| # | Lacuna | Escolha (todas a recomendada) |
|---|---|---|
| 1 | Item 26: o X7 lê a 3.1 do razão e não sabe que serviço gerou a receita | **`serviceRef` na subrazão:** coluna aditiva `ReceitaFiscalLinha.serviceRef`, gravada pelo `registrarVenda`. Parcela a 8 %/12 % = Σ das linhas dos serviços elegíveis no período, com teto na 3.1 do razão; o resto da 3.1 fica a 32 %. Linhas antigas (sem `serviceRef`) ficam a 32 % |
| 2 | Item 26 × 16 % e × LC 224/Fase B | **400 + estende:** receita hospitalar com a declaração do 16 % (`prestadoraExclusivaServicos` + `declaraNaoProfissaoRegulamentada`) ⇒ 400 `HOSPITALAR_INCOMPATIVEL_COM_16` (Lei 9.250 art. 40 p.ú.); a parcela excedente da LC 224 se reparte pela receita das 3 atividades (IN RFB 2.305 art. 15 § 6º); a estimativa mensal da forma ANUAL usa a mesma repartição. A ECF não muda neste PR |
| 3 | Itens 28/29: número de profissionais e onde fica o modo SUP | **Model por unidade** `IssUniprofissionalEnquadramento` (molde `IssBeneficioMunicipal`): codMun, subitem, profissionais habilitados, documento obrigatório (inscrição no regime ou decisão judicial), vigência. A simulação aceita `profissionais` na query ou usa o enquadramento vigente; com enquadramento vigente, o relatório de ISS da Fase C mostra o ISS fixo trimestral (Lei SP 13.701 art. 15 §§ 12–13, alíquota do art. 16) no lugar da soma das notas, que continuam emitidas |
| 4 | Itens 27, 30–32: onde saem os alertas e o dado declarado | **Endpoint + finalidade:** `POST /api/accounting/tax-optimization/servicos/avaliar?ano=` calcula os alertas e propõe as sugestões `PRESUNCAO_HOSPITALAR` e `NBS_SAUDE_2027` (idempotente). Profissão regulamentada pela finalidade: TERAPEUTICA ou ESTETICA ⇒ alerta (Lei 13.643 art. 1º); BELEZA ⇒ INFO ambíguo (Lei 12.592 art. 1º). Dois booleanos declarados no `CompanyFiscalProfile` para locação de imóvel próprio e cessão de mão de obra. O item 33 vai num PR empilhado sobre o PR-4 |

## O que fica aberto

- Os códigos "uso restrito" da SUP de SP (04112 Medicina, 03380 Advocacia; R$ 2.656,48) só entram com documento (Emenda 28/10 item 2).
- A lista por procedimento da Atribuição 4 da RDC Anvisa 50 continua por cliente (P-EF-7); o `fundamentoHospitalar` é texto informado.
- A ECF (P200/P400) segue com 2 atividades até um PR próprio.
