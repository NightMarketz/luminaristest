# BE-INCR-SIMPLES-CGSN-196: Res. CGSN 196/2026 no módulo Simples e o grupo `simplesCalc.ts` da caixa de lacunas (BRIEF)

> **Sessão:** `sessao-planejamento` do **grupo** da caixa "Res. CGSN 196 / simplesCalc". Produz decisão, não código. Nenhum
> fork deste documento se auto-ratifica.
> **Autorização:** `docs/plano/decisoes/D-2026-11-11-LACUNA-VAI-AO-MAESTRO.md`, emenda de 21/11 (2), item 6: "**Grupo vai a
> planejamento macro** (dono: 'Planeja como resolver tudo no macro em vez de vários remendos')", com "**uma**
> `sessao-planejamento` do grupo, com o id de todas as lacunas no brief". Cobre este BRIEF e nada além dele.
> **Execução: autorizada** (dono, chat, 26/11/2026: "Ratifico F-196-1 a 4 como recomendado, executa"). F-196-1..4
> RATIFICADOS na opção (a) de cada um (§5). O F-196-5 (`L-20261124-122830-f73e`) **segue com o dono** e não entra na
> execução. Ordem: PR-1 (itens 1–5) e o item 6 primeiro; PR-2..PR-4 entram depois de #1425/#1326 (§9, colisões).
> **Base:** `origin/main` `40b6ab8f4` (fetch em 26/11/2026). `origin/integration/eficiencia-fiscal-montador` não tem commit à
> frente da `main`. Nenhum PR aberto toca `simplesCalc.ts` (`gh pr list --state open` em 26/11; os PRs que mexem no Simples
> são #1428, em `paises/br/legalParameters/simples.ts`, e #1425/#1326, em `SimplesApuracaoService`, `SimplesDto` e o DP;
> conferido também com `git diff --name-only origin/main...<branch>` dos dois: nenhum toca `simplesCalc.ts`).
> **Sem nota de nó:** o grupo vem da caixa, não de um nó do plano; por isso o `write_set` do §9 não foi gravado em frontmatter
> nenhum (o nó natural seria `X14`, cuja nota esta sessão não edita).
> **Graus:** **V** = li nesta sessão (arquivo:linha ou texto da fonte) · **I** = inferido · **A** = assumido.

## 0. Lacunas do grupo e onde cada uma fecha

| Lacuna | Estado ao abrir | O que fecha | Onde | Comando que prova |
|---|---|---|---|---|
| `L-20261125-195439-09b7` (defeito, teto do ISS na 6ª faixa sem IBS) | aberta → em-sessao | itens 1 e 2, depois do **F-196-1** | PR-1 | `cd server && npx jest src/features/accounting/models/__tests__/simplesCalc.test.ts --selectProjects unit` (caso 2027-01, RBT12 R$ 4,5 mi, Anexos III e IV) |
| `L-20261125-195502-411d` (spec, o resto da Res. 196 não mapeado) | aberta → em-sessao | §2 (mapa dispositivo a dispositivo) e itens 4, 5, 7, 8 e 9 | PR-1..PR-4 | o §2 é o mapa; cada item prova pelo próprio comando (linhas 09b7, 666e e itens 4, 5, 7–9 do §3) |
| `L-20261125-195503-a785` (débito, 8 dossiês citam a Res. 140 de antes da 196) | aberta → em-sessao | item 6 | PR de docs | `python ~/.claude/tools/pesquisa-legal/legal.py trecho <dossiê> D24 "<dispositivo>"` por dispositivo citado, e o adendo no `relatorio.md` de cada um dos 8 |
| `L-20261124-053025-666e` (spec, Onda 3.2: datas de corte em literal) | aberta → em-sessao | **só** o literal que sobrou em `simplesCalc.ts`: item 3. O resto (#11 `PRINCIPAL_ACESSORIO_DESDE` em `taxOptimization.ts:53`, #14 `ibsCbsTabelas`, não medido aqui) é do nó ONDA3-2 e não é planejado aqui | PR-1 | `cd server && npx jest src/features/accounting/models/__tests__/simplesCalc.test.ts --selectProjects unit` (virada 2032-12 → 2033-01 só pela linha `ISS_LIMITE`) |
| `L-20261114-214052-b25f` (débito, a forma da janela do RBT12 está em código) | aberta → em-sessao | **não fecha aqui.** Espera o **F-ML-0** do `BE-INCR-LEGAL-REGRAS-brief.md` §0.2 (motor × variantes por vigência), que segue RATIFICAÇÃO PENDENTE. O BRIEF do F3 do país na borda já a marca "fora: espera o F-ML-0" (`BE-INCR-PAIS-NA-BORDA-F3-brief.md:81`). Ver §8 | LEGAL-REGRAS | o `comoProvar` dela, no nó dono |
| `L-20261121-194911-ffd3` (spec, cenário sem origem para `LOCACAO_MOVEL`, retenções e deduções) | aberta → em-sessao | **não fecha aqui.** O conserto é no motor do PR-1 de SIMULACAO-CENARIO (o `comoProvar` dela diz "BRIEF do PR-1"), e a forma depende do **F-SIM-14** ("campo do contrato sem motor", `BE-INCR-SIMULACAO-CENARIO-PR0-brief.md:615`), que está pendente. `simplesCalc` já aceita `LOCACAO_MOVEL` (`simplesCalc.ts:71`) e não muda | SIMULACAO-CENARIO PR-1 | o `comoProvar` dela (BRIEF do PR-1) |
| `L-20261124-122830-f73e` (com-dono, ger 3: `INICIO_PRIMEIRA_FAIXA` anda com o marco da LC 214) | com-dono | **F-196-5** (fork do dono, só citado). Fato novo abaixo | dono | o `comoProvar` dela, depois da resposta do dono |

## 1. Contexto fixo (fato consumado no repo)

- `apurar()` (`server/src/features/accounting/models/simplesCalc.ts:325`) calcula o DAS por atividade. Lido em 26/11 (V):
  - `SUBLIMITE` (`:319`) é indexado pela **forma da janela do RBT12** (`janela.regra`). De 2027 em diante a lista inclui o
    IBS.
  - Na 6ª faixa sem sublimite excedido (`:374-382`), ICMS, ISS e IBS saem pela fórmula da 5ª faixa.
  - Teto do ISS na 6ª faixa (`:398-410`): o excesso vai aos "federais", que são `rep` (repartição da **6ª** faixa) menos
    `sublimite`, menos ISS e menos ICMS. Os pesos são os da repartição da 6ª.
  - Na 5ª faixa (`:414-419`) vale a tabela `teto.transferencia` da linha `SIMPLES_TETO_ISS`.
  - O campo `transfereAIbs` do `TetoIssJsonSchema` (`:46-53`) **não é lido por ninguém** (grep em `server/src`: só o schema
    e `formatoLinha.ts:450`).
  - `data < '2033-01-01'` (`:394`) é literal de data. `issExtinto(linhas, data)` já deriva o mesmo marco da linha
    `ISS_LIMITE` (`issTransicao.ts:37`).
- A semente sai de `scripts/gen-simples-anexos.mjs`, que lê o corpus `docs/accounting/fontes-oficiais/TRANSCRICAO-SIMPLES-ANEXOS-LC123-LC214-2026-10-07.txt`
  (LC 123 Anexos I–V e Anexos XVIII–XXII da LC 214). O `transfereAIbs` de cada linha vem do regex
  `/tributos federais e IBS/` sobre a nota (*) do anexo (`gen-simples-anexos.mjs:222`). Linhas lidas em
  `server/prisma/data/legal_parameters_simples_v*.sql` (V):
  - `sn1-teto-iii-2027-01-01`: `{percentualBp:500, transfereAIbs:false, transferencia:{IRPJ:602,CSLL:526,CBS:2320,CPP:6526,IBS:26}}`.
  - `sn1-teto-iv-2027-01-01`: `{…, transfereAIbs:false, transferencia:{IRPJ:3133,CSLL:3200,CBS:3627,IBS:40}}`.
  - `sn1-rep-iii-2027-01-01-f6`: `{IRPJ:3509,CSLL:1504,CBS:1929,CPP:3058}`.
  - `sn1-rep-iv-2027-01-01-f6`: `{IRPJ:5371,CSLL:2159,CBS:2470}`, **sem chave IBS** nos dois.
  - De 2029 em diante a semente já traz `transfereAIbs:true`.
- `SimplesApuracaoService` lê a fotografia com `ISS_LIMITE` (`TABELAS`, `:70`), e `TaxSimulationService` também
  (`TABELAS_REGIME`, `:62`). Os dois chamadores de `apurar()` já carregam a linha de que `issExtinto` precisa (V).
- `ReceitaFiscalLinha.competencia` é "YYYY-MM do dia da receita" e `dia` é "dia do lançamento da receita"
  (`schema.prisma:3522-3523`). A base do DAS sai de `receitaRepo.findByCompetencia`. Já existe a comparação com a soma das
  NFS-e autorizadas na competência (`SimplesApuracaoService.ts:1204`, V).
- Juros e multa de mora **recebidos** no AR são classes de encargo da baixa bancária
  (`BankSettlement.model.ts:61-65`: `RECEIVABLE: ['JUROS_MORA','MULTA_MORA']`). Viram receita financeira
  (`JUROS_MORA_RECEBIDOS_CODE`, `MULTAS_MORA_RECEBIDAS_CODE`) e **não** geram `ReceitaFiscalLinha` (V por grep: nenhuma
  escrita de `ReceitaFiscalLinha` a partir de `BankSettlement`; I quanto a outros caminhos).
- Crédito de IBS/CBS do adquirente: só sobre o destacado (`ibsCbsCredito.ts:5`). A sugestão de alíquota da nota do optante já
  usa `FAIXA_MES_PRESTACAO` de 2027 em diante (`SimplesApuracaoService.ts:1252-1276`) (V).
- Regime de caixa: `ULTIMO_ANO_RETORNO_DECIDIDO = 2025` (`simplesCaixa.ts:70`); o ano 2026 era a ambiguidade A1 do
  BRIEF `BE-INCR-SIMPLES-CAIXA`. O fim do caixa é a linha `MARCO_LEGAL/FIM_REGIME_CAIXA_SIMPLES`, que já cita a Res. 190
  art. 9º II na redação da Res. 196 (V).
- Go-live em 2027 (dono, chat, 30/10/2026): regra que só vale para fato de 2026 não tem cliente.

## 2. Base legal lida e o mapa da Res. CGSN 196/2026

**Fontes.** A Res. CGSN 196/2026 **não está** no acervo `ctresb/leis` (`achar reguladores/rfb/resolucoes/2026` lista só a
CGNFS-e 9 e a CGSIM 1). A Res. 140/2018 está (`reguladores/rfb/resolucoes/2018/resolucao-n-140-de-22-de-maio-de-2018-15742358.md`),
mas o acervo traz as normas da RFB na publicação original, sem as alterações de 2026; há texto mais novo. Por isso li a
visão multivigente oficial (API Normas RFB, SIJUT), baixada em 25/11/2026 e versionada no repo:
- [R196] `pesquisas-legais/dp-tabelas-irrf-das-sst/docs/D10_rfb-154694-multivigente.txt`: Res. CGSN 196, de 16/11/2026,
  DOU de 24/11/2026; <https://normasinternet2.receita.fazenda.gov.br/api/consulta-externa/ato/154694/visao/multivigente>.
- [R196-AIII] / [R196-AIV]: `…/D13_87479.txt` e `…/D14_87480.txt` (Anexos III e IV da 196).
- [R190] `…/D09_rfb-152832-multivigente.txt`: Res. CGSN 190/2026 já com as revogações da 196.
- [R140] `…/D24_rfb-92278-multivigente.txt`: Res. CGSN 140/2018 multivigente; o legal.py acusou TEXTO MUDOU (lacuna a785).
- [LC123] acervo `ctresb/leis` `federal/leis-complementares/2006/lcp-123-2006-12-14.md` @ `394a7e97` (compilada, cópia de
  13/10/2026, sem alerta), dossiê `pesquisas-legais/simples-cgsn-196-brief` [D01]. No § 1º-B I aparece "(Vide LC 214,
  alterada pela LC 227)", que é evidência de texto mais novo. Por isso:
- [LC214] Planalto, LC 214 compilada, `pesquisas-legais/das-espelho-guia/docs/D04_lcp214-htm.txt:9819-9821` (baixada em
  20/11/2026): o art. 517 dá ao art. 18 § 1º-B I da LC 123 a redação "transferindo-se eventual diferença, de forma
  proporcional, **aos tributos federais e IBS** da mesma faixa de receita bruta anual; (Incluído pela Lei Complementar nº 227,
  de 2026)".

**Vigência da 196** ([R196] art. 8º): na publicação (24/11/2026) valem os arts. 1º, 4º, 5º e 6º; de 01/01/2027 valem os
arts. 2º, 3º e 7º. **O art. 5º** revoga, desde 24/11/2026, alterações que a Res. 190 tinha feito na Res. 140 antes de elas
valerem, e o art. 2º as reedita com outro texto (art. 2º V, VI, § 4º VI e §§ 8º, 9º, 9º-A; art. 6º § 1º-B; art. 21 III;
art. 40-D § 2º; art. 58 § 4º; art. 59 § 9º; art. 68-A). **Não revoga** o art. 21 IV incluído pela Res. 190 (6ª faixa:
ICMS, ISS e IBS pela fórmula da 5ª, [R190] linha 96).

### Mapa, dispositivo a dispositivo (fecha a 411d)

Legenda: **item N** = vira comportamento no §3 · **F-196-N** = fork §5 · **sem cliente** = só fato de 2026 · **coberto**
= o código já faz (com a evidência) · **fora** = outro módulo, vai à caixa (§8) · **sem efeito** = não muda cálculo nem
dado do produto.

| Dispositivo (Res. 140, red. Res. 196) | Vigência | O que diz | Classificação |
|---|---|---|---|
| art. 21 II "c" (art. 1º) | 24/11/2026 | PD "constante dos Anexos I a V desta Resolução" (só tira o "e" do fim) | sem efeito |
| art. 121 § 4º (art. 1º) | 24/11/2026 | registro da impugnação de indeferimento da opção pelo ente | sem efeito (é do ente federado) |
| art. 144-C caput e § 1º (art. 1º) | 24/11/2026 | quem estava no caixa em 2026 põe o não recebido até 31/12/2026 na base de dez/2026 | **sem cliente**: é o PA 12/2026. Responde por lei a A1 do `BE-INCR-SIMPLES-CAIXA` (o ano 2026 de `ULTIMO_ANO_RETORNO_DECIDIDO`, `simplesCaixa.ts:70`). O comentário velho vai descrito no §8 (G5) |
| art. 144-C § 2º (art. 1º) | 24/11/2026 | devolução ou cancelamento **de 2027 em diante** de operação tributada até 2026 → ajuste no PA de origem | **sem cliente** (I): alcança fato de 2027, mas só sobre venda de 2026 registrada no sistema. Sem go-live em 2026, não há venda de 2026. Se um dia houver importação de histórico de 2026, a regra pesa contra a do produto (DEVOLUCAO na competência do lançamento, `schema.prisma:3536-3537`); vai como observação no §8, sem item |
| art. 144-F (art. 1º) | 24/11/2026 | Defis do ano-calendário 2026 até 31/03/2027, no PGDAS-D 2018 | **item 5**: o prazo cai em 2027 e tem cliente. Responde por lei à "ambiguidade A1 … pergunta ao contador" da `fonte` de `sn7-obr-defis-simples` (`legal_parameters_simples_v6.sql:5`) |
| Res. 190 art. 9º (art. 4º) | 24/11/2026 | efeitos da 190: arts. 144-D/E na publicação; o resto em 01/01/2027 | **coberto** (`MARCO_LEGAL/FIM_REGIME_CAIXA_SIMPLES` já cita). É a fonte de data que a f73e pedia (**F-196-5**) |
| Res. 190 art. 6º revogado (art. 6º) e Anexos I–V novos (art. 3º) | 24/11/2026 · 01/01/2027 | os Anexos da 196 substituem os da 190 | **item 4**: paridade semente × Anexos da 196. Spot-check V: Anexo III 2027 F6 32,90% / 648.000,00 e repartição 35,09/15,04/19,29/30,58 batem com `sn1-faixa-iii-2027-01-01-f6` e `sn1-rep-iii-2027-01-01-f6`; teto 2027 (6,02/5,26/23,20/65,26/0,26) bate com `sn1-teto-iii-2027-01-01`. **Diverge** só a nota (*) de 2027–2028: a 196 diz "federais **e IBS**", a LC 123 Anexo XX diz "federais" (`TRANSCRICAO-…-2026-10-07.txt:23`) → item 2 |
| art. 2º V (art. 2º) | 01/01/2027 | início de atividade = data de inscrição no CNPJ | sem efeito (I): `inicioAtividadeEm` é digitado (`CompanyFiscalProfileDto.ts:125`) e o cartão CNPJ traz uma data só |
| art. 2º VI, VII; art. 59-A | 01/01/2027 | gov.br prata/ouro; "optante pendente" e a nota fiscal dele | VI sem efeito; VII e 59-A são do emissor → **fora** (§8) |
| art. 2º § 4º IV–V; revogação do § 5º II (art. 7º I) | 01/01/2027 | **juros moratórios, multas e demais importâncias cobradas ou recebidas como parte do valor da operação passam a compor a receita bruta**; deixa de valer a exclusão "juros moratórios, multas … em decorrência do atraso" | **F-196-3** (a inclusão é lei; o mês e o anexo são o fork) |
| art. 2º §§ 8º, 9º, 9º-A | 01/01/2027 | receita auferida **no faturamento** (emissão do documento fiscal, inclusive o complementar e a nota de débito); na realização se não houver documento ou se ele for intempestivo; adiantamento também no faturamento | **F-196-2** |
| art. 6º § 1º-B; art. 40-D § 2º | 01/01/2027 | janela de cancelamento da opção (1º a 30/11; para o regime regular de IBS/CBS também 1º a 31/05) | sem efeito no cálculo (I). Prazo de opção é tela/aviso; não mapeado aqui |
| art. 21 III (art. 2º) | 01/01/2027 | percentual efetivo × repartição; ISS no limite "fixado nos referidos Anexos"; diferença "distribuída, de forma proporcional, **entre os tributos federais e o IBS** correspondentes à mesma faixa" | **itens 1–2 + F-196-1** (fecha a 09b7) |
| art. 25-A (art. 2º) | 01/01/2027 | receita de contrato com a administração pública é identificada à parte para o destino de IBS/CBS (CF 149-C; LC 214 art. 473); não aplica o redutor do art. 472; não muda o MEI | **F-196-4** |
| art. 38-A § 2º-A; art. 38-B § 2º-A | 01/01/2027 | CBS/IBS do PGDAS-D prevalecem sobre o destacado no documento; informações na exclusão | sem efeito (o produto calcula o espelho do PGDAS-D) |
| art. 39 §§ 2º–3º; art. 48; art. 131 § 8º; art. 138 III–VI | 01/01/2027 | retificação, cobrança, competência do CGIBS | sem efeito |
| art. 45-B p.ú. | 01/01/2027 | confissão de IBS/CBS antes da dedução do recolhimento do art. 45-B | sem efeito hoje (I): o produto não deduz esse recolhimento |
| art. 58 §§ 4º, 7º, 8º | 01/01/2027 | crédito de IBS/CBS ao adquirente = o cobrado no Simples, limitado ao devido; compra de MEI não dá crédito (salvo LC 214 art. 169) | **coberto** (I): `ibsCbsCredito.ts:5` só credita o destacado, e o MEI não destaca. Sem teste que prove o caso MEI → observação no §8 |
| art. 59 §§ 4º, 4º-A, 6º–8º; art. 68; art. 68-A | 01/01/2027 | campos do documento fiscal do optante (condição, regime de IBS/CBS, percentuais de crédito, impedimento); devolução; desacobertado | **fora** (§8): é o emissor NF-e/NFS-e, não o `simplesCalc` |
| art. 60 (e revogação dos §§ 1º–2º, art. 7º VI) | 01/01/2027 | alíquota do crédito na nota = percentual efetivo da faixa **do mês da operação** (art. 21 III e IV; art. 22 § 2º) | **coberto** (V): `regra: 'FAIXA_MES_PRESTACAO'` de 2027 em diante (`SimplesApuracaoService.ts:1252-1276`) |
| art. 106-C p.ú. | 01/01/2027 | MEI pode emitir um documento mensal consolidado para PF não identificada | **fora** (§8), feature opcional ("poderá") |
| art. 7º III: revoga o art. 26 § 6º I–III | 01/01/2027 | some o fator r do mês de início por FSPA/RPAr | **coberto** (V): de 2027 em diante a janela é `LC214-art517`, e `rbt12()` só devolve `INICIO_PRIMEIRA_FAIXA` (r = 0,28, `simplesCalc.ts:236-238, 261`); o ramo `INICIO_PRIMEIRO_MES` só roda antes de 2027 |
| art. 7º II, IV, V, VII (art. 5º XIV–XV, 39, 59, 121 § 6º) | 01/01/2027 | revogações de rito e de documento | sem efeito / **fora** (59) |

## 3. Checklist numerado de comportamentos

**Ordem:** itens 1–5 formam o **PR-1** (uma fase que se testa junta). Só os itens 1 e 2 dependem do F-196-1; os itens 3, 4
e 5 são diretos. Os itens 7, 8 e 9 são os PR-2..PR-4, cada um depois do seu fork. O item 6 é PR só de docs. Com 2+ PRs nos
mesmos arquivos vale `integration/simples-cgsn-196` (D-2026-11-10), um commit por item com o id no título.

1. **[F-196-1] Teto do ISS na 6ª faixa, de 2027 em diante (fecha 09b7).**
   - **Gatilho:** quem decide se o IBS entra na redistribuição é a linha `SIMPLES_TETO_ISS.transfereAIbs`, não a forma da
     janela. Assim o comportamento é dado com fonte e não anda com o marco da LC 214, que é o erro da f73e.
   - **Pesos:** os da opção ratificada no F-196-1.
   - **Comentários:** os de `simplesCalc.ts:374` e `:399` passam a citar a Res. 140 art. 21 III (red. Res. 196 art. 2º) e
     o art. 21 IV (incl. Res. 190), de 2027 em diante. Em 2027 o III não tem mais alíneas "a" e "b".
   - **Teste** (`simplesCalc.test.ts`): Anexo III e Anexo IV, `competencia 2027-01`, RBT12 = R$ 4.500.000,00,
     `sublimiteExcedido=false`. O percentual do IBS e o dos federais batem com o exemplo da opção ratificada (§5, F-196-1),
     e o total da atividade não muda entre as opções. Mais um caso de 2026-12 (`transfereAIbs:false`) igual ao de hoje.
   - Origem: [LC214] art. 517 (LC 123 art. 18 § 1º-B I); [R196] art. 2º (art. 21 III); [R196-AIII] e [R196-AIV], nota (*).
2. **Semente: `transfereAIbs` de 2027–2028 nos Anexos III e IV.**
   - Republicar `sn1-teto-iii-2027-01-01` e `sn1-teto-iv-2027-01-01` com `transfereAIbs:true`, em linha nova com
     `supersedesId`. Migração só de dado, com prólogo defensivo (SQLite não é transacional).
   - `fonte`: LC 123 art. 18 § 1º-B I (red. LC 214 art. 517, incl. LC 227/2026) e Res. 140 Anexos III/IV, nota (*) (red. Res.
     196 art. 3º).
   - `motivo`: a nota do Anexo XX/XXI da LC 214 para 2027–2028 diz só "federais", e o artigo da LC e a Res. 196 dizem
     "federais e IBS". Prevalece o artigo.
   - `gen-simples-anexos.mjs` ganha a correção explícita (nota que o artigo derroga), com teste: regerar não pode voltar a
     `false`.
   - É direto (a lei não deixa dúvida de que o IBS entra), mas só muda número se o F-196-1 não for (a).
3. **Literal `2033-01-01` em `simplesCalc.ts:394` (o que sobra da 666e no arquivo).** Troca por `!issExtinto(linhas, data)`
   (`issTransicao.ts:37`, LC 214 art. 543 IV), lido da mesma fotografia (`ISS_LIMITE` já está nos dois chamadores, §1).
   Teste: com a linha `ISS_LIMITE` terminando em 2032-12-31, Anexo III em 2032-12 sem linha de teto → `ParametroLegalAusenteError`;
   em 2033-01 → sem erro. E o teste de virada da Onda 3.2: mover só a linha muda o resultado sem tocar no código.
4. **Paridade semente × Anexos I–V da Res. 196 (fecha a parte "art. 3º" da 411d).**
   - Transcrever [R196] D11–D15 (Anexos I–V) para `docs/accounting/fontes-oficiais/TRANSCRICAO-SIMPLES-ANEXOS-RES-CGSN-196-<data>.txt`,
     com sha256 no `MANIFEST.md`.
   - Teste (`simplesAnexosSeed.test.ts`): toda faixa, repartição e teto de 2027 em diante na semente tem o mesmo número do
     anexo da 196.
   - A única diferença admitida é o `transfereAIbs` de 2027–2028, já corrigido pelo item 2. Qualquer outra diferença é
     vermelho e vira lacuna; o PR não "conserta" para a 196 (lei > resolução).
5. **DEFIS do ano-calendário 2026 (art. 144-F).**
   - Republicar `sn7-obr-defis-simples` (mesma vigência, até 2027-03-31) com `fonte` "Res. CGSN 140 art. 72 caput e § 1º
     até o ano-calendário 2025; ano-calendário 2026: art. 144-F (incl. Res. CGSN 196/2026 art. 1º), Defis até 31/03/2027
     no PGDAS-D 2018". A ambiguidade A1 sai do texto.
   - Teste: `obrigacoesPorRegime` de um Simples em 2027-02 lista DEFIS do ano-base 2026 como OBRIGATÓRIA.
   - Origem: [R196] art. 1º (art. 144-F).
6. **Releitura dos 8 dossiês que citaram a Res. 140 de antes da 196 (fecha a785).**
   - Dossiês: `dp-cobertura-100` D30, `parecer-salao-sp-4-pessoas` D13, `das-espelho-guia` D03, `insumos-salao-sp` D10,
     `ciclo-fiscal-prazos` D04, `simulacao-montador-unico` D03, `nfse-2027-salao-parceiro-cbs-ibs` D03,
     `simples-6-02-6-03-fator-r` D02.
   - Para cada um: `legal.py trecho` em cada dispositivo citado contra o [R140] D24.
   - **Prioridade:** os dispositivos que a 196 art. 5º revogou da 190 e reeditou com outro texto (lista no §2) e o art. 21
     III. O risco real está aí, porque a conclusão foi tirada sobre uma redação que não vai valer.
   - **Saída:**
     - adendo "Releitura 196 (data)" no `relatorio.md` de cada dossiê, só acrescentando: dispositivo, mudou/não mudou e a
       conclusão que muda;
     - uma lacuna por conclusão que mudou.
   - Sem código.
7. **[F-196-2] Momento em que a receita é auferida, de 2027 em diante (art. 2º §§ 8º–9º-A).** O comportamento depende da
   opção ratificada. Na recomendada (a):
   - **PR-2a:** medição, sem mudar valor. Alerta nomeado `RECEITA_MES_DIFERENTE_DO_FATURAMENTO` quando o mês do documento
     fiscal autorizado da venda difere de `ReceitaFiscalLinha.competencia`.
   - **PR-2b:** a base do DAS passa a usar a competência do faturamento, com volta à da realização quando não houver
     documento (§ 8º II).
   - **Teste:** venda finalizada em 31/01/2027 com NFS-e autorizada em 01/02/2027 → a receita entra no PA 02/2027.
8. **[F-196-3] Juros e multa de mora recebidos na receita bruta, de 2027 em diante (art. 2º § 4º V).** Na opção (a): baixa de
   recebível com encargo `JUROS_MORA`/`MULTA_MORA` grava `ReceitaFiscalLinha` de `tipo` novo (ex.: `ENCARGO_MORA`) na
   competência do recebimento, rateada pela natureza e pelo anexo das linhas da venda de origem. Recebível sem venda →
   aviso nomeado e fora da base. Teste: recebível de serviço do Anexo III recebido com R$ 10,00 de juros em 2027-03 → R$ 10,00
   na receita do Anexo III do PA 03/2027; o mesmo em 2026-12 → fora.
9. **[F-196-4] Receita de contrato com a administração pública (art. 25-A).** Na opção (a): identificação informativa na
   linha fiscal e no espelho do PGDAS-D, **sem mudar o valor do DAS** (§ 3º: sem redutor), quando o tomador CNPJ for órgão
   ou entidade da administração direta, autarquia ou fundação. Exceção do § 2º: compra presencial e dispensada de licitação.
   Teste: venda a tomador marcado como público em 2027-01 → segregada no espelho; total igual.

## 4. Contratos (esboço; quem materializa é a `sessao-feature`)

```ts
// item 1–2: sem mudança de forma. TetoIssJsonSchema (simplesCalc.ts:46) continua; muda só o uso:
//   transfereAIbs: true  ⇒ o IBS entra no conjunto que recebe o excesso do ISS (5ª e 6ª faixas).
//   Na 5ª faixa, a tabela `transferencia` já traz o IBS (0,26% / 0,40% em 2027): sem mudança.
//   Na 6ª faixa, os pesos são os do F-196-1.
type PesoExcessoIss6 =
  | { base: 'REPARTICAO_DA_FAIXA' }           // F-196-1 (a): rep da 6ª; o IBS não tem chave ⇒ peso 0
  | { base: 'PERCENTUAL_EFETIVO' }            // F-196-1 (b): peso = % efetivo de cada tributo já calculado
  | { base: 'TABELA_DA_5A' };                 // F-196-1 (c): teto.transferencia
// item 3: assinatura de apurar() não muda; usa issExtinto(linhas, data).

// item 7, opção (a): nada muda no DTO de entrada do simplesCalc (a competência é do chamador).
//   ReceitaFiscalLinha ganha, PR-2b:
//   competenciaSimples String  // YYYY-MM do faturamento (DF autorizado) ou da realização (§ 8º II); = competencia antes de 2027
//   origemCompetencia  String  // 'FATURAMENTO' | 'REALIZACAO_SEM_DF' | 'ANTES_2027'
// item 8, opção (a): ReceitaFiscalLinha.tipo ganha 'ENCARGO_MORA'; settlementId String? (idempotência por (settlement, linha))
// item 9, opção (a): ParcelaSchema/linha fiscal ganha
//   compraPublica: z.boolean().default(false)   // só identifica; não entra em `excluir`
// Alertas novos (todos nomeados, com fonte):
//   RECEITA_MES_DIFERENTE_DO_FATURAMENTO · ENCARGO_MORA_SEM_VENDA · TOMADOR_PUBLICO_SEM_NATUREZA
```

Gates que o diff aciona (ficam no checklist, não com o implementador):
- os itens 7–9 mudam `SimplesDto` e `ReceitaFiscalLinha`: snapshot de shape dos DTOs, `.gen.ts`, paridade i18n pt/en dos
  alertas, migração do `schema.prisma`;
- os itens 2 e 5 são migração de dado (`legal_parameters_simples_v7.sql` + migration);
- os itens 1–6 não acionam openapi.

## 5. Forks (F-196-1..4 RATIFICADOS em 26/11/2026; F-196-5 com o dono)

### F-196-1: Pesos da redistribuição do excesso do ISS na 6ª faixa (09b7)
**RATIFICADO (a)**, dono, chat, 26/11/2026: "Ratifico F-196-1 a 4 como recomendado, executa".

**Evidência.** A lei manda incluir o IBS ([LC214] art. 517; [R196] art. 21 III e as notas dos Anexos III/IV). Mas a
repartição da 6ª faixa **não tem IBS** ("–" em [R196-AIII]/[R196-AIV]; semente `…-f6` sem chave IBS), e o IBS da 6ª sai pela
fórmula da 5ª (art. 21 IV). Por isso "proporcional entre os federais e o IBS da mesma faixa" tem mais de uma leitura. O
`comoProvar` da 09b7 ("o IBS deve crescer") assume uma delas.

Na 5ª faixa a própria lei dá a tabela, e eu a reproduzi: os pesos são a repartição da faixa normalizada (4/66,5 = 6,02%;
3,5/66,5 = 5,26%; 15,43/66,5 = 23,20%; 43,4/66,5 = 65,26%; 0,17/66,5 = 0,26%).

**Exemplo** (Anexo III, 2027-01, RBT12 R$ 4.500.000,00):
- alíquota efetiva da 6ª = 18,50%; da 5ª = 18,2080%;
- ISS pela 5ª = 6,0997%, teto 5% ⇒ excesso de 1,0997 p.p.;
- IBS pela 5ª = 0,0310%.

O **total da atividade é o mesmo nas três opções**; muda a partilha entre IBS e federais, que vai ao espelho do PGDAS-D e ao
percentual de crédito do adquirente (art. 60).

| Opção | O que é | IBS | Federais (excesso) |
|---|---|---|---|
| **(a) repartição da 6ª faixa** | pesos = repartição da própria faixa, como a lei fez na 5ª; o IBS não tem repartição na 6ª ⇒ peso 0 | 0,0310% (não muda) | IRPJ +0,3859; CSLL +0,1654; CBS +0,2121; CPP +0,3363 p.p. (hoje) |
| (b) percentual efetivo | pesos = % efetivo já calculado de cada tributo (federais 18,50% somados; IBS 0,0310%) | 0,0328% (+0,0018 p.p. ≈ R$ 6,89/mês sobre R$ 375 mil) | quase igual a (a) |
| (c) tabela da 5ª faixa | pesos = `teto.transferencia` (IRPJ 6,02 / CSLL 5,26 / CBS 23,20 / CPP 65,26 / IBS 0,26) | 0,0338% (+0,0029 p.p.) | muda a partilha federal (a CPP leva 65%) |

**Decisão anterior.** A proporção pela repartição da 6ª é a regra de hoje: X14 PR-3, com o dono em 07/10 ("decide-se pela
lei", `simplesCalc.ts:399-401`). A ambiguidade para 2029 em diante já estava registrada e aberta como **A4** em
`BE-INCR-SIMPLES-NACIONAL-brief.md:287`. A Res. 196 a antecipa para 2027. A opção (a) continua a regra de 07/10; (b) e (c)
reabrem a A4.

**Recomendação: (a).** É a mesma construção que a lei mostra na 5ª faixa ("da mesma faixa" = os percentuais de repartição
da faixa). Na 6ª, a faixa não dá percentual ao IBS. O número de hoje não muda: o item 1 troca a citação e o gatilho, e o
teste prende o valor. **Contra (a):** a 196 escreveu "e o IBS" de propósito, e na 6ª faixa (a) torna a inclusão inócua. Se a
intenção for dar ao IBS a parte dele, a leitura é (b). Oráculo: o cálculo do PGDAS-D de 2027 (§6).

### F-196-2: Competência da receita no Simples de 2027 em diante (art. 2º §§ 8º–9º-A)
**RATIFICADO (a)**, dono, chat, 26/11/2026 (mesma frase).

**Evidência.**
- [R196] art. 2º: a receita é auferida "no momento do faturamento"; faturamento é a emissão do documento fiscal, "inclusive
  quando o fornecimento ocorrer em momento posterior à emissão" (§ 9º-A I).
- Sem documento ou com emissão intempestiva, vale a "efetiva realização" (§ 8º II). Adiantamento também conta no
  faturamento (§ 9º).
- Hoje a competência é o dia do lançamento da receita, a finalização da venda (`schema.prisma:3522-3523`).
- Na maioria das vendas do salão o documento sai no ato, e os meses coincidem. Divergem: a NFS-e emitida no mês seguinte, a
  nota de pacote pré-pago emitida no pagamento (`BE-INCR-PACOTE-VALIDADE`) e a nota complementar.

| Opção | O que é | O que deixa aberto |
|---|---|---|
| **(a) competência do faturamento, em 2 etapas** | PR-2a mede (alerta de mês divergente, sem mudar valor); PR-2b grava `competenciaSimples` = mês do documento autorizado, com volta à realização sem documento | o que é "emissão intempestiva" (prazo do leiaute ou do município) vira pendência externa (§6) |
| (b) manter a finalização + alerta | a base fica como está; o alerta mostra a divergência | a receita fica no mês errado sempre que nota e venda caem em meses diferentes; é remendo |
| (c) contador antes | a pergunta vai no pacote do contador; nada muda até a resposta | 2027 começa com a regra velha |

**Recomendação: (a)**, a estrutural em versão incremental. O PR-2a mede o tamanho do problema com dado real antes de mexer
no valor. **Contra:** `ReceitaFiscalLinha` também alimenta Presumido e Real, que não seguem esta regra. Por isso a coluna
é própria do Simples e não troca `competencia`.

### F-196-3: Juros e multa de mora na receita bruta, de 2027 em diante (art. 2º § 4º V)
**RATIFICADO (a)**, dono, chat, 26/11/2026 (mesma frase).

**Evidência.**
- [R196] art. 2º inclui o § 4º V ("os juros moratórios, as multas e demais importâncias cobradas ou recebidas como parte do
  valor da operação ou da prestação").
- O art. 7º I revoga o § 5º II, que hoje tira "os juros moratórios, as multas … em decorrência do atraso" ([R140] D24:53).
- A inclusão é lei. O produto grava esses encargos só como receita financeira (§1).
- Ficam abertos o mês e o anexo: o encargo não tem documento fiscal próprio, salvo nota de débito (§ 9º-A II).

| Opção | O que é |
|---|---|
| **(a) linha fiscal no recebimento, no anexo da venda de origem** | `ENCARGO_MORA` na competência da baixa (§ 8º II, sem documento), rateada pelas linhas da venda; com nota de débito, no mês dela; recebível sem venda → aviso |
| (b) linha fiscal no recebimento, no anexo da atividade principal | mais simples; erra a partilha quando a venda é de outro anexo |
| (c) só aviso | "juros de mora recebidos fora da base do DAS" e cálculo manual; deixa o DAS menor que o devido |

**Recomendação: (a).** O encargo é "parte do valor da operação", então segue a operação. **Em nenhuma opção muda a
contabilização:** a conta de receita financeira continua (F-ENC-2 a, `D-2026-10-13-EMENDA-3-3-PR1.md:20`;
`BankSettlement.model.ts:59-60`). Só o subrazão fiscal do Simples ganha a linha. **Pendente externo:** se a multa
contratual de atraso (não a de rescisão, que continua fora pelo § 5º V) também entra (§6).

### F-196-4: Compra pública (art. 25-A)
**RATIFICADO (a)**, dono, chat, 26/11/2026 (mesma frase), na versão incremental: marca manual primeiro.

**Evidência.**
- [R196] art. 2º (art. 25-A): receita de contrato com a administração pública direta, autarquia ou fundação de qualquer
  ente é identificada à parte, para destinar o IBS/CBS ao ente contratante.
- Não muda o valor (§ 3º). Fica fora a compra presencial com dispensa de licitação (§ 2º).
- Hoje a linha fiscal só sabe CNPJ, CPF ou não identificado (`tomadorTipo`, `schema.prisma:3539-3541`).
- **Insumo ausente:** não li se o cadastro do cliente tem natureza jurídica.

| Opção | O que é | O que deixa aberto |
|---|---|---|
| **(a) marca de tomador público + segregação informativa** | marca no cadastro do tomador (ou natureza jurídica do CNPJ), copiada à linha fiscal na gravação; o espelho do PGDAS-D segrega | a origem do dado (cadastro manual × consulta CNPJ) |
| (b) aviso sem campo | "venda a CNPJ: confira se é compra pública (art. 25-A)" | a declaração sai sem a identificação |
| (c) fora até haver cliente | os verticais de 2027 (salão, clínica, varejo) quase não vendem ao poder público | o primeiro cliente que vender declara errado, sem aviso |

**Recomendação: (a)** em versão incremental: primeiro a marca manual no cadastro, a consulta de natureza jurídica depois. O
PR fica atrás dos PR-1..3 na ordem.

### F-196-5: `INICIO_PRIMEIRA_FAIXA` sem linha de data própria (f73e, `com-dono`, ger 3)
Fica com o dono e **não** é resolvido aqui. **Fato novo** para a decisão: a fonte de data que a f73e pedia agora está lida. É
a Res. 190 art. 9º II, na redação da Res. 196 art. 4º (vigência 24/11/2026): "a partir de 1º de janeiro de 2027, em relação
às demais alterações", o que inclui o art. 22 § 2º I (1ª faixa nos 2 primeiros meses) e o art. 26 § 6º (r = 0,28) ([R190]
linhas 101 e 152; [R196] linha 150). É a mesma fonte que a linha `MARCO_LEGAL/FIM_REGIME_CAIXA_SIMPLES` já cita. A pergunta
continua a do dono: linha própria (`INICIO_CGSN190`) × reaproveitar um marco × deixar como está. O gatilho do item 1 por dado
(`transfereAIbs`) segue a direção da linha própria e não depende desta resposta.

## 6. Pendente de validação externa

- F-196-1: como o PGDAS-D de 2027 parte o excesso do ISS na 6ª faixa. Oráculo: simulador ou cálculo do PGDAS-D, ou o
  contador.
- F-196-2: o prazo que torna a emissão "intempestiva" (§ 8º II) para NFC-e, NF-e e NFS-e.
- F-196-3: se a multa contratual de atraso é "importância cobrada como parte do valor da operação".
- Item 4: se a nota (*) do Anexo XX/XXI da LC 214 para 2027–2028 ("federais", sem IBS) é erro material da lei. O BRIEF segue
  o artigo, mas uma retificação da LC mudaria a fonte do item 2.

## 7. Insumos ausentes

- O cadastro do cliente e a natureza jurídica (F-196-4).
- Todos os caminhos que escrevem `ReceitaFiscalLinha`: o F-196-3 tem só o grep de `BankSettlement` (I).
- Como o emissor NF-e/NFS-e preenche os campos do art. 59 § 4º de 2027 (fora deste BRIEF, §8).

## 8. Achados fora de escopo

- **Na caixa: `L-20261126-210839-b9d5`.** Emissor NF-e/NFS-e do optante: art. 59 §§ 4º, 4º-A, 6º–8º e art. 59-A (optante
  pendente), red. Res. 196, de 2027 em diante, não conferidos contra o emissor.
- **Só descrito** (o `add` com `--pai` recusou: filha fora da meta, P3, D-2026-11-25-MATRIZ-DE-LACUNAS §8b): art. 106-C
  p.ú., nota mensal consolidada do MEI para PF. Feature opcional.
- **Só descrito** (recusado: G5, §8b): `simplesCaixa.ts:70`, o comentário de `ULTIMO_ANO_RETORNO_DECIDIDO` ainda trata 2026
  como "A1"; a 144-C respondeu.
- Crédito do adquirente na compra de MEI (art. 58 § 8º): coberto por inferência, sem teste que prove. Fica como
  observação, sem item e sem lacuna.
- **Observação para LEGAL-REGRAS (não é lacuna nova):** a Res. 196 é a primeira mudança de **forma** de regra fiscal (quem
  recebe o excesso do ISS) desde o BRIEF do motor de leis. Pela recomendação do F-ML-11 (a), "um cálculo fiscal só vira
  regra quando a lei o muda", seria o gatilho da b25f. A b25f segue esperando o F-ML-0.

## 9. Write-set

| PR | Arquivos |
|---|---|
| PR-1 (itens 1–5) | `server/src/features/accounting/models/simplesCalc.ts`; `server/src/features/accounting/models/__tests__/simplesCalc.test.ts`; `server/src/features/accounting/models/__tests__/simplesAnexosSeed.test.ts`; `server/src/features/accounting/models/__tests__/obrigacoesPorRegime*.test.ts`; `scripts/gen-simples-anexos.mjs`; `server/prisma/data/legal_parameters_simples_v7.sql` (novo); `server/prisma/migrations/<ts>_seed_simples_res_cgsn_196/migration.sql` (novo); `docs/accounting/fontes-oficiais/TRANSCRICAO-SIMPLES-ANEXOS-RES-CGSN-196-*.txt` (novo) e `docs/accounting/fontes-oficiais/MANIFEST.md` |
| PR de docs (item 6) | `pesquisas-legais/{dp-cobertura-100,parecer-salao-sp-4-pessoas,das-espelho-guia,insumos-salao-sp,ciclo-fiscal-prazos,simulacao-montador-unico,nfse-2027-salao-parceiro-cbs-ibs,simples-6-02-6-03-fator-r}/relatorio.md` |
| PR-2 (F-196-2) | `server/prisma/schema.prisma` (`ReceitaFiscalLinha`); o escritor da linha fiscal da venda; `server/src/features/accounting/services/SimplesApuracaoService.ts`; `server/src/features/accounting/dtos/SimplesDto.ts` + `my-app/types/contracts/accounting/SimplesDto.gen.ts`; i18n do alerta |
| PR-3 (F-196-3) | `server/src/features/accounting/models/BankSettlement.model.ts` e o serviço da baixa; `server/prisma/schema.prisma`; `SimplesApuracaoService.ts`; `SimplesDto.ts` + `.gen.ts`; i18n |
| PR-4 (F-196-4) | cadastro do tomador (a definir pelo insumo ausente); `schema.prisma`; `simplesEspelho.ts`; `SimplesDto.ts` + `.gen.ts` |

**Pontos de estrangulamento (PAR-001):**
- `server/prisma/schema.prisma` (PR-2..4);
- `server/src/features/accounting/dtos/__tests__/__dto-shapes__.json` (PR-2..4);
- migrations (PR-1..4).

**Colisões:**
- **#1428** e a `integration/pais-na-borda-f3` mexem no registro de formato `paises/br/legalParameters/simples.ts` e em
  `formatoLinha.ts`. O PR-1 não muda a forma do `valorJson` do teto, então a colisão esperada é nula. Mesmo assim rebaseie
  depois do F3.
- **#1425/#1326** (ponte DP → Simples) tocam `SimplesApuracaoService.ts` e `SimplesDto.ts`. O PR-2..4 entra depois deles.
