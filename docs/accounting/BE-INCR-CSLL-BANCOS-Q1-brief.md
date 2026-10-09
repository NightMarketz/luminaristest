# BE-INCR-CSLL-BANCOS-Q1 — BRIEF (alíquota de 20% da CSLL de bancos antes de 01/04/2026, código ECF `3`)

> **Autorização:** dono, chat, 2026-10-10: *"Planeja o fast-follow da alíquota de bancos (CSLL código 3) —
> sessao-planejamento"*. Antes, na mesma conversa, o dono decidiu: *"abra um Fast-Follow / Novo BRIEF para retroagir a
> data de início da linha de 20% do código 3 (bancos) para cobrir o Q1/2026 e o histórico, ancorado na IN 1.700/2017
> atualizada"*. **Cobre só este BRIEF.** Não cobre código nem migração (falta o `executa`).
> **Sessão:** `sessao-planejamento`. Forks F-CB-1..3 **ratificados** por questionário em 10/10 (§5); F-CB-1 contra a recomendação. A ratificação não é `executa`.

## 0. Resumo em duas linhas

Depois do PR #599 (BE-INCR-CSLL-ALIQUOTA-LC224, F-CA-1 a), o código `3` (bancos, 20%) só tem linha a partir de
2026-04-01. Uma apuração de banco no 1º trimestre de 2026, ou em 2025, cai em `400 perfil incompleto`.
**Risco principal:** a fonte lida (IN 1.700 art. 30 IV, revogada em 01/04/2026) é regulamentação; a lei que ela
regulamenta (**EC 103/2019 art. 32**) **não foi lida** (P-CB-1).

## 1. Fontes

| # | Fonte | Como | Grau |
|---|---|---|---|
| S1 | IN RFB 1.700/2017, JSON multivigente do Sijut (ato 81268), **segmentos tachados** do art. 30 | baixado em 09/10/2026 na sessão do #599, sha256 `faa47fa18631e4b78931693fb9ef7edabe7a58c6d288c9eee8374397c40940c3` (o mesmo do F-CA-5) | **V-fonte** (RFB) |
| — | EC 103/2019 art. 32 (alíquota de 20% para bancos desde 01/03/2020) | **não lido** | P-CB-1 |

**S1, art. 30 IV** (segmento 216, versão 2, *"Redação dada pela IN RFB 1.942, de 27/04/2020"*, revogado pela IN RFB
2.315/2026 com efeito em 01/04/2026): *20%, exceto de 01/01/2019 a 29/02/2020 (15%), nos casos de bancos de qualquer
espécie e de agências de fomento*. O art. 30 I b (bancos a 15%/20%) foi revogado pela IN RFB 1.925/2020 (segmento 198).
Os arts. 30-A a 30-C tratam da transição de 2020 (rateio de março) e também foram revogados.

## 2. Insumos (fato consumado; dependem do #599 mergeado)

- `server/prisma/data/legal_parameters_v4.sql`: a linha `lp4-csll-3` (chave `3`, 2000 bp, desde `2026-04-01`, sem fim,
  fonte `IN RFB 1.700/2017 art. 30-D II (red. IN RFB 2.315/2026)`, `supersedesId = NULL`).
- `TabelaApuracao.aliquotaCsll(ind, data)` escolhe, entre as linhas da chave vigentes na data, a de `vigenteDesde` mais
  recente (`taxAssessmentParams.ts`). A data é o fim do período.
- O 1º ano apurável do X7 é 2025 (`taxAssessmentParams.ts`, comentário do teste de paridade).
- O teste `legalParameter.test.ts` (bloco CSLL-LC224, item 2) **assere** `aliquotaCsll('3', '2026-03-31') === undefined`.
  Esta mudança o inverte.
- O enum `indAliqCsll` já aceita `3` desde o #599 (F-CA-3 b).
- O recálculo do PR-4 (#576) só é acionado por publicação via serviço. A migração faz `INSERT OR IGNORE` e não grava
  job. Hoje não existe apuração confirmada com o código `3` antes de 2026-04-01, porque ela daria 400.

## 3. Checklist de comportamentos

1. **[F-CB-2] Semente `legal_parameters_v5.sql` + migração `…_legal_parameters_v5_csll_bancos`**, com o mesmo texto byte
   a byte (molde v4). Teste de igualdade de bytes.
2. **[F-CB-1, F-CB-2] Linha `lp5-csll-3-a`**: chave `3`, 2000 bp, `vigenteDesde` = F-CB-1, `vigenteAte = 2026-03-31`,
   fonte `IN RFB 1.700/2017 art. 30 IV (red. IN RFB 1.942/2020; revogado pela IN RFB 2.315/2026)`, `fonteUrl` e
   `fonteSha256` = S1, `PUBLISHED`. Teste de tabela: `aliquotaCsll('3', d)` para `d` ∈ {`2020-02-29`, `2020-03-01`,
   `2025-12-31`, `2026-03-31`, `2026-04-01`, `2028-01-01`} ⇒ {undefined, 2000, 2000, 2000, 2000, 2000}, com a fonte
   do art. 30 IV até `2026-03-31` e a do art. 30-D II depois.
3. **[D] Ajustar o teste do #599** (`legalParameter.test.ts`, bloco CSLL-LC224, item 2): `'3'` em `2026-03-31` passa a
   2000. As demais asserções (7/8, 1/4) não mudam.
4. **[D] Apuração trimestral de banco no 1º tri/2026** (Presumido e Real): com `ecfIndAliqCsll = '3'`, o T01/2026 aplica
   20% e cita o art. 30 IV. Teste de unidade em `taxAssessmentCalc` com a tabela da semente.
5. **[D] Real anual com código `3`**: não é código misto (20% antes e depois de 01/04/2026), então **não** cai no 400 do
   F-CA-4. Teste: estimativa de janeiro/2026 com `'3'` = 20%.
6. **[D] Gates do diff:** `tsc`; sem DTO, rota, `eventType` ou i18n novos; a migração é só `INSERT OR IGNORE` (o S6 do
   smoke é vacuoso, como na v4); fold do nó no PR.

## 4. Contrato — a linha v5 (esboço materializável)

| id | chave | valorInt | vigenteDesde | vigenteAte | fonte | supersedesId |
|---|---|---|---|---|---|---|
| `lp5-csll-3-a` | `3` | 2000 | `2020-03-01` *(F-CB-1 b)* | `2026-03-31` | IN RFB 1.700/2017 art. 30 IV (red. IN RFB 1.942/2020; revogado pela IN RFB 2.315/2026) | — *(F-CB-2 b)* |

```sql
INSERT OR IGNORE INTO "legal_parameters" ("id","tabela","chave","discriminador","valorInt","valorTexto","valorJson","fonte","fonteUrl","fonteSha256","vigenteDesde","vigenteAte","status","supersedesId","motivo","proposedById","publishedById","publishedAt","createdAt")
VALUES ('lp5-csll-3-a','CSLL_ALIQUOTA','3',NULL,2000,NULL,NULL,'IN RFB 1.700/2017 art. 30 IV (red. IN RFB 1.942/2020; revogado pela IN RFB 2.315/2026)','https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/81268/visao/multivigente','faa47fa18631e4b78931693fb9ef7edabe7a58c6d288c9eee8374397c40940c3','2020-03-01','2026-03-31','PUBLISHED',NULL,'Bancos 20% antes da LC 224/2025 (ECF 0020.IND_ALIQ_CSLL = 3) — fast-follow do F-CA-1 a','migracao:BE-INCR-CSLL-BANCOS-Q1','migracao:BE-INCR-CSLL-BANCOS-Q1',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
```

## 5. Forks — 3/3 ratificados (dono, chat, 2026-10-10, questionário)

| Fork | Caminhos | Recomendação | Status |
|---|---|---|---|
| **F-CB-1** Início da vigência da linha anterior | (a) `2025-01-01`: o 1º ano apurável do X7 · (b) `2020-03-01`: o início do 20% no art. 30 IV (antes disso, de 01/2019 a 02/2020, eram 15%, que o código `3` não descreve) · (c) `2026-01-01`: só o 1º tri/2026 | **(a).** Cobre todo período que a plataforma apura e a ECF do AC 2025. O (b) publica anos que nada lê; se um dia houver apuração de 2020–2024, a linha entra junto com ela. O (c) deixa 2025 sem linha, contra o *"e o histórico"* do dono | ✅ **(b) contra a recomendação** — dono, chat, 2026-10-10 (questionário). Antes de 2020-03-01 não há linha (de 01/2019 a 02/2020 eram 15%, que o código `3` não descreve) |
| **F-CB-2** Forma da correção | (a) linha única `2025-01-01 →` sem fim, com `supersedesId = lp4-csll-3` · (b) linha nova fechada em `2026-03-31`, sem supersede; a `lp4-csll-3` segue | **(b).** Cada período cita a sua fonte (art. 30 IV antes, art. 30-D II depois), e é só acréscimo, sem tirar linha publicada do lookup (L-7). O (a) põe uma fonte só em dois regimes normativos | ✅ **(b)** — dono, chat, 2026-10-10 (questionário) |
| **F-CB-3** Onde mora no vault | (a) fold no `CSLL-LC224` (PR novo na linha `prs`, o nó segue `done`) · (b) nó próprio `CSLL-BANCOS-Q1` | **(a).** É o resíduo do F-CA-1 do mesmo nó: mesma tabela, mesma fonte S1 | ✅ **(a)** — dono, chat, 2026-10-10 (questionário). A linha da seção Docs da nota e o PR entram no fold do PR de execução |

## 6. Pendente de validação externa

| # | O quê | Por quê | Quem |
|---|---|---|---|
| P-CB-1 | EC 103/2019 art. 32 (20% para bancos desde 01/03/2020) e Lei 7.689 art. 3º na redação anterior à LC 224 | A IN é regulamentação. A pesquisa de 10/10 (outra sessão) leu a Lei 7.689 compilada para o P-CA-2, mas não registrou o inciso dos bancos | agente (reler planalto.gov.br) antes do `executa`, como no P-CA-1 |
| P-CB-2 | O PVA aceitar `IND_ALIQ_CSLL = 3` na ECF do AC 2025 | A regra do manual (*"≥2019 ⇒ 1 ou 4"*) contradiz os valores válidos `[1;3;4]` (P-CA-3) | PVA / contador |

## 7. Insumos ausentes

- Texto da EC 103/2019 art. 32 (P-CB-1).

## 8. Achados fora de escopo

- Agências de fomento também estão no art. 30 IV (20%), mas o leiaute 12 não lhes dá código próprio. Hoje elas cabem
  no `3`; não foi planejado nada para elas.
- CSLL de resseguradora local (Lei 15.525/2026, 9%) sem código ECF: vira o nó `CSLL-RESSEGURADORES` (dono, 10/10).
