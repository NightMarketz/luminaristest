---
id: "D-2026-10-28-EFICIENCIA-FISCAL-PR3-EXECUCAO"
tipo: "decisao"
dominio: "fiscal"
titulo: "Executa do EFICIENCIA-FISCAL PR-3 (simuladores: fator r, regime, remuneração do sócio e a sugestão) e seis lacunas de spec decididas pelo dono: tabela ENCARGO_FOLHA + tipo de folha, folha-alvo = FS12, carga completa com avisos, projeção 2027, POST gêmeo com autor SYSTEM, montante informado em 3 mixes"
estado: "decided"
autorizacao: "dono, chat, 2026-10-28 (repassada pela sessão que coordena o EFICIENCIA-FISCAL, depois de ouvir que PR-3..PR-5 eram o que restava sem 'executa'): \"Pode disparar aqui os nós que ficaram abertos e só estão faltando o executa.\" — cobre só o PR-3 (itens 15–18), sem merge. Decisões no AskUserQuestion do mesmo dia, todas na opção recomendada"
atualizado: "2026-10-28"
---
# D-2026-10-28-EFICIENCIA-FISCAL-PR3-EXECUCAO

**Estado:** `decided`. **Autorização:** dono, chat, 2026-10-28, na sessão que coordena o EFICIENCIA-FISCAL: *"Pode disparar aqui os
nós que ficaram abertos e só estão faltando o executa."* Esta cédula cobre só o PR-3 (itens 15–18 do BRIEF), sem merge. Nó:
[[EFICIENCIA-FISCAL]]. Forks: [[D-2026-10-21-FORKS-EFICIENCIA-FISCAL]] (F-EF-7 a), [[D-2026-10-22-EFICIENCIA-FISCAL-FORKS]].

## Bloqueio do BRIEF

O item 17 esperava o cálculo de dividendos/JCP do [[IRRF-DISTRIBUICAO]]. Em `main`: `models/profitDistribution.ts` (`calcularMes`,
10% sobre o total do mês acima de R$ 50 mil) e `InterestOnEquityService.calcular` (limite dedutível do JCP, só no Real — F-IRD-12).
O simulador chama os dois; não recalcula nada à parte.

## Verificação legal (dossiê `pesquisas-legais/eficiencia-fiscal-pr3-encargos/`)

- [D01] Lei 8.212/1991 (acervo, compilada, sem alerta): art. 21 caput (contribuinte individual, 20%), art. 30 § 4º (dedução de 45%
  da contribuição da empresa, limitada a 9% ⇒ 11% efetivos), art. 22 I e III (patronal de 20%), art. 28 § 5º (limite máximo).
- [D02] Lei 10.666/2003 art. 4º (acervo): a empresa desconta a contribuição do contribuinte individual a seu serviço.
- [D03] Lei 8.036/1990 art. 15 (acervo): FGTS de 8%.
- [D04] LC 123/2006 (acervo): art. 13 VI (CPP no DAS, salvo o Anexo IV do art. 18 § 5º-C) e art. 16 caput e § 2º (opção em janeiro,
  irretratável no ano).
- [D05] Teto do RGPS de 2026, R$ 8.475,55, Portaria Interministerial MPS/MF nº 13/2026: tabela oficial do INSS em gov.br, lida no
  navegador (in.gov.br recusou o download, 403). Texto e SHA-256 em `docs/D05_inss-tabela-contribuicao-2026-navegador.txt`.

## Decisões do dono (AskUserQuestion, 28/10)

| # | Lacuna | Escolha |
|---|---|---|
| 1 | Custo da folha adicional: não havia tabela de INSS/FGTS | **Tabela nova `ENCARGO_FOLHA` + `tipoFolha`** (recomendada): 11% do contribuinte individual até o teto, 20% patronal fora do DAS, 8% de FGTS, teto do RGPS; `tipoFolha=PRO_LABORE` (padrão, pela P-EF-5) ou `EMPREGADO` |
| 2 | Semântica de `folhaAlvoCents` | **FS12 da janela do RBT12** (recomendada): r simulado = alvo / RBT12r; folha adicional = alvo − FS12 (mínimo 0) |
| 3 | O que entra na carga do item 16 | **Completo, com avisos** (recomendada): Simples = DAS mês a mês; Presumido/Real = IRPJ/CSLL (funções do X7; Real sem LALUR) + PIS/COFINS (sem créditos) + CPP de 20% sobre a folha informada + ISS pela alíquota do perfil; ICMS da revenda fora, com aviso |
| 4 | 2027 no item 16 | Mesma resposta da linha 3: **ano ≤ 2026 traz `projecao2027`** com a mesma receita; CBS/IBS no lugar de PIS/COFINS; linha DRAFT ⇒ aviso |
| 5 | Como a simulação vira sugestão (item 18) | **POST gêmeo `…/sugestao`, autor SYSTEM** (recomendada): GET puro; o POST recalcula e grava a PROPOSED do SYSTEM (molde do fiscal-check); a viva com outro `parametrosSha256` não é recalculada, só avisa (I-10); economia ≤ 0 ⇒ 400 `SIMULACAO_SEM_ECONOMIA` |
| 6 | Base do item 17 | **Montante informado, 3 mixes** (recomendada): `valorAnualCents`; 100% pró-labore × 1 salário mínimo + dividendos × mínimo + JCP até a parte do sócio no limite (só no Real) + dividendos |

## O que fica aberto

- RAT/FAP e terceiros não entram na CPP fora do Simples; a carga do Presumido e do Real fica subestimada (aviso fixo).
- Real sem LALUR nem compensação de prejuízo, PIS/COFINS e CBS/IBS sem créditos: avisos fixos; um simulador com créditos depende do
  [[IBS-CBS-2027]] e do X8.
- A CBS de 2027 segue DRAFT (LC 214 art. 349 I); sem taxa provisória publicada, fica fora da projeção.
- A tributação mínima anual da Lei 15.270/2025 (IRPFM) e o ajuste anual do IRPF não são simulados (aviso).
- O teto do RGPS é reajustado a cada janeiro: a linha de 2027 entra por PR de dado quando a portaria sair.
