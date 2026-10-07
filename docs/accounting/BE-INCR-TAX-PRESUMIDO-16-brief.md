# BE-INCR-TAX-PRESUMIDO-16 — 16% do IRPJ do prestador exclusivo no Lucro Presumido trimestral (BRIEF)

> **Sessão:** `sessao-planejamento` — sem código. Nenhum fork se auto-ratifica.
> **Autorização (dono, chat, 2026-10-06, questionário):** D-1 → *"Errata + BRIEF do 16%"*, dentro da autorização da
> mesma data *"Autorizo planejar o pente fino + BRIEF — sessao-planejamento, sem executa"*. Cobre: a errata do ADR
> (feita, §0) e este BRIEF. **Não** cobre código (exige "executa").
> **Origem:** [`BE-INCR-LEGAL-PARAMS-brief.md`](BE-INCR-LEGAL-PARAMS-brief.md) §2 D-1.
> **Nó:** X7 (extensão do Presumido da Fase A). **Base:** `origin/main` `6d3e9fb9`.

## 0. Por que este BRIEF existe

O F-X7-14 foi ratificado (a), "usar 32%, não modelar o 16%", sobre a premissa de que nenhuma norma estende o 16% ao
Presumido (`docs/adr/ADR-INCR-TAX-ASSESSMENT.md` §3). A norma existe:

| Regra | Fonte | Grau |
|---|---|---|
| PJ **exclusivamente** prestadora de serviços em geral (alíneas b, c, d, f, g e j do art. 33 § 1º IV) com receita bruta anual ≤ R$ 120.000 **pode** usar 16% na base do **IRPJ** do Presumido | IN RFB 1.700/2017 **art. 215 § 10** (`fontes-oficiais/IN-RFB-1700-2017.txt:4007`) | V-corpus |
| Se a receita bruta **acumulada até o trimestre** passar de R$ 120.000: diferença do imposto postergado **apurada em relação a cada trimestre transcorrido** | art. 215 § 11 (`:4009`) | V-corpus |
| A diferença é paga em quota única até o último dia útil do mês seguinte ao trimestre do excesso; no prazo, sem acréscimos | art. 215 §§ 12–13 (`:4011-4013`) | V-corpus |
| Excluídos: serviços hospitalares, transporte e sociedades de profissão legalmente regulamentada | Lei 9.250/95 art. 40 parágrafo único (ADR §3, V-fonte 29/09); na IN, pela lista de alíneas (a "a" fica fora) | V-fonte |
| A CSLL **não** tem redução (continua 32% sobre serviço) | art. 215 § 10 fala só do IRPJ; art. 34 sem § equivalente | V-corpus |
| Código de receita da diferença postergada no Presumido: **2089/02** | Tabela DCTF IRPJ (12/03/2024), já citada no ADR §3 | C (não reconferido aqui) |

Errata já aplicada no ADR (3 pontos: linha da tabela da §3, célula do F-X7-14, §9 item 5), sem apagar o texto original.

**O que já existe e é reusado (verificado no código):**
- Flag `prestadoraExclusivaServicos` no `CompanyFiscalProfile` (`dtos/CompanyFiscalProfileDto.ts:107`), hoje lida
  só pela estimativa do Real anual (`models/taxAssessmentCalcAnual.ts:164`).
- Linhas `PRESUNCAO_IRPJ_REDUZIDA` (1600 bp) e `RECEITA_LIMITE_REDUZIDA_ANO_CENTS` na tabela
  (`models/taxAssessmentParams.ts:55-56`), com fonte do art. 33 § 7º.
- O cálculo mensal da diferença postergada (`diferencaPostergada16`, `taxAssessmentCalcAnual.ts:212`): é o molde do
  trimestral.
- Apuração do Presumido: `apurarPresumidoTrimestral` (`models/taxAssessmentCalc.ts:340`), com `anteriores` = memórias
  confirmadas dos trimestres anteriores (F-TA-3 a: a fonte é a memória, não o razão).

## 1. Checklist de comportamentos

1. **Fonte das linhas da tabela.** As linhas `PRESUNCAO_IRPJ_REDUZIDA` e `RECEITA_LIMITE_REDUZIDA_ANO_CENTS` passam a
   citar **também** o art. 215 § 10 (o valor não muda). `TAX_ASSESSMENT_TABELA_VERSAO` sobe. Teste: a `fonte` contém
   "art. 215 § 10".
2. **Presumido aplica 16% quando a empresa se declara prestadora exclusiva.** Em `apurarPresumidoTrimestral`, IRPJ,
   com `perfil.prestadoraExclusivaServicos = true` e receita bruta acumulada do ano até o trimestre (anteriores +
   atual, serviço + revenda) ≤ limite: a base de serviço usa `PRESUNCAO_IRPJ_REDUZIDA`, a linha da memória vira
   `PRESUNCAO_REDUZIDA_16` com a fonte do art. 215 § 10. **A CSLL não muda.** Teste: T01 com receita de R$ 30 mil ⇒
   base = 16%; a CSLL do mesmo trimestre = 32%.
3. **Exclusividade é condição.** Receita de revenda no ano (anteriores ou atual) com a flag ligada ⇒ 400 com a mesma
   mensagem da estimativa (`taxAssessmentCalcAnual.ts:168`), citando o art. 215 § 10. Teste: T02 com revenda > 0 ⇒ 400.
4. **Passou do limite no trimestre: volta a 32% e cobra a diferença.** No trimestre em que a acumulada passa de R$ 120
   mil pela primeira vez, a base do próprio trimestre já é 32%, e soma-se a **diferença postergada** = Σ, para cada
   trimestre anterior confirmado com `PRESUNCAO_REDUZIDA_16`, de (IRPJ recalculado a 32%, com o adicional do
   trimestre, `meses = 3`) − (devido confirmado). Memória com uma linha por trimestre e o total, no molde de
   `diferencaPostergada16`. Teste: T01 = R$ 60 mil, T02 = R$ 60 mil (acumulada 120 mil, ainda 16%), T03 = R$ 10 mil
   ⇒ T03 a 32% + diferença de T01 e T02.
5. **Trimestres depois do excesso:** 32%, sem nova diferença (cada trimestre só é cobrado uma vez). Teste: T04 depois
   do excesso em T03 ⇒ sem linha `DIFERENCA_POSTERGADA`.
6. **Código de receita e vencimento.** A diferença sai com o código **2089/02** (nova chave
   `IRPJ_PRESUMIDO_DIFERENCA_POSTERGADA_16` em `CODIGOS_RECEITA`) e uma linha informativa de vencimento: "último dia
   útil do mês seguinte ao trimestre", fonte art. 215 §§ 12–13. Teste: a linha da diferença traz 208902.
7. **Como a diferença sai na apuração.** → **Fork F-P16-2.**
8. **Provisão.** A diferença postergada é IRPJ a recolher do trimestre do excesso: entra na mesma provisão do trimestre
   (`TaxAssessmentService` commit 1 do `atomicUntil`), sem mudar o padrão de 2 commits + reconcile. Teste de
   integração: o trimestre do excesso provisiona devido + diferença; o reconcile é idempotente.
9. **Cascata.** Reconfirmar um trimestre anterior com receita diferente reabre os posteriores (`SUPERSEDED`), como
   hoje; o excesso pode mudar de trimestre. Teste: reconfirmar T02 para cima ⇒ o excesso passa a T02 e o T03 vira
   `SUPERSEDED`.
10. **Interação com a LC 224.** Nenhuma na prática: quem tem receita ≤ R$ 120 mil nunca passa de R$ 1,25 mi por
    trimestre. Mesmo assim o cálculo **não** pode aplicar os dois: com a flag ligada e o acréscimo da LC 224 vigente e
    não suspenso, o caminho do 16% roda antes e o acréscimo usa a presunção efetiva. → **Fork F-P16-3.**
11. **Declaração da flag.** O texto de ajuda e a validação do perfil citam a exclusão da Lei 9.250 art. 40 parágrafo
    único (profissão regulamentada, hospitalar, transporte). O sistema não tem como checar a profissão: a
    responsabilidade da declaração é da empresa e do contador. → **Fork F-P16-1.**
12. **Gates do diff:** snapshot de shape (se o DTO do perfil mudar), allowlist de auditoria (só se surgir evento novo;
    o esperado é nenhum), `tsc` limpo, `npm run test:integration` dos arquivos de provisão do Presumido.

## 2. Contratos (esboço)

```ts
// taxAssessmentParams.ts
CODIGOS_RECEITA.IRPJ_PRESUMIDO_DIFERENCA_POSTERGADA_16 = '208902'; // DCTF IRPJ 12/03/2024 (ADR §3)

// taxAssessmentCalc.ts — PerfilApuracaoPresumido ganha:
prestadoraExclusivaServicos: boolean;

// Memória (linhas novas, MemoriaLinhaSchema existente):
// 'RECEITA_ACUMULADA_ANO' | 'PRESUNCAO_REDUZIDA_16' | `DIFERENCA_POSTERGADA_T0${n}` | 'DIFERENCA_POSTERGADA'
// | 'DIFERENCA_POSTERGADA_VENCIMENTO'
```

Nenhuma rota, DTO de entrada ou model Prisma novo é esperado. Se F-P16-2 → (b), nasce uma linha de `TaxAssessment` com
outro código de receita; isso será detalhado na ratificação.

## 3. Forks — RATIFICAÇÃO PENDENTE

| Fork | Caminhos | Recomendação | Status |
|---|---|---|---|
| **F-P16-0** Reabrir o F-X7-14 | (a) reabrir: o 16% passa a valer no Presumido para quem marcar a flag · (b) manter (a) do F-X7-14, com este BRIEF guardado para quando houver cliente | **(a).** A premissa da ratificação caiu (errata). O cliente-alvo (salão) **não** se qualifica se vende produto, mas um salão só de serviço com receita ≤ R$ 120 mil se qualifica e paga o dobro do IRPJ de presunção | PENDENTE |
| **F-P16-1** Declaração da flag | (a) o perfil exige marcar "não é sociedade de profissão regulamentada nem hospitalar/transporte" ao ligar a flag (campo booleano de confirmação, auditado) · (b) só texto de ajuda | **(a).** A exclusão é legal e o sistema não consegue checar; a confirmação explícita fica na trilha de auditoria | PENDENTE |
| **F-P16-2** Como a diferença postergada sai | (a) linha da memória do trimestre do excesso, somada ao devido, com o código 2089/02 informado na memória · (b) apuração separada (outro `TaxAssessment` com código 2089/02), porque a DCTFWeb declara por código | **(b) se o X9 (DCTFWeb/MIT) já lê por linha de apuração; senão (a).** Insumo ausente: a Fase C (X9) ainda não fixou a leitura (§5) | PENDENTE |
| **F-P16-3** LC 224 com a flag ligada | (a) 16% roda antes; o acréscimo, se houver, incide sobre a presunção efetiva · (b) flag ligada + receita acima de R$ 1,25 mi/trimestre ⇒ 400 (combinação impossível no limite de R$ 120 mil) | **(b).** A combinação é impossível dentro da lei; um 400 explica melhor que uma conta que nunca roda | PENDENTE |

## 4. Pendente de validação externa

1. **Código 2089/02:** reconferir na tabela DCTF vigente e confirmar com o contador que a DCTFWeb/MIT aceita.
2. **Salão como alínea "j" ("qualquer outra espécie de serviço"):** confirmar com o contador. Cabeleireiro não é
   profissão regulamentada com conselho, mas a Lei 12.592/2012 reconhece a profissão; o contador deve dizer se isso
   conta como "legalmente regulamentada" para o art. 40 da Lei 9.250.
3. **Oráculo do número:** só a conciliação X7 × PVA (H1) prova o valor; o teste prova a aritmética contra a tabela.

## 5. Insumos ausentes

- Forma de leitura das apurações pelo X9 (DCTFWeb/MIT), que decide o F-P16-2. O BRIEF da Fase C
  (`BE-INCR-TAX-ASSESSMENT-C-brief.md`) tem forks pendentes; não li inteiro.
- A trava da flag no service ("A trava é do service", `CompanyFiscalProfileDto.ts:20`) não foi lida; a execução deve
  confirmar que vale também para o Presumido.

## 6. Achados fora de escopo

- A Lei 9.250 art. 40 e o art. 33 § 7º da IN também cobrem a estimativa do Real, já modelada; a exclusão de
  profissão regulamentada também falta lá (o mesmo F-P16-1 serviria aos dois).
