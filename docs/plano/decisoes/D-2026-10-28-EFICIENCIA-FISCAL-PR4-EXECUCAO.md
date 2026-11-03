---
id: "D-2026-10-28-EFICIENCIA-FISCAL-PR4-EXECUCAO"
tipo: "decisao"
dominio: "fiscal"
titulo: "Executa do EFICIENCIA-FISCAL PR-4 (alertas e relatório de economia) e seis lacunas de spec decididas pelo dono: alertas na apuração, CNPJ e checklist no contrato de parceria, participações completas sem cisão, ano projetado, período pelo aceite, segregação medida pela apuração"
estado: "decided"
autorizacao: "dono, chat, 2026-10-28, na sessão que coordena o EFICIENCIA-FISCAL, depois de ouvir que PR-3..PR-5 eram o que restava sem 'executa': \"Pode disparar aqui os nós que ficaram abertos e só estão faltando o executa.\" — executa só do PR-4 (itens 19–24). Decisões no AskUserQuestion do mesmo dia, as seis na opção recomendada. Sem merge"
atualizado: "2026-10-28"
---
# D-2026-10-28-EFICIENCIA-FISCAL-PR4-EXECUCAO

**Estado:** `decided`. **Autorização:** dono, chat, 2026-10-28, na sessão que coordena o EFICIENCIA-FISCAL, depois de ouvir que
PR-3..PR-5 eram o que restava sem 'executa': *"Pode disparar aqui os nós que ficaram abertos e só estão faltando o executa."* Esta
cédula cobre **só o PR-4** (itens 19–24 do BRIEF), sem merge; PR-3 e PR-5 rodam sob cédulas próprias. Nó: [[EFICIENCIA-FISCAL]].
Forks: [[D-2026-10-21-FORKS-EFICIENCIA-FISCAL]], [[D-2026-10-22-EFICIENCIA-FISCAL-FORKS]].

## Verificação legal (dossiê `pesquisas-legais/ef-pr4-sublimite/`)

[D01] LC 123/2006 no acervo ctresb/leis (compilada, cópia de 13/10, sem alerta): art. 3º II (EPP até R$ 4,8 mi "em cada
ano-calendário"), §§ 9º e 9º-A (excesso de até 20% ⇒ efeitos no ano seguinte; acima, no mês seguinte), § 4º III, IV e V
(interdependência, todos com "desde que a receita bruta global ultrapasse o limite"; V na redação da LC 214), art. 13-A
(sublimite de R$ 3,6 mi para ICMS/ISS) e art. 20 § 1º-A (impedimento: excesso de até 20% ⇒ ano seguinte). O limiar de 80% do
item 21 é régua do produto, não da lei.

## Decisões do dono (AskUserQuestion, 28/10)

| # | Lacuna | Escolha |
|---|---|---|
| 1 | Onde os alertas 19–21 aparecem (o BRIEF não lista rota) | **Na apuração do Simples** (recomendada): códigos novos em `CODIGOS_ALERTA_SIMPLES`, sem rota nova |
| 2 | CNPJ do profissional e checklist da P-EF-9 (nenhum cadastro tem) | **No contrato** (recomendada): `SalaoParceriaContrato.profissionalCnpj String?` e `checklistDeclarado Json?`, migração aditiva |
| 3 | Formato de `Partner.outrasParticipacoes` | **Completo, sem cisão** (recomendada): cnpj, participacaoBp, empresaNoSimples, administrador, receitaBrutaAnualCents opcional; alerta só com receita global acima do limite; cisão (IX) fora do PR-4 |
| 4 | "Projeção 12 meses" do item 21 | **Ano projetado** (recomendada): acumulado do ano ÷ meses decorridos × meses do ano (de atividade, no ano de início) contra 80% do limite, com aviso do excesso > 20% |
| 5 | Mês do relatório para sugestão sem competência | **Pelo mês do aceite** (recomendada): COMPETENCIA = o mês; SALE = mês da venda; UNIT, ANO, PARTNER = mês do `decidedAt` no fuso do escopo |
| 6 | Economia medida (D9) | **Segregação pela apuração** (recomendada): DAS sem as marcas − DAS com elas; desconto = Σ desconto incondicional do mês × alíquota efetiva do DAS; fora do Simples, `NAO_DISPONIVEL` |

## Fato conferido no código (item 22)

- Retenções sofridas: `TaxWithholding.direction = 'SUFFERED'` existe no tipo, mas nenhum caminho grava a direção ⇒ `NAO_DISPONIVEL`
  citando [[RETENCOES-FONTE]].
- Crédito não tomado: o IBS-CBS-2027 grava crédito `PENDENTE` (condicionado à extinção, LC 214 art. 47), que não é crédito "não
  tomado"; não há marcação de crédito a que se tem direito e não foi apropriado ⇒ `NAO_DISPONIVEL` citando [[IBS-CBS-2027]].

## O que fica aberto

- Inciso IX (cisão nos 5 anos anteriores) precisa de dado da empresa: fora do PR-4.
- O PR-5 (item 33) estende os alertas de parceria (homologação, CNPJ ativo, contrato vencido, função administrativa, art. 1º-C).
