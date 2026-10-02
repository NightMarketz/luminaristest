---
id: "D-2026-10-02-C8-EMENDA-3-2-E-I1B-FORKS"
tipo: "decisao"
dominio: "contabil"
titulo: "Ratificação por questionário: forks F-EM da emenda 3.2 do C8 e F-RK do ADR do re-key (I1b)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-02 (AskUserQuestion, sessão de ratificação) — sem 'executa'"
atualizado: "2026-10-02"
---
# D-2026-10-02-C8-EMENDA-3-2-E-I1B-FORKS — cédulas da sessão de ratificação

**Estado:** `decided` (parcial: o que está pendente está marcado abaixo)
**Autorização:** dono, chat, 02/10/2026, respostas ao AskUserQuestion. O agente apresentou, o dono decidiu.
**Não é "executa"** (ORCH-006): [[C8]] e [[I1b]] não ganham autorização de código com esta nota.

Documentos dos forks:
- [`BE-INCR-FIXED-ASSETS-EMENDA-3-2-brief.md`](../../accounting/BE-INCR-FIXED-ASSETS-EMENDA-3-2-brief.md) §4 (F-EM-1..14)
- [`ADR-INCR-UNIT-REKEY-migration.md`](../../adr/ADR-INCR-UNIT-REKEY-migration.md) §6 (F-RK-1..12)

## Rodada 1 — emenda 3.2, Parte 1 (bem de até R$1.200)

### F-EM-1 — default do `treatment` e onde o usuário escolhe
- **Pergunta:** o bem barato entra no ativo ou direto na despesa por padrão, e quem escolhe? (Contexto dado: a emenda
  do ITEM-DESTINATION, itens 22-23, tirou o roteamento por CFOP; o E3 precisa de ajuste em qualquer opção.)
- **Opções:** (a) padrão ativo, despesa só explícita por item no mapeamento (**recomendada**) · (b) sugerir despesa
  quando ≤ limite · (c) padrão despesa abaixo do limite.
- **Resposta literal:** *"(a) Padrão ativo (Recomendado)"*
- **Registro:** ✅ (a).

### F-EM-2 — unitário quando o custo não divide pela quantidade
- **Pergunta:** comparar com R$1.200 sem dividir, ou dividir e arredondar para cima? (Avisado: a base = custo líquido
  é inferida, FLAG-3.2-A.)
- **Opções:** (a) `costCents ≤ limite × qty` (**recomendada**) · (b) teto da divisão.
- **Resposta literal:** *"(b) Arredondar para cima"*
- **Correção do agente:** a descrição de (b) na cédula dizia que um caso de borda ficaria de fora por 1 centavo. Isso
  estava **errado**: com limite inteiro em centavos, `ceil(c/q) ≤ L ⇔ c ≤ L·q`, então (a) e (b) dão sempre o mesmo
  resultado. Pergunta de confirmação: "mantém (b)?" → *"Mantém (b)"*.
- **Registro:** ✅ (b), divergente da recomendação. Itens ajustados: E2, E4, E8.

### F-EM-3 — hipótese "vida útil ≤ 1 ano" do art. 120
- **Opções:** (a) fora desta emenda (**recomendada**) · (b) flag `usefulLifeUpToOneYear` libera despesa acima do limite.
- **Resposta literal:** *"(b) Incluir a flag"*
- **Registro:** ✅ (b), divergente da recomendação. **Amplia o escopo** da decisão 16 de
  [[D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE]], que nomeava só o R$1.200. Esta resposta é a autorização citável
  da ampliação, **só para planejamento**. Itens ajustados: E4, E4b (novo), §3.1, §7.

### F-EM-4 — exceção de conjunto (IN 1.700 art. 120 § 1º)
- **Opções:** (a) só declarativa, `setDeclared` força ativar (**recomendada**) · (b) heurística por NCM/qtd · (c) ignorar.
- **Resposta literal (1ª):** *"Aqui o sistema deveria ter uma forma de criar uma peça que represente esse conjunto de peças"*
- **Pergunta de detalhe:** (d1) conjunto = linha · (d2) agrupar linhas da mesma nota (toca a chave
  1-ativo-por-linha do BRIEF-mãe, item 22) · (d3) conjunto entre notas · (d1)+(d2).
- **Resposta literal (2ª):** *"Vamos pesquisar qual o padrão do mercaado, pq ambos podem ser feitos"*
- **Pesquisa (agente, 02/10; fontes na conversa):** mínimo de mercado = 1 linha → 1 ativo, com quebra por
  quantidade (D365, Senior, Protheus, Odoo); além disso, bem principal + componentes/acréscimos (SAP, Senior,
  Protheus, NetSuite); junção de linhas de **qualquer** nota (Oracle *merge mass additions*, NetSuite *parent
  proposal*); nenhum ERP faz "só linhas da mesma nota"; PN CST 20/80 (fonte secundária) põe o critério na função do
  conjunto. Não verificados: Domínio, Questor, Alterdata, Sankhya, RM, Datasul, Omie, Conta Azul, Bling.
- **Pergunta final:** (d1) agora + (d3) frente própria · (d1)+(d3) nesta emenda · junção geral de linhas · (d1) só.
- **Resposta literal (3ª):** *"Junção geral de linhas"*
- **Registro:** ✅ (e) junção geral de linhas, caminho novo do dono. Troca a chave 1-ativo-por-linha do BRIEF-mãe
  (item 22) → **ADR de emenda antes** (T12). E7 ajustado, E7b novo e bloqueado até o ADR.

## Rodada 2 — emenda 3.2, Parte 2 (benfeitoria)

### F-EM-5 — prazo da benfeitoria
- **Pergunta:** amortizar em quanto tempo? (Avisado: "min" não existe nas normas lidas; RIR 333 manda o prazo
  restante; PNs 210/73 e 104/75 só em fonte secundária, FLAG-3.2-C.)
- **Opções:** (a) prazo restante do contrato, RIR 333 (**recomendada**) · (b) min(contrato, vida útil), retirada pelo BRIEF.
- **Resposta literal (1ª):** *"(b) min(contrato, vida útil)"*
- **Conflito mostrado antes de registrar:** no **fiscal** a regra contradiz o RIR 333 (texto oficial); no contábil é
  prática do CPC 27. Pergunta: vale para qual livro? Opções: só contábil (fiscal RIR 333, diferença no Bloco F) ·
  contábil e fiscal (contradiz o RIR 333; não recomendado) · volta para (a).
- **Resposta literal (2ª):** *"(b) Contábil e fiscal"*
- **Registro:** ✅ (b) nos dois livros, divergente da recomendação. Risco legal aberto como **FLAG-3.2-D** (contador).
  Como contábil = fiscal, E21/F-EM-11 (a) continuam consistentes. E11 reescrito: `n = min(nContrato, nVida)`.

### F-EM-6 — onde mora o prazo
- **Opções:** (a) `leaseEndDate` no ativo (**recomendada**) · (b) na classe.
- **Resposta literal:** *"(a) No ativo (Recomendado)"* → ✅ (a).

### F-EM-7 — conta de despesa da amortização
- **Opções:** (b) `amortizationExpenseAccountId` na classe (**recomendada**) · (a) reusa `depreciationExpenseAccountId`.
  (Avisado: código do referencial pendente do contador.)
- **Resposta literal:** *"(b) Conta própria (Recomendado)"* → ✅ **(b), ratificado, código pendente do contador.**

### F-EM-8 — renovação/rescisão
- **Opções:** (a) imutável após ativação; rescisão = dispose (**recomendada**) · (b) comando `extendLease`.
- **Resposta literal:** *"(a) Imóvel; rescisão = baixa (Recomendado)"* → ✅ (a).

## Rodada 3 — emenda 3.2, Parte 3 (Bloco F)

### F-EM-9 — forma do registro do Bloco F
- **Pergunta (com a diferença (a) × (d) explicada):** (a) grava a linha da Parte A ligada à Parte B **e** um movimento
  avulso M410 do mesmo valor → saldo anda 2× (Manual L12); (d) só a Parte A com M305, adição com `indRelacao='3'` +
  M310/M312, exclusão com `'1'`. Avisado: indRelacao por linha é inferido (IN 310 + manual); oráculo = PVA.
- **Opções:** (d) (**recomendada** na 3ª passada) · (a) (retirada) · (b) só movimento Parte B · (c) (a) + M312.
- **Resposta literal:** *"(c) (a) + M312"*
- **Antes de registrar:** o agente mostrou que (c) herda a contagem dupla de (a) e combina `indRelacao='1'` com M312,
  que o leiaute/schema só aceitam com 2/3 (S9); (d) já contém o M312 na adição. → confirmação na rodada 4.

### F-EM-10 — configuração da conta Parte B
- **Opções:** (b) resolver por `codPbRfb` + `codTributo`, como o PF/BC (**recomendada**) · (a) 4 FKs em settings.
- **Resposta literal:** *"(b) Pelo código RFB (Recomendado)"* → ✅ (b).

### F-EM-11 — benfeitoria tem diferença contábil × fiscal?
- **Opções:** (a) não (**recomendada**; coerente com F-EM-5 b nos dois livros) · (b) sim.
- **Resposta literal:** *"(a) Não (Recomendado)"* → ✅ (a).

### F-EM-14 — linha que precisa de 2 contas da Parte B
- **Opções:** (a) tabela filha `LalurEntryParteBLink` (**recomendada**) · (b) 400 no fechamento · (c) 2 linhas (proibido pela unique).
- **Resposta literal:** *"(a) Tabela filha (Recomendado)"* → ✅ (a).

## Rodada 4 — emenda 3.2, fechamento (+ F-ENC-6 da 3.3)

### F-EM-9 — confirmação
- **Pergunta:** (c) grava o saldo da Parte B 2× (R$100 → R$200 na ECF) e combina `indRelacao='1'` com M312 (fora do
  leiaute); (d) já tem o M312 na adição. Mantém?
- **Opções:** troca para (d) (**recomendada**) · mantém (c) com os defeitos anotados.
- **Resposta literal:** *"Troca para (d) (Recomendado)"* → ✅ **(d)**.

### F-EM-12 = F-ENC-6 — colisão com linha manual da Parte A (pergunta única, registrada nos dois BRIEFs)
- **Pergunta:** linha manual 86/161 (ou a da multa indedutível) no mesmo trimestre da linha automática: o que acontece?
- **Opções:** (a) 400 no fechamento nomeando a linha manual (**recomendada** nos dois) · (b) soma (3.2) / manual vence
  (3.3) · (c) chave com `origem` e M300 com 2 filhos.
- **Resposta literal:** *"(a) 400 no fechamento (Recomendado)"* → ✅ **F-EM-12 → (a)** e **F-ENC-6 → (a)**
  ([`BE-INCR-ENCARGOS-DESCONTOS-EMENDA-3-3-brief.md`](../../accounting/BE-INCR-ENCARGOS-DESCONTOS-EMENDA-3-3-brief.md) §5, E17).

### F-EM-13 — fatiamento
- **Opções:** (b) 3 PRs seriais P1 R$1.200 → P2 benfeitoria → P3 Bloco F (**recomendada**) · (a) 1 PR.
  (Avisado: E7b, a junção, depende de ADR e fica fora dos PRs.)
- **Resposta literal:** *"(b) 3 PRs seriais (Recomendado)"* → ✅ (b).

**Emenda 3.2: 14/14 forks ratificados.**

## ADR-INCR-UNIT-REKEY (I1b)

### F-RK-2 — tenants do SEED-MY — **NÃO PERGUNTADO**
- Motivo: a premissa muda quando o [[SEED-UNITS]] entrar em `main` (nota [[I1b]], fold 28/09). Verificado em 02/10:
  `git log origin/main` (@ `669b41d3`) sem commit do SEED-UNITS; `gh pr list` sem PR aberto. O nó tem "executa" desde
  01/10, mas o código não entrou. Re-perguntar depois do merge.

## Rodada 5 — ADR do re-key

### F-RK-1 — descoberta dos legados
- **Opções:** (a) `--plan` automático + `--apply` explícito, 1 unidade por vez (**recomendada**) · (b) `--apply` em
  tudo que for `LEGACY` · (c) lista à mão.
- **Resposta literal:** *"(a) Plano auto + 1 por vez (Recomendado)"* → ✅ (a).

### F-RK-3 — `unit-incr6-val` e `unit-incr6-val-1782938879534` (admin)
- **Pergunta (com o viés T8 do ADR e o insumo ausente §8.1):** re-chavear o resíduo de teste do INCR-6?
- **Opções:** (b) não re-chavear, órfãs documentadas (**recomendada**) · (a) re-chavear · (c) purgar (descartado).
- **Resposta literal:** *"(b) Não re-chavear (Recomendado)"* → ✅ (b).

### F-RK-4 — modelo transacional
- **Opções:** (a) 1 `$transaction` interativa por unidade (**recomendada**) · (b) passos por tabela fora de tx.
- **Resposta literal:** *"(a) 1 transação por unidade (Recomendado)"* → ✅ (a).

### F-RK-5 — `audit_chain_heads`
- **Opções:** (a) não mexer; cadeia legada selada, nova começa no genesis (**recomendada**) · (b) re-chavear a cabeça
  (`MISSING_GENESIS`) · (c) mudar `verifyAuditChain`.
- **Resposta literal:** *"(a) Não mexer (Recomendado)"* → ✅ (a).

## Rodada 6 — ADR do re-key

### F-RK-6 — âncora documental na trilha nova
- **Opções:** (b) log + evento genesis `unit.rekeyed` com `fromHeadHash`/`fromNextSeq` (**recomendada**) · (a) só log + runbook.
- **Resposta literal:** *"(b) Log + evento âncora (Recomendado)"* → ✅ (b).

### F-RK-7 — leitura do histórico pré-re-key
- **Opções:** (a) aceitar; histórico via CLI/SQL sob o legado (**recomendada**) · (b) alias legado→novo no `AuditRepository`.
- **Resposta literal:** *"(a) Aceitar (Recomendado)"* → ✅ (a).

### F-RK-8 — como a linha de `units` nasce
- **Opções:** (a) `prisma.dynamicTableData.create` direto, sem plugins (**recomendada**) · (b) `createTableData`
  (roda os plugins de pipeline e estoque).
- **Resposta literal:** *"(b) Pelo caminho normal"*
- **Checagem antes de registrar:** sem conflito com fork ratificado (o "desejado" do BRIEF do I1 §5 é texto do agente);
  compatível com F-RK-4 (a) porque `createTableData` aceita `{ tx }` (`DynamicTableService.ts:546,591-593`).
- **Registro:** ✅ (b), divergente da recomendação. Itens do ADR ajustados: 8, 10, 13, 17.

### F-RK-9 — nome/tipo da unidade nova
- **Opções:** (a) `--name` obrigatório (**recomendada**) · (b) default = string legada.
- **Resposta literal:** *"(a) --name obrigatório (Recomendado)"* → ✅ (a).

## Rodada 7 — ADR do re-key

### F-RK-10 — concorrência com o servidor
- **Opções:** (a) servidor parado é passo do runbook; CLI só avisa (**recomendada**) · (b) CLI detecta por porta/health.
- **Resposta literal:** *"(a) Passo do runbook (Recomendado)"* → ✅ (a).

### F-RK-11 — gate de verificação
- **Opções:** (a) `--verify` próprio; `smoke:migration` só como integridade (**recomendada**) · (b) emendar o
  `smoke-migration-gate.mjs` (avisado: aparato novo sob a moratória do CLAUDE.md).
- **Resposta literal:** *"(a) Verificação própria (Recomendado)"* → ✅ (a).

### F-RK-12 — ordem com I6
- **Opções:** (a) I1b mergeado e executado antes do I6 (**recomendada**) · (b) I6 antes.
- **Resposta literal:** *"(a) I1b antes do I6 (Recomendado)"* → ✅ (a).

**ADR do re-key: 11/12 ratificados; F-RK-2 pendente (SEED-UNITS fora de `main`).**

## Resumo

| Fork | Decisão | Igual à recomendação? |
|---|---|---|
| F-EM-1 | (a) padrão ativar, despesa só explícita por item | sim |
| F-EM-2 | (b) teto da divisão (resultado idêntico a (a)) | não |
| F-EM-3 | (b) flag vida útil ≤ 1 ano — amplia o escopo | não |
| F-EM-4 | (e) junção geral de linhas — ADR de emenda antes (E7b) | não (caminho novo) |
| F-EM-5 | (b) min(contrato, vida útil) nos dois livros — FLAG-3.2-D | não |
| F-EM-6 | (a) `leaseEndDate` no ativo | sim |
| F-EM-7 | (b) conta própria — código referencial pendente do contador | sim |
| F-EM-8 | (a) imutável; rescisão = baixa | sim |
| F-EM-9 | (d) só Parte A + M305 (após confirmação; 1ª resposta foi (c)) | sim |
| F-EM-10 | (b) por `codPbRfb` + tributo | sim |
| F-EM-11 | (a) benfeitoria sem diferença contábil × fiscal | sim |
| F-EM-12 = F-ENC-6 | (a) 400 no fechamento | sim |
| F-EM-13 | (b) 3 PRs seriais | sim |
| F-EM-14 | (a) tabela filha `LalurEntryParteBLink` | sim |
| F-RK-1 | (a) `--plan` automático + `--apply` 1 por vez | sim |
| F-RK-2 | **não perguntado** — SEED-UNITS fora de `main` | — |
| F-RK-3 | (b) `incr6` não re-chaveadas | sim |
| F-RK-4 | (a) 1 transação por unidade | sim |
| F-RK-5 | (a) cabeça da cadeia não muda | sim |
| F-RK-6 | (b) log + evento âncora | sim |
| F-RK-7 | (a) histórico antigo via CLI/SQL | sim |
| F-RK-8 | (b) caminho normal (`createTableData` com plugins, na mesma tx) | não |
| F-RK-9 | (a) `--name` obrigatório | sim |
| F-RK-10 | (a) servidor parado no runbook | sim |
| F-RK-11 | (a) verificação própria | sim |
| F-RK-12 | (a) I1b antes do I6 | sim |

## Fechamento das pendências — **por DELEGAÇÃO do dono** (mesmo dia)

- **Delegação literal (chat, 02/10):** *"Toma a decisão logica aqui entao e feche as pendencia"* — sobre a lista dos 4
  pontos em que o agente parou antes de registrar (F-EM-2, F-EM-5, F-EM-9, F-RK-8) e sobre as pendências (F-RK-2;
  FLAG-3.2-D/A/B/C e código do F-EM-7; ADR do E7b). Decisões abaixo são **do agente**, citáveis por essa frase;
  reverter = pedir em chat. Nada aqui é "executa".
- **Viés (T8):** o agente pende para a leitura literal da norma e para o menor diff no caminho já testado.

| Item | Antes | Decisão por delegação | Por quê |
|---|---|---|---|
| F-EM-2 | (b) | **mantido (b)** | (a) e (b) são equivalentes; (b) deixa o unitário legível na trilha (E8) |
| F-EM-5 | (b) nos dois livros | **(b) só no contábil; fiscal pelo prazo restante (RIR 333)** | o fiscal com `min` contraria o RIR 333 (texto oficial); no contábil o CPC 27 item 56(d) sustenta o `min` |
| F-EM-11 | (a) | **(b)**, por consequência | com livros diferentes, a benfeitoria tem diferença quando vida útil < contrato → Bloco F (E21 reescrito) |
| FLAG-3.2-D | aberta | **fechada** | deixou de existir com a revisão do F-EM-5 |
| F-EM-9 | (d) | **mantido (d)** | já corrigido pelo dono |
| F-RK-8 | (b) | **mantido (b)** | compatível com F-RK-4 (a) (`createTableData` aceita `{ tx }`) |
| F-RK-2 | não perguntado | **(a) excluir por lista explícita** (`seed-unit-presumido`, `seed-unit-real`) + critério "sem `units`" | F-S1c → (a) "re-semear" (dono, 28/09) já recria o razão do seed; o legado fica (F-P5 a); re-chavear duplicaria o razão; o BRIEF do SEED-UNITS diz que re-semear **implica** F-RK-2 (a). Não depende mais do merge do SEED-UNITS |
| F-EM-7 código | pendente do contador | **`3.01.01.07.01.24`** "(-) Encargos de Amortização"; acumulada `1.02.03.01.31` | catálogo oficial RFB 2025 importado no X2 (gate `done`, assinado 24/09), lido em `referential_accounts`; contador confirma sem bloquear |
| E7b | sem ADR | **ADR escrito** — [`ADR-INCR-FIXED-ASSETS-EMENDA-JUNCAO.md`](../../adr/ADR-INCR-FIXED-ASSETS-EMENDA-JUNCAO.md), F-JL-1..6 decididos por delegação | `sessao-planejamento`; lápide `mergedIntoId` mantém a chave do re-drive; PR P4 |
| FLAG-3.2-A | aberta | **fechada** — base = custo do CPC 27 16(a)/17(c); imposto não recuperável fica no custo (lado conservador) | CPC 27 lido no PDF oficial da CVM; nenhuma norma fiscal lida contradiz (RIR 301 § 3º é de mercadorias; IN 1.700 art. 131 § 7º) |
| FLAG-3.2-B | aberta | **fechada** — E8b confirmado | Lei 8.245/91 art. 35 + Súmula 335 STJ, lidos na fonte oficial: no silêncio do contrato, necessária e útil autorizada são indenizáveis |
| FLAG-3.2-C | aberta | **fechada por troca de fundamento** | PNs 210/73 e 104/75 não indexados no SIJUT; o E8b passa a se apoiar no RIR 331 III + 333 (texto oficial) |

**Estado final:** emenda 3.2 com 14/14 forks e 0 flags abertas; ADR da junção com F-JL-1..6; ADR do re-key com 12/12
forks. Nenhum nó recebeu "executa".
