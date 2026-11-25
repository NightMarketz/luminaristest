# Handoff — pendências do Simulador Tributário do Salão (21/11/2026)

Artifact: https://claude.ai/artifact/4T2JYWqnJXm9e6p2aUfDLu, **base = versão 43** (251.188 bytes; o serviço chama de 1795271130-9c70).
Decisões do dono: [DECISOES-2026-11-21.md](DECISOES-2026-11-21.md). Patches reaplicáveis: [patches/](patches/).

## Como retomar (sessão nova)
1. `Artifact action:"read"` na URL. Ler o arquivo salvo inteiro (exigência do republish). Se a versão não for a 43, conferir o que mudou antes de aplicar os patches.
2. Copiar a cópia salva para o scratchpad (`sim.html`) e aplicar em ordem: `python patches/p01_codigo_morto.py sim.html`, depois os próximos `pNN_*.py`.
3. Testes (rede): os scripts antigos ficam em `C:\Users\smurf\AppData\Local\Temp\claude\8b1b7072bbf3264d\43476aee-72e5-4040-b1eb-e9ea74381e78\scratchpad`
   (`ident.js`, `ident2.js`, `t3.js`, `pwt\sens3.js`, `pwt\dre.js`, `pwt\card.js`; Playwright em `pwt\node_modules`).
   O runner da sessão de 21/11 está em `...\2590be78723e1213\30e479fb-a1f0-4e51-95ce-b1dd640e332c\scratchpad\run.sh` e `ext.js`:
   `bash run.sh <html> <pasta-saída>` copia o HTML para `salao.html`, extrai o CALC (de `const T3=` até `/* ===== /CALC`) para `calc2.js`/`calc3.js` e roda os seis.
   Linha de base da v43 em `...\scratchpad\base43\`. Se o scratchpad sumiu, recrie: o CALC vai de `const T3=` a `/* ===== /CALC` no HTML.
   `card.js` foi corrigido em 21/11 para respeitar "até o teto" (o falso negativo da Bia no TOT26 sumiu; era do teste, não da página).
4. Publicar com `Artifact` (mesma URL), marcar as lacunas (`node scripts/lacunas.mjs set <id> --estado resolvida --destino "v44 <marcador>"`).

## Estado por item
| Item | Estado | Onde |
|---|---|---|
| 3 código morto (b3ef, b456) | **publicado na v44** (p01); lacunas resolvidas | `patches/p01_codigo_morto.py` |
| 1 DIFAL em L do Real (8b51) | **publicado na v44** (p03); lacuna resolvida | `patches/p03_difal_lucro_real.py` |
| 2 base CBS/IBS no SR27 (f56d) | **publicado na v44** (p02); lacuna resolvida | `patches/p02_cbs_parceiro_e_prazos.py` |
| 4 depreciação | **publicado na v45** (p04, `depreciacao v1`) | `patches/p04_depreciacao.py` |
| 5 adicional por tempo (CCT cl. 17ª) | **feito** (p05, `ats v1`); ver versão final abaixo | `patches/p05_adicional_tempo.py` |
| 6 rescisão | **feito** (p06, `rescisao v1`); não dedutível no Real (A.178) | `patches/p06_provisao_rescisao.py` |
| 7 meses | **BRIEF pronto, código não feito**; 5 forks pendentes | `BRIEF-ITEM7-MESES.md` |
| 8 Real adições/exclusões | **feito** (p08, `lalur v1`) | `patches/p08_lalur.py` |
| 9 premissas 2027 | **feito** (p09, `premissas-2027 v1`) | `patches/p09_premissas_2027.py` |
| 10 calendário IBS e ICMS | **publicado na v44** (p02) | `patches/p02_cbs_parceiro_e_prazos.py` |

## Atualização (fim da sessão de 21/11) — p01, p02, p03 prontos e testados, NÃO publicados
- p02 (item 2, lacuna f56d; item 10): cota do parceiro sem CNPJ entra na base da CBS/IBS de 2027 (SR, PR, RE); pergunta em "Ainda é decisão"; IBS e CBS "Último dia útil" (Res. CGIBS 6/2026 art. 45; Decreto 12.955 art. 45), ICMS "Dia 20" (RICMS/SP art. 112; Anexo IV, CPR 1200). Sensibilidade: só os cenários de 2027 mudam (base −489,66 em SR27/RE27/PR27/SN27; INI27 d_ant), mais centavos de arredondamento. Saídas em `scratchpad\p02\`.
- p03 (item 1, lacuna 8b51): `-(c.difal||0)` em L do Real. Conferido à parte: com L = 50.579 e DIFAL 390, o resultado cai 257,40 = 390 × (1 − 34%). Medição: só o painel `b` (o1b) passa a mudar com i_fora/i_cos/i_inter.
- Na hora de publicar, rodar `node scripts/lacunas.mjs set` em 8b51, f56d, b3ef, b456 com `--destino "artifact v44 (p01 código morto; p02 parceiro-cbs v1; p03 lucro-fecha v2)"`.
- Faltam, nesta ordem (ler antes as linhas 1750–2143 da v43: abas, cadastros de equipe/despesas, storage, eventos): **4** depreciação, **5** adicional por tempo, **6** rescisão, **9** três campos de 2027, **8** LALUR, **7** mês a mês/sazonalidade (o maior; pode pedir sessão própria). Atualizar rodapé (linha 563), "O que esta conta supõe" (1549–1558), rodapé do demonstrativo (1743) e o `<footer>` com os dossiês novos.

### Especificação dos itens que faltam (pesquisa já feita)
- **4 depreciação** (`salao-depreciacao-equipamentos`): cadastro "Equipamentos" em CAT (`bens:[{n,v,a}]`, a = vida útil em anos; DEF_CAT `bens:[]`, normalizar CAT carregado sem `bens`), sem valor de exemplo. Prazos do Anexo III da IN 1.700: cadeira de cabeleireiro (9402), móveis (9403), instalações e ar-condicionado: 10 anos; computador (8471) e máquina de corte (8510): 5 anos (sugerir no texto, não preencher). Até R$ 1.200 ou vida ≤ 1 ano: despesa direta (DL 1.598 art. 15), salvo conjunto (RIR art. 313 § 2º) — no modelo de mês constante, declarar a premissa. depMes = Σ v/(a·12). Entra em `cenario()` (resultado), `cenarioReg()` (995), `outrosC`, nas duas DREs (linha própria "Depreciação dos equipamentos"), em L do Real (dedutível IRPJ e CSLL, IN 1.700 arts. 121 § 5º e 123). Crédito: Real 2026 PIS/Cofins 9,25% sobre a depreciação do mês (Lei 10.833 art. 3º VI e § 1º III) → reduzir a base `nc` em depMes; 2027 crédito de CBS/IBS integral na aquisição (LC 214 arts. 47 e 108) → no mês constante, supor reposição = depreciação: base a menos depMes/(1+a27), em PR, RE e SR de 2027 (Simples puro sem crédito, art. 47 § 9º I). Presumido/Simples: sem efeito na base do IR. Ambiguidades para a aba 7: NCM/prazo de secador e lavatório; crédito imediato (Lei 11.774) × depreciação; turno 1,5.
- **5 adicional por tempo**: campo por pessoa "anos de casa" (inteiro, completos) na tabela da equipe (`#tEq`, coluna nova, rótulo no CSS do celular) e um campo da ficha "Salão aderiu ao REPIS" (sim/não; vazio = não); ATS = min(15%, anos × (REPIS ? 1% : 1,5%)) × salário fixo (p.s), somado à remuneração antes de `custoCLT` (natureza salarial, Súm. 203). Linha no cartão da Equipe com a fórmula ("1,5% × n anos × fixo") e o `card.js` aprende o padrão. Pergunta da base para "Ainda é decisão" (texto acima). O piso com REPIS pode passar a usar o campo REPIS.
- **6 rescisão**: campo da ficha "Rotatividade: % da equipe CLT que sai sem justa causa por ano" (vazio = fora da conta). Por pessoa: AV = rem × min(90, 30 + 3·anos)/30; R13 = rem × (AV dias/30)/12; RFER = rem × (AV dias/30)/12 × 4/3; FGTS 8% × (AV + R13); multa 40% × (8% × rem × 13,33/12 × 12 × anos ... usar depósitos ≈ 0,08 × (rem + d13 + fer + terço) × 12 × max(anos, 0,5)); trintídio rem/12; homologação R$ 150 só sem REPIS e anos ≥ 1; INSS patronal só sobre R13 fora do Simples. provisão = rot × CUSTO/12. Entra na folha da pessoa (linha no cartão), DREs, resultado. **No Real NÃO deduz ao provisionar** (IN 1.700 art. 70; adição A.178): L não leva a provisão — mostrar a adição na linha do LALUR (liga ao item 8). Ambiguidades: 33 × 30 dias no 1º ano (NT 184/2012), base da multa (OJ-SDI1-42 II), teto da cl. 38ª. Lacuna das estabilidades: L-20261121-145625-883f.
- **9 três campos de 2027** (`salao-2027-premissas-fora-simples`): (a) "% da CBS/IBS repassada ao preço" (vazio = 0, preço igual a 2026): receita de serviços de 2027 fora do Simples × (1 + rep × a27); (b) "Fornecedores das despesas com crédito: regime regular | Simples (alíquota efetiva %)" — Simples: crédito = o valor de CBS/IBS do DAS do fornecedor (LC 214 art. 47 § 9º II; Res. CGSN 140 art. 58 §§ 4º–5º), como `insumoCalc` faz com `dasI27`; texto: aluguel de PF não contribuinte (≤ R$ 240 mil/ano ou ≤ 3 imóveis) não dá crédito (art. 251 § 1º I), PF acima dá crédito com redução de 70% (art. 261 p.ú.); (c) "Presunção de IRPJ/CSLL em 2027" (padrão 32%, Lei 9.249 arts. 15 § 1º III "a" e 20 I; LC 224 só acima de R$ 5 mi). Os três em DEF/readForm/fillForm/isEx.
- **8 LALUR completo** (`salao-lucro-real-adicoes-exclusoes`, tabela de 26 itens): bloco "Ajustes do lucro real" na ficha (fora do Simples): adições com campo próprio — multas punitivas (A.153/A.154), brindes (Lei 9.249 art. 13 VII), doações (A.072), alimentação de sócios (A.066), despesas não necessárias (A.069), provisão de rescisão (automática do item 6, A.178); "outras adições" e "outras exclusões" livres; compensação de prejuízo fiscal limitada a 30% do lucro ajustado (Lei 9.065 arts. 15 e 16) com campo "prejuízo fiscal a compensar"; CSLL não dedutível do IRPJ (A.058 — a conta já não deduz). L_IRPJ e L_CSLL separados se algum ajuste valer só para um (gratificação a administrador A.163 só IRPJ). Os valores lançados nas adições também entram nas despesas do resultado (são gasto real), só não saem do lucro tributável.
- **7 meses**: seletor "Meses do ano: iguais | sazonalidade (12 fatores %) | mês a mês (12 receitas)". Afeta lucro do ano (Σ meses), RBT12 do DAS da competência (janela de `janelaRbt`), trimestre do IRPJ/CSLL (adicional de R$ 60 mil por trimestre no trimestral — conferir Lei 9.430 art. 3º p.ú. pelo método), limites do ano (`apuracaoAno`). Precisa de BRIEF próprio antes do código.

## Resultados das pesquisas (resumo; detalhe e [Dnn] no relatorio.md de cada dossiê)
- **5 adicional por tempo** (`pesquisas-legais/salao-cct-adicional-tempo-servico/relatorio.md`): cl. 17ª: 1,5% por ano de serviço na mesma empresa, até 15%; REPIS "poderão aplicar" 1%/ano até 15% (§ 2º); conta da admissão, por ano completo (leitura segura). **Base não definida na CCT** → padrão salário fixo (p.s), editável, e a pergunta vai a "Ainda é decisão": *"A cl. 17ª da CCT SP006651/2026 não define a base do ATS; incide sobre o salário fixo, sobre o piso ou sobre fixo + comissões, inclusive para o comissionista com garantia de piso?"*. Natureza salarial (Súm. 203 TST): entra antes de FGTS/13º/férias (somar ao salário antes de `custoCLT`). Precisa de campo por pessoa "anos de casa" (admissão) e do REPIS (já há o texto do piso com/sem REPIS; ver se existe flag de REPIS na ficha — hoje não há; benefícios f_ben citam REPIS só no texto).
- **6 rescisão** (`pesquisas-legais/salao-provisao-rescisao/relatorio.md` § 1): por empregado `CUSTO = AV + R13 + RFER + 8%·(AV+R13) + 40%·(depósitos do contrato + FGTS do mês) + INSS patronal só sobre R13 (fora do Simples) + S/12 (trintídio, cl. 34ª) + R$150·p (homologação, cl. 36ª § 6º, só fora do REPIS e contrato ≥ 12 meses)`; AV = S × (30 + 3·anos, até 90)/30 (cl. 38ª: 60 dias p/ > 45 anos e > 2 anos de casa); R13 e RFER = avos do aviso projetado (CLT 487 § 1º; Súm. 371); FGTS não incide em férias indenizadas; LC 110 extinta (Lei 13.932 art. 12); INSS não incide no aviso indenizado (STJ Tema 478; IN RFB 2.110 art. 34 XXXII). `PROVISÃO_MENSAL = rotatividade × CUSTO / 12`. Depósitos do contrato ≈ 8% × remuneração com 13º e férias × meses de casa. Ambiguidades para "Ainda é decisão": 3 dias com 1 ano completo (33 ou 30 dias; NT 184/2012 lida só em fonte secundária), base da multa com ou sem FGTS do aviso (OJ-SDI1-42 II), teto do aviso da cl. 38ª.
- Lacunas registradas a partir delas: L-20261121-145625-883f (estabilidades da CCT fora da provisão) e a do `legal.py` com o TST.

## Mapa do código (linhas da v43)
- CALC 571–1040: `cenario()` 630, `regimes()` 717 (L do Real 784; `pre` 781; revenda 787), `insumoCalc()` 963, `cenarioReg()` 983 (resultado 995), `sugestoes()` 1000.
- `custoCLT(s)` 612 (folha: s + 8% + 1/12 + 1/12 + 1/36 + 8% sobre eles); `encPessoa` 592; `encargos` 594.
- DEF 1042, `readForm` 1079, `effective` 1089 (ligações lk*), `fillForm` 1103, `render` 1116 (aviso "exemplo" `isEx` 1136; travas lk 1129–1130).
- Equipe (cartões) 1249–1332; calendário 1386–1406 e `calReg` 1588 (IBS 1593 e ICMS 1595, os dois "não pesquisados"); aba 7 1408–1424.
- Regime: "O que esta conta supõe" 1549–1558 (Real sem adições 1555; 2027 1557).
- Demonstrativo fora do Simples `renderDashReg` 1597; no Simples `renderDash` 1659 (rodapé de omissões 1743). Rodapé geral 563.
- `outrosC` 1073 (custos fora de tributo/folha) — todo custo novo entra aqui, em `cenario()` (resultado 685), `cenarioReg()` (995), nas duas DREs e, se dedutível, em L.

## Sessão de continuação (21/11, tarde)
- **v44 publicada** (version id 1795275964-b6f5) = v43 + p01 + p02 + p03. Bateria idêntica à da sessão anterior (`r03`: ident, ident2, t3, dre, card e sens byte a byte iguais). Lacunas 8b51, f56d, b3ef, b456 marcadas resolvidas com destino "artifact v44 (...)".
- Arquivo de publicação fixo: `<scratchpad 160eb626…>\simulador-salao.html`.
- **v45 publicada** (1795276558-b82c) = v44 + `p04_depreciacao.py` (marcador `depreciacao v1`). Bateria: as seis saídas iguais a `r03`; testes novos com equipamentos preenchidos (`pwt\dre4.js`, `pwt\card4.js` lendo `pwt\cfg4.js`; `id4.js` no scratchpad 160eb626) fecham. Real 2026: R$ 150 de quota baixam o tributo em R$ 46,54 (9,25% de crédito + 24% sobre o lucro menor).
- Escritos e testados no Node (id4: 231 casos, 0 falhas de identidade), bateria em curso: `p05_adicional_tempo.py` (`ats v1`), `p06_provisao_rescisao.py` (`rescisao v1`), `p09_premissas_2027.py` (`premissas-2027 v1`). Patches usam `patches/_pt.py`.
- **Divergência registrada (item 6):** DECISOES diz que a provisão entra "em L do Real"; o dossiê `salao-lucro-real-adicoes-exclusoes` diz que ela não é dedutível ao ser feita (IN RFB 1.700 art. 70; A.178). O p06 segue o dossiê: a provisão é custo no resultado e volta ao lucro tributável, com os encargos dela.
- **v46 publicada** (1795277394-6b76) = v45 + p05 + p06 + p09 + p08, nessa ordem (p04 corrigido: o comentário que comentava `out.insumo=` foi para linha própria). Cópia durável: `simulador-v46.html` nesta pasta (base para o item 7; a v43 só existe no histórico do artifact).
  - Cadeia para reconstruir a partir da v43: p01, p02, p03, p04, p05, p06, p09, p08.
  - Bateria (`r08`): ident, t3, dre, card e sens iguais a `r03`; `ident2` difere só nos campos novos impressos (zerados); dre4 fecha; card4 245 fórmulas, 0 falhas; id4 231 casos, 0 falhas; `pwt\sens4.js` (campos novos × 7 configs) sem erro, e cada campo mexe só nos painéis esperados (repasse e presunção só em PR/RE de 2027; fornecedor do Simples em SR/PR/RE de 2027; REPIS, anos de casa e rotatividade na equipe, folha e DRE).
  - Conferido à mão (`q2.js`, Real 2026 com lucro positivo): R$ 80 de exclusão e R$ 300 de gratificação → IRPJ −12,00 e CSLL −34,20; prejuízo de R$ 60 mil compensa 5.000/mês (1/12, abaixo de 30%); rotatividade não muda a base do IRPJ/CSLL.
  - Ambiguidades novas em "Ainda é decisão": secador/lavatório e crédito do Real (depreciação); base do ATS; aviso do 1º ano, base da multa e teto da cl. 38ª; retirada variável do sócio (A.181).
- **Item 7 não implementado:** BRIEF em `BRIEF-ITEM7-MESES.md`, com 5 forks (F7-1..F7-5) para o dono e um pré-requisito legal (adicional trimestral, Lei 9.430 art. 3º p.ú.). Próximo passo: perguntar os forks, fazer o dossiê e depois os patches p10a..p10e sobre `simulador-v46.html`.
- Lacuna nova: L-20261121-160217-967b (convenções diferentes de crédito de CBS/IBS de 2027: despesas × insumo/depreciação).

## Sessão do item 7 (21/11, "item 7 meses") — motor feito e testado, UI e publicação pendentes
**Feito**
- Forks F7-1..F7-5 perguntados ao dono e registrados (DECISOES, item 7). O dono escolheu: não normalizar; vetor de revenda no mês a mês; ano anterior digitado **ou importado** (PDF do PGDAS-D, CSV/Excel, sistema de caixa); Real trimestral **e** estimativa; competência **e** caixa. BRIEF emendado no §10 (fatias novas p10f–p10h).
- Dossiê `pesquisas-legais/salao-trimestre-adicional-irpj` (D01–D06; relatorio.md com análise): adicional = R$ 20 mil × meses do período (Lei 9.249 art. 3º § 1º); trimestre, estimativa, balancete, vencimentos, 13º e férias. Lei 4.749 conferida no Planalto (D06).
- Linha de base: `run4.sh` na v46 intocada reproduz `r08` nas dez saídas (`160eb626…\scratchpad\r46\`).
- `patches/p10b_motor_meses.py` (escalaMes, anoMeses, `x.lc224Rec`, `PR.presC`) e `patches/p10c_lucro_trimestral.py` (lucroPeriodo: Presumido e Real trimestral; Real por estimativa com ajuste anual; balancete; compensação 30% por período com saldo em ordem; parte do imposto do período em cada mês pela base positiva). Aplicam limpos sobre a v46 (p10b, depois p10c; o p10a ainda não existe e só toca UI/estado).
- Teste no Node: `testes/tm-meses.js <html>` — 309 casos, 0 falhas (SZ com 100 em tudo = 12 × o mês em S/SR/PR/RE × TRI/EST/ESTB × 2026/2027, teto isento igual, identidade do mês fecha). Conferido à mão: PR 1º tri com serviços 72.000+72.000+81.000 e revenda 7.500 → base 72.600, IRPJ 10.890 + adicional 1.260 = 12.150; CSLL 9% × 72.900 = 6.561.
- Não publicado: o artifact continua na v46.

**Pendente, nesta ordem** (o contrato de dados é o do BRIEF §2, com MS = {modo, f, r, rv, ant, real})
1. Ler o artifact inteiro (`Artifact read`; as linhas 1–339 são CSS/HTML da ficha). Base = v46.
2. **p10a**: estado `MS` (`MKEY=KEY+"-mes"`, normalizado na leitura, no `#reset`, fora do `isEx`), fieldset "Meses do ano" na ficha (seletor IG/SZ/MM; grade de 12 fatores ou 12 receitas + 12 de revenda no MM; grade do ano anterior; linha com soma e média; aviso da média ≠ 100), seletor do Real (TRI/EST/ESTB) no bloco "Fora do Simples". `effective()` monta `x.meses={modo,sv,rv,ant,real}` em R$: SZ sv=serv·f/100, rv=rev·f/100; MM sv=r ou serv, rv=rv digitado ou rev·sv/serv. Atenção: `#p-ficha input` já dispara `render()` — os campos novos precisam gravar MS antes.
3. **p10d** (telas): em `render()`, `AM=anoMeses(x,"CAD",REG,dasX(x.ano))`; com AM, `c = AM.meses[comp-1]` (competência da aba DAS), KPI "Lucro do ano" = `AM.ano.resultado`, teto = `AM.ano.limIsento`; aba 1 com o total anual por regime (`anoMeses` com `{r:k}`; virada continua no mês da ficha e não chama anoMeses); aba 5 e `lucroReg` com `AM.ano.lucroTrib`; demonstrativo com tabela de 12 meses + ano (receita, tributos, pessoal, outras, resultado) e a coluna "Ano" da DRE escondida (DRE do mês); aba DAS: placeholders de RBT12/rba vindos do perfil e texto "do perfil" quando `c.rbtPerfil`; `dasReg`/`calReg` mostram `c.lucroPer` (trimestre/ajuste) e `AM.est` (estimativas e saldo de março).
4. **p10e** (textos): grep do BRIEF §6; o campo "Prejuízo fiscal a compensar" ("com meses iguais, 1/12 do saldo") e `lalurTab`.
5. Bateria: `run4.sh` (deve ficar igual a `r08`), `tm-meses.js`, mais dre4/card4 com configs SZ e MM, e medir o tempo do render (BRIEF §9).
6. Publicar na mesma URL; atualizar este HANDOFF.
7. Fatias seguintes (BRIEF §10): p10f caixa (campo "mês das férias" por CLT), p10g importação CSV/colar, p10h PDF do PGDAS-D e sistema de caixa — **pedir ao dono um extrato do PGDAS-D e uma exportação do sistema de caixa** antes do p10h.


## Sessão do item 7, continuação (21/11, "item 7 UI") — p10a..p10e feitos
**Feito**
- Artifact lido inteiro (`Artifact read`): versão 1795277394-6b76 = `simulador-v46.html`, byte a byte.
- Patches novos: `p10a_estado_meses.py` (estado `MS` em `KEY+"-mes"`, textos crus como o DS; bloco "Meses do ano" na ficha, com grade de fatores, de serviços e revenda e do ano passado; seletor do Real TRI/EST/ESTB, desligado em "iguais"; `effective()` → `mesesX()`; os campos `data-ms` ficam fora do listener genérico da ficha), `p10d_telas_meses.py` (telas), `p10e_textos_meses.py` (textos, rodapé com o dossiê, resposta nova na aba 7).
- Correções no motor (`p10c`): o adicional usa os meses ativos do período (`n = g.ix.length`; abertura ou saída do Simples no meio do trimestre encurtam o período, Lei 9.249 art. 3º § 1º); a estimativa acha o ajuste anual pelo rótulo, não por `n===12`. Caso novo em `testes/tm-meses.js` (abertura em 05/2026: 2º trimestre de 2 meses, adicional acima de R$ 40 mil).
- O que cada aba usa com os meses ligados: o mês da competência da aba DAS dentro do ano (`c.am`) no topo, DAS, Equipe, Lucro, O mês e Demonstrativo; `lucroAno` e `limIsento` são somas do ano. Ficam no mês da ficha (`cF`), com aviso na tela: Cadastros, CLT × parceria (aba 4 e o cartão do Demonstrativo), Insumos e as viradas. Aba 1: soma do ano por regime (`anoRegimes`, sem os valores digitados da aba DAS) e a sugestão de regime pela soma (`amSug`). Fora do Simples: o IRPJ e a CSLL do período aparecem na aba DAS (`perNota`), no calendário (`calPer`, com estimativa e ajuste de março) e no LALUR (`lalurPer`). O Demonstrativo ganha a tabela dos 12 meses e o ano; a DRE passa a ser a do mês, sem a coluna "Ano".
- Teste de página novo: `testes/pg-meses.js <html>` (configs do `cfg4.js` × IG/SZ100/SZ/SZE/MM). Confere que as 12 colunas somam o KPI "Lucro do ano", que cada mês fecha, que a DRE do mês fecha com o KPI e não tem a coluna Ano, que SZ 100% em tudo dá o mesmo que "iguais" (sem prejuízo a compensar e sem abertura), e que o reload mantém o MS e o reset o limpa.
- Ordem para reconstruir: v46 + p10a, p10b, p10c, p10d, p10e.
- Bateria sobre a v46 + p10a..p10e (`r10` no scratchpad 1a89722d): as dez saídas do `run4.sh` iguais às da v46 (card, card4, dre, dre4, id4, ident, ident2, sens, sens4, t3). `tm-meses.js`: 311 casos, 0 falhas. `pg-meses.js`: 960 casos, 0 falhas, sem erro de script. Render com os meses ligados: 35 a 80 ms (iguais: 30 a 60 ms); sem cache.
- Capturas (scratchpad 1a89722d, `shots/`): ficha e demonstrativo no celular e no desktop, sem rolagem horizontal.
- **Versão nova no ar durante a sessão:** outra sessão publicou a 1795280641-a69d (gráfico da aba 1 em Recharts, `rc-ilha v1`; cópia em `scratchpad 1a89722d/live.html`). Os p10 aplicam limpos sobre ela; o build é `scratchpad 1a89722d/sim-v48.html` = a69d + p10a..p10e. Ordem nova para reconstruir: versão a69d + p10a, p10b, p10c, p10d, p10e.
- `p11_revisao_conteudo.py` (outra sessão, só textos) **não foi aplicado** nesta publicação: fica para quem cuida da revisão de conteúdo, depois dos p10.
- **v48 publicada** (1795282000-2388) = 1795280641-a69d + p10a..p10e. Antes de publicar: `run4.sh` na versão viva e no build, com as dez saídas iguais entre si; `tm-meses.js` 311/0; `pg-meses.js` 960/0. Cópia durável: `simulador-v48.html` nesta pasta, que é a base dos próximos patches.

**Pendente, nesta ordem**
1. p11 (revisão de conteúdo, de outra sessão): aplicar sobre a v48 e publicar (ver `side-session-notes/local_3105…/revisao-conteudo-p11.md`).
2. p10f, a visão de caixa: campo "mês das férias" por CLT; 13º com adiantamento entre fevereiro e novembro e saldo até 20/12; salário até o 5º dia útil; tributos no vencimento; IRPJ e CSLL no mês seguinte ao trimestre; estimativa no mês seguinte e ajuste em março (`AM.est`). O dossiê já cobre tudo.
3. p10g, importação por CSV ou colando do Excel para a grade do ano passado (`MS.ant`) e para o mês a mês, com prévia antes de valer.
4. p10h, o PDF do extrato do PGDAS-D e a exportação do sistema de caixa. **Pedidos ao dono em 21/11; ainda não chegaram.**

## Planejamento do grupo de lacunas (24/11) — v49 publicada, página congelada
- Esta pasta, os dossiês `salao-*` e `revisao-conteudo-simulador-salao` saíram da worktree `implicit-state-machines-inventory-e766ea`
  (não rastreados) para o PR do planejamento do grupo; os quatro dossiês em branco da `roda-maestro-dia-099ee9` também.
- A premissa "o p11 espera a publicação do item 7" estava velha: a v48 (item 7) estava no ar desde 21/11, byte a byte igual a
  `simulador-v48.html`.
- **v49 publicada** (1795492403-d85a) = v48 + `p11_revisao_conteudo.py` + `p12_nfse_regime_normal.py`; depois a **v50** = v49 +
  `p13_fecho_revisao.py` (R18, R21 e o grau do R05, que a conferência achado a achado mostrou abertos). Fonte da publicação
  daqui em diante: `parecer-salao-sp-4-pessoas/artefatos/simulador-tributario-salao.html`, registro em `PUBLICACOES.md` ao lado.
- Teste novo: `testes/tx-p11.js <html> [pasta-capturas]` (textos por regime + KPI a 375 px). Os nomes do `cfg4.js` levam
  o sufixo "n" (S26n...).
- **F-SIM-8: a página congela depois desta rodada de texto.** Os p10f, p10g e p10h (caixa, importação CSV, PDF do PGDAS-D)
  não entram na página: vão como requisito do motor do produto (nó SIMULACAO-CENARIO), item 19 do BRIEF de grupo.
- O que falta do grupo: `BRIEF-GRUPO-LACUNAS-2026-11-24.md` (pesquisas 7 a 18, requisitos do motor 19, fork F-G1).
