---
id: "D-2026-10-26-EFD-REINF-PR1-LACUNAS"
tipo: "decisao"
dominio: "fiscal"
titulo: "Execução do EFD-REINF PR-1 autorizada; 7 lacunas de spec respondidas por questionário (porta da PJ, classTrib no perfil, R-1000, pacote menor, vencimento, mesmo dtFG, fornecedor sem taxId)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-26: \"faz o EFD-REINF PR-1 (BRIEF #848)\" — sessao-feature, PR sem merge. Respostas por AskUserQuestion em 2 rodadas no mesmo turno"
atualizado: "2026-10-26"
---
# D-2026-10-26-EFD-REINF-PR1-LACUNAS

**Estado:** `decided`.

**Autorização:** dono, chat, 2026-10-26: *"faz o EFD-REINF PR-1 (BRIEF #848)"*. É o `executa` do PR-1 (itens 1–14 do
[`BE-INCR-EFD-REINF-brief.md`](../../accounting/BE-INCR-EFD-REINF-brief.md)); forks F-REINF-6..13 já ratificados (a) em
[[D-2026-10-22-EFD-REINF-FORKS]]. Dependências em `main`: RETENCOES-FONTE PR-1 (#888) e PR-2 (consolidado no #902). Nó:
[[EFD-REINF]].

Antes de codar, o código de `main` e o leiaute oficial mostraram lacunas que o BRIEF não fechava. Elas foram perguntadas por
questionário (AskUserQuestion), com a recomendada como 1ª opção. A 1ª rodada saiu da leitura do BRIEF contra o código; a 2ª,
de achados durante a execução.

## Respostas do dono

| Lacuna | Resposta literal | Efeito |
|---|---|---|
| A. A porta `findMadeForReinf(scope, competencia)` lê uma unidade; a Reinf é da PJ (F-REINF-11 a) e não há listagem de unidades | "Método na porta (Recomendado)" | Emenda aditiva no RETENCOES-FONTE: `ITaxWithholdingReadPort.findMadeForReinfDaPj(ownerUserId, competencia)`, mesmo mapeador, tenancy só por `userId` |
| B. `classTrib` do Simples no R-1000 (P-REINF-7 aberta) | "Campo no perfil fiscal" (**não** a recomendada) | `CompanyFiscalProfile.reinfClassTrib` (`'01'\|'02'\|'03'`, só SIMPLES; refine no DTO); nulo com fato ⇒ 400 `REINF_CLASSTRIB_PENDENTE`. MEI 04 e Presumido/Real 99 seguem derivados |
| C/D. R-1000: `indEscrituracao` com ECD CONDICIONAL; como detectar alteração do cadastro | "Pacote A (Recomendado)" | 1 só com ECD OBRIGATORIA na matriz; CONDICIONAL ⇒ 400 `REINF_ECD_INDEFINIDA`. `eventos[]` do R-1000 guarda `conteudoSha256` (cadastro sem id/hora): inclusão sem lote de competência anterior; alteração quando o hash difere do último R-1000; igual ⇒ sem R-1000 |
| Pacote menor: (1) prazo no PR-1, (2) vencimento do DARF, (3) > 50 eventos, (4) linhas fora do PR-1, (5) `tpAmb` | "Aceito o pacote (Recomendado)" | (1) `prazoReinfMensal` (item 21 só na regra mensal) já no PR-1; (3) 400 `REINF_EVENTOS_ACIMA_DO_LIMITE`; (4) aviso no relatório e 422 `REINF_SEM_FATO` só sem nenhuma linha Reinf; (5) env `REINF_TP_AMB`, padrão 1 |
| (2) refeito: o `resumo` lê o vencimento por unidade e a linha da porta da PJ não diz a unidade | "unitId na linha da porta (Recomendado)" | `WithholdingLineForReinfSchema` ganha `unitId` (aditivo; a rota de linhas não o expõe); o `ReinfService` chama o `resumo` de cada unidade e casa pelo `taxPayableId` |
| Mesmo fornecedor, natureza e dia: IR (bruto do documento) e CSRF (bruto da parcela) com brutos diferentes | "Duas infoPgto (Recomendado)" | Uma `infoPgto` por bruto; com o mesmo bruto, uma só com os dois grupos |
| Linha IRRF/CSRF de fornecedor sem CPF/CNPJ (`kind` nulo) | "400 nomeado (Recomendado)" | 400 `REINF_BENEFICIARIO_CNPJ_INVALIDO` com o `counterpartyId`, como o DV inválido do item 7 |

## Decorrências registradas sem pergunta (fonte citada)

- `unitId` no corpo/query das rotas da Reinf só resolve escopo/policy/auditoria — precedente do X9 (lacuna 1 do PR-2, dono
  07/10); o lote é da PJ.
- `fechRet` 0 = fechamento, 1 = reabertura (leiaute 2.1.2b, R-4099 campo 18 [L01], baixado de novo em 26/10, sha256 conferido).
- R-4099 só sai com R-4020 no lote (leiaute: "só é aceito se houver algum evento da série R-4000 … para o período"); lote sem
  evento gerável ⇒ 422 `REINF_SEM_EVENTO_GERAVEL`.
- `EVENTOS_PLANEJADOS` (R-4010, R-2010, R-2099, R-2098, R-9000) é o quarto conjunto do gate de cobertura até o PR que os gera;
  ao fim do PR-4 fica vazio e vale a invariante 2 com três conjuntos.
- `xmldsig-core-schema.xsd` (W3C) entra junto dos XSD do pacote [D06] porque todo evento o importa por caminho relativo.
